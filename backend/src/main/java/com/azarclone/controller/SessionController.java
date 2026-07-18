package com.azarclone.controller;

import com.azarclone.dto.CreateSessionRequest;
import com.azarclone.dto.ReportRequest;
import com.azarclone.dto.SessionResponse;
import com.azarclone.repository.SessionRepository;
import com.azarclone.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SessionController {

    private final UserService userService;
    private final SessionRepository sessionRepository;

    /**
     * POST /api/v1/session
     * Creates an anonymous session. Returns session token used for WebSocket auth.
     */
    @PostMapping("/session")
    public ResponseEntity<SessionResponse> createSession(
            @Valid @RequestBody CreateSessionRequest request,
            HttpServletRequest httpRequest) {

        // Try to get real client IP behind proxies
        String clientIp = getClientIp(httpRequest);
        SessionResponse response = userService.createSession(request, clientIp);

        if (!response.isSuccess()) {
            return ResponseEntity.status(403).body(response);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/report
     * Submits a report against a device identifier.
     */
    @PostMapping("/report")
    public ResponseEntity<Map<String, Object>> reportUser(
            @Valid @RequestBody ReportRequest request) {

        // Resolve reporter's device ID from their session (simplified: client sends it directly)
        boolean autoBlocked = userService.reportDevice(
                request.getReporterSessionToken(),
                request.getReportedDeviceId(),
                request.getReason(),
                request.getReasonCategory()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "autoBlocked", autoBlocked,
                "message", autoBlocked
                        ? "User reported and blocked due to multiple reports."
                        : "Report submitted successfully."
        ));
    }

    /**
     * GET /api/v1/stats
     * Returns live platform statistics for the home page.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long onlineUsers = sessionRepository.countActiveUsers();
        long waitingUsers = sessionRepository.countSearching();
        long countriesOnline = sessionRepository.countDistinctCountries();
        double avgWait;
        try {
            avgWait = sessionRepository.averageWaitTimeSeconds();
        } catch (Exception e) {
            avgWait = 0;
        }

        return ResponseEntity.ok(Map.of(
                "onlineUsers", onlineUsers,
                "waitingUsers", waitingUsers,
                "countriesOnline", countriesOnline,
                "avgWaitSeconds", Math.round(avgWait)
        ));
    }

    /**
     * GET /api/v1/health
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "azar-backend"));
    }

    /** Extract real client IP, accounting for reverse proxies */
    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
