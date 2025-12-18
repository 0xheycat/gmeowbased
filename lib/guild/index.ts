/**
 * @file lib/guild/index.ts
 * @description Guild system barrel exports for event logging and management
 * 
 * PHASE: Phase 7.8 - Guild Module (December 18, 2025)
 * 
 * FEATURES:
 *   - Event logging exports (logGuildEvent, getGuildEvents)
 *   - Guild event types (8 lifecycle events)
 *   - Audit trail infrastructure
 *   - Activity feed data access
 * 
 * REFERENCE DOCUMENTATION:
 *   - Event Logger: lib/guild/event-logger.ts (Phase 7.6 comprehensive header)
 *   - Contract Integration: lib/contracts/guild-contract.ts
 *   - API Usage: app/api/guild/[guildId]/events/route.ts
 *   - Database Schema: guild_events table (types/supabase.ts)
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain
 *   - Supabase Admin Client required for event writes
 * 
 * TODO:
 *   - [ ] Add guild metadata management exports
 *   - [ ] Export guild member utilities
 *   - [ ] Add guild treasury helpers
 *   - [ ] Export guild search and discovery
 * 
 * CRITICAL:
 *   - Only 2 files in this module (event-logger.ts + index.ts)
 *   - Event logger already has comprehensive Phase 7.6 header
 *   - Guild management happens via smart contracts (not database)
 * 
 * SUGGESTIONS:
 *   - Consider adding guild analytics exports
 *   - Add guild notification helpers
 *   - Export guild governance utilities
 * 
 * AVOID:
 *   - ❌ DON'T duplicate contract logic here (use lib/contracts/guild-contract.ts)
 *   - ❌ DON'T add database write operations (use event sourcing pattern)
 */

export * from './event-logger'
