package com.azarclone.service;

import com.azarclone.dto.SignalingMessage;
import com.azarclone.model.AuthProvider;
import com.azarclone.model.Session;
import com.azarclone.model.User;
import com.azarclone.repository.SessionRepository;
import com.azarclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Routes WebRTC signaling messages (OFFER, ANSWER, ICE) between paired peers.
 *
 * The backend never inspects SDP or ICE content — it only routes envelopes.
 * This keeps the backend decoupled from WebRTC internals while maintaining
 * full control over who can communicate with whom.
 */
@Service
@RequiredArgsConstructor
public class SignalingService {

    private static final Logger log = LoggerFactory.getLogger(SignalingService.class);

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchmakingService matchmakingService;

    /**
     * Forward a signaling message to the sender's current peer.
     */
    @Transactional
    public void forwardSignal(SignalingMessage message) {
        String senderToken = message.getSenderSessionToken();
        Optional<Session> senderSessionOpt = sessionRepository.findBySessionToken(senderToken);

        if (senderSessionOpt.isEmpty()) {
            log.warn("Signaling from unknown session: {}", senderToken);
            return;
        }

        Session senderSession = senderSessionOpt.get();
        String peerToken = senderSession.getPeerSessionToken();

        if (peerToken == null) {
            log.warn("No peer for session: {}", senderToken);
            return;
        }

        Optional<Session> peerSessionOpt = sessionRepository.findBySessionToken(peerToken);
        if (peerSessionOpt.isEmpty()) {
            log.warn("Peer session not found: {}", peerToken);
            return;
        }

        Session peerSession = peerSessionOpt.get();

        // Mark sessions as CONNECTED when an ANSWER is delivered
        if (message.getType() == SignalingMessage.Type.ANSWER) {
            LocalDateTime now = LocalDateTime.now();
            senderSession.setStatus(Session.Status.CONNECTED);
            senderSession.setConnectedAt(now);
            peerSession.setStatus(Session.Status.CONNECTED);
            peerSession.setConnectedAt(now);
            sessionRepository.save(senderSession);
            sessionRepository.save(peerSession);
        }

        // Deliver to peer's personal queue
        messagingTemplate.convertAndSend(
                "/queue/signal-" + peerSession.getStompSessionId(),
                message
        );

        log.debug("Forwarded {} from {} to {}", message.getType(), senderToken, peerToken);
    }

    /**
     * Handle a user requesting "next" (skip current peer).
     * The current peer is notified of the disconnect and re-queued.
     */
    @Transactional
    public void handleNext(String sessionToken) {
        Optional<Session> sessionOpt = sessionRepository.findBySessionToken(sessionToken);
        if (sessionOpt.isEmpty()) return;

        Session session = sessionOpt.get();
        User user = session.getUser();

        // Enforce anonymous user switch limit (10 switches maximum)
        if (user != null && user.getProvider() == AuthProvider.ANONYMOUS && user.getSwitchCount() >= 10) {
            log.info("Anonymous user {} switch limit reached", sessionToken);
            SignalingMessage limitError = new SignalingMessage();
            limitError.setType(SignalingMessage.Type.ERROR);
            limitError.setMessage("reached_free_limit");
            messagingTemplate.convertAndSend("/queue/signal-" + session.getStompSessionId(), limitError);
            return;
        }

        String peerToken = session.getPeerSessionToken();
        if (peerToken != null) {
            // Update stats for peer session before they get disconnected
            sessionRepository.findBySessionToken(peerToken).ifPresent(this::updateStatsAndCloseSession);
            notifyPeerDisconnected(peerToken);

            // Update stats for current session
            updateStatsAndCloseSession(session);
        }

        // Increment switch count
        if (user != null) {
            user.setSwitchCount(user.getSwitchCount() + 1);
            userRepository.save(user);
        }

        // Reset this session to searching
        session.setStatus(Session.Status.SEARCHING);
        session.setPeerSessionToken(null);
        session.setConnectedAt(null);
        sessionRepository.save(session);

        // The tenth anonymous skip ends the free session before another match.
        if (user != null && user.getProvider() == AuthProvider.ANONYMOUS && user.getSwitchCount() >= 10) {
            log.info("Anonymous user {} completed their free skips", sessionToken);
            SignalingMessage limitError = new SignalingMessage();
            limitError.setType(SignalingMessage.Type.ERROR);
            limitError.setMessage("reached_free_limit");
            messagingTemplate.convertAndSend("/queue/signal-" + session.getStompSessionId(), limitError);
            return;
        }

        // Re-add to matchmaking queue
        matchmakingService.joinQueue(sessionToken, session.getStompSessionId());
    }

    /**
     * Handle a user explicitly ending the call.
     * Notifies the peer and marks both sessions as DISCONNECTED.
     */
    @Transactional
    public void handleEndCall(String sessionToken) {
        Optional<Session> sessionOpt = sessionRepository.findBySessionToken(sessionToken);
        if (sessionOpt.isEmpty()) return;

        Session session = sessionOpt.get();
        String peerToken = session.getPeerSessionToken();

        if (peerToken != null) {
            notifyPeerDisconnected(peerToken);
            sessionRepository.findBySessionToken(peerToken).ifPresent(this::updateStatsAndCloseSession);
        }

        updateStatsAndCloseSession(session);
        matchmakingService.removeFromQueue(sessionToken);
    }

    /**
     * Called when a WebSocket connection drops unexpectedly.
     */
    @Transactional
    public void handleDisconnect(String stompSessionId) {
        Optional<Session> sessionOpt = sessionRepository.findByStompSessionId(stompSessionId);
        if (sessionOpt.isEmpty()) return;

        Session session = sessionOpt.get();
        String peerToken = session.getPeerSessionToken();

        if (peerToken != null) {
            notifyPeerDisconnected(peerToken);
            sessionRepository.findBySessionToken(peerToken).ifPresent(this::updateStatsAndCloseSession);
        }

        matchmakingService.removeFromQueue(session.getSessionToken());
        updateStatsAndCloseSession(session);

        log.info("Cleaned up disconnected STOMP session: {}", stompSessionId);
    }

    /** Helper: update session duration statistics and user profile metrics */
    private void updateStatsAndCloseSession(Session session) {
        session.setStatus(Session.Status.DISCONNECTED);
        session.setEndedAt(LocalDateTime.now());

        if (session.getConnectedAt() != null && session.getEndedAt() != null) {
            long durationSeconds = Duration.between(session.getConnectedAt(), session.getEndedAt()).getSeconds();
            User user = session.getUser();
            if (user != null) {
                user.setTotalMatches(user.getTotalMatches() + 1);
                user.setTotalCallDurationSeconds(user.getTotalCallDurationSeconds() + durationSeconds);
                userRepository.save(user);
            }
        }
        sessionRepository.save(session);
    }

    /** Sends a DISCONNECTED signal to the peer and puts them back in SEARCHING state */
    private void notifyPeerDisconnected(String peerToken) {
        sessionRepository.findBySessionToken(peerToken).ifPresent(peerSession -> {
            SignalingMessage msg = new SignalingMessage();
            msg.setType(SignalingMessage.Type.DISCONNECTED);
            msg.setMessage("Your partner has disconnected.");
            messagingTemplate.convertAndSend(
                    "/queue/signal-" + peerSession.getStompSessionId(),
                    msg
            );
            peerSession.setStatus(Session.Status.SEARCHING);
            peerSession.setPeerSessionToken(null);
            peerSession.setConnectedAt(null);
            sessionRepository.save(peerSession);
        });
    }
}
