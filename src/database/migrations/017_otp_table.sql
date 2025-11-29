-- Migration 017: OTP Table for Password Reset
-- Purpose: Create OTP table for secure password reset flow

CREATE TABLE IF NOT EXISTS otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verified ON otp(verified);
CREATE INDEX IF NOT EXISTS idx_otp_email_verified ON otp(email, verified) WHERE verified = FALSE;

-- Add comments
COMMENT ON TABLE otp IS 'OTP codes for password reset verification';
COMMENT ON COLUMN otp.email IS 'User email address';
COMMENT ON COLUMN otp.otp_hash IS 'Bcrypt hashed 6-digit OTP code';
COMMENT ON COLUMN otp.expires_at IS 'OTP expiration timestamp (5 minutes)';
COMMENT ON COLUMN otp.verified IS 'Whether the OTP has been verified';

