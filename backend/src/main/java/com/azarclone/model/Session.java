package com.azarclone.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Session {

    public enum Status {
        SEARCHING,   // In matchmaking queue
        CONNECTING,  // Match found, signaling in progress
        CONNECTED,   // WebRTC connection established
        DISCONNECTED // Session ended
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_token", nullable = false, unique = true, length = 100)
    private String sessionToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    /** The session token of the matched peer */
    @Column(name = "peer_session_token", length = 100)
    private String peerSessionToken;

    /** WebSocket STOMP session ID for direct messaging */
    @Column(name = "stomp_session_id", length = 100)
    private String stompSessionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "queue_joined_at")
    private LocalDateTime queueJoinedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
