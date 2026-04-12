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

    /**
     * Device fingerprint UUID stored client-side (localStorage / SharedPreferences).
     * Used for blocking abusive users since MAC address is not reliably accessible.
     */
    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(length = 100)
    private String country;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
