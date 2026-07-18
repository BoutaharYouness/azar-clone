import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, fetchStats, refreshAccessToken } from '../services/api';
import { getDeviceId } from '../services/deviceId';
import { t, setLocale, getLocale, isRTL, SUPPORTED_LOCALES } from '../services/i18n';
import AuthModal from '../components/AuthModal';
import './LoginPage.css';

const COUNTRIES = [
  { code: 'MA', flag: '🇲🇦', name: 'Morocco' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: 'DZ', flag: '🇩🇿', name: 'Algeria' },
  { code: 'TN', flag: '🇹🇳', name: 'Tunisia' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland' },
];

export default function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [country, setCountry] = useState('MA');
  const [language, setLanguage] = useState(getLocale());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [, forceUpdate] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem('hours_access_token');
  const loggedNickname = localStorage.getItem('hours_user_nickname');
  const userRole = localStorage.getItem('hours_user_role');

  // Fetch live stats
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchStats();
        if (active) setStats(data);
      } catch (_) { /* silently ignore */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Restore a Google session through its refresh token when the access token is absent.
  useEffect(() => {
    const refreshToken = localStorage.getItem('hours_refresh_token');
    if (!refreshToken || localStorage.getItem('hours_access_token')) return;
    refreshAccessToken(refreshToken)
      .then(({ accessToken, refreshToken: nextRefreshToken }) => {
        localStorage.setItem('hours_access_token', accessToken);
        if (nextRefreshToken) localStorage.setItem('hours_refresh_token', nextRefreshToken);
        forceUpdate(n => n + 1);
      })
      .catch(handleLogout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleLanguageChange = useCallback((e) => {
    const locale = e.target.value;
    setLanguage(locale);
    setLocale(locale);
    if (isRTL()) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
    forceUpdate(n => n + 1);
  }, []);

  async function handleStart() {

    setError('');
    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const selectedCountry = COUNTRIES.find(c => c.code === country);
      const countryName = selectedCountry ? selectedCountry.name : 'Unknown';
      const displayName = isLoggedIn ? (loggedNickname || 'Member') : 'Guest';
      const response = await createSession(displayName, deviceId, countryName, language);

      if (!response.success) {
        setError(response.message || 'Unable to create session.');
        return;
      }

      sessionStorage.setItem('sessionToken', response.sessionToken);
      sessionStorage.setItem('nickname', response.nickname);
      sessionStorage.setItem('country', response.country);
      sessionStorage.setItem('userCountryCode', country);
      sessionStorage.setItem('userLanguage', language);

      navigate('/call');
    } catch (err) {
      setError(err.message || 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  }


  function handleLogout() {
    localStorage.removeItem('hours_access_token');
    localStorage.removeItem('hours_refresh_token');
    localStorage.removeItem('hours_user_role');
    localStorage.removeItem('hours_user_nickname');
    localStorage.removeItem('hours_user_email');
    localStorage.removeItem('hours_user_avatar');
    forceUpdate(n => n + 1);
  }

  function handleAuthSuccess(authResult) {
    setShowAuthModal(false);
    forceUpdate(n => n + 1);
  }

  const selectedCountryData = COUNTRIES.find(c => c.code === country);

  return (
    <div className="login-page">
      {/* Animated background shapes */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="login-card">
        {/* Language selector — top right */}
        <div className="lang-selector-row">
          <select
            className="lang-select"
            value={language}
            onChange={handleLanguageChange}
            id="language-selector"
          >
            {SUPPORTED_LOCALES.map(loc => (
              <option key={loc.code} value={loc.code}>
                {loc.flag} {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Logo */}
        <div className="logo-area">
          <div className="logo-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#229ED9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h1 className="brand-title">{t('app.name')}</h1>
          <p className="brand-slogan">{t('home.slogan')}</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Anonymous entry — no registration, username, or password fields. */}
        <div className="form-section">

          <div className="selectors-row">
            <div className="selector-group">
              <label className="selector-label">{t('home.select_country')}</label>
              <select
                className="select-field"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                id="country-selector"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn-primary start-btn"
            onClick={handleStart}
            disabled={loading}
            id="start-button"
          >
            {loading ? t('home.connecting') : 'Start anonymously'}
          </button>
        </div>

        {/* Live stats */}
        {stats && (
          <div className="stats-row">
            <div className="stat-item">
              <span className="online-dot"></span>
              <span className="stat-value">{(stats.onlineUsers || 0).toLocaleString()}</span>
              <span className="stat-label">{t('home.users_online')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">{stats.countriesOnline || 0}</span>
              <span className="stat-label">{t('home.countries_online')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">~{stats.avgWaitSeconds || 0}{t('home.seconds')}</span>
              <span className="stat-label">{t('home.avg_wait')}</span>
            </div>
          </div>
        )}

        <p className="disclaimer">{t('home.disclaimer')}</p>

        {/* Auth actions row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {isLoggedIn ? (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ✅ Signed in as <strong>{loggedNickname}</strong>
              </span>
              {userRole === 'ADMIN' && (
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => navigate('/admin')}
                >
                  👑 Admin Dashboard
                </button>
              )}
              <button
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
              onClick={() => setShowAuthModal(true)}
            >
              🔑 Continue with Google
            </button>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        isLimitReached={false}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
