export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  parseUnits,
  parseEther,
  erc20Abi,
  erc721Abi,
  encodePacked,
  keccak256,
  toBytes,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
  GM_CONTRACT_ABI,
  QUEST_TYPES,
  QUEST_TYPES_BY_CODE,
  getQuestFieldConfig,
  normalizeQuestStruct,
  normalizeQuestTypeKey,
  type ChainKey,
} from '@/lib/gm-utils'
import { fetchFidByAddress, fetchFidByUsername, fetchUserByUsername } from '@/lib/neynar'

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                      */
/* -------------------------------------------------------------------------- */

const NEYNAR_BASE = 'https://api.neynar.com'
const NEYNAR_V2_INTERACTIONS = '/v2/farcaster/user/interactions/'
const RETRIES = 3
const RETRY_DELAY_MS = 450

const RPC_URLS: Partial<Record<ChainKey, string>> = {
  base: process.env.RPC_BASE || process.env.NEXT_PUBLIC_RPC_BASE,
  unichain: process.env.RPC_UNICHAIN || process.env.NEXT_PUBLIC_RPC_UNICHAIN,
  celo: process.env.RPC_CELO || process.env.NEXT_PUBLIC_RPC_CELO,
  ink: process.env.RPC_INK || process.env.NEXT_PUBLIC_RPC_INK,
  op: process.env.RPC_OP || process.env.NEXT_PUBLIC_RPC_OP,
}

const H = (m: string, s = 400) =>
  NextResponse.json({ ok: false, reason: m }, { status: s })

function isAddress(a: unknown): a is Address {
  return typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const SOCIAL_ACTION_CODES = new Set<number>([
  QUEST_TYPES.FARCASTER_FOLLOW,
  QUEST_TYPES.FARCASTER_RECAST,
  QUEST_TYPES.FARCASTER_REPLY,
  QUEST_TYPES.FARCASTER_LIKE,
  QUEST_TYPES.FARCASTER_CAST,
  QUEST_TYPES.FARCASTER_MENTION,
  QUEST_TYPES.FARCASTER_CHANNEL_POST,
  QUEST_TYPES.FARCASTER_FRAME_INTERACT,
  QUEST_TYPES.FARCASTER_VERIFIED_USER,
])

function sanitizeUsername(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/^@/, '').toLowerCase()
}

function safeNumber(value: unknown): number {
  if (typeof value === 'bigint') {
    const asNumber = Number(value)
    return Number.isFinite(asNumber) ? asNumber : 0
  }
  const asNumber = Number(value)
  return Number.isFinite(asNumber) ? asNumber : 0
}

function toBigIntSafe(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === 'string' && value.trim()) {
    try { return BigInt(value.trim()) } catch { return 0n }
  }
  return 0n
}

function pickCastIdentifier(meta: Record<string, any>): string {
  const candidates = [meta?.castIdentifier, meta?.castUrl, meta?.identifier, meta?.castHash]
  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim()) return cand.trim()
  }
  return ''
}

const USERNAME_KEY_HINT = /(username|handle|user|target|mention|profile|author|caster)/i
const FID_KEY_HINT = /(fid|target|user|follow|viewer|author)/i
const USERNAME_VALUE_REGEX = /^[a-z0-9_.-]{3,32}$/
const DIGIT_ONLY_REGEX = /^\d+$/

function collectCandidateData(
  value: any,
  hint: string,
  fidSet: Set<number>,
  usernameSet: Set<string>,
  visited?: Set<any>,
  depth = 0,
) {
  if (value === undefined || value === null || depth > 6) return
  const type = typeof value
  if (type === 'number' || type === 'bigint') {
    if (FID_KEY_HINT.test(hint)) {
      const num = safeNumber(value)
      if (num > 0) fidSet.add(num)
    }
    return
  }
  if (type === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return
    const digits = trimmed.replace(/[^\d]/g, '')
    if (digits.length >= 3 && digits.length <= 12 && (FID_KEY_HINT.test(hint) || DIGIT_ONLY_REGEX.test(trimmed))) {
      const num = Number(digits)
      if (Number.isFinite(num) && num > 0) fidSet.add(num)
    }
    const sanitized = sanitizeUsername(trimmed)
    if (
      sanitized &&
      !DIGIT_ONLY_REGEX.test(sanitized) &&
      USERNAME_VALUE_REGEX.test(sanitized) &&
      (trimmed.startsWith('@') || USERNAME_KEY_HINT.test(hint))
    ) {
      usernameSet.add(sanitized)
    }
    return
  }
  if (type !== 'object') return
  if (!visited) visited = new Set<any>()
  if (visited.has(value)) return
  visited.add(value)
  if (Array.isArray(value)) {
    for (const item of value) collectCandidateData(item, hint, fidSet, usernameSet, visited, depth + 1)
    return
  }
  for (const [key, val] of Object.entries(value)) {
    const lowerKey = key.toLowerCase()
    const nextHint = lowerKey || hint
    collectCandidateData(val, nextHint, fidSet, usernameSet, visited, depth + 1)
  }
}

type NormalizedCastDetails = {
  inputs: string[]
  identifier: string
  url: string
  hash: string
}

const CAST_HASH_REGEX = /0x[a-fA-F0-9]{8,128}/

function extractCastHash(value: string): string {
  const match = value.match(CAST_HASH_REGEX)
  return match ? match[0] : ''
}

function isCastHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{8,128}$/i.test(value.trim())
}

function normalizeCastUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^(?:www\.)?warpcast\.com\//i.test(trimmed)) return `https://${trimmed.replace(/^www\./i, '')}`
  if (/^(?:www\.)?farcaster\.xyz\//i.test(trimmed)) return `https://${trimmed.replace(/^www\./i, '')}`
  return ''
}

function extractUsernameFromUrl(value: string): string {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized) return ''
  try {
    const url = normalized.startsWith('http') ? new URL(normalized) : new URL(`https://${normalized}`)
    const host = url.hostname.toLowerCase()
    if (!host.includes('warpcast.com') && !host.includes('farcaster.xyz')) return ''
    const segments = url.pathname.split('/').filter(Boolean)
    if (!segments.length) return ''
    const username = segments[0]
    return sanitizeUsername(username)
  } catch {
    return ''
  }
}

function normalizeCastDetails(...rawInputs: Array<unknown>): NormalizedCastDetails {
  const inputs = new Set<string>()
  for (const raw of rawInputs) {
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed) inputs.add(trimmed)
    }
  }
  let url = ''
  let hash = ''
  const ordered = Array.from(inputs)
  for (const candidate of ordered) {
    if (!url) {
      const normalizedUrl = normalizeCastUrl(candidate)
      if (normalizedUrl) {
        url = normalizedUrl
        if (!hash) hash = extractCastHash(normalizedUrl)
      }
    }
    if (!hash) {
      const maybeHash = extractCastHash(candidate)
      if (maybeHash) hash = maybeHash
    }
    if (url && hash) break
  }
  if (!hash) {
    for (const candidate of ordered) {
      if (isCastHash(candidate)) {
        hash = candidate
        break
      }
    }
  }
  const identifier = hash || url || (ordered[0] ?? '')
  return { inputs: ordered, identifier, url, hash }
}

type CastLookupPlan = {
  identifiers: string[]
  preferredUrl: string
  hashCandidates: string[]
  usernameCandidates: string[]
}

