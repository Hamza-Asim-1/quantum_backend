-- Migration 007: Ledger Entries Table
-- Purpose: Immutable financial transaction log (audit trail)

CREATE TABLE IF NOT EXISTS ledger_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'deposit', 'withdrawal', 'investment', 'profit', 
        'referral_commission', 'refund', 'adjustment'
    )),
    
    -- Amounts
    amount DECIMAL(18, 2) NOT NULL,
    balance_before DECIMAL(18, 2) NOT NULL,
    balance_after DECIMAL(18, 2) NOT NULL,
    
    -- Chain information
    chain VARCHAR(10) CHECK (chain IN ('TRC20', 'BEP20')),
    
    -- Reference to source transaction
    reference_type VARCHAR(50), -- 'deposit', 'withdrawal', 'investment', 'profit_run'
    reference_id INTEGER,
    
    -- Description and metadata
    description TEXT NOT NULL,
    metadata JSONB,
    
    -- Timestamps (immutable - no updates allowed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type ON ledger_entries(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_chain ON ledger_entries(chain);

-- Composite index for user transaction history
CREATE INDEX IF NOT EXISTS idx_ledger_user_history ON ledger_entries(user_id, created_at DESC);

-- Prevent updates and deletes (immutable ledger)
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable and cannot be modified or deleted';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_ledger_update ON ledger_entries;
CREATE TRIGGER prevent_ledger_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS prevent_ledger_delete ON ledger_entries;
CREATE TRIGGER prevent_ledger_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

-- Function to create ledger entry
CREATE OR REPLACE FUNCTION create_ledger_entry(
    p_user_id INTEGER,
    p_transaction_type VARCHAR,
    p_amount DECIMAL,
    p_chain VARCHAR,
    p_reference_type VARCHAR,
    p_reference_id INTEGER,
    p_description TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_balance_before DECIMAL(18, 2);
    v_balance_after DECIMAL(18, 2);
    v_ledger_id INTEGER;
BEGIN
    -- Get current balance
    IF p_chain = 'TRC20' THEN
        SELECT trc20_balance INTO v_balance_before FROM accounts WHERE user_id = p_user_id;
    ELSIF p_chain = 'BEP20' THEN
        SELECT bep20_balance INTO v_balance_before FROM accounts WHERE user_id = p_user_id;
    ELSE
        SELECT total_balance INTO v_balance_before FROM accounts WHERE user_id = p_user_id;
    END IF;
    
    v_balance_after := v_balance_before + p_amount;
    
    -- Insert ledger entry
    INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after,
        chain, reference_type, reference_id, description, metadata
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        p_chain, p_reference_type, p_reference_id, p_description, p_metadata
    ) RETURNING id INTO v_ledger_id;
    
    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ledger_entries IS 'Immutable financial transaction log for auditing';
COMMENT ON COLUMN ledger_entries.transaction_type IS 'Type of transaction: deposit, withdrawal, investment, profit, etc.';
COMMENT ON COLUMN ledger_entries.balance_before IS 'Account balance before transaction';
COMMENT ON COLUMN ledger_entries.balance_after IS 'Account balance after transaction';
COMMENT ON COLUMN ledger_entries.metadata IS 'Additional transaction metadata in JSON format';
