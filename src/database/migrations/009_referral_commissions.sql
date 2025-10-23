-- Migration 009: Referral Commissions Table
-- Purpose: Track 5% referral commissions on first investments

CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    
    -- Referral relationship
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Investment reference
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    
    -- Commission details
    commission_rate DECIMAL(5, 2) DEFAULT 5.00,
    commission_amount DECIMAL(18, 2) NOT NULL,
    
    -- Payment status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_investment ON referral_commissions(investment_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_paid_at ON referral_commissions(paid_at);

-- Unique constraint: One commission per referred user (only first investment)
CREATE UNIQUE INDEX idx_referral_commissions_unique 
    ON referral_commissions(referred_user_id);

-- Function to check if user has referral commission
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

-- Function to pay referral commission
CREATE OR REPLACE FUNCTION pay_referral_commission(
    p_referrer_id INTEGER,
    p_referred_user_id INTEGER,
    p_investment_id INTEGER,
    p_commission_amount DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
    v_commission_id INTEGER;
BEGIN
    -- Check if commission already exists
    IF has_referral_commission(p_referred_user_id) THEN
        RAISE EXCEPTION 'Referral commission already exists for user %', p_referred_user_id;
    END IF;
    
    -- Create commission record
    INSERT INTO referral_commissions (
        referrer_id, referred_user_id, investment_id, 
        commission_amount, status
    ) VALUES (
        p_referrer_id, p_referred_user_id, p_investment_id,
        p_commission_amount, 'pending'
    ) RETURNING id INTO v_commission_id;
    
    -- Log the commission creation
    PERFORM log_admin_action(
        NULL, 'referral_commission_created',
        'referral_commission', v_commission_id,
        jsonb_build_object(
            'referrer_id', p_referrer_id,
            'referred_user_id', p_referred_user_id,
            'investment_id', p_investment_id,
            'commission_rate', 5.00
        )
    );
    
    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark commission as paid
CREATE OR REPLACE FUNCTION mark_commission_paid(p_commission_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE referral_commissions
    SET 
        status = 'paid',
        paid_at = CURRENT_TIMESTAMP
    WHERE id = p_commission_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commission % not found or already processed', p_commission_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE referral_commissions IS 'Referral commission payments (5% of first investment)';
COMMENT ON COLUMN referral_commissions.commission_rate IS 'Commission percentage (default 5%)';
COMMENT ON COLUMN referral_commissions.status IS 'Payment status: pending, paid, cancelled';
COMMENT ON COLUMN referral_commissions.paid_at IS 'Timestamp when commission was paid';
