# Frame URL Restructure Plan - Phase 1B.1

**Created**: November 22, 2025  
**Status**: ✅ ANALYSIS COMPLETE - Ready for Implementation  
**Priority**: P1 - Foundation for Phase 1C

---

## 📊 Current Architecture Analysis

### Existing Master Route
**File**: `app/api/frame/route.tsx` (2540 lines)
- **Handles**: 10 frame types in single file
- **Entry Points**: `GET` (line 1332), `POST` (line 2293)
- **Routing**: Query parameter `?type=quest|gm|badge|guild|...`
- **Current URLs**: `gmeowhq.art/api/frame?type=quest&questId=1`

### Frame Types Inventory
1. ✅ `quest` - Quest completion tracking
2. ✅ `gm` - Daily GM ritual
3. ✅ `badge` - Badge minting
4. ✅ `guild` - Guild management
5. ✅ `referral` - Referral system
6. ✅ `leaderboards` - Ranking display (has dedicated handler at line 128)
7. ✅ `points` - Points economy
8. ✅ `onchainstats` - Contract stats
9. ✅ `verify` - Quest verification
10. ✅ `generic` - Default fallback

### Current Handler Architecture
```typescript
// Line 128-130: Dedicated handlers map
const FRAME_HANDLERS: Partial<Record<FrameType, FrameHandler>> = {
  leaderboards: handleLeaderboardFrame,
}

// Lines 1332-2250: GET handler with inline frame logic
// Lines 2293-2540: POST handler with action routing
```

### Validation & Security (GI-8 Compliant)
- ✅ Rate limiting: 60 req/min per IP (line 1335)
- ✅ Input sanitization: FID, questId, chain, type (lines 1352-1402)
- ✅ Zod schemas ready for expansion

---

## 🎯 Proposed Clean Architecture

### Target URL Structure
```
gmeowhq.art/api/frame/
├── quest/          → Quest frames
│   └── [questId]/  → Dynamic quest IDs
├── gm/             → GM ritual
├── badge/          → Badge minting (already exists!)
├── guild/          → Guild management
├── referral/       → Referral system
├── leaderboards/   → Rankings
├── points/         → Points display
├── onchainstats/   → Contract stats
├── verify/         → Quest verification
└── route.tsx       → Master orchestrator (fallback + shared logic)
```

### Why This Approach Wins

✅ **No Hard Reset Required**
- Keep master route as fallback + shared logic
- Add new routes gradually (one at a time)
- Zero downtime migration

✅ **Clean URLs (Composer-Friendly)**
- `/api/frame/quest` instead of `/api/frame?type=quest`
- Better Farcaster frame discovery
- Cleaner link sharing

✅ **Maintains Backward Compatibility**
- Old URLs continue working via master route
- Gradual deprecation path
- No user disruption

✅ **Code Organization**
- Smaller, focused files
- Easier to test individual frame types
- Better developer experience

---

## 🚀 Migration Strategy (Zero Downtime)

### Phase 1B.1-A: Extract Shared Logic (Week 1)
**Goal**: Create reusable utilities from master route

**Tasks**:
1. Extract validation helpers → `lib/frame-validation.ts` (already exists!)
2. Extract button builders → `lib/frame-buttons.ts` (new)
3. Extract HTML generators → `lib/frame-html.ts` (new)
4. Extract trace/debug → `lib/frame-debug.ts` (new)

**Safety**: No breaking changes, pure refactor

### Phase 1B.1-B: Create First Clean Route (Week 1-2)
**Target**: `/api/frame/quest/route.ts`

**Approach**:
```typescript
// app/api/frame/quest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleQuestFrame } from '@/lib/frame-handlers/quest'
import { validateFrameRequest } from '@/lib/frame-validation'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  // Rate limit + validation
  const { success } = await rateLimit(getClientIp(req), apiLimiter)
  if (!success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
  
  // Parse query params
  const searchParams = req.nextUrl.searchParams
  const questId = searchParams.get('questId')
  const chain = searchParams.get('chain') || 'base'
  
  // Validate inputs (GI-8)
  const validated = validateFrameRequest({ questId, chain, type: 'quest' })
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
  
  // Delegate to extracted handler
  return handleQuestFrame({ questId: validated.questId, chain: validated.chain })
}

export async function POST(req: NextRequest) {
  // Handle quest actions (recordProgress, complete, etc.)
  // Extract from master route lines 2400-2510
}
```

**Testing**:
- ✅ Test new route: `localhost:3000/api/frame/quest?questId=1`
- ✅ Test old route: `localhost:3000/api/frame?type=quest&questId=1`
- ✅ Both should work identically

### Phase 1B.1-C: Dynamic Quest Routes (Week 2)
**Target**: `/api/frame/quest/[questId]/route.ts`

