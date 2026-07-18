package com.azarclone.controller;

import com.azarclone.model.BlockedDevice;
import com.azarclone.model.Report;
import com.azarclone.model.User;
import com.azarclone.repository.BlockedDeviceRepository;
import com.azarclone.repository.ReportRepository;
import com.azarclone.repository.SessionRepository;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final ReportRepository reportRepository;
    private final BlockedDeviceRepository blockedDeviceRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        long onlineUsers = sessionRepository.countActiveUsers();
        long usersSearching = sessionRepository.countSearching();
        long activeCalls = sessionRepository.countConnected() / 2;
        long totalReports = reportRepository.count();
        long totalBlocked = blockedDeviceRepository.count();
        long totalUsers = userRepository.count();

        double avgCallDuration = userRepository.averageCallDurationSeconds();
        List<Object[]> countryData = userRepository.findCountryDistribution();
        
        List<Map<String, Object>> countries = countryData.stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("country", row[0]);
                    map.put("count", row[1]);
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("onlineUsers", onlineUsers);
        stats.put("usersSearching", usersSearching);
        stats.put("activeCalls", activeCalls);
        stats.put("totalReports", totalReports);
        stats.put("totalBlocked", totalBlocked);
        stats.put("totalUsers", totalUsers);
        stats.put("averageCallDurationSeconds", Math.round(avgCallDuration));
        stats.put("topCountries", countries);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getReports() {
        List<Report> reports = reportRepository.findAll();
        List<Map<String, Object>> reportList = reports.stream()
                .map(r -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", r.getId());
                    map.put("reporterDeviceId", r.getReporterDeviceId());
                    map.put("reportedDeviceId", r.getReportedDeviceId());
                    map.put("reason", r.getReason());
                    map.put("reasonCategory", r.getReasonCategory());
                    map.put("timestamp", r.getTimestamp());
                    if (r.getReporterUser() != null) {
                        map.put("reporterNickname", r.getReporterUser().getNickname());
                    }
                    if (r.getReportedUser() != null) {
                        map.put("reportedNickname", r.getReportedUser().getNickname());
                    }
                    return map;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(reportList);
    }

    @PostMapping("/block")
    public ResponseEntity<Map<String, Object>> blockDevice(@RequestBody Map<String, String> request) {
        String deviceId = request.get("deviceId");
        String ipAddress = request.get("ipAddress");
        String browserFingerprint = request.get("browserFingerprint");
        String accountIdStr = request.get("accountId");
        String reason = request.get("reason");

        BlockedDevice blocked = new BlockedDevice();
        blocked.setReason(reason != null ? reason : "Manually blocked by admin");

        if (deviceId != null && !deviceId.isBlank()) {
            blocked.setDeviceId(deviceId);
        }
        if (ipAddress != null && !ipAddress.isBlank()) {
            blocked.setIpAddress(ipAddress);
        }
        if (browserFingerprint != null && !browserFingerprint.isBlank()) {
            blocked.setBrowserFingerprint(browserFingerprint);
        }
        if (accountIdStr != null && !accountIdStr.isBlank()) {
            try {
                Long accountId = Long.parseLong(accountIdStr);
                Optional<User> userOpt = userRepository.findById(accountId);
                userOpt.ifPresent(blocked::setAccount);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid account ID"));
            }
        }

        if (blocked.getDeviceId() == null && blocked.getIpAddress() == null && 
            blocked.getBrowserFingerprint() == null && blocked.getAccount() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Provide at least one identifier to block"));
        }

        blockedDeviceRepository.save(blocked);
        return ResponseEntity.ok(Map.of("success", true, "message", "Block applied successfully"));
    }

    @PostMapping("/unblock")
    public ResponseEntity<Map<String, Object>> unblockDevice(@RequestBody Map<String, String> request) {
        String deviceId = request.get("deviceId");
        if (deviceId == null || deviceId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Device ID is required to unblock"));
        }

        // Try to find the block
        List<BlockedDevice> blocks = blockedDeviceRepository.findAll();
        Optional<BlockedDevice> blockOpt = blocks.stream()
                .filter(b -> deviceId.equals(b.getDeviceId()))
                .findFirst();

        if (blockOpt.isPresent()) {
            blockedDeviceRepository.delete(blockOpt.get());
            return ResponseEntity.ok(Map.of("success", true, "message", "Device unblocked successfully"));
        }

        return ResponseEntity.status(404).body(Map.of("success", false, "message", "Block not found for this device ID"));
    }
}
