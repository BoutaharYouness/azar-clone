import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/api';
import { getDeviceId } from '../services/deviceId';

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 100%)',
  },
  card: {
    background: '#16213e', borderRadius: 20, padding: '48px 40px',
    width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 700, color: '#e94560', marginBottom: 4 },
  subtitle: { color: '#888', marginBottom: 32, fontSize: 14 },
  input: {
    width: '100%', padding: '14px 18px', borderRadius: 12, border: '2px solid #2a2a4a',
    background: '#0f3460', color: '#fff', fontSize: 16, outline: 'none',
    marginBottom: 16, transition: 'border-color 0.2s',
  },
  button: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c0392b)',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.2s', marginTop: 8,
  },
  error: { color: '#e94560', fontSize: 13, marginBottom: 12 },
  disclaimer: { color: '#555', fontSize: 12, marginTop: 24, lineHeight: 1.5 },
};

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

      // Store session info in sessionStorage for the call page
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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🎥</div>
        <h1 style={styles.title}>ChatRandom</h1>
        <p style={styles.subtitle}>Meet random people from around the world</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          placeholder="Choose a nickname..."
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={30}
          autoFocus
        />

        <button
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Connecting...' : '🚀 Start Chatting'}
        </button>

        <p style={styles.disclaimer}>
          By starting, you agree to be respectful. No account required. <br />
          Abusive users are automatically blocked.
        </p>
      </div>
    </div>
  );
}
