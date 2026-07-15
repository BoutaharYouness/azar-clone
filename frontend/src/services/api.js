/**
 * api.js — Thin REST client for the Spring Boot backend.
 * All business logic lives on the server.
 */

const BASE_URL = ''; //hna

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Create an anonymous session on the backend.
 * @returns {Promise<{sessionToken, nickname, country, success, message}>}
 */
export async function createSession(nickname, deviceId, country, language) {
  return post('/api/v1/session', { nickname, deviceId, country, language });
}

/**
 * Report a peer device to the backend moderation system.
 */
export async function reportUser(reporterSessionToken, reportedDeviceId, reason = '') {
  return post('/api/v1/report', { reporterSessionToken, reportedDeviceId, reason });
}

/**
 * Fetch live platform statistics.
 * @returns {Promise<{onlineUsers, waitingUsers, countriesOnline, avgWaitSeconds}>}
 */
export async function fetchStats() {
  return get('/api/v1/stats');
}