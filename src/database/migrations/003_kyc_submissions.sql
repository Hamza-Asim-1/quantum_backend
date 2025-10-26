-- Migration 003: KYC Submissions Table
-- Purpose: Store KYC document submissions and verification status

CREATE TABLE IF NOT EXISTS kyc_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Document information
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('passport', 'drivers_license', 'national_id')),
    document_number VARCHAR(100) NOT NULL,
    
    -- File storage (Cloudflare R2 URLs)
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    
    -- Verification
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    
    -- Review information
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_reviewed_by ON kyc_submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_kyc_submitted_at ON kyc_submissions(submitted_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_kyc_updated_at ON kyc_submissions;
CREATE TRIGGER update_kyc_updated_at
    BEFORE UPDATE ON kyc_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to sync KYC status to users table
CREATE OR REPLACE FUNCTION sync_kyc_status_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's KYC status when submission is approved/rejected
    IF NEW.status IN ('approved', 'rejected') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        UPDATE users 
        SET kyc_status = NEW.status 
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_kyc_to_user ON kyc_submissions;
CREATE TRIGGER sync_kyc_to_user
    AFTER UPDATE ON kyc_submissions
    FOR EACH ROW
    EXECUTE FUNCTION sync_kyc_status_to_user();

COMMENT ON TABLE kyc_submissions IS 'KYC document submissions and verification records';
COMMENT ON COLUMN kyc_submissions.document_type IS 'Type of ID document: passport, drivers_license, national_id';
COMMENT ON COLUMN kyc_submissions.status IS 'Verification status: pending, approved, rejected';