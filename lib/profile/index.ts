/**
 * Profile System - Organized exports
 * 
 * User profile management and stats calculation
 * 
 * Note: StatsCalculationResult is defined in both stats-calculator and types
 * We export types first to use the canonical definition
 */

export * from './types'
export * from './profile-service'
export { calculateStats } from './stats-calculator'
