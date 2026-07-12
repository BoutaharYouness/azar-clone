import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/api';
import { getDeviceId } from '../services/deviceId';
import './LoginPage.css'; // Let's add specific styles here or use inline for specific things

export default function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleStart() {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setError('Nickname must be at least 2 characters.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const response = await createSession(trimmed, deviceId);

      if (!response.success) {
        setError(response.message || 'Unable to create session.');
        return;
      }

      sessionStorage.setItem('sessionToken', response.sessionToken);
      sessionStorage.setItem('nickname', response.nickname);
      sessionStorage.setItem('country', response.country);

      navigate('/call');
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Check your network.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleStart();
  }

  return (
    <div className="login-page">
      {/* Dynamic Background Elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      
      <div className="glass-panel login-card">
        <div className="logo-container">
          <div className="logo-icon">🌍</div>
        </div>
        <h1 className="title">Nexus</h1>
        <p className="subtitle">Connect with anyone, anywhere.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="input-group">
          <input
            className="input-field"
            placeholder="Choose a nickname..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={30}
            autoFocus
          />
        </div>

        <button
          className="btn-primary start-btn"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Start Chatting'}
        </button>

        <p className="disclaimer">
          By continuing, you agree to our terms. Be respectful to others.
        </p>
      </div>
    </div>
  );
}
