package com.azarclone.service;

import com.azarclone.dto.SignalingMessage;
import com.azarclone.model.Session;
import com.azarclone.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            senderSession.setStatus(Session.Status.CONNECTED);
            peerSession.setStatus(Session.Status.CONNECTED);
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
        String peerToken = session.getPeerSessionToken();

        if (peerToken != null) {
            notifyPeerDisconnected(peerToken);
        }

        // Reset this session to searching
        session.setStatus(Session.Status.SEARCHING);
        session.setPeerSessionToken(null);
        sessionRepository.save(session);

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
            Optional<Session> peerSessionOpt = sessionRepository.findBySessionToken(peerToken);
            peerSessionOpt.ifPresent(peer -> {
                peer.setStatus(Session.Status.DISCONNECTED);
                peer.setPeerSessionToken(null);
                peer.setEndedAt(LocalDateTime.now());
                sessionRepository.save(peer);
            });
        }

        session.setStatus(Session.Status.DISCONNECTED);
        session.setPeerSessionToken(null);
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);

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
        }

        matchmakingService.removeFromQueue(session.getSessionToken());

        session.setStatus(Session.Status.DISCONNECTED);
        session.setPeerSessionToken(null);
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.info("Cleaned up disconnected STOMP session: {}", stompSessionId);
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
            sessionRepository.save(peerSession);
        });
    }
}
