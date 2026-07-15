import React from 'react';
import { t } from '../services/i18n';
import './StatusBanner.css';

export default function StatusBanner({ status, error, peerInfo }) {
  if (status === 'searching') return null; // We have a custom full-screen overlay for searching

  const getStatusText = () => {
    switch (status) {
      case 'init': return t('call.init');
      case 'connecting_ws': return t('call.connecting_ws');
      case 'connecting_peer': return t('call.connecting_peer');
      case 'connected': return t('call.connected');
      case 'disconnected': return t('call.disconnected');
      case 'error': return error || t('call.error');
      default: return t('call.init');
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'connected': return 'status-connected';
      case 'error':
      case 'disconnected': return 'status-error';
      default: return 'status-loading';
    }
  };

  return (
    <div className={`status-banner-card ${getStatusClass()}`}>
      <span className="status-indicator-dot"></span>
      <span className="status-banner-text">
        {getStatusText()}
        {peerInfo && status === 'connected' && (
          <span className="status-peer-name">
             &nbsp;{t('call.with')}&nbsp;<strong>{peerInfo.nickname}</strong>
          </span>
        )}
      </span>
    </div>
  );
}
