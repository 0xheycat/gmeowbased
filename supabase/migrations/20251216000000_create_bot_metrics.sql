/**
 * @file supabase/migrations/20251216000000_create_bot_metrics.sql
 * 
 * Bot Metrics Table Migration
 * Stores health metrics, performance data, and error logs for the Farcaster bot.
 * 
 * PHASE: Phase 1 - Week 1-2 (December 2025)
 * DATE: Created December 16, 2025
 * STATUS: ✅ READY TO APPLY
 * 
 * REFERENCE:
 * - lib/bot-analytics.ts - Analytics functions using this table
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Section 10.1: Bot Performance Metrics)
 * - PHASE-1-WEEK-1-2-COMPLETE.md (Bot Analytics Infrastructure)
 * 
 * METRICS TRACKED:
 * - webhook_received, webhook_processed, webhook_failed
 * - reply_generated, reply_failed
 * - cast_published, cast_failed
 * - rate_limit_hit, neynar_api_error
 * - targeting_check_passed, targeting_check_failed
 * 
 * INDEXES:
 * - idx_bot_metrics_type_time: Fast queries by metric type + time window
 * - idx_bot_metrics_fid: User-level analytics (optional FID filtering)
 * - idx_bot_metrics_errors: Quick error log retrieval
 * 
 * RETENTION:
 * - TODO: Add pg_cron job to archive metrics older than 90 days
 * - TODO: Create bot_metrics_daily_summary table for long-term trends
 */

-- Create bot_metrics table for tracking bot health metrics
CREATE TABLE IF NOT EXISTS public.bot_metrics (
  id BIGSERIAL PRIMARY KEY,
  
  -- Metric identification
  metric_type TEXT NOT NULL,
  -- Values: webhook_received, webhook_processed, webhook_failed,
  --         reply_generated, reply_failed, cast_published, cast_failed,
  --         rate_limit_hit, neynar_api_error,
  --         targeting_check_passed, targeting_check_failed
  
  -- User context (nullable - some metrics don't have FID)
  fid INTEGER,
  cast_hash TEXT,
  
  -- Error tracking
  error_message TEXT,
  
  -- Performance tracking
  response_time_ms INTEGER,
  
  -- Additional context (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: Fast queries by metric type + time window (most common query pattern)
CREATE INDEX idx_bot_metrics_type_time 
  ON public.bot_metrics(metric_type, created_at DESC);

-- Index: User-level analytics (optional FID filtering)
CREATE INDEX idx_bot_metrics_fid 
  ON public.bot_metrics(fid) 
  WHERE fid IS NOT NULL;

-- Index: Error log retrieval (fetch recent errors quickly)
CREATE INDEX idx_bot_metrics_errors 
  ON public.bot_metrics(created_at DESC) 
  WHERE error_message IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE public.bot_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Admin-only access (bot metrics are sensitive data)
CREATE POLICY "Admin read access for bot_metrics"
  ON public.bot_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.fid::text = (current_setting('request.jwt.claims', true)::json->>'fid')
      AND user_profiles.is_admin = true
    )
  );

-- Policy: Service role can insert metrics (bot writes metrics)
CREATE POLICY "Service role insert for bot_metrics"
  ON public.bot_metrics
  FOR INSERT
  WITH CHECK (
    current_setting('role', true) = 'service_role'
  );

-- Grant permissions
GRANT SELECT ON public.bot_metrics TO authenticated;
GRANT INSERT ON public.bot_metrics TO service_role;
GRANT SELECT ON public.bot_metrics TO anon;

-- Comment on table
COMMENT ON TABLE public.bot_metrics IS 'Bot health metrics and performance tracking. Stores webhook success rates, reply performance, API errors, and response times for monitoring bot health.';

-- Comments on columns
COMMENT ON COLUMN public.bot_metrics.metric_type IS 'Type of metric event (webhook_received, reply_generated, cast_failed, etc.)';
COMMENT ON COLUMN public.bot_metrics.fid IS 'User FID (nullable - not all metrics have user context)';
COMMENT ON COLUMN public.bot_metrics.cast_hash IS 'Cast hash for tracking specific cast interactions';
COMMENT ON COLUMN public.bot_metrics.error_message IS 'Error message for failed operations';
COMMENT ON COLUMN public.bot_metrics.response_time_ms IS 'Response time in milliseconds for performance tracking';
COMMENT ON COLUMN public.bot_metrics.metadata IS 'Additional context (intent type, frame type, etc.)';
COMMENT ON COLUMN public.bot_metrics.created_at IS 'Timestamp when metric was recorded';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'bot_metrics table created successfully';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Integrate recordBotMetric() calls in app/api/neynar/webhook/route.ts';
  RAISE NOTICE '  2. Add health metrics display to components/admin/BotManagerPanel.tsx';
  RAISE NOTICE '  3. Set up monitoring alerts for degraded performance';
END $$;
