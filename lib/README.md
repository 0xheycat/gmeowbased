# Lib Directory Structure

**Last Updated**: December 17, 2025  
**Total Files**: 162 TypeScript files (14MB)

---

## Core Systems

### Authentication & Authorization
- `auth/` - User authentication and admin authorization
  - User session management
  - Admin role verification
  - JWT token handling

### Caching Layer
- `cache/` - Multi-level caching system
  - Generic cache interface
  - Storage implementations
  - Frame-specific cache
  - Contract data cache
  - Neynar API cache

### Smart Contracts
- `contracts/` - Blockchain contract interactions
  - **Active Chain**: Base (GMChainKey)
  - **View-Only Chains**: 12 chains via Blockscout MCP (ChainKey)
  - Contract ABIs and addresses
  - Contract utility functions
  - Read/write operations

### Database
- `supabase/` - PostgreSQL database client
  - Client-side operations
  - Server-side operations
  - Query builders
  - Type definitions
  - Mock data for testing

---

## Feature Modules

### Bot System
- `bot/` - Automated reply and user engagement (14 files)
  - Analytics and stats tracking
  - Configuration and i18n
  - Auto-reply logic
  - Frame builders
  - Quest recommendations
  - Retry queue
  - Failover systems

### Frame System
- `frames/` - Farcaster frame rendering (19 files)
  - Template builders
  - Design system
  - Image generation
  - Button handlers
  - Frame state management

### Quest System
- `quests/` - Quest tracking and rewards (8 files)
  - Quest definitions
  - Progress tracking
  - Reward calculation
  - Quest validation

### Guild System
- `guild/` - Guild management
  - Member management
  - Guild stats
  - Guild creation

### Notification System
- `notifications/` - User notifications (8 files)
  - Batching system
  - Digest scheduling
  - Delivery tracking

### Profile System
- `profile/` - User profile management
  - Profile data fetching
  - Stats computation
  - Profile updates

---

## Utilities

### Common Utilities
- `utils/` - Generic helper functions
  - String formatting
  - Date/time utilities
  - Data transformations

### Validation
- `validation/` - Input validation
  - API schemas
  - Type guards
  - Data sanitization

### Error Handling
- `error-handler.ts` - Centralized error handling (64 imports)
- `request-id.ts` - Request tracking (116 imports)
- `rate-limit.ts` - Rate limiting (75 imports)

### React Hooks
- `hooks/` - Custom React hooks (9 files)
  - Data fetching hooks
  - State management
  - Effect helpers

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

## Import Patterns

### Recommended Imports
```typescript
// Core utilities
import { formatAddress } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// Feature modules (use direct paths)
import { computeBotUserStats } from '@/lib/bot/analytics/stats'
import { buildFrame } from '@/lib/frames/builder'
import { getQuestDefinition } from '@/lib/quests'

// Error handling
import { handleApiError } from '@/lib/error-handler'
import { getRequestId } from '@/lib/request-id'
import { rateLimit } from '@/lib/rate-limit'
```

### High-Traffic Files (Handle with Care)
These files have the most imports and should be modified carefully:
1. **request-id.ts** (116 imports) - Request tracking
2. **rate-limit.ts** (75 imports) - Rate limiting
3. **error-handler.ts** (64 imports) - Error handling
4. **gmeow-utils.ts** (35 imports) - Contract utilities
5. **utils.ts** (33 imports) - Generic utilities

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

## Refactoring History

### December 17, 2025
- **Phase 0**: Initial analysis (162 files, 87 in root)
- **Phase 1**: Quick wins
  - Deleted `gmeow-utils.ts(backup)`
  - Created this README.md
  - Added index files to key directories

### Future Plans
- **Phase 2**: Consolidate duplicate files (cache, auth, supabase, utils)
- **Phase 3**: Better documentation of chain types
- **Phase 4**: Create consolidated index files
- **Phase 5**: Ongoing organization improvements

---

## Contributing

When adding new lib files:
1. **Check existing** - Search for similar functionality first
2. **Use subdirectories** - Don't add to root unless it's a core utility
3. **Update this README** - Document new modules
4. **Add tests** - Especially for high-traffic utilities
5. **Use TypeScript** - Full type safety required
6. **Document chain usage** - Specify GMChainKey vs ChainKey

---

## Getting Help

- **Contract questions**: See `contracts/` and check chain type (GM vs regular)
- **Database questions**: See `supabase/` for query patterns
- **Bot questions**: See `bot/` for system architecture
- **Frame questions**: See `frames/` for rendering system
- **Cache questions**: See `cache/` for caching strategies

For architecture decisions, refer to:
- `BOT-CONTRACT-AUDIT-REPORT.md` - Contract integration
- `LIB-REFACTOR-PLAN.md` - Refactoring strategy
- `DAY-5-COMPLETION-REPORT.md` - Recent improvements
