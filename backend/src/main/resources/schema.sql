-- ============================================================
-- Azar Clone — MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS azar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE azar_db;

-- ------------------------------------------------------------
-- users
-- Stores anonymous user sessions identified by device fingerprint
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname    VARCHAR(50)  NOT NULL,
    device_id   VARCHAR(100) NOT NULL,
    country     VARCHAR(100),
    session_id  VARCHAR(100),
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device_id (device_id),
    INDEX idx_session_id (session_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sessions
-- Tracks active matchmaking / call sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_token        VARCHAR(100) NOT NULL UNIQUE,
    user_id              BIGINT       NOT NULL,
    status               ENUM('SEARCHING','CONNECTING','CONNECTED','DISCONNECTED') NOT NULL DEFAULT 'SEARCHING',
    peer_session_token   VARCHAR(100),
    stomp_session_id     VARCHAR(100),
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at             DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_stomp_session (stomp_session_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- reports
-- Records user reports for moderation
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_device_id   VARCHAR(100) NOT NULL,
    reported_device_id   VARCHAR(100) NOT NULL,
    reason               VARCHAR(500),
    timestamp            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reported_device (reported_device_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- blocked_devices
-- Devices banned from the platform
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_devices (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id   VARCHAR(100) NOT NULL UNIQUE,
    reason      VARCHAR(255),
    blocked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blocked_device_id (device_id)
) ENGINE=InnoDB;
