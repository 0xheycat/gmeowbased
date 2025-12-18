/**
 * @file lib/notifications/miniapp.ts
 * @description Farcaster MiniApp notification token management for push notifications
 * 
 * PHASE: Phase 7.7 - Notifications Module (December 18, 2025)
 * 
 * FEATURES:
 *   - Upsert notification tokens (register/update user tokens)
 *   - Mark tokens as disabled/removed (opt-out management)
 *   - Record GM reminder tracking (last_gm_reminder_sent_at)
 *   - List active notification tokens (enabled status only)
 *   - Refresh token metadata (context updates)
 *   - Track last event and event timestamps (audit trail)
 *   - Support wallet address and client FID association
 *   - GM context storage (JSONB for flexibility)
 *   - Automatic status management (enabled/disabled/removed)
 *   - Silent error tracking in production
 * 
 * REFERENCE DOCUMENTATION:
 *   - Database Schema: miniapp_notification_tokens table (types/supabase.ts)
 *   - Neynar Docs: https://docs.neynar.com/docs/send-notifications-to-mini-app-users
 *   - API Reference: https://docs.neynar.com/reference/publish-frame-notifications
 *   - Viral Dispatcher: lib/notifications/viral.ts
 *   - Error Tracking: lib/notifications/error-tracking.ts
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (for wallet address tracking)
 *   - NO EMOJIS in production code
 *   - Supabase client must be configured (isSupabaseConfigured check)
 *   - Token format: UUID from Neynar MiniApp API
 *   - Notification URL format: Warpcast deep link (farcaster://...)
 * 
 * TODO:
 *   - [ ] Add token expiration policy (auto-disable after 90 days inactive)
 *   - [ ] Implement token refresh mechanism (renew before expiry)
 *   - [ ] Add token analytics (usage stats, delivery rates)
 *   - [ ] Support multiple tokens per user (multi-device)
 *   - [ ] Implement token migration (upgrade old tokens)
 *   - [ ] Add token validation (verify with Neynar API)
 *   - [ ] Support token tags (categories, preferences)
 *   - [ ] Add bulk token operations (disable all, refresh all)
 * 
 * CRITICAL:
 *   - Tokens are unique (upsert on conflict uses onConflict: 'token')
 *   - Status enum: 'enabled' | 'disabled' | 'removed' (case-sensitive)
 *   - last_gm_reference_at tracks user's last GM cast (not reminder sent time)
 *   - last_gm_reminder_sent_at tracks bot reminder dispatch time
 *   - last_gm_context stores reminder state (JSONB for flexibility)
 *   - Always use ensureSupabase() for client initialization
 *   - Use toIsoDate() for consistent timestamp formatting
 *   - Token status 'removed' means permanent opt-out (don't re-enable)
 * 
 * SUGGESTIONS:
 *   - Consider implementing token health checks (verify delivery)
 *   - Add token usage metrics (notifications sent, delivery rate)
 *   - Implement token rotation for security (refresh every 30 days)
 *   - Add token preference management (frequency, categories)
 *   - Support token groups (family, team, guild members)
 *   - Implement token failover (retry with backup notification URL)
 *   - Add token audit logging (track all status changes)
 *   - Support token export (user data portability)
 * 
 * AVOID:
 *   - ❌ DON'T re-enable tokens with status 'removed' (permanent opt-out)
 *   - ❌ DON'T store sensitive data in last_gm_context (use references)
 *   - ❌ DON'T bypass ensureSupabase() (causes inconsistent error handling)
 *   - ❌ DON'T use Date objects directly (use toIsoDate() for ISO strings)
 *   - ❌ DON'T allow tokens without fid (required for user identification)
 *   - ❌ DON'T expose notification_url to clients (internal routing only)
 *   - ❌ DON'T update last_seen_at on every operation (throttle to 1/hour)
 *   - ❌ DON'T forget to track event context (last_event, last_event_at)
 */

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/edge'
import { trackError } from './error-tracking'
import type { Json } from '@/types/supabase'

const TABLE_NAME = 'miniapp_notification_tokens'

export type MiniAppNotificationStatus = 'enabled' | 'disabled' | 'removed'

export type MiniAppNotificationToken = {
  id: string
  fid: number
  token: string
  notification_url: string
  status: MiniAppNotificationStatus
  last_event: string | null
  last_event_at: string | null
  last_seen_at: string | null
  last_gm_reference_at: string | null
  last_gm_reminder_sent_at: string | null
  last_gm_context: Record<string, any> | null
  wallet_address: string | null
  client_fid: number | null
  created_at: string | null
  updated_at: string | null
}

