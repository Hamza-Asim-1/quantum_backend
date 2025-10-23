-- Migration: Create user_wallets table
-- Created: 2025-10-10
-- Purpose: Store user crypto wallet addresses for BEP20 and TRC20

-- Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain VARCHAR(10) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  UNIQUE(user_id, chain, wallet_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_chain ON user_wallets(chain);

-- Add comments for documentation
COMMENT ON TABLE user_wallets IS 'Stores user crypto wallet addresses';
COMMENT ON COLUMN user_wallets.chain IS 'Blockchain: BEP20 or TRC20';
COMMENT ON COLUMN user_wallets.wallet_address IS 'User wallet public address';
COMMENT ON COLUMN user_wallets.is_verified IS 'Whether wallet ownership is verified';
COMMENT ON COLUMN user_wallets.is_primary IS 'Whether this is the primary wallet for this chain';
COMMENT ON COLUMN user_wallets.added_at IS 'When the wallet was linked';
COMMENT ON COLUMN user_wallets.verified_at IS 'When the wallet was verified';

-- Add check constraint for valid chains
ALTER TABLE user_wallets ADD CONSTRAINT check_valid_chain 
CHECK (chain IN ('BEP20', 'TRC20'));
