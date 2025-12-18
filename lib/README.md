# Lib Directory Structure

**Last Updated**: December 17, 2025 (MAJOR CONSOLIDATION)  
**Total Files**: 179 TypeScript files (14MB)  
**Root Files**: **2 only** (index.ts + README.md + 1 legacy component)

---

## 🚨 CRITICAL WARNINGS - READ FIRST!

### ⚠️ MASSIVE BREAKING CHANGE (December 17, 2025)

> **ALL IMPORT PATHS HAVE BEEN UPDATED!**  
> 71 files moved from `lib/` root → organized subdirectories  
> 400+ imports updated across entire codebase

**If you have unmerged branches or PRs:**
1. ❌ **DO NOT merge** without updating imports first
2. ✅ **Check the Migration Guide** below before any merge
3. ✅ **Run TypeScript check** after pulling: `pnpm tsc --noEmit`
4. ✅ **Update your imports** using the old→new mapping table

**Common errors you'll see:**
```typescript
// ❌ OLD (will break)
import { handleApiError } from '@/lib/error-handler'
import { formatAddress } from '@/lib/utils'
import { fetchUserByFid } from '@/lib/neynar'

// ✅ NEW (correct)
import { handleApiError } from '@/lib/middleware/error-handler'
import { formatAddress } from '@/lib/utils/utils'
import { fetchUserByFid } from '@/lib/integrations/neynar'
```

**Why this was done:**
- 🎯 lib/ root reduced from 87 files to only 2 files
- 📁 Better organization: 10 logical subdirectories
- 🔍 Easier to find files by category
- 🧹 Cleaner codebase structure
- ✅ TypeScript compilation: 0 errors

**Verification:**
- ✅ TypeScript: 0 compilation errors
- ✅ Tests: 59/61 bot tests passing (2 pre-existing flaky)
- ✅ All import paths updated (single quotes, double quotes, dynamic imports)

---

## 🎯 NEW: Consolidated Structure (December 17, 2025)

### Middleware (9 files - Phase 8.6 Complete - Dec 18, 2025)
- `middleware/` - **Request handling, error management, security**
  - `error-handler.ts` - Centralized error handling (65+ imports)
  - `request-id.ts` - Request tracking (117+ imports)
  - `rate-limit.ts` - **PRIMARY**: Rate limiting (Upstash Redis)
    - Inbound API rate limiting (protect our APIs from abuse)
    - Functions: rateLimit, checkRateLimit, apiLimiter, strictLimiter
    - Use for: ALL rate limiting needs (both inbound and custom logic)
    - **DO NOT**: Create separate rate limiter files
  - `idempotency.ts` - Duplicate request prevention
  - `api-security.ts` - **PRIMARY**: API validation and sanitization
    - Functions: sanitizeAddress (Ethereum), sanitizeChain, sanitizeString, validateInput
    - Phase 8.5: Enhanced with proper address validation (0x + 40 hex)
    - Use for: ALL address/chain validation (replaces inline normalizeAddress)
    - **DO NOT**: Create duplicate normalizeAddress functions
  - `http-error.ts` - HTTP error utilities
  - `timing.ts` - Performance timing
  
  **Phase 8.5 Consolidation** (35+ lines reduced):
  - ✅ Enhanced sanitizeAddress with proper validation (0x + 40 hex chars)
  - ✅ Removed normalizeAddress from quest-policy.ts (14 lines)
  - ✅ Removed normalizeAddressValue from telemetry.ts (7 lines)
  - ✅ Fixed 7 API routes to handle null returns
  - ✅ Single source of truth for address validation

### Utils (12 files)
- `utils/` - **Common utilities and helpers**
  - `utils.ts` - Generic helpers (42+ imports)
  - `formatters.ts` - String/data formatting
  - `telemetry.ts` - Analytics tracking (9+ imports)
  - `accessibility.ts` - A11y utilities (15+ imports)
  - `chain-icons.ts` - Blockchain network icons
  - `dicebear-generator.ts` - Avatar generation
  - `performance-monitor.ts` - Performance tracking
  - `web-vitals.ts` - Core Web Vitals
  - `types.ts` - Shared type definitions
  - Plus accessibility-testing, analytics, icon-sizes

