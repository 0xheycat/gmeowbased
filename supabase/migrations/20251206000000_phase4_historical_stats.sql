-- ============================================================================
-- Phase 4: Historical On-Chain Stats Tracking
-- ============================================================================
-- Created: December 6, 2025
-- Purpose: Track portfolio snapshots over time for trend analysis
-- 
-- Features:
-- 1. Daily snapshots of portfolio value, gas spent, token balances
-- 2. Historical queries (7d, 30d, 90d, 1y)
-- 3. Percentage change calculations
-- 4. Time-series data for charts
-- ============================================================================

-- ============================================================================
-- Table: onchain_stats_snapshots
-- ============================================================================
-- Stores daily snapshots of wallet on-chain statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS onchain_stats_snapshots (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  
  -- Portfolio metrics
  portfolio_value_usd NUMERIC(20, 2),
  token_count INTEGER,
  top_tokens JSONB,
  
  -- Gas analytics
  gas_spent_eth NUMERIC(20, 8),
  gas_spent_usd NUMERIC(20, 2),
  gas_consumed_units BIGINT,
  avg_gas_price_gwei NUMERIC(20, 2),
  
  -- NFT analytics
  nft_collection_count INTEGER,
  nft_portfolio_value_usd NUMERIC(20, 2),
  top_nft_collections JSONB,
  
  -- Detailed balances (for deep analysis)
  token_balances JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one snapshot per address/chain/date
  UNIQUE(address, chain, snapshot_date)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_snapshots_address_chain 
  ON onchain_stats_snapshots(address, chain);

CREATE INDEX IF NOT EXISTS idx_snapshots_date 
  ON onchain_stats_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_address_chain_date 
  ON onchain_stats_snapshots(address, chain, snapshot_date DESC);

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_snapshots_token_balances 
  ON onchain_stats_snapshots USING GIN (token_balances);

-- ============================================================================
-- Function: capture_onchain_stats_snapshot
-- ============================================================================
-- Purpose: Capture daily snapshot for a specific address
-- Parameters:
--   p_address: Wallet address (e.g., '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
--   p_chain: Chain identifier (e.g., 'base', 'ethereum')
-- Returns: JSONB with snapshot data
-- ============================================================================

CREATE OR REPLACE FUNCTION capture_onchain_stats_snapshot(
  p_address TEXT,
  p_chain TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_data JSONB;
  v_snapshot_id BIGINT;
BEGIN
  -- Note: This function is called by external API that fetches Blockscout data
  -- The actual data fetching happens in the Next.js API endpoint
  -- This function just stores the snapshot data
  
  -- Insert placeholder row (will be updated by API with real data)
  INSERT INTO onchain_stats_snapshots (
    address,
    chain,
    snapshot_date
  ) VALUES (
    LOWER(p_address),
    p_chain,
    CURRENT_DATE
  )
  ON CONFLICT (address, chain, snapshot_date) 
  DO UPDATE SET
    created_at = NOW()  -- Just update timestamp if already exists
  RETURNING id INTO v_snapshot_id;
  
  -- Return success message
  v_snapshot_data := jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'address', LOWER(p_address),
    'chain', p_chain,
    'snapshot_date', CURRENT_DATE,
    'status', 'pending',
    'message', 'Snapshot row created. External API will populate data.'
  );
  
  RETURN v_snapshot_data;
END;
$$;

COMMENT ON FUNCTION capture_onchain_stats_snapshot IS 
  'Creates a placeholder snapshot row. External API calls Blockscout MCP to fetch data and updates the row.';

-- ============================================================================
-- Function: update_snapshot_data
-- ============================================================================
-- Purpose: Update snapshot with data fetched from Blockscout
-- Parameters:
--   p_address: Wallet address
--   p_chain: Chain identifier
--   p_snapshot_date: Date of snapshot
--   p_data: JSONB object with all stats data
-- ============================================================================

CREATE OR REPLACE FUNCTION update_snapshot_data(
  p_address TEXT,
  p_chain TEXT,
  p_snapshot_date DATE,
  p_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE onchain_stats_snapshots
  SET
    portfolio_value_usd = (p_data->>'portfolioValueUSD')::NUMERIC,
    token_count = (p_data->>'tokenCount')::INTEGER,
    top_tokens = p_data->'topTokens',
    gas_spent_eth = (p_data->>'gasSpentETH')::NUMERIC,
    gas_spent_usd = (p_data->>'gasSpentUSD')::NUMERIC,
    gas_consumed_units = (p_data->>'gasConsumedUnits')::BIGINT,
    avg_gas_price_gwei = (p_data->>'avgGasPriceGwei')::NUMERIC,
    nft_collection_count = (p_data->>'nftCollectionCount')::INTEGER,
    nft_portfolio_value_usd = (p_data->>'nftPortfolioValueUSD')::NUMERIC,
    top_nft_collections = p_data->'topNFTCollections',
    token_balances = p_data->'tokenBalances',
    created_at = NOW()
  WHERE address = LOWER(p_address)
    AND chain = p_chain
    AND snapshot_date = p_snapshot_date;
END;
$$;

COMMENT ON FUNCTION update_snapshot_data IS 
  'Updates snapshot row with data fetched from Blockscout MCP by external API.';

-- ============================================================================
-- Function: get_historical_stats
-- ============================================================================
-- Purpose: Get historical stats for time-series charts
-- Parameters:
--   p_address: Wallet address
--   p_chain: Chain identifier
--   p_period: Period to query ('7d', '30d', '90d', '1y', 'all')
-- Returns: JSONB array of snapshots with calculated changes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_historical_stats(
  p_address TEXT,
  p_chain TEXT,
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_days INTEGER;
  v_snapshots JSONB;
  v_first_value NUMERIC;
  v_last_value NUMERIC;
  v_change_percent NUMERIC;
BEGIN
  -- Determine days based on period
  v_days := CASE p_period
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '1y' THEN 365
    WHEN 'all' THEN 999999
    ELSE 30
  END;
  
  -- Fetch snapshots
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', snapshot_date,
      'portfolioValueUSD', portfolio_value_usd,
      'gasSpentETH', gas_spent_eth,
      'gasSpentUSD', gas_spent_usd,
      'tokenCount', token_count,
      'nftCollectionCount', nft_collection_count,
      'avgGasPriceGwei', avg_gas_price_gwei
    ) ORDER BY snapshot_date ASC
  )
  INTO v_snapshots
  FROM onchain_stats_snapshots
  WHERE address = LOWER(p_address)
    AND chain = p_chain
    AND snapshot_date >= CURRENT_DATE - v_days
  ORDER BY snapshot_date ASC;
  
  -- If no data, return empty
  IF v_snapshots IS NULL THEN
    RETURN jsonb_build_object(
      'period', p_period,
      'snapshots', '[]'::JSONB,
      'summary', jsonb_build_object(
        'dataPoints', 0,
        'message', 'No historical data available'
      )
    );
  END IF;
  
  -- Calculate change percentage
  v_first_value := (v_snapshots->0->>'portfolioValueUSD')::NUMERIC;
  v_last_value := (v_snapshots->-1->>'portfolioValueUSD')::NUMERIC;
  
  IF v_first_value > 0 THEN
    v_change_percent := ((v_last_value - v_first_value) / v_first_value) * 100;
  ELSE
    v_change_percent := 0;
  END IF;
  
  -- Return with summary
  RETURN jsonb_build_object(
    'period', p_period,
    'snapshots', v_snapshots,
    'summary', jsonb_build_object(
      'dataPoints', jsonb_array_length(v_snapshots),
      'firstValue', v_first_value,
      'lastValue', v_last_value,
      'changePercent', ROUND(v_change_percent, 2),
      'firstDate', v_snapshots->0->>'date',
      'lastDate', v_snapshots->-1->>'date'
    )
  );
END;
$$;

COMMENT ON FUNCTION get_historical_stats IS 
  'Returns time-series historical stats with percentage change calculations for charts.';

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE onchain_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read snapshots
CREATE POLICY "Public read access"
  ON onchain_stats_snapshots
  FOR SELECT
  USING (true);

-- Policy: Service role can insert/update snapshots
CREATE POLICY "Service role can insert/update"
  ON onchain_stats_snapshots
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON onchain_stats_snapshots TO anon, authenticated;
GRANT ALL ON onchain_stats_snapshots TO service_role;

GRANT EXECUTE ON FUNCTION capture_onchain_stats_snapshot(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_snapshot_data(TEXT, TEXT, DATE, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_historical_stats(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
