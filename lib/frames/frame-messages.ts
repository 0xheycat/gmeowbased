/**
 * Phase 1B: Rich Text Message Builder
 * 
 * Utilities for building formatted post-action messages in frame responses.
 * These messages appear in the feed after users click frame buttons.
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
