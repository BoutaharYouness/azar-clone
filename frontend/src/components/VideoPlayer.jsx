import React, { useEffect, useRef } from 'react';

/**
 * Renders a MediaStream into a <video> element.
 * Handles both local (muted) and remote streams.
 */
export default function VideoPlayer({ stream, muted = false, style = {}, label = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const containerStyle = {
    position: 'relative',
    background: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  return (
    <div style={containerStyle}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ color: '#555', textAlign: 'center', fontSize: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
          <div>{label || 'No video'}</div>
        </div>
      )}
      {label && stream && (
        <div style={{
          position: 'absolute', bottom: 8, left: 12,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          padding: '2px 8px', borderRadius: 8, fontSize: 12,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
