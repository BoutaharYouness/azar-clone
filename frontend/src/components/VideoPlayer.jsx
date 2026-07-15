import React, { useEffect, useRef } from 'react';
import { t } from '../services/i18n';
import './VideoPlayer.css';

/**
 * Renders a MediaStream into a <video> element.
 * Handles both local (muted) and remote streams.
 */
export default function VideoPlayer({ stream, muted = false, label = '', isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-player-container ${isLocal ? 'local' : 'remote'}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
        />
      ) : (
        <div className="video-placeholder">
          <div className="placeholder-avatar">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="placeholder-text">{label || t('call.no_video')}</span>
        </div>
      )}
      {label && stream && (
        <div className="video-label-badge">
          {label}
        </div>
      )}
    </div>
  );
}