function buildCastLookupPlan(params: {
  castDetails: NormalizedCastDetails
  meta: Record<string, any>
  requirement: QuestRequirementData
  questMeta?: Record<string, any>
  rawInputs?: Array<unknown>
}): CastLookupPlan {
  const { castDetails, meta, requirement, questMeta, rawInputs = [] } = params
  const usernameSet = new Set<string>()
  const hashSet = new Set<string>()
  const identifierKeySet = new Set<string>()
  const identifierValues: string[] = []

  const pushIdentifier = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (identifierKeySet.has(key)) return
    identifierKeySet.add(key)
    identifierValues.push(trimmed)
  }

  const addUsernameCandidate = (value: unknown) => {
    const sanitized = sanitizeUsername(value)
    if (sanitized && !DIGIT_ONLY_REGEX.test(sanitized)) usernameSet.add(sanitized)
  }

  const collectHashCandidate = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    if (isCastHash(trimmed)) {
      hashSet.add(trimmed)
      return
    }
    const extracted = extractCastHash(trimmed)
    if (extracted) hashSet.add(extracted)
  }

  const gatherFromUrl = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    const normalizedUrl = normalizeCastUrl(trimmed) || trimmed
    const username = extractUsernameFromUrl(normalizedUrl)
    if (username) usernameSet.add(username)
  }

  const identifierSources: Array<unknown> = [
    castDetails.url,
    castDetails.hash,
    castDetails.identifier,
    requirement.castIdentifier,
    meta?.castIdentifier,
    meta?.identifier,
    meta?.castUrl,
    meta?.castHash,
    questMeta?.castIdentifier,
    questMeta?.castUrl,
    questMeta?.castHash,
    ...(Array.isArray(rawInputs) ? rawInputs : []),
    ...(Array.isArray(castDetails.inputs) ? castDetails.inputs : []),
  ]

  for (const value of identifierSources) {
    pushIdentifier(value)
    collectHashCandidate(value)
    gatherFromUrl(value)
  }

  const usernameSources: Array<unknown> = [
    requirement.targetUsername,
    requirement.mentionUser,
    meta?.targetUsername,
    meta?.targetHandle,
    meta?.username,
    meta?.mentionUser,
    meta?.follow,
    ...(Array.isArray(meta?.candidateTargetUsernames) ? meta.candidateTargetUsernames : []),
    ...(Array.isArray(requirement.candidateUsernames) ? requirement.candidateUsernames : []),
  ]

  const extractFromFollow = (followMeta: any) => {
    if (!followMeta || typeof followMeta !== 'object') return
    addUsernameCandidate(followMeta.targetUsername)
    addUsernameCandidate(followMeta.username)
    addUsernameCandidate(followMeta.target)
  }

  for (const value of usernameSources) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      extractFromFollow(value)
      continue
    }
    addUsernameCandidate(value)
  }

  for (const identifier of identifierValues) gatherFromUrl(identifier)

  const hashCandidates = Array.from(hashSet)

  for (const username of Array.from(usernameSet)) {
    for (const hash of hashCandidates) {
      if (!hash) continue
      pushIdentifier(`https://farcaster.xyz/${username}/${hash}`)
      pushIdentifier(`https://warpcast.com/${username}/${hash}`)
    }
  }

  for (const hash of hashCandidates) pushIdentifier(hash)

  let preferredUrl = ''
  for (const value of identifierValues) {
    if (!preferredUrl && /^https?:\/\//i.test(value)) {
      preferredUrl = value
      break
    }
  }
  if (!preferredUrl && castDetails.url) preferredUrl = castDetails.url

  const identifiers = [...identifierValues]
  identifiers.sort((a, b) => {
    const aUrl = /^https?:\/\//i.test(a) ? 0 : 1
    const bUrl = /^https?:\/\//i.test(b) ? 0 : 1
    if (aUrl !== bUrl) return aUrl - bUrl
    return a.length - b.length
  })

  const limitedIdentifiers = identifiers.slice(0, 12)
  const limitedHashes = hashCandidates.slice(0, 6)
  const limitedUsernames = Array.from(usernameSet).slice(0, 6)

  return {
    identifiers: limitedIdentifiers,
    preferredUrl,
    hashCandidates: limitedHashes,
    usernameCandidates: limitedUsernames,
  }
}

function getCastText(candidate: any): string {
  if (!candidate || typeof candidate !== 'object') return ''
  const direct = [candidate.text, candidate.body, candidate.raw_text, candidate.rawText, candidate.content]
  for (const value of direct) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value && typeof value === 'object' && typeof value.text === 'string' && value.text.trim()) return value.text.trim()
  }
  if (candidate.cast && typeof candidate.cast === 'object') return getCastText(candidate.cast)
  return ''
}

function extractCastNodes(root: any): any[] {
  const results: any[] = []
  const seen = new Set<any>()
  const stack: any[] = [root]
  const pushUnique = (node: any) => {
    if (!node || typeof node !== 'object') return
    const hash = typeof node.hash === 'string' ? node.hash.toLowerCase() : ''
    if (hash) {
      if (!results.some((n) => typeof n?.hash === 'string' && n.hash.toLowerCase() === hash)) results.push(node)
    } else if (!results.includes(node)) {
      results.push(node)
    }
  }
  while (stack.length) {
    const current = stack.pop()
    if (!current || typeof current !== 'object') continue
    if (seen.has(current)) continue
    seen.add(current)
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }
    const looksLikeCast = current.object === 'cast' || typeof current.hash === 'string' || typeof current.parent_hash === 'string'
    if (looksLikeCast) pushUnique(current)
    for (const key of Object.keys(current)) stack.push(current[key])
  }
  return results
}

async function fetchViewerRepliesForCast(params: {
  viewerFid: number
  targetHash: string
  apiKey: string | undefined
  traces: any[]
}): Promise<any[]> {
  const { viewerFid, targetHash, apiKey, traces } = params
  if (!viewerFid || !targetHash || !apiKey) return []
  const normalizedHash = targetHash.toLowerCase()
  const paths = [
    `/v2/farcaster/cast/conversation?thread_hash=${encodeURIComponent(targetHash)}&viewer_fid=${viewerFid}`,
    `/v2/farcaster/cast/conversation?thread_hash=${encodeURIComponent(targetHash)}`,
    `/v2/farcaster/user/casts?fid=${viewerFid}&limit=50`,
    `/v2/user/casts?fid=${viewerFid}&limit=50`,
  ]
  const collected: any[] = []
  for (const path of paths) {
    const url = `${NEYNAR_BASE}${path}`
    const res = await neynarFetch(url, apiKey, 1, traces)
    if (!res.ok) continue
    const nodes = extractCastNodes(res.parsed)
    for (const cast of nodes) {
      const authorFid = Number(cast?.author?.fid || cast?.user?.fid || cast?.fid || 0)
      if (authorFid && authorFid !== viewerFid) continue
      const parent = String(cast?.parent_hash || cast?.parentHash || '').toLowerCase()
      const thread = String(cast?.thread_hash || cast?.threadHash || '').toLowerCase()
      if (parent === normalizedHash || thread === normalizedHash) {
        collected.push(cast)
      }
    }
    if (collected.length) break
  }
  return collected
}

type QuestRequirementData = {
  targetFid?: number
  targetUsername?: string
  mentionUser?: string
  castIdentifier?: string
  frameUrl?: string
  castContains?: string
  candidateUsernames?: string[]
  candidateFids?: number[]
}

