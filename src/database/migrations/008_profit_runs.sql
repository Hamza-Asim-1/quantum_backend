-- Migration 008: Profit Runs Table
-- Purpose: Track automated profit distribution executions

CREATE TABLE IF NOT EXISTS profit_runs (
    id SERIAL PRIMARY KEY,
    
    -- Run details
    run_type VARCHAR(10) NOT NULL CHECK (run_type IN ('daily', 'monthly')),
    run_date DATE NOT NULL,
    
    -- Execution details
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    total_investments_processed INTEGER DEFAULT 0,
    total_profit_distributed DECIMAL(18, 2) DEFAULT 0.00,
    total_users_credited INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    
    -- Error tracking
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    
    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    
    -- Execution metadata
    execution_metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profit_runs_run_type ON profit_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_profit_runs_run_date ON profit_runs(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_profit_runs_status ON profit_runs(status);
CREATE INDEX IF NOT EXISTS idx_profit_runs_idempotency ON profit_runs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_profit_runs_started_at ON profit_runs(started_at DESC);

-- Unique constraint to prevent duplicate runs for same date and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_runs_unique_daily 
    ON profit_runs(run_type, run_date) 
    WHERE status = 'completed';

-- Function to check if profit run already completed for date
CREATE OR REPLACE FUNCTION is_profit_run_completed(
    p_run_type VARCHAR,
    p_run_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM profit_runs 
        WHERE run_type = p_run_type 
        AND run_date = p_run_date 
        AND status = 'completed'
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to start profit run
CREATE OR REPLACE FUNCTION start_profit_run(
    p_run_type VARCHAR,
    p_run_date DATE,
    p_idempotency_key VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_run_id INTEGER;
BEGIN
    -- Check if already completed
    IF is_profit_run_completed(p_run_type, p_run_date) THEN
        RAISE EXCEPTION 'Profit run already completed for % on %', p_run_type, p_run_date;
    END IF;
    
    -- Create new run
    INSERT INTO profit_runs (
        run_type, run_date, started_at, idempotency_key, status
    ) VALUES (
        p_run_type, p_run_date, CURRENT_TIMESTAMP, p_idempotency_key, 'running'
    ) RETURNING id INTO v_run_id;
    
    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete profit run
CREATE OR REPLACE FUNCTION complete_profit_run(
    p_run_id INTEGER,
    p_investments_processed INTEGER,
    p_profit_distributed DECIMAL,
    p_users_credited INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE profit_runs
    SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        total_investments_processed = p_investments_processed,
        total_profit_distributed = p_profit_distributed,
        total_users_credited = p_users_credited
    WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE profit_runs IS 'Automated profit distribution execution records';
COMMENT ON COLUMN profit_runs.run_type IS 'Type of profit run: daily or monthly';
COMMENT ON COLUMN profit_runs.run_date IS 'Date for which profit distribution was executed';
COMMENT ON COLUMN profit_runs.status IS 'Execution status: running, completed, failed, partial';
COMMENT ON COLUMN profit_runs.idempotency_key IS 'Unique key to prevent duplicate runs';