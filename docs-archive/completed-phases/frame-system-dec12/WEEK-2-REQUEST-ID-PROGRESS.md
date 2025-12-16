# Week 2 Progress - Request-ID Rollout

**Date:** December 9, 2025  
**Status:** In Progress  
**Goal:** Add Request-ID support to all 53 remaining APIs (21/74 → 74/74)

---

## Executive Summary

✅ **Foundation Complete**: Request-ID pattern established in Week 1  
🔄 **Current Progress**: 21/74 APIs (28%) have Request-ID  
🎯 **Week 2 Target**: 74/74 APIs (100%) with Request-ID  
📋 **Remaining**: 53 APIs need Request-ID implementation

---

## Current Status by System

### ✅ Systems with Full Request-ID Coverage
- ✅ Onchain Stats (3/3 APIs)
- ✅ Cast/Badge Share (1/1 API)
- ✅ Seasons (1/1 API)
- ✅ Farcaster FID (1/1 API)
- ✅ Notifications (1/1 API)
- ✅ Advanced Analytics (1/1 API)

### 🔄 Systems with Partial Coverage

#### Guild System (7/13 APIs - 54%)
**✅ Has Request-ID:**
- `/api/guild/create` - Create guild
- `/api/guild/list` - List all guilds
- `/api/guild/leaderboard` - Guild leaderboard
- `/api/guild/[guildId]` - Get guild details
- `/api/guild/[guildId]/members` - List members
- `/api/guild/[guildId]/join` - Join guild
- `/api/guild/[guildId]/analytics` - Guild analytics

**❌ Needs Request-ID:**
- `/api/guild/[guildId]/claim` - Request/approve treasury claims
- `/api/guild/[guildId]/deposit` - Deposit points to guild
- `/api/guild/[guildId]/is-member` - Check membership
- `/api/guild/[guildId]/leave` - Leave guild
- `/api/guild/[guildId]/manage-member` - Add/remove members
- `/api/guild/[guildId]/treasury` - View treasury balance

### ❌ Systems with Zero Coverage

#### Badge System (0/2 APIs - 0%)
- ❌ `/api/badge/upload-metadata` - Upload badge metadata
- ✅ `/api/badge/image/[imageId]` - Generate badge images (has Request-ID in comments but not enforced)
- ✅ `/api/badge/metadata/[tokenId]` - Get badge metadata (has Request-ID in comments but not enforced)

#### Referral System (0/5 APIs - 0%)
- ❌ `/api/referral/generate-link` - Generate referral link
- ❌ `/api/referral/leaderboard` - Referral leaderboard
- ❌ `/api/referral/activity/[fid]` - User referral activity
- ❌ `/api/referral/[fid]/stats` - Referral stats
- ❌ `/api/referral/[fid]/analytics` - Referral analytics

#### User/Profile System (0/4 APIs - 0%)
- ❌ `/api/user/profile/[fid]` - Get user profile
- ❌ `/api/user/activity/[fid]` - User activity feed
- ❌ `/api/user/badges/[fid]` - User badges
- ❌ `/api/user/quests/[fid]` - User quests

#### Dashboard System (0/4 APIs - 0%)
- ❌ `/api/dashboard/activity-feed` - Activity feed
- ❌ `/api/dashboard/top-casters` - Top casters
- ❌ `/api/dashboard/trending-channels` - Trending channels
- ❌ `/api/dashboard/trending-tokens` - Trending tokens

#### Onchain Stats System (0/3 APIs - 0%)
- ❌ `/api/onchain-stats/[chain]` - Chain-specific stats
- ❌ `/api/onchain-stats/history` - Historical stats
- ❌ `/api/onchain-stats/snapshot` - Stats snapshot

#### NFT System (0/2 APIs - 0%)
- ❌ `/api/nft/image/[imageId]` - Generate NFT images
- ❌ `/api/nft/metadata/[tokenId]` - Get NFT metadata

#### Admin System (0/1 API - 0%)
- ❌ `/api/admin/usage-metrics` - API usage metrics

#### DeFi/Analytics (0/3 APIs - 0%)
- ❌ `/api/defi-positions` - DeFi positions
- ❌ `/api/pnl-summary` - P&L summary
- ❌ `/api/transaction-patterns` - Transaction patterns

#### Cron Jobs (0/3 APIs - 0%)
- ❌ `/api/cron/sync-guilds` - Sync guild stats
- ❌ `/api/cron/sync-referrals` - Sync referral stats
- ❌ `/api/cron/sync-onchain-stats` - Sync onchain stats (if exists)

---

## Request-ID Implementation Pattern

### Standard Pattern (from Week 1)

