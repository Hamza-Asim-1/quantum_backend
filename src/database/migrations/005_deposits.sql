-- Migration 005: Deposits Table
-- Purpose: Track user deposits with transaction verification

CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Deposit details
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    chain VARCHAR(10) NOT NULL CHECK (chain IN ('TRC20', 'BEP20')),
    
    -- Blockchain transaction
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    
    -- Admin verification
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_chain ON deposits(chain);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_deposits_updated_at ON deposits;
CREATE TRIGGER update_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update account balance when deposit is confirmed
CREATE OR REPLACE FUNCTION update_balance_on_deposit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update balance when status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Update unified balance system (works for both TRC20 and BEP20)
        UPDATE accounts 
        SET balance = balance + NEW.amount,
            available_balance = available_balance + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_balance_on_deposit_confirm ON deposits;
CREATE TRIGGER update_balance_on_deposit_confirm
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_on_deposit();

COMMENT ON TABLE deposits IS 'User deposit transactions with blockchain verification';
COMMENT ON COLUMN deposits.tx_hash IS 'Blockchain transaction hash for verification';
COMMENT ON COLUMN deposits.status IS 'Deposit status: pending, confirmed, failed';