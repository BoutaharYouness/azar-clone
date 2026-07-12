/**
 * useCall.js
 *
 * Custom hook that orchestrates:
 *  - WebSocket connection (via signalingService)
 *  - Matchmaking queue
 *  - WebRTC signaling responses
 *  - Call controls (mute, camera, next, end)
 *
 * The backend drives all state transitions. This hook is purely reactive.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as signaling from '../services/signalingService';
import * as webrtc from '../services/webrtcService';
import { reportUser } from '../services/api';
import { getDeviceId } from '../services/deviceId';

const STATUS = {
  INIT: 'init',
  CONNECTING_WS: 'connecting_ws',
  SEARCHING: 'searching',
  CONNECTING_PEER: 'connecting_peer',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

export default function useCall({ sessionToken, nickname, country }) {
  const [status, setStatus] = useState(STATUS.INIT);
  const [peerInfo, setPeerInfo] = useState(null);  // { nickname, country }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [iceState, setIceState] = useState('');
  const [error, setError] = useState('');

  // Ref so signal handler closure always has latest sessionToken
  const tokenRef = useRef(sessionToken);
  tokenRef.current = sessionToken;

  const statusRef = useRef(status);
  statusRef.current = status;

  // Whether this client is the offer sender (set by backend MATCHED message)
  const shouldSendOfferRef = useRef(false);

  // ─── On mount: init media → connect WS → join queue ─────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      setStatus(STATUS.CONNECTING_WS);

      // Acquire local media
      const { stream, videoEnabled: vid, audioEnabled: aud } =
        await webrtc.initLocalStream();
      if (!mounted) return;

      if (stream) setLocalStream(stream);
      setVideoEnabled(vid);
      setAudioEnabled(aud);

      // Connect to backend WebSocket
      try {
        await signaling.connect(handleSignal, () => {
          // STOMP reconnected with new session ID — re-join queue only if we are currently searching
          if (mounted && statusRef.current === STATUS.SEARCHING) {
            signaling.joinQueue(sessionToken);
          }
        });
        if (!mounted) return;

        // Join matchmaking queue
        signaling.joinQueue(sessionToken);
        setStatus(STATUS.SEARCHING);
      } catch (err) {
        setError('Could not connect to server: ' + err.message);
        setStatus(STATUS.ERROR);
      }
    }

    init();

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Signal handler ───────────────────────────────────────────────────────
  const handleSignal = useCallback(async (signal) => {
    const token = tokenRef.current;

    switch (signal.type) {
      case 'SEARCHING':
        setStatus(STATUS.SEARCHING);
        break;

      case 'MATCHED':
        setPeerInfo({ nickname: signal.peerNickname, country: signal.peerCountry });
        setStatus(STATUS.CONNECTING_PEER);
        shouldSendOfferRef.current = signal.message === 'SEND_OFFER';

        if (signal.message === 'SEND_OFFER') {
          try {
            await webrtc.startAsOfferer(
              token,
              (stream) => setRemoteStream(stream),
              (state) => setIceState(state)
            );
          } catch (err) {
            console.error('[WebRTC] startAsOfferer failed:', err);
            setError('Failed to start call: ' + err.message);
            setStatus(STATUS.ERROR);
          }
        }
        break;

      case 'OFFER':
        await webrtc.handleOffer(
          token,
          signal.sdp,
          (stream) => setRemoteStream(stream),
          (state) => setIceState(state)
        );
        break;

      case 'ANSWER':
        await webrtc.handleAnswer(signal.sdp);
        setStatus(STATUS.CONNECTED);
        break;

      case 'ICE_CANDIDATE':
        await webrtc.handleIceCandidate(signal.candidate);
        break;

      case 'DISCONNECTED':
        webrtc.closePeerConnection();
        setRemoteStream(null);
        setPeerInfo(null);
        setStatus(STATUS.SEARCHING);
        // Auto re-queue
        signaling.joinQueue(token);
        break;

      case 'ERROR':
        setError(signal.message || 'An error occurred.');
        setStatus(STATUS.ERROR);
        break;

      default:
        console.warn('Unknown signal type:', signal.type);
    }
  }, []);

  // Track ICE state → update CONNECTED status
  useEffect(() => {
    if (iceState === 'connected' || iceState === 'completed') {
      setStatus(STATUS.CONNECTED);
    } else if (iceState === 'failed' || iceState === 'disconnected') {
      setStatus(STATUS.CONNECTING_PEER);
    }
  }, [iceState]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  function toggleAudio() {
    const next = !audioEnabled;
    webrtc.setAudioEnabled(next);
    setAudioEnabled(next);
  }

  function toggleVideo() {
    const next = !videoEnabled;
    webrtc.setVideoEnabled(next);
    setVideoEnabled(next);
  }

  function nextPeer() {
    webrtc.closePeerConnection();
    setRemoteStream(null);
    setPeerInfo(null);
    setStatus(STATUS.SEARCHING);
    signaling.sendSignal({ type: 'NEXT', senderSessionToken: sessionToken });
  }

  function endCall() {
    signaling.sendSignal({ type: 'END_CALL', senderSessionToken: sessionToken });
    cleanup();
    setStatus(STATUS.DISCONNECTED);
  }

  async function reportPeer(peerDeviceId) {
    try {
      await reportUser(sessionToken, peerDeviceId, 'Reported by user');
    } catch (e) {
      console.error('Report failed:', e);
    }
  }

  function cleanup() {
    webrtc.closePeerConnection();
    webrtc.stopLocalStream();
    signaling.disconnect();
  }

  return {
    status,
    STATUS,
    peerInfo,
    localStream,
    remoteStream,
    audioEnabled,
    videoEnabled,
    error,
    toggleAudio,
    toggleVideo,
    nextPeer,
    endCall,
    reportPeer,
  };
}
