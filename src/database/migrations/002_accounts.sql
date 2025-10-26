-- Migration 002: Accounts Table
-- Purpose: Store multi-chain wallet balances (TRC20 USDT and BEP20 USDT)




-- Migration 002: Accounts Table
-- Purpose: Store unified USDT balances for users (investment-focused design)

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unified USDT balance (total deposits regardless of chain)
    balance DECIMAL(18, 2) DEFAULT 0.00 CHECK (balance >= 0),
    
    -- Investment-specific balances
    available_balance DECIMAL(18, 2) DEFAULT 0.00 CHECK (available_balance >= 0),
    invested_balance DECIMAL(18, 2) DEFAULT 0.00 CHECK (invested_balance >= 0),
    
    -- Balance constraints (total = available + invested)
    CONSTRAINT balance_consistency CHECK (balance = available_balance + invested_balance),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_balance ON accounts(balance);
CREATE INDEX IF NOT EXISTS idx_accounts_available_balance ON accounts(available_balance);

-- Helper function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id INTEGER, p_balance_type VARCHAR DEFAULT 'total')
RETURNS DECIMAL(18, 2) AS $$
DECLARE
    result_balance DECIMAL(18, 2);
BEGIN
    CASE p_balance_type
        WHEN 'available' THEN
            SELECT available_balance INTO result_balance FROM accounts WHERE user_id = p_user_id;
        WHEN 'invested' THEN
            SELECT invested_balance INTO result_balance FROM accounts WHERE user_id = p_user_id;
        ELSE
            SELECT balance INTO result_balance FROM accounts WHERE user_id = p_user_id;
    END CASE;
    
    RETURN COALESCE(result_balance, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Helper function to create account if not exists
CREATE OR REPLACE FUNCTION ensure_user_account(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    account_id INTEGER;
BEGIN
    -- Try to get existing account
    SELECT id INTO account_id FROM accounts WHERE user_id = p_user_id;
    
    -- Create if doesn't exist
    IF account_id IS NULL THEN
        INSERT INTO accounts (user_id, balance, available_balance, invested_balance)
        VALUES (p_user_id, 0.00, 0.00, 0.00)
        RETURNING id INTO account_id;
    END IF;
    
    RETURN account_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE accounts IS 'Unified USDT balances for users across all chains';
COMMENT ON COLUMN accounts.balance IS 'Total USDT balance (sum of available + invested)';
COMMENT ON COLUMN accounts.available_balance IS 'USDT available for investment or withdrawal';
COMMENT ON COLUMN accounts.invested_balance IS 'USDT currently invested in active investments';