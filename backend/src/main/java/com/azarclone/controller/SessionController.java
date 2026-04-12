package com.azarclone.controller;

import com.azarclone.dto.CreateSessionRequest;
import com.azarclone.dto.ReportRequest;
import com.azarclone.dto.SessionResponse;
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
                request.getReporterSessionToken(),  // used as identifier here for simplicity
                request.getReportedDeviceId(),
                request.getReason()
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
