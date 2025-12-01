-- User Onchain Contracts Tracking
-- Stores deployed contracts per user per chain for efficient querying
-- Replaces RPC-based contract counting with database queries

-- Create user_contracts table
CREATE TABLE IF NOT EXISTS user_contracts (
  id BIGSERIAL PRIMARY KEY,
  
  -- User identification
  user_address TEXT NOT NULL,
  fid BIGINT,
  
  -- Contract details
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  chain_key TEXT NOT NULL,
  
  -- Deployment metadata
  deployed_at TIMESTAMPTZ,
  deployment_tx TEXT,
  creator_address TEXT,
  
  -- Contract info (optional)
  contract_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  source_code_available BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_address, contract_address, chain_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_user_contracts_user_address ON user_contracts(user_address);
CREATE INDEX idx_user_contracts_fid ON user_contracts(fid) WHERE fid IS NOT NULL;
CREATE INDEX idx_user_contracts_chain ON user_contracts(chain_key, chain_id);
CREATE INDEX idx_user_contracts_deployed_at ON user_contracts(deployed_at DESC);
CREATE INDEX idx_user_contracts_created_at ON user_contracts(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX idx_user_contracts_lookup ON user_contracts(user_address, chain_key, deployed_at DESC);

-- Enable RLS
ALTER TABLE user_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read
CREATE POLICY user_contracts_read_all 
  ON user_contracts FOR SELECT 
  USING (true);

-- RLS Policy: Only authenticated users can insert/update
CREATE POLICY user_contracts_authenticated_write 
  ON user_contracts FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY user_contracts_authenticated_update 
  ON user_contracts FOR UPDATE 
  TO authenticated 
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_contracts_updated_at
  BEFORE UPDATE ON user_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_contracts_updated_at();

-- Function to count contracts by user and chain
CREATE OR REPLACE FUNCTION get_user_contract_count(
  p_user_address TEXT,
  p_chain_key TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  IF p_chain_key IS NULL THEN
    -- Count across all chains
    RETURN (
      SELECT COUNT(*)
      FROM user_contracts
      WHERE LOWER(user_address) = LOWER(p_user_address)
    );
  ELSE
    -- Count for specific chain
    RETURN (
      SELECT COUNT(*)
      FROM user_contracts
      WHERE LOWER(user_address) = LOWER(p_user_address)
        AND chain_key = p_chain_key
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get featured contract (most recent)
CREATE OR REPLACE FUNCTION get_user_featured_contract(
  p_user_address TEXT,
  p_chain_key TEXT
)
RETURNS TABLE (
  contract_address TEXT,
  creator_address TEXT,
  deployment_tx TEXT,
  deployed_at TIMESTAMPTZ,
  contract_name TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.contract_address,
    uc.creator_address,
    uc.deployment_tx,
    uc.deployed_at,
    uc.contract_name,
    uc.is_verified
  FROM user_contracts uc
  WHERE LOWER(uc.user_address) = LOWER(p_user_address)
    AND uc.chain_key = p_chain_key
  ORDER BY uc.deployed_at DESC NULLS LAST, uc.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to upsert contract (idempotent)
CREATE OR REPLACE FUNCTION upsert_user_contract(
  p_user_address TEXT,
  p_fid BIGINT,
  p_contract_address TEXT,
  p_chain_id INTEGER,
  p_chain_key TEXT,
  p_deployed_at TIMESTAMPTZ DEFAULT NULL,
  p_deployment_tx TEXT DEFAULT NULL,
  p_creator_address TEXT DEFAULT NULL,
  p_contract_name TEXT DEFAULT NULL,
  p_is_verified BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO user_contracts (
    user_address,
    fid,
    contract_address,
    chain_id,
    chain_key,
    deployed_at,
    deployment_tx,
    creator_address,
    contract_name,
    is_verified
  ) VALUES (
    LOWER(p_user_address),
    p_fid,
    LOWER(p_contract_address),
    p_chain_id,
    p_chain_key,
    p_deployed_at,
    p_deployment_tx,
    LOWER(p_creator_address),
    p_contract_name,
    p_is_verified
  )
  ON CONFLICT (user_address, contract_address, chain_id)
  DO UPDATE SET
    fid = COALESCE(EXCLUDED.fid, user_contracts.fid),
    deployed_at = COALESCE(EXCLUDED.deployed_at, user_contracts.deployed_at),
    deployment_tx = COALESCE(EXCLUDED.deployment_tx, user_contracts.deployment_tx),
    creator_address = COALESCE(EXCLUDED.creator_address, user_contracts.creator_address),
    contract_name = COALESCE(EXCLUDED.contract_name, user_contracts.contract_name),
    is_verified = EXCLUDED.is_verified OR user_contracts.is_verified,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_contracts IS 'Tracks contracts deployed by users across multiple chains';
COMMENT ON COLUMN user_contracts.user_address IS 'User wallet address (normalized to lowercase)';
COMMENT ON COLUMN user_contracts.fid IS 'Farcaster FID (optional, for social integration)';
COMMENT ON COLUMN user_contracts.contract_address IS 'Deployed contract address (normalized to lowercase)';
COMMENT ON COLUMN user_contracts.chain_id IS 'EVM chain ID (e.g., 8453 for Base)';
COMMENT ON COLUMN user_contracts.chain_key IS 'Chain identifier from chain registry (e.g., "base")';
COMMENT ON COLUMN user_contracts.deployed_at IS 'Contract deployment timestamp';
COMMENT ON COLUMN user_contracts.deployment_tx IS 'Transaction hash of deployment';
COMMENT ON COLUMN user_contracts.creator_address IS 'Address that deployed the contract';
COMMENT ON COLUMN user_contracts.is_verified IS 'Whether contract source code is verified';

COMMENT ON FUNCTION get_user_contract_count IS 'Returns count of contracts deployed by user (optional chain filter)';
COMMENT ON FUNCTION get_user_featured_contract IS 'Returns most recent contract deployed by user on specific chain';
COMMENT ON FUNCTION upsert_user_contract IS 'Inserts or updates user contract record (idempotent)';
