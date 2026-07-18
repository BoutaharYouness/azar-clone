package com.azarclone.controller;

import com.azarclone.config.JwtUtils;
import com.azarclone.dto.AuthResponse;
import com.azarclone.dto.GoogleAuthRequest;
import com.azarclone.model.AuthProvider;
import com.azarclone.model.User;
import com.azarclone.model.UserRole;
import com.azarclone.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;


import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request) {
        if (googleClientId.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(AuthResponse.builder().success(false).message("Google sign-in is not configured.").build());
        }

        Map<String, Object> profile = verifyGoogleCredential(request.getCredential());
        if (profile == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().success(false).message("Google sign-in could not be verified.").build());
        }

        String googleId = (String) profile.get("sub");
        String email = (String) profile.get("email");
        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(User::new);

        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setNickname(profile.get("name") instanceof String name && !name.isBlank() ? name : email);
        user.setAvatarUrl(profile.get("picture") instanceof String picture ? picture : null);
        user.setDeviceId(request.getDeviceId());
        user.setCountry(request.getCountry() != null ? request.getCountry() : user.getCountry());
        user.setLanguage(request.getLanguage() != null ? request.getLanguage() : user.getLanguage());
        user.setProvider(AuthProvider.GOOGLE);
        if (user.getRole() == null) {
            user.setRole(UserRole.FREE);
        }
        user = userRepository.save(user);

        String accessToken = jwtUtils.generateAccessToken(user.getEmail(), user.getRole().name(), user.getId());
        String refreshToken = jwtUtils.generateRefreshToken(user.getEmail());
        return ResponseEntity.ok(authResponse(user, accessToken, refreshToken, "Google authentication successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String token = request.get("refreshToken");
        if (token == null || !jwtUtils.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid refresh token"));
        }

        Optional<User> user = userRepository.findByEmail(jwtUtils.getEmailFromToken(token));
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not found"));
        }

        String accessToken = jwtUtils.generateAccessToken(user.get().getEmail(), user.get().getRole().name(), user.get().getId());
        return ResponseEntity.ok(Map.of("accessToken", accessToken, "refreshToken", token));
    }

    /**
     * Google validates the ID token server-side. We also require the configured
     * client audience, a verified email, and the required identity claims.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> verifyGoogleCredential(String credential) {
        try {
            Map<String, Object> profile = RestClient.create()
                    .get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={credential}", credential)
                    .retrieve()
                    .body(Map.class);

            if (profile == null
                    || !googleClientId.equals(profile.get("aud"))
                    || !"true".equalsIgnoreCase(String.valueOf(profile.get("email_verified")))
                    || !(profile.get("sub") instanceof String)
                    || !(profile.get("email") instanceof String)) {
                return null;
            }
            return profile;
        } catch (Exception ignored) {
            return null;
        }
    }
    private AuthResponse authResponse(User user, String accessToken, String refreshToken, String message) {
        return AuthResponse.builder()
                .success(true)
                .message(message)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .country(user.getCountry())
                .build();
    }
}