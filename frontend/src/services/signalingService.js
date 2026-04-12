/**
 * signalingService.js
 *
 * Manages the STOMP over SockJS connection to the Spring Boot backend.
 * The backend is the sole authority on routing — this service is a thin transport layer.
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = '/ws'; //hna

let stompClient = null;
let stompSessionId = null;
let onSignalCallback = null;

/**
 * Connect to the backend WebSocket broker.
 * @param {function} onSignal - called with each SignalingMessage from server
 * @returns {Promise<string>} resolves with the STOMP session ID
 */
export function connect(onSignal) {
  return new Promise((resolve, reject) => {
    onSignalCallback = onSignal;

    stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: (frame) => {
        // Extract STOMP session ID assigned by server
        stompSessionId = frame.headers['user-name'] || frame.headers['session'];

        // Subscribe to our personal queue (session-specific)
        // The server sends signals to /queue/signal-{stompSessionId}
        stompClient.subscribe(`/queue/signal-${stompSessionId}`, (msg) => {
          try {
            const signal = JSON.parse(msg.body);
            if (onSignalCallback) onSignalCallback(signal);
          } catch (e) {
            console.error('Failed to parse signal:', e);
          }
        });

        resolve(stompSessionId);
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
        reject(new Error(frame.headers?.message || 'WebSocket error'));
      },
      onDisconnect: () => {
        console.log('STOMP disconnected');
      },
    });

    stompClient.activate();
  });
}

/**
 * Send a signaling message to the backend.
 * @param {object} message - SignalingMessage payload
 */
export function sendSignal(message) {
  if (!stompClient || !stompClient.connected) {
    console.warn('STOMP not connected — cannot send signal');
    return;
  }
  stompClient.publish({
    destination: '/app/signal',
    body: JSON.stringify(message),
  });
}

/**
 * Request to join the matchmaking queue.
 * @param {string} sessionToken - backend session token
 */
export function joinQueue(sessionToken) {
  if (!stompClient || !stompClient.connected) return;
  stompClient.publish({
    destination: '/app/queue',
    body: JSON.stringify({
      type: 'SEARCHING',
      senderSessionToken: sessionToken,
    }),
  });
}

/** Disconnect from the broker */
export function disconnect() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}

export function getStompSessionId() {
  return stompSessionId;
}