**URL**: `gmeowhq.art/api/frame/quest/1` instead of `?questId=1`

**Approach**:
```typescript
// app/api/frame/quest/[questId]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { questId: string } }
) {
  const questId = sanitizeQuestId(params.questId)
  if (!questId) return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 })
  
  // Same logic as flat quest route
  return handleQuestFrame({ questId, chain: 'base' })
}
```

### Phase 1B.1-D: Migrate Remaining Frame Types (Week 3-4)
**Priority Order**:
1. ✅ `quest` (done in Phase B/C)
2. `gm` (simplest, good test case)
3. `leaderboards` (already has dedicated handler!)
4. `badge` (already has `/api/frame/badge/route.ts`!)
5. `onchainstats`
6. `points`
7. `guild`
8. `referral`
9. `verify`

### Phase 1B.1-E: Master Route Cleanup (Week 4)
**Goal**: Simplify master route to orchestrator role

**Final Master Route Responsibility**:
```typescript
// app/api/frame/route.tsx (reduced from 2540 → ~400 lines)
export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  
  // Route delegation (backward compatibility)
  if (type === 'quest') return redirect(`/api/frame/quest${url.search}`)
  if (type === 'gm') return redirect(`/api/frame/gm${url.search}`)
  // ... etc
  
  // Default generic frame
  return buildGenericFrame()
}
```

---

## 📁 File Structure After Migration

```
app/api/frame/
├── route.tsx                    # Master orchestrator (400 lines, down from 2540)
├── quest/
│   ├── route.ts                 # /api/frame/quest?questId=1
│   └── [questId]/
│       └── route.ts             # /api/frame/quest/1
├── gm/
│   └── route.ts                 # /api/frame/gm
├── badge/
│   └── route.ts                 # /api/frame/badge (already exists!)
├── leaderboards/
│   └── route.ts                 # /api/frame/leaderboards
├── onchainstats/
│   └── route.ts                 # /api/frame/onchainstats
├── points/
│   └── route.ts                 # /api/frame/points
├── guild/
│   └── route.ts                 # /api/frame/guild
├── referral/
│   └── route.ts                 # /api/frame/referral
└── verify/
    └── route.ts                 # /api/frame/verify

lib/frame-handlers/              # Extracted frame logic
├── quest.ts                     # Quest handler (~300 lines)
├── leaderboards.ts              # Leaderboard handler (already extracted!)
├── gm.ts                        # GM handler (~150 lines)
├── badge.ts                     # Badge handler (~200 lines)
├── guild.ts                     # Guild handler (~250 lines)
├── referral.ts                  # Referral handler (~200 lines)
├── onchainstats.ts              # Stats handler (~300 lines)
├── points.ts                    # Points handler (~150 lines)
└── verify.ts                    # Verify handler (~200 lines)

lib/                             # Shared utilities
├── frame-validation.ts          # Input sanitization (already exists!)
├── frame-buttons.ts             # Button builders (new)
├── frame-html.ts                # HTML generators (new)
└── frame-debug.ts               # Trace/debug helpers (new)
```

---

## ✅ Benefits of This Approach

### Developer Experience
- ✅ **Smaller files**: 150-400 lines each instead of 2540
- ✅ **Clear responsibilities**: One frame type per file
- ✅ **Easier testing**: Test individual frame types in isolation
- ✅ **Faster navigation**: Jump directly to frame logic

### User Experience
- ✅ **Clean URLs**: `/api/frame/quest/1` beats `?type=quest&questId=1`
- ✅ **Better sharing**: Cleaner links in Farcaster composer
- ✅ **Backward compatible**: Old URLs keep working
- ✅ **Zero downtime**: Gradual migration

### Performance
- ✅ **Faster builds**: Smaller files compile faster
- ✅ **Better caching**: Route-level caching strategies
- ✅ **Tree shaking**: Unused frame types don't load

### Security (GI-8 Compliance)
- ✅ **Maintained**: All rate limiting + validation preserved
- ✅ **Improved**: Easier to audit individual frame types
- ✅ **Testable**: Unit tests per frame type

---

## 🚨 Anti-Patterns to Avoid

### ❌ DON'T: Delete Master Route Immediately
**Why**: Backward compatibility, gradual migration
**Do**: Keep as orchestrator + fallback

### ❌ DON'T: Create Duplicate Logic
**Why**: Maintenance nightmare
**Do**: Extract shared logic to `lib/frame-handlers/`

### ❌ DON'T: Skip Input Validation
**Why**: GI-8 security requirements
**Do**: Reuse `lib/frame-validation.ts` everywhere

### ❌ DON'T: Push Without Testing
**Why**: Vercel takes 4-5 minutes, breaks production
**Do**: Test on `localhost:3000` first, verify old + new URLs

