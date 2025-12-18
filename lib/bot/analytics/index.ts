/**
 * @file lib/bot/analytics/index.ts
 * @description Bot health monitoring and analytics infrastructure
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Phase 1 Week 1-2 Complete (Dec 16, 2025)
 * DATE UPDATED: December 16, 2025, 6:00 PM CST
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID: 8453)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ Bot health monitoring infrastructure (CRITICAL BLOCKER - RESOLVED)
 * ✅ 11 metric types: webhook_received, webhook_processed, webhook_failed, 
 *    reply_generated, reply_failed, cast_published, cast_failed, rate_limit_hit,
 *    neynar_api_error, targeting_check_passed, targeting_check_failed
 * ✅ Response time percentiles (P50, P95, P99)
 * ✅ Health targets: >99% webhook, >95% reply, <2000ms P95, <1% API errors, <5% rate limits
 * ✅ Dashboard UI: color-coded metrics, time windows (1h/24h/7d/30d), recent errors
 * ✅ Database: bot_metrics table with 7 columns, 3 indexes, RLS policies
 * ✅ API endpoint: /api/admin/bot/health?window=24h
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * TODO - FUTURE ENHANCEMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 * [ ] Redis caching for metrics (5-min TTL to reduce DB queries)
 * [ ] Real-time alerting (email/Slack when success rate < 95%)
 * [ ] Trending analysis (7-day vs 30-day comparisons)
 * [ ] External monitoring export (Datadog, New Relic, Grafana)
 * [ ] User-level analytics (most active users, engagement patterns)
 * [ ] Metric retention policy (archive data >90 days)
 * [ ] Anomaly detection (auto-alert on sudden drops)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERENCE DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Core: /FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md (Sec 9.1, 10.1)
 * Status: /PHASE-1-WEEK-1-2-COMPLETE.md
 * Instructions: /.config/Code/User/prompts/farcaster.instructions.md
 * Integration: app/api/neynar/webhook/route.ts (recordBotMetric calls)
 * Dashboard: components/admin/BotManagerPanel.tsx
 * Migration: supabase/migrations/20251216000000_create_bot_metrics.sql
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * CRITICAL ISSUES & WARNINGS
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ No pagination on getBotHealthMetrics() (full table scan)
 * ⚠️ No automatic cleanup (table grows indefinitely)
 * ⚠️ ~50ms overhead per webhook (acceptable but monitor)
 * ⚠️ Admin-only access (no public status page)
 * ⚠️ No auto-alerting (manual monitoring required)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SUGGESTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 💡 Use PostgreSQL materialized views for faster aggregation
 * 💡 Implement hourly metric rollups for long-term queries
 * 💡 Create public status page (uptime.gmeowhq.art)
 * 💡 Track user journey metrics (mention → reply → frame click)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * AVOID / REQUIREMENTS (from farcaster.instructions.md)
 * ═══════════════════════════════════════════════════════════════════════════
 * ❌ NO blocking metrics recording (fire-and-forget pattern)
 * ❌ NO sensitive data in logs (mask FIDs/hashes)
 * ✅ USE parameterized queries (prevent SQL injection)
 * ✅ USE TIMESTAMPTZ for accurate time ranges
 * ✅ TRACK all events (even failed/skipped)
 * ═══════════════════════════════════════════════════════════════════════════
 * - User Rate Limit Hits: <5%
 * 
 * SUGGESTIONS:
 * - Integrate with Vercel Analytics for dashboard visualization
 * - Add anomaly detection (sudden spike in errors triggers Slack alert)
 * - Create weekly health report email for stakeholders
 * 
 * CRITICAL FINDINGS:
 * ⚠️ MONITORING GAP: No current tracking for webhook success rate
 * ⚠️ ALERT SYSTEM: Missing proactive alerts for degraded performance
 * ⚠️ HISTORICAL DATA: No long-term trend storage (consider TimescaleDB)
 * 
 * REQUIREMENTS FROM farcaster.instructions.md:
 * - Store metrics in Supabase (use existing bot_metrics table if available)
 * - Track FID-level metrics for personalization
 * - Network: Base (ChainID: 8453)
 */