function collectQuestRequirements(params: {
  questTypeKey: string
  questTarget: bigint | number | undefined
  meta: Record<string, any>
}): { ok: true; data: QuestRequirementData } | { ok: false; reason: string; status?: number } {
  const { questTypeKey, questTarget, meta } = params
  const normalizedKey = normalizeQuestTypeKey(questTypeKey)
  const fieldConfig = getQuestFieldConfig(normalizedKey)
  const questTargetNum = safeNumber(questTarget)
  const followMetaRaw = meta.follow
  const followMeta = typeof followMetaRaw === 'object' && followMetaRaw && !Array.isArray(followMetaRaw) ? followMetaRaw : {}
  const fidCandidates = new Set<number>()
  const usernameCandidates = new Set<string>()
  if (questTargetNum > 0) fidCandidates.add(questTargetNum)
  const rawFollowTarget = (followMeta as any)?.target ?? meta.target

  const initialTargetFidCandidates = [
    questTargetNum,
    safeNumber(meta.targetFid),
    safeNumber((followMeta as any)?.targetFid),
    safeNumber(meta.target),
  ].filter((n) => n > 0)
  let targetFid = initialTargetFidCandidates.length > 0 ? initialTargetFidCandidates[0] : 0

  let targetUsername = sanitizeUsername(
    (followMeta as any)?.targetUsername ??
      meta.targetUsername ??
      meta.targetHandle ??
      meta.username ??
      '',
  )

  if (!targetFid && typeof rawFollowTarget === 'string') {
    const digits = rawFollowTarget.replace(/[^0-9]/g, '')
    if (digits.length > 0) targetFid = Number(digits)
    if (!targetUsername) {
      const derivedUsername = sanitizeUsername(rawFollowTarget)
      if (derivedUsername) targetUsername = derivedUsername
    }
  } else if (!targetFid && typeof rawFollowTarget === 'number' && rawFollowTarget > 0) {
    targetFid = Number(rawFollowTarget)
  }

  if (targetFid > 0) fidCandidates.add(targetFid)
  if (targetUsername) usernameCandidates.add(targetUsername)

  collectCandidateData(meta.targetFid, 'targetfid', fidCandidates, usernameCandidates)
  collectCandidateData(meta.target, 'target', fidCandidates, usernameCandidates)
  collectCandidateData(meta.targetUser, 'targetuser', fidCandidates, usernameCandidates)
  collectCandidateData(meta.followTarget, 'followtarget', fidCandidates, usernameCandidates)
  collectCandidateData(followMetaRaw, 'follow', fidCandidates, usernameCandidates)
  if (Array.isArray(meta.requirements)) collectCandidateData(meta.requirements, 'requirements', fidCandidates, usernameCandidates)
  if (Array.isArray(meta.conditions)) collectCandidateData(meta.conditions, 'conditions', fidCandidates, usernameCandidates)
  if (Array.isArray(meta.rules)) collectCandidateData(meta.rules, 'rules', fidCandidates, usernameCandidates)
  if (typeof meta.requirement === 'object' && meta.requirement) collectCandidateData(meta.requirement, 'requirement', fidCandidates, usernameCandidates)

  if (!targetFid) {
    const candidate = Array.from(fidCandidates).find((n) => Number.isFinite(n) && n > 0)
    if (candidate) targetFid = candidate
  }

  if (!targetUsername) {
    const candidate = Array.from(usernameCandidates).find((u) => u && !DIGIT_ONLY_REGEX.test(u))
    if (candidate) targetUsername = candidate
  }

  const mentionCandidate = sanitizeUsername(meta.mentionUser ?? meta.mentionUsername)
  const mentionUserRaw = fieldConfig.mentionHandle === 'hidden' ? '' : mentionCandidate
  const castIdentifier = fieldConfig.castLink === 'hidden' ? '' : pickCastIdentifier(meta)
  const frameUrl = typeof meta.frameUrl === 'string' ? meta.frameUrl.trim() : ''
  const castContainsRaw = typeof meta.castContains === 'string' ? meta.castContains.trim() : ''

  if (fieldConfig.castText === 'hidden') {
    if ('castContains' in meta) delete meta.castContains
  } else if (castContainsRaw) {
    meta.castContains = castContainsRaw
  } else if ('castContains' in meta) {
    delete meta.castContains
  }

  const castContains = fieldConfig.castText === 'hidden' ? '' : castContainsRaw

  const requirement: QuestRequirementData = {}
  const candidateFidsArr = Array.from(fidCandidates).filter((n) => Number.isFinite(n) && n > 0)
  const candidateUsernamesArr = Array.from(usernameCandidates).filter((u) => u && !DIGIT_ONLY_REGEX.test(u))
  if (candidateFidsArr.length) requirement.candidateFids = candidateFidsArr
  if (candidateUsernamesArr.length) requirement.candidateUsernames = candidateUsernamesArr
  if (fieldConfig.followHandle === 'required' && !targetFid && !targetUsername) {
    return { ok: false, reason: 'quest_missing_follow_target', status: 422 }
  }
  if (fieldConfig.castLink === 'required' && !castIdentifier) {
    return { ok: false, reason: 'quest_missing_cast_identifier', status: 422 }
  }
  if (fieldConfig.frameUrl === 'required' && !frameUrl) {
    return { ok: false, reason: 'quest_missing_frame_url', status: 422 }
  }
  if (fieldConfig.mentionHandle === 'required') {
    const mentionUsername = mentionUserRaw || targetUsername
    if (!mentionUsername) {
      return { ok: false, reason: 'quest_missing_mention_username', status: 422 }
    }
  }
  if (fieldConfig.castText === 'required' && !castContains) {
    return { ok: false, reason: 'quest_missing_cast_text', status: 422 }
  }

  switch (normalizedKey) {
    case 'FARCASTER_FOLLOW':
      if (targetFid) requirement.targetFid = targetFid
      if (targetUsername) requirement.targetUsername = targetUsername
      break
    case 'FARCASTER_RECAST':
    case 'FARCASTER_LIKE':
    case 'FARCASTER_REPLY':
    case 'FARCASTER_CAST':
    case 'FARCASTER_CHANNEL_POST':
      if (castIdentifier) requirement.castIdentifier = castIdentifier
      if (targetFid) requirement.targetFid = targetFid
      if (targetUsername) requirement.targetUsername = targetUsername
      break
    case 'FARCASTER_MENTION': {
      const mentionUsername = mentionUserRaw || targetUsername
      if (castIdentifier) requirement.castIdentifier = castIdentifier
      if (mentionUsername) {
        requirement.mentionUser = mentionUserRaw || mentionUsername
        requirement.targetUsername = mentionUsername
      }
      if (targetFid) requirement.targetFid = targetFid
      break
    }
    case 'FARCASTER_FRAME_INTERACT':
      if (frameUrl) requirement.frameUrl = frameUrl
      break
    default:
      if (targetFid) requirement.targetFid = targetFid
      if (targetUsername) requirement.targetUsername = targetUsername
      if (castIdentifier) requirement.castIdentifier = castIdentifier
      if (mentionUserRaw) requirement.mentionUser = mentionUserRaw
      if (frameUrl && fieldConfig.frameUrl !== 'hidden') requirement.frameUrl = frameUrl
  }

  if (castContains && fieldConfig.castText !== 'hidden') {
    requirement.castContains = castContains
  }

  if (frameUrl && fieldConfig.frameUrl !== 'hidden' && !requirement.frameUrl) {
    requirement.frameUrl = frameUrl
  }

  if (mentionUserRaw && fieldConfig.mentionHandle !== 'hidden' && !requirement.mentionUser) {
    requirement.mentionUser = mentionUserRaw
  }

  return { ok: true, data: requirement }
}

/* -------------------------------------------------------------------------- */
/*                             SIGNING / HASHING                               */
/* -------------------------------------------------------------------------- */

function signQuest(params: {
  chainId: number
  contractAddr: `0x${string}`
  questId: number
  user: Address
  fid: number
  action: number // uint8
  deadline: number
  nonce: number
  account: ReturnType<typeof privateKeyToAccount>
}) {
  const { chainId, contractAddr, questId, user, fid, action, deadline, nonce, account } = params
  const actionU8 = Math.max(0, Math.min(255, Number(action) | 0))
  const hash = keccak256(
    encodePacked(
      ['uint256', 'address', 'uint256', 'address', 'uint256', 'uint8', 'uint256', 'uint256'],
      [BigInt(chainId), contractAddr, BigInt(questId), user, BigInt(fid), actionU8, BigInt(deadline), BigInt(nonce)],
    ),
  )
  // viem account.signMessage expects { raw: Uint8Array } style — toBytes provides that
  return account.signMessage({ message: { raw: toBytes(hash) } })
}

/* -------------------------------------------------------------------------- */
/*                              NEYNAR / HTTP HELPERS                           */
/* -------------------------------------------------------------------------- */

async function neynarFetch(
  url: string,
  apiKey: string | undefined,
  attempts = RETRIES,
  traces: any[] = [],
) {
  for (let i = 0; i < attempts; i++) {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (apiKey) headers['x-api-key'] = apiKey
      const res = await fetch(url, { method: 'GET', headers })
      const rawText = await res.text().catch(() => '')
      let parsed: any = null
      try {
        parsed = rawText ? JSON.parse(rawText) : null
      } catch {
        parsed = rawText
      }
      traces.push({ url, status: res.status, ok: res.ok, parsed, rawText })
      if (res.ok) return { ok: true, status: res.status, parsed, url, traces }
      // if 4xx and it's not auth/payment, return early; but we still attempt retries for 5xx
      if (res.status >= 500) await sleep(RETRY_DELAY_MS)
    } catch (e: any) {
      traces.push({ url, error: String(e?.message || e) })
      await sleep(RETRY_DELAY_MS)
    }
  }
  return { ok: false, traces }
}

/* -------------------------------------------------------------------------- */
/*                        NEYNAR: cast fetch fallback helper                    */
/* -------------------------------------------------------------------------- */

async function probeCastWithFallback(identifier: string, viewerFid: number, apiKey: string | undefined, traces: any[]) {
  // candidate paths (v2/v3 and variants) — keep them small and pragmatic
  const candidates = [
    `/v2/farcaster/cast?identifier=${encodeURIComponent(identifier)}&type=url&viewer_fid=${viewerFid}`,
    `/v2/farcaster/cast?identifier=${encodeURIComponent(identifier)}&type=url`,
    `/v2/farcaster/cast/lookup?identifier=${encodeURIComponent(identifier)}&type=url&viewer_fid=${viewerFid}`,
    `/v2/cast?identifier=${encodeURIComponent(identifier)}&type=url&viewer_fid=${viewerFid}`,
    `/v3/farcaster/cast?identifier=${encodeURIComponent(identifier)}&type=url&viewer_fid=${viewerFid}`,
    `/v3/cast?identifier=${encodeURIComponent(identifier)}&type=url&viewer_fid=${viewerFid}`,
    `/v2/farcaster/cast?identifier=${encodeURIComponent(identifier)}&type=hash&viewer_fid=${viewerFid}`,
  ]
  for (const p of candidates) {
    const url = `${NEYNAR_BASE}${p}`
    const r = await neynarFetch(url, apiKey, 1, traces)
    if (r.ok) return r
  }
  return { ok: false, traces }
}

/* -------------------------------------------------------------------------- */
/*                        NEYNAR: resolve username -> fid                      */
/* -------------------------------------------------------------------------- */

async function resolveUsernameToFid(username: string, apiKey: string | undefined, traces: any[]) {
  // try multiple v2 endpoints that Neynar historically exposed
  const candidates = [
    `/v2/farcaster/user-by-username?username=${encodeURIComponent(username)}`,
    `/v2/user/by-username?username=${encodeURIComponent(username)}`,
    `/v2/farcaster/user?username=${encodeURIComponent(username)}`,
    `/v2/user?username=${encodeURIComponent(username)}`,
    `/v3/farcaster/user/by-username?username=${encodeURIComponent(username)}`,
    `/v3/user/by-username?username=${encodeURIComponent(username)}`,
  ]
  for (const p of candidates) {
    const url = `${NEYNAR_BASE}${p}`
    const r = await neynarFetch(url, apiKey, 1, traces)
    if (r.ok) {
      const parsed = r.parsed
      // various shapes: parsed.result.user.fid, parsed.user.fid, parsed.data?.fid
      const fid = Number(parsed?.result?.user?.fid || parsed?.user?.fid || parsed?.fid || 0)
      if (fid && fid > 0) return { ok: true, fid, r }
      // sometimes Neynar returns a user object directly at parsed.user
      const altFid = Number(parsed?.user?.fid || 0)
      if (altFid > 0) return { ok: true, fid: altFid, r }
    } else {
      const { traces: _nestedTraces, ...rest } = (r && typeof r === 'object') ? r : {}
      traces.push({ try: p, res: rest })
    }
  }
  const fallbackFid = await fetchFidByUsername(username).catch(() => null)
  if (fallbackFid && fallbackFid > 0) {
    traces.push({ step: 'resolve-username-fallback', source: 'fetchFidByUsername', username, fid: fallbackFid })
    return { ok: true, fid: fallbackFid }
  }
  return { ok: false, traces }
}

