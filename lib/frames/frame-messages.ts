/**
 * @file lib/frames/frame-messages.ts
 * @description Rich text message builder for frame action responses
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Phase 1B: Rich Text Message Builder
 * 
 * FEATURES:
 *   - Success message formatting
 *   - Error message templates
 *   - CTA link embedding
 *   - Image URL inclusion
 *   - Multi-line message support
 *   - Action result descriptions
 * 
 * Utilities for building formatted post-action messages in frame responses.
 * These messages appear in the feed after users click frame buttons.
 * 
 * REFERENCE DOCUMENTATION:
 *   - Farcaster frames: https://docs.farcaster.xyz/reference/frames/spec
 *   - Frame handlers: lib/frames/handlers/
 * 
 * REQUIREMENTS:
 *   - Messages must be concise and clear
 *   - NO EMOJIS in messages
 *   - Include relevant links when available
 *   - Format must be readable in feed
 * 
 * TODO:
 *   - [ ] Add message templates per action type
 *   - [ ] Add multi-language message support
 *   - [ ] Add message analytics tracking
 *   - [ ] Add message A/B testing
 *   - [ ] Add rich media message support
 *   - [ ] Add message personalization
 * 
 * CRITICAL:
 *   - Messages must be feed-safe (no XSS)
 *   - Links must be absolute URLs
 *   - CTA labels must be clear and actionable
 *   - Error messages must be user-friendly
 *   - Messages must not expose sensitive data
 * 
 * SUGGESTIONS:
 *   - Add message preview before sending
 *   - Track message click-through rates
 *   - Generate contextual messages
 *   - Add message sentiment analysis
 *   - Support rich formatting when available
 * 
 * AVOID:
 *   - Generic error messages (be specific)
 *   - Overly long messages (truncate smartly)
 *   - Using emojis (compatibility issues)
 *   - Exposing technical errors to users
 *   - Hardcoding message text
 */

export interface SuccessMessageParams {
  title: string
  description?: string
  imageUrl?: string
  ctaUrl?: string
  ctaLabel?: string
}

/**
 * Build a rich formatted message for successful frame actions
 * @param params - Message parameters (title, description, imageUrl, ctaUrl, ctaLabel)
 * @returns Formatted message string
 */
export function buildSuccessMessage(params: SuccessMessageParams): string {
  const parts = [params.title]

  if (params.description) {
    parts.push('\n' + params.description)
  }

  if (params.ctaUrl) {
    const label = params.ctaLabel || 'Learn More'
    parts.push(`\n\n${label}: ${params.ctaUrl}`)
  }

  if (params.imageUrl) {
    parts.push(`\n\n[Image Preview](${params.imageUrl})`)
  }

  return parts.join('')
}

/**
 * Build a GM success message
 */
export function buildGMSuccessMessage(params: {
  fid: number
  streak: number
  gmCount: number
  baseUrl: string
}): string {
  return buildSuccessMessage({
    title: '🌅 GM Recorded!',
    description: `Streak: ${params.streak} days • Total GMs: ${params.gmCount}`,
    imageUrl: `${params.baseUrl}/api/frame/image?type=gm&fid=${params.fid}`,
    ctaUrl: `${params.baseUrl}/leaderboard`,
    ctaLabel: 'View Leaderboard',
  })
}

/**
 * Build a quest completion message
 */
export function buildQuestCompleteMessage(params: {
  questTitle: string
  points: number
  baseUrl: string
}): string {
  return buildSuccessMessage({
    title: `✅ Quest Complete: ${params.questTitle}`,
    description: `+${params.points} points earned!`,
    ctaUrl: `${params.baseUrl}/Quest`,
    ctaLabel: 'View All Quests',
  })
}

/**
 * Build a quest progress message
 */
export function buildQuestProgressMessage(params: {
  questTitle: string
  currentStep: number
  totalSteps: number
  baseUrl: string
}): string {
  return buildSuccessMessage({
    title: `📝 Quest Progress: ${params.questTitle}`,
    description: `Step ${params.currentStep}/${params.totalSteps} complete`,
    ctaUrl: `${params.baseUrl}/Quest`,
    ctaLabel: 'Continue Quest',
  })
}

/**
 * Build a guild join message
 */
export function buildGuildJoinMessage(params: {
  guildName: string
  memberCount: number
  baseUrl: string
}): string {
  return buildSuccessMessage({
    title: `🏰 Joined ${params.guildName}!`,
    description: `You're now among ${params.memberCount} members`,
    ctaUrl: `${params.baseUrl}/Guild`,
    ctaLabel: 'View Guild',
  })
}

/**
 * Build an error message
 */
export function buildErrorMessage(title: string, description?: string): string {
  const parts = [`❌ ${title}`]
  if (description) {
    parts.push('\n' + description)
  }
  return parts.join('')
}
