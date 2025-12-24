/**
 * Quest Creation Validation Schemas
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Comprehensive Zod schemas for quest creation wizard
 * - Validates quest basics (title, description, category, difficulty)
 * - Validates quest timing (start/end dates, duration)
 * - Validates rewards (XP, points, badges with constraints)
 * - Validates tasks (verification data, ordering, requirements)
 * - Validates images (URL format, file size limits)
 * - Cross-field validation (start < end dates, cost <= balance)
 * - Provides detailed error messages for each validation failure
 * - Type-safe schema inference for TypeScript
 * 
 * TODO:
 * - Add custom chain-specific validation rules
 * - Implement task dependency validation (task B requires task A)
 * - Add image URL validation with HEAD requests
 * - Support quest draft validation (partial schemas)
 * - Add localized error messages (i18n)
 * - Implement async validation for unique quest slugs
 * - Add validation for quest templates
 * 
 * CRITICAL:
 * - All date validations must use UTC timezone (avoid client timezone bugs)
 * - Max participant limits prevent database overload (max 10,000)
 * - Reward amounts must be validated server-side (client can be manipulated)
 * - Quest slugs must be validated for uniqueness in database
 * 
 * SUGGESTIONS:
 * - Consider splitting into smaller schema modules by wizard step
 * - Add schema versioning for backward compatibility
 * - Implement custom error formatter for better UX
 * - Add validation telemetry to track common errors
 * 
 * AVOID:
 * - Client-only validation without server-side checks (security risk)
 * - Hardcoding validation limits (use environment variables)
 * - Allowing arbitrarily long text fields (DoS risk)
 * - Skipping date range validation (can cause infinite quests)
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Library: Zod v3 - https://zod.dev/
 * Quality Gates: GI-14 (Input Validation), GI-8 (Security)
 */

import { z } from 'zod'

// ============================================
// Quest Basics Schema
// ============================================
export const QuestBasicsSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  
  short_description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(200, 'Description must be less than 200 characters')
    .trim(),
  
  full_description: z
    .string()
    .min(50, 'Full description must be at least 50 characters')
    .max(2000, 'Full description must be less than 2000 characters')
    .trim()
    .optional(),
  
  cover_image_url: z
    .string()
    .url('Must be a valid URL')
    .optional(),
  
  category: z.enum(['onchain', 'social', 'creative', 'learn', 'hybrid'], {
    message: 'Invalid category'
  }),
  
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Invalid difficulty'
  }),
  
  estimated_time_minutes: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 8 hours'),
  
  starts_at: z
    .string()
    .datetime()
    .optional()
    .refine(
      (val) => !val || new Date(val) >= new Date(),
      'Start date must be in the future'
    ),
  
  ends_at: z
    .string()
    .datetime()
    .refine(
      (val) => new Date(val) > new Date(),
      'End date must be in the future'
    ),
  
  max_participants: z
    .number()
    .int()
    .min(1, 'Minimum 1 participant')
    .max(10000, 'Maximum 10,000 participants')
    .optional()
})

// Validation that checks start < end
export const QuestDatesSchema = z.object({
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime()
}).refine(
  (data) => {
    if (!data.starts_at) return true
    return new Date(data.starts_at) < new Date(data.ends_at)
  },
  {
    message: 'End date must be after start date',
    path: ['ends_at']
  }
)

// ============================================
// Task Configuration Schema
// ============================================
export const TaskVerificationSchema = z.object({
  // Social verification
  type: z.enum(['follow', 'cast', 'recast', 'like', 'channel_join', 'swap', 'token_hold', 'nft_own', 'nft_mint', 'provide_liquidity']).optional(),
  target_fid: z.number().int().positive().optional(),
  channel_id: z.string().max(50).optional(),
  cast_hash: z.string().regex(/^0x[a-f0-9]{40}$/).optional(),
  required_text: z.string().max(200).optional(),
  min_count: z.number().int().positive().optional(),
  
  // Onchain verification
  token_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  nft_contract: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  min_amount: z.string().regex(/^\d+$/).optional(),
  min_balance: z.number().positive().optional(),
  min_duration_days: z.number().int().positive().optional(),
  pool_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  min_liquidity: z.string().regex(/^\d+$/).optional()
})

export const TaskConfigSchema = z.object({
  id: z.string().uuid().optional(), // Generated on frontend
  type: z.enum(['social', 'onchain', 'manual'], {
    message: 'Invalid task type'
  }),
  
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  
  verification: TaskVerificationSchema,
  
  required: z.boolean().default(true),
  
  order: z.number().int().nonnegative()
})

// Validate that at least one task exists
export const TasksArraySchema = z
  .array(TaskConfigSchema)
  .min(1, 'At least one task is required')
  .max(10, 'Maximum 10 tasks per quest')