---

## 🎯 Implementation Priorities

### Must Have (Phase 1B.1)
1. ✅ Extract shared utilities (`frame-buttons`, `frame-html`, `frame-debug`)
2. ✅ Create `/api/frame/quest/route.ts` (proof of concept)
3. ✅ Create `/api/frame/quest/[questId]/route.ts` (dynamic routing)
4. ✅ Verify backward compatibility (old URLs work)
5. ✅ Update SYSTEM-AUDIT.md with new architecture

### Nice to Have (Phase 1C)
1. Migrate all 9 frame types to clean routes
2. Reduce master route to <500 lines
3. Add route-level caching strategies
4. Create migration guide for external integrations

### Future (Phase 2+)
1. Add frame type versioning (`/api/frame/v2/quest`)
2. Create frame composition API (combine multiple frames)
3. Add frame analytics per route
4. Implement A/B testing infrastructure

---

## 📊 Success Metrics

### Code Quality
- [ ] Master route reduced from 2540 → <500 lines
- [ ] Average file size <400 lines
- [ ] 100% test coverage on new routes
- [ ] Zero ESLint warnings (GI-13)

### Performance
- [ ] Response time <600ms (maintained from Phase 1B)
- [ ] Build time <5 minutes (maintained)
- [ ] Cache hit rate >80%

### User Experience
- [ ] Backward compatibility 100%
- [ ] New URLs work in Farcaster composer
- [ ] Zero 404s during migration
- [ ] Zero downtime

---

## 🚀 Action Plan - Week by Week

### Week 1: Foundation
- [ ] Day 1-2: Extract shared utilities
- [ ] Day 3-4: Create `/api/frame/quest/route.ts`
- [ ] Day 5: Test + validate backward compatibility

### Week 2: Dynamic Routing
- [ ] Day 1-2: Create `/api/frame/quest/[questId]/route.ts`
- [ ] Day 3: Create `/api/frame/gm/route.ts`
- [ ] Day 4-5: Test on localhost, push to production

### Week 3: Batch Migration
- [ ] Day 1: Migrate `leaderboards` (already has handler!)
- [ ] Day 2: Migrate `badge` (route exists, needs cleanup)
- [ ] Day 3: Migrate `onchainstats`
- [ ] Day 4: Migrate `points`
- [ ] Day 5: Test + production push

### Week 4: Finalization
- [ ] Day 1: Migrate `guild`, `referral`, `verify`
- [ ] Day 2-3: Master route cleanup
- [ ] Day 4: Documentation updates
- [ ] Day 5: Final testing + deployment

---

## 🔐 GI-13 Safe Patching Checklist

Before ANY code changes:
- [ ] Read this plan completely
- [ ] Test on `localhost:3000` first
- [ ] Verify old URLs still work
- [ ] Check Supabase frame_sessions table
- [ ] Run ESLint (max-warnings=0)
- [ ] Commit with descriptive message
- [ ] Push to GitHub
- [ ] Wait 4-5 minutes for Vercel build
- [ ] Check Vercel logs for errors
- [ ] Test on production (gmeowhq.art)
- [ ] Verify frame_sessions updates
- [ ] Update CHANGELOG.md

---

## 📝 Related Documents

- [Phase 1B.1 System Audit](./SYSTEM-AUDIT.md) - Complete system analysis
- [Phase 1B Completion Certificate](../Phase-1B/COMPLETION-CERTIFICATE.md) - Session tracking foundation
- [GI-13 Safe Patching Rules](../../../MainGoal.md#gi-13-safe-patching-rules) - Security constraints
- [Master Planning Document](../../../../../docs/maintenance/FRAME-IMPROVEMENT-ANALYSIS-2025-11-22.md) - Comprehensive roadmap

---

## ❓ FAQ

### Q: Do we need to delete the master route?
**A**: No! Keep it as orchestrator + backward compatibility layer.

### Q: Will old URLs break?
**A**: No! Master route redirects to new routes seamlessly.

### Q: How long will migration take?
**A**: ~4 weeks for full migration, 1 week for proof of concept.

### Q: What about existing Farcaster frames?
**A**: They keep working! Master route maintains old URL format.

### Q: Do we need new database tables?
**A**: No! Reuse existing `frame_sessions` table from Phase 1B.

### Q: What if something breaks?
**A**: Rollback via git revert, master route still works.

---

**Status**: ✅ Ready for Implementation  
**Next Step**: Extract shared utilities → Create `/api/frame/quest/route.ts`  
**Estimated Time**: 1 week for proof of concept, 4 weeks for full migration

---

*Last Updated: November 22, 2025*  
*Phase 1B.1 Documentation*
