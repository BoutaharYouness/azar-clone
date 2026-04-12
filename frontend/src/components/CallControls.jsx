import React from 'react';

const btn = (bg, hover) => ({
  width: 54, height: 54, borderRadius: '50%', border: 'none',
  background: bg, color: '#fff', fontSize: 20, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform 0.1s, opacity 0.2s',
  flexShrink: 0,
});

export default function CallControls({
  audioEnabled, videoEnabled,
  onToggleAudio, onToggleVideo,
  onNext, onEndCall, onReport,
  status,
}) {
  const isActive = status === 'connected' || status === 'connecting_peer';

  return (
    <div style={{
      display: 'flex', gap: 12, justifyContent: 'center',
      alignItems: 'center', padding: '16px 0', flexWrap: 'wrap',
    }}>
      {/* Mute toggle */}
      <button
        style={btn(audioEnabled ? '#2a2a4a' : '#e94560')}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? '🎤' : '🔇'}
      </button>

      {/* Camera toggle */}
      <button
        style={btn(videoEnabled ? '#2a2a4a' : '#e94560')}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Disable camera' : 'Enable camera'}
      >
        {videoEnabled ? '📷' : '🚫'}
      </button>

      {/* Next */}
      <button
        style={btn('#0f3460')}
        onClick={onNext}
        title="Skip to next person"
      >
        ⏭️
      </button>

      {/* End call */}
      <button
        style={{ ...btn('#e74c3c'), width: 64, height: 64, fontSize: 24 }}
        onClick={onEndCall}
        title="End call"
      >
        📵
      </button>

      {/* Report */}
      {isActive && (
        <button
          style={{ ...btn('#7f1010'), fontSize: 16 }}
          onClick={onReport}
          title="Report this user"
        >
          🚨
        </button>
      )}
    </div>
  );
}
