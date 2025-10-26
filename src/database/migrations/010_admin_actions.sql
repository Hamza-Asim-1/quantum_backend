-- Migration 010: Admin Actions Table
-- Purpose: Audit trail for all administrative actions

CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    
    -- Admin who performed the action
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'user_created', 'user_updated', 'user_deleted',
        'deposit_approved', 'deposit_rejected', 'deposit_processed',
        'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_processed',
        'investment_created', 'investment_updated', 'investment_cancelled',
        'kyc_approved', 'kyc_rejected', 'kyc_updated',
        'profit_distributed', 'referral_commission_paid',
        'system_config_updated', 'admin_created', 'admin_updated'
    )),
    
    -- Target of the action
    target_type VARCHAR(50), -- 'user', 'deposit', 'withdrawal', 'investment', 'kyc', 'system'
    target_id INTEGER,
    
    -- Action details
    description TEXT NOT NULL,
    changes JSONB, -- Before/after values for updates
    
    -- Timestamps (immutable - no updates allowed)
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for querying and auditing
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_at ON admin_actions(performed_at DESC);

-- Composite index for admin activity tracking
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_history 
    ON admin_actions(admin_id, performed_at DESC);

-- Prevent updates and deletes (immutable audit log)
DROP TRIGGER IF EXISTS prevent_admin_actions_update ON admin_actions;
CREATE TRIGGER prevent_admin_actions_update
    BEFORE UPDATE ON admin_actions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS prevent_admin_actions_delete ON admin_actions;
CREATE TRIGGER prevent_admin_actions_delete
    BEFORE DELETE ON admin_actions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id INTEGER,
    p_action_type VARCHAR,
    p_target_type VARCHAR,
    p_target_id INTEGER,
    p_description TEXT,
    p_changes JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_action_id INTEGER;
BEGIN
    INSERT INTO admin_actions (
        admin_id, action_type, target_type, target_id,
        description, changes
    ) VALUES (
        p_admin_id, p_action_type, p_target_type, p_target_id,
        p_description, p_changes
    ) RETURNING id INTO v_action_id;
    
    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- View for recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
    aa.id,
    aa.admin_id,
    u.email as admin_email,
    u.full_name as admin_name,
    aa.action_type,
    aa.target_type,
    aa.target_id,
    aa.description,
    aa.changes,
    aa.performed_at
FROM admin_actions aa
JOIN users u ON aa.admin_id = u.id
ORDER BY aa.performed_at DESC
LIMIT 100;

-- View for admin action statistics
CREATE OR REPLACE VIEW admin_action_statistics AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    COUNT(aa.id) as total_actions,
    COUNT(CASE WHEN aa.action_type LIKE 'user_%' THEN 1 END) as user_actions,
    COUNT(CASE WHEN aa.action_type LIKE 'deposit_%' THEN 1 END) as deposit_actions,
    COUNT(CASE WHEN aa.action_type LIKE 'withdrawal_%' THEN 1 END) as withdrawal_actions,
    MAX(aa.performed_at) as last_action_at
FROM users u
LEFT JOIN admin_actions aa ON u.id = aa.admin_id
WHERE u.is_admin = TRUE
GROUP BY u.id, u.email, u.full_name;

COMMENT ON TABLE admin_actions IS 'Immutable audit trail for administrative actions';
COMMENT ON COLUMN admin_actions.action_type IS 'Type of administrative action performed';
COMMENT ON COLUMN admin_actions.target_type IS 'Type of entity affected by the action';
COMMENT ON COLUMN admin_actions.changes IS 'JSON object containing before/after values';
COMMENT ON VIEW recent_admin_activity IS 'Last 100 administrative actions performed';
COMMENT ON VIEW admin_action_statistics IS 'Statistics of actions performed by each admin';
