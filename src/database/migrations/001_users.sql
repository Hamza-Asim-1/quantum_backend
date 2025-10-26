-- Migration 001: Users Table
-- Purpose: Store user authentication and profile information

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Referral system
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- KYC Status
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert super admin (password will be hashed in application)
-- Default password: SuperSecurePassword123!
INSERT INTO users (email, password_hash, full_name, referral_code, is_admin, kyc_status)
VALUES (
    'admin@platform.com',
    '$2b$10$placeholder.hash.will.be.replaced.by.application',
    'Super Administrator',
    'ADMIN000',
    TRUE,
    'approved'
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'User authentication and profile information';
COMMENT ON COLUMN users.kyc_status IS 'KYC verification status: pending, approved, rejected';
COMMENT ON COLUMN users.referral_code IS 'Unique code for referring other users';
COMMENT ON COLUMN users.referred_by IS 'ID of user who referred this user';