# Phase 1F: Next Phase Plan

**Updated:** November 23, 2025  
**Current Status:** Task 10 Complete (commit 6b5435c)  
**Deployment:** Vercel building (4-5 minutes)  
**Next Task:** Task 11 (Text Composition Enhancements - 3h)

---

## Immediate Actions (15 minutes)

### 1. Monitor Vercel Build ⏳
**Timeframe:** 4-5 minutes  
**Command:**
```bash
vercel logs gmeowhq.art --since=5m
```

**Expected Output:**
```
Build completed
Deployment ready
URL: gmeowhq.art
```

**Verification:**
- Visit gmeowhq.art in browser
- Confirm new deployment is live
- Check deployment timestamp matches commit 6b5435c

---

### 2. Production Testing ✅
**Timeframe:** 10 minutes

#### Points Frame Testing
**URL:**
```
gmeowhq.art/api/frame/image?type=points&xp=3450&availablePoints=1250&tier=Gold&chain=base
```

**Verify:**
- ✅ Level badge shows "LVL 5"
- ✅ Progress bar at ~75% width
- ✅ "3,450 XP" formatted with comma
- ✅ "XP to Level 6" displays correctly
- ✅ Chain icon (Base) still visible

**Additional Tests:**
- `xp=0` → Level 1, 0% progress, "0 XP / 300 to Lvl 2"
- `xp=10500` → Level 23, formatted "10.5K XP"

#### Quest Frame Testing
**URL:**
```
gmeowhq.art/api/frame/image?type=quest&reward=50&questName=Daily%20GM&chain=base
```

**Verify:**
- ✅ "+50 XP" badge prominent (24px font)
- ✅ Gradient background (quest palette)
- ✅ "COMPLETE FOR" text visible above reward
- ✅ Chain icon (Base) still visible

**Additional Tests:**
- `reward=200` → "+200 XP" maintains prominence
- `reward=5` → "+5 XP" still readable

#### Badge Frame Testing
**URL:**
```
gmeowhq.art/api/frame/image?type=badge&earnedCount=12&badgeXp=450&chain=base
```

