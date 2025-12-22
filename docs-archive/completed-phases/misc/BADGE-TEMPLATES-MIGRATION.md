# Badge Templates Route Migration

**Route:** `/api/badges/templates`  
**Date:** December 19, 2024  
**Pattern:** TRUE HYBRID (Simplified - Metadata Only)

## Migration Summary

Migrated badge templates endpoint from legacy wrapper pattern to TRUE HYBRID architecture. This route is simpler than others because badge templates are pure metadata definitions (Layer 2 only) with no on-chain events or calculations needed.

## Data Architecture

### Layer 1 (Subsquid): N/A
- Badge templates are **off-chain metadata definitions**
- They describe badge types but don't track on-chain events
- For on-chain stats (mint counts, supply), see `/api/badges/stats` (future route)

### Layer 2 (Supabase): Badge Template Metadata ✅
**Source:** `badge_templates` table via `listBadgeTemplates()`

**Data Retrieved:**
- `id` - Template identifier
- `name` - Badge display name
- `slug` - URL-friendly identifier
- `badgeType` - Badge category
- `description` - Badge description
- `chain` - Blockchain network
- `pointsCost` - Cost to mint badge
- `imageUrl` - Badge artwork URL
- `artPath` - Badge artwork path
- `active` - Whether badge is currently available

**Filtering:**
- `includeInactive: false` - Only return active badges

### Layer 3 (Calculated): N/A
- No calculations needed for static template metadata
- Supply stats and analytics belong in separate routes

## Infrastructure Used

### Rate Limiting ✅
- **Limiter:** `apiLimiter` (100 req/min)
- **Applied:** Before any processing
- **Error:** Returns 429 with standardized error response

### Caching ✅
- **Strategy:** `getCached()` with stale-while-revalidate
- **Namespace:** `badge-templates`
- **Key:** `buildBadgeTemplatesKey(false)` - active templates only
- **TTL:** 300 seconds (5 minutes)
- **Revalidation:** 600 seconds (10 minutes stale-while-revalidate)

### Error Handling ✅
- **Pattern:** Inline try/catch (no wrappers)
- **Utility:** `createErrorResponse()` with `ErrorType` enum
- **Types Used:**
  - `ErrorType.RATE_LIMIT` - Rate limit exceeded (429)
  - `ErrorType.DATABASE` - Template fetch failed (500)

### Request Tracking ✅
- **ID Generation:** `generateRequestId()`
- **Header:** `X-Request-ID` in all responses
- **Logging:** Included in error logs

## Changes Made

### Removed (Deprecated Patterns)
```typescript
❌ import { withErrorHandler } from '@/lib/middleware/error-handler'
❌ import { withTiming } from '@/lib/middleware/timing'
❌ export const GET = withTiming(withErrorHandler(async (request: Request) => {
```

### Added (TRUE HYBRID Pattern)
```typescript
✅ import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
✅ export async function GET(request: Request) {
✅ Comprehensive route documentation header
✅ Inline try/catch error handling
✅ Standardized error responses
✅ Response metadata with sources
```

## Response Contract

### Before
```typescript
{
  ok: boolean,
  templates: BadgeTemplate[]
}
```

### After (Enhanced)
```typescript
{
  ok: boolean,
  templates: BadgeTemplate[],
  metadata: {
    sources: {
      supabase: true  // Template definitions from Supabase
    },
    cached: boolean,
    timestamp: string
  }
}
```

### Frontend Compatibility ✅
- **Component:** `BadgeManagerPanel.tsx`
- **Usage:** Expects `{ ok, templates }` - **still compatible**
- **Enhancement:** `metadata` is additional, doesn't break existing code

## Verification Checklist