async function resolveFollowTargetFid(params: {
  initialFid: number
  candidateFids: Array<number | string | bigint | null | undefined>
  candidateUsernames: Array<string | null | undefined>
  neynarKey: string | undefined
  traces: any[]
}): Promise<number> {
  const { initialFid, candidateFids, candidateUsernames, neynarKey, traces } = params
  if (initialFid && initialFid > 0) return initialFid

  const fidSet = new Set<number>()
  for (const cand of candidateFids || []) {
    if (cand === null || cand === undefined) continue
    if (typeof cand === 'number') {
      if (Number.isFinite(cand) && cand > 0) fidSet.add(Math.floor(cand))
      continue
    }
    if (typeof cand === 'bigint') {
      const val = Number(cand)
      if (Number.isFinite(val) && val > 0) fidSet.add(val)
      continue
    }
    if (typeof cand === 'string') {
      const trimmed = cand.trim()
      if (/^\d+$/.test(trimmed)) {
        const val = Number(trimmed)
        if (Number.isFinite(val) && val > 0) fidSet.add(val)
      }
      continue
    }
    const numeric = safeNumber(cand)
    if (numeric > 0) fidSet.add(numeric)
  }
  if (fidSet.size > 0) {
    const fid = Array.from(fidSet)[0]
    traces.push({ step: 'resolve-follow-target-candidate-fid', fid })
    return fid
  }

  const usernameSet = new Set<string>()
  for (const cand of candidateUsernames || []) {
    const sanitized = sanitizeUsername(cand)
    if (sanitized && !DIGIT_ONLY_REGEX.test(sanitized)) usernameSet.add(sanitized)
  }
  if (!usernameSet.size || !neynarKey) {
    if (usernameSet.size) {
      traces.push({ step: 'resolve-follow-target-skip', reason: neynarKey ? 'no-fids' : 'missing-key', usernames: Array.from(usernameSet) })
    }
    return 0
  }

  const attempts: Array<{ username: string; method: string; fid: number | null; ok?: boolean }> = []

  for (const username of usernameSet) {
    const res = await resolveUsernameToFid(username, neynarKey, traces)
    const fid = Number(res?.fid || 0)
    attempts.push({ username, method: 'resolveUsernameToFid', fid: fid > 0 ? fid : null, ok: res.ok })
    if (res.ok && fid > 0) {
      traces.push({ step: 'resolve-follow-target-success', method: 'resolveUsernameToFid', username, fid })
      return fid
    }
  }

  for (const username of usernameSet) {
    const user = await fetchUserByUsername(username).catch(() => null)
    const fid = user?.fid ? Number(user.fid) : 0
    attempts.push({ username, method: 'fetchUserByUsername', fid: fid > 0 ? fid : null })
    if (fid > 0) {
      traces.push({ step: 'resolve-follow-target-success', method: 'fetchUserByUsername', username, fid })
      return fid
    }
  }

  for (const username of usernameSet) {
    const fid = await fetchFidByUsername(username).catch(() => null)
    attempts.push({ username, method: 'fetchFidByUsername', fid: fid && fid > 0 ? fid : null })
    if (fid && fid > 0) {
      traces.push({ step: 'resolve-follow-target-success', method: 'fetchFidByUsername', username, fid })
      return fid
    }
  }

  if (attempts.length) {
    traces.push({ step: 'resolve-follow-target-attempts', attempts })
  }
  return 0
}

/* -------------------------------------------------------------------------- */
/*                          INTERACTION VERIFICATION                           */
/* -------------------------------------------------------------------------- */

// unified result type for all verification helpers
type VerifiedResult = { ok: boolean; reason: string; data?: any; res?: any }

async function verifyFollowByInteractions(
  viewerFid: number,
  targetFid: number,
  apiKey: string | undefined,
  traces: any[],
): Promise<VerifiedResult> {
  // /v2/farcaster/user/interactions/?type=follows&fids=target,viewer
  const url = `${NEYNAR_BASE}${NEYNAR_V2_INTERACTIONS}?type=follows&fids=${targetFid}%2C${viewerFid}`
  const res = await neynarFetch(url, apiKey, RETRIES, traces)
  if (!res.ok) return { ok: false, reason: 'neynar-interaction-request-failed', res }
  const data = res.parsed
  // shape: { interactions: [ { type: 'follows', follows: [ ... ] }, ... ] }
  const follows = (data?.interactions || []).find((i: any) => i.type === 'follows')?.follows || []
  const matches = Array.isArray(follows)
    ? follows.filter((f: any) => Number(f?.user?.fid || f?.fid || 0) === Number(viewerFid))
    : []
  const matched = matches.length > 0
  const payload = { raw: data, matches }
  return matched
    ? { ok: true, reason: 'verified-via-interactions:follows', data: payload }
    : { ok: false, reason: 'viewer-not-in-follows', data: payload }
}

async function verifyInteractionsGeneric(
  type: 'recasts' | 'likes' | 'replies' | 'mentions' | 'quotes',
  viewerFid: number,
  targetFid: number,
  apiKey: string | undefined,
  traces: any[],
): Promise<VerifiedResult> {
  const url = `${NEYNAR_BASE}${NEYNAR_V2_INTERACTIONS}?type=${type}&fids=${targetFid}%2C${viewerFid}`
  const res = await neynarFetch(url, apiKey, RETRIES, traces)
  if (!res.ok) return { ok: false, reason: 'neynar-interaction-request-failed', res }
  const data = res.parsed
  const item = (data?.interactions || []).find((i: any) => i.type === type)
  const arr = item?.[type] || []
  const matches = Array.isArray(arr)
    ? arr.filter((it: any) => Number(it?.user?.fid || it?.fid || 0) === Number(viewerFid))
    : []
  const matched = matches.length > 0
  const payload = { raw: data, matches }
  return matched
    ? { ok: true, reason: `verified-via-interactions:${type}`, data: payload }
    : { ok: false, reason: `viewer-not-in-${type}`, data: payload }
}

/* -------------------------------------------------------------------------- */
/*                             NORMALIZE MIN AMOUNT                            */
/* -------------------------------------------------------------------------- */

async function normalizeMinAmount(
  client: ReturnType<typeof createPublicClient>,
  gate: string,
  token: Address | undefined,
  minAmount: string | number | undefined,
) {
  const amtStr = String(minAmount ?? '1').trim()
  if (gate === 'erc20') {
    if (!token) throw new Error('Missing ERC20 token address')
    const decimals = await client
      .readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })
      .catch(() => 18)
    return parseUnits(amtStr, Number(decimals))
  }
  if (gate === 'erc721') return BigInt(Math.max(1, Number(amtStr) || 1))
  if (gate === 'points') return BigInt(Math.floor(Number(amtStr) || 0))
  if (gate === 'eth') return parseEther(amtStr)
  throw new Error('Unsupported gate type')
}

type RequirementContextSuccess = {
  ok: true
  questTypeKey: string
  questTypeNum: number
  requirement: QuestRequirementData
  meta: Record<string, any>
  castDetails: NormalizedCastDetails
}

type RequirementContextResult = RequirementContextSuccess | { ok: false; reason: string; status?: number }

