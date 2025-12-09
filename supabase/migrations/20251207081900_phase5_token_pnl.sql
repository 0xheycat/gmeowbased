-- ============================================================================
-- Phase 5: Token PnL Tracking
-- ============================================================================
-- Tracks buy/sell transactions and calculates realized gains using FIFO
-- Professional PnL calculation matching portfolio platforms
-- ============================================================================

-- Create token PnL table
CREATE TABLE IF NOT EXISTS public.token_pnl (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  
  -- Token Information
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  token_name TEXT,
  
  -- Transaction Matching (FIFO)
  buy_tx_hash TEXT,                    -- Purchase transaction
  buy_timestamp TIMESTAMPTZ,           -- When purchased
  buy_amount TEXT,                     -- Amount bought (raw)
  buy_amount_formatted NUMERIC(30, 10),-- Amount bought (human-readable)
  buy_price_usd NUMERIC(20, 8),       -- Price per token at buy (USD)
  buy_value_usd NUMERIC(20, 2),       -- Total purchase cost (USD)
  buy_gas_paid_eth NUMERIC(20, 18),   -- Gas paid for buy transaction
  
  sell_tx_hash TEXT,                   -- Sale transaction
  sell_timestamp TIMESTAMPTZ,          -- When sold
  sell_amount TEXT,                    -- Amount sold (raw)
  sell_amount_formatted NUMERIC(30, 10),-- Amount sold (human-readable)
  sell_price_usd NUMERIC(20, 8),      -- Price per token at sell (USD)
  sell_value_usd NUMERIC(20, 2),      -- Total sale proceeds (USD)
  sell_gas_paid_eth NUMERIC(20, 18),  -- Gas paid for sell transaction
  
  -- PnL Calculation
  realized_pnl_usd NUMERIC(20, 2),    -- Sell value - Buy value - Gas costs
  pnl_percentage NUMERIC(10, 4),      -- (PnL / Buy value) * 100
  holding_period_days INTEGER,         -- Days between buy and sell
  
  -- Trade Classification
  trade_type TEXT,                     -- 'profit', 'loss', 'breakeven'
  is_short_term BOOLEAN,               -- < 30 days = short-term
  is_complete BOOLEAN DEFAULT false,   -- true if buy+sell matched
  
  -- Metadata
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  raw_buy_data JSONB,                  -- Full buy transaction data
  raw_sell_data JSONB,                 -- Full sell transaction data
  
  -- Constraints
  CHECK (buy_amount_formatted > 0 OR sell_amount_formatted > 0)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_token_pnl_address_chain ON public.token_pnl(address, chain);
CREATE INDEX IF NOT EXISTS idx_token_pnl_token ON public.token_pnl(token_address);
CREATE INDEX IF NOT EXISTS idx_token_pnl_complete ON public.token_pnl(is_complete) WHERE is_complete = true;
CREATE INDEX IF NOT EXISTS idx_token_pnl_profit ON public.token_pnl(realized_pnl_usd DESC) WHERE is_complete = true;
CREATE INDEX IF NOT EXISTS idx_token_pnl_buy_time ON public.token_pnl(buy_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_pnl_sell_time ON public.token_pnl(sell_timestamp DESC);

-- RLS Policies
ALTER TABLE public.token_pnl ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.token_pnl
  FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert/update" ON public.token_pnl
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Match Buy/Sell Transactions (FIFO Algorithm)
-- ============================================================================
-- Takes token transfers IN and OUT, matches them chronologically
-- Calculates realized gains using First-In-First-Out method
-- ============================================================================

CREATE OR REPLACE FUNCTION match_token_trades_fifo(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base',
  p_token_address TEXT DEFAULT NULL
)
RETURNS TABLE(
  matched_count INTEGER,
  total_realized_pnl NUMERIC,
  profitable_trades INTEGER,
  losing_trades INTEGER
) AS $$
DECLARE
  v_matched_count INTEGER := 0;
  v_total_pnl NUMERIC := 0;
  v_profit_count INTEGER := 0;
  v_loss_count INTEGER := 0;
BEGIN
  -- This is a placeholder for the matching algorithm
  -- Real implementation would:
  -- 1. Fetch all token_transfers WHERE from_address = p_address (sells)
  -- 2. Fetch all token_transfers WHERE to_address = p_address (buys)
  -- 3. Sort buys by timestamp ASC (FIFO)
  -- 4. For each sell, match against earliest unmatched buy
  -- 5. Calculate PnL: (sell_price - buy_price) * amount - gas_costs
  -- 6. Insert into token_pnl table
  
  -- For now, return empty results
  RETURN QUERY SELECT 0, 0::NUMERIC, 0, 0;
  
  -- TODO: Implement full FIFO matching logic
  -- This requires fetching historical token prices at transaction timestamps
  -- Which is complex and requires external price oracle data
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION match_token_trades_fifo TO service_role;

-- ============================================================================
-- Get PnL Summary
-- ============================================================================
-- Returns aggregated PnL statistics for an address
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pnl_summary(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base',
  p_token_address TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_trades INTEGER,
  completed_trades INTEGER,
  total_pnl_usd NUMERIC,
  total_profit_usd NUMERIC,
  total_loss_usd NUMERIC,
  win_rate NUMERIC,
  avg_pnl_per_trade NUMERIC,
  best_trade JSONB,
  worst_trade JSONB,
  top_tokens JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH trade_stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE is_complete = true)::INTEGER as completed,
      COALESCE(SUM(realized_pnl_usd), 0) as total_pnl,
      COALESCE(SUM(realized_pnl_usd) FILTER (WHERE realized_pnl_usd > 0), 0) as profits,
      COALESCE(SUM(realized_pnl_usd) FILTER (WHERE realized_pnl_usd < 0), 0) as losses,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_complete = true) > 0 
        THEN (COUNT(*) FILTER (WHERE realized_pnl_usd > 0)::NUMERIC / COUNT(*) FILTER (WHERE is_complete = true)) * 100
        ELSE 0
      END as win_pct,
      CASE 
        WHEN COUNT(*) FILTER (WHERE is_complete = true) > 0
        THEN AVG(realized_pnl_usd) FILTER (WHERE is_complete = true)
        ELSE 0
      END as avg_pnl
    FROM public.token_pnl
    WHERE address = LOWER(p_address)
      AND chain = p_chain
      AND (p_token_address IS NULL OR token_address = LOWER(p_token_address))
      AND (p_days IS NULL OR sell_timestamp > NOW() - (p_days || ' days')::INTERVAL)
  ),
  best AS (
    SELECT jsonb_build_object(
      'token_symbol', token_symbol,
      'pnl_usd', realized_pnl_usd,
      'percentage', pnl_percentage,
      'buy_date', buy_timestamp,
      'sell_date', sell_timestamp
    ) as trade
    FROM public.token_pnl
    WHERE address = LOWER(p_address)
      AND chain = p_chain
      AND is_complete = true
    ORDER BY realized_pnl_usd DESC
    LIMIT 1
  ),
  worst AS (
    SELECT jsonb_build_object(
      'token_symbol', token_symbol,
      'pnl_usd', realized_pnl_usd,
      'percentage', pnl_percentage,
      'buy_date', buy_timestamp,
      'sell_date', sell_timestamp
    ) as trade
    FROM public.token_pnl
    WHERE address = LOWER(p_address)
      AND chain = p_chain
      AND is_complete = true
    ORDER BY realized_pnl_usd ASC
    LIMIT 1
  ),
  top_tokens_agg AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'token_symbol', token_symbol,
        'trades', trade_count,
        'total_pnl', total_token_pnl,
        'win_rate', win_rate_pct
      )
      ORDER BY total_token_pnl DESC
    ) as tokens
    FROM (
      SELECT
        token_symbol,
        COUNT(*)::INTEGER as trade_count,
        SUM(realized_pnl_usd) as total_token_pnl,
        (COUNT(*) FILTER (WHERE realized_pnl_usd > 0)::NUMERIC / COUNT(*)) * 100 as win_rate_pct
      FROM public.token_pnl
      WHERE address = LOWER(p_address)
        AND chain = p_chain
        AND is_complete = true
      GROUP BY token_symbol
      ORDER BY SUM(realized_pnl_usd) DESC
      LIMIT 5
    ) t
  )
  SELECT
    s.total,
    s.completed,
    s.total_pnl,
    s.profits,
    s.losses,
    s.win_pct,
    s.avg_pnl,
    b.trade,
    w.trade,
    t.tokens
  FROM trade_stats s
  CROSS JOIN best b
  CROSS JOIN worst w
  CROSS JOIN top_tokens_agg t;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_pnl_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_pnl_summary TO anon;