- [x] **TypeScript Errors:** 0 errors
- [x] **Rate Limiting:** Uses `apiLimiter` (100 req/min)
- [x] **Caching:** Uses `getCached()` with stale-while-revalidate
- [x] **Error Handling:** Inline try/catch with `createErrorResponse()`
- [x] **Request Tracking:** `X-Request-ID` in responses
- [x] **Response Metadata:** Includes `metadata.sources`
- [x] **Documentation:** Comprehensive route header
- [x] **No Wrappers:** Removed `withErrorHandler`, `withTiming`
- [x] **Frontend Contract:** Maintains `{ ok, templates }` compatibility

## Key Differences from Badge Claim

Unlike `/api/badges/claim` which needed:
- ✅ Layer 1 verification (Subsquid duplicate check)
- ✅ Layer 3 calculations (none)
- ✅ Strict rate limiting (10 req/min for expensive operations)
- ✅ Cache invalidation (after minting)

Badge templates route is **simpler** because:
- ❌ No Layer 1 needed (templates are metadata, not on-chain events)
- ❌ No Layer 3 needed (no calculations for static data)
- ✅ Standard rate limiting (100 req/min for read operations)
- ✅ No cache invalidation (templates rarely change)

## Notes

### Why No On-Chain Data?

Badge templates are **definitions**, not **events**. They describe what badges exist, not who minted them or when.

**Template Data (Off-chain):**
- "GM Champion badge costs 500 points"
- "Badge artwork is at /badges/gm-champion.png"
- "Badge is on Base network"

**Event Data (On-chain - different route):**
- "User 0x123 minted GM Champion badge on Dec 15"
- "1,234 GM Champion badges have been minted"
- "42 GM Champion badges are currently staked"

**Separation of Concerns:**
- `/api/badges/templates` → Badge definitions (this route)
- `/api/badges/stats` → Badge on-chain statistics (future route)
- `/api/badges/claim` → Badge minting operations (migrated)

### Cache Strategy

Templates use aggressive caching because:
- **Static Data:** Templates rarely change
- **No Personalization:** Same data for all users
- **High Traffic:** Badge gallery views on every page
- **Stale OK:** 10-minute stale data is acceptable for template metadata

## Migration Benefits

1. **Consistency:** Follows TRUE HYBRID pattern like other routes
2. **Better Errors:** Typed error responses with proper status codes
3. **Observability:** Request IDs for debugging
4. **Documentation:** Clear data architecture and sources
5. **Maintainability:** No wrapper magic, clear flow
6. **Performance:** Maintained excellent caching (300s TTL)

## Testing

### Manual Test
```bash
curl https://gmeowhq.art/api/badges/templates
```

Expected response:
```json
{
  "ok": true,
  "templates": [
    {
      "id": "gm-champion",
      "name": "GM Champion",
      "badgeType": "community",
      "chain": "base",
      "pointsCost": 500,
      "active": true,
      ...
    }
  ],
  "metadata": {
    "sources": {
      "supabase": true
    },
    "cached": true,
    "timestamp": "2024-12-19T..."
  }
}
```

### Rate Limit Test
```bash
# 100 requests in 60 seconds should succeed
# 101st request should return 429
for i in {1..101}; do
  curl https://gmeowhq.art/api/badges/templates
done
```

## Related Routes

- ✅ `/api/badges/claim` - Badge minting (migrated, TRUE HYBRID complete)
- ⏳ `/api/badges/stats` - Badge on-chain statistics (future)
- ⏳ `/api/badges/list` - User badge inventory (next migration)
- ⏳ `/api/badges/[address]` - User badges by address (future)

## Commit

```
feat: migrate badge templates route to TRUE HYBRID pattern

- Remove withErrorHandler, withTiming wrappers
- Add inline error handling with createErrorResponse()
- Add response metadata with data sources
- Add comprehensive route documentation
- Maintain excellent caching (300s TTL + SWR)
- Maintain frontend compatibility (ok, templates)
- 0 TypeScript errors

Route: /api/badges/templates (GET)
Pattern: TRUE HYBRID (Layer 2 only - metadata route)
Infrastructure: getCached, apiLimiter, createErrorResponse
```