function prepareRequirementContext(params: {
  questTypeKey: string
  questTarget: bigint | number | undefined
  meta: Record<string, any>
  castInput: string
  castUrlInput: string
  castIdentifierInput: string
  questMeta?: Record<string, any>
  traces: any[]
}): RequirementContextResult {
  const { questTarget, traces, questMeta } = params
  const castInput = typeof params.castInput === 'string' ? params.castInput.trim() : ''
  const castUrlInput = typeof params.castUrlInput === 'string' ? params.castUrlInput.trim() : ''
  const castIdentifierInput = typeof params.castIdentifierInput === 'string' ? params.castIdentifierInput.trim() : ''
  const questTypeKey = params.questTypeKey ? String(params.questTypeKey).toUpperCase() : 'GENERIC'
  const questTypeNum = Number((QUEST_TYPES as Record<string, number>)[questTypeKey] ?? 0)
  const meta: Record<string, any> = { ...(params.meta || {}) }

  meta.questTypeKey = questTypeKey
  if (SOCIAL_ACTION_CODES.has(questTypeNum) && !meta.type) meta.type = 'social'

  const requirementResult = collectQuestRequirements({ questTypeKey, questTarget, meta })
  if (!requirementResult.ok) return requirementResult

  const requirement: QuestRequirementData = { ...requirementResult.data }

  if (!requirement.targetFid && Array.isArray(requirement.candidateFids)) {
    const candidate = requirement.candidateFids.find((n) => {
      const num = Number(n)
      return Number.isFinite(num) && num > 0
    })
    if (candidate !== undefined) {
      const candidateNum = Number(candidate)
      if (Number.isFinite(candidateNum) && candidateNum > 0) requirement.targetFid = candidateNum
    }
  }

  if (!requirement.targetUsername && Array.isArray(requirement.candidateUsernames)) {
    const candidate = requirement.candidateUsernames.find((u) => {
      const sanitized = sanitizeUsername(u)
      return !!sanitized && !DIGIT_ONLY_REGEX.test(sanitized)
    })
    if (candidate) {
      const sanitized = sanitizeUsername(candidate)
      if (sanitized && !DIGIT_ONLY_REGEX.test(sanitized)) requirement.targetUsername = sanitized
    }
  }

  if (requirement.targetFid) {
    meta.targetFid = requirement.targetFid
    const followMeta = typeof meta.follow === 'object' && meta.follow ? { ...meta.follow } : {}
    followMeta.targetFid = requirement.targetFid
    if (Array.isArray(requirement.candidateFids)) followMeta.candidateFids = requirement.candidateFids
    meta.follow = followMeta
  }

  if (requirement.targetUsername) {
    const sanitizedTargetUsername = sanitizeUsername(requirement.targetUsername)
    meta.targetUsername = sanitizedTargetUsername
    const followMeta = typeof meta.follow === 'object' && meta.follow ? { ...meta.follow } : {}
    followMeta.targetUsername = sanitizedTargetUsername
    if (!followMeta.target && sanitizedTargetUsername) followMeta.target = sanitizedTargetUsername
    if (Array.isArray(requirement.candidateUsernames)) followMeta.candidateUsernames = requirement.candidateUsernames
    meta.follow = followMeta
  }

  if (Array.isArray(requirement.candidateFids) && requirement.candidateFids.length) meta.candidateTargetFids = requirement.candidateFids
  if (Array.isArray(requirement.candidateUsernames) && requirement.candidateUsernames.length) meta.candidateTargetUsernames = requirement.candidateUsernames

  if (requirement.mentionUser) meta.mentionUser = sanitizeUsername(requirement.mentionUser)
  if (requirement.castIdentifier) {
    meta.castIdentifier = requirement.castIdentifier
    if (!meta.castUrl) meta.castUrl = requirement.castIdentifier
  }
  if (requirement.frameUrl) meta.frameUrl = requirement.frameUrl
  if (requirement.castContains) {
    meta.castContains = requirement.castContains
  } else if ('castContains' in meta) {
    delete meta.castContains
  }

  const castDetails = normalizeCastDetails(
    castInput,
    castUrlInput,
    castIdentifierInput,
    requirement.castIdentifier,
    meta.castIdentifier,
    meta.castUrl,
    meta.identifier,
    meta.castHash,
    questMeta?.castIdentifier,
    questMeta?.castUrl,
    questMeta?.castHash,
  )

  traces.push({ step: 'cast-normalized', castDetails })

  if (castDetails.url) meta.castUrl = castDetails.url
  if (castDetails.hash) meta.castHash = castDetails.hash
  if (castDetails.identifier) {
    const normalizedIdentifier = castDetails.hash || castDetails.identifier
    requirement.castIdentifier = normalizedIdentifier
    meta.castIdentifier = normalizedIdentifier
    if (!meta.castIdType || meta.castIdType === 'cast') {
      meta.castIdType = castDetails.hash ? 'hash' : castDetails.url ? 'url' : meta.castIdType || ''
    }
  }

  return { ok: true, questTypeKey, questTypeNum, requirement, meta, castDetails }
}

