# Frame Strategy Decision - December 11, 2025

## ✅ DECISION: Refactor Existing Code, Don't Migrate to Frog

### Reasoning

**Current Status**:
- ✅ 3003-line `app/api/frame/route.tsx` **working in production**
- ✅ All 30+ frame types tested and deployed
- ✅ Image generation working (~300ms, acceptable)
- ✅ Frame logic correct and validated

**Frog Migration Issues**:
- ❌ Satori WASM compatibility issue with Next.js 15.0.0
- ❌ Error: `export 'init' was not found in 'satori/wasm'`
- ❌ No official fix available
- ❌ High migration risk (3000+ lines to rewrite)
- ❌ Uncertain timeline and benefits

**Better Approach**:
- ✅ **Refactor existing code** into modular structure
- ✅ Keep exact same working logic
- ✅ Extract handlers into separate files
- ✅ Zero downtime, incremental migration
- ✅ Same functionality, better maintainability

## Refactoring Plan

### Current Problem
```
app/api/frame/route.tsx (3003 lines)
├── Types (200 lines)
├── Utils (500 lines)
├── Blockchain logic (300 lines)
├── Neynar integration (200 lines)
├── Quest handler (400 lines)
├── Guild handler (300 lines)
├── Points handler (250 lines)
├── Referral handler (200 lines)
├── Leaderboard handler (300 lines)
├── GM handler (200 lines)
├── Badge handler (150 lines)
├── OnchainStats handler (200 lines)
└── HTML builder (300 lines)
```

### Solution: Extract & Modularize

```
lib/frames/
├── types.ts (200 lines)         # Shared types
├── utils.ts (500 lines)         # Shared utilities
├── blockchain.ts (300 lines)    # Blockchain fetching
├── neynar.ts (200 lines)        # Neynar API
├── html-builder.ts (300 lines)  # buildFrameHtml
├── compose-text.ts (200 lines)  # Share text generation
└── handlers/
    ├── quest.ts (400 lines)
    ├── guild.ts (300 lines)
    ├── points.ts (250 lines)
    ├── referral.ts (200 lines)
    ├── leaderboard.ts (300 lines)
    ├── gm.ts (200 lines)
    ├── badge.ts (150 lines)
    ├── onchainstats.ts (200 lines)
    └── generic.ts (100 lines)

app/api/frame/
└── route.tsx (150 lines)        # Main router only
```

### Benefits

**Maintainability**:
- ✅ 300-line files instead of 3000-line file
- ✅ Easy to find frame-specific logic
- ✅ Clear separation of concerns
- ✅ Simple to add new frame types

**Testing**:
- ✅ Test each handler independently
- ✅ Mock blockchain/Neynar easily
- ✅ Fast unit tests per frame type

**Safety**:
- ✅ Keep exact same working logic
- ✅ No behavior changes
- ✅ Incremental migration (one handler at a time)
- ✅ Easy rollback if issues

**Development**:
- ✅ Parallel development (multiple frame types)
- ✅ Reduced merge conflicts
- ✅ Faster debugging
- ✅ Clear code ownership

## Migration Strategy

### Phase 1: Foundation (2 hours)

1. Create directory structure
2. Extract types (`lib/frames/types.ts`)
3. Extract utils (`lib/frames/utils.ts`)
4. Test: Ensure everything still compiles

### Phase 2: Extract Handlers (6 hours)

**For each handler** (30 min each):
1. Create handler file (e.g., `lib/frames/handlers/quest.ts`)
2. Copy logic from `route.tsx`
3. Update imports
4. Update router to use handler
5. Test: Verify frame type still works
6. Commit

**Order**:
1. ✅ Quest (most used)
2. ✅ GM (most frequent)
3. ✅ Points (important)
4. ✅ Leaderboard (high traffic)
5. ✅ Badge (recently updated)
6. Guild, Referral, OnchainStats, Generic (remaining)

### Phase 3: Cleanup (2 hours)

1. Remove extracted code from `route.tsx`
2. Final testing of all frame types
3. Performance testing
4. Documentation update
5. Deploy

### Phase 4: Monitoring (1 week)

1. Monitor frame generation times
2. Track errors per frame type
3. User feedback
4. Performance metrics

## Testing Checklist

### Before Migration
```bash
# Test all frame types
./scripts/test-frames-before.sh

# Results saved to:
# - tests/frame-outputs/before/quest.html
# - tests/frame-outputs/before/guild.html
# - tests/frame-outputs/before/points.html
# etc.
```

### During Migration (Per Handler)
```bash
# Test specific frame type
curl http://localhost:3000/api/frame?type=quest&questId=1 > after-quest.html
diff tests/frame-outputs/before/quest.html after-quest.html

# Should be identical or only whitespace differences
```

### After Migration
```bash
# Full regression test
./scripts/test-all-frames.sh

# Compare before/after for ALL frame types
./scripts/compare-frame-outputs.sh

# Performance test
./scripts/benchmark-frames.sh
```

## Success Metrics

**Code Quality**:
- ✅ Average file size: <400 lines
- ✅ Max file size: <600 lines
- ✅ Test coverage: >80%

**Performance**:
- ✅ Frame generation: <300ms (same as before)
- ✅ No increase in error rate
- ✅ Same or better response times

**Maintainability**:
- ✅ New frame type: <2 hours (vs 4 hours before)
- ✅ Bug fix: <30 min (vs 1 hour before)
- ✅ Code review: <30 min (vs 2 hours before)

## Timeline

**Total**: 11 hours (1.5 days)

- **Day 1** (6 hours):
  - Phase 1: Foundation (2h)
  - Phase 2: Extract 6 handlers (4h)

- **Day 2** (5 hours):
  - Phase 2: Extract remaining handlers (3h)
  - Phase 3: Cleanup & testing (2h)

**Deployment**: End of Day 2

## Risk Assessment

**Low Risk** ✅:
- Exact same logic (just moved)
- Incremental migration (one handler at a time)
- Easy rollback (keep old file)
- Production validation at each step

**Mitigation**:
- Keep `route.backup.tsx` for rollback
- Test each handler before proceeding
- Deploy in phases (not all at once)
- Monitor metrics closely

## Alternatives Considered

### ❌ Option 1: Migrate to Frog
- **Pros**: Modern framework, better DX
- **Cons**: WASM issues, high risk, rewrite needed
- **Decision**: Rejected (too risky)

### ❌ Option 2: Use OnchainKit
- **Pros**: Coinbase-backed, good docs
- **Cons**: Different patterns, still a rewrite
- **Decision**: Rejected (not worth migration)

### ❌ Option 3: Keep as-is
- **Pros**: No work needed
- **Cons**: Continues to be hard to maintain
- **Decision**: Rejected (technical debt growing)

### ✅ Option 4: Refactor existing code
- **Pros**: Low risk, incremental, keeps working code
- **Cons**: Still manual work
- **Decision**: SELECTED (best balance)

## Next Steps

1. ✅ Review this decision document
2. ⏳ Create `lib/frames/` directory structure
3. ⏳ Extract types and utils
4. ⏳ Start with Quest handler
5. ⏳ Complete remaining handlers
6. ⏳ Test and deploy

## References

- See `FRAME-REFACTOR-PLAN.md` for detailed implementation plan
- See `FRAME-WASM-ISSUE-RESOLUTION.md` for Frog migration issues
- See `app/api/frame/route.tsx` for current implementation
