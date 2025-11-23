# Phase 1F: Comprehensive Frame Improvement Plan
**Created:** November 23, 2025  
**Status:** Planning  
**Previous Phase:** Phase 1E (POST button removal + onchainstats image fix)

---

## Executive Summary

Phase 1F focuses on **consistency, completeness, and cleanup** across all 9 frame types. After fixing onchainstats frame with username display and improved layout, we identified significant gaps in other frame types.

### Impact Categories:
- 🔴 **CRITICAL**: Username display missing (social recognition)
- 🟡 **HIGH**: Layout improvements (flex appeal + readability)
- 🟢 **MEDIUM**: Code cleanup (technical debt)
- 🔵 **LOW**: Minor enhancements (polish)

---

## 🔍 Complete Frame Audit Results

### Frame Types Analyzed:
1. ✅ **OnchainStats** - Fixed in Phase 1E (commit 7c5554d)
2. ❌ **GM** - Missing username, shows address/FID
3. ❌ **Quest** - Missing username in image
4. ❌ **Points** - Missing username, no dedicated image handler
5. ❌ **Badge** - Missing username display
6. ❌ **Leaderboard** - Not audited yet
7. ❌ **Guild** - Not audited yet
8. ❌ **Referral** - Not audited yet
9. ❌ **Verify** - Not audited yet

---

## 🔴 CRITICAL ISSUES

### Issue 1: Username Display Missing (5 frames)

**Frames Affected:** GM, Quest, Points, Badge, Verify

**Current State:**
```typescript
// GM Frame Image (line 341)
👤 {user ? shortenAddress(user) : `FID ${fid}`}
// Shows: "👤 0x7539...4130" or "👤 FID 18139"
// Should show: "@heycat"
```

**Root Cause:**
- Frame routes resolve username correctly via Neynar
- buildDynamicFrameImageUrl NOT passing `username` parameter
- Image routes NOT reading `username` parameter from URL

**Impact:**
- **Social Recognition:** Users can't flex with @username
- **Consistency:** OnchainStats shows @username, others show address
- **Engagement:** Generic address less shareable than @username

**Dependency Graph:**
```
Frame Route Handler
  ├─> Profile Resolution (Neynar API) ✅ Working
  ├─> buildDynamicFrameImageUrl() ❌ Missing username param
  └─> Frame Metadata ✅ Shows @username in description

Image Route Handler
  ├─> readParam(url, 'username') ❌ Not reading
  ├─> Identity Display ❌ Uses address/FID fallback
  └─> Layout Rendering ❌ No @username in card
```

**Fix Requirements:**
1. Update 5 frame routes to pass `username` + `displayName` in `extra` params
2. Update 5 image routes to read `username` + `displayName` params
3. Update 5 image layouts to prioritize `@username` over address
4. Test profile resolution for each frame type (address, FID, username input)

---

### Issue 2: Points Frame Has No Dedicated Image Handler

**Current State:**
- Points frame uses DEFAULT onchainstats fallback (line 1701 in image route)
- Shows generic "Onchain Stats" instead of "Points & XP"
- Missing level, XP bar, tier visualization

**Impact:**
- **Functionality:** Points data passed but not displayed properly
- **UX:** Confusing - users expect "Points" but see "Onchain Stats"
- **Branding:** Points system not visually distinct

**Fix Requirements:**
1. Create dedicated `if (type === 'points')` handler in image route
2. Design XP/Level card layout (similar to GM streak card)
3. Add visual XP progress bar
4. Display tier badge prominently
5. Test with real user points data

---

## 🟡 HIGH PRIORITY IMPROVEMENTS

### Issue 3: GM Frame Layout Outdated

**Current Problems:**
- Large wasted space: 180x180px icon (☀️)
- Small user identity box below icon
- Stats cramped in right column
- No visual hierarchy for streak milestones

**Comparison with OnchainStats:**
```
GM Frame (OLD)          OnchainStats (NEW)
┌─────────┬────┐       ┌──────────────────┐
│ ☀️      │Stat│       │   @username      │
│ 180x180│box │       ├────────┬─────────┤
│         │    │       │Primary │Reputation│
│ Address │    │       │Stats   │Scores    │
└─────────┴────┘       └────────┴─────────┘
Wasted: 60%            Wasted: 10%
```

**Recommended Layout:**
```
┌─────────────────────────────────┐
│ [GM]    @heycat        [Base]   │ ← Username prominent
├─────────────────────────────────┤
│        🔥 7-Day Streak          │ ← Large streak badge
├───────────────┬─────────────────┤
│ GM Stats      │ Milestones      │
│ Count: 22     │ ⚡ Week Warrior │
│ Streak: 7     │ 🎯 23 to Legend │
│ Rank: #142    │                 │
└───────────────┴─────────────────┘
```

