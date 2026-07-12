import React from 'react';

export default function CallControls({
  audioEnabled, videoEnabled,
  onToggleAudio, onToggleVideo,
  onNext, onEndCall, onReport,
  status,
}) {
  const isActive = status === 'connected' || status === 'connecting_peer';

  return (
    <div className="glass-panel controls-bar">
      {/* Mute toggle */}
      <button
        className={`control-btn ${audioEnabled ? '' : 'danger'}`}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? '🎤' : '🔇'}
      </button>

      {/* Camera toggle */}
      <button
        className={`control-btn ${videoEnabled ? '' : 'danger'}`}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Disable camera' : 'Enable camera'}
      >
        {videoEnabled ? '📷' : '🚫'}
      </button>

      {/* Next */}
      <button
        className="control-btn primary large"
        onClick={onNext}
        title="Skip to next person"
      >
        ⏭️
      </button>

      {/* End call */}
      <button
        className="control-btn danger large"
        onClick={onEndCall}
        title="End call"
      >
        📵
      </button>

      {/* Report */}
      {isActive && (
        <button
          className="control-btn"
          style={{ backgroundColor: '#7f1010' }}
          onClick={onReport}
          title="Report this user"
        >
          🚨
        </button>
      )}
    </div>
  );
}
