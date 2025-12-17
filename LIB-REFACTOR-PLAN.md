# Lib Refactoring Plan - Safe & Strategic

**Date**: December 17, 2025  
**Total Files**: 162 lib files (14MB)  
**Priority**: High-traffic routes first, then consolidate duplicates

---

## Phase 0: Analysis Complete ✅

### Current State
- **87 files** in `lib/` root (too many!)
- **Top imports**: request-id (116×), rate-limit (75×), error-handler (64×), gmeow-utils (35×)
- **Active pages**: 30+ API routes, main pages use supabase/bot/profile systems
- **Multichain issue**: Only **Base chain active**, but old code references 12 chains

### Critical Finding: Multichain Code is LEGACY
```typescript
// ❌ LEGACY: Only in gmeow-utils.ts for viewing other chains
ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | ... // 12 chains

// ✅ ACTIVE: Only Base contracts deployed Dec 12
GMChainKey = 'base' // Our actual contracts
CONTRACT_ADDRESSES: { base: '0x9EB...' } // Only Base
```

**Reality**: 
- Contracts only on **Base** (Dec 12, 2025)
- Multichain = read-only via Blockscout MCP (for OnchainStats frame)
- 53 files reference contracts, but all use Base

---

## Phase 1: Quick Wins (No Breaking Changes)

### 1.1 Delete Backup File ⚡ IMMEDIATE
```bash
rm lib/gmeow-utils.ts\(backup\)
```

### 1.2 Create Index Files (Organize Exports)
```bash
# lib/cache/index.ts - consolidate cache exports
# lib/auth/index.ts - consolidate auth exports
# lib/contracts/index.ts - already exists, verify complete
# lib/supabase/index.ts - consolidate supabase exports
```

### 1.3 Add README to lib/ Root
```bash
# lib/README.md - explain structure and deprecations
```

---

## Phase 2: Consolidate Duplicates (Safe Merge)

### Priority 1: Cache Files (3 files → 1 directory)
**Files**:
- `lib/cache.ts` - Generic cache interface
- `lib/cache-storage.ts` - Storage implementation
- `lib/frame-cache.ts` - Frame-specific cache

**Action**:
```
lib/cache/
  ├── index.ts          # Re-export all
  ├── interface.ts      # Generic cache (from cache.ts)
  ├── storage.ts        # Storage impl (from cache-storage.ts)
  ├── frame.ts          # Frame cache (from frame-cache.ts)
  ├── contract-cache.ts # Already exists
  └── neynar-cache.ts   # Already exists
```

**Impact**: 
- Files using: `from '@/lib/cache'` → no change
- Files using: `from '@/lib/cache-storage'` → update to `@/lib/cache/storage`
- Files using: `from '@/lib/frame-cache'` → update to `@/lib/cache/frame`

### Priority 2: Auth Files (2 files → 1 directory)
**Files**:
- `lib/auth.ts` - User auth
- `lib/admin-auth.ts` - Admin auth (18 imports)

**Action**:
```
lib/auth/
  ├── index.ts       # Re-export all
  ├── user.ts        # User auth (from auth.ts)
  └── admin.ts       # Admin auth (from admin-auth.ts)
```

**Impact**: 18 files importing admin-auth need update

### Priority 3: Supabase Files (3 files → organized)
**Files**:
- `lib/supabase.ts` - Client-side (9 imports)
- `lib/supabase-server.ts` - Server-side (30 imports)
- `lib/supabase/server.ts` - Duplicate?

**Action**:
```
lib/supabase/
  ├── index.ts          # Re-export client + server
  ├── client.ts         # Client-side (from supabase.ts)
  ├── server.ts         # Server-side (consolidate 2 files)
  ├── queries/          # Already exists
  ├── types/            # Already exists
  └── mock-quest-data.ts # Already exists
```

**Impact**: 39 total imports need update

### Priority 4: Utils Files (2 files → organized)
**Files**:
- `lib/utils.ts` - Generic utils (33 imports)
- `lib/gmeow-utils.ts` - Contract utils (35 imports, 1075 lines!)

