import { NeynarAPIClient } from "@neynar/nodejs-sdk"
import { ethers } from "ethers"
import { createHash } from "crypto"
import dotenv from "dotenv"
import { CHAIN_IDS, CONTRACT_ADDRESSES } from "@/lib/gmeow-utils"
import type { ChainKey } from "@/lib/gmeow-utils"
import { computeBotUserStats, type BotUserStats } from "@/lib/bot-stats"
import { loadBotStatsConfig } from "@/lib/bot-config"
import type { BotStatsConfig } from "@/lib/bot-config-types"
import { DEFAULT_BOT_STATS_CONFIG } from "@/lib/bot-config-types"
import { recordRankEvent } from "@/lib/telemetry"
import { resolveBotSignerUuid } from "@/lib/neynar-bot"
import { normalizeAddress } from "@/lib/profile-data"
dotenv.config()

const neynar = new NeynarAPIClient({ apiKey: process.env.NEXT_PUBLIC_NEYNAR_GLOBAL_API! } as any)
const oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY!)
const botSignerUuid = resolveBotSignerUuid()

const processedCastHashes = new Set<string>()
const processedCastQueue: string[] = []
const MINUTE_MS = 60 * 1000
const STAT_POLL_BASE_DELAY_MS = 750
const STAT_POLL_ATTEMPTS = 4

type StatsMemory = {
  lastRespondedAt: number
  lastFingerprint: string | null
  lastCastHash: string | null
  lastVariant: string | null
  lastTotalPoints: number | null
}

const userStatsMemory = new Map<number, StatsMemory>()

