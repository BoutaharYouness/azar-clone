import React, { useEffect, useRef } from 'react';

/**
 * Renders a MediaStream into a <video> element.
 * Handles both local (muted) and remote streams.
 */
export default function VideoPlayer({ stream, muted = false, style = {}, label = '', isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const containerClass = isLocal ? 'local-video-wrapper' : 'remote-video';

  return (
    <div className={isLocal ? 'local-video-wrapper' : 'video-container'} style={style}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={isLocal ? 'local-video' : 'remote-video'}
        />
      ) : (
        <div className="video-placeholder">
          <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
          <div>{label || 'No video'}</div>
        </div>
      )}
      {label && stream && (
        <div className="video-label">
          {label}
        </div>
      )}
    </div>
  );
}
