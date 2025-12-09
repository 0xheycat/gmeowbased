-- ============================================================================
-- Phase 5: DeFi Position Detection
-- ============================================================================
-- Track user positions across DeFi protocols (Aave, Compound, Uniswap, etc.)
-- Detection based on token holdings analysis (professional pattern from DeBank)
-- ============================================================================

-- Create DeFi positions table
CREATE TABLE IF NOT EXISTS public.defi_positions (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  
  -- Protocol Information
  protocol TEXT NOT NULL,              -- 'aave', 'compound', 'uniswap-v2', 'uniswap-v3', 'sushiswap', 'curve', etc.
  protocol_version TEXT,               -- 'v2', 'v3', 'v1'
  position_type TEXT NOT NULL,         -- 'lending', 'borrowing', 'liquidity', 'staking', 'farming'
  
  -- Token Details
  token_address TEXT NOT NULL,         -- Position token address (aToken, cToken, LP token, etc.)
  token_symbol TEXT,                   -- Token symbol (aUSDC, cDAI, UNI-V2, etc.)
  underlying_token_address TEXT,       -- Underlying asset address (USDC for aUSDC)
  underlying_token_symbol TEXT,        -- Underlying asset symbol
  
  -- Position Size
  amount TEXT NOT NULL,                -- Token amount (raw, needs decimals)
  amount_formatted TEXT,               -- Human-readable amount
  decimals INTEGER,                    -- Token decimals
  
  -- Value Metrics
  value_usd NUMERIC(20, 2),           -- Current position value in USD
  apr NUMERIC(10, 4),                 -- Annual Percentage Rate (if available)
  apy NUMERIC(10, 4),                 -- Annual Percentage Yield (if available)
  
  -- Liquidity Pool Specific (for Uniswap, SushiSwap, Curve)
  pool_address TEXT,                   -- Pool contract address
  pool_tokens JSONB,                   -- Array of tokens in pool [{"symbol": "USDC", "amount": "1000"}, ...]
  pool_share_percentage NUMERIC(10, 6), -- User's share of pool (0.001234 = 0.1234%)
  
  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,      -- false if position closed
  raw_data JSONB,                      -- Store full token data for debugging
  
  -- Constraints
  UNIQUE(address, chain, protocol, token_address)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_defi_positions_address_chain ON public.defi_positions(address, chain);
CREATE INDEX IF NOT EXISTS idx_defi_positions_protocol ON public.defi_positions(protocol);
CREATE INDEX IF NOT EXISTS idx_defi_positions_type ON public.defi_positions(position_type);
CREATE INDEX IF NOT EXISTS idx_defi_positions_value ON public.defi_positions(value_usd DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_defi_positions_detected ON public.defi_positions(detected_at DESC);

-- RLS Policies
ALTER TABLE public.defi_positions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.defi_positions
  FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert/update" ON public.defi_positions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- DeFi Protocol Detection Function
-- ============================================================================
-- Analyzes token holdings to detect DeFi positions
-- Based on token address patterns (professional detection logic)
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_defi_positions(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base',
  p_tokens JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE(
  protocol TEXT,
  protocol_version TEXT,
  position_type TEXT,
  token_address TEXT,
  token_symbol TEXT,
  underlying_symbol TEXT,
  amount TEXT,
  value_usd NUMERIC,
  detected BOOLEAN
) AS $$
DECLARE
  v_token JSONB;
  v_symbol TEXT;
  v_address TEXT;
BEGIN
  -- Iterate through token holdings
  FOR v_token IN SELECT * FROM jsonb_array_elements(p_tokens)
  LOOP
    v_symbol := v_token->>'symbol';
    v_address := LOWER(v_token->>'address');
    
    -- Aave Detection (aTokens start with 'a' or 'Aave')
    IF v_symbol LIKE 'a%' OR v_symbol LIKE 'Aave%' THEN
      RETURN QUERY SELECT
        'aave'::TEXT,
        CASE 
          WHEN v_symbol LIKE 'aAave%' THEN 'v3'
          WHEN v_symbol LIKE 'aOpt%' THEN 'v3'
          ELSE 'v2'
        END::TEXT,
        'lending'::TEXT,
        v_address,
        v_symbol,
        REGEXP_REPLACE(v_symbol, '^a', '')::TEXT, -- Remove 'a' prefix
        v_token->>'balance',
        (v_token->>'valueUSD')::NUMERIC,
        true;
    
    -- Compound Detection (cTokens start with 'c')
    ELSIF v_symbol LIKE 'c%' AND LENGTH(v_symbol) <= 6 THEN
      RETURN QUERY SELECT
        'compound'::TEXT,
        'v2'::TEXT,
        'lending'::TEXT,
        v_address,
        v_symbol,
        REGEXP_REPLACE(v_symbol, '^c', '')::TEXT, -- Remove 'c' prefix
        v_token->>'balance',
        (v_token->>'valueUSD')::NUMERIC,
        true;
    
    -- Uniswap V2 Detection (UNI-V2 in symbol or known LP patterns)
    ELSIF v_symbol LIKE '%UNI-V2%' OR v_symbol LIKE '%LP%' THEN
      RETURN QUERY SELECT
        'uniswap'::TEXT,
        'v2'::TEXT,
        'liquidity'::TEXT,
        v_address,
        v_symbol,
        v_symbol, -- LP tokens don't have single underlying
        v_token->>'balance',
        (v_token->>'valueUSD')::NUMERIC,
        true;
    
    -- Curve Detection (curve pool tokens)
    ELSIF v_symbol LIKE '%-crv' OR v_symbol LIKE '%CRV%' THEN
      RETURN QUERY SELECT
        'curve'::TEXT,
        'v1'::TEXT,
        'liquidity'::TEXT,
        v_address,
        v_symbol,
        v_symbol,
        v_token->>'balance',
        (v_token->>'valueUSD')::NUMERIC,
        true;
    
    -- SushiSwap Detection (SLP tokens)
    ELSIF v_symbol LIKE '%SLP%' THEN
      RETURN QUERY SELECT
        'sushiswap'::TEXT,
        'v1'::TEXT,
        'liquidity'::TEXT,
        v_address,
        v_symbol,
        v_symbol,
        v_token->>'balance',
        (v_token->>'valueUSD')::NUMERIC,
        true;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_defi_positions TO service_role;
GRANT EXECUTE ON FUNCTION detect_defi_positions TO anon;

-- ============================================================================
-- Upsert DeFi Position Function
-- ============================================================================
-- Updates existing position or inserts new one
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_defi_position(
  p_address TEXT,
  p_chain TEXT,
  p_protocol TEXT,
  p_position_type TEXT,
  p_token_address TEXT,
  p_token_symbol TEXT,
  p_amount TEXT,
  p_value_usd NUMERIC,
  p_underlying_symbol TEXT DEFAULT NULL,
  p_protocol_version TEXT DEFAULT NULL,
  p_raw_data JSONB DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_position_id BIGINT;
BEGIN
  INSERT INTO public.defi_positions (
    address,
    chain,
    protocol,
    protocol_version,
    position_type,
    token_address,
    token_symbol,
    underlying_token_symbol,
    amount,
    value_usd,
    raw_data,
    last_updated
  ) VALUES (
    LOWER(p_address),
    p_chain,
    p_protocol,
    p_protocol_version,
    p_position_type,
    LOWER(p_token_address),
    p_token_symbol,
    p_underlying_symbol,
    p_amount,
    p_value_usd,
    p_raw_data,
    NOW()
  )
  ON CONFLICT (address, chain, protocol, token_address)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    value_usd = EXCLUDED.value_usd,
    last_updated = NOW(),
    is_active = true
  RETURNING id INTO v_position_id;
  
  RETURN v_position_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION upsert_defi_position TO service_role;

-- ============================================================================
-- Get DeFi Positions Summary
-- ============================================================================
-- Returns aggregated DeFi positions for an address
-- ============================================================================

CREATE OR REPLACE FUNCTION get_defi_summary(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base'
)
RETURNS TABLE(
  total_positions INTEGER,
  total_value_usd NUMERIC,
  protocols_used TEXT[],
  position_types JSONB,
  top_positions JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH position_stats AS (
    SELECT
      COUNT(*)::INTEGER as pos_count,
      SUM(value_usd) as total_val,
      ARRAY_AGG(DISTINCT protocol) as prots,
      jsonb_object_agg(
        position_type,
        jsonb_build_object(
          'count', COUNT(*),
          'total_value', SUM(value_usd)
        )
      ) as types,
      jsonb_agg(
        jsonb_build_object(
          'protocol', protocol,
          'type', position_type,
          'symbol', token_symbol,
          'value_usd', value_usd
        )
        ORDER BY value_usd DESC
      ) FILTER (WHERE value_usd IS NOT NULL) as top_pos
    FROM public.defi_positions
    WHERE address = LOWER(p_address)
      AND chain = p_chain
      AND is_active = true
  )
  SELECT
    pos_count,
    total_val,
    prots,
    types,
    (SELECT jsonb_agg(value) FROM (SELECT value FROM jsonb_array_elements(top_pos) LIMIT 5) s)
  FROM position_stats;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_defi_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_defi_summary TO anon;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.defi_positions IS 'DeFi protocol positions detected from token holdings';
COMMENT ON FUNCTION detect_defi_positions IS 'Analyzes token holdings to detect DeFi positions (Aave, Compound, Uniswap, etc.)';
COMMENT ON FUNCTION get_defi_summary IS 'Returns aggregated DeFi positions summary for an address';