// @edit-start 2025-02-14 — Rank telemetry helpers
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchStatsWithBackoff(address: string, previousTotal: number | null) {
  let latest: BotUserStats | null = null
  for (let attempt = 0; attempt < STAT_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      const jitter = Math.floor(Math.random() * 200)
      await sleep(STAT_POLL_BASE_DELAY_MS * attempt + jitter)
    }
    try {
      latest = await computeBotUserStats(address)
    } catch (error) {
      console.warn('[bot] stats poll failed', (error as Error)?.message || error)
      latest = null
    }
    if (latest && (previousTotal == null || latest.totalPoints !== previousTotal)) {
      return { stats: latest, attempts: attempt + 1 }
    }
  }
  return { stats: latest, attempts: STAT_POLL_ATTEMPTS }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function maskAddress(address: string): string {
  const normalized = normalizeAddress(address)
  if (!normalized) return address
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`
}
// @edit-end

function rememberCast(hash: string) {
  if (!hash) return
  if (processedCastHashes.has(hash)) return
  processedCastHashes.add(hash)
  processedCastQueue.push(hash)
  if (processedCastQueue.length > 512) {
    const oldest = processedCastQueue.shift()
    if (oldest) processedCastHashes.delete(oldest)
  }
}

type StatsTriggerEvaluation = {
  shouldRespond: boolean
  normalizedText: string
  fingerprint: string | null
}

function normaliseCastText(textRaw: unknown): string {
  if (typeof textRaw !== 'string') return ''
  return textRaw.replace(/\s+/g, ' ').trim()
}

function computeTextFingerprint(text: string): string | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null
  return createHash('sha1').update(normalized).digest('hex')
}

function evaluateStatsTrigger(cast: any, config: BotStatsConfig): StatsTriggerEvaluation {
  const normalizedText = normaliseCastText(cast?.text)
  if (!normalizedText) {
    return { shouldRespond: false, normalizedText: '', fingerprint: null }
  }

  const lower = normalizedText.toLowerCase()
  const mentionCandidates: string[] = []

  if (Array.isArray(cast?.mentions)) {
    for (const mention of cast.mentions) {
      if (mention && typeof mention.toString === 'function') {
        const value = String(mention).toLowerCase()
        if (value) mentionCandidates.push(value.startsWith('@') ? value : `@${value}`)
      }
    }
  }

  if (Array.isArray(cast?.mentioned_profiles)) {
    for (const profile of cast.mentioned_profiles) {
      const username = typeof profile?.username === 'string' ? profile.username.toLowerCase() : null
      if (username) mentionCandidates.push(`@${username}`)
    }
  }

  const mentionMatched = config.mentionMatchers.some((matcher) => {
    const normalizedMatcher = matcher.toLowerCase()
    if (!normalizedMatcher) return false
    if (lower.includes(normalizedMatcher)) return true
    return mentionCandidates.some((candidate) => candidate === normalizedMatcher)
  })

  if (!mentionMatched) {
    return { shouldRespond: false, normalizedText, fingerprint: computeTextFingerprint(lower) }
  }

  const keywordMatched = config.signalKeywords.some((keyword) => keyword && lower.includes(keyword))
  if (!keywordMatched) {
    return { shouldRespond: false, normalizedText, fingerprint: computeTextFingerprint(lower) }
  }

  const trimmedLower = lower.trim()
  const hasQuestionMark = trimmedLower.includes('?')
  const hasQuestionStarter = config.questionStarters.some((starter) => {
    if (!starter) return false
    const normalizedStarter = starter.toLowerCase()
    return trimmedLower.startsWith(`${normalizedStarter} `) || trimmedLower === normalizedStarter
  })

  if (config.requireQuestionMark && !hasQuestionMark) {
    return { shouldRespond: false, normalizedText, fingerprint: computeTextFingerprint(lower) }
  }

  if (!hasQuestionMark && config.questionStarters.length && !hasQuestionStarter) {
    return { shouldRespond: false, normalizedText, fingerprint: computeTextFingerprint(lower) }
  }

  return {
    shouldRespond: true,
    normalizedText,
    fingerprint: computeTextFingerprint(lower),
  }
}

// Contracts and chain IDs are selected dynamically per cast content
// CONTRACT_ADDRESSES and CHAIN_IDS come from lib/gm-utils

// Listen for new casts (polling or webhook)
async function checkNewCasts() {
  let config: BotStatsConfig = DEFAULT_BOT_STATS_CONFIG
  try {
    config = await loadBotStatsConfig()
  } catch (error) {
    console.warn('[bot] Failed to load bot stats config, using defaults:', (error as Error)?.message || error)
  }

  const feed =
    (await (neynar as any).fetchFeed?.({ feed_type: "global_trending", limit: 25 })) ??
    (await (neynar as any).v2?.feed?.fetch?.({ feed_type: "global_trending", limit: 25 }))
  if (!feed?.casts?.length) return

  for (const cast of feed.casts) {
    const castHash: string = cast.hash || cast.hash_v1 || cast.id || ""
    if (castHash && processedCastHashes.has(castHash)) continue

    const text = typeof cast.text === "string" ? cast.text : ""
    const trigger = evaluateStatsTrigger(cast, config)
    if (trigger.shouldRespond) {
      rememberCast(castHash)
      await handleStatsRequest(cast, config, trigger)
      continue
    }

    if (!text.includes("#gmeowquest")) {
      rememberCast(castHash)
      continue
    }

    // @edit-start 2025-02-14 — Quest verification telemetry bridge
    const fid = Number(cast?.author?.fid ?? 0)
    const userAddr = await lookupAddress(fid)
    const ref = extractQuestRef(String(cast.text || ''))
    if (!ref) {
      rememberCast(castHash)
      continue
    }

    const address = userAddr ? normalizeAddress(userAddr) : null
    if (!address) {
      rememberCast(castHash)
      continue
    }

    const { chain, id: questId } = ref
    const chainId = CHAIN_IDS[chain]
    if (!chainId) {
      rememberCast(castHash)
      continue
    }

    const initialStats = await computeBotUserStats(address).catch((error) => {
      console.warn('[bot] failed to fetch baseline stats', (error as Error)?.message || error)
      return null
    })
    const previousTotal = initialStats?.totalPoints ?? null

    const CONTRACT = CONTRACT_ADDRESSES[chain]

    const isValid = await verifyQuestCondition(fid, questId, cast)
    if (!isValid) {
      rememberCast(castHash)
      continue
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600
    const nonceSeed = `${cast.hash || cast.hash_v1 || cast.id || ''}:${fid}:${questId}:${chain}`
    const nonceHex = createHash('sha256').update(nonceSeed).digest('hex').slice(0, 12)
    const nonce = Number.parseInt(nonceHex, 16)
    const actionU8 = Math.max(0, Math.min(255, 1))

    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256","address","uint256","address","uint256","uint8","uint256","uint256"],
      [
        BigInt(chainId),
        CONTRACT,
        BigInt(questId),
        address,
        BigInt(fid),
        actionU8,
        BigInt(deadline),
        BigInt(nonce),
      ]
    )
    const digest = ethers.keccak256(encoded)
    const sig = await oracleWallet.signMessage(ethers.getBytes(digest))

    const response = await fetch(`${process.env.API_URL}/api/quests/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chain,
        questId: Number(questId),
        user: address,
        fid: Number(fid),
        action: actionU8,
        deadline: Number(deadline),
        nonce: Number(nonce),
        sig,
      }),
    })

    let responseBody: any = null
    try {
      responseBody = await response.json()
    } catch (error) {
      console.warn('[bot] quest verify response parse failed', (error as Error)?.message || error)
    }

    if (!response.ok || responseBody?.ok === false) {
      console.warn('[bot] quest verification failed', {
        status: response.status,
        reason: responseBody?.reason ?? response.statusText,
      })
      rememberCast(castHash)
      continue
    }

    const { stats: updatedStats, attempts: pollAttempts } = await fetchStatsWithBackoff(address, previousTotal)
    const resolvedStats = updatedStats ?? initialStats

    if (!resolvedStats) {
      rememberCast(castHash)
      continue
    }

    const totalPoints = resolvedStats.totalPoints
    let deltaPoints = previousTotal != null ? totalPoints - previousTotal : 0

    const candidateDeltas = [responseBody?.delta, responseBody?.rewardPoints, responseBody?.points]
    for (const candidate of candidateDeltas) {
      if (deltaPoints > 0) break
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        deltaPoints = Math.round(candidate)
      }
    }

    if (!Number.isFinite(deltaPoints)) {
      deltaPoints = 0
    }

    deltaPoints = Math.max(0, Math.round(deltaPoints))
    const tierPercent = typeof resolvedStats.tierPercent === 'number'
      ? Math.max(0, Math.min(100, resolvedStats.tierPercent))
      : 0

    const metadata: Record<string, unknown> = {
      source: 'bot-quest-verify',
      castHash,
      castText: typeof cast?.text === 'string' ? cast.text : null,
      questId: Number(questId) || null,
      chain,
      pollAttempts,
      verifiedReason: responseBody?.verifiedReason ?? null,
      apiDurationMs: responseBody?.durationMs ?? null,
      sigIssued: Boolean(responseBody?.sig),
    }

    for (const key of Object.keys(metadata)) {
      const value = metadata[key]
      if (value === undefined || value === null || value === '') delete metadata[key]
    }

    try {
      await recordRankEvent({
        event: 'quest-verify',
        chain,
        walletAddress: address,
        fid: fid > 0 ? fid : null,
        questId: Number(questId) > 0 ? Number(questId) : null,
        delta: Math.round(deltaPoints),
        totalPoints,
        previousTotal,
        level: resolvedStats.level,
        tierName: resolvedStats.tierName,
        tierPercent,
        metadata: Object.keys(metadata).length ? metadata : null,
      })
    } catch (error) {
      console.warn('[bot] failed to record quest telemetry', (error as Error)?.message || error)
    }


    rememberCast(castHash)
    // @edit-end
  }
}

