import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useCall from '../hooks/useCall';
import VideoPlayer from '../components/VideoPlayer';
import CallControls from '../components/CallControls';
import StatusBanner from '../components/StatusBanner';
import { t, getLocale } from '../services/i18n';
import { sendSignal } from '../services/signalingService';
import { playMatchFound, playDisconnected, playMessageReceived, playToggle } from '../services/soundService';
import './CallPage.css';

const SEARCH_TIPS = [
  () => t('call.searching_tip_1'),
  () => t('call.searching_tip_2'),
  () => t('call.searching_tip_3'),
];

const REACTIONS = ['👍', '😂', '❤️', '👋', '🔥'];

const REPORT_REASONS = [
  { key: 'spam', label: () => t('report.spam') },
  { key: 'nudity', label: () => t('report.nudity') },
  { key: 'harassment', label: () => t('report.harassment') },
  { key: 'fake_camera', label: () => t('report.fake_camera') },
  { key: 'other', label: () => t('report.other') },
];

export default function CallPage() {
  const navigate = useNavigate();

  const sessionToken = sessionStorage.getItem('sessionToken');
  const nickname = sessionStorage.getItem('nickname');
  const country = sessionStorage.getItem('country');
  const userCountryCode = sessionStorage.getItem('userCountryCode');

  useEffect(() => {
    if (!sessionToken) navigate('/');
  }, [sessionToken, navigate]);

  const {
    status, STATUS, peerInfo,
    localStream, remoteStream,
    audioEnabled, videoEnabled, error,
    toggleAudio, toggleVideo,
    nextPeer, endCall, reportPeer,
    onSignalRef,
  } = useCall({ sessionToken, nickname, country });

  // ─── State ───
  const [showControls, setShowControls] = useState(true);
  const [matchToast, setMatchToast] = useState(null);
  const [reportSent, setReportSent] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [callTimer, setCallTimer] = useState(0);
  const [sessionStats, setSessionStats] = useState({ peopleMet: 0, countries: new Set() });
  const [currentTip, setCurrentTip] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimerRef = useRef(null);
  const callTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const prevStatusRef = useRef(status);

  // ─── Auto-hide controls ───
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (status === 'connected') {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [status]);

  useEffect(() => {
    const handler = () => resetControlsTimer();
    window.addEventListener('mousemove', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [resetControlsTimer]);

  // ─── Call timer ───
  useEffect(() => {
    if (status === 'connected') {
      setCallTimer(0);
      callTimerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [status]);

  // ─── Sound effects & match toast ───
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (status === 'connected' && prev !== 'connected') {
      playMatchFound();
      if (peerInfo) {
        setMatchToast(peerInfo);
        setSessionStats(s => ({
          peopleMet: s.peopleMet + 1,
          countries: new Set([...s.countries, peerInfo.country]),
        }));
        setTimeout(() => setMatchToast(null), 2500);
      }
    }
    if (status === 'searching' && prev === 'connected') {
      playDisconnected();
      setChatMessages([]);
    }
    prevStatusRef.current = status;
  }, [status, peerInfo]);

  // ─── Rotating search tips ───
  useEffect(() => {
    if (status !== 'searching') return;
    const interval = setInterval(() => {
      setCurrentTip(i => (i + 1) % SEARCH_TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  // ─── Handle incoming chat/reaction signals ───
  useEffect(() => {
    if (!onSignalRef) return;
    const origHandler = onSignalRef.current;
    onSignalRef.current = (signal) => {
      if (signal.type === 'CHAT_MESSAGE') {
        playMessageReceived();
        setChatMessages(msgs => [...msgs, { from: 'peer', text: signal.message, ts: Date.now() }]);
      } else if (signal.type === 'REACTION') {
        spawnFloatingReaction(signal.message, false);
      } else if (origHandler) {
        origHandler(signal);
      }
    };
  }, [onSignalRef]);

  // ─── Auto scroll chat ───
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'n':
        case ' ':
          e.preventDefault();
          nextPeer();
          break;
        case 'm':
          e.preventDefault();
          playToggle();
          toggleAudio();
          break;
        case 'v':
          e.preventDefault();
          playToggle();
          toggleVideo();
          break;
        case 'r':
          e.preventDefault();
          setShowReportModal(true);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape':
          setShowReportModal(false);
          setShowSettingsModal(false);
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextPeer, toggleAudio, toggleVideo]);

  // ─── Chat send ───
  function sendChatMessage() {
    const msg = chatInput.trim();
    if (!msg || !sessionToken) return;
    sendSignal({
      type: 'CHAT_MESSAGE',
      senderSessionToken: sessionToken,
      message: msg,
    });
    setChatMessages(msgs => [...msgs, { from: 'me', text: msg, ts: Date.now() }]);
    setChatInput('');
  }

  // ─── Emoji reaction ───
  function sendReaction(emoji) {
    if (!sessionToken) return;
    sendSignal({
      type: 'REACTION',
      senderSessionToken: sessionToken,
      message: emoji,
    });
    spawnFloatingReaction(emoji, true);
  }

  function spawnFloatingReaction(emoji, fromMe) {
    const id = Date.now() + Math.random();
    const x = fromMe ? 70 + Math.random() * 20 : 10 + Math.random() * 20;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  }

  // ─── Fullscreen ───
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  // ─── Report ───
  function handleReport(reason) {
    reportPeer('peer-device-id-from-signal');
    setReportSent(true);
    setShowReportModal(false);
    setTimeout(() => setReportSent(false), 3000);
  }

  // ─── End call ───
  function handleEndCall() {
    endCall();
    navigate('/');
  }

  // ─── Format timer ───
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (!sessionToken) return null;

  const isConnected = status === 'connected' || status === 'connecting_peer';
  const countryFlag = getCountryFlag(peerInfo?.country);

  return (
    <div className="call-page" onMouseMove={resetControlsTimer}>

      {/* Header */}
      <header className={`call-header ${showControls ? 'visible' : 'hidden'}`}>
        <span className="header-brand">{t('app.name')}</span>
        <div className="header-right">
          {status === 'connected' && (
            <span className="call-timer">{formatTime(callTimer)}</span>
          )}
          <div className="user-badge">
            <span className="user-nickname">{nickname}</span>
            <span className="user-country">{getCountryFlag(country)} {country}</span>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      <StatusBanner status={status} error={error} peerInfo={peerInfo} />

      {/* Video area */}
      <div className="video-area">
        <VideoPlayer
          stream={remoteStream}
          label={peerInfo ? `${peerInfo.nickname}` : ''}
        />
        <VideoPlayer
          stream={localStream}
          muted
          isLocal={true}
          label={t('call.you')}
        />
      </div>

      {/* Floating reactions */}
      {floatingReactions.map(r => (
        <div
          key={r.id}
          className="floating-reaction"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Match toast */}
      {matchToast && (
        <div className="match-toast">
          <span className="match-toast-flag">{countryFlag}</span>
          <div className="match-toast-info">
            <span className="match-toast-name">{matchToast.nickname}</span>
            <span className="match-toast-country">{matchToast.country}</span>
          </div>
          <span className="match-toast-status">{t('call.match_found')}</span>
        </div>
      )}

      {/* Quick reaction bar */}
      {isConnected && (
        <div className={`reaction-bar ${showControls ? 'visible' : 'hidden'}`}>
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              className="reaction-btn"
              onClick={() => sendReaction(emoji)}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat toggle & panel */}
      {isConnected && showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>{t('controls.chat')}</span>
            <button className="chat-close-btn" onClick={() => setShowChat(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div className="chat-empty">
                <span style={{fontSize: 24, marginBottom: 4}}>💬</span>
                <span style={{color: 'var(--text-tertiary)', fontSize: '0.85rem'}}>
                  {t('chat.placeholder')}
                </span>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.from === 'me' ? 'me' : 'peer'}`}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder={t('chat.placeholder')}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              maxLength={300}
            />
            <button className="chat-send-btn" onClick={sendChatMessage}>{t('chat.send')}</button>
          </div>
        </div>
      )}

      {/* Controls */}
      <CallControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={() => { playToggle(); toggleAudio(); }}
        onToggleVideo={() => { playToggle(); toggleVideo(); }}
        onNext={nextPeer}
        onEndCall={handleEndCall}
        onReport={() => setShowReportModal(true)}
        onSettings={() => setShowSettingsModal(true)}
        onChat={() => setShowChat(c => !c)}
        onFullscreen={toggleFullscreen}
        status={status}
        visible={showControls}
        isFullscreen={isFullscreen}
        showChat={showChat}
      />

      {/* Searching overlay */}
      {status === STATUS.SEARCHING && (
        <div className="searching-overlay">
          <div className="search-pulse-ring">
            <div className="search-icon-inner">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
          <p className="searching-text">{t('call.searching')}</p>
          <p className="searching-tip" key={currentTip}>{SEARCH_TIPS[currentTip]()}</p>
          {/* Session stats */}
          <div className="session-stats">
            <div className="session-stat">
              <span className="session-stat-value">{sessionStats.peopleMet}</span>
              <span className="session-stat-label">{t('stats.people_met')}</span>
            </div>
            <div className="session-stat">
              <span className="session-stat-value">{sessionStats.countries.size}</span>
              <span className="session-stat-label">{t('stats.countries')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Report toast */}
      {reportSent && (
        <div className="toast">
          ✅ {t('report.success')}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('report.title')}</h2>
            <div className="report-reasons">
              {REPORT_REASONS.map(r => (
                <button
                  key={r.key}
                  className="report-reason-btn"
                  onClick={() => handleReport(r.key)}
                >
                  {r.label()}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => setShowReportModal(false)}
            >
              {t('report.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('settings.title')}</h2>
            <div className="settings-list">
              <div className="settings-item">
                <span>{t('settings.camera')}</span>
                <span className="settings-status">{videoEnabled ? '✅' : '❌'}</span>
              </div>
              <div className="settings-item">
                <span>{t('settings.microphone')}</span>
                <span className="settings-status">{audioEnabled ? '✅' : '❌'}</span>
              </div>
              <div className="settings-item">
                <span>{t('settings.language')}</span>
                <span className="settings-status">{getLocale().toUpperCase()}</span>
              </div>
              <div className="settings-item">
                <span>{t('settings.noise_suppression')}</span>
                <span className="settings-status">Auto</span>
              </div>
              <div className="settings-item">
                <span>{t('settings.video_quality')}</span>
                <span className="settings-status">HD</span>
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => setShowSettingsModal(false)}
            >
              {t('settings.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Get a flag emoji from a country name */
function getCountryFlag(countryName) {
  const FLAGS = {
    'Morocco': '🇲🇦', 'France': '🇫🇷', 'United States': '🇺🇸',
    'United Kingdom': '🇬🇧', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
    'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Brazil': '🇧🇷',
    'Saudi Arabia': '🇸🇦', 'Egypt': '🇪🇬', 'Algeria': '🇩🇿',
    'Tunisia': '🇹🇳', 'Turkey': '🇹🇷', 'India': '🇮🇳',
    'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺',
    'Mexico': '🇲🇽', 'Poland': '🇵🇱', 'Local': '🏠',
    'Unknown': '🌍',
  };
  return FLAGS[countryName] || '🌍';
}
