/**
 * Supabase Database Layer - Organized exports
 * 
 * PostgreSQL client for server-side and client-side operations
 * 
 * File structure:
 * - client.ts: Server-side client factory (previously supabase-server.ts, 44 imports)
 * - edge.ts: Edge-safe client with ServerCache (previously supabase.ts, 9 imports)
 * - server.ts: Standard createClient wrapper for API routes
 * - queries/: Query builders for different domains
 * - mock-quest-data.ts: Test data
 * 
 * Import patterns:
 * - Server: import { getSupabaseServerClient } from '@/lib/supabase/edge'
 * - Edge: import { getEdgeSupabaseClient } from '@/lib/supabase/edge'
 * - API Routes: import { createClient } from '@/lib/supabase/server'
 * 
 * Note: Some query functions have duplicate names across files.
 * Import directly from specific query files when needed:
 * - queries/gm.ts - GM-specific queries
 * - queries/user.ts - User profile queries
 * - queries/leaderboard.ts - Leaderboard queries
 * - queries/guild.ts - Guild queries
 * - queries/quests.ts - Quest queries
 */

// Main client exports (previously root level files)
// Note: Export selectively to avoid conflicts between client and server
export { getSupabaseServerClient, isSupabaseConfigured } from './edge'  // supabase-server.ts
export * from './edge'    // supabase.ts
export { createClient } from './server'  // wrapper

// Mock data
export * from './mock-quest-data'

// Queries are available but should be imported directly to avoid conflicts
// export * from './queries/gm'
// export * from './queries/guild'
// export * from './queries/leaderboard'
// export * from './queries/quests'
// export * from './queries/user'
