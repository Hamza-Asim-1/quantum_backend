-- Migration 006: Withdrawals Table
-- Purpose: Track withdrawal requests and processing

CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Withdrawal details
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    chain VARCHAR(10) NOT NULL CHECK (chain IN ('TRC20', 'BEP20')),
    wallet_address VARCHAR(255) NOT NULL,
    
    -- Transaction details (filled after processing)
    tx_hash VARCHAR(255) UNIQUE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    
    -- Processing information
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Notes
    admin_notes TEXT,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_chain ON withdrawals(chain);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to deduct balance when withdrawal is requested
CREATE OR REPLACE FUNCTION deduct_balance_on_withdrawal_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct balance immediately when withdrawal is created
    IF NEW.chain = 'TRC20' THEN
        UPDATE accounts 
        SET trc20_balance = trc20_balance - NEW.amount 
        WHERE user_id = NEW.user_id;
    ELSIF NEW.chain = 'BEP20' THEN
        UPDATE accounts 
        SET bep20_balance = bep20_balance - NEW.amount 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deduct_balance_on_withdrawal ON withdrawals;
CREATE TRIGGER deduct_balance_on_withdrawal
    AFTER INSERT ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION deduct_balance_on_withdrawal_request();

-- Trigger to refund balance if withdrawal is rejected or cancelled
CREATE OR REPLACE FUNCTION refund_balance_on_withdrawal_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Refund balance if status changes to 'rejected' or 'cancelled'
    IF NEW.status IN ('rejected', 'cancelled') AND OLD.status NOT IN ('rejected', 'cancelled') THEN
        IF NEW.chain = 'TRC20' THEN
            UPDATE accounts 
            SET trc20_balance = trc20_balance + NEW.amount 
            WHERE user_id = NEW.user_id;
        ELSIF NEW.chain = 'BEP20' THEN
            UPDATE accounts 
            SET bep20_balance = bep20_balance + NEW.amount 
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refund_balance_on_withdrawal_rejection ON withdrawals;
CREATE TRIGGER refund_balance_on_withdrawal_rejection
    AFTER UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION refund_balance_on_withdrawal_cancel();

COMMENT ON TABLE withdrawals IS 'User withdrawal requests and processing records';
COMMENT ON COLUMN withdrawals.status IS 'Withdrawal status: pending, processing, completed, rejected, cancelled';
COMMENT ON COLUMN withdrawals.wallet_address IS 'User wallet address for receiving funds';