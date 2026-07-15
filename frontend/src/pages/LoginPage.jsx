import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, fetchStats } from '../services/api';
import { getDeviceId } from '../services/deviceId';
import { t, setLocale, getLocale, isRTL, SUPPORTED_LOCALES } from '../services/i18n';
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
  const navigate = useNavigate();

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
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setError(t('home.nickname_error'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const selectedCountry = COUNTRIES.find(c => c.code === country);
      const countryName = selectedCountry ? selectedCountry.name : 'Unknown';
      const response = await createSession(trimmed, deviceId, countryName, language);

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

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleStart();
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

        {/* Form */}
        <div className="form-section">
          <input
            className="input-field"
            placeholder={t('home.nickname_placeholder')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={30}
            autoFocus
            id="nickname-input"
          />

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
            {loading ? t('home.connecting') : t('home.start')}
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
      </div>
    </div>
  );
}
