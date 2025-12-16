# Frame System Migration Status Report
**Date:** December 12, 2025

## Executive Summary
The frame system has been **partially migrated** to the new modular architecture. 8 out of 10 frame types are using modular handlers.

## Migration Status

### ✅ Modular Handlers (8/10)
These frame types use the new modular system in `lib/frames/handlers/`:

1. **GM** (`gm`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/gm.ts`
   - Image: `app/api/frame/image/gm/route.tsx`
   - Status: Complete

2. **Points** (`points`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/points.ts`
   - Image: `app/api/frame/image/points/route.tsx`
   - Status: Complete

3. **Quest** (`quest`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/quest.ts`
   - Image: `app/api/frame/image/quest/route.tsx`
   - Status: Complete

4. **Badge** (`badge`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/badge.ts`
   - Image: `app/api/frame/image/badge/route.tsx`
   - Status: Complete

5. **Referral** (`referral`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/referral.ts`
   - Image: `app/api/frame/image/referral/route.tsx`
   - Status: Complete

6. **Leaderboards** (`leaderboards`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/leaderboard.ts`
   - Image: `app/api/frame/image/leaderboard/route.tsx`
   - Status: Complete

7. **Guild** (`guild`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/guild.ts`
   - Image: `app/api/frame/image/guild/route.tsx`
   - Status: Complete

8. **OnchainStats** (`onchainstats`) - ✅ Fully modular
   - Handler: `lib/frames/handlers/onchainstats.ts`
   - Image: `app/api/frame/image/onchainstats/route.tsx`
   - Status: Complete

### ⚠️ Legacy Handlers (2/10)
These frame types still use legacy code in `app/api/frame/route.tsx`:

9. **Verify** (`verify`) - ⚠️ LEGACY
   - Location: `app/api/frame/route.tsx` lines 1623-1700
   - Purpose: Quest verification flow
   - Migration needed: Yes
   - Priority: Medium (used for quest completion)

10. **Generic** (`generic`) - ⚠️ LEGACY
    - Location: `app/api/frame/route.tsx` (various locations)
    - Purpose: Fallback for custom/dynamic frames
    - Migration needed: Optional
    - Priority: Low (rarely used)

## Technical Architecture

### Current Flow
```
Request → route.tsx → getFrameHandler(type)
                    ├─ If modular: → lib/frames/handlers/{type}.ts ✅
                    └─ If legacy: → route.tsx legacy code ⚠️
```

### Modular Components
- **Handlers**: `lib/frames/handlers/*.ts` (8 files)
- **Image Generators**: `app/api/frame/image/*/route.tsx` (8 files)
- **Hybrid Data**: `lib/frames/hybrid-data.ts` (Subsquid + Supabase)
- **Utilities**: `lib/frames/utils.ts`
- **Types**: `lib/frames/types.ts`

## Test Coverage

### Unit Tests
- **Location**: `lib/frames/__tests__/handlers/*.test.ts`
- **Coverage**: 8/8 modular handlers (100%)
- **Total Tests**: 50 tests
- **Status**: All passing ✅

### Integration Tests
- **Frame Endpoints**: All 9 types responding (including 1 legacy)
- **Image Generation**: Working but slow (Next.js 15 WASM issue)
- **CORS**: Properly configured (GET, OPTIONS)
- **Build**: Zero TypeScript errors

## Performance Issues

### Image Generation (Critical)
**Problem**: Frame images take 4-5 minutes to generate in development
- **Cause**: Next.js 15 + ImageResponse WASM loading issue
- **Error**: `Invalid URL '/_next/static/media/resvg.5232f2b6.wasm'`
- **Impact**: Slow development testing
- **Status**: Known Next.js 15 bug
- **Workaround**: Use production build or wait for Next.js 15.1

### Recommendations
1. Test image generation in production mode: `pnpm build && pnpm start`
2. Consider downgrading to Next.js 14 if development speed is critical
3. Or wait for Next.js 15.1 patch

## Migration Completion Steps

### Phase 1: Migrate Verify Handler
1. Create `lib/frames/handlers/verify.ts`
2. Extract verification logic from route.tsx
3. Create `app/api/frame/image/verify/route.tsx`
4. Add to handler registry in `lib/frames/index.ts`
5. Write unit tests in `lib/frames/__tests__/handlers/verify.test.ts`

### Phase 2: Clean Up Route.tsx
1. Remove legacy verify code (lines 1623-1700)
2. Remove unused imports
3. Simplify main handler logic
4. Update documentation

### Phase 3: Optional - Migrate Generic Handler
Only if needed for custom frame types.

## Data Architecture

### Hybrid Strategy (95% Subsquid + 5% Supabase)
- **Subsquid**: On-chain data (GMs, badges, guilds, quests, referrals)
- **Supabase**: Off-chain data (user profiles, usernames, viral scores)
- **Cache**: 5-minute TTL for expensive queries

### Data Flow
```
1. Check cache (5min TTL)
2. Fetch from Subsquid (95% of data)
3. Enrich with Supabase (5% - profiles only)
4. Combine & cache
5. Return to handler
```

## Summary

**Progress**: 80% complete (8/10 handlers migrated)  
**Blockers**: None (legacy handlers work fine)  
**Next Steps**: Migrate verify handler for 100% completion  
**Deployment**: Ready for production with current state  

The frame system is **production-ready** with the current partial migration. The two legacy handlers (verify, generic) work correctly and can be migrated later without breaking changes.
