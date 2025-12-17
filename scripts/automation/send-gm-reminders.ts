#!/usr/bin/env tsx
import { config } from 'dotenv'

config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { randomUUID } from 'node:crypto'
import process from 'node:process'

import { getNeynarServerClient } from '@/lib/integrations/neynar-server'
import { isSupabaseConfigured } from '@/lib/supabase/edge'
import {
  listActiveNotificationTokens,
  recordGmReminderSent,
  refreshTokenMetadata,
  type MiniAppNotificationToken,
} from '@/lib/miniapp-notifications'
import { fetchUserByFid } from '@/lib/integrations/neynar'
import { fetchChainSnapshot, normalizeAddress, type ChainAggregation } from '@/lib/profile/profile-data'
import { getTimeUntilNextGM, hasGMToday } from '@/lib/contracts/gmeow-utils'

const DEFAULT_REMINDER_WINDOW_MINUTES = 180
const DEFAULT_MAX_NOTIFICATIONS = 100
const TARGET_URL = 'https://gmeowhq.art/Quest'

function hasNeynarCredentials(): boolean {
  return Boolean(
    process.env.NEYNAR_API_KEY ||
      process.env.NEYNAR_GLOBAL_API ||
      process.env.NEXT_PUBLIC_NEYNAR_API_KEY,
  )
}

type CliOptions = {
  dryRun: boolean
  reminderWindowMs: number
  maxNotifications: number
}

type ReminderCandidate = {
  token: MiniAppNotificationToken
  fid: number
  address: `0x${string}`
  timeLeftMs: number
  lastGm: number
  streak: number
  snapshot: ChainAggregation | null
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    dryRun: false,
    reminderWindowMs: DEFAULT_REMINDER_WINDOW_MINUTES * 60 * 1000,
    maxNotifications: DEFAULT_MAX_NOTIFICATIONS,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    switch (arg) {
      case '--dry-run':
      case '-n':
        options.dryRun = true
        break
      case '--window-minutes':
      case '--window': {
        const raw = args[i + 1]
        if (raw) {
          const minutes = Number(raw)
          if (Number.isFinite(minutes) && minutes > 0) {
            options.reminderWindowMs = minutes * 60 * 1000
            i += 1
          }
        }
        break
      }
      case '--max':
      case '--limit': {
        const raw = args[i + 1]
        if (raw) {
          const limit = Number(raw)
          if (Number.isFinite(limit) && limit > 0) {
            options.maxNotifications = Math.min(limit, 500)
            i += 1
          }
        }
        break
      }
      default:
        break
    }
  }

  return options
}

function describeDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${totalSeconds % 60}s`
}

function pickBestAddress(token: MiniAppNotificationToken, user: Awaited<ReturnType<typeof fetchUserByFid>> | null): `0x${string}` | null {
  const candidates: Array<unknown> = []
  if (token.wallet_address) candidates.push(token.wallet_address)
  if (user?.walletAddress) candidates.push(user.walletAddress)
  if (user?.custodyAddress) candidates.push(user.custodyAddress)
  if (Array.isArray(user?.verifications)) candidates.push(...user!.verifications)
  return candidates
    .map((value) => normalizeAddress(value))
    .find((value): value is `0x${string}` => Boolean(value)) ?? null
}

function shouldSkipReminder(token: MiniAppNotificationToken, lastGmMs: number): boolean {
  if (!token.last_gm_reference_at) return false
  const previousRef = Date.parse(token.last_gm_reference_at)
  if (!Number.isFinite(previousRef)) return false
  const lastGmTime = new Date(lastGmMs)
  return Math.abs(previousRef - lastGmTime.getTime()) < 60_000
}

function buildNotificationCopy(timeLeftMs: number, streak: number): { title: string; body: string } {
  const title = '⏰ GM streak check-in'
  const duration = describeDuration(timeLeftMs)
  const bodyParts = [`${duration} until your streak resets.`]
  if (streak > 1) {
    bodyParts.push(`Current streak: ${streak}`)
  }
  bodyParts.push('Log today’s GM to stay alive!')
  const body = bodyParts.join(' ')
  return { title, body }
}

async function resolveUserSnapshot(fid: number, address: `0x${string}`): Promise<ChainAggregation | null> {
  try {
    return await fetchChainSnapshot('base', address)
  } catch (error) {
    console.warn(`[gm-reminder] Failed to fetch snapshot for fid ${fid}`, error)
    return null
  }
}

async function buildReminderCandidates(tokens: MiniAppNotificationToken[], options: CliOptions): Promise<ReminderCandidate[]> {
  const candidates: ReminderCandidate[] = []
  for (const token of tokens) {
    const fid = Number(token.fid)
    if (!Number.isFinite(fid) || fid <= 0) {
      continue
    }

    const user = await fetchUserByFid(fid).catch((error) => {
      console.warn(`[gm-reminder] Failed to fetch user for fid ${fid}`, error)
      return null
    })

    const address = pickBestAddress(token, user)
    if (!address) {
      console.warn(`[gm-reminder] Missing wallet address for fid ${fid}; skipping`)
      continue
    }

    const snapshot = await resolveUserSnapshot(fid, address)
    const lastGm = snapshot?.summary?.lastGM
    const streak = snapshot?.summary?.streak ?? 0

    if (!lastGm) {
      continue
    }

    if (hasGMToday(lastGm)) {
      continue
    }

    if (shouldSkipReminder(token, lastGm)) {
      continue
    }

    const lastGmSeconds = Math.floor(lastGm / 1000)
    const timeLeftMs = getTimeUntilNextGM(lastGmSeconds)

    if (timeLeftMs <= 0 || timeLeftMs > options.reminderWindowMs) {
      continue
    }

    candidates.push({ token, fid, address, timeLeftMs, lastGm, streak, snapshot })

    if (candidates.length >= options.maxNotifications) {
      break
    }
  }

  return candidates
}

async function sendReminder(client: ReturnType<typeof getNeynarServerClient>, candidate: ReminderCandidate, dryRun: boolean) {
  const { token, fid, timeLeftMs, streak, lastGm } = candidate
  const { title, body } = buildNotificationCopy(timeLeftMs, streak)
  const uuid = randomUUID()

  if (dryRun) {
    console.log(`[dry-run] Would notify fid=${fid} streak=${streak} timeLeft=${describeDuration(timeLeftMs)} title="${title}" body="${body}"`)
    return
  }

  await client.publishFrameNotifications({
    targetFids: [fid],
    notification: {
      title,
      body,
      target_url: TARGET_URL,
      uuid,
    },
  })

  if (isSupabaseConfigured()) {
    await recordGmReminderSent({
      fid,
      token: token.token,
      reminderAt: new Date(),
      gmReferenceAt: new Date(lastGm),
      context: {
        uuid,
        streak,
        timeLeftMs,
      },
    })
  }
}

async function updateTokenMetadataIfNeeded(candidate: ReminderCandidate) {
  if (!isSupabaseConfigured()) return
  try {
    await refreshTokenMetadata(candidate.token.token, {
      wallet_address: candidate.address,
    })
  } catch (error) {
    console.warn(`[gm-reminder] Failed to refresh metadata for fid ${candidate.fid}`, error)
  }
}

async function main() {
  const options = parseArgs()

  if (!isSupabaseConfigured()) {
    console.warn('[gm-reminder] Supabase is not configured; reminders will be skipped')
    return
  }

  if (!hasNeynarCredentials()) {
    console.warn('[gm-reminder] Neynar API credentials are not configured; reminders will be skipped')
    return
  }

  let client: ReturnType<typeof getNeynarServerClient>
  try {
    client = getNeynarServerClient()
  } catch (error) {
    console.error('[gm-reminder] Failed to initialize Neynar client', error)
    process.exit(1)
    return
  }

  const tokens = await listActiveNotificationTokens(options.maxNotifications * 2)
  if (!tokens.length) {
    console.log('[gm-reminder] No active notification tokens found')
    return
  }

  const candidates = await buildReminderCandidates(tokens, options)

  if (!candidates.length) {
    console.log('[gm-reminder] No candidates matched the reminder window')
    return
  }

  console.log(`[gm-reminder] Processing ${candidates.length} candidate(s). Dry run: ${options.dryRun}`)

  for (const candidate of candidates) {
    await updateTokenMetadataIfNeeded(candidate)
    try {
      await sendReminder(client, candidate, options.dryRun)
    } catch (error) {
      console.error(`[gm-reminder] Failed to send reminder to fid ${candidate.fid}`, error)
    }
  }

  console.log('[gm-reminder] Completed reminder run')
}

main().catch((error) => {
  console.error('[gm-reminder] Fatal error', error)
  process.exit(1)
})