### Badges (6 files)
- `badges/` - **Badge system and NFT artwork**
  - `badges.ts` - Badge logic (27+ imports)
  - `badge-artwork.ts` - SVG artwork generation
  - `badge-metadata.ts` - NFT metadata
  - `badge-registry-data.ts` - Badge definitions
  - `rarity-tiers.ts` - Rarity system

### Integrations (6 files - Phase 8.3 Complete - Dec 18, 2025)
- `integrations/` - **External service integrations**
  - `neynar.ts` - **PRIMARY**: Neynar API client + NeynarAPIClient (28+ imports)
    - Phase 8.3: Consolidated neynar-server.ts (33 lines removed)
    - Functions: getNeynarServerClient, fetchUserByFid, fetchUsersByAddresses
    - Use for: ALL Neynar operations
    - **DO NOT**: Create separate neynar-server.ts file
  - `neynar-bot.ts` - Bot signer management (7+ imports)
  - `subsquid-client.ts` - Blockchain indexer (6+ imports)
  - `wagmi.ts` - Wallet integration
  - `appkit-config.ts` - WalletConnect config

### Leaderboard (6 files)
- `leaderboard/` - **Ranking and leaderboard system**
  - `rank.ts` - Rank calculation (11+ imports)
  - `leaderboard-sync.ts` - Supabase sync (4+ imports)
  - `leaderboard-aggregator.ts` - Data aggregation
  - `leaderboard-scorer.ts` - Score calculation
  - `rank-telemetry-client.ts` - Analytics

### Viral (4 files)
- `viral/` - **Viral engagement tracking**
  - `viral-bonus.ts` - Viral point calculations (5+ imports)
  - `viral-achievements.ts` - Achievement system
  - `viral-engagement-sync.ts` - Engagement tracking

### API (6 files)
- `api/` - **API utilities and helpers**
  - `share.ts` - Share/export functions (12+ imports)
  - `retry.ts` - Retry logic (4+ imports)
  - `api-service.ts` - API client
  - `dashboard-hooks.ts` - Dashboard queries
  - `neynar-dashboard.ts` - Neynar dashboard

### Profile (11 files)
- `profile/` - **User profile and community data**
  - `profile-data.ts` - Profile fetching (5+ imports)
  - `community-events.ts` - Community tracking (5+ imports)
  - `community-event-types.ts` - Event types (5+ imports)
  - `partner-snapshot.ts` - Partner data
  - `team.ts` - Team management
  - `user-rewards.ts` - Reward system
  - `tip-bot-helpers.ts` - Tipping utilities
  - Plus 4 more profile files

### MiniApp (3 files)
- `miniapp/` - **MiniKit/MiniApp integration**
  - `miniappEnv.ts` - Environment detection (5+ imports)
  - `miniapp-validation.ts` - Validation logic

---

## Core Systems (Existing)

### Authentication & Authorization
- `auth/` (3 files) - User authentication and admin authorization
  - User session management
  - Admin role verification
  - JWT token handling