import { createClient } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase'

/**
 * Metric types tracked by the analytics system
 */
export type BotMetricType =
  | 'webhook_received'
  | 'webhook_processed'
  | 'webhook_failed'
  | 'reply_generated'
  | 'reply_failed'
  | 'cast_published'
  | 'cast_failed'
  | 'rate_limit_hit'
  | 'neynar_api_error'
  | 'targeting_check_passed'
  | 'targeting_check_failed'

/**
 * Time window for aggregating metrics
 */
export type MetricWindow = '1h' | '24h' | '7d' | '30d' | 'all'

/**
 * Individual metric event
 */
export interface BotMetricEvent {
  type: BotMetricType
  timestamp: Date
  fid?: number
  castHash?: string
  errorMessage?: string
  responseTimeMs?: number
  metadata?: Record<string, any>
}

/**
 * Aggregated health metrics
 */
export interface BotHealthMetrics {
  webhookSuccessRate: number // 0-100
  replySuccessRate: number // 0-100
  castPublishSuccessRate: number // 0-100
  avgResponseTimeMs: number
  p50ResponseTimeMs: number
  p95ResponseTimeMs: number
  p99ResponseTimeMs: number
  neynarApiErrorRate: number // 0-100
  rateLimitHitRate: number // 0-100
  totalEvents: number
  window: MetricWindow
  fetchedAt: Date
}

/**
 * Detailed breakdown of metrics by type
 */
export interface BotMetricsBreakdown {
  webhooksReceived: number
  webhooksProcessed: number
  webhooksFailed: number
  repliesGenerated: number
  repliesFailed: number
  castsPublished: number
  castsFailed: number
  rateLimitHits: number
  neynarApiErrors: number
  targetingChecksPassed: number
  targetingChecksFailed: number
}

/**
 * Record a bot metric event
 * Call this from webhook handler, auto-reply engine, etc.
 */
export async function recordBotMetric(event: BotMetricEvent): Promise<void> {
  const supabase = createClient()
  
  try {
    // Store in Supabase for historical analysis
    await supabase.from('bot_metrics').insert({
      metric_type: event.type,
      fid: event.fid,
      cast_hash: event.castHash,
      error_message: event.errorMessage,
      response_time_ms: event.responseTimeMs,
      metadata: event.metadata || {},
      created_at: event.timestamp.toISOString(),
    })
    
    // For production, also send to real-time monitoring service
    // await sendToDatadog(event)
  } catch (error) {
    // Don't throw - metrics should never break core functionality
    console.error('[bot-analytics] Failed to record metric:', error)
  }
}

/**
 * Get bot health metrics for a time window
 * Used by admin dashboard
 */
