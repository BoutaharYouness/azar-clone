package com.azarclone.dto;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Nickname is required")
    @Size(min = 2, max = 30, message = "Nickname must be 2-30 characters")
    private String nickname;

    private String country;
    private String language;
    private String deviceId;
}
