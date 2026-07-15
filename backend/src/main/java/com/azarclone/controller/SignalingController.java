package com.azarclone.controller;

import com.azarclone.dto.SignalingMessage;
import com.azarclone.service.MatchmakingService;
import com.azarclone.service.SignalingService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Handles all WebSocket/STOMP messages from clients.
 *
 * Message flow:
 *   Client → /app/signal   → SignalingController → SignalingService → Peer
 *   Client → /app/queue    → SignalingController → MatchmakingService → Client
 */
@Controller
@RequiredArgsConstructor
public class SignalingController {

    private static final Logger log = LoggerFactory.getLogger(SignalingController.class);

    private final SignalingService signalingService;
    private final MatchmakingService matchmakingService;

    /**
     * Client sends this to join the matchmaking queue.
     * Payload: { type: "SEARCHING", senderSessionToken: "..." }
     */
    @MessageMapping("/queue")
    public void joinQueue(
            SignalingMessage message,
            @Header("simpSessionId") String stompSessionId) {

        log.debug("Join queue request from session: {}", message.getSenderSessionToken());
        matchmakingService.joinQueue(message.getSenderSessionToken(), stompSessionId);
    }

    /**
     * Client sends signaling messages (OFFER, ANSWER, ICE, NEXT, END_CALL).
     */
    @MessageMapping("/signal")
    public void handleSignal(
            SignalingMessage message,
            @Header("simpSessionId") String stompSessionId) {

        log.debug("Signal received: {} from {}", message.getType(), message.getSenderSessionToken());

        switch (message.getType()) {
            case OFFER, ANSWER, ICE_CANDIDATE, CHAT_MESSAGE, REACTION -> signalingService.forwardSignal(message);
            case NEXT -> signalingService.handleNext(message.getSenderSessionToken());
            case END_CALL -> signalingService.handleEndCall(message.getSenderSessionToken());
            default -> log.warn("Unhandled signal type: {}", message.getType());
        }
    }

    /**
     * Triggered automatically when a WebSocket connection drops.
     * Cleans up session state and notifies peer.
     */
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String stompSessionId = accessor.getSessionId();
        log.info("WebSocket disconnected: {}", stompSessionId);
        signalingService.handleDisconnect(stompSessionId);
    }
}