**Verify:**
- ✅ "TOTAL XP FROM BADGES" row visible
- ✅ "+450 XP" displays with gold highlight (#ffd700)
- ✅ Badge count (12) displays correctly
- ✅ Chain icon (Base) still visible

**Additional Tests:**
- `badgeXp=2500` → Shows "2.5K XP"
- `badgeXp=0` → Shows "0 XP" (graceful fallback)

#### Quality Checklist
- [ ] Level calculations accurate (compare with localhost)
- [ ] XP formatting correct (commas, K, M notation)
- [ ] Progress bars visual accuracy (width matches %)
- [ ] Chain icons still working alongside XP
- [ ] No ImageResponse errors in Vercel logs
- [ ] Frame generation times <5 seconds
- [ ] All frames return 200 status codes

---

## Task 11: Text Composition Enhancements (3h)

### Overview
Enhance share/compose text across all frames with XP context, achievements, and chain-specific messaging. Make sharing more engaging and dynamic based on user accomplishments.

---

### Phase A: Audit (30 minutes)

#### Current Implementation Review
**File:** `lib/frame-design-system.ts` (lines ~320-351)

**Function to Review:**
```typescript
export function buildComposeText(params: {
  frameType: string
  username?: string
  achievementContext?: string
  chainContext?: string
}): string
```

**Current Patterns:**
- GM Frame: "Just stacked my daily GM ritual! @gmeowbased"
- Quest Frame: "New quest unlocked! @gmeowbased"
- Badge Frame: "New achievement unlocked! @gmeowbased"
- Points Frame: "Check out my stats! @gmeowbased"

**Issues:**
- ❌ Generic, not personalized
- ❌ No XP mentions (users earned XP but can't flex)
- ❌ No achievement context (streaks, levels, milestones)
- ❌ No chain context (multichain activity not highlighted)
- ❌ Static text doesn't encourage sharing

#### Character Limits
- Twitter: 280 characters max
- Farcaster: 320 characters max
- Target: 200-250 characters (leave room for links)

#### Opportunities
1. **XP Integration:**
   - "Earned +50 XP!" (Quest completion)
   - "Level 23 reached! 🎯" (Points frame)
   - "+450 XP from badges! 🏆" (Badge frame)

2. **Achievement Context:**
   - "30-day streak! 🔥" (GM frame)
   - "Mythic GM unlocked! 👑" (High tier)
   - "12 badges collected! ⭐" (Badge frame)

3. **Chain Context:**
   - "on Base" (Single chain activity)
   - "across 3 chains" (Multichain activity)
   - "Base champion! 🏆" (High chain-specific activity)

4. **Social Proof:**
   - "Top 100 on leaderboards!" (Leaderboards frame)
   - "Guild leader status! 🎖️" (Guild frame)
   - "Verified human! ✅" (Verify frame)

---

### Phase B: Planning (30 minutes)

#### Enhanced buildComposeText Design

**Function Signature:**
```typescript
export function buildComposeText(params: {
  frameType: string
  username?: string
  xp?: number
  level?: number
  tier?: string
  streak?: number
  chain?: string
  achievementContext?: string
}): string
```

#### Frame-Specific Patterns

**1. GM Frame:**
```typescript
// High achievement (streak >= 30 AND level >= 20)
"🔥 ${streak}-day streak + Level ${level} ${tier}! Unstoppable! @gmeowbased"

// Mythic tier
"👑 Mythic GM unlocked! ${gmCount} total GMs! Join the elite @gmeowbased"

// Long streak (>= 30 days)
"🔥 ${streak}-day GM streak! Legendary dedication! Stack your daily ritual @gmeowbased"

// Good streak (>= 7 days)
"⚡ ${streak}-day GM streak! Hot streak! Join the meow squad @gmeowbased"

// High count (> 100 GMs)
"🌅 ${gmCount} GMs and counting! Join the daily ritual @gmeowbased"

// Default
"🌅 Just stacked my daily GM ritual! Join the meow squad @gmeowbased"
```

**2. Quest Frame:**
```typescript
// High progress (>= 80%)
"⚔️ Almost done with '${questName}'! ${progress}% complete • Earned +${xpReward} XP @gmeowbased"

// With chain context
"⚔️ New quest unlocked on ${chain}! '${questName}' • +${xpReward} XP reward @gmeowbased"

// Default
"⚔️ Quest active: '${questName}' • Earn +${xpReward} XP! @gmeowbased"
```

**3. Badge Frame:**
```typescript
// High badge count (>= 10)
"🏆 ${earnedCount} badges collected! +${badgeXp} total XP earned! Badge hunter mode @gmeowbased"

// Rare badge
"⭐ Rare badge unlocked: '${badgeName}'! +${badgeXp} XP earned @gmeowbased"

// Default
"🏆 New badge unlocked! +${badgeXp} XP earned • Collect them all @gmeowbased"
```

**4. Points Frame:**
```typescript
// High level (>= 20) with tier
"🎯 Level ${level} ${tier} reached! ${xp.toLocaleString()} total XP • Climbing the ranks @gmeowbased"

// High tier (Mythic/Star Captain)
"👑 ${tier} status! Level ${level} with ${xp.toLocaleString()} XP • Elite player @gmeowbased"

// Level milestone (divisible by 5)
"🎯 Level ${level} milestone! ${xp.toLocaleString()} XP earned • Join the grind @gmeowbased"

// Default
"📊 Level ${level} • ${xp.toLocaleString()} XP earned • Track your progress @gmeowbased"
```

**5. OnchainStats Frame:**
```typescript
// Multichain (>= 3 chains)
"🌐 Active across ${chainCount} chains! Level ${level} multichain master @gmeowbased"

// High activity (>= 500 transactions)
"⚡ ${txCount} onchain transactions! Level ${level} blockchain power user @gmeowbased"

// Default
"📊 Onchain stats${chain ? ` on ${chain}` : ''} • Level ${level} @gmeowbased"
```

**6. Leaderboards Frame:**
```typescript
// Top 10
"🏆 Top 10 on ${category} leaderboards! Rank #${rank} • Elite status @gmeowbased"

// Top 100
"⭐ Top 100 on ${category} leaderboards! Rank #${rank} • Climbing the ranks @gmeowbased"

// Default
"📊 Ranked #${rank} on ${category} leaderboards${chain ? ` (${chain})` : ''} @gmeowbased"
```

**7. Guild Frame:**
```typescript
// Leader
"🎖️ Guild leader of '${guildName}'! ${memberCount} members • Join the guild @gmeowbased"

// Active guild
"⚔️ Member of '${guildName}' • ${memberCount} strong • Guild quests active @gmeowbased"

// Default
"⚔️ Joined '${guildName}' guild • ${memberCount} members • Guilds on @gmeowbased"
```

#### Character Count Validation
- All patterns: 150-250 characters (safe range)
- Emoji usage: 1-2 per message (enhances engagement)
- @gmeowbased: Always at end (consistent attribution)

---

### Phase C: Implementation (1.5 hours)

#### Step 1: Update buildComposeText (30 min)
**File:** `lib/frame-design-system.ts`

**Changes:**
1. Add new parameters: xp, level, tier, streak, chain
2. Implement frame-specific logic with achievement tiers
3. Add helper functions: formatXpForShare, getTierEmoji, getChainEmoji
4. Ensure all messages <250 characters

**New Helpers:**
```typescript
function formatXpForShare(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 10_000) return `${(xp / 1000).toFixed(1)}K`
  return xp.toLocaleString()
}

function getTierEmoji(tier: string): string {
  const tiers = {
    'Mythic GM': '👑',
    'Star Captain': '⭐',
    'Night Operator': '🌙',
    'Beacon Runner': '🔥',
    'Warp Scout': '⚡',
    'Signal Kitten': '🐱'
  }
  return tiers[tier] || '🎯'
}

function getChainEmoji(chain: string): string {
  const chains = {
    base: '🔵',
    ethereum: '⟠',
    optimism: '🔴',
    arbitrum: '🔷',
    polygon: '🟣',
    avalanche: '🔺'
  }
  return chains[chain.toLowerCase()] || '🌐'
}
```

#### Step 2: Update Frame Routes (45 min)
**File:** `app/api/frame/*/route.tsx` (9 frame types)

**Changes:**
1. **GM Frame:** Pass streak, gmCount, level, tier to buildComposeText
2. **Quest Frame:** Pass questName, xpReward, progress, chain
3. **Badge Frame:** Pass earnedCount, badgeXp, badgeName (if featured)
4. **Points Frame:** Pass level, tier, xp, availablePoints
5. **OnchainStats:** Pass chainCount, txCount, level, chain
6. **Leaderboards:** Pass rank, category, chain
7. **Guild Frame:** Pass guildName, memberCount, isLeader
8. **Verify Frame:** Pass verificationStatus (keep simple)
9. **Referral Frame:** Pass referralCount (keep simple)

**Pattern:**
```typescript
// Before
composeText: getComposeText({ frameType: 'gm' })

// After
composeText: buildComposeText({
  frameType: 'gm',
  username: userProfile.username,
  streak: userData.streak,
  gmCount: userData.totalGMs,
  level: userProgress.level,
  tier: userProgress.tierName,
})
```

#### Step 3: Testing Setup (15 min)
**Test URLs (localhost:3000):**
```bash
# GM Frame - High achievement
?type=gm&streak=30&level=23&tier=Mythic%20GM&gmCount=250

# Quest Frame - High progress
?type=quest&questName=Daily%20GM&xpReward=50&progress=85&chain=base

# Badge Frame - Badge hunter
?type=badge&earnedCount=15&badgeXp=2500

# Points Frame - High level
?type=points&level=23&tier=Star%20Captain&xp=10500
```

---

### Phase D: Testing (30 minutes)

#### Test Cases

**1. Character Limit Validation**
```bash
# Test all frame types with max parameters
# Verify: All messages <250 characters
# Tool: console.log(composeText.length)
```

**2. Achievement Tier Testing**
```bash
# GM Frame tiers:
- streak=0, level=1 → Default message
- streak=7, level=5 → "Hot streak" message
- streak=30, level=15 → "Legendary dedication" message
- streak=30, level=23, tier=Mythic → "Unstoppable" message

# Quest Frame tiers:
- progress=20 → Default message
- progress=85 → "Almost done" message

# Points Frame tiers:
- level=3 → Default message
- level=10 → Milestone message
- level=23, tier=Mythic → Elite message
```

**3. Chain Context Testing**
```bash
# Quest Frame:
?chain=base → "on Base"
?chain=ethereum → "on Ethereum"
?chain=optimism → "on Optimism"

# OnchainStats:
?chainCount=1 → Shows specific chain
?chainCount=3 → "Active across 3 chains"
?chainCount=5 → "multichain master"
```

**4. Emoji Rendering**
```bash
# Test on multiple platforms:
- Warpcast (Farcaster client)
- Twitter/X
- Telegram (if applicable)

# Verify: Emojis display correctly, no broken characters
```

**5. Share Functionality**
```bash
# Manual test:
1. Open frame on localhost
2. Click "Share on Warpcast" button
3. Verify compose text appears correctly
4. Check character count in Warpcast composer
5. Post and verify display on feed

# Repeat for Twitter share (if implemented)
```

#### Success Criteria
- ✅ All messages <250 characters
- ✅ Achievement tiers trigger correctly
- ✅ XP values formatted properly
- ✅ Chain context displays when present
- ✅ Emojis render correctly across platforms
- ✅ Share buttons populate with correct text
- ✅ Messages encourage engagement
- ✅ @gmeowbased attribution consistent

---

## Phase 1F Completion Status

### Completed Tasks ✅
- [x] Task 1: GM Frame Username (4h) - commit 8665b72
- [x] Task 2: Quest Frame Username (3h) - commit 9f061de
- [x] Task 3: Points Frame Handler (5h) - commit fc67af7
- [x] Task 4: Badge Frame Username (3h) - commit 9f061de
- [x] Task 8: Design System Consolidation (5h) - commit 296d5ae
- [x] Task 9: Chain Icon Integration (3.5h) - commit 39953b6
- [x] **Task 10: XP System Integration (3h)** - **commit 6b5435c ✅**

### In Progress ⏳
- [ ] **Task 11: Text Composition Enhancements (3h)** - NEXT
  - [ ] Phase A: Audit (30 min)
  - [ ] Phase B: Planning (30 min)
  - [ ] Phase C: Implementation (1.5h)
  - [ ] Phase D: Testing (30 min)

### Remaining Tasks 📋
- [ ] Task 5: Guild Frame Audit (2.5h)
- [ ] Task 6: Leaderboard Frame Audit (3h)
- [ ] Task 7: Verify Frame Audit (4h)
- [ ] Task 12: Frame Button Standardization (4h)
- [ ] Task 13: Share Button Documentation (3h)
- [ ] Task 14: Frame Spec Compliance (2h)

**Progress:** 7/14 tasks complete (50%)  
**Time Spent:** ~32.5h of 50h estimated (65%)  
**Remaining:** ~17.5h estimated

---

## Risk Assessment

### Task 11 Risks 🟡

**Risk 1: Character Limit Overruns**
- **Impact:** Medium (messages get truncated)
- **Mitigation:** Test all achievement tiers with max parameters
- **Contingency:** Shorten messages, reduce emoji usage

**Risk 2: Emoji Rendering Issues**
- **Impact:** Low (visual only)
- **Mitigation:** Test on Warpcast, Twitter, and mobile
- **Contingency:** Replace problematic emojis with text

**Risk 3: Context Data Unavailable**
- **Impact:** Medium (falls back to generic text)
- **Mitigation:** Graceful fallbacks for all parameters
- **Contingency:** Use default messages when context missing

**Risk 4: Share Button Integration**
- **Impact:** High (if share buttons don't work)
- **Mitigation:** Test all share flows manually
- **Contingency:** Document issues for Task 13 (Share Button Documentation)

### Production Testing Risks 🟢

**Risk 1: Vercel Build Failure**
- **Impact:** High (blocks testing)
- **Probability:** Low (Task 10 changes minimal, TypeScript passing)
- **Mitigation:** Monitor Vercel logs, check build status
- **Contingency:** Rollback to previous commit if needed

**Risk 2: Production Performance**
- **Impact:** Medium (slow frame generation)
- **Probability:** Low (localhost testing showed 3-6s generation)
- **Mitigation:** Check Vercel logs for timing
- **Contingency:** Optimize XP calculations if needed

**Risk 3: ImageResponse Errors**
- **Impact:** High (frames broken)
- **Probability:** Very Low (all display:flex issues fixed)
- **Mitigation:** Check Vercel logs for errors
- **Contingency:** Emergency fix if new errors found

---

## Success Criteria

### Task 10 Production Verification ✅
- [ ] All frames render with 200 status codes
- [ ] Level calculations match localhost results
- [ ] XP formatting displays correctly (commas, K, M)
- [ ] Progress bars visually accurate (width matches %)
- [ ] Quest XP badges prominent and readable
- [ ] Badge XP tracking displays with gold highlight
- [ ] Chain icons still working alongside XP features
- [ ] No ImageResponse errors in Vercel logs
- [ ] Frame generation times <5 seconds

### Task 11 Completion ✅
- [ ] buildComposeText enhanced with achievement tiers
- [ ] All 9 frame types use enhanced compose text
- [ ] XP mentions integrated (where applicable)
- [ ] Chain context added (where applicable)
- [ ] All messages <250 characters
- [ ] Emojis render correctly across platforms
- [ ] Share functionality tested on Warpcast
- [ ] Code follows GI-13 safe patching rules

---

## Timeline

### Today (November 23, 2025)

**3:00 PM - 3:15 PM:** Monitor Vercel Build ⏳
- Wait for deployment completion
- Check Vercel logs
- Verify deployment success

**3:15 PM - 3:30 PM:** Production Testing ✅
- Test Points frame (3 XP values)
- Test Quest frame (3 reward values)
- Test Badge frame (3 badgeXp values)
- Verify quality checklist

**3:30 PM - 4:00 PM:** Task 11 Audit Phase 📋
- Review buildComposeText implementation
- Check current patterns across frames
- Identify improvement opportunities
- Document character limits

**4:00 PM - 4:30 PM:** Task 11 Planning Phase 🎯
- Design achievement tier patterns
- Plan XP integration messaging
- Create chain context templates
- Prioritize frame enhancements

**4:30 PM - 6:00 PM:** Task 11 Implementation 💻
- Update buildComposeText function
- Add helper functions (formatXpForShare, etc.)
- Update 9 frame routes with new parameters
- Prepare test cases

**6:00 PM - 6:30 PM:** Task 11 Testing ✅
- Character limit validation
- Achievement tier testing
- Chain context testing
- Emoji rendering testing
- Share functionality testing

**6:30 PM - 6:45 PM:** Task 11 Deployment 🚀
- Git commit with comprehensive message
- Push to GitHub
- Monitor Vercel build
- Production verification

**Estimated Completion:** 6:45 PM (3h 45min from now)

---

## Next Steps After Task 11

### Layer 2 Completion
After Task 11, Layer 2 will be complete:
- ✅ Task 8: Design System Consolidation
- ✅ Task 9: Chain Icon Integration
- ✅ Task 10: XP System Integration
- ✅ Task 11: Text Composition Enhancements
- ⏳ Task 12: Frame Button Standardization (4h)

**Recommendation:** Complete Task 12 to finish Layer 2 entirely before moving to Layer 3

### Layer 3: System Documentation
After Layer 2 completion, focus on system-level documentation:
- Task 13: Share Button Documentation (3h)
- Task 14: Frame Spec Compliance (2h)

### Phase 1G Planning
After Phase 1F completion, plan Phase 1G:
- Review user feedback from Phase 1F improvements
- Identify remaining frame system improvements
- Plan advanced features (animations, transitions, etc.)
- Consider performance optimizations

---

## Documentation Updates

### Files to Update After Task 11
1. **PHASE-1F-PLANNING.md**
   - Mark Task 11 complete
   - Update commit references
   - Update progress tracker

2. **TASK-11-COMPLETE.md** (create new)
   - Document all compose text enhancements
   - Include achievement tier patterns
   - List all frame routes updated
   - Provide testing results

3. **CHANGELOG.md**
   - Add Task 11 entry
   - Document compose text improvements
   - List user-facing changes

4. **README.md** (if applicable)
   - Update features list
   - Add share text examples
   - Document achievement messaging

---

## Summary

Task 10 (XP System Integration) successfully completed and deployed to production. Vercel build in progress. Once production testing verifies all XP features work correctly, proceed immediately to Task 11 (Text Composition Enhancements). Task 11 will enhance share/compose text with XP context, achievements, and chain-specific messaging across all 9 frame types. Estimated 3 hours to complete. After Task 11, only Task 12 remains to complete Layer 2, then move to Layer 3 (System Documentation) to finish Phase 1F.

**Current Priority:** Wait for Vercel build, test production XP frames, then start Task 11 Audit Phase.
