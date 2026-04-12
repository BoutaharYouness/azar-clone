// lib/models/signaling_message.dart

enum SignalingType {
  offer,
  answer,
  iceCandidate,
  matched,
  disconnected,
  searching,
  next,
  endCall,
  error,
}

class SignalingMessage {
  final SignalingType type;
  final String? senderSessionToken;
  final String? sdp;
  final String? candidate;
  final String? peerCountry;
  final String? peerNickname;
  final String? message;

  SignalingMessage({
    required this.type,
    this.senderSessionToken,
    this.sdp,
    this.candidate,
    this.peerCountry,
    this.peerNickname,
    this.message,
  });

  factory SignalingMessage.fromJson(Map<String, dynamic> json) {
    return SignalingMessage(
      type: _parseType(json['type'] as String? ?? ''),
      senderSessionToken: json['senderSessionToken'] as String?,
      sdp: json['sdp'] as String?,
      candidate: json['candidate'] as String?,
      peerCountry: json['peerCountry'] as String?,
      peerNickname: json['peerNickname'] as String?,
      message: json['message'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type.name.toUpperCase(),
    if (senderSessionToken != null) 'senderSessionToken': senderSessionToken,
    if (sdp != null) 'sdp': sdp,
    if (candidate != null) 'candidate': candidate,
    if (peerCountry != null) 'peerCountry': peerCountry,
    if (peerNickname != null) 'peerNickname': peerNickname,
    if (message != null) 'message': message,
  };

  static SignalingType _parseType(String raw) {
    switch (raw.toUpperCase()) {
      case 'OFFER': return SignalingType.offer;
      case 'ANSWER': return SignalingType.answer;
      case 'ICE_CANDIDATE': return SignalingType.iceCandidate;
      case 'MATCHED': return SignalingType.matched;
      case 'DISCONNECTED': return SignalingType.disconnected;
      case 'SEARCHING': return SignalingType.searching;
      case 'NEXT': return SignalingType.next;
      case 'END_CALL': return SignalingType.endCall;
      default: return SignalingType.error;
    }
  }
}

// lib/models/session_info.dart
class SessionInfo {
  final String sessionToken;
  final String nickname;
  final String country;

  SessionInfo({
    required this.sessionToken,
    required this.nickname,
    required this.country,
  });
}
