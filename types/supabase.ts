// Re-export properly generated types from Supabase MCP
// Generated on December 18, 2025
// CRITICAL: DO NOT REGENERATE FROM SCRATCH
// - Use Supabase MCP only for verification (mcp_supabase_list_tables)
// - Add new tables manually by copying schema from MCP output
// - Insert new table definitions alphabetically in Tables section
// - This prevents breaking existing type definitions
//
// Manual additions:
// - 2025-12-21: guild_stats_cache (line 246)
// - 2025-12-21: reward_claims (line 1257)

export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './supabase.generated';
export { Constants } from './supabase.generated';