/* -------------------------------------------------------------------------- */
/*                                 MAIN POST                                   */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  const started = Date.now()
  try {
    const body = await req.json().catch(() => null)
    if (!body) return H('Invalid JSON body', 400)

    const {
      chain,
      questId,
      user,
      fid,
      actionCode,
      meta: metaInput,
      mode,
      gate: gateInput,
      asset: assetInput,
      minAmount: minAmountInput,
      sign = true,
      cast: castInputRaw,
      castUrl: castUrlInputRaw,
      castIdentifier: castIdentifierInputRaw,
      questTypeKey: questTypeKeyInput,
      questTarget: questTargetInput,
      draft: draftModeFlag,
    } = body
    const traces: any[] = []
    const isDraftMode = Boolean(draftModeFlag)

    if (isDraftMode) {
      let draftMeta: Record<string, any> = {}
      if (typeof metaInput === 'string' && metaInput.trim()) {
        try {
          draftMeta = JSON.parse(metaInput)
        } catch {
          return NextResponse.json({ ok: false, reason: 'invalid_meta_payload', traces, durationMs: Date.now() - started }, { status: 422 })
        }
      } else if (metaInput && typeof metaInput === 'object') {
        draftMeta = { ...metaInput }
      }

      const actionCodeNum = Number(actionCode ?? 0) || 0
      let questTypeKey = typeof questTypeKeyInput === 'string' ? String(questTypeKeyInput).toUpperCase() : ''
      if (!questTypeKey && typeof draftMeta.questTypeKey === 'string') questTypeKey = String(draftMeta.questTypeKey).toUpperCase()
      if (!questTypeKey && actionCodeNum) questTypeKey = QUEST_TYPES_BY_CODE[actionCodeNum] || ''
      if (!questTypeKey) questTypeKey = 'GENERIC'

      const questTargetValue =
        typeof questTargetInput === 'number' || typeof questTargetInput === 'bigint'
          ? questTargetInput
          : undefined

      const preparation = prepareRequirementContext({
        questTypeKey,
        questTarget: questTargetValue,
        meta: draftMeta,
        castInput: typeof castInputRaw === 'string' ? castInputRaw : '',
        castUrlInput: typeof castUrlInputRaw === 'string' ? castUrlInputRaw : '',
        castIdentifierInput: typeof castIdentifierInputRaw === 'string' ? castIdentifierInputRaw : '',
        questMeta: undefined,
        traces,
      })

      if (!preparation.ok) {
        return NextResponse.json({ ok: false, reason: preparation.reason, traces, durationMs: Date.now() - started }, { status: preparation.status ?? 422 })
      }

      return NextResponse.json(
        {
          ok: true,
          mode: 'draft',
          questTypeKey: preparation.questTypeKey,
          questTypeCode: preparation.questTypeNum,
          requirement: preparation.requirement,
          meta: preparation.meta,
          castDetails: preparation.castDetails,
          traces,
          durationMs: Date.now() - started,
        },
        { status: 200 },
      )
    }

    if (!chain || !questId || !user) return H('Missing required fields', 422)
    if (!isAddress(user)) return H('Invalid user address', 422)

    const chainKey = chain as ChainKey
    const chainId = CHAIN_IDS[chainKey]
    const contractAddr = CONTRACT_ADDRESSES[chainKey] as `0x${string}`
    const rpcUrl = RPC_URLS[chainKey]
    if (!chainId || !contractAddr) return H('Unsupported chain', 422)
    if (!rpcUrl) return H('Missing RPC URL for chain', 500)

    const client = createPublicClient({ transport: http(rpcUrl) })
    const qs = await readQuestStatus(client, contractAddr, BigInt(questId))
    if (!qs.ok) return H('Quest not found', 404)
    const nowSec = Math.floor(Date.now() / 1000)
    const questMax = typeof qs.maxCompletions === 'number' ? qs.maxCompletions : 0
    const questClaimed = typeof qs.claimedCount === 'number' ? qs.claimedCount : 0
    if (!qs.isActive) return H('quest_closed', 410)
    if (qs.expiresAt && nowSec > qs.expiresAt) return H('quest_expired', 410)
    if (questMax > 0 && questClaimed >= questMax) {
      traces.push({ step: 'quest-claims-exhausted', questMax, questClaimed })
      return NextResponse.json({
        ok: false,
        reason: 'quest_claims_exhausted',
        traces,
        durationMs: Date.now() - started,
      }, { status: 410 })
    }

    const questTypeNum = Number(qs.questType ?? actionCode ?? 0)
    const questTypeFromRequest = Number(actionCode ?? 0) || 0
    if (questTypeFromRequest && questTypeFromRequest !== questTypeNum) {
      traces.push({ step: 'action-code-mismatch', request: questTypeFromRequest, onchain: questTypeNum })
    }

    let questMeta: Record<string, any> = {}
    if (qs.meta && typeof qs.meta === 'string' && qs.meta.trim()) {
      try {
        questMeta = JSON.parse(qs.meta)
      } catch {
        traces.push({ step: 'quest-meta-parse-failed', snippet: String(qs.meta).slice(0, 200) })
        return NextResponse.json({ ok: false, reason: 'quest_meta_invalid', traces, durationMs: Date.now() - started }, { status: 500 })
      }
    }

    let requestMeta: Record<string, any> = {}
    if (typeof metaInput === 'string' && metaInput.trim()) {
      try {
        requestMeta = JSON.parse(metaInput)
      } catch {
        return NextResponse.json({ ok: false, reason: 'invalid_meta_payload', traces, durationMs: Date.now() - started }, { status: 422 })
      }
    } else if (metaInput && typeof metaInput === 'object') {
      requestMeta = metaInput
    }

    const castInput = typeof castInputRaw === 'string' ? castInputRaw.trim() : ''
    const castUrlInput = typeof castUrlInputRaw === 'string' ? castUrlInputRaw.trim() : ''
    const castIdentifierInput = typeof castIdentifierInputRaw === 'string' ? castIdentifierInputRaw.trim() : ''

    const combinedMeta: Record<string, any> = { ...(requestMeta || {}), ...(questMeta || {}) }
    if (castInput) combinedMeta.cast = castInput
    if (castUrlInput) combinedMeta.castUrl = castUrlInput
    if (castIdentifierInput) combinedMeta.castIdentifier = castIdentifierInput
    let questTypeKey = typeof combinedMeta.questTypeKey === 'string' ? String(combinedMeta.questTypeKey).toUpperCase() : undefined
    if (!questTypeKey && questTypeNum) questTypeKey = QUEST_TYPES_BY_CODE[questTypeNum] || undefined
    if (!questTypeKey) questTypeKey = 'GENERIC'

    const preparation = prepareRequirementContext({
      questTypeKey,
      questTarget: qs.target,
      meta: combinedMeta,
      castInput,
      castUrlInput,
      castIdentifierInput,
      questMeta,
      traces,
    })

    if (!preparation.ok) {
      traces.push({ step: 'quest-requirements-failed', questTypeKey, reason: preparation.reason })
      return NextResponse.json({ ok: false, reason: preparation.reason, traces, durationMs: Date.now() - started }, { status: preparation.status ?? 422 })
    }

    questTypeKey = preparation.questTypeKey
    const requirement = preparation.requirement
    const meta = preparation.meta
    const castDetails = preparation.castDetails
    const questFieldConfig = getQuestFieldConfig(normalizeQuestTypeKey(questTypeKey))

    const castContainsNeedle = typeof requirement.castContains === 'string' && requirement.castContains.trim()
      ? requirement.castContains.trim()
      : typeof meta.castContains === 'string'
        ? meta.castContains.trim()
        : ''

    traces.push({
      step: 'quest-context',
      questTypeNum,
      questTypeKey,
      questTarget: safeNumber(qs.target),
      questIsActive: qs.isActive,
      questExpiresAt: qs.expiresAt,
      questMax: qs.maxCompletions,
      questClaimed: qs.claimedCount,
      metaKeys: Object.keys(meta || {}),
      requirement,
    })

    const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY
    const NEYNAR_KEY = process.env.NEYNAR_API_KEY
    if (!ORACLE_PK) return H('Missing ORACLE_PRIVATE_KEY', 500)

    const account = privateKeyToAccount((ORACLE_PK.startsWith('0x') ? ORACLE_PK : `0x${ORACLE_PK}`) as `0x${string}`)

    const gate = gateInput
    const asset = assetInput
    const minAmount = minAmountInput

    const isSocial =
      SOCIAL_ACTION_CODES.has(questTypeNum) ||
      mode === 'social' ||
      meta?.type === 'social' ||
      (meta?.questTypeKey && String(meta.questTypeKey).toLowerCase().includes('farcaster'))

    // ---- Social path ----
    if (isSocial) {
      const providedFid = Number(fid || 0)
      const userAddress = user as Address
      let viewerFid = providedFid
      const fidTrace: Record<string, any> = {
        step: 'viewer-fid-derivation',
        providedFid: Number.isFinite(providedFid) && providedFid > 0 ? providedFid : null,
      }

      try {
        const linkedRaw = await client.readContract({
          address: contractAddr,
          abi: GM_CONTRACT_ABI as any,
          functionName: 'farcasterFidOf',
          args: [userAddress],
        })
        const linkedNum = safeNumber(linkedRaw)
        if (linkedNum > 0) {
          fidTrace.linkedFid = linkedNum
          if (viewerFid && viewerFid !== linkedNum) {
            fidTrace.mismatch = { provided: viewerFid, linked: linkedNum }
            traces.push(fidTrace)
            return NextResponse.json({
              ok: false,
              reason: 'fid_address_mismatch',
              traces,
              durationMs: Date.now() - started,
            }, { status: 409 })
          }
          viewerFid = linkedNum
        }
      } catch (err: any) {
        fidTrace.linkedError = String(err?.message || err)
      }

      if (!viewerFid) {
        const lookupFid = await fetchFidByAddress(userAddress).catch(() => null)
        if (lookupFid && lookupFid > 0) {
          fidTrace.lookupFid = lookupFid
          viewerFid = lookupFid
        }
      }

      fidTrace.finalFid = Number.isFinite(viewerFid) && viewerFid > 0 ? viewerFid : null
      traces.push(fidTrace)

      if (!viewerFid) return H('Missing Farcaster viewer FID', 422)
      if (!NEYNAR_KEY) return H('Missing NEYNAR_API_KEY', 500)

      traces.push({ step: 'social-start', viewerFid, questTypeNum, metaKeys: Object.keys(meta || {}) })

      const normalizedCastIdentifier = requirement.castIdentifier || castDetails.identifier || pickCastIdentifier(meta)
      if (normalizedCastIdentifier) requirement.castIdentifier = normalizedCastIdentifier
      const lookupPlan = buildCastLookupPlan({
        castDetails,
        meta,
        requirement,
        questMeta,
        rawInputs: [castInput, castUrlInput, castIdentifierInput],
      })
      let preferredCastUrl = castDetails.url || lookupPlan.preferredUrl || (typeof meta?.castUrl === 'string' ? meta.castUrl : '')
      if (!preferredCastUrl && lookupPlan.preferredUrl) preferredCastUrl = lookupPlan.preferredUrl
      if (!meta.castUrl && preferredCastUrl) meta.castUrl = preferredCastUrl
      let castProbe: any = null
      let castHashForValidation = castDetails.hash || lookupPlan.hashCandidates.find(Boolean) || ''
      let derivedTargetFid: number = Number(requirement.targetFid ?? meta?.targetFid ?? 0) || 0
      if (!derivedTargetFid && Array.isArray(requirement.candidateFids)) {
        const candidateFid = requirement.candidateFids.find((n) => Number.isFinite(n) && Number(n) > 0)
        if (candidateFid) derivedTargetFid = Number(candidateFid)
      }
      if (!derivedTargetFid) {
        const onchainTarget = safeNumber(qs.target)
        if (onchainTarget) derivedTargetFid = onchainTarget
      }

      traces.push({ step: 'cast-probe-candidates', candidates: lookupPlan.identifiers })

      for (const identifier of lookupPlan.identifiers) {
        if (!identifier) continue
        const castRes = await probeCastWithFallback(identifier, viewerFid, NEYNAR_KEY, traces)
        traces.push({
          step: 'cast-probe-attempt',
          identifier,
          ok: !!(castRes as any)?.ok,
          status: Number((castRes as any)?.status || 0),
          url: String((castRes as any)?.url || ''),
        })
        if (!castRes.ok) continue
        const parsed = castRes.parsed
        const castObj = parsed?.cast || parsed
        if (castObj) {
          castProbe = castObj
          const authorFid = Number(castObj?.author?.fid || castObj?.author_fid || 0)
          if (authorFid) derivedTargetFid = authorFid
          if (castObj?.hash) {
            const normalizedHash = String(castObj.hash)
            castHashForValidation = normalizedHash
            requirement.castIdentifier = normalizedHash
            meta.castIdentifier = normalizedHash
            meta.castHash = normalizedHash
            meta.castIdType = 'hash'
          }
          if (!meta.castUrl) {
            const permalink = typeof castObj?.permalink === 'string' ? castObj.permalink : typeof castObj?.url === 'string' ? castObj.url : ''
            if (permalink) meta.castUrl = permalink
          }
          const vc = castObj?.viewer_context || castObj?.author?.viewer_context
          if (vc) traces.push({ step: 'cast-viewer-context', vc })
        }
        break
      }

      const followUsernameCandidates: Array<string | undefined | null> = [
        requirement.targetUsername,
        meta?.follow?.targetUsername,
        meta?.follow?.target,
        meta?.follow?.username,
        meta?.follow?.handle,
        meta?.targetUsername,
        meta?.targetHandle,
        meta?.target,
        ...(Array.isArray(requirement.candidateUsernames) ? requirement.candidateUsernames : []),
        ...(Array.isArray(meta?.candidateTargetUsernames) ? meta.candidateTargetUsernames : []),
      ]

      const followUsernameSet = new Set<string>()
      for (const candidate of followUsernameCandidates) {
        const sanitized = sanitizeUsername(candidate)
        if (sanitized && !DIGIT_ONLY_REGEX.test(sanitized)) followUsernameSet.add(sanitized)
      }
      const followUsernameList = Array.from(followUsernameSet)
      const followUsername = followUsernameList[0] || ''

      if (followUsername) {
        if (!meta.follow || typeof meta.follow !== 'object') meta.follow = {}
        if (!meta.follow.targetUsername) meta.follow.targetUsername = followUsername
        if (!meta.follow.target) meta.follow.target = followUsername
      }

      const followFidCandidates: Array<number | string | bigint | null | undefined> = [
        derivedTargetFid,
        requirement.targetFid,
        meta?.targetFid,
        meta?.follow?.targetFid,
        (meta?.follow as any)?.fid,
        (meta?.follow as any)?.target,
        meta?.target,
        (qs as any)?.target,
        ...(Array.isArray(requirement.candidateFids) ? requirement.candidateFids : []),
        ...(Array.isArray(meta?.candidateTargetFids) ? meta.candidateTargetFids : []),
        ...(Array.isArray((meta?.follow as any)?.candidateFids) ? (meta?.follow as any)?.candidateFids : []),
      ]

      traces.push({
        step: 'follow-target-candidates',
        usernames: followUsernameList.slice(0, 5),
        fidCandidates: followFidCandidates
          .map((val) => {
            let num: number | null = null
            if (typeof val === 'number' && Number.isFinite(val)) num = val
            else if (typeof val === 'bigint') {
              const asNum = Number(val)
              num = Number.isFinite(asNum) ? asNum : null
            } else if (typeof val === 'string') {
              const trimmed = val.trim()
              if (/^\d+$/.test(trimmed)) {
                const asNum = Number(trimmed)
                num = Number.isFinite(asNum) ? asNum : null
              }
            }
            return num && num > 0 ? num : null
          })
          .filter((val, idx, arr) => val !== null && arr.indexOf(val) === idx)
          .slice(0, 5),
      })

      if (!derivedTargetFid) {
        const resolvedFollowFid = await resolveFollowTargetFid({
          initialFid: derivedTargetFid,
          candidateFids: followFidCandidates,
          candidateUsernames: followUsernameList,
          neynarKey: NEYNAR_KEY,
          traces,
        })
        if (resolvedFollowFid > 0) derivedTargetFid = resolvedFollowFid
      }

      if (!derivedTargetFid && meta?.castAuthorFid) derivedTargetFid = Number(meta.castAuthorFid || 0)

      const mentionUser = sanitizeUsername(meta?.mentionUser || meta?.username || requirement.mentionUser || '')
      if (mentionUser) meta.mentionUser = mentionUser

      traces.push({
        step: 'derived-target-fid',
        derivedTargetFid,
        mentionUser,
        followUsername,
        candidateFids: Array.isArray(requirement.candidateFids) ? requirement.candidateFids.slice(0, 5) : undefined,
        candidateUsernames: Array.isArray(requirement.candidateUsernames) ? requirement.candidateUsernames.slice(0, 5) : undefined,
      })

      let interactionType: 'follows' | 'recasts' | 'likes' | 'replies' | 'mentions' | 'quotes' | null = null
      switch (questTypeNum) {
        case QUEST_TYPES.FARCASTER_FOLLOW: interactionType = 'follows'; break
        case QUEST_TYPES.FARCASTER_RECAST: interactionType = 'recasts'; break
        case QUEST_TYPES.FARCASTER_LIKE: interactionType = 'likes'; break
        case QUEST_TYPES.FARCASTER_REPLY: interactionType = 'replies'; break
        case QUEST_TYPES.FARCASTER_MENTION: interactionType = 'mentions'; break
        default: interactionType = null
      }

      let verified: VerifiedResult = { ok: false, reason: 'not-verified' }

      const tf = Number(derivedTargetFid || 0)

      if (interactionType === 'follows' && tf <= 0) {
        traces.push({ step: 'target-fid-missing', interactionType, metaTargetFid: Number(meta?.targetFid || 0) })
        return NextResponse.json({
          ok: false,
          reason: 'target_not_resolved',
          traces,
          durationMs: Date.now() - started,
        }, { status: 422 })
      }

      if (interactionType && tf > 0) {
        traces.push({ step: 'verify-via-interactions', interactionType, targetFid: tf })
        if (interactionType === 'follows') {
          verified = await verifyFollowByInteractions(viewerFid, tf, NEYNAR_KEY, traces)
        } else {
          verified = await verifyInteractionsGeneric(interactionType as any, viewerFid, tf, NEYNAR_KEY, traces)
        }
      }

      if (!verified.ok && castProbe) {
        traces.push({ step: 'verify-via-cast-context' })
        const ctx = castProbe?.viewer_context || castProbe?.author?.viewer_context || {}
        if (interactionType === 'likes' && ctx.liked) verified = { ok: true, reason: 'verified-via-cast-context:likes' }
        if (interactionType === 'recasts' && ctx.recasted) verified = { ok: true, reason: 'verified-via-cast-context:recasts' }
        if (interactionType === 'follows' && ctx.following) verified = { ok: true, reason: 'verified-via-cast-context:follows' }
      }

      if (!verified.ok && mentionUser && !derivedTargetFid) {
        traces.push({ step: 'resolve-and-verify-mention', mentionUser })
        const r = await resolveUsernameToFid(mentionUser, NEYNAR_KEY, traces)
        traces.push({ step: 'resolve-and-verify-mention-result', ok: !!r?.ok, fid: Number((r as any)?.fid || 0) })
        if (r.ok) {
          const resolvedFid = Number((r as any)?.fid || 0)
          if (resolvedFid > 0) {
            if (interactionType === 'follows') {
              verified = await verifyFollowByInteractions(viewerFid, resolvedFid, NEYNAR_KEY, traces)
            } else {
              verified = await verifyInteractionsGeneric(interactionType as any, viewerFid, resolvedFid, NEYNAR_KEY, traces)
            }
          } else {
            traces.push({ step: 'resolve-mention-invalid-fid' })
          }
        }
      }

      if (verified.ok && castContainsNeedle && questFieldConfig.castText === 'required') {
        const needleLower = castContainsNeedle.toLowerCase()
        const matchesArray = Array.isArray((verified.data as any)?.matches) ? (verified.data as any).matches : []
        let castContainsSatisfied = matchesArray.some((entry: any) => {
          const text = getCastText(entry)
          return text ? text.toLowerCase().includes(needleLower) : false
        })
        const replyTargetHash = (castHashForValidation && castHashForValidation.trim()) || (
          typeof requirement.castIdentifier === 'string' && isCastHash(requirement.castIdentifier)
            ? requirement.castIdentifier
            : ''
        )
        if (!castContainsSatisfied && replyTargetHash) {
          const replies = await fetchViewerRepliesForCast({ viewerFid, targetHash: replyTargetHash, apiKey: NEYNAR_KEY, traces })
          castContainsSatisfied = replies.some((reply) => {
            const text = getCastText(reply)
            return text ? text.toLowerCase().includes(needleLower) : false
          })
          traces.push({
            step: castContainsSatisfied ? 'cast-contains-match' : 'cast-contains-miss',
            method: 'reply-scan',
            repliesFound: replies.length,
            needle: castContainsNeedle,
          })
        }
        if (!castContainsSatisfied) {
          verified = { ok: false, reason: 'cast_contains_not_met', data: verified.data }
        }
      }

      if (!verified.ok) {
        return NextResponse.json({
          ok: false,
          reason: 'verification_failed',
          debug: true,
          traces,
          durationMs: Date.now() - started,
        }, { status: 403 })
      }

      const deadline = Math.floor(Date.now() / 1000) + 900
      const nonce = Math.floor(Date.now() / 1000)
      const sig = sign ? await signQuest({
        chainId,
        contractAddr,
        questId: Number(questId),
        user,
        fid: viewerFid,
        action: questTypeNum,
        deadline,
        nonce,
        account,
      }) : null

      return NextResponse.json({
        ok: true,
        sig,
        fid: viewerFid,
        nonce,
        deadline,
        actionCode: questTypeNum,
        verifiedReason: verified.reason || null,
        traces,
        durationMs: Date.now() - started,
      })
    } // end social

    const gateClient = client ?? createPublicClient({ transport: http(rpcUrl) })
    const g = String(gate || meta?.gate || '').toLowerCase()
    const assetStr = typeof asset === 'string' ? asset : (typeof meta?.asset === 'string' ? meta.asset : '')
    const token = isAddress(assetStr) ? (assetStr as Address) : undefined

    if ((g === 'erc20' || g === 'erc721') && !token) return H(`Missing token address for gate "${g}"`, 422)

    let min: bigint = 0n
    try {
      min = await normalizeMinAmount(gateClient, g, token, (minAmount ?? meta?.minAmount) as any)
    } catch (e: any) {
      return H(e?.message || 'Invalid minAmount', 422)
    }

    let eligible = false
    if (g === 'erc20') {
      const bal = await gateClient.readContract({
        address: token as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [user],
      })
      eligible = BigInt((bal as any) ?? 0) >= min
    } else if (g === 'erc721') {
      const bal = await gateClient.readContract({
        address: token as Address,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [user],
      })
      eligible = BigInt((bal as any) ?? 0) >= min
    } else if (g === 'points') {
      const stats = await gateClient.readContract({
        address: contractAddr,
        abi: GM_CONTRACT_ABI as any,
        functionName: 'getUserStats',
        args: [user],
      })
      const availablePoints = BigInt((stats as any)?.[0] ?? 0)
      eligible = availablePoints >= min
    } else if (!g) {
      return H('No gate specified', 422)
    } else {
      return H('Unsupported gate type', 400)
    }

    if (!eligible) return H('Not eligible for reward 🐾', 403)

    const deadline = Math.floor(Date.now() / 1000) + 900
    const nonce = Math.floor(Date.now() / 1000)
    const sig = sign ? await signQuest({
      chainId,
      contractAddr,
      questId: Number(questId),
      user,
      fid: 0,
      action: questTypeNum,
      deadline,
      nonce,
      account,
    }) : null
    return NextResponse.json({
      ok: true,
      sig,
      fid: 0,
      nonce,
      deadline,
      actionCode: questTypeNum,
      traces,
      durationMs: Date.now() - started,
    })
  } catch (e: any) {
    console.error('verify error', e)
    return NextResponse.json({ ok: false, reason: String(e?.message || e), traces: e?.traces || [] }, { status: 500 })
  }
}

