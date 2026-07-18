-- ============================================================
-- Azar Clone — MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS azar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE azar_db;

-- ------------------------------------------------------------
-- users
-- Stores both anonymous visitors and authenticated users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                            BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname                      VARCHAR(50)  NOT NULL,
    device_id                     VARCHAR(100) NOT NULL,
    country                       VARCHAR(100),
    language                      VARCHAR(10),
    gender                        VARCHAR(10),
    gender_filter                 VARCHAR(10),
    country_filter                VARCHAR(100),
    email                         VARCHAR(100) UNIQUE,
    avatar_url                    VARCHAR(255),
    provider                      VARCHAR(20)  NOT NULL DEFAULT 'ANONYMOUS',
    role                          VARCHAR(20)  NOT NULL DEFAULT 'FREE',
    switch_count                  INT          NOT NULL DEFAULT 0,
    total_matches                 BIGINT       NOT NULL DEFAULT 0,
    total_call_duration_seconds   BIGINT       NOT NULL DEFAULT 0,
    reputation_score              INT          NOT NULL DEFAULT 100,
    session_id                    VARCHAR(100),
    created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device_id (device_id),
    INDEX idx_session_id (session_id),
    INDEX idx_email (email)
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
    queue_joined_at      DATETIME,
    connected_at         DATETIME,
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
    reason_category      VARCHAR(50),
    reporter_user_id     BIGINT,
    reported_user_id     BIGINT,
    timestamp            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reported_device (reported_device_id),
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- blocked_devices
-- Devices or users banned from the platform
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_devices (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id           VARCHAR(100) UNIQUE,
    ip_address          VARCHAR(50),
    account_id          BIGINT,
    browser_fingerprint VARCHAR(100),
    reason              VARCHAR(255),
    blocked_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blocked_device_id (device_id),
    INDEX idx_blocked_ip (ip_address),
    FOREIGN KEY (account_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
