-- Migration 004: Investments Table
-- Purpose: Track user investment plans with profit calculations

CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Investment details
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    
    -- Investment level and profit rate
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    profit_rate DECIMAL(5, 2) NOT NULL CHECK (profit_rate > 0),
    frequency VARCHAR(10) NOT NULL CHECK (frequency IN ('daily', 'monthly')),
    
    -- Profit tracking
    total_profit_earned DECIMAL(18, 2) DEFAULT 0.00,
    last_profit_date TIMESTAMP WITH TIME ZONE,
    next_profit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
-- Ensure schema compatibility with controller expectations
ALTER TABLE investments DROP COLUMN IF EXISTS chain;
-- Normalize level constraint to 1..5 as used by the controller
ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_level_check;
ALTER TABLE investments ADD CONSTRAINT investments_level_check CHECK (level BETWEEN 1 AND 5);
-- Add invested_balance column to accounts table if it doesn't exist
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS invested_balance DECIMAL(15,2) DEFAULT 0;

-- Update accounts table to ensure all balances are properly typed
ALTER TABLE accounts ALTER COLUMN balance TYPE DECIMAL(15,2);
ALTER TABLE accounts ALTER COLUMN available_balance TYPE DECIMAL(15,2);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investments_user_status ON investments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);

-- Ensure the investments table has all required columns (should already exist from migration 004)
-- But let's verify the structure matches our controller:
-- 
-- CREATE TABLE IF NOT EXISTS investments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES users(id),
--   amount DECIMAL(15,2) NOT NULL,
--   chain VARCHAR(10) NOT NULL,
--   level INTEGER NOT NULL,
--   profit_rate DECIMAL(5,2) NOT NULL,
--   status VARCHAR(20) DEFAULT 'active',
--   start_date DATE NOT NULL,
--   end_date DATE,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_next_profit_date ON investments(next_profit_date);
CREATE INDEX IF NOT EXISTS idx_investments_level ON investments(level);
CREATE INDEX IF NOT EXISTS idx_investments_frequency ON investments(frequency);

-- Composite index for profit distribution queries
CREATE INDEX IF NOT EXISTS idx_investments_profit_due ON investments(status, next_profit_date, frequency) 
    WHERE status = 'active';

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate profit for an investment
CREATE OR REPLACE FUNCTION calculate_investment_profit(
    p_amount DECIMAL,
    p_profit_rate DECIMAL
)
RETURNS DECIMAL(18, 2) AS $$
BEGIN
    RETURN ROUND((p_amount * p_profit_rate / 100), 2);
END;
$$ LANGUAGE plpgsql;
-- Function to get investment level based on amount
CREATE OR REPLACE FUNCTION get_investment_level(p_amount DECIMAL)
RETURNS TABLE(level INTEGER, daily_rate DECIMAL, monthly_rate DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_amount >= 10001 THEN 5
            WHEN p_amount >= 6001 THEN 4
            WHEN p_amount >= 3001 THEN 3
            WHEN p_amount >= 1001 THEN 2
            ELSE 1
        END,
        CASE 
            WHEN p_amount >= 10001 THEN 1.0
            WHEN p_amount >= 6001 THEN 0.9
            WHEN p_amount >= 3001 THEN 0.8
            WHEN p_amount >= 1001 THEN 0.7
            ELSE 0.5
        END,
        CASE 
            WHEN p_amount >= 10001 THEN 30.0
            WHEN p_amount >= 6001 THEN 27.0
            WHEN p_amount >= 3001 THEN 24.0
            WHEN p_amount >= 1001 THEN 21.0
            ELSE 15.0
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE investments IS 'User investment plans with profit calculations';
COMMENT ON COLUMN investments.level IS 'Investment tier: 1-6 based on amount';
COMMENT ON COLUMN investments.profit_rate IS 'Daily or monthly profit percentage';
COMMENT ON COLUMN investments.frequency IS 'Profit distribution: daily or monthly';
COMMENT ON COLUMN investments.next_profit_date IS 'Next scheduled profit payment date';