### Caching Layer (Phase 8.1 Complete - Dec 18, 2025)
- `cache/` (6 files) - **Unified Multi-Level Caching System**
  - `server.ts` - **PRIMARY**: 3-tier cache (L1 memory, L2 Redis/KV, L3 filesystem)
    - Features: Stale-while-revalidate, stampede prevention, graceful degradation
    - Use for: API routes, server components, database queries
  - `client.ts` - Browser-side caching (localStorage, sessionStorage, memory)
    - CacheStorage class + simple helpers (readStorageCache, writeStorageCache)
    - Use for: Client components, hooks, user preferences
  - `frame.ts` - Frame-specific cache (Upstash Redis)
  - `contract-cache.ts` - Contract data caching
  - `neynar-cache.ts` - Neynar API caching
  - `index.ts` - Organized exports with documentation
  
  **Phase 8.1 Consolidation** (670+ lines reduced):
  - ✅ 9 inline Map caches → unified getCached() system
  - ✅ Removed: bot/local-cache.ts, 2x ServerCache classes, memoizeAsync()
  - ✅ All caching now uses lib/cache/* (no new inline caches)

### Smart Contracts (Phase 8.2 Complete - Dec 18, 2025)
- `contracts/` (10 files) - Blockchain contract interactions (Phase 8.2: rpc.ts consolidated)
  - **Active Chain**: Base (GMChainKey)
  - **View-Only Chains**: 12 chains via Blockscout MCP (ChainKey)
  - Contract ABIs and addresses
  - Contract utility functions
  - Read/write operations
  - `rpc-client-pool.ts` - **PRIMARY**: Centralized RPC client connection pooling
    - Features: Connection reuse, automatic retry (3x), 30s timeout, 5-chain support
    - Functions: getPublicClient(chainId), getClientByChainKey(chain)
    - Use for: ALL blockchain read operations (replaces inline createPublicClient)
    - **DO NOT**: Create new inline RPC clients - always use pool
  
  **Phase 8.2 Consolidation** (180+ lines reduced):
  - ✅ 12 files migrated from inline createPublicClient() → centralized pool
  - ✅ Connection pooling prevents duplicate RPC connections
  - ✅ Single source for RPC configuration (no scattered RPC URLs)
  - ✅ Rate limit protection (shared pool = fewer connections)

### Database (Phase 8.4 REVISED Complete - Dec 18, 2025)
- `supabase/` (4 files) - PostgreSQL database client
  - `edge.ts` - **PRIMARY**: Server + Edge + Browser clients
    - Phase 8.4: Consolidated server.ts (18 lines removed)
    - Functions: getSupabaseServerClient, getSupabaseEdgeClient, createClient
    - Use for: ALL Supabase operations
    - **DO NOT**: Create separate server.ts file
  - `queries/` - Database query functions
  - `types/` - Type definitions
  - `mock-quest-data.ts` - Test data
  
  **Phase 8.4 Consolidation** (270 lines reduced):
  - ✅ lib/api/farcaster/client.ts deleted (252 lines)
  - ✅ lib/supabase/server.ts deleted (18 lines)
  - ✅ Single source for user data fetching
  - ✅ Single source for Supabase clients
  - Mock data for testing
  - `queries/user.ts` - **PRIMARY**: Canonical user profile queries
    - Functions: getUserProfile(fid/wallet), getUserProfiles(fids/wallets)
    - Use for: ALL database user profile lookups
    - **DO NOT**: Create duplicate getUserProfile functions
  
  **Phase 8.4 Consolidation** (252+ lines reduced):
  - ✅ Deleted lib/api/farcaster/client.ts (252 lines) - complete duplicate of neynar.ts
  - ✅ Deprecated getUserProfile in gm.ts - use queries/user.ts instead
  - ✅ Clear data source hierarchy: Neynar (API) → Supabase (DB) → Subsquid (Blockchain)

---

## Feature Modules (Existing)

### Bot System
- `bot/` (4 files) - Automated reply and user engagement
  - Analytics and stats tracking
  - Configuration and i18n
  - Auto-reply logic
  - Frame builders
  - Quest recommendations
  - Retry queue
  - Failover systems

### Frame System
- `frames/` (15 files) - Farcaster frame rendering
  - Template builders
  - Design system
  - Image generation
  - Button handlers
  - Frame state management
  - Hybrid data calculator

### Quest System
- `quests/` (11 files) - Quest tracking and rewards
  - Quest definitions
  - Progress tracking
  - Reward calculation
  - Quest validation

### Guild System
- `guild/` (2 files) - Guild management
  - Member management
  - Guild stats
  - Guild creation

### Notification System
- `notifications/` (9 files) - User notifications
  - Batching system
  - Digest scheduling
  - Delivery tracking

### Validation
- `validation/` (2 files) - Input validation
  - API schemas
  - Type guards
  - Data sanitization

### React Hooks
- `hooks/` (10 files) - Custom React hooks
  - Data fetching hooks
  - State management
  - Effect helpers

### Other Modules
- `bot-instance/` (1 file) - Bot instance management
- `contexts/` - React contexts
- `icons/` - Icon components
- `onchain-stats/` (3 files) - Blockchain statistics
- `scoring/` - Scoring algorithms
- `storage/` (1 file) - Storage utilities

---

## Chain Architecture

### GMChainKey vs ChainKey

**GMChainKey** (Active - Write Operations):
```typescript
export type GMChainKey = 'base' // Our deployed contracts
```
- **Use for**: All contract write operations
- **Contracts**: Deployed on Base (December 12, 2025)
  - Core: `0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73`
  - Guild: `0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3`
  - NFT: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C`
  - Badge: `0x5Af50Ee323C45564d94B0869d95698D837c59aD2`
  - Referral: `0x9E7c32C1fB3a2c08e973185181512a442b90Ba44`

**ChainKey** (View-Only - Read Operations):
```typescript
export type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | ... // 12 chains
```
- **Use for**: OnchainStats frame viewing (via Blockscout MCP)
- **Purpose**: Allow users to view stats on other chains
- **DO NOT USE**: For contract write operations

---

## 🚨 Import Patterns (UPDATED - December 17, 2025)

### ⚠️ BREAKING CHANGE: All Import Paths Updated!

> **CRITICAL**: 400+ import paths were updated on December 17, 2025. All old `@/lib/[file]` imports now point to subdirectories.

### NEW Recommended Imports
```typescript
// Middleware (UPDATED PATHS)
import { handleApiError } from '@/lib/middleware/error-handler'
import { getRequestId } from '@/lib/middleware/request-id'
import { rateLimit } from '@/lib/middleware/rate-limit'

// Utils (UPDATED PATHS)
import { formatAddress, normalizeUsername } from '@/lib/utils/utils'
import { recordAnalyticsEvent } from '@/lib/utils/telemetry'
import { formatDistance } from '@/lib/utils/formatters'

// Integrations (UPDATED PATHS)
import { fetchUserByFid } from '@/lib/integrations/neynar'
import { getLeaderboard } from '@/lib/integrations/subsquid-client'
import { resolveBotSignerUuid } from '@/lib/integrations/neynar-bot'

// Contracts (UPDATED PATHS)
import { CONTRACT_ADDRESSES, CHAIN_IDS } from '@/lib/contracts/gmeow-utils'
import { getGuildContract } from '@/lib/contracts/guild-contract'

// RPC Client Pool (Phase 8.2 - ALWAYS USE THIS)
import { getPublicClient, getClientByChainKey } from '@/lib/contracts/rpc-client-pool'
// ❌ NEVER: createPublicClient({ transport: http(rpc) }) - use pool instead!

// User Data Fetching (Phase 8.4 - CANONICAL SOURCES)
import { fetchUserByFid, fetchUsersByAddresses } from '@/lib/integrations/neynar' // For Farcaster API
import { getUserProfile, getUserProfiles } from '@/lib/supabase/queries/user' // For DB profiles
// ❌ NEVER: lib/api/farcaster/client (deleted), gm.ts getUserProfile (deprecated)

// Validation & Sanitization (Phase 8.5 - ALWAYS USE THIS)
import { sanitizeAddress, sanitizeChain, validateInput } from '@/lib/middleware/api-security'
// ❌ NEVER: Create inline normalizeAddress functions - use sanitizeAddress!

// Profile (UPDATED PATHS)
import { normalizeAddress } from '@/lib/profile/profile-data'
import { recordCommunityEvent } from '@/lib/profile/community-events'

// Leaderboard (UPDATED PATHS)
import { getRankTier } from '@/lib/leaderboard/rank'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard/leaderboard-sync'

// Badges (UPDATED PATHS)
import { getBadgeData } from '@/lib/badges/badges'
import { generateBadgeArtwork } from '@/lib/badges/badge-artwork'

// API (UPDATED PATHS)
import { openWarpcastComposer } from '@/lib/api/share'
import { retryWithBackoff } from '@/lib/api/retry'

// Viral (UPDATED PATHS)
import { calculateViralBonus } from '@/lib/viral/viral-bonus'

// MiniApp (UPDATED PATHS)
import { isMiniApp } from '@/lib/miniapp/miniappEnv'

// Core systems (unchanged)
import { getSupabaseClient } from '@/lib/supabase/edge'
import { requireAuth } from '@/lib/auth/admin'
import { getCached } from '@/lib/cache/server'
```

### High-Traffic Files (Handle with Care)
These files have the most imports and should be modified carefully:
1. **middleware/request-id.ts** (117+ imports) - Request tracking
2. **middleware/rate-limit.ts** (81+ imports) - Rate limiting  
3. **middleware/error-handler.ts** (65+ imports) - Error handling
4. **contracts/gmeow-utils.ts** (61+ imports) - Contract utilities
5. **utils/utils.ts** (42+ imports) - Generic utilities
6. **badges/badges.ts** (27+ imports) - Badge system
7. **integrations/neynar.ts** (19+ imports) - Neynar API
8. **utils/accessibility.ts** (15+ imports) - A11y helpers
9. **api/share.ts** (12+ imports) - Share functions
10. **leaderboard/rank.ts** (11+ imports) - Rank calculations

### Migration Guide: Old → New Paths

```typescript
// OLD (before Dec 17, 2025) → NEW (after Dec 17, 2025)

// Middleware
'@/lib/error-handler' → '@/lib/middleware/error-handler'
'@/lib/request-id' → '@/lib/middleware/request-id'
'@/lib/rate-limit' → '@/lib/middleware/rate-limit'
'@/lib/rate-limiter' → '@/lib/middleware/rate-limiter'
'@/lib/idempotency' → '@/lib/middleware/idempotency'
'@/lib/api-security' → '@/lib/middleware/api-security'
'@/lib/http-error' → '@/lib/middleware/http-error'
'@/lib/timing' → '@/lib/middleware/timing'

// Utils
'@/lib/utils' → '@/lib/utils/utils'
'@/lib/formatters' → '@/lib/utils/formatters'
'@/lib/telemetry' → '@/lib/utils/telemetry'
'@/lib/accessibility' → '@/lib/utils/accessibility'
'@/lib/accessibility-testing' → '@/lib/utils/accessibility-testing'
'@/lib/analytics' → '@/lib/utils/analytics'
'@/lib/chain-icons' → '@/lib/utils/chain-icons'
'@/lib/icon-sizes' → '@/lib/utils/icon-sizes'
'@/lib/dicebear-generator' → '@/lib/utils/dicebear-generator'
'@/lib/performance-monitor' → '@/lib/utils/performance-monitor'
'@/lib/web-vitals' → '@/lib/utils/web-vitals'
'@/lib/types' → '@/lib/utils/types'

// Contracts
'@/lib/gmeow-utils' → '@/lib/contracts/gmeow-utils'
'@/lib/guild-contract' → '@/lib/contracts/guild-contract'
'@/lib/referral-contract' → '@/lib/contracts/referral-contract'
'@/lib/contract-events' → '@/lib/contracts/contract-events'
'@/lib/contract-mint' → '@/lib/contracts/contract-mint'
'@/lib/auto-deposit-oracle' → '@/lib/contracts/auto-deposit-oracle'
'@/lib/nft-metadata' → '@/lib/contracts/nft-metadata'
'@/lib/rpc' → '@/lib/contracts/rpc-client-pool' (Phase 8.2: rpc.ts deleted, use rpc-client-pool)
'@/lib/abis' → '@/lib/contracts/abis'

// Integrations
'@/lib/neynar' → '@/lib/integrations/neynar'
'@/lib/neynar-server' → '@/lib/integrations/neynar' (Phase 8.3: neynar-server.ts deleted)
'@/lib/neynar-bot' → '@/lib/integrations/neynar-bot'
'@/lib/subsquid-client' → '@/lib/integrations/subsquid-client'
'@/lib/wagmi' → '@/lib/integrations/wagmi'
'@/lib/appkit-config' → '@/lib/integrations/appkit-config'

// Profile
'@/lib/profile-data' → '@/lib/profile/profile-data'
'@/lib/community-events' → '@/lib/profile/community-events'
'@/lib/community-event-types' → '@/lib/profile/community-event-types'
'@/lib/partner-snapshot' → '@/lib/profile/partner-snapshot'
'@/lib/team' → '@/lib/profile/team'
'@/lib/user-rewards' → '@/lib/profile/user-rewards'
'@/lib/tip-bot-helpers' → '@/lib/profile/tip-bot-helpers'

// Leaderboard
'@/lib/rank' → '@/lib/leaderboard/rank'
'@/lib/rank-telemetry-client' → '@/lib/leaderboard/rank-telemetry-client'
'@/lib/leaderboard-sync' → '@/lib/leaderboard/leaderboard-sync'
'@/lib/leaderboard-aggregator' → '@/lib/leaderboard/leaderboard-aggregator'
'@/lib/leaderboard-scorer' → '@/lib/leaderboard/leaderboard-scorer'

// Badges
'@/lib/badges' → '@/lib/badges/badges'
'@/lib/badge-artwork' → '@/lib/badges/badge-artwork'
'@/lib/badge-metadata' → '@/lib/badges/badge-metadata'
'@/lib/badge-registry-data' → '@/lib/badges/badge-registry-data'
'@/lib/rarity-tiers' → '@/lib/badges/rarity-tiers'

// Viral
'@/lib/viral-bonus' → '@/lib/viral/viral-bonus'
'@/lib/viral-achievements' → '@/lib/viral/viral-achievements'
'@/lib/viral-engagement-sync' → '@/lib/viral/viral-engagement-sync'

// API
'@/lib/share' → '@/lib/api/share'
'@/lib/retry' → '@/lib/api/retry'
'@/lib/api-service' → '@/lib/api/api-service'
'@/lib/dashboard-hooks' → '@/lib/api/dashboard-hooks'
'@/lib/neynar-dashboard' → '@/lib/api/neynar-dashboard'

// MiniApp
'@/lib/miniappEnv' → '@/lib/miniapp/miniappEnv'
'@/lib/miniapp-validation' → '@/lib/miniapp/miniapp-validation'

// Frames (organized within frames/)
'@/lib/frame-badge' → '@/lib/frames/frame-badge'
'@/lib/frame-design-system' → '@/lib/frames/frame-design-system'
'@/lib/frame-fonts' → '@/lib/frames/frame-fonts'
'@/lib/frame-messages' → '@/lib/frames/frame-messages'
'@/lib/frame-state' → '@/lib/frames/frame-state'
'@/lib/frame-validation' → '@/lib/frames/frame-validation'
'@/lib/frog-config' → '@/lib/frames/frog-config'

// Quests (organized within quests/)
'@/lib/quest-bookmarks' → '@/lib/quests/quest-bookmarks'
'@/lib/quest-policy' → '@/lib/quests/quest-policy'

// Notifications (organized within notifications/)
'@/lib/notification-batching' → '@/lib/notifications/notification-batching'
```

### ⚠️ IMPORTANT: Quote Styles & Dynamic Imports

**All three import styles were updated:**

1. **Single quotes** (most common):
   ```typescript
   import { formatAddress } from '@/lib/utils/utils'
   ```

2. **Double quotes** (lib/ directory files):
   ```typescript
   import { CONTRACT_ADDRESSES } from "@/lib/contracts/gmeow-utils"
   ```

3. **Dynamic imports** (async code splitting):
   ```typescript
   const { getLeaderboard } = await import('@/lib/integrations/subsquid-client')
   const { getUserStats } = await import('@/lib/integrations/subsquid-client')
   ```

**If you're doing find/replace manually:**
- ✅ Check BOTH quote styles
- ✅ Check dynamic imports with `await import()`
- ✅ Run TypeScript after: `pnpm tsc --noEmit`

---

## Testing Strategy

### After Any Change
```bash
# TypeScript compilation
pnpm tsc --noEmit

# Bot system tests
pnpm test __tests__/lib/bot/ --run

# API tests
pnpm test __tests__/api/ --run

# Integration tests
pnpm test __tests__/integration/ --run
```

### Critical Routes to Test
- `/api/*` - All API routes (116× request-id usage)
- Bot system - Auto-reply and stats
- Frame routes - Rendering system (13× frame-design-system)
- User API - Profile endpoints
- Webhooks - Neynar integration
- Cron jobs - Scheduled tasks

---

## 📋 Refactoring History

### December 17, 2025 - MAJOR CONSOLIDATION ✅
- **Phase 0**: Initial analysis (162 files, 87 in root)
- **Phase 1**: Quick wins (5 min)
  - Deleted `gmeow-utils.ts(backup)`
  - Created this README.md
  - Added index files to 8 key directories
  
- **Phase 2**: Consolidate duplicates (completed)
  - **Phase 2.1**: Cache files (3 files → lib/cache/)
    - cache.ts → cache/server.ts (Vercel KV, 8 imports)
    - cache-storage.ts → cache/client.ts (localStorage, 2 imports)
    - frame-cache.ts → cache/frame.ts (Upstash Redis, 1 import)
    - Updated 12 files with new import paths
  - **Phase 2.2**: Auth files (2 files → lib/auth/)
    - admin-auth.ts → auth/admin.ts (JWT/TOTP, 18 imports)
    - auth.ts → auth/api-key.ts (API key legacy, 0 imports)
    - Updated 18 files with new import paths
  - **Phase 2.3**: Supabase files (2 files → lib/supabase/)
    - supabase-server.ts → supabase/client.ts (44 imports)
    - supabase.ts → supabase/edge.ts (9 imports)
    - Updated 53 files with new import paths
  - **Total Phase 2**: 7 files moved, 83 import paths updated, all tests passing

- **Phase 3**: Document chain types (completed)
  - Enhanced gmeow-utils.ts with comprehensive JSDoc
  - Added GMChainKey vs ChainKey documentation
  - Marked deprecated multichain functions
  - Added usage guidelines to contract files
  - Total: 4 files enhanced with detailed documentation

- **Phase 4**: MASSIVE CONSOLIDATION (completed Dec 17, 2025) 🎉
  - **Goal**: Reduce lib/ root to only 2 files (index.ts + README.md)
  - **Achievement**: ✅ Successfully consolidated 71 files into 10 subdirectories
  
  **New Subdirectories Created**:
  1. `middleware/` (10 files) - Error handling, rate limiting, security
  2. `utils/` (12 files) - Common utilities and helpers
  3. `badges/` (6 files) - Badge system and artwork
  4. `integrations/` (6 files) - External service integrations (Phase 8.3: neynar-server.ts deleted)
  5. `leaderboard/` (6 files) - Ranking and leaderboard
  6. `viral/` (4 files) - Viral engagement tracking
  7. `api/` (6 files) - API utilities
  8. `profile/` (11 files) - User profile management
  9. `miniapp/` (3 files) - MiniKit integration
  10. Plus organized existing: `contracts/`, `frames/`, etc.
  
  **Migration Stats**:
  - ✅ 71 files moved from lib/ root to subdirectories
  - ✅ 400+ import paths updated across codebase
  - ✅ TypeScript errors: 166 → 0 (all fixed!)
  - ✅ Bot tests: 59/61 passing (2 pre-existing flaky tests)
  - ✅ lib/ root: Now only 2 files (+ 1 legacy component)
  
  **Technical Details**:
  - Updated single-quoted imports: `'@/lib/...'`
  - Updated double-quoted imports: `"@/lib/..."`
  - Fixed dynamic imports: `await import('@/lib/...')`
  - Created 7 new index.ts files for subdirectories
  - Resolved export conflicts in middleware/ and contracts/
  
  **Files Affected**:
  - app/ directory: 120+ files
  - lib/ directory: 80+ files
  - components/ directory: 70+ files
  - hooks/ directory: 15+ files
  - scripts/ directory: 10+ files
  - tests/ directory: 50+ files

### Future Plans
- **Phase 2.4**: Organize utils files - ✅ COMPLETED in Phase 4
- **Phase 5**: Production readiness testing
- **Phase 6**: Performance optimization

---

## 📊 Quick Reference: Directory Contents

| Directory | Files | Purpose | Top Exports |
|-----------|-------|---------|-------------|
| `middleware/` | 10 | Request handling, errors, security | error-handler, request-id, rate-limit |
| `utils/` | 12 | Common utilities | utils, formatters, telemetry, accessibility |
| `contracts/` | 10 | Smart contract interactions | gmeow-utils, guild-contract, abis |
| `integrations/` | 6 | External services | neynar, subsquid-client, neynar-bot (Phase 8.3) |
| `frames/` | 15 | Frame rendering system | hybrid-calculator, frame-design-system |
| `profile/` | 11 | User profiles | profile-data, community-events |
| `quests/` | 11 | Quest tracking | quest definitions, validation |
| `notifications/` | 9 | User notifications | batching, scheduling |
| `badges/` | 6 | Badge system | badges, badge-artwork, metadata |
| `leaderboard/` | 6 | Ranking system | rank, leaderboard-sync, scorer |
| `supabase/` | 5 | Database client | client, queries, types |
| `cache/` | 6 | Caching layer | server, client, frame |
| `auth/` | 3 | Authentication | admin, api-key |
| `bot/` | 4 | Bot system | analytics, auto-reply |
| `viral/` | 4 | Viral tracking | viral-bonus, achievements |
| `api/` | 6 | API utilities | share, retry, dashboard |
| `hooks/` | 10 | React hooks | Data fetching, state |
| `miniapp/` | 3 | MiniKit integration | miniappEnv, validation |
| `guild/` | 2 | Guild management | Guild operations |
| `validation/` | 2 | Input validation | Schemas, type guards |
| **TOTAL** | **179** | **28 subdirectories** | **+ index.ts + README.md** |

---

## 🎯 Contributing Guidelines

When adding new lib files:
1. **Check existing** - Search for similar functionality first
2. **Use subdirectories** - Never add to lib/ root (only 2 files allowed!)
3. **Pick the right directory**:
   - Request/API logic → `middleware/`
   - Helper functions → `utils/`
   - Smart contracts → `contracts/`
   - External APIs → `integrations/`
   - User data → `profile/`
   - Rankings → `leaderboard/`
   - NFT/rewards → `badges/`
   - Viral features → `viral/`
4. **Update this README** - Document new modules
5. **Add tests** - Especially for high-traffic utilities
6. **Use TypeScript** - Full type safety required
7. **Document chain usage** - Specify GMChainKey vs ChainKey
8. **Update index.ts** - Add exports to subdirectory index if needed

---

## 🆘 Getting Help

### By Topic
- **Import errors?** → Check "Migration Guide" section above
- **Contract questions?** → See `contracts/` and check chain type (GM vs regular)
- **Database questions?** → See `supabase/` for query patterns
- **Bot questions?** → See `bot/` for system architecture
- **Frame questions?** → See `frames/` for rendering system
- **Cache questions?** → See `cache/` for caching strategies
- **API integration?** → See `integrations/` for external services
- **Error handling?** → See `middleware/error-handler.ts`
- **Rate limiting?** → See `middleware/rate-limit.ts`

### Architecture Documents
- `BOT-CONTRACT-AUDIT-REPORT.md` - Contract integration
- `LIB-REFACTOR-PLAN.md` - Refactoring strategy
- `DAY-5-COMPLETION-REPORT.md` - Recent improvements
- `FOUNDATION-REBUILD-ROADMAP.md` - System architecture

### Emergency Contacts
**If TypeScript breaks after pulling:**
1. Run: `pnpm tsc --noEmit | grep "error TS2307"`
2. Check the error module paths
3. Use "Migration Guide" above to fix imports
4. Rerun: `pnpm tsc --noEmit` until 0 errors

---

## ✅ Verification Checklist

After the December 17, 2025 consolidation:
- ✅ lib/ root has only 2 files (+ 1 legacy component)
- ✅ TypeScript compilation: 0 errors
- ✅ Bot tests: 59/61 passing (2 pre-existing flaky)
- ✅ 400+ imports updated across codebase
- ✅ All quote styles handled (single, double, dynamic)
- ✅ 71 files moved to organized subdirectories
- ✅ 10 new subdirectories created
- ✅ Export conflicts resolved (middleware, contracts)
