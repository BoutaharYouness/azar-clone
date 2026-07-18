package com.azarclone.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
// ─── Request DTOs ───────────────────────────────────────────────────────────

/** Sent by the client to register an anonymous session */
@Data
public class CreateSessionRequest {
    private String nickname;

    @NotBlank(message = "Device ID is required")
    private String deviceId;

    /** Client IP forwarded by proxy, or resolved server-side */
    private String clientIp;

    /** Country chosen by the user (e.g. "Morocco") */
    private String country;

    /** Language chosen by the user (e.g. "en", "fr", "ar") */
    private String language;

    /** Browser fingerprint generated client-side */
    private String browserFingerprint;
}
