// lib/config/app_config.dart
// 
// Central configuration. Update BACKEND_URL to your server's IP/domain.
// For release builds, use --dart-define to inject at build time:
//   flutter build apk --dart-define=BACKEND_URL=https://yourdomain.com

class AppConfig {
  static const String backendUrl =
      String.fromEnvironment('BACKEND_URL', defaultValue: 'http://192.168.1.100:8080');

  static const String wsUrl =
      String.fromEnvironment('WS_URL', defaultValue: 'http://192.168.1.100:8080/ws');

  static const String stunUrl =
      String.fromEnvironment('STUN_URL', defaultValue: 'stun:stun.l.google.com:19302');

  // Report threshold for auto-block (enforced server-side, informational here)
  static const int reportThreshold = 5;
}
