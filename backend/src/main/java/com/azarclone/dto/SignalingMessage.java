package com.azarclone.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Generic signaling envelope exchanged between clients via the backend.
 * The backend routes these messages to the correct peer without inspecting SDP/ICE content.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {

    public enum Type {
        OFFER,          // WebRTC SDP offer
        ANSWER,         // WebRTC SDP answer
        ICE_CANDIDATE,  // ICE candidate
        MATCHED,        // Matchmaking success — sent by server
        DISCONNECTED,   // Peer disconnected — sent by server
        SEARCHING,      // Waiting for match — sent by server
        NEXT,           // Request to skip current peer
        END_CALL,       // Terminate current call
        ERROR           // Error notification
    }

    private Type type;

    /** Session token of the sender (used for routing) */
    private String senderSessionToken;

    /** SDP string for OFFER / ANSWER */
    private String sdp;

    /** ICE candidate JSON string */
    private String candidate;

    /** Country of the matched peer (for UI display) */
    private String peerCountry;

    /** Nickname of the matched peer */
    private String peerNickname;

    /** Error or info message */
    private String message;
}
