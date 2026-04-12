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

    @Column(name = "device_id", nullable = false, unique = true, length = 100)
    private String deviceId;

    @Column(name = "blocked_at", nullable = false)
    private LocalDateTime blockedAt;

    @Column(length = 255)
    private String reason;

    @PrePersist
    protected void onCreate() {
        blockedAt = LocalDateTime.now();
    }
}
