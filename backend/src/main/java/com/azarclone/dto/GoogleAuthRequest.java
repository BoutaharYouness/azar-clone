package com.azarclone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    @NotBlank(message = "Google credential is required")
    private String credential;

    @NotBlank(message = "Device ID is required")
    private String deviceId;

    private String country;
    private String language;
}