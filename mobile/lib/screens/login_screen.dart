// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/device_id_service.dart';
import '../models/models.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _nicknameController = TextEditingController();
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _nicknameController.dispose();
    super.dispose();
  }

  Future<void> _startChat() async {
    final nickname = _nicknameController.text.trim();
    if (nickname.length < 2) {
      setState(() => _error = 'Nickname must be at least 2 characters.');
      return;
    }

    setState(() { _loading = true; _error = ''; });

    try {
      final deviceId = await DeviceIdService.getDeviceId();
      final session = await ApiService.createSession(
        nickname: nickname,
        deviceId: deviceId,
      );

      if (!mounted) return;
      Navigator.pushNamed(context, '/call', arguments: session);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Logo
              const Text('🎥', style: TextStyle(fontSize: 72)),
              const SizedBox(height: 12),
              Text(
                'ChatRandom',
                style: TextStyle(
                  fontSize: 36, fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Meet random people worldwide',
                style: TextStyle(color: Colors.grey, fontSize: 15),
              ),
              const SizedBox(height: 40),

              // Error
              if (_error.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(_error,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ),

              // Nickname input
              TextField(
                controller: _nicknameController,
                maxLength: 30,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Choose a nickname...',
                  hintStyle: const TextStyle(color: Colors.grey),
                  filled: true,
                  fillColor: const Color(0xFF0F3460),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  counterStyle: const TextStyle(color: Colors.grey),
                  prefixIcon: const Icon(Icons.person, color: Colors.grey),
                ),
                onSubmitted: (_) => _startChat(),
              ),
              const SizedBox(height: 16),

              // Start button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _startChat,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE94560),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: _loading
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.rocket_launch),
                  label: Text(_loading ? 'Connecting...' : 'Start Chatting',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),

              const SizedBox(height: 24),
              const Text(
                'No account needed. Abusive users are automatically blocked.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF555555), fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