**Action**:
```
lib/utils/
  ├── index.ts           # Re-export common utils
  ├── common.ts          # Generic (from utils.ts)
  └── format.ts          # Formatters
  
lib/contracts/
  ├── index.ts           # Already exists
  ├── utils.ts           # Contract utils (from gmeow-utils.ts)
  ├── abis.ts            # Already exists
  └── addresses.ts       # Extract from gmeow-utils
```

**Impact**: 68 total imports, **CRITICAL** - most used files

### Priority 5: Type Files (5+ files → consolidated)
**Files**:
- `lib/types.ts` - Root types
- `lib/bot/config/types.ts` - Bot types
- `lib/frames/types.ts` - Frame types
- `lib/profile/types.ts` - Profile types
- `lib/quests/types.ts` - Quest types

**Action**: Keep domain-specific, but ensure no duplicates

---

## Phase 3: Multichain Cleanup (Remove Dead Code)

### 3.1 Identify Active vs Legacy
**Active** (Base only):
- `STANDALONE_ADDRESSES.base.*` - Core, Guild, NFT, Badge, Referral
- `CONTRACT_ADDRESSES` - Only Base
- `GMChainKey = 'base'` - Our contract type

**Legacy** (View-only, keep for OnchainStats frame):
- `ChainKey` - 12 chains for Blockscout viewing
- `ALL_CHAIN_IDS` - For reading other chains
- Multichain functions - Only for stats viewing

### 3.2 Mark Legacy Code
```typescript
// lib/contracts/chain-types.ts

/** 
 * ⚠️ ACTIVE: Our deployed contracts (Base only)
 * Use this for all write operations
 */
export type GMChainKey = 'base'

/** 
 * ⚠️ LEGACY: View-only for OnchainStats frame
 * Blockscout MCP supports 12 chains for READ
 * DO NOT USE for contract writes
 */
export type ChainKey = 'base' | 'ethereum' | ... // 12 chains
```

### 3.3 Deprecate Multichain Writes
```typescript
// Mark deprecated functions
/** @deprecated Only Base supported. Use createGMTransaction() instead */
export const createGMCeloTransaction = () => createGMTransaction('base')
export const createGMOpTransaction = () => createGMTransaction('base')
```

---

## Phase 4: Create Consolidated Index

### 4.1 lib/README.md
```markdown
# Lib Structure

## Core Systems
- `auth/` - Authentication (user + admin)
- `cache/` - Caching layer (generic + frame + contract)
- `contracts/` - Smart contract utils (Base only)
- `supabase/` - Database client/server

## Feature Modules
- `bot/` - Bot system (14 files)
- `frames/` - Frame rendering (19 files)
- `quests/` - Quest system (8 files)
- `guild/` - Guild system
- `notifications/` - Notification system (8 files)

## Utilities
- `utils/` - Common utilities
- `validation/` - Input validation
- `hooks/` - React hooks (9 files)

## ⚠️ Deprecation Notices
- Multichain: Only **Base** contracts active
- ChainKey: Use for viewing only (Blockscout MCP)
- Legacy cache files: Use `lib/cache/` exports
```

### 4.2 lib/index.ts (Main Entry Point)
```typescript
/**
 * Main lib exports
 * 
 * Re-exports most commonly used utilities
 * Domain-specific imports should use direct paths
 */

// Core utilities (most imported)
export * from './utils'
export * from './contracts'
export * from './supabase'
export * from './auth'

// Commonly used
export * from './error-handler'
export * from './request-id'
export * from './rate-limit'
export * from './validation/api-schemas'

// Type exports
export type { BotUserStats } from './bot/analytics/stats'
export type { QuestDefinition } from './quests/types'
```

---

## Phase 5: Safe Migration Strategy

### 5.1 Migration Order (Least → Most Impact)
1. ✅ Delete backup file (0 imports)
2. ✅ Create cache/ directory (organize 3 files)
3. ✅ Create auth/ directory (organize 2 files)
4. ✅ Consolidate supabase (39 imports)
5. ⚠️ Consolidate utils (68 imports) - **RISKY**
6. ⚠️ Mark multichain deprecated (53 references)

