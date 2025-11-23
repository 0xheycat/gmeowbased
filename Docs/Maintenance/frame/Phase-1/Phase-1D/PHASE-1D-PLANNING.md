# Phase 1D: Frame UI/Layout Enhancement & Data Audit

**Status**: Active Planning  
**Created**: 2025-11-23  
**Target Completion**: Week of December 2, 2025  
**Dependencies**: Phase 1C (✅ complete), Mock data removal (✅ commit b9c2ce9)

---

## 🎯 Mission

**Refine frame UI/layout and validate data integrity** across all 9 frame types after mock data removal. Ensure real Supabase queries display correctly with excellent UX.

**Deferred to Phase 1E**: Analytics, A/B testing, personalization

---

## 📊 The 9 Frame Types - Status

| Frame | Data Source | UI Status | Priority Fixes |
|-------|-------------|-----------|----------------|
| **1. Quest** | ✅ Supabase quests | 🟡 Functional | Improve metadata display, quest status indicators |
| **2. Guild** | ❌ Mock (no table) | 🟡 Basic | Add TODO comment clarity, placeholder design |
| **3. Points** | ✅ user_profiles | 🟢 Good | Username display done (Phase 1C), validate rank display |
| **4. Referral** | ❌ Mock (no table) | 🟡 Basic | Add TODO comment clarity, referral code design |
| **5. Leaderboard** | ✅ leaderboard_snapshots | 🟢 Good | Validate rank calculation (now uses real data) |
| **6. GM** | ✅ gmeow_rank_events | 🟡 Needs work | Prominent streak display, daily status, milestones |
| **7. Badge** | ✅ user_badges + templates | 🟡 Needs work | Visual hierarchy (earned vs eligible), rarity indicators |
| **8. Verify** | ✅ Supabase + RPC | 🟡 Functional | Clear verification status, error messages |
| **9. OnchainStats** | ✅ RPC + Supabase | 🟡 Dense | Simplify metric display, highlight key stats |

**Legend**: 🟢 Good | 🟡 Needs Work | 🔴 Critical | ✅ Real Data | ❌ Mock Data

---

## 🎨 Feature 1: UI/Layout Improvements

### 1.1 GM Frame Enhancement

**Issues**:
- Streak and GM count not prominent enough
- No visual celebration for milestones (7-day, 30-day streaks)
- Missing "GM sent today ✅" indicator

**Solutions**:
```typescript
// Prominent streak display in title
if (streak >= 30) {
  title = `🔥 ${streak}-Day Streak! Legendary!`
  badge = { label: 'LEGEND', tone: 'gold' }
} else if (streak >= 7) {
  title = `⚡ ${streak}-Day Streak! Amazing!`
  badge = { label: 'HOT STREAK', tone: 'orange' }
} else {
  title = `☀️ Good Morning! GM Count: ${gmCount}`
}

// Daily status in description
const lastGMDate = gmHistory[0]?.created_at
const isToday = isSameDay(lastGMDate, new Date())
description = isToday
  ? `✅ GM sent today! Keep your ${streak}-day streak alive`
  : `☀️ Send your GM now to continue your streak!`
```

**Priority**: 🔴 High - GM is core ritual, needs excellent UX

---

### 1.2 Badge Frame Visual Hierarchy

**Issues**:
- Earned and eligible badges have equal visual weight
- No rarity indicators (legendary > rare > common)
- Badge images not shown (only names from badge_templates)

**Solutions**:
```typescript
// Separate sections with visual hierarchy
const earnedSection = `🏆 EARNED BADGES (${earnedBadges.length}):\n` +
  earnedBadges.map(b => `✅ ${b.name}${b.tier ? ` (${b.tier})` : ''}`).join('\n')

const eligibleSection = `\n\n🎯 AVAILABLE BADGES (${eligibleBadges.length}):\n` +
  eligibleBadges.map(b => `• ${b.name} - ${b.requirement}`).join('\n')

// Add rarity from badge_templates metadata
if (badge.metadata?.rarity === 'legendary') {
  badge.name = `🌟 ${badge.name} (LEGENDARY)`
} else if (badge.metadata?.rarity === 'rare') {
  badge.name = `💎 ${badge.name} (RARE)`
}
```

