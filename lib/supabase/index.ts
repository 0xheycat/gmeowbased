/**
 * Supabase Database Layer - Organized exports
 * 
 * PostgreSQL client for server-side and client-side operations
 * 
 * Note: Some query functions have duplicate names across files.
 * Import directly from specific query files when needed:
 * - queries/gm.ts - GM-specific queries
 * - queries/user.ts - User profile queries
 * - queries/leaderboard.ts - Leaderboard queries
 * - queries/guild.ts - Guild queries
 * - queries/quests.ts - Quest queries
 */

export * from './server'
export * from './mock-quest-data'

// Queries are available but should be imported directly to avoid conflicts
// export * from './queries/gm'
// export * from './queries/guild'
// export * from './queries/leaderboard'
// export * from './queries/quests'
// export * from './queries/user'
