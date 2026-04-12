// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/models.dart';

class ApiService {
  static const _baseUrl = AppConfig.backendUrl;

  /// Creates an anonymous session on the backend.
  /// Returns [SessionInfo] on success, throws on failure.
  static Future<SessionInfo> createSession({
    required String nickname,
    required String deviceId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/v1/session');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'nickname': nickname, 'deviceId': deviceId}),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Session creation failed');
    }

    return SessionInfo(
      sessionToken: data['sessionToken'] as String,
      nickname: data['nickname'] as String,
      country: data['country'] as String? ?? 'Unknown',
    );
  }

  /// Reports a peer device to the backend moderation system.
  static Future<void> reportUser({
    required String reporterSessionToken,
    required String reportedDeviceId,
    String reason = '',
  }) async {
    final uri = Uri.parse('$_baseUrl/api/v1/report');
    await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'reporterSessionToken': reporterSessionToken,
        'reportedDeviceId': reportedDeviceId,
        'reason': reason,
      }),
    );
  }
}
