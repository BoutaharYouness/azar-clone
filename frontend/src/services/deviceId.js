/**
 * deviceId.js
 *
 * Generates a stable UUID per browser/device, stored in localStorage.
 * Used as device fingerprint for the moderation/blocking system.
 */

import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'azar_device_id';

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