async function handleStatsRequest(cast: any, config: BotStatsConfig, trigger: StatsTriggerEvaluation) {
  const fid = Number(cast?.author?.fid ?? 0)
  const handle = resolveCastHandle(cast)

  if (!fid) {
    await publishBotReply(
      cast,
      `${handle}, I need a verifiable Farcaster profile before I can run diagnostics. Link your identity and try again. 🐾`
    )
    return
  }

  const now = Date.now()
  const castHash: string | null = cast?.hash || cast?.hash_v1 || cast?.id || null
  const fingerprint = trigger.fingerprint ?? computeTextFingerprint(trigger.normalizedText)
  const state = userStatsMemory.get(fid) ?? {
    lastRespondedAt: 0,
    lastFingerprint: null,
    lastCastHash: null,
    lastVariant: null,
    lastTotalPoints: null,
  }

  const cooldownMs = Math.max(1, config.cooldownMinutes) * MINUTE_MS
  const repeatCooldownMs = Math.max(1, config.repeatCooldownMinutes) * MINUTE_MS

  if (state.lastFingerprint && fingerprint && state.lastFingerprint === fingerprint) {
    const elapsedMs = now - state.lastRespondedAt
    if (elapsedMs < repeatCooldownMs) {
      const remainingMinutes = Math.max(1, Math.ceil((repeatCooldownMs - elapsedMs) / MINUTE_MS))
      const minutesAgo = Math.max(0, Math.round(elapsedMs / MINUTE_MS))
      const reminder = buildRepeatReminderMessage(handle, minutesAgo, remainingMinutes)
      await publishBotReply(cast, reminder)
      userStatsMemory.set(fid, {
        ...state,
        lastRespondedAt: now,
        lastCastHash: castHash,
      })
      return
    }
  }

  if (state.lastRespondedAt > 0) {
    const elapsedSinceLast = now - state.lastRespondedAt
    if (elapsedSinceLast < cooldownMs) {
      const remainingMinutes = Math.max(1, Math.ceil((cooldownMs - elapsedSinceLast) / MINUTE_MS))
      const cooldownMessage = buildCooldownReminderMessage(handle, remainingMinutes)
      await publishBotReply(cast, cooldownMessage)
      userStatsMemory.set(fid, {
        ...state,
        lastRespondedAt: now,
        lastCastHash: castHash,
      })
      return
    }
  }

  let address = await lookupAddress(fid)
  address = address ? normalizeAddress(address) : null

  if (!address) {
    await publishBotReply(
      cast,
      `${handle}, I couldn't find a verified wallet on your profile yet. Link an address in Warpcast settings and tag @gmeowbased again so I can sync your ledger. 💫`
    )
    userStatsMemory.set(fid, {
      ...state,
      lastRespondedAt: now,
      lastCastHash: castHash,
    })
    return
  }

  const stats = await computeBotUserStats(address)
  if (!stats) {
    await publishBotReply(
      cast,
      `${handle}, telemetry hiccup. Give me a minute to realign the indexer and try again. 🛠️`
    )
    return
  }

  const variant = selectResponseVariant(config.responseVariants ?? DEFAULT_BOT_STATS_CONFIG.responseVariants, state.lastVariant)
  const rawDelta = state.lastTotalPoints != null ? stats.totalPoints - state.lastTotalPoints : null
  const deltaThreshold = Math.max(0, config.minDeltaPoints ?? DEFAULT_BOT_STATS_CONFIG.minDeltaPoints)
  let deltaPoints: number | null = null
  let minorDelta: StatsReplyOptions['minorDelta'] | undefined

  if (rawDelta != null) {
    if (rawDelta === 0) {
      deltaPoints = 0
    } else if (Math.abs(rawDelta) >= deltaThreshold) {
      deltaPoints = rawDelta
    } else {
      minorDelta = { value: rawDelta, threshold: deltaThreshold }
    }
  }

  const reply = buildStatsReply(handle, stats, { variant, deltaPoints, minorDelta })
  await publishBotReply(cast, reply)

  userStatsMemory.set(fid, {
    lastRespondedAt: now,
    lastFingerprint: fingerprint ?? state.lastFingerprint,
    lastCastHash: castHash,
    lastVariant: variant,
    lastTotalPoints: stats.totalPoints,
  })

  try {
    await recordRankEvent({
      event: 'stats-query',
      chain: stats.primaryChain,
      walletAddress: stats.address,
      fid,
      delta: 0,
      totalPoints: stats.totalPoints,
      previousTotal: state.lastTotalPoints ?? stats.totalPoints,
      level: stats.level,
      tierName: stats.tierName,
      tierPercent: Number.isFinite(stats.tierPercent) ? stats.tierPercent : 0,
      metadata: {
        source: 'bot-stats',
        castHash: cast?.hash ?? null,
        text: cast?.text ?? null,
        trigger: trigger.normalizedText,
        tips7d: stats.tips7d,
        tips14d: stats.tips14d,
        tips21d: stats.tips21d,
        tipsAll: stats.tipsAll,
        deltaPoints,
        deltaRaw: rawDelta,
        streak: stats.streak,
        chains: stats.registeredChains.map((chainSummary: BotUserStats['registeredChains'][number]) => ({
          chain: chainSummary.chain,
          totalPoints: chainSummary.totalPoints,
          streak: chainSummary.streak,
        })),
      },
    })
  } catch (error) {
    console.warn('[bot] failed to record stats telemetry', (error as Error)?.message || error)
  }
}