export type UpsertNotificationTokenInput = {
  fid: number
  token: string
  notificationUrl: string
  status?: MiniAppNotificationStatus
  eventType?: string | null
  eventAt?: Date | string | null
  clientFid?: number | null
  walletAddress?: string | null
  context?: Record<string, unknown> | null
}

export type DisableNotificationTokenInput = {
  token?: string
  fid?: number
  status?: MiniAppNotificationStatus
  reason?: string | null
  eventAt?: Date | string | null
}

export type RecordReminderInput = {
  fid: number
  token: string
  reminderAt: Date
  gmReferenceAt: Date | null
  context?: Record<string, unknown> | null
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.toISOString()
}

function ensureSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured')
  }
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error('Failed to initialize Supabase client')
  }
  return client
}

export async function upsertNotificationToken(input: UpsertNotificationTokenInput): Promise<boolean> {
  if (!input?.fid || !input?.token || !input?.notificationUrl) {
    return false
  }

  const client = ensureSupabase()
  const nowIso = new Date().toISOString()
  const payload = {
    fid: input.fid,
    token: input.token,
    notification_url: input.notificationUrl,
    status: input.status ?? 'enabled',
    last_event: input.eventType ?? null,
    last_event_at: toIsoDate(input.eventAt) ?? nowIso,
    last_seen_at: nowIso,
    client_fid: input.clientFid ?? null,
    wallet_address: input.walletAddress ?? null,
    last_gm_context: (input.context ?? null) as Json,
  }

  const response = await client
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'token' })
    .eq('token', input.token)
    .select('id')
    .maybeSingle()

  if (response.error) {
    trackError('miniapp_notification_upsert_failed', response.error as Error, {
      function: 'upsertNotificationToken',
      fid: input.fid,
    })
    return false
  }

  return !!response.data?.id
}

export async function markNotificationTokenDisabled(input: DisableNotificationTokenInput): Promise<boolean> {
  if (!input?.token && !input?.fid) return false

  const client = ensureSupabase()
  const nowIso = new Date().toISOString()
  const status: MiniAppNotificationStatus = input.status ?? 'disabled'

  const updatePayload = {
    status,
    last_event: input.reason ?? 'disabled',
    last_event_at: toIsoDate(input.eventAt) ?? nowIso,
    last_seen_at: nowIso,
  }

  const query = client.from(TABLE_NAME).update(updatePayload)
  if (input.token) {
    query.eq('token', input.token)
  }
  if (input.fid) {
    query.eq('fid', input.fid)
  }

  const { error } = await query
  if (error) {
    trackError('miniapp_notification_disable_failed', error as Error, {
      function: 'markNotificationTokenDisabled',
      fid: input.fid,
    })
    return false
  }

  return true
}

export async function recordGmReminderSent(input: RecordReminderInput): Promise<boolean> {
  if (!input?.token || !input?.fid) return false

  const client = ensureSupabase()
  const reminderIso = input.reminderAt.toISOString()
  const gmReferenceIso = input.gmReferenceAt ? input.gmReferenceAt.toISOString() : null

  const { error } = await client
    .from(TABLE_NAME)
    .update({
      last_gm_reminder_sent_at: reminderIso,
      last_gm_reference_at: gmReferenceIso,
      last_gm_context: (input.context ?? null) as any,
      last_seen_at: reminderIso,
    })
    .eq('token', input.token)
    .eq('fid', input.fid)

  if (error) {
    trackError('miniapp_notification_reminder_failed', error as Error, {
      function: 'recordGmReminderSent',
      fid: input.fid,
    })
    return false
  }

  return true
}

export async function listActiveNotificationTokens(limit = 500): Promise<MiniAppNotificationToken[]> {
  const client = ensureSupabase()

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('status', 'enabled')
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  if (error) {
    trackError('miniapp_notification_fetch_tokens_failed', error as Error, {
      function: 'listActiveNotificationTokens',
      limit,
    })
    return []
  }

  return Array.isArray(data) ? (data as MiniAppNotificationToken[]) : []
}

export async function refreshTokenMetadata(
  token: string,
  updates: Partial<Pick<MiniAppNotificationToken, 'wallet_address' | 'client_fid' | 'last_seen_at' | 'status'>>,
): Promise<boolean> {
  if (!token) return false
  const client = ensureSupabase()

  const { error } = await client
    .from(TABLE_NAME)
    .update({ ...updates, last_seen_at: updates.last_seen_at ?? new Date().toISOString() })
    .eq('token', token)

  if (error) {
    trackError('miniapp_notification_refresh_metadata_failed', error as Error, {
      function: 'refreshTokenMetadata',
      token: token.substring(0, 10),
    })
    return false
  }

  return true
}