/* -------------------------------------------------------------------------- */
/*                                 DEBUG GET                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const debug = url.searchParams.get('debug')
  if (!debug) return H('Method Not Allowed', 405)

  const fid = Number(url.searchParams.get('fid') || 0)
  const username = url.searchParams.get('username') || ''
  const cast = url.searchParams.get('cast') || ''
  const metaParam = url.searchParams.get('meta')
  const NEYNAR_KEY = process.env.NEYNAR_API_KEY
  if (!NEYNAR_KEY) return H('Missing NEYNAR_API_KEY', 500)

  const traces: any[] = []
  try {
    let parsedMeta: Record<string, any> | null = null
    if (metaParam) {
      const tryValues = [metaParam]
      try {
        const decoded = decodeURIComponent(metaParam)
        if (decoded !== metaParam) tryValues.push(decoded)
      } catch {
        /* ignore */
      }
      for (const candidate of tryValues) {
        if (!candidate) continue
        try {
          parsedMeta = JSON.parse(candidate)
          break
        } catch {
          try {
            const decoded = typeof atob === 'function' ? atob(candidate) : candidate
            if (decoded) parsedMeta = JSON.parse(decoded)
            if (parsedMeta) break
          } catch {
            /* ignore */
          }
        }
      }
      if (!parsedMeta) {
        traces.push({ step: 'meta-parse-failed', metaParam: metaParam.slice(0, 120) })
      }
    }

    if (parsedMeta && fid) {
  const meta = { ...parsedMeta }
  const questTypeKeyRaw = typeof meta.questTypeKey === 'string' ? meta.questTypeKey : 'GENERIC'
  const questTypeKey = questTypeKeyRaw.toUpperCase()
  meta.questTypeKey = questTypeKey
      const requirementRes = collectQuestRequirements({ questTypeKey, questTarget: 0, meta })
      if (!requirementRes.ok) {
        return NextResponse.json({
          ok: false,
          debug: true,
          reason: requirementRes.reason,
          traces: [...traces, { step: 'meta-requirements-failed', reason: requirementRes.reason }],
        }, { status: requirementRes.status ?? 422 })
      }

      const requirement = requirementRes.data
      const castDetails = normalizeCastDetails(
        meta.cast,
        meta.castUrl,
        meta.castIdentifier,
        meta.identifier,
        meta.castHash,
      )
      traces.push({ step: 'meta-debug-start', fid, questTypeKey, castDetails, requirement })
      if (castDetails.url && !meta.castUrl) meta.castUrl = castDetails.url
      if (castDetails.hash && !meta.castHash) meta.castHash = castDetails.hash
      if (castDetails.identifier && !meta.castIdentifier) meta.castIdentifier = castDetails.identifier

  const lookupPlan = buildCastLookupPlan({ castDetails, meta, requirement, questMeta: undefined, rawInputs: [] })
      if (!meta.castUrl && lookupPlan.preferredUrl) meta.castUrl = lookupPlan.preferredUrl
      const lookupTraces: any[] = []
      let castProbe: any = null
      let resolvedHash = castDetails.hash || lookupPlan.hashCandidates.find(Boolean) || ''
      traces.push({ step: 'meta-cast-candidates', candidates: lookupPlan.identifiers })

      for (const identifier of lookupPlan.identifiers) {
        if (!identifier) continue
        const castRes = await probeCastWithFallback(identifier, fid, NEYNAR_KEY, lookupTraces)
        lookupTraces.push({ identifier, ok: !!castRes?.ok, status: Number((castRes as any)?.status || 0) })
        if (!castRes.ok) continue
        const parsed = castRes.parsed
        const castObj = parsed?.cast || parsed
        if (castObj) {
          castProbe = castObj
          if (castObj?.hash) {
            resolvedHash = String(castObj.hash)
            meta.castHash = resolvedHash
            meta.castIdentifier = resolvedHash
            meta.castIdType = 'hash'
          }
          if (!meta.castUrl) {
            const permalink = typeof castObj?.permalink === 'string' ? castObj.permalink : typeof castObj?.url === 'string' ? castObj.url : ''
            if (permalink) meta.castUrl = permalink
          }
        }
        break
      }

      traces.push({ step: 'meta-cast-lookup-traces', lookupTraces })

      return NextResponse.json({
        ok: true,
        debug: true,
        fid,
        meta,
        castDetails,
        requirement,
        lookupPlan,
        castProbe,
        resolvedHash,
        traces,
      })
    }

    if (parsedMeta && !fid) {
      traces.push({ step: 'meta-debug-missing-fid' })
      return NextResponse.json({ ok: false, debug: true, reason: 'meta_debug_requires_fid', traces }, { status: 422 })
    }

    if (username && fid) {
      const r = await resolveUsernameToFid(username, NEYNAR_KEY, traces)
      traces.push({ resolveUsernameResult: { ok: !!r?.ok, fid: Number((r as any)?.fid || 0) } })
      if (!r.ok) {
        return NextResponse.json({ ok: false, debug: true, username, fid, traces }, { status: 404 })
      }
      const maybeFid = r.fid
      const forwardUrl = `${NEYNAR_BASE}/v2/farcaster/user?fid=${maybeFid}&viewer_fid=${fid}`
      const fwd = await neynarFetch(forwardUrl, NEYNAR_KEY, RETRIES, traces)
      return NextResponse.json({
        ok: true,
        debug: true,
        username,
        fid,
        targetFid: maybeFid,
        resolve: { ok: !!r?.ok, fid: maybeFid },
        fwd: { ok: !!(fwd as any)?.ok, status: Number((fwd as any)?.status || 0), url: String((fwd as any)?.url || '') },
        traces,
      })
    }
    if (cast && fid) {
      const castDetails = normalizeCastDetails(cast)
      const probeIdentifier = castDetails.url || castDetails.identifier
      const castProbe = probeIdentifier ? await probeCastWithFallback(probeIdentifier, fid, NEYNAR_KEY, traces) : { ok: false }
      return NextResponse.json({
        ok: true,
        debug: true,
        cast,
        castDetails,
        fid,
        castProbe: {
          ok: !!(castProbe as any)?.ok,
          status: Number((castProbe as any)?.status || 0),
          url: String((castProbe as any)?.url || ''),
        },
        traces,
      })
    }
    return NextResponse.json({ ok: true, debug: true, msg: 'provide fid & username or fid & cast in query', traces })
  } catch (e: any) {
    return H(String(e?.message || e), 500)
  }
}