---

### Issue 4: Quest Frame Missing User Context

**Current Problems:**
- No username display in image
- Quest stats only (no personal progress emphasis)
- Missing user's quest history context

**Recommended Additions:**
- User's completion rate for this chain
- User's total quests completed
- Username displayed prominently
- Personal achievement badges

---

### Issue 5: Badge Frame Missing Collection Stats

**Current Problems:**
- Only shows FID or address
- No visual badge showcase
- Missing collection completion percentage

**Recommended Additions:**
- @username display
- "X of Y badges earned" prominently
- Rarity tier of best badge
- Visual badge grid (if space allows)

---

## 🟢 MEDIUM PRIORITY (Cleanup)

### Issue 6: Delete Deprecated POST Handler

**Location:** `app/api/frame/route.tsx` lines 2590-3620 (1030+ lines)

**Current State:** Commented out in Phase 1E

**Impact:**
- **Code Size:** 1030+ lines of dead code
- **Maintenance:** Confusing for future developers
- **Performance:** Slightly larger bundle (minimal)

**Removal Plan:**
```typescript
// DELETE ENTIRE SECTION:
/**
 * ==================================================================================
 * DEPRECATED: POST HANDLER (Phase 1E - November 2025)
 * ==================================================================================
 * ...1030 lines...
 */
```

**Testing Required:**
- Verify no references to POST handler functions
- Ensure all frames use link buttons only
- Test all 9 frame types after deletion

---

### Issue 7: Remove Unused Frame Utilities

**Files to Clean:**
```
app/api/frame/route.tsx
  ├─> buildContextualButtons() (commented, line 494)
  ├─> safeJson() (commented, line 500)
  ├─> toAbsoluteUrl() (commented, line 494)
  └─> toOptionalString() (commented, line 503)

types/
  ├─> QuestButtonPlan (commented, line 808)
  ├─> GuildButtonPlan (commented, line 824)
  ├─> ReferralButtonPlan (commented, line 836)
  ├─> PointsButtonPlan (commented, line 845)
  └─> LeaderboardButtonPlan (commented, line 854)
```

**Impact:** ~200 lines of commented code removal

---

### Issue 8: Consolidate Frame Metadata Logic

**Problem:** Duplicate `frameKey()` patterns across handlers

**Current State:**
```typescript
// Repeated in 9 frame handlers:
const fcMeta: Record<string, string> = {
  [frameKey('entity')]: 'gm',
  [frameKey('fid')]: String(fid),
  // ... 5-15 more keys per handler
}
```

**Proposed:** Extract to helper function
```typescript
function buildFrameMetadata(type: FrameType, params: FrameMetaParams): Record<string, string> {
  const meta: Record<string, string> = {
    [frameKey('entity')]: type,
    [frameKey('version')]: FRAME_VERSION,
  }
  // Conditional additions based on params
  return meta
}
```

**Impact:** ~150 lines reduced, better consistency

---

## 🔵 LOW PRIORITY (Polish)

### Issue 9: Add Automated Frame Testing

**Proposal:** Create Playwright tests for all frame types

```typescript
test('GM frame shows username', async ({ page }) => {
  await page.goto('/api/frame?type=gm&fid=18139')
  const meta = await page.locator('meta[property="og:image"]')
  const imageUrl = await meta.getAttribute('content')
  expect(imageUrl).toContain('username=heycat')
})
```

**Coverage Needed:**
- Image URL parameter validation
- Username resolution for address/FID/username inputs
- Profile fallback when Neynar unavailable
- Frame metadata completeness

---

### Issue 10: Performance Profiling

**Questions to Answer:**
- Which frame type is slowest?
- Are Neynar API calls cached properly?
- Can we parallelize profile + data queries?
- Is image generation optimized?

**Tools:**
- Vercel Analytics
- Custom trace logging (already in place)
- Lighthouse CI

---

## 📋 Phase 1F Task Breakdown

### Task 1: GM Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Update GM frame route (line 2514):
   ```typescript
   const imageUrl = fid ? buildDynamicFrameImageUrl({ 
     type: 'gm', 
     fid,
     extra: { 
       gmCount, 
       streak,
       username: profile?.username || undefined,
       displayName: profile?.displayName || undefined,
     } 
   }, origin) : defaultFrameImage
   ```

2. Update GM image route (line 155):
   ```typescript
   const username = readParam(url, 'username', '')
   const displayName = readParam(url, 'displayName', '')
   const identity = username 
     ? `@${username}` 
     : displayName 
       ? displayName 
       : user 
         ? shortenAddress(user) 
         : fid 
           ? `FID ${fid}` 
           : 'Anonymous'
   ```

