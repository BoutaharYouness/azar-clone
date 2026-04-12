// lib/services/signaling_service.dart
import 'dart:convert';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../config/app_config.dart';
import '../models/models.dart';

typedef SignalHandler = void Function(SignalingMessage message);

class SignalingService {
  late StompClient _client;
  String? _stompSessionId;
  SignalHandler? _onSignal;
  bool _connected = false;

  String? get stompSessionId => _stompSessionId;
  bool get isConnected => _connected;

  /// Connects to the backend STOMP broker and subscribes to personal queue.
  Future<void> connect({required SignalHandler onSignal}) async {
    _onSignal = onSignal;

    final completer = Future<void>.value();
    bool resolved = false;

    _client = StompClient(
      config: StompConfig.sockJS(
        url: AppConfig.wsUrl,
        onConnect: (frame) {
          _connected = true;
          // Extract session ID from STOMP frame headers
          _stompSessionId = frame.headers['user-name'] ??
              frame.headers['session'] ??
              DateTime.now().millisecondsSinceEpoch.toString();

          // Subscribe to personal signal queue
          _client.subscribe(
            destination: '/queue/signal-$_stompSessionId',
            callback: (frame) {
              if (frame.body == null) return;
              try {
                final json = jsonDecode(frame.body!) as Map<String, dynamic>;
                final msg = SignalingMessage.fromJson(json);
                _onSignal?.call(msg);
              } catch (e) {
                print('Signal parse error: $e');
              }
            },
          );

          if (!resolved) resolved = true;
        },
        onStompError: (frame) {
          print('STOMP error: ${frame.body}');
          _connected = false;
        },
        onDisconnect: (_) {
          _connected = false;
        },
        onWebSocketError: (error) {
          print('WS error: $error');
          _connected = false;
        },
        reconnectDelay: const Duration(seconds: 3),
      ),
    );

    _client.activate();

    // Wait for connection (simple polling approach)
    for (int i = 0; i < 30; i++) {
      await Future.delayed(const Duration(milliseconds: 200));
      if (_connected) return;
    }
    throw Exception('WebSocket connection timed out');
  }

  /// Sends a signaling message to the backend for routing.
  void send(SignalingMessage message) {
    if (!_connected) {
      print('Cannot send — not connected');
      return;
    }
    _client.send(
      destination: '/app/signal',
      body: jsonEncode(message.toJson()),
    );
  }

  /// Joins the matchmaking queue.
  void joinQueue(String sessionToken) {
    if (!_connected) return;
    _client.send(
      destination: '/app/queue',
      body: jsonEncode({
        'type': 'SEARCHING',
        'senderSessionToken': sessionToken,
      }),
    );
  }

  void disconnect() {
    _client.deactivate();
    _connected = false;
  }
}