// add minimal on-chain status reader (quests -> getQuest fallback)
type QuestStatusResult =
  | {
      ok: true
      isActive: boolean
      expiresAt: number
      questType: number
      target: bigint
      meta?: string
      creator?: string
      maxCompletions?: number
      claimedCount?: number
    }
  | { ok: false }

async function readQuestStatus(
  client: ReturnType<typeof createPublicClient>,
  contractAddr: `0x${string}`,
  questId: bigint,
): Promise<QuestStatusResult> {
  const tryNormalize = async (fn: 'quests' | 'getQuest') => {
    try {
      const raw: any = await client.readContract({
        address: contractAddr,
        abi: GM_CONTRACT_ABI as any,
        functionName: fn,
        args: [questId],
      })
      const normalized = normalizeQuestStruct(raw)
      if (!normalized || (normalized.questType ?? 0) === undefined) return null
      return {
        ok: true as const,
        isActive: Boolean(normalized.isActive),
        expiresAt: Number(normalized.expiresAt ?? 0),
        questType: Number(normalized.questType ?? 0),
        target: toBigIntSafe(normalized.target),
        meta: typeof normalized.meta === 'string' ? normalized.meta : undefined,
        creator: typeof normalized.creator === 'string' ? normalized.creator : undefined,
        maxCompletions: typeof normalized.maxCompletions === 'number' ? normalized.maxCompletions : undefined,
        claimedCount: typeof normalized.claimedCount === 'number' ? normalized.claimedCount : undefined,
      }
    } catch (error) {
      console.warn('readQuestStatus fallback failed:', (error as Error)?.message || error)
      return null
    }
  }

  const primary = await tryNormalize('quests')
  if (primary) return primary
  const fallback = await tryNormalize('getQuest')
  if (fallback) return fallback
  return { ok: false }
}
