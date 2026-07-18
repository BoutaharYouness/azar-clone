/**
 * REST client for the Spring Boot backend.
 */

const BASE_URL = '';

function getHeaders(token = null) {
  const headers = { 'Content-Type': 'application/json' };
  const jwt = token || localStorage.getItem('hours_access_token');
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }
  return headers;
}

async function post(path, body, token = null) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

async function put(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function createSession(nickname, deviceId, country, language, browserFingerprint = '') {
  return post('/api/v1/session', { nickname, deviceId, country, language, browserFingerprint });
}

export async function fetchStats() {
  return get('/api/v1/stats');
}

export async function reportUser(reporterSessionToken, reportedDeviceId, reason = '', reasonCategory = 'other') {
  return post('/api/v1/report', { reporterSessionToken, reportedDeviceId, reason, reasonCategory });
}

export async function signInWithGoogle(credential, deviceId, country = '', language = 'en') {
  return post('/api/v1/auth/google', { credential, deviceId, country, language });
}

export async function refreshAccessToken(refreshToken) {
  return post('/api/v1/auth/refresh', { refreshToken });
}

export async function fetchUserProfile() {
  return get('/api/v1/user/profile');
}

export async function updateUserProfile(profileData) {
  return put('/api/v1/user/profile', profileData);
}

export async function fetchAdminStats() {
  return get('/api/v1/admin/stats');
}

export async function fetchAdminReports() {
  return get('/api/v1/admin/reports');
}

export async function blockDevice(blockData) {
  return post('/api/v1/admin/block', blockData);
}

export async function unblockDevice(deviceId) {
  return post('/api/v1/admin/unblock', { deviceId });
}

export async function checkFrameModeration(base64Image) {
  return post('/api/v1/moderation/check-frame', { image: base64Image });
}

export async function checkTextModeration(text) {
  return post('/api/v1/moderation/check-text', { text });
}