3. Update GM image layout (line 341):
   ```typescript
   // Replace shortenAddress fallback with identity
   <div>{identity}</div>
   ```

4. Test:
   - `curl localhost:3001/api/frame?type=gm&fid=18139`
   - Verify `username=heycat` in image URL
   - Generate PNG and verify @heycat displays

**Success Criteria:**
- ✅ Image URL includes `username` parameter
- ✅ Image displays `@heycat` not address
- ✅ Streak badge still working
- ✅ No TypeScript errors

---

### Task 2: Quest Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 1.5 hours  
**Dependencies:** None

**Steps:**
1. Check if Quest frame resolves profile (line 1491)
2. Add username to buildDynamicFrameImageUrl (line 1653)
3. Update Quest image route to read username (line 939)
4. Update Quest image layout to show @username

**Testing:**
- Quest with address input
- Quest with FID input
- Quest with username input
- Quest without user context

---

### Task 3: Points Frame Dedicated Handler 🔴
**Priority:** CRITICAL  
**Effort:** 4 hours  
**Dependencies:** None

**Steps:**
1. Create new `if (type === 'points')` handler in image route
2. Design XP/Level card layout:
   ```
   ┌─────────────────────────┐
   │ [@username]    [Tier]   │
   │                         │
   │      Level 5            │
   │   ▓▓▓▓▓▓▓░░░ 65%        │ ← XP bar
   │   1,300 / 2,000 XP      │
   │                         │
   │ Total: 5,420 pts        │
   │ Available: 1,200 pts    │
   └─────────────────────────┘
   ```
3. Implement XP progress bar visualization
4. Add tier badge (gold/silver/bronze)
5. Test with real user data

**Success Criteria:**
- ✅ Shows "Points & XP" not "Onchain Stats"
- ✅ XP bar visualizes progress
- ✅ Username displayed
- ✅ Tier badge prominent

---

### Task 4: Badge Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Update Badge frame route to resolve profile
2. Pass username to buildDynamicFrameImageUrl (line 2392)
3. Create Badge image handler (currently missing)
4. Design collector card layout

---

### Task 5: GM Frame Layout Redesign 🟡
**Priority:** HIGH  
**Effort:** 3 hours  
**Dependencies:** Task 1

**Layout Goals:**
- Remove 180x180px icon waste
- Prominent username header
- Larger streak display
- Show milestone progress
- 2-column layout like onchainstats

---

### Task 6: Delete POST Handler 🟢
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Dependencies:** All frames tested

**Steps:**
1. Search for any remaining POST handler references
2. Delete lines 2590-3620 in route.tsx
3. Delete commented helper functions
4. Delete commented type definitions
5. Run full test suite
6. Verify all 9 frames still work

---

### Task 7: Verify/Leaderboard/Guild/Referral Audit 🟡
**Priority:** HIGH  
**Effort:** 6 hours  
**Dependencies:** None

**Steps:**
1. Audit each frame type systematically
2. Check username support
3. Review layout effectiveness
4. Document findings
5. Create sub-tasks for fixes

---

### Task 8: Frame Testing Suite 🔵
**Priority:** LOW  
**Effort:** 8 hours  
**Dependencies:** All frames fixed

**Coverage:**
- Unit tests for frame route handlers
- Integration tests for image generation
- E2E tests with Playwright
- Profile resolution edge cases
- Cache behavior validation

---

## 🎯 Phase 1F Success Metrics

### Completion Criteria:
- ✅ All 9 frames show @username (not address/FID)
- ✅ All frames have dedicated image handlers
- ✅ All layouts follow 2-column Yu-Gi-Oh! card design
- ✅ POST handler deleted (1030+ lines removed)
- ✅ All commented code removed (~200 lines)
- ✅ All frames tested on localhost + production
- ✅ Zero TypeScript errors
- ✅ Vercel build passes with 0 warnings

### Quality Metrics:
- **Consistency:** Same identity display pattern across all frames
- **Completeness:** No missing stats or context
- **Performance:** Profile resolution < 500ms
- **Maintainability:** Code reduced by 1200+ lines
- **UX:** Every frame is "flex-worthy" (shareable)

---

## 📊 Effort Estimation

### Total Effort: ~30 hours

**By Priority:**
- 🔴 CRITICAL (5 tasks): 13.5 hours
- 🟡 HIGH (2 tasks): 9 hours
- 🟢 MEDIUM (2 tasks): 2 hours
- 🔵 LOW (2 tasks): 5.5 hours

**By Category:**
- Username Support: 9.5 hours (5 frames)
- Layout Improvements: 10 hours (3 frames)
- Code Cleanup: 3 hours
- Testing/Polish: 7.5 hours

