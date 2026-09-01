-- ============================================================
-- Smart Event Management System - MySQL Schema
-- ============================================================
CREATE DATABASE IF NOT EXISTS smart_event_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smart_event_management;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150)  NOT NULL,
    registration_number VARCHAR(50)   UNIQUE,
    department          VARCHAR(100),
    semester            VARCHAR(20),
    email               VARCHAR(190)  NOT NULL UNIQUE,
    hashed_password     VARCHAR(255)  NOT NULL,
    role                ENUM('student','faculty','admin') NOT NULL DEFAULT 'student',
    profile_picture     VARCHAR(255),
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_registration_number (registration_number),
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    description      TEXT NOT NULL,
    category         VARCHAR(100) NOT NULL,
    venue            VARCHAR(200) NOT NULL,
    event_date       DATE NOT NULL,
    event_time       VARCHAR(20)  NOT NULL,
    poster_url       VARCHAR(255),
    total_seats      INT NOT NULL DEFAULT 0,
    available_seats  INT NOT NULL DEFAULT 0,
    created_by       INT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_events_title (title),
    INDEX idx_events_category (category),
    INDEX idx_events_date (event_date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Registrations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    event_id       INT NOT NULL,
    student_id     INT NOT NULL,
    status         ENUM('registered','approved','cancelled','attended','completed') NOT NULL DEFAULT 'registered',
    qr_code_path   VARCHAR(255),
    ticket_code    VARCHAR(64) NOT NULL UNIQUE,
    registered_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_event_student (event_id, student_id),
    INDEX idx_registrations_status (status),
    INDEX idx_registrations_student (student_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Certificates  (matched to students strictly by registration_number)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    registration_number  VARCHAR(50) NOT NULL,
    event_id             INT,
    title                VARCHAR(200) NOT NULL,
    file_path            VARCHAR(255) NOT NULL,
    uploaded_by          INT,
    uploaded_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_certificates_registration_number (registration_number)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    type        ENUM('upcoming_event','certificate_uploaded','registration_approved','deadline_reminder','general')
                NOT NULL DEFAULT 'general',
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Password Resets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    otp_code    VARCHAR(10) NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_resets_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Email Verifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    otp_code    VARCHAR(10) NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email_verifications_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Audit Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(100),
    entity_id    INT,
    ip_address   VARCHAR(64),
    details      VARCHAR(500),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action)
) ENGINE=InnoDB;
