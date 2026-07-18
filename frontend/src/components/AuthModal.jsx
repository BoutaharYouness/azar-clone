import React, { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithGoogle } from '../services/api';
import { getDeviceId } from '../services/deviceId';
import './AuthModal.css';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AuthModal({ isOpen, onClose, onSuccess, isLimitReached = false }) {
  const googleButtonRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredential = useCallback(async (googleResponse) => {
    if (!googleResponse.credential) {
      setError('Google did not return an identity token. Please try again.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await signInWithGoogle(
        googleResponse.credential,
        getDeviceId(),
        sessionStorage.getItem('country') || 'Unknown',
        sessionStorage.getItem('hours_locale') || 'en',
      );

      if (!response.success) {
        setError(response.message || 'Google sign-in failed.');
        return;
      }

      localStorage.setItem('hours_access_token', response.accessToken);
      localStorage.setItem('hours_refresh_token', response.refreshToken);
      localStorage.setItem('hours_user_role', response.role);
      localStorage.setItem('hours_user_nickname', response.nickname);
      localStorage.setItem('hours_user_email', response.email);
      if (response.avatarUrl) localStorage.setItem('hours_user_avatar', response.avatarUrl);

      onSuccess(response);
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.');
      return undefined;
    }

    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
        googleButtonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
        });
      })
      .catch(() => setError('Unable to load Google sign-in. Check your internet connection.'));

    return () => {
      cancelled = true;
    };
  }, [handleCredential, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay auth-modal-overlay" onClick={!isLimitReached ? onClose : undefined}>
      <section className="modal-content auth-modal-card" aria-modal="true" role="dialog" aria-labelledby="google-auth-title">
        {!isLimitReached && (
          <button className="auth-close" type="button" onClick={onClose} aria-label="Close">×</button>
        )}
        <div className="auth-google-icon" aria-hidden="true">G</div>
        <h2 id="google-auth-title">Continue your adventure</h2>
        <p className="auth-subtitle">
          You've reached the free limit of 10 skips. Continue with Google to keep meeting new people.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <div className={`google-button-wrap ${loading ? 'is-loading' : ''}`} ref={googleButtonRef} />
        {loading && <p className="auth-loading">Securing your account…</p>}
      </section>
    </div>
  );
}