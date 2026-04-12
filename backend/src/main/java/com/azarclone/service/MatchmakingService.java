package com.azarclone.service;

import com.azarclone.dto.SignalingMessage;
import com.azarclone.model.Session;
import com.azarclone.model.User;
import com.azarclone.repository.SessionRepository;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Manages the matchmaking queue.
 *
 * Architecture:
 * - A thread-safe queue holds session tokens of users waiting for a match.
 * - A @Scheduled task polls the queue every second and pairs users.
 * - Once matched, both users receive a MATCHED signal over WebSocket.
 * - The first matched user is designated as the WebRTC OFFER sender.
 */
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private static final Logger log = LoggerFactory.getLogger(MatchmakingService.class);

    /** Thread-safe FIFO queue of waiting session tokens */
    private final ConcurrentLinkedQueue<String> waitingQueue = new ConcurrentLinkedQueue<>();

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;

    /**
     * Add a session to the matchmaking queue.
     * Blocked devices are rejected. Duplicate entries are prevented.
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



        // Prevent duplicate queue entries
        if (!waitingQueue.contains(sessionToken)) {
            waitingQueue.add(sessionToken);
            log.info("Session {} joined queue. Queue size: {}", sessionToken, waitingQueue.size());
        }

        // Notify client they are now searching
        SignalingMessage searching = new SignalingMessage();
        searching.setType(SignalingMessage.Type.SEARCHING);
        searching.setMessage("Looking for someone to connect with...");

        messagingTemplate.convertAndSend("/queue/signal-" + stompSessionId, searching);
        log.info("Session converted ==> stompSessionId -> "+stompSessionId+" ====  SignalingMessage -> "+searching);
        // Update STOMP session ID (may change on reconnect)
        session.setStompSessionId(stompSessionId);
        session.setStatus(Session.Status.SEARCHING);
        session.setPeerSessionToken(null);
        sessionRepository.save(session);
    }

    /**
     * Polls the queue every 1 second and creates matches.
     * Runs on the Spring scheduling thread pool.
     */
    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processQueue() {
        while (waitingQueue.size() >= 2) {
            String tokenA = waitingQueue.poll();
            String tokenB = waitingQueue.poll();

            if (tokenA == null || tokenB == null) break;

            Optional<Session> sessionAOpt = sessionRepository.findBySessionToken(tokenA);
            Optional<Session> sessionBOpt = sessionRepository.findBySessionToken(tokenB);

            if (sessionAOpt.isEmpty() || sessionBOpt.isEmpty()) {
                log.warn("One of the sessions vanished during matching: {} {}", tokenA, tokenB);
                // Re-queue the surviving one
                sessionAOpt.ifPresent(s -> waitingQueue.add(tokenA));
                sessionBOpt.ifPresent(s -> waitingQueue.add(tokenB));
                continue;
            }

            Session sessionA = sessionAOpt.get();
            Session sessionB = sessionBOpt.get();
            User userA = sessionA.getUser();
            User userB = sessionB.getUser();

            // Both must still be in SEARCHING state
            if (sessionA.getStatus() != Session.Status.SEARCHING
                    || sessionB.getStatus() != Session.Status.SEARCHING) {
                log.debug("Session(s) no longer searching — skipping match");
                if (sessionA.getStatus() == Session.Status.SEARCHING) waitingQueue.add(tokenA);
                if (sessionB.getStatus() == Session.Status.SEARCHING) waitingQueue.add(tokenB);
                continue;
            }

            // Link peers
            sessionA.setPeerSessionToken(tokenB);
            sessionA.setStatus(Session.Status.CONNECTING);
            sessionB.setPeerSessionToken(tokenA);
            sessionB.setStatus(Session.Status.CONNECTING);
            sessionRepository.save(sessionA);
            sessionRepository.save(sessionB);

            log.info("Matched: {} <-> {}", tokenA, tokenB);

            // Notify A: it should send the WebRTC OFFER
            SignalingMessage matchForA = new SignalingMessage();
            matchForA.setType(SignalingMessage.Type.MATCHED);
            matchForA.setSenderSessionToken(tokenA);
            matchForA.setPeerNickname(userB.getNickname());
            matchForA.setPeerCountry(userB.getCountry());
            matchForA.setMessage("SEND_OFFER"); // instructs client to initiate WebRTC
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
    }

    /**
     * Remove a session from the queue (called on disconnect or "next").
     */
    public void removeFromQueue(String sessionToken) {
        waitingQueue.remove(sessionToken);
    }

    /** Helper: send an error signal to a STOMP session */
    private void sendError(String stompSessionId, String message) {
        SignalingMessage error = new SignalingMessage();
        error.setType(SignalingMessage.Type.ERROR);
        error.setMessage(message);
        messagingTemplate.convertAndSend("/queue/signal-" + stompSessionId, error);
    }
}