```typescript
// 1. Import at top
import { generateRequestId } from '@/lib/request-id'

// 2. Generate in handler
export async function POST(req: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // ... handler logic
    
    return NextResponse.json(data, {
      headers: {
        'X-Request-ID': requestId,
        // ... other headers
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}
```

### For APIs with `createErrorResponse` Helper

```typescript
// Update helper to accept requestId
function createErrorResponse(
  message: string, 
  status: number = 400,
  requestId?: string
) {
  const rid = requestId || generateRequestId()
  
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: {
        'X-Request-ID': rid,
        // ... other headers
      }
    }
  )
}

// Use in handler
export async function POST(req: NextRequest) {
  const requestId = generateRequestId()
  
  if (error) {
    return createErrorResponse('Error message', 400, requestId)
  }
}
```

---

## Week 2 Implementation Plan

### Phase 1: Complete Guild System (Days 7-8)
**Priority: HIGH** - Most complex, most APIs
- [x] Import added to claim route
- [ ] Complete claim route (pass requestId through all responses)
- [ ] deposit route - 361 lines
- [ ] is-member route - 288 lines
- [ ] leave route - 263 lines
- [ ] manage-member route - 328 lines
- [ ] treasury route - 305 lines

**Estimated Time:** 4-6 hours

### Phase 2: User/Profile System (Days 9-10)
**Priority: HIGH** - Core user features
- [ ] profile/[fid] route
- [ ] activity/[fid] route
- [ ] badges/[fid] route
- [ ] quests/[fid] route

**Estimated Time:** 2-3 hours

### Phase 3: Referral System (Days 9-10)
**Priority: MEDIUM** - Business logic
- [ ] generate-link route
- [ ] leaderboard route
- [ ] activity/[fid] route
- [ ] [fid]/stats route
- [ ] [fid]/analytics route

**Estimated Time:** 2-3 hours

### Phase 4: Badge & NFT Systems (Days 11-12)
**Priority: MEDIUM** - Image/metadata routes
- [ ] badge/upload-metadata
- [ ] nft/image/[imageId]
- [ ] nft/metadata/[tokenId]

**Estimated Time:** 1-2 hours

### Phase 5: Dashboard & Analytics (Days 11-12)
**Priority: LOW** - Display-only features
- [ ] dashboard/activity-feed
- [ ] dashboard/top-casters
- [ ] dashboard/trending-channels
- [ ] dashboard/trending-tokens
- [ ] defi-positions
- [ ] pnl-summary
- [ ] transaction-patterns
- [ ] admin/usage-metrics

**Estimated Time:** 3-4 hours

### Phase 6: Background Jobs (Day 12)
**Priority: LOW** - Cron jobs
- [ ] cron/sync-guilds
- [ ] cron/sync-referrals
- [ ] onchain-stats/[chain]
- [ ] onchain-stats/history
- [ ] onchain-stats/snapshot

**Estimated Time:** 2-3 hours

---

## Progress Tracking

### Completed Today (Day 7)
- ✅ Analyzed all 121 API routes in workspace
- ✅ Identified 21 APIs with Request-ID coverage
- ✅ Mapped 53 APIs needing Request-ID
- ✅ Started Guild claim route (import added, pattern established)

### Blockers
- None - clear path forward

### Next Actions
1. Complete Guild claim route Request-ID implementation
2. Add Request-ID to remaining 5 Guild APIs
3. Move to User/Profile system
4. Continue through phases 2-6

---

## Benefits of Request-ID Rollout

### For Debugging
- Track request lifecycle across distributed systems
- Correlate logs from multiple services
- Identify performance bottlenecks per request

### For Monitoring
- Measure API response times per request
- Track error rates with context
- Build request flow diagrams

### For Support
- Users can share Request-ID for support
- Support team can trace exact request
- Faster issue resolution

### For Compliance
- Audit trail for all API calls
- GDPR compliance (track data access)
- Security incident investigation

---

## Testing Checklist

For each API after Request-ID addition:

```bash
# 1. Call API
curl -X POST https://api.gmeow.com/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}' \
  -i

# 2. Verify Response
# Should see: X-Request-ID: req_1733759483_abc123

# 3. Check Logs
# Should see: [endpoint] Request ID: req_1733759483_abc123

# 4. Test Error Cases
curl -X POST https://api.gmeow.com/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  -i

# Should see: X-Request-ID in error response too
```

---

## Conclusion

Week 2 is focused on achieving **100% Request-ID coverage** across all 74 API routes. This will establish enterprise-grade traceability and debugging capabilities for the entire Gmeow platform.

**Current Status:** 28% complete (21/74)  
**Week 2 Target:** 100% complete (74/74)  
**Estimated Total Time:** 15-21 hours  
**Days Available:** 6 days (Days 7-12)

**Ready to proceed!** 🚀
