-- Migration: Create system_config table
-- Created: 2025-10-10
-- Purpose: Store system configuration and scanner state

CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at);

-- Insert initial values for deposit scanner
INSERT INTO system_config (key, value, updated_at) VALUES 
  ('last_bep20_block', '0', CURRENT_TIMESTAMP),
  ('last_trc20_timestamp', '0', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE system_config IS 'System configuration and state storage';
COMMENT ON COLUMN system_config.key IS 'Configuration key (unique)';
COMMENT ON COLUMN system_config.value IS 'Configuration value (stored as text)';
COMMENT ON COLUMN system_config.updated_at IS 'Last update timestamp';
