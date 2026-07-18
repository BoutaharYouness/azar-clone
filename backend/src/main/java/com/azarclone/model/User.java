package com.azarclone.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(length = 100)
    private String country;

    @Column(length = 10)
    private String language;

    @Column(length = 10)
    private String gender;

    @Column(name = "gender_filter", length = 10)
    private String genderFilter;

    @Column(name = "country_filter", length = 100)
    private String countryFilter;

    @Column(length = 100, unique = true)
    private String email;

    @Column(name = "google_id", unique = true, length = 100)
    private String googleId;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider = AuthProvider.ANONYMOUS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.FREE;

    @Column(name = "switch_count", nullable = false)
    private int switchCount = 0;

    @Column(name = "total_matches", nullable = false)
    private long totalMatches = 0;

    @Column(name = "total_call_duration_seconds", nullable = false)
    private long totalCallDurationSeconds = 0;

    @Column(name = "reputation_score", nullable = false)
    private int reputationScore = 100;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (provider == null) {
            provider = AuthProvider.ANONYMOUS;
        }
        if (role == null) {
            role = UserRole.FREE;
        }
    }
}