type StatsReplyOptions = {
  variant?: string | null
  deltaPoints?: number | null
  minorDelta?: { value: number; threshold: number }
}

function formatTipsValue(value: number | null): string {
  if (value == null) return 'n/a'
  if (!Number.isFinite(value)) return 'n/a'
  return value.toLocaleString()
}

function buildStatsReply(handle: string, stats: BotUserStats, options: StatsReplyOptions = {}) {
  const variant = options.variant?.trim().length ? options.variant : 'Signal sync complete'
  const levelPercent = Math.round(stats.levelPercent)
  const tierPercent = Math.round(stats.tierPercent)
  const totalPoints = stats.totalPoints.toLocaleString()
  const xpToNext = stats.xpToNextLevel.toLocaleString()
  const streakLabel = stats.streak > 0 ? `${stats.streak}-day GM streak` : 'No active GM streak yet'
  const deltaPoints = options.deltaPoints ?? null
  const deltaLabel = deltaPoints == null
    ? null
    : deltaPoints === 0
    ? 'No XP movement since last check'
    : `${deltaPoints > 0 ? '+' : ''}${deltaPoints.toLocaleString()} pts since last check`

  const chainsLabel = stats.registeredChains.length
    ? stats.registeredChains
        .filter((chainSummary) => chainSummary.registered && chainSummary.totalPoints > 0)
        .map((chainSummary: BotUserStats['registeredChains'][number]) => `${chainSummary.chain}: ${chainSummary.totalPoints.toLocaleString()} pts`)
        .slice(0, 3)
        .join(' · ')
    : 'No quests logged yet'

  const tipsLine = `• Tips (7d / 14d / 21d / all): ${formatTipsValue(stats.tips7d)} · ${formatTipsValue(stats.tips14d)} · ${formatTipsValue(stats.tips21d)} · ${formatTipsValue(stats.tipsAll)} pts`

  const lines = [
    `${variant} for ${handle} 🐾`,
    `• Rank: ${stats.tierName} · Level ${stats.level} (${levelPercent}% of level, ${tierPercent}% toward next tier)`,
    `• XP: ${totalPoints} pts total · ${xpToNext} pts to level ${stats.level + 1}`,
    tipsLine,
    `• ${streakLabel}`,
  ]

  if (deltaLabel) {
    lines.push(`• ${deltaLabel}`)
  } else if (options.minorDelta) {
    const minorValue = options.minorDelta.value
    const formatted = `${minorValue > 0 ? '+' : ''}${minorValue.toLocaleString()} pts`
    lines.push(`• Minor drift ${formatted}; waiting for ≥ ${options.minorDelta.threshold.toLocaleString()} pts to report a full update`)
  }

  if (chainsLabel) {
    lines.push(`• Chains: ${chainsLabel}`)
  }

  lines.push('📡 Tag @gmeowbased again once you bank new XP or tips and I will rerun the numbers.')

  return lines.join('\n')
}

