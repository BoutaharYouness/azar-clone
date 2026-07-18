package com.azarclone.dto;

import lombok.Data;
import lombok.Getter;
import jakarta.validation.constraints.NotBlank;

@Data
public class ReportRequest {
    @NotBlank
    private String reporterSessionToken;

    @NotBlank
    private String reportedDeviceId;

    @Getter
    private String reason;

    private String reasonCategory;
}
