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
  metadata: z.record(z.unknown()).optional(),
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
  proof: z.record(z.unknown()).optional(),
})

export const QuestClaimSchema = z.object({
  fid: FIDSchema,
  questId: z.string().uuid('Invalid quest ID format'),
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
  eventDetail: z.record(z.unknown()).optional(),
  points: z.number().int().min(0).optional(),
  chain: ChainSchema.optional(),
})

// Admin endpoints
export const AdminBadgeCreateSchema = z.object({
  name: z.string().min(1, 'Badge name is required'),
  description: z.string().min(1, 'Description is required'),
  tier: z.enum(['mythic', 'legendary', 'epic', 'rare', 'common']),
  imageUrl: z.string().url('Invalid image URL'),
  metadata: z.record(z.unknown()).optional(),
})

export const AdminBadgeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  tier: z.enum(['mythic', 'legendary', 'epic', 'rare', 'common']).optional(),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

