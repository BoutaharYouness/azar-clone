import React, { useEffect, useState } from 'react';
import { t, SUPPORTED_LOCALES, setLocale, isRTL } from '../services/i18n';

export default function SettingsModal({ isOpen, onClose }) {
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  
  const [selectedCamera, setSelectedCamera] = useState(localStorage.getItem('hours_camera') || '');
  const [selectedMic, setSelectedMic] = useState(localStorage.getItem('hours_mic') || '');
  const [selectedQuality, setSelectedQuality] = useState(localStorage.getItem('hours_quality') || '720p');
  const [selectedLanguage, setSelectedLanguage] = useState(sessionStorage.getItem('hours_locale') || 'en');
  const [genderFilter, setGenderFilter] = useState(localStorage.getItem('hours_gender_filter') || 'all');
  const [countryFilter, setCountryFilter] = useState(localStorage.getItem('hours_country_filter') || '');
  const [notifications, setNotifications] = useState(localStorage.getItem('hours_notifications') !== 'false');

  const isPremium = ['PREMIUM', 'ADMIN'].includes(localStorage.getItem('hours_user_role'));

  useEffect(() => {
    if (!isOpen) return;

    // Load available media devices
    async function loadDevices() {
      try {
        // Prompt permissions if needed
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const video = devices.filter(d => d.kind === 'videoinput');
        const audio = devices.filter(d => d.kind === 'audioinput');
        
        setVideoDevices(video);
        setAudioDevices(audio);

        if (video.length > 0 && !selectedCamera) setSelectedCamera(video[0].deviceId);
        if (audio.length > 0 && !selectedMic) setSelectedMic(audio[0].deviceId);
      } catch (err) {
        console.error('Error listing hardware devices:', err);
      }
    }

    loadDevices();
  }, [isOpen, selectedCamera, selectedMic]);

  if (!isOpen) return null;

  async function handleSave() {
    localStorage.setItem('hours_camera', selectedCamera);
    localStorage.setItem('hours_mic', selectedMic);
    localStorage.setItem('hours_quality', selectedQuality);
    localStorage.setItem('hours_notifications', notifications.toString());

    if (isPremium) {
      localStorage.setItem('hours_gender_filter', genderFilter);
      localStorage.setItem('hours_country_filter', countryFilter);
      
      // Update profile on backend
      const accessToken = localStorage.getItem('hours_access_token');
      if (accessToken) {
        try {
          const { updateUserProfile } = await import('../services/api');
          await updateUserProfile({ genderFilter, countryFilter });
        } catch (e) {
          console.error('Failed to sync filters to backend profile:', e);
        }
      }
    }

    // Language update
    if (selectedLanguage !== sessionStorage.getItem('hours_locale')) {
      setLocale(selectedLanguage);
      if (isRTL()) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
      window.location.reload(); // Refresh to reload language configurations
    }

    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{t('settings.title')}</h2>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.5rem', padding: 0 }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="settings-grid">
          {/* Camera Selection */}
          <div className="settings-row">
            <label htmlFor="settings-camera">{t('settings.camera')}</label>
            <select 
              id="settings-camera"
              className="select-field" 
              value={selectedCamera} 
              onChange={(e) => setSelectedCamera(e.target.value)}
            >
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${videoDevices.indexOf(d) + 1}`}
                </option>
              ))}
              {videoDevices.length === 0 && <option value="">No cameras detected</option>}
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="settings-row">
            <label htmlFor="settings-mic">{t('settings.microphone')}</label>
            <select 
              id="settings-mic"
              className="select-field" 
              value={selectedMic} 
              onChange={(e) => setSelectedMic(e.target.value)}
            >
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${audioDevices.indexOf(d) + 1}`}
                </option>
              ))}
              {audioDevices.length === 0 && <option value="">No microphones detected</option>}
            </select>
          </div>

          {/* Video Quality Selection */}
          <div className="settings-row">
            <label htmlFor="settings-quality">{t('settings.video_quality')}</label>
            <select 
              id="settings-quality"
              className="select-field" 
              value={selectedQuality} 
              onChange={(e) => setSelectedQuality(e.target.value)}
            >
              <option value="360p">Standard Definition (360p)</option>
              <option value="480p">Medium Quality (480p)</option>
              <option value="720p">High Definition (720p)</option>
              <option value="1080p">Full HD (1080p - Premium)</option>
            </select>
          </div>

          {/* Language Selection */}
          <div className="settings-row">
            <label htmlFor="settings-language">{t('settings.language')}</label>
            <select 
              id="settings-language"
              className="select-field" 
              value={selectedLanguage} 
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {SUPPORTED_LOCALES.map(loc => (
                <option key={loc.code} value={loc.code}>
                  {loc.flag} {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Premium Filters Block */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTime: '16px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '0.9rem', color: isPremium ? 'var(--primary)' : 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700 }}>
              Premium Preferences {!isPremium && '(Locked 🔒)'}
            </h3>
            
            <div className="settings-grid" style={{ opacity: isPremium ? 1 : 0.5, pointerEvents: isPremium ? 'auto' : 'none' }}>
              <div className="settings-row">
                <label htmlFor="settings-gender-filter">{t('settings.gender_filter')}</label>
                <select 
                  id="settings-gender-filter"
                  className="select-field" 
                  value={genderFilter} 
                  onChange={(e) => setGenderFilter(e.target.value)}
                  disabled={!isPremium}
                >
                  <option value="all">Match with Anyone (All)</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>

              <div className="settings-row">
                <label htmlFor="settings-country-filter">{t('settings.country_filter')}</label>
                <input 
                  id="settings-country-filter"
                  className="input-field" 
                  placeholder="e.g. Morocco (Leave empty for Worldwide)"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  disabled={!isPremium}
                />
              </div>
            </div>
          </div>

          {/* Notification toggler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <input 
              type="checkbox" 
              id="notifications" 
              checked={notifications} 
              onChange={(e) => setNotifications(e.target.checked)} 
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="notifications" style={{ cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none', color: 'var(--text-secondary)' }}>
              Enable call matching sound alerts
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="btn-secondary" onClick={onClose}>{t('report.cancel')}</button>
          <button className="btn-primary" onClick={handleSave}>{t('settings.save')}</button>
        </div>
      </div>
    </div>
  );
}
