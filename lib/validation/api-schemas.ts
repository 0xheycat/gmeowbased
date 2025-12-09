/**
 * API Validation Schemas
 * 
 * Source: Zod v4.1.12 - https://zod.dev
 * MCP Verified: 2025-11-17
 * Approved by: @heycat
 * 
 * Quality Gates Applied: GI-8 (Input Validation)
 */

import { z } from 'zod'

// Common schemas
export const FIDSchema = z.number().int().positive('FID must be a positive integer')

export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')

export const CastHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid cast hash format')

export const ChainSchema = z.enum(['base', 'op', 'celo', 'unichain', 'ink'])

// Badge endpoints
export const BadgeAssignSchema = z.object({
  fid: FIDSchema,
  badgeId: z.string().min(1, 'Badge ID is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const BadgeMintSchema = z.object({
  fid: FIDSchema,
  badgeType: z.string().min(1, 'Badge type is required'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
  tokenId: z.number().int().nonnegative().optional(),
  contractAddress: AddressSchema.optional(),
})

// Quest endpoints
export const QuestVerifySchema = z.object({
  fid: FIDSchema,
  questId: z.string().uuid('Invalid quest ID format'),
  proof: z.record(z.string(), z.unknown()).optional(),
})

export const QuestClaimSchema = z.object({
  fid: FIDSchema,
  questId: z.string().uuid('Invalid quest ID format'),
})

// Quest List Query Schema (GET /api/quests)
export const QuestListQuerySchema = z.object({
  category: z.enum(['onchain', 'social', 'creative', 'learn']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

// Quest Details Query Schema (GET /api/quests/[questId])
export const QuestDetailsQuerySchema = z.object({
  userFid: FIDSchema,
})

// Quest Progress Check Schema (POST /api/quests/[questId]/progress)
export const QuestProgressCheckSchema = z.object({
  userFid: FIDSchema,
})

// Analytics endpoints
export const AnalyticsSummarySchema = z.object({
  fid: FIDSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Telemetry endpoints
export const TelemetryRankSchema = z.object({
  fid: FIDSchema,
  eventType: z.string().min(1, 'Event type is required'),
  eventDetail: z.record(z.string(), z.unknown()).optional(),
  points: z.number().int().min(0).optional(),
  chain: ChainSchema.optional(),
})

// Admin endpoints
export const AdminBadgeCreateSchema = z.object({
  name: z.string().min(1, 'Badge name is required'),
  description: z.string().min(1, 'Description is required'),
  tier: z.enum(['mythic', 'legendary', 'epic', 'rare', 'common']),
  imageUrl: z.string().url('Invalid image URL'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const AdminBadgeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  tier: z.enum(['mythic', 'legendary', 'epic', 'rare', 'common']).optional(),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

// Frame endpoints
export const FrameIdentifySchema = z.object({
  fid: FIDSchema,
  buttonIndex: z.number().int().min(1).max(4).optional(),
  messageHash: z.string().optional(),
})

// Viral endpoints
export const ViralStatsQuerySchema = z.object({
  fid: FIDSchema.optional(),
  timeframe: z.enum(['day', 'week', 'month', 'all']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

// Leaderboard endpoints
export const LeaderboardQuerySchema = z.object({
  chain: ChainSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})

// Tips endpoints
export const TipIngestSchema = z.object({
  fromFid: FIDSchema,
  toFid: FIDSchema,
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
})

// Farcaster endpoints
export const FarcasterBulkSchema = z.object({
  fids: z.array(FIDSchema).min(1).max(100),
})

// Snapshot endpoints
export const SnapshotCreateSchema = z.object({
  type: z.enum(['leaderboard', 'badges', 'quests']),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Cast endpoints  
export const CastBadgeShareSchema = z.object({
  fid: FIDSchema,
  badgeId: z.string().min(1),
  message: z.string().max(320).optional(),
})

// Onboard schema (already exists but documenting)
export const OnboardCompleteSchema = z.object({
  fid: FIDSchema,
  custodyAddress: AddressSchema.optional(),
  walletAddress: AddressSchema.optional(),
  verifiedAddresses: z.array(AddressSchema).optional(),
})

// Bot config endpoints
export const BotConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  autoReplyEnabled: z.boolean().optional(),
  statsEnabled: z.boolean().optional(),
  minEngagementThreshold: z.number().int().min(0).optional(),
  dailyPostLimit: z.number().int().min(0).max(100).optional(),
  responseTemplates: z.array(z.string()).optional(),
  blacklistedFids: z.array(FIDSchema).optional(),
  whitelistedFids: z.array(FIDSchema).optional(),
})

// Admin query schemas
export const AdminQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  timeframe: z.enum(['hour', 'day', 'week', 'month', 'all']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Badge upload schema
export const BadgeUploadSchema = z.object({
  badgeType: z.string().min(1, 'Badge type is required'),
  tier: z.enum(['mythic', 'legendary', 'epic', 'rare', 'common']),
  imageFile: z.string().min(1, 'Image file is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Frame action schema
export const FrameActionSchema = z.object({
  untrustedData: z.object({
    fid: FIDSchema,
    buttonIndex: z.number().int().min(1).max(4),
    inputText: z.string().optional(),
    castId: z.object({
      fid: FIDSchema,
      hash: z.string(),
    }).optional(),
    messageHash: z.string(),
    timestamp: z.number().int().positive(),
  }),
  trustedData: z.object({
    messageBytes: z.string(),
  }),
})

// Webhook payload schema (Neynar webhooks)
export const WebhookPayloadSchema = z.object({
  type: z.enum(['cast.created', 'user.updated', 'reaction.created', 'follow.created']),
  data: z.record(z.string(), z.unknown()),
  created_at: z.number().int().positive(),
})

// Admin auth schemas
export const AdminLoginSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required'),
  totp: z.string().optional(),
  remember: z.boolean().optional(),
})

// Season query schema
export const SeasonQuerySchema = z.object({
  chain: ChainSchema.optional(),
})

// Leaderboard sync schema
export const LeaderboardSyncSchema = z.object({
  chain: ChainSchema.optional(),
  force: z.boolean().optional(),
})
