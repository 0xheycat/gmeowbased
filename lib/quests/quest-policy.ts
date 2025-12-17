/**
 * Quest Creation Policy System
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Three-tier creator system (standard, partner, admin)
 * - FID and wallet-based tier resolution
 * - Partner mode permissions (multi-chain quest creation)
 * - Raffle quest gating (admin-only)
 * - Asset verification requirements (standard = verified only)
 * - Hold quest gating enforcement
 * - Policy summaries with tone indicators (info/warn/success)
 * - Environment variable configuration for tier lists
 * - Supports both desktop and Farcaster Mini App surfaces
 * 
 * TODO:
 * - Add dynamic tier promotion based on quest performance
 * - Implement temporary tier upgrades (time-limited partner access)
 * - Add audit logging for policy decisions
 * - Support organization-based tiering (team accounts)
 * - Add policy versioning for A/B testing
 * - Implement quest moderation queue for flagged creators
 * - Add reputation scoring system
 * 
 * CRITICAL:
 * - Admin/partner FIDs and wallets must be kept in sync across environments
 * - Policy changes affect all active quests (test thoroughly)
 * - Never expose tier lists in client-side code (security risk)
 * - Always validate asset verification before allowing unverified override
 * 
 * SUGGESTIONS:
 * - Consider migrating tier lists to database for dynamic updates
 * - Add Supabase RLS policies matching creator tiers
 * - Implement tier change notifications (email/webhook)
 * - Add policy dashboard for admins to manage tiers
 * 
 * AVOID:
 * - Hardcoding tier logic in multiple places (use this module)
 * - Allowing standard users to bypass asset verification
 * - Granting admin permissions without proper vetting
 * - Changing tier logic without migration plan for existing quests
 * 
 * Created: November 2025
 * Last Modified: December 17, 2025
 * Reference: planning/quest-policy.md
 * Quality Gates: GI-15 (Access Control), GI-8 (Security)
 */

import { QUEST_TYPES, type ChainKey } from '@/lib/contracts/gmeow-utils'

type CreatorTier = 'standard' | 'partner' | 'admin'

type CreatorIdentity = {
  fid?: number | null
  address?: string | null
}

type QuestPolicy = {
  tier: CreatorTier
  allowPartnerMode: boolean
  maxPartnerChains: number
  allowRaffle: boolean
  requireVerifiedAssets: boolean
  allowUnverifiedOverride: boolean
  forceHoldQuestGate: boolean
  summary: {
    tone: 'info' | 'warn' | 'success'
    title: string
    detail: string
  }
}

type AssetLike = {
  verified?: boolean
  chain?: ChainKey
}

const ADMIN_FIDS = parseIdList(process.env.NEXT_PUBLIC_QUEST_ADMIN_FIDS ?? process.env.QUEST_ADMIN_FIDS)
const ADMIN_WALLETS = parseAddressList(process.env.NEXT_PUBLIC_QUEST_ADMIN_WALLETS ?? process.env.QUEST_ADMIN_WALLETS)
const PARTNER_FIDS = parseIdList(process.env.NEXT_PUBLIC_QUEST_PARTNER_FIDS ?? process.env.QUEST_PARTNER_FIDS)
const PARTNER_WALLETS = parseAddressList(process.env.NEXT_PUBLIC_QUEST_PARTNER_WALLETS ?? process.env.QUEST_PARTNER_WALLETS)

export function resolveCreatorTier(identity: CreatorIdentity): CreatorTier {
  const fid = identity.fid != null ? Number(identity.fid) : NaN
  const normalizedFid = Number.isFinite(fid) && fid > 0 ? String(fid) : null
  const address = normalizeAddress(identity.address)

  if ((normalizedFid && ADMIN_FIDS.has(normalizedFid)) || (address && ADMIN_WALLETS.has(address))) {
    return 'admin'
  }

  if ((normalizedFid && PARTNER_FIDS.has(normalizedFid)) || (address && PARTNER_WALLETS.has(address))) {
    return 'partner'
  }

  return 'standard'
}

export function getQuestPolicy(tier: CreatorTier): QuestPolicy {
  switch (tier) {
    case 'admin':
      return {
        tier,
        allowPartnerMode: true,
        maxPartnerChains: Infinity,
        allowRaffle: true,
        requireVerifiedAssets: false,
        allowUnverifiedOverride: true,
        forceHoldQuestGate: true,
        summary: {
          tone: 'success',
          title: 'Admin mode unlocked',
          detail: 'All quest configuration paths are enabled. Unverified assets require manual confirmation.',
        },
      }
    case 'partner':
      return {
        tier,
        allowPartnerMode: true,
        maxPartnerChains: 3,
        allowRaffle: false,
        requireVerifiedAssets: true,
        allowUnverifiedOverride: false,
        forceHoldQuestGate: true,
        summary: {
          tone: 'info',
          title: 'Partner quest privileges',
          detail: 'Partner allowlists and multi-chain gates are enabled. Raffles and unverified contracts stay reserved for admins.',
        },
      }
    default:
      return {
        tier: 'standard',
        allowPartnerMode: false,
        maxPartnerChains: 1,
        allowRaffle: false,
        requireVerifiedAssets: true,
        allowUnverifiedOverride: false,
        forceHoldQuestGate: true,
        summary: {
          tone: 'warn',
          title: 'Verified quests only',
          detail: 'Stick to verified assets. Partner mode and raffles unlock after the ops team approves your creator profile.',
        },
      }
  }
}

export function questTypeRequiresGate(questTypeKey: keyof typeof QUEST_TYPES | string): 'token' | 'nft' | null {
  const normalized = normalizeQuestTypeKey(questTypeKey)
  if (normalized === 'HOLD_ERC20') return 'token'
  if (normalized === 'HOLD_ERC721') return 'nft'
  return null
}

export function isAssetAllowed(asset: AssetLike | null | undefined, policy: QuestPolicy): boolean {
  if (!asset) return false
  if (!policy.requireVerifiedAssets) return true
  return Boolean(asset.verified)
}

export function normalizeQuestTypeKey(value: keyof typeof QUEST_TYPES | string): keyof typeof QUEST_TYPES {
  const key = String(value || '').toUpperCase()
  if (key in QUEST_TYPES) {
    return key as keyof typeof QUEST_TYPES
  }
  return 'GENERIC'
}

function parseIdList(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )
}

function parseAddressList(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((entry) => normalizeAddress(entry))
      .filter((entry): entry is string => Boolean(entry)),
  )
}

function normalizeAddress(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null
  return trimmed.toLowerCase()
}

export type { CreatorTier, QuestPolicy }
