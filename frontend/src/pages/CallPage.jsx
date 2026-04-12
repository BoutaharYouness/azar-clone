import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCall from '../hooks/useCall';
import VideoPlayer from '../components/VideoPlayer';
import CallControls from '../components/CallControls';
import StatusBanner from '../components/StatusBanner';

export default function CallPage() {
  const navigate = useNavigate();

  // Retrieve session data set by LoginPage
  const sessionToken = sessionStorage.getItem('sessionToken');
  const nickname = sessionStorage.getItem('nickname');
  const country = sessionStorage.getItem('country');

  // Redirect to login if no session
  useEffect(() => {
    if (!sessionToken) navigate('/');
  }, [sessionToken, navigate]);

  const {
    status, STATUS, peerInfo,
    localStream, remoteStream,
    audioEnabled, videoEnabled, error,
    toggleAudio, toggleVideo,
    nextPeer, endCall, reportPeer,
  } = useCall({ sessionToken, nickname, country });

  const [reportSent, setReportSent] = useState(false);

  function handleEndCall() {
    endCall();
    navigate('/');
  }

  function handleReport() {
    if (reportSent) return;
    // In a real app, peerDeviceId comes from the MATCHED signal payload
    // For simplicity we pass a placeholder; the server matches by session
    reportPeer('peer-device-id-from-signal');
    setReportSent(true);
    setTimeout(() => setReportSent(false), 3000);
  }

  if (!sessionToken) return null;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#e94560' }}>🎥 ChatRandom</span>
        <span style={{ color: '#aaa', fontSize: 13 }}>
          👤 {nickname} &nbsp;|&nbsp; 🌍 {country}
        </span>
      </header>

      {/* Status */}
      <StatusBanner status={status} error={error} peerInfo={peerInfo} />

      {/* Video area */}
      <div style={videoAreaStyle}>
        {/* Remote video (large) */}
        <VideoPlayer
          stream={remoteStream}
          style={remoteVideoStyle}
          label={peerInfo ? `${peerInfo.nickname} — ${peerInfo.country}` : ''}
        />

        {/* Local video (PiP overlay) */}
        <VideoPlayer
          stream={localStream}
          muted
          style={localVideoStyle}
          label="You"
        />
      </div>

      {/* Controls */}
      <CallControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onNext={nextPeer}
        onEndCall={handleEndCall}
        onReport={handleReport}
        status={status}
      />

      {/* Report confirmation */}
      {reportSent && (
        <div style={toastStyle}>✅ Report submitted</div>
      )}

      {/* Searching overlay */}
      {status === STATUS.SEARCHING && (
        <div style={overlayStyle}>
          <div style={{ fontSize: 48 }}>🔍</div>
          <p style={{ fontSize: 18, marginTop: 16, color: '#aaa' }}>
            Finding someone for you...
          </p>
          <div style={spinnerStyle} />
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  background: '#0f0f13', padding: '12px 16px', gap: 12, position: 'relative',
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 4px',
};

const videoAreaStyle = {
  flex: 1, position: 'relative',
  minHeight: 300,
};

const remoteVideoStyle = {
  width: '100%', height: '100%', minHeight: 300,
  borderRadius: 16, background: '#111',
};

const localVideoStyle = {
  position: 'absolute', bottom: 12, right: 12,
  width: 140, height: 100,
  borderRadius: 10, border: '2px solid #333',
  zIndex: 10,
};

const overlayStyle = {
  position: 'absolute', inset: 0,
  background: 'rgba(15,15,19,0.85)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  borderRadius: 16, zIndex: 20,
};

const spinnerStyle = {
  width: 40, height: 40, borderRadius: '50%',
  border: '4px solid #2a2a4a',
  borderTop: '4px solid #e94560',
  animation: 'spin 1s linear infinite',
  marginTop: 20,
};

const toastStyle = {
  position: 'fixed', bottom: 24, left: '50%',
  transform: 'translateX(-50%)',
  background: '#2ecc71', color: '#fff',
  padding: '10px 24px', borderRadius: 24,
  fontWeight: 600, zIndex: 999,
};
