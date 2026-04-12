// lib/screens/call_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/signaling_service.dart';
import '../services/webrtc_service.dart';
import '../services/device_id_service.dart';

enum CallStatus { connectingWs, searching, connectingPeer, connected, disconnected, error }

class CallScreen extends StatefulWidget {
  final SessionInfo session;
  const CallScreen({super.key, required this.session});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  late SignalingService _signaling;
  late WebRTCService _webrtc;

  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();

  CallStatus _status = CallStatus.connectingWs;
  String? _peerNickname;
  String? _peerCountry;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _reportSent = false;
  String _errorMsg = '';

  @override
  void initState() {
    super.initState();
    _initCall();
  }

  Future<void> _initCall() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    _signaling = SignalingService();
    _webrtc = WebRTCService(_signaling);

    // Callbacks from WebRTC layer
    _webrtc.onRemoteStream = (stream) {
      setState(() => _remoteRenderer.srcObject = stream);
    };
    _webrtc.onIceStateChange = (state) {
      if (state == RTCIceConnectionState.RTCIceConnectionStateConnected ||
          state == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
        setState(() => _status = CallStatus.connected);
      }
    };

    // Acquire local media
    final mediaResult = await _webrtc.initLocalStream();
    if (mediaResult['stream'] != null) {
      setState(() {
        _localRenderer.srcObject = mediaResult['stream'] as MediaStream;
        _videoEnabled = mediaResult['videoEnabled'] as bool;
        _audioEnabled = mediaResult['audioEnabled'] as bool;
      });
    }

