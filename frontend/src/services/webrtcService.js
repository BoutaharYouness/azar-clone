/**
 * webrtcService.js
 *
 * Manages WebRTC PeerConnection and local media streams.
 * Signaling is delegated entirely to signalingService (backend-routed).
 */

import { sendSignal } from './signalingService';

const STUN_URL = import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302';

const ICE_SERVERS = [{ urls: STUN_URL }];

let peerConnection = null;
let localStream = null;
let sessionToken = null;
let onRemoteStreamCallback = null;
let onIceConnectionStateCallback = null;

/**
 * Initialise local media (video + audio, or audio-only).
 * Returns the acquired MediaStream.
 */
export async function initLocalStream() {
  // Try video + audio first
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return { stream: localStream, videoEnabled: true, audioEnabled: true };
  } catch (videoErr) {
    console.warn('Camera unavailable, falling back to audio-only:', videoErr);
  }

  // Fallback: audio only
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    return { stream: localStream, videoEnabled: false, audioEnabled: true };
  } catch (audioErr) {
    console.warn('Microphone also unavailable — receive-only mode');
  }

  // Final fallback: receive-only (no local tracks)
  localStream = null;
  return { stream: null, videoEnabled: false, audioEnabled: false };
}

/** Create a new RTCPeerConnection and attach local tracks */
function createPeerConnection(token, onRemoteStream, onIceState) {
  sessionToken = token;
  onRemoteStreamCallback = onRemoteStream;
  onIceConnectionStateCallback = onIceState;

  peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Add local tracks if available
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Forward ICE candidates to peer via backend
  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      sendSignal({
        type: 'ICE_CANDIDATE',
        senderSessionToken: sessionToken,
        candidate: JSON.stringify(candidate),
      });
    }
  };

  // Handle incoming remote stream
  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (onRemoteStreamCallback) onRemoteStreamCallback(remoteStream);
  };

  // Track ICE connection state for UI
  peerConnection.oniceconnectionstatechange = () => {
    if (onIceConnectionStateCallback) {
      onIceConnectionStateCallback(peerConnection.iceConnectionState);
    }
  };

  return peerConnection;
}

/**
 * Called when this client is designated as the OFFER sender.
 */
export async function startAsOfferer(token, onRemoteStream, onIceState) {
  createPeerConnection(token, onRemoteStream, onIceState);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  sendSignal({
    type: 'OFFER',
    senderSessionToken: token,
    sdp: JSON.stringify(offer),
  });
}

/**
 * Called when this client receives an OFFER and must send an ANSWER.
 */
export async function handleOffer(token, offerSdp, onRemoteStream, onIceState) {
  createPeerConnection(token, onRemoteStream, onIceState);

  const offer = JSON.parse(offerSdp);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  sendSignal({
    type: 'ANSWER',
    senderSessionToken: token,
    sdp: JSON.stringify(answer),
  });
}

/**
 * Called when this client receives an ANSWER.
 */
export async function handleAnswer(answerSdp) {
  if (!peerConnection) return;
  const answer = JSON.parse(answerSdp);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * Called when an ICE candidate is received from the peer.
 */
export async function handleIceCandidate(candidateJson) {
  if (!peerConnection) return;
  try {
    const candidate = JSON.parse(candidateJson);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error('Failed to add ICE candidate:', e);
  }
}

/** Mute/unmute the local audio track */
export function setAudioEnabled(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
}

/** Enable/disable the local video track */
export function setVideoEnabled(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
}

/** Tear down peer connection and stop all local media */
export function closePeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

export function stopLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}

export function getLocalStream() {
  return localStream;
}
