-- ============================================================================
-- Phase 5: Transaction Pattern Analysis
-- ============================================================================
-- Analyzes transaction patterns: active hours, frequency, whale detection
-- Professional behavioral analytics matching Nansen/Dune patterns
-- ============================================================================

-- Create transaction patterns table
CREATE TABLE IF NOT EXISTS public.transaction_patterns (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  
  -- Time-Based Activity Patterns
  active_hours JSONB,                  -- {hour: tx_count} for 0-23
  most_active_hour INTEGER,            -- Peak activity hour (0-23)
  active_days_of_week JSONB,          -- {day: tx_count} for 0-6 (Sun-Sat)
  most_active_day INTEGER,             -- Peak activity day
  
  -- Transaction Frequency Metrics
  daily_avg_txs NUMERIC(10, 2),       -- Average transactions per day
  weekly_avg_txs NUMERIC(10, 2),      -- Average transactions per week
  monthly_avg_txs NUMERIC(10, 2),     -- Average transactions per month
  max_txs_per_day INTEGER,             -- Highest transaction count in a single day
  total_active_days INTEGER,           -- Days with at least 1 transaction
  
  -- Contract Interaction Patterns
  contract_types JSONB,                -- {type: count} - DEX, NFT, DeFi, etc.
  most_used_contract TEXT,             -- Contract with most interactions
  most_used_contract_count INTEGER,    -- Interaction count with most used
  unique_contracts_count INTEGER,      -- Total unique contracts interacted with
  
  -- Value Patterns
  total_volume_eth NUMERIC(30, 18),   -- Total ETH moved (in + out)
  avg_tx_value_eth NUMERIC(30, 18),   -- Average transaction value
  largest_tx_value_eth NUMERIC(30, 18), -- Largest single transaction
  total_gas_spent_eth NUMERIC(30, 18), -- Total gas paid
  
  -- Whale Detection
  is_whale BOOLEAN DEFAULT false,      -- Flagged as whale (high value holder)
  whale_threshold_usd NUMERIC(20, 2),  -- Threshold used for detection
  portfolio_value_usd NUMERIC(20, 2),  -- Current portfolio value
  whale_classification TEXT,           -- 'mega_whale', 'whale', 'dolphin', 'shrimp'
  
  -- Behavioral Flags
  is_bot BOOLEAN DEFAULT false,        -- Automated trading pattern detected
  is_mev_bot BOOLEAN DEFAULT false,    -- MEV bot pattern detected
  is_arbitrageur BOOLEAN DEFAULT false, -- Arbitrage pattern detected
  is_high_frequency BOOLEAN DEFAULT false, -- > 10 txs per day average
  
  -- Analysis Period
  analysis_start_date TIMESTAMPTZ,     -- First transaction date
  analysis_end_date TIMESTAMPTZ,       -- Last transaction date
  total_transactions_analyzed INTEGER,
  
  -- Metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(address, chain)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_patterns_address_chain ON public.transaction_patterns(address, chain);
CREATE INDEX IF NOT EXISTS idx_patterns_whale ON public.transaction_patterns(is_whale) WHERE is_whale = true;
CREATE INDEX IF NOT EXISTS idx_patterns_portfolio ON public.transaction_patterns(portfolio_value_usd DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_classification ON public.transaction_patterns(whale_classification);
CREATE INDEX IF NOT EXISTS idx_patterns_bot ON public.transaction_patterns(is_bot) WHERE is_bot = true;
CREATE INDEX IF NOT EXISTS idx_patterns_updated ON public.transaction_patterns(last_updated DESC);

-- RLS Policies
ALTER TABLE public.transaction_patterns ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.transaction_patterns
  FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert/update" ON public.transaction_patterns
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Analyze Transaction Patterns
-- ============================================================================
-- Main analysis function - processes transaction history and detects patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_transaction_patterns(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base',
  p_transactions JSONB DEFAULT '[]'::JSONB,
  p_portfolio_value_usd NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  patterns_detected INTEGER,
  is_whale BOOLEAN,
  whale_classification TEXT,
  active_hours_json JSONB,
  analysis_summary TEXT
) AS $$
DECLARE
  v_tx JSONB;
  v_hour_counts JSONB := '{}'::JSONB;
  v_day_counts JSONB := '{}'::JSONB;
  v_contract_types JSONB := '{}'::JSONB;
  v_total_txs INTEGER := 0;
  v_total_volume NUMERIC := 0;
  v_total_gas NUMERIC := 0;
  v_first_tx TIMESTAMPTZ;
  v_last_tx TIMESTAMPTZ;
  v_active_days INTEGER;
  v_is_whale BOOLEAN := false;
  v_whale_class TEXT := 'shrimp';
  v_whale_threshold NUMERIC := 100000; -- $100k default
  v_pattern_count INTEGER := 0;
BEGIN
  -- Count transactions
  v_total_txs := jsonb_array_length(p_transactions);
  
  IF v_total_txs = 0 THEN
    RETURN QUERY SELECT false, 0, false, 'shrimp'::TEXT, '{}'::JSONB, 'No transactions to analyze'::TEXT;
    RETURN;
  END IF;
  
  -- Initialize hour/day counters
  FOR i IN 0..23 LOOP
    v_hour_counts := jsonb_set(v_hour_counts, ARRAY[i::TEXT], '0'::JSONB);
  END LOOP;
  
  FOR i IN 0..6 LOOP
    v_day_counts := jsonb_set(v_day_counts, ARRAY[i::TEXT], '0'::JSONB);
  END LOOP;
  
  -- Process each transaction
  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    DECLARE
      v_timestamp TIMESTAMPTZ;
      v_hour INTEGER;
      v_day INTEGER;
      v_value NUMERIC;
      v_gas NUMERIC;
      v_current_count INTEGER;
    BEGIN
      -- Extract timestamp
      v_timestamp := (v_tx->>'timestamp')::TIMESTAMPTZ;
      
      IF v_timestamp IS NOT NULL THEN
        -- Update first/last transaction times
        IF v_first_tx IS NULL OR v_timestamp < v_first_tx THEN
          v_first_tx := v_timestamp;
        END IF;
        IF v_last_tx IS NULL OR v_timestamp > v_last_tx THEN
          v_last_tx := v_timestamp;
        END IF;
        
        -- Count by hour (0-23)
        v_hour := EXTRACT(HOUR FROM v_timestamp)::INTEGER;
        v_current_count := (v_hour_counts->>v_hour::TEXT)::INTEGER;
        v_hour_counts := jsonb_set(v_hour_counts, ARRAY[v_hour::TEXT], (v_current_count + 1)::TEXT::JSONB);
        
        -- Count by day of week (0-6)
        v_day := EXTRACT(DOW FROM v_timestamp)::INTEGER;
        v_current_count := (v_day_counts->>v_day::TEXT)::INTEGER;
        v_day_counts := jsonb_set(v_day_counts, ARRAY[v_day::TEXT], (v_current_count + 1)::TEXT::JSONB);
      END IF;
      
      -- Accumulate volume and gas
      v_value := COALESCE((v_tx->>'value')::NUMERIC, 0);
      v_gas := COALESCE((v_tx->>'gas_paid')::NUMERIC, 0);
      v_total_volume := v_total_volume + v_value;
      v_total_gas := v_total_gas + v_gas;
    END;
  END LOOP;
  
  -- Calculate active days
  IF v_first_tx IS NOT NULL AND v_last_tx IS NOT NULL THEN
    v_active_days := EXTRACT(DAY FROM (v_last_tx - v_first_tx))::INTEGER;
    IF v_active_days = 0 THEN v_active_days := 1; END IF;
  END IF;
  
  -- Whale classification based on portfolio value
  IF p_portfolio_value_usd IS NOT NULL THEN
    IF p_portfolio_value_usd >= 10000000 THEN
      v_whale_class := 'mega_whale';  -- $10M+
      v_is_whale := true;
      v_pattern_count := v_pattern_count + 1;
    ELSIF p_portfolio_value_usd >= 1000000 THEN
      v_whale_class := 'whale';       -- $1M+
      v_is_whale := true;
      v_pattern_count := v_pattern_count + 1;
    ELSIF p_portfolio_value_usd >= 100000 THEN
      v_whale_class := 'dolphin';     -- $100K+
      v_pattern_count := v_pattern_count + 1;
    ELSE
      v_whale_class := 'shrimp';      -- < $100K
    END IF;
  END IF;
  
  -- Upsert patterns into database
  INSERT INTO public.transaction_patterns (
    address,
    chain,
    active_hours,
    active_days_of_week,
    daily_avg_txs,
    total_active_days,
    total_volume_eth,
    total_gas_spent_eth,
    is_whale,
    whale_threshold_usd,
    portfolio_value_usd,
    whale_classification,
    is_high_frequency,
    analysis_start_date,
    analysis_end_date,
    total_transactions_analyzed,
    last_updated
  ) VALUES (
    LOWER(p_address),
    p_chain,
    v_hour_counts,
    v_day_counts,
    CASE WHEN v_active_days > 0 THEN v_total_txs::NUMERIC / v_active_days ELSE 0 END,
    v_active_days,
    v_total_volume,
    v_total_gas,
    v_is_whale,
    v_whale_threshold,
    p_portfolio_value_usd,
    v_whale_class,
    (v_total_txs::NUMERIC / NULLIF(v_active_days, 0)) > 10,
    v_first_tx,
    v_last_tx,
    v_total_txs,
    NOW()
  )
  ON CONFLICT (address, chain)
  DO UPDATE SET
    active_hours = EXCLUDED.active_hours,
    active_days_of_week = EXCLUDED.active_days_of_week,
    daily_avg_txs = EXCLUDED.daily_avg_txs,
    total_active_days = EXCLUDED.total_active_days,
    total_volume_eth = EXCLUDED.total_volume_eth,
    total_gas_spent_eth = EXCLUDED.total_gas_spent_eth,
    is_whale = EXCLUDED.is_whale,
    portfolio_value_usd = EXCLUDED.portfolio_value_usd,
    whale_classification = EXCLUDED.whale_classification,
    is_high_frequency = EXCLUDED.is_high_frequency,
    analysis_end_date = EXCLUDED.analysis_end_date,
    total_transactions_analyzed = EXCLUDED.total_transactions_analyzed,
    last_updated = NOW();
  
  -- Return results
  RETURN QUERY SELECT 
    true,
    v_pattern_count,
    v_is_whale,
    v_whale_class,
    v_hour_counts,
    format('Analyzed %s transactions over %s days. Classification: %s', v_total_txs, v_active_days, v_whale_class);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION analyze_transaction_patterns TO service_role;

-- ============================================================================
-- Get Pattern Summary
-- ============================================================================
-- Returns human-readable pattern analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pattern_summary(
  p_address TEXT,
  p_chain TEXT DEFAULT 'base'
)
RETURNS TABLE(
  whale_classification TEXT,
  is_whale BOOLEAN,
  portfolio_value_usd NUMERIC,
  daily_avg_txs NUMERIC,
  most_active_hour INTEGER,
  total_gas_spent_eth NUMERIC,
  behavioral_flags JSONB,
  activity_heatmap JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.whale_classification,
    p.is_whale,
    p.portfolio_value_usd,
    p.daily_avg_txs,
    p.most_active_hour,
    p.total_gas_spent_eth,
    jsonb_build_object(
      'is_bot', p.is_bot,
      'is_mev_bot', p.is_mev_bot,
      'is_arbitrageur', p.is_arbitrageur,
      'is_high_frequency', p.is_high_frequency
    ) as flags,
    jsonb_build_object(
      'hours', p.active_hours,
      'days', p.active_days_of_week
    ) as heatmap
  FROM public.transaction_patterns p
  WHERE p.address = LOWER(p_address)
    AND p.chain = p_chain
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_pattern_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_pattern_summary TO anon;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.transaction_patterns IS 'Transaction behavioral patterns and whale detection';
COMMENT ON FUNCTION analyze_transaction_patterns IS 'Analyzes transaction history to detect behavioral patterns';
COMMENT ON FUNCTION get_pattern_summary IS 'Returns human-readable pattern analysis summary';
