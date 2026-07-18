package com.azarclone.service;

import com.azarclone.dto.SignalingMessage;
import com.azarclone.model.Session;
import com.azarclone.model.User;
import com.azarclone.model.UserRole;
import com.azarclone.repository.SessionRepository;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Manages the matchmaking queue with priority-based matching.
 *
 * Matching priority (expands over time):
 * 1. Same language AND same country  (0-3s wait)
 * 2. Same language OR same country   (3-6s wait)
 * 3. Nearby region                   (6-9s wait)
 * 4. Worldwide                       (9s+ wait)
 *
 * PREMIUM features incorporated:
 * - Premium users have priority in the queue.
 * - Premium users can apply gender and country matching filters.
 */
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private static final Logger log = LoggerFactory.getLogger(MatchmakingService.class);

    /** Region groups for "nearby country" matching */
    private static final Map<String, List<String>> REGION_MAP = Map.of(
        "NORTH_AFRICA", List.of("Morocco", "Algeria", "Tunisia", "Libya", "Egypt"),
        "WEST_EUROPE", List.of("France", "Belgium", "Netherlands", "Luxembourg", "Switzerland", "Germany"),
        "NORTH_AMERICA", List.of("United States", "Canada", "Mexico"),
        "MIDDLE_EAST", List.of("Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Lebanon", "Iraq"),
        "EAST_EUROPE", List.of("Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria"),
        "SOUTH_EUROPE", List.of("Spain", "Portugal", "Italy", "Greece"),
        "EAST_ASIA", List.of("Japan", "South Korea", "China", "Taiwan"),
        "SOUTH_ASIA", List.of("India", "Pakistan", "Bangladesh", "Sri Lanka"),
        "SOUTHEAST_ASIA", List.of("Thailand", "Vietnam", "Philippines", "Indonesia", "Malaysia"),
        "OCEANIA", List.of("Australia", "New Zealand")
    );

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;

    /**
     * Add a session to the matchmaking queue.
     * Blocked devices are rejected. Marks session as SEARCHING with a queue timestamp.
     */
    @Transactional
    public void joinQueue(String sessionToken, String stompSessionId) {
        Optional<Session> sessionOpt = sessionRepository.findBySessionToken(sessionToken);
        if (sessionOpt.isEmpty()) {
            log.warn("Unknown session tried to join queue: {}", sessionToken);
            sendError(stompSessionId, "Session not found. Please reconnect.");
            return;
        }

        Session session = sessionOpt.get();
        User user = session.getUser();

        if (userService.isDeviceBlocked(user.getDeviceId())) {
            sendError(stompSessionId, "Your device has been blocked.");
            return;
        }

        // Notify client they are now searching
        SignalingMessage searching = new SignalingMessage();
        searching.setType(SignalingMessage.Type.SEARCHING);
        searching.setMessage("Looking for someone to connect with...");

        messagingTemplate.convertAndSend("/queue/signal-" + stompSessionId, searching);

        // Update session state
        session.setStompSessionId(stompSessionId);
        session.setStatus(Session.Status.SEARCHING);
        session.setPeerSessionToken(null);
        session.setQueueJoinedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.info("Session {} joined queue (lang={}, country={})", sessionToken,
                user.getLanguage(), user.getCountry());
    }

    /**
     * Polls the queue every 1 second and creates matches using priority logic.
     * Fetches all SEARCHING sessions from the DB and attempts to pair them.
     */
    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processQueue() {
        List<Session> searchingSessions = sessionRepository.findAllSearchingWithUser();
        if (searchingSessions.size() < 2) return;

        // Sort queue: PREMIUM / ADMIN users are prioritized, followed by wait time
        searchingSessions.sort((s1, s2) -> {
            boolean s1Prem = s1.getUser().getRole() == UserRole.PREMIUM || s1.getUser().getRole() == UserRole.ADMIN;
            boolean s2Prem = s2.getUser().getRole() == UserRole.PREMIUM || s2.getUser().getRole() == UserRole.ADMIN;
            if (s1Prem && !s2Prem) return -1;
            if (!s1Prem && s2Prem) return 1;

            if (s1.getQueueJoinedAt() == null) return 1;
            if (s2.getQueueJoinedAt() == null) return -1;
            return s1.getQueueJoinedAt().compareTo(s2.getQueueJoinedAt());
        });

        Set<Long> matchedIds = new HashSet<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 0; i < searchingSessions.size(); i++) {
            Session sessionA = searchingSessions.get(i);
            if (matchedIds.contains(sessionA.getId())) continue;

            User userA = sessionA.getUser();
            long waitSecondsA = sessionA.getQueueJoinedAt() != null
                    ? Duration.between(sessionA.getQueueJoinedAt(), now).getSeconds() : 0;

            Session bestMatch = null;
            int bestScore = -1;

            for (int j = i + 1; j < searchingSessions.size(); j++) {
                Session sessionB = searchingSessions.get(j);
                if (matchedIds.contains(sessionB.getId())) continue;

                User userB = sessionB.getUser();
                long waitSecondsB = sessionB.getQueueJoinedAt() != null
                        ? Duration.between(sessionB.getQueueJoinedAt(), now).getSeconds() : 0;

                int score = calculateMatchScore(userA, userB);
                if (score == -1) continue; // Incompatible due to premium filters

                // Determine minimum acceptable score based on wait time
                long maxWait = Math.max(waitSecondsA, waitSecondsB);
                int minScore;
                if (maxWait < 3) {
                    minScore = 3; // Need same language AND same country
                } else if (maxWait < 6) {
                    minScore = 2; // Need same language OR same country
                } else if (maxWait < 9) {
                    minScore = 1; // Need at least nearby region
                } else {
                    minScore = 0; // Match with anyone
                }

                if (score >= minScore && score > bestScore) {
                    bestScore = score;
                    bestMatch = sessionB;
                }
            }

            if (bestMatch != null) {
                matchedIds.add(sessionA.getId());
                matchedIds.add(bestMatch.getId());
                createMatch(sessionA, bestMatch);
            }
        }
    }

    /**
     * Score a potential match between two users.
     * Returns:
     *   -1 = incompatible (due to premium filters)
     *   3 = same language AND same country
     *   2 = same language OR same country
     *   1 = nearby region
     *   0 = worldwide (no affinity)
     */
    private int calculateMatchScore(User a, User b) {
        // Enforce filters for User A if A is Premium/Admin
        if (a.getRole() == UserRole.PREMIUM || a.getRole() == UserRole.ADMIN) {
            if (a.getGenderFilter() != null && !a.getGenderFilter().equalsIgnoreCase("all")) {
                if (b.getGender() == null || !b.getGender().equalsIgnoreCase(a.getGenderFilter())) {
                    return -1; // Gender mismatch
                }
            }
            if (a.getCountryFilter() != null && !a.getCountryFilter().isBlank()) {
                if (b.getCountry() == null || !b.getCountry().equalsIgnoreCase(a.getCountryFilter())) {
                    return -1; // Country mismatch
                }
            }
        }

        // Enforce filters for User B if B is Premium/Admin
        if (b.getRole() == UserRole.PREMIUM || b.getRole() == UserRole.ADMIN) {
            if (b.getGenderFilter() != null && !b.getGenderFilter().equalsIgnoreCase("all")) {
                if (a.getGender() == null || !a.getGender().equalsIgnoreCase(b.getGenderFilter())) {
                    return -1; // Gender mismatch
                }
            }
            if (b.getCountryFilter() != null && !b.getCountryFilter().isBlank()) {
                if (a.getCountry() == null || !a.getCountry().equalsIgnoreCase(b.getCountryFilter())) {
                    return -1; // Country mismatch
                }
            }
        }

        boolean sameLanguage = a.getLanguage() != null && a.getLanguage().equalsIgnoreCase(b.getLanguage());
        boolean sameCountry = a.getCountry() != null && a.getCountry().equalsIgnoreCase(b.getCountry());

        if (sameLanguage && sameCountry) return 3;
        if (sameLanguage || sameCountry) return 2;
        if (areNearbyCountries(a.getCountry(), b.getCountry())) return 1;
        return 0;
    }

    /** Check if two countries are in the same geographic region */
    private boolean areNearbyCountries(String countryA, String countryB) {
        if (countryA == null || countryB == null) return false;
        for (List<String> region : REGION_MAP.values()) {
            if (region.stream().anyMatch(c -> c.equalsIgnoreCase(countryA))
                    && region.stream().anyMatch(c -> c.equalsIgnoreCase(countryB))) {
                return true;
            }
        }
        return false;
    }

    /** Create a match between two sessions and notify both clients */
    private void createMatch(Session sessionA, Session sessionB) {
        String tokenA = sessionA.getSessionToken();
        String tokenB = sessionB.getSessionToken();
        User userA = sessionA.getUser();
        User userB = sessionB.getUser();

        // Link peers
        sessionA.setPeerSessionToken(tokenB);
        sessionA.setStatus(Session.Status.CONNECTING);
        sessionB.setPeerSessionToken(tokenA);
        sessionB.setStatus(Session.Status.CONNECTING);
        sessionRepository.save(sessionA);
        sessionRepository.save(sessionB);

        log.info("Matched: {} <-> {} (scoreMatch)", tokenA, tokenB);

        // Notify A: it should send the WebRTC OFFER
        SignalingMessage matchForA = new SignalingMessage();
        matchForA.setType(SignalingMessage.Type.MATCHED);
        matchForA.setSenderSessionToken(tokenA);
        matchForA.setPeerNickname(userB.getNickname());
        matchForA.setPeerCountry(userB.getCountry());
        matchForA.setMessage("SEND_OFFER");
        messagingTemplate.convertAndSend("/queue/signal-" + sessionA.getStompSessionId(), matchForA);

        // Notify B: it should wait for the OFFER
        SignalingMessage matchForB = new SignalingMessage();
        matchForB.setType(SignalingMessage.Type.MATCHED);
        matchForB.setSenderSessionToken(tokenB);
        matchForB.setPeerNickname(userA.getNickname());
        matchForB.setPeerCountry(userA.getCountry());
        matchForB.setMessage("WAIT_OFFER");
        messagingTemplate.convertAndSend("/queue/signal-" + sessionB.getStompSessionId(), matchForB);
    }

    /**
     * Remove a session from the queue (called on disconnect or "next").
     */
    public void removeFromQueue(String sessionToken) {
        log.debug("removeFromQueue called for {}", sessionToken);
    }

    /** Helper: send an error signal to a STOMP session */
    private void sendError(String stompSessionId, String message) {
        SignalingMessage error = new SignalingMessage();
        error.setType(SignalingMessage.Type.ERROR);
        error.setMessage(message);
        messagingTemplate.convertAndSend("/queue/signal-" + stompSessionId, error);
    }
}