    // Connect WebSocket
    try {
      await _signaling.connect(onSignal: _handleSignal);
      _signaling.joinQueue(widget.session.sessionToken);
      setState(() => _status = CallStatus.searching);
    } catch (e) {
      setState(() {
        _status = CallStatus.error;
        _errorMsg = 'Connection failed: $e';
      });
    }
  }

  Future<void> _handleSignal(SignalingMessage signal) async {
    final token = widget.session.sessionToken;

    switch (signal.type) {
      case SignalingType.searching:
        setState(() => _status = CallStatus.searching);
        break;

      case SignalingType.matched:
        setState(() {
          _status = CallStatus.connectingPeer;
          _peerNickname = signal.peerNickname;
          _peerCountry = signal.peerCountry;
        });
        if (signal.message == 'SEND_OFFER') {
          await _webrtc.startAsOfferer(token);
        }
        break;

      case SignalingType.offer:
        if (signal.sdp != null) {
          await _webrtc.handleOffer(token, signal.sdp!);
        }
        break;

      case SignalingType.answer:
        if (signal.sdp != null) {
          await _webrtc.handleAnswer(signal.sdp!);
          setState(() => _status = CallStatus.connected);
        }
        break;

      case SignalingType.iceCandidate:
        if (signal.candidate != null) {
          await _webrtc.handleIceCandidate(signal.candidate!);
        }
        break;

      case SignalingType.disconnected:
        _webrtc.closePeerConnection();
        setState(() {
          _remoteRenderer.srcObject = null;
          _peerNickname = null;
          _peerCountry = null;
          _status = CallStatus.searching;
        });
        _signaling.joinQueue(token);
        break;

      case SignalingType.error:
        setState(() {
          _status = CallStatus.error;
          _errorMsg = signal.message ?? 'An error occurred';
        });
        break;

      default:
        break;
    }
  }

  void _toggleAudio() {
    setState(() => _audioEnabled = !_audioEnabled);
    _webrtc.setAudioEnabled(_audioEnabled);
  }

  void _toggleVideo() {
    setState(() => _videoEnabled = !_videoEnabled);
    _webrtc.setVideoEnabled(_videoEnabled);
  }

  void _nextPeer() {
    _webrtc.closePeerConnection();
    setState(() {
      _remoteRenderer.srcObject = null;
      _peerNickname = null;
      _peerCountry = null;
      _status = CallStatus.searching;
    });
    _signaling.send(SignalingMessage(
      type: SignalingType.next,
      senderSessionToken: widget.session.sessionToken,
    ));
  }

  void _endCall() {
    _signaling.send(SignalingMessage(
      type: SignalingType.endCall,
      senderSessionToken: widget.session.sessionToken,
    ));
    _cleanup();
    Navigator.pop(context);
  }

  Future<void> _reportPeer() async {
    if (_reportSent) return;
    setState(() => _reportSent = true);
    final deviceId = await DeviceIdService.getDeviceId();
    await ApiService.reportUser(
      reporterSessionToken: widget.session.sessionToken,
      reportedDeviceId: 'peer-device-id', // backend resolves from session
      reason: 'Reported via mobile app',
    );
    await Future.delayed(const Duration(seconds: 3));
    if (mounted) setState(() => _reportSent = false);
  }

  void _cleanup() {
    _webrtc.dispose();
    _signaling.disconnect();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
  }

  @override
  void dispose() {
    _cleanup();
    super.dispose();
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F13),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildStatusBanner(),
            Expanded(child: _buildVideoArea()),
            _buildControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('🎥 ChatRandom',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
                color: Color(0xFFE94560))),
          Text('👤 ${widget.session.nickname}  🌍 ${widget.session.country}',
            style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildStatusBanner() {
    final (icon, text, color) = switch (_status) {
      CallStatus.connectingWs => ('🔌', 'Connecting to server...', Colors.orange),
      CallStatus.searching => ('🔍', 'Looking for someone...', Colors.blue),
      CallStatus.connectingPeer => ('🤝', 'Connecting to peer...', Colors.purple),
      CallStatus.connected => ('✅', 'Connected with $_peerNickname · $_peerCountry', Colors.green),
      CallStatus.disconnected => ('🔴', 'Disconnected', Colors.red),
      CallStatus.error => ('❌', _errorMsg, Colors.red),
    };

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.black38,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(icon, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Flexible(child: Text(text,
            style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _buildVideoArea() {
    return Stack(
      children: [
        // Remote video (fullscreen)
        Container(
          margin: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(16),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: RTCVideoView(_remoteRenderer, objectFit:
                RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
          ),
        ),

        // Local video (PiP)
        Positioned(
          right: 24, bottom: 24,
          width: 110, height: 80,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black,
                border: Border.all(color: Colors.grey.shade800, width: 1.5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: RTCVideoView(_localRenderer,
                mirror: true,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            ),
          ),
        ),

        // Searching overlay
        if (_status == CallStatus.searching)
          Positioned.fill(
            child: Container(
              margin: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('🔍', style: TextStyle(fontSize: 48)),
                  SizedBox(height: 16),
                  Text('Finding someone...', style: TextStyle(color: Colors.grey, fontSize: 16)),
                  SizedBox(height: 20),
                  CircularProgressIndicator(color: Color(0xFFE94560)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildControls() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _controlBtn(
            icon: _audioEnabled ? Icons.mic : Icons.mic_off,
            color: _audioEnabled ? const Color(0xFF2A2A4A) : const Color(0xFFE94560),
            onTap: _toggleAudio,
            tooltip: _audioEnabled ? 'Mute' : 'Unmute',
          ),
          _controlBtn(
            icon: _videoEnabled ? Icons.videocam : Icons.videocam_off,
            color: _videoEnabled ? const Color(0xFF2A2A4A) : const Color(0xFFE94560),
            onTap: _toggleVideo,
            tooltip: _videoEnabled ? 'Disable camera' : 'Enable camera',
          ),
          _controlBtn(
            icon: Icons.skip_next,
            color: const Color(0xFF0F3460),
            onTap: _nextPeer,
            tooltip: 'Next',
          ),
          _controlBtn(
            icon: Icons.call_end,
            color: const Color(0xFFE74C3C),
            onTap: _endCall,
            size: 62,
            iconSize: 28,
            tooltip: 'End call',
          ),
          _controlBtn(
            icon: Icons.flag,
            color: _reportSent ? Colors.grey : const Color(0xFF7F1010),
            onTap: _reportPeer,
            tooltip: _reportSent ? 'Reported' : 'Report',
          ),
        ],
      ),
    );
  }

  Widget _controlBtn({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    double size = 52,
    double iconSize = 22,
    String tooltip = '',
  }) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: size, height: size,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          child: Icon(icon, color: Colors.white, size: iconSize),
        ),
      ),
    );
  }
}
