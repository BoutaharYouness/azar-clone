import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCall from '../hooks/useCall';
import VideoPlayer from '../components/VideoPlayer';
import CallControls from '../components/CallControls';
import StatusBanner from '../components/StatusBanner';
import './CallPage.css';

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
    <div className="call-page">
      {/* Header */}
      <header className="call-header">
        <span className="brand">Nexus</span>
        <div className="user-info">
          <span className="nickname">{nickname}</span>
          <span className="country">🌍 {country}</span>
        </div>
      </header>

      {/* Status Banner */}
      <StatusBanner status={status} error={error} peerInfo={peerInfo} />

      {/* Video area */}
      <div className="video-container">
        {/* Remote video (large) */}
        <VideoPlayer
          stream={remoteStream}
          label={peerInfo ? `${peerInfo.nickname} — ${peerInfo.country}` : ''}
        />

        {/* Local video (PiP overlay) */}
        <VideoPlayer
          stream={localStream}
          muted
          isLocal={true}
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
        <div className="toast">✅ Report submitted successfully</div>
      )}

      {/* Searching overlay */}
      {status === STATUS.SEARCHING && (
        <div className="searching-overlay">
          <div className="search-radar">🔍</div>
          <p style={{ fontSize: 18, marginTop: 16, color: 'var(--text-secondary)' }}>
            Finding someone for you...
          </p>
        </div>
      )}
    </div>
  );
}