function resolveCastHandle(cast: any): string {
  const username = typeof cast?.author?.username === 'string' ? cast.author.username.trim() : ''
  if (username) return `@${username.replace(/^@/, '')}`
  const displayName = typeof cast?.author?.display_name === 'string' ? cast.author.display_name.trim() : ''
  if (displayName) return displayName
  return 'friend'
}

function buildRepeatReminderMessage(handle: string, minutesAgo: number, remainingMinutes: number): string {
  const agoLabel = minutesAgo <= 0 ? 'just moments ago' : minutesAgo === 1 ? 'about a minute ago' : `${minutesAgo} minutes ago`
  const remainingLabel = remainingMinutes <= 1 ? 'about a minute' : `${remainingMinutes} minutes`
  return `${handle}, professor-mode reminder: I ran that exact query ${agoLabel}. Let the indexers breathe for ${remainingLabel} and then hit me with fresh input.`
}

function buildCooldownReminderMessage(handle: string, remainingMinutes: number): string {
  const remainingLabel = remainingMinutes <= 1 ? 'about a minute' : `${remainingMinutes} minutes`
  return `${handle}, I just synced your ledger. Give it ${remainingLabel} to accumulate new onchain signals before we re-run telemetry.`
}

function selectResponseVariant(variants: string[] | undefined | null, previous: string | null): string {
  if (!variants?.length) {
    return previous ?? 'Signal sync complete'
  }

  const sanitized = variants.map((variant) => variant.trim()).filter((variant) => variant.length > 0)
  if (!sanitized.length) {
    return previous ?? 'Signal sync complete'
  }

  const pool = previous ? sanitized.filter((variant) => variant !== previous) : sanitized
  const candidates = pool.length ? pool : sanitized
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}

