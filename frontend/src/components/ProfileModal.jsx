import React, { useEffect, useState } from 'react';
import { fetchUserProfile } from '../services/api';

export default function ProfileModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('hours_access_token');
    if (!token) return;

    setLoading(true);
    fetchUserProfile()
      .then(data => setProfile(data))
      .catch(err => console.error('Failed to load profile:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Fallback to localStorage for quick display
  const nickname = profile?.nickname || localStorage.getItem('hours_user_nickname') || 'Anonymous';
  const email = profile?.email || localStorage.getItem('hours_user_email') || '';
  const role = profile?.role || localStorage.getItem('hours_user_role') || 'FREE';
  const avatarUrl = profile?.avatarUrl || localStorage.getItem('hours_user_avatar') || '';
  const totalMatches = profile?.totalMatches ?? 0;
  const totalSeconds = profile?.totalCallDurationSeconds ?? 0;
  const reputationScore = profile?.reputationScore ?? 100;
  const switchCount = profile?.switchCount ?? 0;
  const country = profile?.country || sessionStorage.getItem('country') || '—';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const roleClass = role.toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal-card" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.4rem' }}
        >&times;</button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading profile…
          </div>
        ) : (
          <>
            {/* Avatar & Name */}
            <div className="profile-avatar-row">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar" style={{ overflow: 'hidden' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={nickname} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
                {role !== 'FREE' && <span className="premium-badge">{role === 'ADMIN' ? '👑 Admin' : '⭐ Premium'}</span>}
              </div>

              <h2 className="profile-nickname">
                {nickname}
                <span className={`profile-role-badge ${roleClass}`}>{role}</span>
              </h2>

              {email && (
                <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{email}</p>
              )}
              {country && (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📍 {country}</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span className="profile-stat-num">{totalMatches.toLocaleString()}</span>
                <span className="profile-stat-lbl">Matches</span>
              </div>
              <div className="profile-stat-box">
                <span className="profile-stat-num">{durationStr || '0m'}</span>
                <span className="profile-stat-lbl">Call Time</span>
              </div>
              <div className="profile-stat-box">
                <span className="profile-stat-num" style={{ color: reputationScore >= 80 ? 'var(--success)' : reputationScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                  {reputationScore}
                </span>
                <span className="profile-stat-lbl">Reputation</span>
              </div>
              <div className="profile-stat-box">
                <span className="profile-stat-num">{switchCount}</span>
                <span className="profile-stat-lbl">Switches</span>
              </div>
            </div>

            {/* Upgrade CTA for free users */}
            {role === 'FREE' && (
              <div style={{
                marginTop: 24,
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(34,158,217,0.1) 0%, rgba(138,43,226,0.1) 100%)',
                border: '1px solid rgba(34,158,217,0.2)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '0.95rem' }}>⭐ Unlock Premium</p>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Get gender filters, country filters, HD video, and unlimited switches.
                </p>
                <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                  Upgrade to Premium
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