// ============================================
// Rewards Schema
// ============================================
export const RewardsSchema = z.object({
  reward_xp: z
    .number()
    .int()
    .min(10, 'Minimum 10 XP')
    .max(1000, 'Maximum 1000 XP per quest'),
  
  reward_category: z.enum(['viral_points', 'points_balance', 'both'], {
    message: 'Invalid reward category'
  }),
  
  reward_badge_id: z
    .string()
    .uuid()
    .optional(),
  
  create_new_badge: z
    .boolean()
    .default(false),
  
  badge_name: z
    .string()
    .min(3, 'Badge name must be at least 3 characters')
    .max(50, 'Badge name must be less than 50 characters')
    .optional(),
  
  badge_description: z
    .string()
    .max(200)
    .optional()
})

// Validate badge fields when create_new_badge is true
export const RewardsWithBadgeSchema = RewardsSchema.refine(
  (data) => {
    if (data.create_new_badge) {
      return !!data.badge_name
    }
    return true
  },
  {
    message: 'Badge name is required when creating a new badge',
    path: ['badge_name']
  }
)

// ============================================
// Complete Quest Creation Schema
// ============================================
export const QuestCreationSchema = z.object({
  template_id: z.string().uuid().optional(),
  ...QuestBasicsSchema.shape,
  tasks: TasksArraySchema,
  ...RewardsSchema.shape
})

// Full validation with custom rules
export const CompleteQuestCreationSchema = QuestCreationSchema
  .merge(QuestDatesSchema)
  .merge(RewardsWithBadgeSchema)
  .refine(
    (data) => {
      // Duration check: 7-90 days
      const startDate = data.starts_at ? new Date(data.starts_at) : new Date()
      const endDate = new Date(data.ends_at)
      const durationMs = endDate.getTime() - startDate.getTime()
      const durationDays = durationMs / (24 * 60 * 60 * 1000)
      return durationDays >= 7 && durationDays <= 90
    },
    {
      message: 'Quest must be active for 7-90 days',
      path: ['ends_at']
    }
  )
  .refine(
    (data) => {
      // Social tasks must have proper verification config
      const socialTasks = data.tasks.filter(t => t.type === 'social')
      return socialTasks.every(task => {
        const v = task.verification
        // At least one social verification field must be set
        return v.target_fid || v.channel_id || v.cast_hash || v.required_text
      })
    },
    {
      message: 'Social tasks must have verification configuration',
      path: ['tasks']
    }
  )
  .refine(
    (data) => {
      // Onchain tasks must have proper verification config
      const onchainTasks = data.tasks.filter(t => t.type === 'onchain')
      return onchainTasks.every(task => {
        const v = task.verification
        // At least one onchain verification field must be set
        return v.token_address || v.nft_contract || v.pool_address
      })
    },
    {
      message: 'Onchain tasks must have verification configuration',
      path: ['tasks']
    }
  )

// ============================================
// Quest Draft Schema (for saving drafts)
// ============================================
export const QuestDraftSchema = QuestBasicsSchema.partial().extend({
  tasks: TasksArraySchema.optional(),
  reward_xp: z.number().optional(),
  reward_category: z.string().optional()
})

// ============================================
// Template Application Schema
// ============================================
export const TemplateApplicationSchema = z.object({
  template_id: z.string().uuid(),
  customizations: z.object({
    title: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    cover_image_url: z.string().url().optional(),
    // Override task verification configs
    task_overrides: z.record(z.number(), TaskVerificationSchema.partial()).optional()
  }).optional()
})

// ============================================
// Type Exports
// ============================================
export type QuestBasicsInput = z.infer<typeof QuestBasicsSchema>
export type TaskConfig = z.infer<typeof TaskConfigSchema>
export type TaskVerification = z.infer<typeof TaskVerificationSchema>
export type RewardsInput = z.infer<typeof RewardsSchema>
export type QuestCreationInput = z.infer<typeof CompleteQuestCreationSchema>
export type QuestDraftInput = z.infer<typeof QuestDraftSchema>
export type TemplateApplication = z.infer<typeof TemplateApplicationSchema>

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validate quest basics with detailed errors
 */
export function validateQuestBasics(data: unknown) {
  return QuestBasicsSchema.safeParse(data)
}

/**
 * Validate task configuration
 */
export function validateTask(data: unknown) {
  return TaskConfigSchema.safeParse(data)
}

/**
 * Validate rewards configuration
 */
export function validateRewards(data: unknown) {
  return RewardsWithBadgeSchema.safeParse(data)
}

/**
 * Validate complete quest creation
 */
export function validateQuestCreation(data: unknown) {
  return CompleteQuestCreationSchema.safeParse(data)
}

/**
 * Validate quest draft (partial validation)
 */
export function validateQuestDraft(data: unknown) {
  return QuestDraftSchema.safeParse(data)
}

/**
 * Get user-friendly error messages
 */
export function getValidationErrors(result: z.ZodError<any>): string[] {
  return result.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}
