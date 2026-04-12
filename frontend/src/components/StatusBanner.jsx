import React from 'react';

const MESSAGES = {
  init: { text: 'Initializing...', color: '#555', icon: '⏳' },
  connecting_ws: { text: 'Connecting to server...', color: '#f39c12', icon: '🔌' },
  searching: { text: 'Looking for someone...', color: '#3498db', icon: '🔍' },
  connecting_peer: { text: 'Connecting to peer...', color: '#9b59b6', icon: '🤝' },
  connected: { text: 'Connected!', color: '#2ecc71', icon: '✅' },
  disconnected: { text: 'Disconnected', color: '#e74c3c', icon: '🔴' },
  error: { text: 'Error', color: '#e74c3c', icon: '❌' },
};

export default function StatusBanner({ status, error, peerInfo }) {
  const meta = MESSAGES[status] || MESSAGES.init;

  return (
    <div style={{
      padding: '10px 20px', borderRadius: 12,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 18 }}>{meta.icon}</span>
      <span style={{ color: meta.color, fontWeight: 600, fontSize: 14 }}>
        {error || meta.text}
      </span>

      {peerInfo && status === 'connected' && (
        <span style={{ color: '#aaa', fontSize: 13 }}>
          with <strong style={{ color: '#fff' }}>{peerInfo.nickname}</strong>
          {peerInfo.country && (
            <> &nbsp;🌍 {peerInfo.country}</>
          )}
        </span>
      )}
    </div>
  );
}
