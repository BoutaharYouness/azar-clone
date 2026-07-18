package com.azarclone.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class AiModerationService {

    private static final Logger log = LoggerFactory.getLogger(AiModerationService.class);
    private final Random random = new Random();

    /**
     * Mock nudity detection on image frames.
     * Returns true if nudity is detected.
     */
    public boolean detectNudity(String base64Image) {
        log.debug("Running nudity detection AI model...");
        // Mock result: 99.9% clean, rarely flags
        return random.nextDouble() < 0.005;
    }

    /**
     * Mock face count detection.
     * Returns number of detected faces.
     */
    public int detectFaces(String base64Image) {
        log.debug("Running face detection AI model...");
        // Mock result: usually 1 face (normal video chat), sometimes 0 (no face) or 2 (multi face)
        double roll = random.nextDouble();
        if (roll < 0.08) return 0; // No face (black screen / empty room)
        if (roll < 0.92) return 1; // Exactly one user
        return 2; // Multiple faces
    }

    /**
     * Mock black screen detection.
     * Returns true if the image is mostly black/dark.
     */
    public boolean detectBlackScreen(String base64Image) {
        log.debug("Running black screen detection...");
        // Mock result: 99% clean
        return random.nextDouble() < 0.01;
    }

    /**
     * Mock spam detection in chat messages.
     */
    public boolean detectSpam(String text) {
        if (text == null || text.isBlank()) return false;
        log.debug("Running spam filter AI model on text: {}", text);

        String lowercase = text.toLowerCase();
        // Common spam terms or link advertisements
        if (lowercase.contains("free coins") || lowercase.contains("bit.ly") ||
            lowercase.contains("earn money") || lowercase.contains("cheap followers") ||
            lowercase.contains("click here to")) {
            return true;
        }

        // Rate limit mock: spamming same message repeatedly is spam (handled at higher levels)
        return false;
    }

    /**
     * Evaluates a video frame (base64 image) against all filters.
     */
    public Map<String, Object> evaluateFrame(String base64Image) {
        boolean nudity = detectNudity(base64Image);
        int faceCount = detectFaces(base64Image);
        boolean blackScreen = detectBlackScreen(base64Image);

        Map<String, Object> result = new HashMap<>();
        result.put("nudity", nudity);
        result.put("faceCount", faceCount);
        result.put("blackScreen", blackScreen);
        result.put("flagged", nudity || blackScreen || faceCount == 0 || faceCount > 1);

        String flagReason = "Clean";
        if (nudity) flagReason = "Nudity detected";
        else if (blackScreen) flagReason = "Black/empty screen detected";
        else if (faceCount == 0) flagReason = "No faces detected";
        else if (faceCount > 1) flagReason = "Multiple faces detected";
        result.put("reason", flagReason);

        return result;
    }
}
