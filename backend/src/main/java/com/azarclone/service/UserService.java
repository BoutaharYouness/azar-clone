package com.azarclone.service;

import com.azarclone.config.JwtUtils;
import com.azarclone.dto.CreateSessionRequest;
import com.azarclone.dto.SessionResponse;
import com.azarclone.model.AuthProvider;
import com.azarclone.model.BlockedDevice;
import com.azarclone.model.Report;
import com.azarclone.model.Session;
import com.azarclone.model.User;
import com.azarclone.model.UserRole;
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
import java.util.Optional;

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
     * Helper to verify if user/device is blocked.
     */
    public boolean isBlocked(String deviceId, String ipAddress, Long accountId, String fingerprint) {
        return false;
        // if (deviceId != null && blockedDeviceRepository.existsByDeviceId(deviceId)) return true;
        // if (ipAddress != null && blockedDeviceRepository.existsByIpAddress(ipAddress)) return true;
        // if (accountId != null && blockedDeviceRepository.existsByAccount_Id(accountId)) return true;
        // if (fingerprint != null && !fingerprint.isBlank() && blockedDeviceRepository.existsByBrowserFingerprint(fingerprint)) return true;
        // return false;
    }

    /**
     * Creates a new user session (anonymous or authenticated).
     */
    @Transactional
    public SessionResponse createSession(CreateSessionRequest request, String clientIp) {
        String ip = (request.getClientIp() != null && !request.getClientIp().isBlank())
                ? request.getClientIp() : clientIp;

        // Resolve authenticated user if any (via SecurityContextHolder)
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        User authUser = null;
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            authUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        Long authUserId = authUser != null ? authUser.getId() : null;
        if (isBlocked(request.getDeviceId(), ip, authUserId, request.getBrowserFingerprint())) {
            log.warn("Blocked device/user connection attempt: deviceId={}, ip={}", request.getDeviceId(), ip);
            return SessionResponse.builder()
                    .success(false)
                    .message("Your access has been blocked due to violations.")
                    .build();
        }

        // Limit check for anonymous users
        User user;
        if (authUser != null) {
            user = authUser;
        } else {
            // Check if device is already associated with an anonymous user
            user = userRepository.findByDeviceId(request.getDeviceId())
                    .orElse(null);

            if (user == null) {
                user = new User();
                user.setNickname(request.getNickname());
                user.setDeviceId(request.getDeviceId());
                user.setProvider(AuthProvider.ANONYMOUS);
                user.setRole(UserRole.FREE);
                user.setSwitchCount(0);
            } else if (user.getProvider() == AuthProvider.ANONYMOUS && user.getSwitchCount() >= 10) {
                log.info("Anonymous user reached free limit: deviceId={}", request.getDeviceId());
                return SessionResponse.builder()
                        .success(false)
                        .message("reached_free_limit")
                        .build();
            }
        }

        // Resolve country
        String country;
        if (request.getCountry() != null && !request.getCountry().isBlank()) {
            country = request.getCountry();
        } else {
            country = geoLocationService.resolveCountry(ip);
        }

        String language = (request.getLanguage() != null && !request.getLanguage().isBlank())
                ? request.getLanguage() : "en";

        String sessionToken = UUID.randomUUID().toString();

        if (authUser == null) {
            user.setNickname(request.getNickname());
            user.setCountry(country);
            user.setLanguage(language);
        }
        user.setSessionId(sessionToken);
        userRepository.save(user);

        // CREATE SESSION
        Session session = new Session();
        session.setSessionToken(sessionToken);
        session.setUser(user);
        session.setStatus(Session.Status.SEARCHING);
        session.setQueueJoinedAt(LocalDateTime.now());

        sessionRepository.save(session);

        log.info("Session created for nickname={} country={} language={} token={}", user.getNickname(), country, language, sessionToken);

        return SessionResponse.builder()
                .success(true)
                .sessionToken(sessionToken)
                .nickname(user.getNickname())
                .country(country)
                .message("Session created successfully")
                .build();
    }

    /**
     * Submits a report against a device.
     */
    @Transactional
    public boolean reportDevice(String reporterSessionToken, String reportedDeviceId, String reason, String reasonCategory) {
        // Resolve reporter details
        Optional<Session> reporterSessionOpt = sessionRepository.findBySessionToken(reporterSessionToken);
        User reporterUser = reporterSessionOpt.map(Session::getUser).orElse(null);
        String reporterDeviceId = reporterUser != null ? reporterUser.getDeviceId() : "unknown";

        // Resolve reported user details
        Optional<User> reportedUserOpt = userRepository.findByDeviceId(reportedDeviceId);
        User reportedUser = reportedUserOpt.orElse(null);

        Report report = new Report();
        report.setReporterDeviceId(reporterDeviceId);
        report.setReportedDeviceId(reportedDeviceId);
        report.setReason(reason);
        report.setReasonCategory(reasonCategory);
        report.setReporterUser(reporterUser);
        report.setReportedUser(reportedUser);
        reportRepository.save(report);

        long reportCount = reportRepository.countByReportedDeviceId(reportedDeviceId);
        log.info("Device {} reported {} times", reportedDeviceId, reportCount);

        // Update reputation score of reported user
        if (reportedUser != null) {
            reportedUser.setReputationScore(Math.max(0, reportedUser.getReputationScore() - 10));
            userRepository.save(reportedUser);
        }

        if (reportCount >= REPORT_THRESHOLD && !blockedDeviceRepository.existsByDeviceId(reportedDeviceId)) {
            BlockedDevice blocked = new BlockedDevice();
            blocked.setDeviceId(reportedDeviceId);
            blocked.setReason("Auto-blocked after " + reportCount + " reports");
            if (reportedUser != null) {
                blocked.setAccount(reportedUser);
            }
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
