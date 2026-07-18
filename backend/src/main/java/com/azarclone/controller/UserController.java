package com.azarclone.controller;

import com.azarclone.model.User;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("nickname", user.getNickname());
        profile.put("email", user.getEmail());
        profile.put("country", user.getCountry());
        profile.put("language", user.getLanguage());
        profile.put("gender", user.getGender());
        profile.put("genderFilter", user.getGenderFilter());
        profile.put("countryFilter", user.getCountryFilter());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("provider", user.getProvider().name());
        profile.put("role", user.getRole().name());
        profile.put("switchCount", user.getSwitchCount());
        profile.put("totalMatches", user.getTotalMatches());
        profile.put("totalCallDurationSeconds", user.getTotalCallDurationSeconds());
        profile.put("reputationScore", user.getReputationScore());
        profile.put("createdAt", user.getCreatedAt());

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();

        if (request.containsKey("nickname") && request.get("nickname") != null && !request.get("nickname").isBlank()) {
            user.setNickname(request.get("nickname"));
        }
        if (request.containsKey("country")) {
            user.setCountry(request.get("country"));
        }
        if (request.containsKey("language")) {
            user.setLanguage(request.get("language"));
        }
        if (request.containsKey("gender")) {
            user.setGender(request.get("gender"));
        }
        if (request.containsKey("genderFilter")) {
            user.setGenderFilter(request.get("genderFilter"));
        }
        if (request.containsKey("countryFilter")) {
            user.setCountryFilter(request.get("countryFilter"));
        }
        if (request.containsKey("avatarUrl")) {
            user.setAvatarUrl(request.get("avatarUrl"));
        }

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully"));
    }
}
