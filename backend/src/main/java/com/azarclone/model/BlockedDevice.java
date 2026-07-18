package com.azarclone.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "blocked_devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlockedDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", unique = true, length = 100)
    private String deviceId;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private User account;

    @Column(name = "browser_fingerprint", length = 100)
    private String browserFingerprint;

    @Column(name = "blocked_at", nullable = false)
    private LocalDateTime blockedAt;

    @Column(length = 255)
    private String reason;

    @PrePersist
    protected void onCreate() {
        blockedAt = LocalDateTime.now();
    }
}
