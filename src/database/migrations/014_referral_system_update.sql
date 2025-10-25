-- Migration 014: Update Referral System for Deposits
-- Purpose: Modify existing referral system to work with deposits instead of investments

-- First, drop the existing referral_commissions table and recreate it for deposits
DROP TABLE IF EXISTS referral_commissions CASCADE;

-- Create new referral_commissions table for deposit-based referrals
CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deposit_id INTEGER NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    
    -- Commission details
    commission_amount DECIMAL(18, 2) NOT NULL CHECK (commission_amount > 0),
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05, -- 5% default
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    
    -- Payment tracking
    paid_at TIMESTAMP WITH TIME ZONE,
    ledger_entry_id INTEGER REFERENCES ledger_entries(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_deposit ON referral_commissions(deposit_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_created_at ON referral_commissions(created_at);

-- Unique constraint: One commission per referred user (only first deposit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_commissions_unique 
    ON referral_commissions(referred_user_id);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_referral_commissions_updated_at ON referral_commissions;
CREATE TRIGGER update_referral_commissions_updated_at
    BEFORE UPDATE ON referral_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to process referral commission when deposit is confirmed
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    referrer_user_id INTEGER;
    commission_amount DECIMAL(18, 2);
    referrer_account_id INTEGER;
    referrer_balance_before DECIMAL(18, 2);
    referrer_balance_after DECIMAL(18, 2);
    ledger_entry_id INTEGER;
BEGIN
    -- Only process when deposit status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        
        -- Check if the depositor was referred by someone
        SELECT referred_by INTO referrer_user_id 
        FROM users 
        WHERE id = NEW.user_id AND referred_by IS NOT NULL;
        
        -- If user was referred, process commission
        IF referrer_user_id IS NOT NULL THEN
            
            -- Check if commission already exists for this referrer-referred pair
            IF NOT EXISTS (
                SELECT 1 FROM referral_commissions 
                WHERE referrer_id = referrer_user_id 
                AND referred_user_id = NEW.user_id
            ) THEN
                
                -- Calculate 5% commission
                commission_amount := NEW.amount * 0.05;
                
                -- Get referrer's account
                SELECT id, available_balance INTO referrer_account_id, referrer_balance_before
                FROM accounts 
                WHERE user_id = referrer_user_id;
                
                -- Update referrer's balance
                UPDATE accounts 
                SET available_balance = available_balance + commission_amount,
                    balance = balance + commission_amount,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = referrer_user_id;
                
                -- Get updated balance
                SELECT available_balance INTO referrer_balance_after
                FROM accounts 
                WHERE user_id = referrer_user_id;
                
                -- Create ledger entry for referrer
                INSERT INTO ledger_entries (
                    user_id, transaction_type, amount, balance_before, balance_after,
                    reference_type, reference_id, description, created_at
                ) VALUES (
                    referrer_user_id, 'referral_commission', commission_amount, 
                    referrer_balance_before, referrer_balance_after,
                    'deposit', NEW.id, 
                    'Referral commission from user deposit: ' || commission_amount || ' USDT',
                    CURRENT_TIMESTAMP
                ) RETURNING id INTO ledger_entry_id;
                
                -- Create referral commission record
                INSERT INTO referral_commissions (
                    referrer_id, referred_user_id, deposit_id, commission_amount,
                    commission_rate, status, ledger_entry_id, created_at, updated_at
                ) VALUES (
                    referrer_user_id, NEW.user_id, NEW.id, commission_amount,
                    0.05, 'paid', ledger_entry_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                );
                
            END IF; -- End of duplicate commission check
            
        END IF; -- End of referrer check
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to process referral commissions
DROP TRIGGER IF EXISTS process_referral_commission_trigger ON deposits;
CREATE TRIGGER process_referral_commission_trigger
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_commission();

-- Add referral stats to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'total_referrals') THEN
        ALTER TABLE users ADD COLUMN total_referrals INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN total_commission_earned DECIMAL(18, 2) DEFAULT 0;
    END IF;
END $$;

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update referrer's stats when commission is paid
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        UPDATE users 
        SET total_referrals = total_referrals + 1,
            total_commission_earned = total_commission_earned + NEW.commission_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update referral stats
DROP TRIGGER IF EXISTS update_referral_stats_trigger ON referral_commissions;
CREATE TRIGGER update_referral_stats_trigger
    AFTER UPDATE ON referral_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

COMMENT ON TABLE referral_commissions IS 'Tracks referral commissions paid to users from deposits';
COMMENT ON COLUMN referral_commissions.commission_rate IS 'Commission rate as decimal (0.05 = 5%)';
COMMENT ON COLUMN referral_commissions.status IS 'Commission status: pending, paid, cancelled';