**Recommended Approach:**
1. **Week 1:** Critical tasks (username support for all frames)
2. **Week 2:** High priority (layout redesigns, audits)
3. **Week 3:** Medium/Low priority (cleanup, testing)

---

## 🔗 Dependencies & Risks

### External Dependencies:
- ✅ Neynar API (profile resolution) - Working
- ✅ Supabase (frame data) - Working
- ✅ Vercel (deployment) - Working

### Internal Dependencies:
- `lib/share.ts` - buildDynamicFrameImageUrl() ✅
- `lib/neynar.ts` - Profile resolution ✅
- `app/api/frame/image/route.tsx` - Image generation ✅

### Risks:
1. **Profile Resolution Failures:**
   - Mitigation: Proper fallbacks (address → FID → "Anonymous")
   - Already handled in onchainstats

2. **Image Generation Complexity:**
   - Mitigation: Reuse onchainstats layout patterns
   - Tested and working

3. **Breaking Changes:**
   - Mitigation: Test each frame after changes
   - Keep Vercel deployment preview links

4. **Scope Creep:**
   - Mitigation: Stick to documented tasks
   - Save enhancements for Phase 1G

---

## 📝 Implementation Notes

### Best Practices:
1. **Test locally first:** Use `localhost:3001` for all testing
2. **Commit atomically:** One task = one commit
3. **Update this document:** Mark completed tasks
4. **Document breaking changes:** Update CHANGELOG.md
5. **Verify production:** Wait 4-5 min for Vercel, test with Farcaster proxy

### Code Patterns to Follow:

**Username Resolution (Frame Route):**
```typescript
// 1. Resolve profile from address/FID/username
const profile = await resolveUserProfile(userParam, fid)

// 2. Pass to image URL
const imageUrl = buildDynamicFrameImageUrl({
  type: 'frametype',
  fid,
  extra: {
    username: profile?.username || undefined,
    displayName: profile?.displayName || undefined,
    // ... other params
  }
}, origin)
```

**Username Display (Image Route):**
```typescript
// 1. Read params
const username = readParam(url, 'username', '')
const displayName = readParam(url, 'displayName', '')
const address = readParam(url, 'user', user)

// 2. Priority fallback
const identity = username 
  ? `@${username}` 
  : displayName 
    ? displayName 
    : address 
      ? shortenAddress(address) 
      : fid 
        ? `FID ${fid}` 
        : 'Anonymous'

// 3. Display prominently
<div style={{ fontSize: 20, fontWeight: 900 }}>
  {identity}
</div>
```

**Layout Pattern (2-Column Yu-Gi-Oh! Card):**
```typescript
<div style={{ display: 'flex', gap: 12 }}>
  {/* Left Column - Primary Data */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {/* Large stats with labels */}
  </div>
  
  {/* Right Column - Secondary/Reputation */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {/* Scores, badges, milestones */}
  </div>
</div>
```

---

## 🚀 Next Steps

### Immediate Actions:
1. ✅ Create this planning document
2. ⏳ Review and approve Phase 1F scope
3. ⏳ Start Task 1: GM Frame Username Support
4. ⏳ Begin systematic frame-by-frame fixes

### Phase 1F Kickoff Checklist:
- [ ] Planning document reviewed
- [ ] Effort estimation approved
- [ ] Testing strategy defined
- [ ] Local environment ready
- [ ] Backup of current working state
- [ ] Task 1 implementation started

---

## 📚 References

### Related Documents:
- [PHASE-1E-AUDIT-REPORT.md](./PHASE-1E-AUDIT-REPORT.md) - Phase 1E findings
- [PHASE-1E-COMPLETE.md](../../../PHASE-1E-COMPLETE.md) - Phase 1E summary
- [CHANGELOG.md](../../../CHANGELOG.md) - Version history

### Key Commits:
- `9f061de` - Phase 1E: Fixed onchainstats image parameters
- `7c5554d` - Phase 1E: MEGA onchainstats improvement (username + redesign)
- `1addaa0` - Phase 1E: Removed unused imports and types

### Testing URLs:
```bash
# Localhost testing
localhost:3001/api/frame?type=gm&fid=18139
localhost:3001/api/frame?type=quest&questId=1&chain=base
localhost:3001/api/frame?type=onchainstats&user=0x7539...
localhost:3001/api/frame?type=points&user=0x7539...
localhost:3001/api/frame?type=badge&fid=18139

# Production testing (after Vercel deploy)
gmeowhq.art/api/frame?type=...

# Farcaster proxy testing
https://proxy.wrpcd.net/?url=https%3A%2F%2Fgmeowhq.art%2Fapi%2Fframe%2F...
```

---

**Document Status:** ✅ Complete  
**Last Updated:** November 23, 2025  
**Next Review:** After Task 1 completion
