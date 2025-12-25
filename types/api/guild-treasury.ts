/**
 * Guild Treasury API Types
 * 
 * Zod schemas for runtime validation of treasury API responses.
 * Ensures type safety between API (Layer 4) and UI components.
 * 
 * 4-Layer Architecture:
 * - Layer 1 (Contract): guildTreasuryPoints (camelCase - SOURCE OF TRUTH)
 * - Layer 2 (Subsquid): treasuryPoints (camelCase)
 * - Layer 3 (Supabase): guild_events table (snake_case)
 * - Layer 4 (API): Returns camelCase per naming conventions
 */

import { z } from 'zod'

/**
 * Transaction schema - matches API response from Layer 4
 * Fields use camelCase per 4-layer architecture
 */
export const TreasuryTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['deposit', 'claim']),
  amount: z.number(),
  from: z.string(),
  username: z.string(),
  timestamp: z.string(),
  status: z.enum(['completed', 'pending']),
  // Layer 4 (API) camelCase fields - transformed from Layer 3 snake_case
  transactionHash: z.string().nullable().optional(),
  createdAt: z.string().optional(),
})

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
})

/**
 * Performance metrics schema
 */
export const PerformanceSchema = z.object({
  duration: z.number(),
})

/**
 * Full treasury API response schema
 */
export const TreasuryResponseSchema = z.object({
  success: z.boolean(),
  balance: z.string(), // Contract returns string (BigInt safe)
  transactions: z.array(TreasuryTransactionSchema),
  pagination: PaginationSchema,
  performance: PerformanceSchema.optional(),
  timestamp: z.number(),
})

/**
 * TypeScript types derived from Zod schemas
 */
export type TreasuryTransaction = z.infer<typeof TreasuryTransactionSchema>
export type TreasuryPagination = z.infer<typeof PaginationSchema>
export type TreasuryResponse = z.infer<typeof TreasuryResponseSchema>

/**
 * Error response schema
 */
export const TreasuryErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  timestamp: z.number().optional(),
})

export type TreasuryError = z.infer<typeof TreasuryErrorSchema>