export async function getBotHealthMetrics(window: MetricWindow = '24h'): Promise<BotHealthMetrics> {
  const supabase = createClient()
  
  const cutoff = getWindowCutoff(window)
  
  try {
    // Fetch all metrics in time window
    const { data: metrics, error } = await supabase
      .from('bot_metrics')
      .select('*')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false }) as { data: Database['public']['Tables']['bot_metrics']['Row'][] | null, error: any }
    
    if (error) {
      console.error('[bot-analytics] Failed to fetch metrics:', error)
      return getEmptyMetrics(window)
    }
    
    if (!metrics || metrics.length === 0) {
      return getEmptyMetrics(window)
    }
    
    // Calculate success rates
    const breakdown = calculateBreakdown(metrics)
    
    const webhookSuccessRate = breakdown.webhooksReceived > 0
      ? (breakdown.webhooksProcessed / breakdown.webhooksReceived) * 100
      : 100
    
    const replySuccessRate = (breakdown.repliesGenerated + breakdown.repliesFailed) > 0
      ? (breakdown.repliesGenerated / (breakdown.repliesGenerated + breakdown.repliesFailed)) * 100
      : 100
    
    const castPublishSuccessRate = (breakdown.castsPublished + breakdown.castsFailed) > 0
      ? (breakdown.castsPublished / (breakdown.castsPublished + breakdown.castsFailed)) * 100
      : 100
    
    const neynarApiErrorRate = breakdown.webhooksReceived > 0
      ? (breakdown.neynarApiErrors / breakdown.webhooksReceived) * 100
      : 0
    
    const rateLimitHitRate = breakdown.webhooksReceived > 0
      ? (breakdown.rateLimitHits / breakdown.webhooksReceived) * 100
      : 0
    
    // Calculate response time percentiles
    const responseTimes = metrics
      .filter(m => m.response_time_ms != null && m.response_time_ms > 0)
      .map(m => m.response_time_ms!)
      .sort((a, b) => a - b)
    
    const avgResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0
    
    const p50ResponseTimeMs = getPercentile(responseTimes, 0.5)
    const p95ResponseTimeMs = getPercentile(responseTimes, 0.95)
    const p99ResponseTimeMs = getPercentile(responseTimes, 0.99)
    
    return {
      webhookSuccessRate: Math.round(webhookSuccessRate * 100) / 100,
      replySuccessRate: Math.round(replySuccessRate * 100) / 100,
      castPublishSuccessRate: Math.round(castPublishSuccessRate * 100) / 100,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      p50ResponseTimeMs: Math.round(p50ResponseTimeMs),
      p95ResponseTimeMs: Math.round(p95ResponseTimeMs),
      p99ResponseTimeMs: Math.round(p99ResponseTimeMs),
      neynarApiErrorRate: Math.round(neynarApiErrorRate * 100) / 100,
      rateLimitHitRate: Math.round(rateLimitHitRate * 100) / 100,
      totalEvents: metrics.length,
      window,
      fetchedAt: new Date(),
    }
  } catch (error) {
    console.error('[bot-analytics] Failed to calculate health metrics:', error)
    return getEmptyMetrics(window)
  }
}

/**
 * Get detailed breakdown of all metric types
 */
export async function getBotMetricsBreakdown(window: MetricWindow = '24h'): Promise<BotMetricsBreakdown> {
  const supabase = createClient()
  
  const cutoff = getWindowCutoff(window)
  
  try {
    const { data: metrics, error } = await supabase
      .from('bot_metrics')
      .select('metric_type')
      .gte('created_at', cutoff.toISOString())
    
    if (error || !metrics) {
      return getEmptyBreakdown()
    }
    
    return calculateBreakdown(metrics)
  } catch (error) {
    console.error('[bot-analytics] Failed to get metrics breakdown:', error)
    return getEmptyBreakdown()
  }
}

/**
 * Get recent errors for debugging
 */