### 5.2 Testing Strategy
```bash
# After each phase:
1. TypeScript compile: `pnpm tsc --noEmit`
2. Run bot tests: `pnpm test __tests__/lib/bot/ --run`
3. Run API tests: `pnpm test app/api --run`
4. Check imports: `grep -r "from '@/lib/OLD_PATH'" .`
```

### 5.3 Rollback Plan
```bash
# Keep git commits separate per phase
git commit -m "Phase X: Description"

# If issues, revert specific phase
git revert HEAD~1
```

---

## Phase 6: Active Page Protection

### Critical Routes (DON'T BREAK)
**Top 10 Most Used**:
1. `/api/*` - 116× request-id, 75× rate-limit
2. Bot system - Uses profile-data, computeBotUserStats
3. Frame routes - 13× frame-design-system
4. User API - `/api/user/profile/[fid]`
5. Webhooks - Neynar integration
6. Cron jobs - 10+ scheduled tasks

**Protection**:
- Test these FIRST after each change
- Keep original imports working via index re-exports
- Add deprecation warnings, don't break

### Low-Risk Candidates (Safe to Refactor)
- Badge artwork - Self-contained
- Viral bonus - No external deps
- Icon sizes - Simple utility
- Telemetry - Optional feature

---

## Implementation Checklist

### Before Starting
- [ ] Commit current state: `git commit -am "Pre-refactor checkpoint"`
- [ ] Run full test suite: `pnpm test`
- [ ] Document current import counts (done above)
- [ ] Create refactor branch: `git checkout -b refactor/lib-consolidation`

### Phase 1: Quick Wins
- [ ] Delete `gmeow-utils.ts(backup)`
- [ ] Create `lib/README.md`
- [ ] Create index files for existing dirs
- [ ] Test: No errors

### Phase 2: Consolidate (Per Priority)
- [ ] Cache files → `lib/cache/`
  - [ ] Create directory structure
  - [ ] Move files
  - [ ] Update imports (grep + replace)
  - [ ] Test
- [ ] Auth files → `lib/auth/`
- [ ] Supabase files → `lib/supabase/` (consolidate)
- [ ] Utils files → organize better
- [ ] Test after each

### Phase 3: Multichain Cleanup
- [ ] Add deprecation comments
- [ ] Mark legacy code
- [ ] Update docs
- [ ] Test Base-only operations

### Phase 4: Documentation
- [ ] Create lib/README.md
- [ ] Create lib/index.ts
- [ ] Update import patterns in docs
- [ ] Add migration guide

### Phase 5: Verification
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Bot system works
- [ ] API routes work
- [ ] Frame rendering works

---

## Risk Assessment

### HIGH RISK (Test Extensively)
- ⚠️ **gmeow-utils.ts** (1075 lines, 35 imports) - Core contract utils
- ⚠️ **utils.ts** (33 imports) - Generic utilities
- ⚠️ **supabase-server.ts** (30 imports) - Database operations

### MEDIUM RISK
- ⚠️ admin-auth.ts (18 imports) - Auth system
- ⚠️ Bot system (14 files) - Complex dependencies
- ⚠️ Frames (19 files) - Rendering system

### LOW RISK (Safe to Refactor)
- ✅ Cache files - Self-contained
- ✅ Backup file - Delete immediately
- ✅ Badge/viral - Feature modules
- ✅ Icon sizes - Simple utility

---

## Success Metrics

### Before Refactor
- 87 files in lib/ root
- 162 total lib files
- Duplicate functionality (cache, auth, supabase)
- No clear organization
- Backup files present

### After Refactor
- <20 files in lib/ root (move to subdirs)
- Same 162 files, better organized
- Clear index files for imports
- Deprecated code marked
- Documentation complete

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Phase 1 NOW** - Delete backup, add README (5 min)
3. **Phase 2 Next** - Consolidate cache (30 min)
4. **Test continuously** - After each change
5. **Document as you go** - Update this plan

**Estimated Time**: 4-6 hours total (spread over multiple sessions)

**Target Completion**: December 18-19, 2025