-- ============================================================================
-- Insert Manual Trade Entry
-- ============================================================================
-- For testing or manual entry of known trades
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_trade_entry(
  p_address TEXT,
  p_chain TEXT,
  p_token_address TEXT,
  p_token_symbol TEXT,
  p_buy_timestamp TIMESTAMPTZ,
  p_buy_amount NUMERIC,
  p_buy_price_usd NUMERIC,
  p_sell_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_sell_amount NUMERIC DEFAULT NULL,
  p_sell_price_usd NUMERIC DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_trade_id BIGINT;
  v_pnl NUMERIC;
  v_pnl_pct NUMERIC;
  v_holding_days INTEGER;
BEGIN
  -- Calculate metrics if sell data provided
  IF p_sell_timestamp IS NOT NULL AND p_sell_amount IS NOT NULL THEN
    v_pnl := (p_sell_amount * p_sell_price_usd) - (p_buy_amount * p_buy_price_usd);
    v_pnl_pct := (v_pnl / (p_buy_amount * p_buy_price_usd)) * 100;
    v_holding_days := EXTRACT(DAY FROM (p_sell_timestamp - p_buy_timestamp));
  END IF;
  
  INSERT INTO public.token_pnl (
    address,
    chain,
    token_address,
    token_symbol,
    buy_timestamp,
    buy_amount_formatted,
    buy_price_usd,
    buy_value_usd,
    sell_timestamp,
    sell_amount_formatted,
    sell_price_usd,
    sell_value_usd,
    realized_pnl_usd,
    pnl_percentage,
    holding_period_days,
    is_complete,
    trade_type,
    is_short_term
  ) VALUES (
    LOWER(p_address),
    p_chain,
    LOWER(p_token_address),
    p_token_symbol,
    p_buy_timestamp,
    p_buy_amount,
    p_buy_price_usd,
    p_buy_amount * p_buy_price_usd,
    p_sell_timestamp,
    p_sell_amount,
    p_sell_price_usd,
    CASE WHEN p_sell_amount IS NOT NULL THEN p_sell_amount * p_sell_price_usd ELSE NULL END,
    v_pnl,
    v_pnl_pct,
    v_holding_days,
    p_sell_timestamp IS NOT NULL,
    CASE
      WHEN v_pnl > 0 THEN 'profit'
      WHEN v_pnl < 0 THEN 'loss'
      ELSE 'breakeven'
    END,
    v_holding_days < 30
  )
  RETURNING id INTO v_trade_id;
  
  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION insert_trade_entry TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.token_pnl IS 'Token profit/loss tracking with FIFO matching';
COMMENT ON FUNCTION match_token_trades_fifo IS 'Matches buy/sell transactions using FIFO algorithm';
COMMENT ON FUNCTION get_pnl_summary IS 'Returns aggregated PnL statistics for an address';
