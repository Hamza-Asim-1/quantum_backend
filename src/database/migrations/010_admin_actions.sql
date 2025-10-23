-- Migration 010: Admin Actions Table
-- Purpose: Audit trail for all administrative actions

CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    
    -- Admin who performed the action
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'kyc_approve', 'kyc_reject', 
        'deposit_confirm', 'deposit_reject',
        'withdrawal_approve', 'withdrawal_reject',
        'user_suspend', 'user_activate',
        'system_pause', 'system_resume',
        'profit_run_manual', 'balance_adjustment',
        'user_delete', 'other'
    )),
    
    -- Target information
    target_type VARCHAR(50), -- 'user', 'deposit', 'withdrawal', 'kyc', 'system'
    target_id INTEGER,
    
    -- Action details
    description TEXT NOT NULL,
    reason TEXT,
    
    -- Changes made (before/after data)
    changes JSONB,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
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
    p_reason TEXT DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_action_id INTEGER;
BEGIN
    INSERT INTO admin_actions (
        admin_id, action_type, target_type, target_id,
        description, reason, changes, ip_address, user_agent
    ) VALUES (
        p_admin_id, p_action_type, p_target_type, p_target_id,
        p_description, p_reason, p_changes, p_ip_address, p_user_agent
    ) RETURNING id INTO v_action_id;
    
    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- View for recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
    aa.id,
    aa.action_type,
    u.email as admin_email,
    u.full_name as admin_name,
    aa.target_type,
    aa.target_id,
    aa.description,
    aa.reason,
    aa.performed_at
FROM admin_actions aa
JOIN users u ON aa.admin_id = u.id
ORDER BY aa.performed_at DESC
LIMIT 100;

-- View for admin statistics
CREATE OR REPLACE VIEW admin_action_statistics AS
SELECT 
    u.id as admin_id,
    u.email as admin_email,
    u.full_name as admin_name,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN aa.action_type LIKE 'kyc_%' THEN 1 END) as kyc_actions,
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