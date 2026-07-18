package com.azarclone.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class OAuthRequest {
    @NotBlank(message = "Provider is required")
    private String provider; // GOOGLE or DISCORD

    private String code;
    
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Nickname is required")
    private String nickname;

    private String avatarUrl;
    
    private String country;
    
    private String language;

    @NotBlank(message = "Device ID is required")
    private String deviceId;
}