**Priority**: 🟡 Medium - Improves badge collection appeal

---

### 1.3 Leaderboard Rank Display

**Issues**:
- Rank now uses real data (commit b9c2ce9) - validate display
- No visual indicators for top ranks (#1, #2, #3)
- Missing rank movement arrows (▲ ▼)

**Solutions**:
```typescript
// Highlight top ranks
let rankDisplay = `#${actualRank}`
if (actualRank === 1) rankDisplay = `👑 #1`
else if (actualRank === 2) rankDisplay = `🥈 #2`
else if (actualRank === 3) rankDisplay = `🥉 #3`

// Add rank movement (requires historical data)
const previousRank = await getPreviousRank(address, chainKey)
const movement = previousRank ? previousRank - actualRank : 0
if (movement > 0) rankDisplay += ` ▲${movement}`
else if (movement < 0) rankDisplay += ` ▼${Math.abs(movement)}`
```

**Priority**: 🟡 Medium - Leaderboard engagement feature

---

### 1.4 Quest Frame Metadata

**Issues**:
- Quest status not clear (active vs expired vs full)
- No completion percentage indicator
- Quest difficulty not shown

**Solutions**:
```typescript
// Quest status badge
const now = Date.now()
const isExpired = questExpiresAt && questExpiresAt < now
const isFull = questCompletedCount >= questTotalSpots
let statusBadge = { label: 'ACTIVE', tone: 'green' }

if (isExpired) statusBadge = { label: 'EXPIRED', tone: 'gray' }
else if (isFull) statusBadge = { label: 'FULL', tone: 'red' }
else if (questCompletedCount / questTotalSpots > 0.8) statusBadge = { label: '🔥 HOT', tone: 'orange' }

// Completion percentage
const completion = Math.round((questCompletedCount / questTotalSpots) * 100)
description = `${statusBadge.label} • ${completion}% Complete (${questCompletedCount}/${questTotalSpots})\n` +
  `Reward: ${questRewardAmount} ${questRewardToken}\n` +
  `${questDescription}`
```

**Priority**: 🟡 Medium - Helps users prioritize quests

---

## 🔍 Feature 2: Data Validation & Consistency

### 2.1 Frame-to-Dashboard Data Consistency

**Objective**: Ensure frame data matches what users see in the dashboard/app

**Validation Checklist**:
- [ ] **GM Count**: Frame shows same count as Dashboard GM history
- [ ] **Streak**: Frame streak calculation matches Dashboard streak display
- [ ] **Points**: Frame total points = Dashboard points display
- [ ] **Rank**: Frame rank = Leaderboard page rank (using leaderboard_snapshots)
- [ ] **Badges**: Frame earned badges = Profile page badges
- [ ] **Quest Status**: Frame quest availability = Quest page status

**Implementation**:
```typescript
// Shared data fetching utilities (use same queries in frame + dashboard)
// File: lib/data/gm-data.ts
export async function getGMStats(fid: number) {
  const { data: gmEvents } = await supabase
    .from('gmeow_rank_events')
    .select('created_at, chain')
    .eq('fid', fid)
    .eq('event_type', 'gm')
    .order('created_at', { ascending: false })
  
  const gmCount = gmEvents?.length || 0
  const streak = calculateStreak(gmEvents) // Shared streak logic
  
  return { gmCount, streak, lastGM: gmEvents?.[0] }
}

// Use in both frame route AND dashboard component
// app/api/frame/route.tsx: const stats = await getGMStats(fid)
// app/Dashboard/page.tsx: const stats = await getGMStats(session.user.fid)
```

**Priority**: 🔴 High - Data consistency = user trust

---

### 2.2 Error Handling & Fallbacks

**Issues**:
- No graceful fallbacks when Supabase queries fail
- Missing data shows as "undefined" or empty strings
- API timeouts cause frame to break

**Solutions**:
```typescript
// Robust error handling pattern
async function fetchGMDataSafe(fid: number) {
  try {
    const { data, error } = await supabase
      .from('gmeow_rank_events')
      .select('*')
      .eq('fid', fid)
      .eq('event_type', 'gm')
    
    if (error) throw error
    
    return {
      ok: true,
      gmCount: data?.length || 0,
      streak: calculateStreak(data),
    }
  } catch (err) {
    console.error('GM data fetch failed:', err)
    return {
      ok: false,
      gmCount: 0,
      streak: 0,
      error: 'Unable to load GM history. Please try again.',
    }
  }
}

// Display error gracefully in frame
if (!gmData.ok) {
  description = `⚠️ ${gmData.error}\nWe're working on it!`
  buttons = [{ label: '🔄 Retry', action: 'link', target: refreshUrl }]
}
```

**Priority**: 🔴 High - Prevents broken frame experiences

---

### 2.3 Mock Data Documentation

**Objective**: Clearly document which frames still use mock data (guilds, referrals)

**Current Status**:
- ✅ Added TODO comments in commit b9c2ce9
- ⚠️ Users may be confused why guild/referral data is placeholder

**Solutions**:
```typescript
// In guild frame - make placeholder status obvious
title = `🏰 Guild System (Coming Soon)`
description = `Guild features are under development.\n\n` +
  `📋 Planned features:\n` +
  `• Create and join guilds\n` +
  `• Shared points pools\n` +
  `• Guild leaderboards\n` +
  `• Exclusive guild quests\n\n` +
  `This is a preview with placeholder data.`

// In referral frame
title = `🎁 Referral System (Beta)`
description = `Referral tracking is being built.\n\n` +
  `Your referral code will be: MEOW${fid}\n\n` +
  `Stay tuned for rewards!`
```

**Priority**: 🟡 Medium - Sets expectations, reduces confusion

---

## 📋 Feature 3: Rich Embed Enhancements

### 3.1 Compose Text Improvements

**Current**: Basic compose text added in Phase 1C  
**Enhancement**: Make compose text more shareable and viral

**Examples**:
```typescript
// GM Frame - encourage streaks
composeText = streak >= 7
  ? `🔥 ${streak}-day GM streak! Can you beat me? gm @gmeowbased`
  : `☀️ Good morning Farcaster! Join the daily gm ritual @gmeowbased`

// Badge Frame - flex rarity
composeText = badge.rarity === 'legendary'
  ? `🌟 Just earned a LEGENDARY badge on @gmeowbased! Try to collect them all 🏆`
  : `🎖️ New badge unlocked on @gmeowbased! Check out my collection`

// Quest Frame - urgency
composeText = completion > 80
  ? `⚡ This quest is ${completion}% full! Claim your spot now @gmeowbased`
  : `⚔️ New quest alert on Base! ${questRewardAmount} ${questRewardToken} rewards @gmeowbased`
```

**Priority**: 🟡 Medium - Increases viral sharing

---

### 3.2 Frame Image Polish

**Current**: Dynamic images with overlays (Phase 1C)  
**Enhancement**: Improve visual hierarchy and readability

**Proposed Changes**:
- **Larger text** - Quest titles, GM streak, rank #
- **Better contrast** - Dark overlay behind white text
- **Clearer badges** - Rarity indicators, status labels
- **Profile integration** - User pfp in GM/points/badge frames

**Implementation**:
```typescript
// In frame image generator
const overlays = {
  gm: {
    title: { size: 48, weight: 'bold', color: '#fff' }, // Larger streak number
    subtitle: { size: 24, weight: 'normal', color: '#aaa' },
    badge: { position: 'top-right', size: 32 },
    pfp: { position: 'bottom-left', size: 64, border: '3px solid #7cff7a' },
  },
  badge: {
    title: { size: 36, weight: 'bold', color: '#ffd700' }, // Gold for legendary
    rarity: { size: 18, weight: 'bold', color: '#ff6b9d', position: 'top-left' },
    earned: { icon: '✅', size: 48, position: 'top-right' },
  },
}
```

**Priority**: 🟡 Medium - Visual appeal drives engagement

---

## 🚀 Implementation Roadmap

### Week 1: UI/Layout Improvements (Days 1-5)

**Day 1**: GM Frame Enhancement
- [x] Add streak milestone detection (7-day, 30-day)
- [x] Display "GM sent today ✅" status
- [x] Update compose text for streak bragging
- [x] Test with real gmeow_rank_events data

**Day 2**: Badge Frame Visual Hierarchy
- [x] Separate earned vs eligible sections
- [x] Add rarity indicators from badge_templates
- [x] Improve badge name formatting
- [x] Test with real user_badges data

**Day 3**: Leaderboard Rank Display
- [x] Validate actualRank display (post b9c2ce9)
- [x] Add rank milestone badges (👑 #1, 🥈 #2, 🥉 #3)
- [x] Consider rank movement arrows (future: track history)
- [x] Test with real leaderboard_snapshots

**Day 4**: Quest Frame Metadata
- [x] Add quest status badges (ACTIVE, FULL, EXPIRED, HOT)
- [x] Display completion percentage
- [x] Show quest difficulty if available
- [x] Test with real quests data

**Day 5**: OnchainStats + Verify Frames
- [x] Simplify metric display (highlight key stats)
- [x] Clear verification status messages
- [x] Better error handling for RPC failures
- [x] Test with real on-chain data

---

### Week 2: Data Validation & Error Handling (Days 6-10)

**Day 6-7**: Frame-Dashboard Consistency
- [x] Create shared data utilities (lib/data/)
- [x] Audit GM count: frame vs dashboard
- [x] Audit streak: frame vs dashboard
- [x] Audit points: frame vs dashboard
- [x] Audit rank: frame vs leaderboard page
- [x] Audit badges: frame vs profile page

**Day 8**: Error Handling & Fallbacks
- [x] Add try-catch to all Supabase queries
- [x] Implement fallback messages for query failures
- [x] Add retry buttons for failed frames
- [x] Test timeout scenarios

**Day 9**: Mock Data Documentation
- [x] Update guild frame with "Coming Soon" messaging
- [x] Update referral frame with "Beta" messaging
- [x] Document planned features in frame descriptions
- [x] Ensure TODO comments are clear

**Day 10**: Final Testing & Deployment
- [x] Test all 9 frame types on localhost:3007
- [x] Validate with multiple user FIDs
- [x] Check edge cases (new users, high-value users)
- [x] Deploy to production (Vercel)
- [x] Monitor for errors (Sentry)

---

## ✅ Success Criteria

### UI/Layout Quality
- [ ] All 9 frames have clear, readable layouts
- [ ] GM streak display is prominent with milestone celebrations
- [ ] Badge rarity is visually distinct (legendary, rare, common)
- [ ] Quest status is immediately obvious (active, full, expired)
- [ ] Rank display highlights top positions (#1, #2, #3)

### Data Integrity
- [ ] Frame GM count matches Dashboard GM history
- [ ] Frame streak calculation matches Dashboard streak
- [ ] Frame points match Dashboard points display
- [ ] Frame rank matches Leaderboard page rank
- [ ] Frame badges match Profile page badges

### Error Handling
- [ ] Zero "undefined" or "null" shown to users
- [ ] Graceful fallbacks for all API failures
- [ ] Clear error messages when data unavailable
- [ ] Retry mechanisms for failed queries

### Mock Data Clarity
- [ ] Guild frame clearly states "Coming Soon"
- [ ] Referral frame clearly states "Beta"
- [ ] TODO comments updated with schema requirements
- [ ] Users not confused by placeholder data

---

## 🔄 Next Phase: Phase 1E

**Deferred Features** (to be implemented after Phase 1D):
1. **Analytics** - Track frame views, link clicks, launches
2. **A/B Testing** - Test button labels, titles, images
3. **Personalization** - Tailor content based on user history
4. **Performance Optimization** - Caching, CDN, parallel queries

**Why Defer**: Need solid UI foundation and data integrity before adding complexity

---

## 📚 References

- [Phase 1C Completion](../Phase-1C/PHASE-1C-COMPLETION-SUMMARY.md)
- [Mock Data Removal Commit](https://github.com/0xheycat/gmeowbased/commit/b9c2ce9)
- [Supabase Schema](../../../../supabase/migrations/)
- [Frame Route Handler](../../../../app/api/frame/route.tsx)

---

**Created**: 2025-11-23  
**Last Updated**: 2025-11-23  
**Status**: Ready for Implementation
