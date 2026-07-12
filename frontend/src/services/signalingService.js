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
let onReconnectCallback = null;

function extractSockJsSessionId(ws) {
  try {
    // 1. Try the underlying native WebSocket URL first (most specific, contains session ID)
    let url = ws?._transport?.ws?.url || ws?.conn?._transport?.ws?.url;
    // 2. Fallback to other transport properties
    if (!url || url.endsWith('/ws')) {
      url = ws?._transport?.url || ws?.conn?._transport?.url || ws?.url;
    }

    if (!url) return null;
    console.log('[STOMP] Found WebSocket URL:', url);
    const segments = url.split('/');
    if (segments.length >= 2) {
      const last = segments[segments.length - 1];
      const secondToLast = segments[segments.length - 2];
      
      // SockJS format: ws://<host>/ws/<server>/<session>/websocket
      if (last === 'websocket' || last === 'xhr' || last === 'xhr_streaming') {
        return secondToLast;
      }
      
      // General format: search for the 'ws' segment
      const wsIndex = segments.indexOf('ws');
      if (wsIndex !== -1 && segments.length > wsIndex + 2) {
        return segments[wsIndex + 2];
      }
    }
  } catch (e) {
    console.error('[STOMP] Error parsing WebSocket URL:', e);
  }
  return null;
}

/**
 * Connect to the backend WebSocket broker.
 * @param {function} onSignal - called with each SignalingMessage from server
 * @param {function} onReconnect - called with new stompSessionId when STOMP reconnects
 * @returns {Promise<string>} resolves with the STOMP session ID
 */
export function connect(onSignal, onReconnect) {
  return new Promise((resolve, reject) => {
    onSignalCallback = onSignal;
    onReconnectCallback = onReconnect;
    let isFirstConnect = true;

    stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL, null, { transports: ['websocket'] }),
      reconnectDelay: 3000,
      onConnect: (frame) => {
        console.log('[STOMP] CONNECTED frame headers:', JSON.stringify(frame.headers));
        
        // Extract session ID directly from the active WebSocket connection URL, 
        // fallback to STOMP headers if needed.
        const wsSessionId = extractSockJsSessionId(stompClient.webSocket);
        stompSessionId = wsSessionId || frame.headers['user-name'] || frame.headers['session'];
        
        console.log('[STOMP] Subscribing with session ID:', stompSessionId);

        // Subscribe to our personal queue (session-specific)
        // The server sends signals to /queue/signal-{stompSessionId}
        stompClient.subscribe(`/queue/signal-${stompSessionId}`, (msg) => {
          console.log('[STOMP] Received message:', msg.body);
          try {
            const signal = JSON.parse(msg.body);
            if (onSignalCallback) onSignalCallback(signal);
          } catch (e) {
            console.error('Failed to parse signal:', e);
          }
        });

        if (isFirstConnect) {
          isFirstConnect = false;
          resolve(stompSessionId);
        } else {
          // Reconnected with a new stompSessionId — notify caller to re-join queue
          console.log('STOMP reconnected with new session:', stompSessionId);
          if (onReconnectCallback) onReconnectCallback(stompSessionId);
        }
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
        reject(new Error(frame.headers?.message || 'WebSocket error'));
      },
      onDisconnect: () => {
        console.log('[STOMP] disconnected');
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
