package com.azarclone.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionResponse {
    private String sessionToken;
    private String nickname;
    private String country;
    private String message;
    private boolean success;
}
