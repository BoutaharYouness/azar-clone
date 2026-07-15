package com.azarclone.service;

import com.azarclone.dto.CreateSessionRequest;
import com.azarclone.dto.SessionResponse;
import com.azarclone.model.BlockedDevice;
import com.azarclone.model.Report;
import com.azarclone.model.Session;
import com.azarclone.model.User;
import com.azarclone.repository.BlockedDeviceRepository;
import com.azarclone.repository.ReportRepository;
import com.azarclone.repository.SessionRepository;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    // Auto-block threshold: if a device receives this many reports, it gets blocked
    private static final long REPORT_THRESHOLD = 5;

    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final BlockedDeviceRepository blockedDeviceRepository;
    private final GeoLocationService geoLocationService;
    private final SessionRepository sessionRepository;

    /**
     * Creates a new anonymous user session.
     * Rejects blocked devices immediately.
     */
    @Transactional
    public SessionResponse createSession(CreateSessionRequest request, String clientIp) {
        // Block check
        if (blockedDeviceRepository.existsByDeviceId(request.getDeviceId())) {
            log.warn("Blocked device attempted to connect: {}", request.getDeviceId());
            return SessionResponse.builder()
                    .success(false)
                    .message("Your device has been blocked due to violations.")
                    .build();
        }

        // Resolve country: prefer client-specified, fall back to GeoIP
        String country;
        if (request.getCountry() != null && !request.getCountry().isBlank()) {
            country = request.getCountry();
        } else {
            String ip = (request.getClientIp() != null && !request.getClientIp().isBlank())
                    ? request.getClientIp() : clientIp;
            country = geoLocationService.resolveCountry(ip);
        }

        String language = (request.getLanguage() != null && !request.getLanguage().isBlank())
                ? request.getLanguage() : "en";

        // Create or update user record for this device
        User user = userRepository.findByDeviceId(request.getDeviceId())
                .orElse(new User());

        String sessionToken = UUID.randomUUID().toString();

        user.setNickname(request.getNickname());
        user.setDeviceId(request.getDeviceId());
        user.setCountry(country);
        user.setLanguage(language);
        user.setSessionId(sessionToken);
        userRepository.save(user);
        // 🔥 IMPORTANT — CREATE SESSION
        Session session = new Session();
        session.setSessionToken(sessionToken);
        session.setUser(user);
        session.setStatus(Session.Status.SEARCHING);
        session.setQueueJoinedAt(LocalDateTime.now());

        sessionRepository.save(session);


        log.info("Session created for nickname={} country={} language={} token={}", request.getNickname(), country, language, sessionToken);

        return SessionResponse.builder()
                .success(true)
                .sessionToken(sessionToken)
                .nickname(request.getNickname())
                .country(country)
                .message("Session created successfully")
                .build();
    }

    /**
     * Submits a report against a device.
     * If report count exceeds threshold, auto-blocks the device.
     */
    @Transactional
    public boolean reportDevice(String reporterDeviceId, String reportedDeviceId, String reason) {
        Report report = new Report();
        report.setReporterDeviceId(reporterDeviceId);
        report.setReportedDeviceId(reportedDeviceId);
        report.setReason(reason);
        reportRepository.save(report);

        long reportCount = reportRepository.countByReportedDeviceId(reportedDeviceId);
        log.info("Device {} reported {} times", reportedDeviceId, reportCount);

        if (reportCount >= REPORT_THRESHOLD && !blockedDeviceRepository.existsByDeviceId(reportedDeviceId)) {
            BlockedDevice blocked = new BlockedDevice();
            blocked.setDeviceId(reportedDeviceId);
            blocked.setReason("Auto-blocked after " + reportCount + " reports");
            blockedDeviceRepository.save(blocked);
            log.warn("Device {} auto-blocked after {} reports", reportedDeviceId, reportCount);
            return true; // was blocked
        }
        return false;
    }

    public boolean isDeviceBlocked(String deviceId) {
        return blockedDeviceRepository.existsByDeviceId(deviceId);
    }
}
