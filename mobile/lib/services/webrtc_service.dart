// lib/services/webrtc_service.dart
import 'dart:convert';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import 'signaling_service.dart';

typedef StreamCallback = void Function(MediaStream stream);
typedef IceStateCallback = void Function(RTCIceConnectionState state);

class WebRTCService {
  final SignalingService _signaling;

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;

  StreamCallback? onRemoteStream;
  IceStateCallback? onIceStateChange;

  WebRTCService(this._signaling);

  MediaStream? get localStream => _localStream;

  static final _iceServers = {
    'iceServers': [
      {'urls': AppConfig.stunUrl},
    ]
  };

  /// Acquires local camera + mic, falls back gracefully.
  Future<Map<String, dynamic>> initLocalStream() async {
    // Try video + audio
    try {
      _localStream = await navigator.mediaDevices.getUserMedia({
        'video': {'facingMode': 'user'},
        'audio': true,
      });
      return {'videoEnabled': true, 'audioEnabled': true, 'stream': _localStream};
    } catch (_) {}

    // Fallback: audio only
    try {
      _localStream = await navigator.mediaDevices.getUserMedia(
          {'video': false, 'audio': true});
      return {'videoEnabled': false, 'audioEnabled': true, 'stream': _localStream};
    } catch (_) {}

    // Receive-only
    return {'videoEnabled': false, 'audioEnabled': false, 'stream': null};
  }

  Future<RTCPeerConnection> _createPeerConnection(String sessionToken) async {
    _peerConnection = await createPeerConnection(_iceServers);

    // Add local tracks
    if (_localStream != null) {
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });
    }

    // Forward ICE candidates to backend
    _peerConnection!.onIceCandidate = (candidate) {
      if (candidate.candidate != null) {
        _signaling.send(SignalingMessage(
          type: SignalingType.iceCandidate,
          senderSessionToken: sessionToken,
          candidate: jsonEncode(candidate.toMap()),
        ));
      }
    };

    // Handle remote stream
    _peerConnection!.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        onRemoteStream?.call(event.streams.first);
      }
    };

    // Track ICE state
    _peerConnection!.onIceConnectionState = (state) {
      onIceStateChange?.call(state);
    };

    return _peerConnection!;
  }

  /// Creates offer and sends it to the peer via backend.
  Future<void> startAsOfferer(String sessionToken) async {
    await _createPeerConnection(sessionToken);

    final offer = await _peerConnection!.createOffer();
    await _peerConnection!.setLocalDescription(offer);

    _signaling.send(SignalingMessage(
      type: SignalingType.offer,
      senderSessionToken: sessionToken,
      sdp: jsonEncode(offer.toMap()),
    ));
  }

  /// Handles incoming OFFER and replies with ANSWER.
  Future<void> handleOffer(String sessionToken, String offerSdp) async {
    await _createPeerConnection(sessionToken);

    final offerMap = jsonDecode(offerSdp) as Map<String, dynamic>;
    await _peerConnection!.setRemoteDescription(
      RTCSessionDescription(offerMap['sdp'] as String, offerMap['type'] as String),
    );

    final answer = await _peerConnection!.createAnswer();
    await _peerConnection!.setLocalDescription(answer);

    _signaling.send(SignalingMessage(
      type: SignalingType.answer,
      senderSessionToken: sessionToken,
      sdp: jsonEncode(answer.toMap()),
    ));
  }

  Future<void> handleAnswer(String answerSdp) async {
    if (_peerConnection == null) return;
    final answerMap = jsonDecode(answerSdp) as Map<String, dynamic>;
    await _peerConnection!.setRemoteDescription(
      RTCSessionDescription(answerMap['sdp'] as String, answerMap['type'] as String),
    );
  }

  Future<void> handleIceCandidate(String candidateJson) async {
    if (_peerConnection == null) return;
    final map = jsonDecode(candidateJson) as Map<String, dynamic>;
    await _peerConnection!.addCandidate(RTCIceCandidate(
      map['candidate'] as String,
      map['sdpMid'] as String?,
      map['sdpMLineIndex'] as int?,
    ));
  }

  void setAudioEnabled(bool enabled) {
    _localStream?.getAudioTracks().forEach((t) => t.enabled = enabled);
  }

  void setVideoEnabled(bool enabled) {
    _localStream?.getVideoTracks().forEach((t) => t.enabled = enabled);
  }

  void closePeerConnection() {
    _peerConnection?.close();
    _peerConnection = null;
  }

  void stopLocalStream() {
    _localStream?.getTracks().forEach((t) => t.stop());
    _localStream = null;
  }

  void dispose() {
    closePeerConnection();
    stopLocalStream();
  }
}
