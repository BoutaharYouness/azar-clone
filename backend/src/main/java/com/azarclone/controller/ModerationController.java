package com.azarclone.controller;

import com.azarclone.service.AiModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final AiModerationService aiModerationService;

    @PostMapping("/check-frame")
    public ResponseEntity<Map<String, Object>> checkFrame(@RequestBody Map<String, String> request) {
        String base64Image = request.get("image");
        if (base64Image == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image base64 data is required"));
        }
        Map<String, Object> result = aiModerationService.evaluateFrame(base64Image);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/check-text")
    public ResponseEntity<Map<String, Object>> checkText(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        if (text == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }
        boolean isSpam = aiModerationService.detectSpam(text);
        return ResponseEntity.ok(Map.of(
                "text", text,
                "isSpam", isSpam,
                "flagged", isSpam,
                "reason", isSpam ? "Spam message detected" : "Clean"
        ));
    }
}