async function publishBotReply(cast: any, message: string) {
  if (!botSignerUuid) {
    return
  }

  const parentHash = typeof cast?.hash === 'string' ? cast.hash : undefined
  const parentAuthorFid = Number.isFinite(Number(cast?.author?.fid)) ? Number(cast.author.fid) : undefined
  const idem = parentHash ? `gmeowstats:${parentHash}` : undefined

  try {
    const publish = (neynar as any).publishCast ?? (neynar as any).v2?.cast?.publish
    if (!publish) {
      return
    }

    await publish({
      signerUuid: botSignerUuid,
      text: message,
      parent: parentHash,
      parentAuthorFid,
      idem,
    })
  } catch (error) {
    console.error('[bot] Failed to publish stats reply', (error as Error)?.message || error)
  }
}

// Simulated: fetch user’s linked address
async function lookupAddress(fid: number): Promise<string | null> {
  const resp =
    (await (neynar as any).lookupUserByFid?.(fid)) ??
    (await (neynar as any).v2?.user?.lookup?.(fid))
  return (
    resp?.connected_address ??
    resp?.result?.user?.verified_addresses?.eth_addresses?.[0] ??
    null
  )
}

async function verifyQuestCondition(fid: number, questId: number, cast: any) {
  // You can add per-quest logic based on QuestType
  return cast.text.includes("gm") // placeholder
}

// Extract quest ref { chain, id } from text (supports multiple formats)
function extractQuestRef(text: string): { chain: ChainKey; id: number } | null {
  // 1) /Quest/[chain]/[id]
  const m1 = text.match(/\/Quest\/([a-z]+)\/(\d+)/i)
  if (m1?.[1] && m1?.[2]) {
    const chain = m1[1].toLowerCase() as ChainKey
    if (chain in CHAIN_IDS) return { chain, id: Number(m1[2]) }
  }
  // 2) /api/frame/quest?id=123&chain=base
  const m2id = text.match(/[?&]id=(\d+)/i)
  const m2ch = text.match(/[?&]chain=([a-z]+)/i)
  if (m2id?.[1]) {
    const chain = (m2ch?.[1]?.toLowerCase() as ChainKey) || 'base'
    if (chain in CHAIN_IDS) return { chain, id: Number(m2id[1]) }
  }
  // 3) Fallback pattern with default chain: "quest 123" or "quest:123"
  const m3 = text.match(/quest[\s:#-]*?(\d+)/i)
  if (m3?.[1]) return { chain: 'base', id: Number(m3[1]) }
  return null
}

// run every 2 min
setInterval(checkNewCasts, 2 * 60 * 1000)
