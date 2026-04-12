// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/call_screen.dart';
import 'models/models.dart';

void main() {
  runApp(const AzarApp());
}

class AzarApp extends StatelessWidget {
  const AzarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ChatRandom',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE94560),
          surface: Color(0xFF16213E),
        ),
        scaffoldBackgroundColor: const Color(0xFF0F0F13),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      initialRoute: '/login',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/call':
            final session = settings.arguments as SessionInfo;
            return MaterialPageRoute(
              builder: (_) => CallScreen(session: session),
            );
          default:
            return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
      },
    );
  }
}
