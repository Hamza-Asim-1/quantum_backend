-- Migration 009: Referral Commissions Table
-- Purpose: Track 5% referral commissions on first investments

CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    
    -- Referral relationship
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Commission details
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    investment_amount DECIMAL(18, 2) NOT NULL,
    commission_amount DECIMAL(18, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) DEFAULT 5.00,
    
    -- Payment details
    chain VARCHAR(10) NOT NULL CHECK (chain IN ('TRC20', 'BEP20')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX idx_referral_commissions_referred ON referral_commissions(referred_user_id);
CREATE INDEX idx_referral_commissions_investment ON referral_commissions(investment_id);
CREATE INDEX idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX idx_referral_commissions_paid_at ON referral_commissions(paid_at);

-- Unique constraint: One commission per referred user (only first investment)
CREATE UNIQUE INDEX idx_referral_commissions_unique 
    ON referral_commissions(referred_user_id);

-- Function to check if referral commission already paid
CREATE OR REPLACE FUNCTION has_referral_commission(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM referral_commissions 
        WHERE referred_user_id = p_user_id
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and pay referral commission
CREATE OR REPLACE FUNCTION pay_referral_commission(
    p_investment_id INTEGER,
    p_referred_user_id INTEGER,
    p_amount DECIMAL,
    p_chain VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_referrer_id INTEGER;
    v_commission_amount DECIMAL(18, 2);
    v_commission_id INTEGER;
BEGIN
    -- Get referrer ID
    SELECT referred_by INTO v_referrer_id 
    FROM users 
    WHERE id = p_referred_user_id;
    
    -- If no referrer or commission already paid, return null
    IF v_referrer_id IS NULL OR has_referral_commission(p_referred_user_id) THEN
        RETURN NULL;
    END IF;
    
    -- Calculate 5% commission
    v_commission_amount := ROUND(p_amount * 0.05, 2);
    
    -- Create commission record
    INSERT INTO referral_commissions (
        referrer_id, referred_user_id, investment_id,
        investment_amount, commission_amount, chain, status
    ) VALUES (
        v_referrer_id, p_referred_user_id, p_investment_id,
        p_amount, v_commission_amount, p_chain, 'paid'
    ) RETURNING id INTO v_commission_id;
    
    -- Credit referrer's account
    IF p_chain = 'TRC20' THEN
        UPDATE accounts 
        SET trc20_balance = trc20_balance + v_commission_amount 
        WHERE user_id = v_referrer_id;
    ELSIF p_chain = 'BEP20' THEN
        UPDATE accounts 
        SET bep20_balance = bep20_balance + v_commission_amount 
        WHERE user_id = v_referrer_id;
    END IF;
    
    -- Create ledger entry
    PERFORM create_ledger_entry(
        v_referrer_id,
        'referral_commission',
        v_commission_amount,
        p_chain,
        'referral_commission',
        v_commission_id,
        format('Referral commission from user #%s investment', p_referred_user_id),
        jsonb_build_object(
            'referred_user_id', p_referred_user_id,
            'investment_id', p_investment_id,
            'commission_rate', 5.00
        )
    );
    
    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE referral_commissions IS 'Referral commission payments (5% of first investment)';
COMMENT ON COLUMN referral_commissions.commission_rate IS 'Commission percentage (default 5%)';
COMMENT ON COLUMN referral_commissions.status IS 'Payment status: pending, paid, cancelled';