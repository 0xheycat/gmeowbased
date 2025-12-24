/**
 * STUB: Viral bonus calculation module
 * TODO: Implement viral bonus tier logic
 */

export interface ViralBonusConfig {
  enabled: boolean
  tiers: ViralBonusTier[]
}

export interface ViralBonusTier {
  minEngagement: number
  bonusMultiplier: number
  displayName: string
}

export const DEFAULT_VIRAL_CONFIG: ViralBonusConfig = {
  enabled: false,
  tiers: []
}

export function calculateViralBonus(engagement: number): number {
  return 0
}
