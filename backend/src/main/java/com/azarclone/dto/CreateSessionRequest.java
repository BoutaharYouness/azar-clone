package com.azarclone.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// ─── Request DTOs ───────────────────────────────────────────────────────────

/** Sent by the client to register an anonymous session */
@Data
public class CreateSessionRequest {
    @NotBlank(message = "Nickname is required")
    @Size(min = 2, max = 30, message = "Nickname must be 2-30 characters")
    private String nickname;

    @NotBlank(message = "Device ID is required")
    private String deviceId;

    /** Client IP forwarded by proxy, or resolved server-side */
    private String clientIp;

    /** Country chosen by the user (e.g. "Morocco") */
    private String country;

    /** Language chosen by the user (e.g. "en", "fr", "ar") */
    private String language;
}