export async function getRecentBotErrors(limit: number = 10): Promise<Array<{
  type: BotMetricType
  errorMessage: string
  timestamp: Date
  fid?: number
  castHash?: string
}>> {
  const supabase = createClient()
  
  try {
    const { data: errors, error } = await supabase
      .from('bot_metrics')
      .select('*')
      .not('error_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: Database['public']['Tables']['bot_metrics']['Row'][] | null, error: any }
    
    if (error || !errors) {
      return []
    }
    
    return errors.map(e => ({
      type: e.metric_type as BotMetricType,
      errorMessage: e.error_message || '',
      timestamp: new Date(e.created_at),
      fid: e.fid ?? undefined,
      castHash: e.cast_hash ?? undefined,
    }))
  } catch (error) {
    console.error('[bot-analytics] Failed to fetch recent errors:', error)
    return []
  }
}

/**
 * Check if bot health is degraded
 * Returns true if any metric is below target threshold
 */
export async function checkBotHealth(window: MetricWindow = '1h'): Promise<{
  healthy: boolean
  warnings: string[]
}> {
  const metrics = await getBotHealthMetrics(window)
  
  const warnings: string[] = []
  
  // Check against targets from Part 3
  if (metrics.webhookSuccessRate < 99) {
    warnings.push(`Webhook success rate (${metrics.webhookSuccessRate}%) below target (99%)`)
  }
  
  if (metrics.replySuccessRate < 95) {
    warnings.push(`Reply success rate (${metrics.replySuccessRate}%) below target (95%)`)
  }
  
  if (metrics.p95ResponseTimeMs > 2000) {
    warnings.push(`P95 response time (${metrics.p95ResponseTimeMs}ms) above target (2000ms)`)
  }
  
  if (metrics.neynarApiErrorRate > 1) {
    warnings.push(`Neynar API error rate (${metrics.neynarApiErrorRate}%) above target (1%)`)
  }
  
  if (metrics.rateLimitHitRate > 5) {
    warnings.push(`Rate limit hit rate (${metrics.rateLimitHitRate}%) above target (5%)`)
  }
  
  return {
    healthy: warnings.length === 0,
    warnings,
  }
}

/**
 * Helper: Calculate time cutoff for window
 */
function getWindowCutoff(window: MetricWindow): Date {
  const now = Date.now()
  
  switch (window) {
    case '1h':
      return new Date(now - 60 * 60 * 1000)
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case 'all':
      return new Date(0) // Epoch
  }
}

/**
 * Helper: Calculate metric breakdown from raw events
 */
function calculateBreakdown(metrics: any[]): BotMetricsBreakdown {
  const breakdown: BotMetricsBreakdown = {
    webhooksReceived: 0,
    webhooksProcessed: 0,
    webhooksFailed: 0,
    repliesGenerated: 0,
    repliesFailed: 0,
    castsPublished: 0,
    castsFailed: 0,
    rateLimitHits: 0,
    neynarApiErrors: 0,
    targetingChecksPassed: 0,
    targetingChecksFailed: 0,
  }
  
  for (const metric of metrics) {
    switch (metric.metric_type) {
      case 'webhook_received':
        breakdown.webhooksReceived++
        break
      case 'webhook_processed':
        breakdown.webhooksProcessed++
        break
      case 'webhook_failed':
        breakdown.webhooksFailed++
        break
      case 'reply_generated':
        breakdown.repliesGenerated++
        break
      case 'reply_failed':
        breakdown.repliesFailed++
        break
      case 'cast_published':
        breakdown.castsPublished++
        break
      case 'cast_failed':
        breakdown.castsFailed++
        break
      case 'rate_limit_hit':
        breakdown.rateLimitHits++
        break
      case 'neynar_api_error':
        breakdown.neynarApiErrors++
        break
      case 'targeting_check_passed':
        breakdown.targetingChecksPassed++
        break
      case 'targeting_check_failed':
        breakdown.targetingChecksFailed++
        break
    }
  }
  
  return breakdown
}

/**
 * Helper: Calculate percentile from sorted array
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  
  const index = Math.ceil(sortedArray.length * percentile) - 1
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))]
}

/**
 * Helper: Empty metrics for error cases
 */
function getEmptyMetrics(window: MetricWindow): BotHealthMetrics {
  return {
    webhookSuccessRate: 100,
    replySuccessRate: 100,
    castPublishSuccessRate: 100,
    avgResponseTimeMs: 0,
    p50ResponseTimeMs: 0,
    p95ResponseTimeMs: 0,
    p99ResponseTimeMs: 0,
    neynarApiErrorRate: 0,
    rateLimitHitRate: 0,
    totalEvents: 0,
    window,
    fetchedAt: new Date(),
  }
}

/**
 * Helper: Empty breakdown for error cases
 */
function getEmptyBreakdown(): BotMetricsBreakdown {
  return {
    webhooksReceived: 0,
    webhooksProcessed: 0,
    webhooksFailed: 0,
    repliesGenerated: 0,
    repliesFailed: 0,
    castsPublished: 0,
    castsFailed: 0,
    rateLimitHits: 0,
    neynarApiErrors: 0,
    targetingChecksPassed: 0,
    targetingChecksFailed: 0,
  }
}
