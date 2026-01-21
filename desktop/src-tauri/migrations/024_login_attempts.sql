-- Login attempt tracking for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    device_id TEXT,
    attempt_time TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_time);
