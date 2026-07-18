import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminStats, fetchAdminReports, blockDevice, unblockDevice } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [blockForm, setBlockForm] = useState({ deviceId: '', ipAddress: '', reason: '' });
  const [blockMsg, setBlockMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Guard: only ADMIN users can view this page
  useEffect(() => {
    const role = localStorage.getItem('hours_user_role');
    if (role !== 'ADMIN') {
      navigate('/');
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, reportsData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminReports(),
      ]);
      setStats(statsData);
      setReports(reportsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleBlock(e) {
    e.preventDefault();
    if (!blockForm.deviceId && !blockForm.ipAddress) {
      setBlockMsg('Provide a Device ID or IP address.');
      return;
    }
    try {
      await blockDevice({ ...blockForm });
      setBlockMsg('✅ Block applied successfully.');
      setBlockForm({ deviceId: '', ipAddress: '', reason: '' });
      loadData();
    } catch (err) {
      setBlockMsg(`❌ Error: ${err.message}`);
    }
  }

  async function handleUnblock(deviceId) {
    try {
      await unblockDevice(deviceId);
      setBlockMsg(`✅ Device ${deviceId} unblocked.`);
      loadData();
    } catch (err) {
      setBlockMsg(`❌ Error: ${err.message}`);
    }
  }

  const topCountries = stats?.topCountries || [];
  const maxCount = topCountries.length > 0 ? Math.max(...topCountries.map(c => c.count || 0)) : 1;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Loading admin dashboard…
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 48 }}>
      <div className="admin-dashboard-container">

        {/* Header */}
        <div className="admin-header-row">
          <div className="admin-title-area">
            <h2>Admin Dashboard</h2>
            <p>Live platform monitoring and moderation controls</p>
          </div>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ fontSize: '0.9rem' }}>
            ← Back to App
          </button>
        </div>

        {/* Live Stats Grid */}
        <div className="admin-stats-grid">
          {[
            { label: 'Online Users', value: stats?.onlineUsers ?? 0, type: '' },
            { label: 'Searching', value: stats?.usersSearching ?? 0, type: '' },
            { label: 'Active Calls', value: stats?.activeCalls ?? 0, type: 'success' },
            { label: 'Total Reports', value: stats?.totalReports ?? 0, type: 'alert' },
            { label: 'Blocked Devices', value: stats?.totalBlocked ?? 0, type: 'alert' },
            { label: 'Total Users', value: stats?.totalUsers ?? 0, type: '' },
            { label: 'Avg Call Duration', value: `${stats?.averageCallDurationSeconds ?? 0}s`, type: '' },
          ].map(item => (
            <div key={item.label} className={`admin-stat-card ${item.type}`}>
              <div className="admin-stat-card-lbl">{item.label}</div>
              <div className="admin-stat-card-val">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</div>
            </div>
          ))}
        </div>

        {/* Reports + Countries + Block Form */}
        <div className="admin-content-grid">

          {/* Recent Reports */}
          <div className="admin-section-card">
            <h3 className="admin-section-title">
              Recent Reports
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>{reports.length} total</span>
            </h3>
            {reports.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>No reports yet. 🎉</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Reporter</th>
                      <th>Reported</th>
                      <th>Category</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 20).map(r => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-tertiary)' }}>{r.id}</td>
                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {r.reporterDeviceId?.slice(0, 12)}…
                        </td>
                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {r.reportedDeviceId?.slice(0, 12)}…
                        </td>
                        <td>
                          {r.reasonCategory && (
                            <span className="badge-reason">{r.reasonCategory.toUpperCase()}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Country Distribution + Block Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Top Countries */}
            <div className="admin-section-card">
              <h3 className="admin-section-title">Top Countries</h3>
              {topCountries.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>No data yet.</p>
              ) : (
                <div className="admin-countries-list">
                  {topCountries.map((item, i) => (
                    <div key={i} className="admin-country-item">
                      <span style={{ minWidth: 80, fontSize: '0.9rem' }}>{item.country || 'Unknown'}</span>
                      <div className="admin-country-bar-bg">
                        <div
                          className="admin-country-bar"
                          style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                        />
                      </div>
                      <span style={{ minWidth: 30, textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Block Device Form */}
            <div className="admin-section-card">
              <h3 className="admin-section-title">Block Device / IP</h3>
              {blockMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  background: blockMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: blockMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${blockMsg.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {blockMsg}
                </div>
              )}
              <form className="admin-block-form" onSubmit={handleBlock}>
                <input
                  className="input-field"
                  placeholder="Device ID (optional)"
                  value={blockForm.deviceId}
                  onChange={e => setBlockForm(f => ({ ...f, deviceId: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="IP Address (optional)"
                  value={blockForm.ipAddress}
                  onChange={e => setBlockForm(f => ({ ...f, ipAddress: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Block reason"
                  value={blockForm.reason}
                  onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                />
                <button type="submit" className="btn-danger" style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', fontFamily: 'Inter, sans-serif' }}>
                  Apply Block
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* Refresh button */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="btn-secondary" onClick={loadData} style={{ fontSize: '0.85rem' }}>
            ↻ Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
