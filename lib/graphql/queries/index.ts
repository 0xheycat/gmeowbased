/**
 * GraphQL Queries Export
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Centralized export for all GraphQL queries
 */

// User Stats Queries
export {
  GET_USER_STATS,
  GET_USER_SCORING,
  GET_USERS_STATS,
  GET_USER_POINT_BREAKDOWN,
  GET_USER_PROGRESSION,
} from './user-stats'

// Leaderboard Queries
export {
  GET_GLOBAL_LEADERBOARD,
  GET_LEADERBOARD_BY_TIER,
  GET_TOP_USERS,
  GET_USER_LEADERBOARD_POSITION,
  GET_WEEKLY_LEADERBOARD,
  GET_MONTHLY_LEADERBOARD,
} from './leaderboard'

// User History Queries
export {
  GET_USER_LEVEL_UPS,
  GET_USER_RANK_UPS,
  GET_USER_STATS_HISTORY,
  GET_USER_COMPLETE_HISTORY,
  GET_RECENT_LEVEL_UPS,
  GET_RECENT_RANK_UPS,
  GET_STATS_BY_TRIGGER,
} from './user-history'
