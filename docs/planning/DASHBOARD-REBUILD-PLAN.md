# 🎯 Dashboard Rebuild Plan - Professional & Base-Only

**Created**: December 1, 2025  
**Status**: Planning Phase  
**Priority**: 🔥🔥🔥 CRITICAL

---

## ❌ What We're Removing (Emoji Implementation - REJECTED)

**User Correction (2nd Reminder)**:
1. ❌ NO EMOJIS - All emoji blocks (🔥, 🌟, 💎, 👑, ☀️, 🎉) removed
2. ❌ NO MULTICHAIN - Base chain only (no chain selector UI)
3. ❌ NO CONFETTI - Use XPEventOverlay for celebrations

**Files Deleted**:
- `components/ContractGMButtonEnhanced.tsx` (658 lines with emojis) ✅ DELETED
- `app/Dashboard/page.tsx` → Moved to `.old-phase1` ✅ DONE

---

## ✅ What We're Building (Professional Dashboard)

### Contract Events Available (From ABIs)

**GmeowCore.abi.json** (20+ events):
- `GMEvent` - Daily GM completion event
- `PointsAwarded` - XP rewards
- `QuestCompleted` - Quest completion
- `BadgeMinted` - Badge earned
- `PointsLocked/Unlocked` - Staking events
- `TipSent` - Tipping events

**GmeowGuild.abi.json**:
- `GMEvent` - Guild GM events
- `GuildCreated` - New guild
- `GuildJoined/Left` - Member events
- `GuildQuestCompleted` - Guild quests

### Professional Icons Available (91 SVG Icons)

**Primary Icons** (components/icons/):
- `sun.tsx` - GM button icon (replaces ☀️)
- `star.tsx` - Milestone outline (replaces 🌟)
- `star-fill.tsx` - Milestone filled (replaces 💎, 👑)
- `flash.tsx` - Streak indicator (replaces 🔥)
- `calendar-icon.tsx` - Date/streak display
- `trophy.tsx` - Achievements
- `gift.tsx` - Rewards
- `share.tsx` - Viral sharing
- `chart.tsx` - Stats/analytics

---

## 📐 Dashboard Structure (Professional Layout)

### Layout Reference (From Planning Templates)

**Pattern**: Two-column desktop, single-column mobile  
**Template**: `music/dashboards/dashboard-01-default.tsx` pattern  
**CSS**: `pixel-card` system with `dash-gm-card`, `dash-gm-button` classes

```
┌─────────────────────────────────────────────┐
│  GMEOW Dashboard              [Base Chain]  │ ← Header (no chain selector in UI)
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────── LEFT COLUMN ──────────────┐ │
│  │                                        │ │
│  │  🌞 GM HERO SECTION                   │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  [Sun Icon] (size: 80x80)        │ │ │
│  │  │                                  │ │ │
│  │  │  Ready for GM?                   │ │ │
│  │  │                                  │ │ │
│  │  │  Today's Reward: +50 XP          │ │ │
│  │  │  (uses flash icon + number)      │ │ │
│  │  │                                  │ │ │
│  │  │  [SEND GM BUTTON]                │ │ │
│  │  │  (sun icon + text)               │ │ │
│  │  │                                  │ │ │
│  │  │  Stats Grid:                     │ │ │
│  │  │  Base: 50 | Bonus: 0% | CD: 24h │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  📊 STREAK & POINTS CARD              │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  [Flash Icon] 7 Day Streak       │ │ │
│  │  │  [Star Icon] 1,234 Points        │ │ │
│  │  │                                  │ │ │
│  │  │  Available: 1,234               │ │ │
│  │  │  Locked: 500                    │ │ │
│  │  │  Total: 1,734                   │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  🏆 MILESTONE PROGRESS                │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  [Star Icon] Next: Week Warrior  │ │ │
│  │  │  ████████░░░░ 7/7 days           │ │ │
│  │  │                                  │ │ │
│  │  │  Milestones:                     │ │ │
│  │  │  • 7 days: Week Warrior          │ │ │
│  │  │  • 30 days: Month Master         │ │ │
│  │  │  • 100 days: Century Club        │ │ │
│  │  │  • 365 days: Yearly Legend       │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  📢 VIRAL SHARE BUTTON                │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  [Share Icon] Share Your Streak  │ │ │
│  │  │  Earn Bonus XP                   │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─────────── RIGHT COLUMN ──────────────┐ │
│  │                                        │ │
│  │  📝 ACTIVE QUESTS (preview)           │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  Daily GM: 1/1 complete          │ │ │
│  │  │  ████████████████████ 100%        │ │ │
│  │  │                                  │ │ │
│  │  │  Join a Team: 0/1                │ │ │
│  │  │  ░░░░░░░░░░░░░░░░░░░░ 0%         │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  🏅 LEADERBOARD (Top 5)               │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  1. alice       9,999 pts        │ │ │
│  │  │  2. bob         8,888 pts        │ │ │
│  │  │  3. charlie     7,777 pts        │ │ │
│  │  │  ...                             │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  🎖️ BADGES (preview)                  │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  [Badge] [Badge] [Badge] [+12]   │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎨 Component Architecture

### 1. GM Hero Section (Left Column - Top)

**Component**: Inline in Dashboard page (no separate component for now)  
**Purpose**: Daily GM button with professional design  
**Size**: Full width of left column, ~400px height

**Visual Elements**:
```tsx
<div className="pixel-card dash-gm-card">
  {/* Sun Icon (80x80px) - Professional SVG */}
  <div className="dash-gm-orb">
    <Sun className="w-20 h-20 text-yellow-300" />
  </div>
  
  {/* Title */}
  <h2 className="dash-gm-title text-2xl font-bold">
    {canGM ? 'Ready for GM?' : 'GM Sent Today!'}
  </h2>
  
  {/* Today's Reward Preview (PRE-GM only) */}
  {canGM && (
    <div className="reward-preview">
      <FlashIcon className="w-5 h-5" />
      <span>Today's Reward: +{reward} XP</span>
    </div>
  )}
  
  {/* GM Button - MEGA SIZE */}
  <button className="dash-gm-button">
    <Sun className="w-6 h-6" />
    <span>Send GM</span>
  </button>
  
  {/* Stats Grid */}
  <div className="dash-gm-stats grid grid-cols-3">
    <div>
      <span>Base Reward</span>
      <span>{baseReward} pts</span>
    </div>
    <div>
      <span>Bonus</span>
      <span>+{bonusPct}%</span>
    </div>
    <div>
      <span>Cooldown</span>
      <span>{cooldown}h</span>
    </div>
  </div>
</div>
```

**NO EMOJIS** - All icons are SVG components from `components/icons/`

---

### 2. Streak & Points Card (Left Column - Middle)

**Component**: Inline stats card  
**Purpose**: Display current streak and point totals

**Visual Elements**:
```tsx
<div className="pixel-card">
  {/* Two-column grid for main stats */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <FlashIcon className="w-6 h-6 text-orange-300" />
      <div className="pixel-stat">{streak}</div>
      <div className="text-sm">Current Streak</div>
    </div>
    <div>
      <StarIcon className="w-6 h-6 text-cyan-300" />
      <div className="pixel-stat">{availablePoints}</div>
      <div className="text-sm">Points</div>
    </div>
  </div>
  
  {/* Divider */}
  <div className="pixel-divider my-4" />
  
  {/* Three-column grid for breakdown */}
  <div className="grid grid-cols-3 gap-2">
    <div>
      <div className="font-bold">{availablePoints}</div>
      <div className="text-xs">Available</div>
    </div>
    <div>
      <div className="font-bold">{lockedPoints}</div>
      <div className="text-xs">Locked</div>
    </div>
    <div>
      <div className="font-bold">{totalPoints}</div>
      <div className="text-xs">Total</div>
    </div>
  </div>
</div>
```

---

### 3. Milestone Progress Card (Left Column - Lower)

**Component**: Inline milestone tracker  
**Purpose**: Show progress to next streak milestone

**Milestones**:
- 7 days: Week Warrior
- 30 days: Month Master
- 100 days: Century Club
- 365 days: Yearly Legend

**Visual Elements**:
```tsx
<div className="pixel-card">
  <h3 className="pixel-section-title">
    <StarIcon className="w-5 h-5 inline" />
    Milestone Progress
  </h3>
  
  {/* Current milestone (if achieved) */}
  {streak >= 7 && (
    <div className="milestone-badge achieved">
      <StarFillIcon className="w-5 h-5 text-orange-300" />
      <span>Week Warrior</span>
    </div>
  )}
  
  {/* Next milestone progress */}
  <div className="milestone-progress">
    <div className="flex items-center justify-between text-xs mb-2">
      <span>Next: {nextMilestone.name}</span>
      <span>{daysToNext} days</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${progress}%` }} />
    </div>
  </div>
  
  {/* Milestone list */}
  <div className="milestone-list text-xs">
    <div className={streak >= 7 ? 'achieved' : ''}>
      <StarFillIcon /> 7 days: Week Warrior
    </div>
    <div className={streak >= 30 ? 'achieved' : ''}>
      <StarFillIcon /> 30 days: Month Master
    </div>
    <div className={streak >= 100 ? 'achieved' : ''}>
      <StarFillIcon /> 100 days: Century Club
    </div>
    <div className={streak >= 365 ? 'achieved' : ''}>
      <StarFillIcon /> 365 days: Yearly Legend
    </div>
  </div>
</div>
```

---

### 4. Viral Share Button (Left Column - Bottom)

**Component**: Share button with XP bonus indicator  
**Purpose**: Encourage sharing streak on Warpcast

**Visual Elements**:
```tsx
<div className="pixel-card">
  <button 
    onClick={handleShare}
    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
  >
    <Share className="w-5 h-5 inline mr-2" />
    <span>Share Your Streak</span>
    <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full ml-2">
      Earn Bonus
    </span>
  </button>
</div>
```

---

### 5. XPEventOverlay Integration (Celebration System)

**Component**: `components/XPEventOverlay.tsx` (EXISTING ✅)  
**Purpose**: Professional celebration on GM success

**Trigger**: After GM transaction confirmed

```tsx
// In Dashboard page state
const [xpEvent, setXpEvent] = useState<XpEventPayload | null>(null)

// After GM confirmation
const handleGMSuccess = (xpEarned: number, totalPoints: number) => {
  setXpEvent({
    event: 'gm',
    chainKey: 'base',
    xpEarned,
    totalPoints,
    progress: calculateRankProgress(totalPoints),
    eventIcon: <Sun className="w-12 h-12 text-yellow-300" />, // Professional SVG icon
    shareUrl: buildFrameShareUrl('gm'),
    onShare: handleShareGMFrame,
  })
}

// Render overlay
<XPEventOverlay
  open={!!xpEvent}
  payload={xpEvent}
  onClose={() => setXpEvent(null)}
/>
```

**NO CONFETTI** - Uses ProgressXP component for professional animations

---

## 🔧 Technical Implementation

### Chain Support (Base-Only)

```tsx
// NO chain selector UI
// NO SUPPORTED_CHAINS array with multiple chains
// NO chain switching buttons

// Single chain only
const CHAIN: GMChainKey = 'base' // From lib/gmeow-utils.ts

// Contract address
const GM_CONTRACT = GM_CONTRACT_ADDRESS // Base: 0x... (from gmeow-utils)
```

### Contract Event Listening

```tsx
// Listen for GMEvent from GmeowCore
import { parseAbiItem } from 'viem'
import { getPublicClient } from '@wagmi/core'

const client = getPublicClient(config, { chainId: CHAIN_IDS.base })

// Watch for GM events
const unwatchGM = client.watchContractEvent({
  address: GM_CONTRACT,
  abi: GM_CONTRACT_ABI,
  eventName: 'GMEvent',
  onLogs: (logs) => {
    const [log] = logs
    // Trigger XPEventOverlay with professional icon
    handleGMSuccess(log.args.xpEarned, log.args.totalPoints)
  },
})
```

### State Management

```tsx
// Dashboard state
const [streak, setStreak] = useState(0)
const [availablePoints, setAvailablePoints] = useState(0)
const [lockedPoints, setLockedPoints] = useState(0)
const [totalPoints, setTotalPoints] = useState(0)
const [gmRewardBase, setGmRewardBase] = useState(50)
const [gmBonusPct, setGmBonusPct] = useState(0)
const [canGM, setCanGM] = useState(false)
const [xpEvent, setXpEvent] = useState<XpEventPayload | null>(null)

// Load user stats (from contract)
const loadStats = async () => {
  const stats = await getUserStats(address)
  setAvailablePoints(stats.availablePoints)
  setLockedPoints(stats.lockedPoints)
  setTotalPoints(stats.totalEarned)
  
  const { last, streak: currentStreak } = await gmhistory(address)
  setStreak(currentStreak)
  
  const canSendGM = canGMBasedOnTimestamp(last)
  setCanGM(canSendGM)
}
```

---

## 📋 Implementation Checklist

### Phase 1: Clean Slate ✅ DONE
- [x] Delete ContractGMButtonEnhanced.tsx (emoji-based)
- [x] Backup old Dashboard to page.tsx.old-phase1
- [x] Identify professional icons (sun, star, flash, share)
- [x] Review contract events (GmeowCore, GmeowGuild)
- [x] Confirm XPEventOverlay ready (179 lines)

### Phase 2: Build Professional Dashboard (NOW)
- [ ] Create new app/Dashboard/page.tsx (clean slate)
- [ ] Import professional SVG icons (sun, star, flash, share)
- [ ] Build GM Hero Section (sun icon, no emojis)
- [ ] Build Streak & Points Card (flash/star icons)
- [ ] Build Milestone Progress Card (star-fill icons)
- [ ] Build Viral Share Button (share icon)
- [ ] Integrate XPEventOverlay (with eventIcon prop)
- [ ] Add contract event listeners (GMEvent)
- [ ] Remove ALL emoji references (search & destroy)
- [ ] Remove ALL multichain UI (Base-only)
- [ ] Remove ALL confetti references (XPEventOverlay only)

### Phase 3: Testing & Validation
- [ ] Test GM button (Base chain only)
- [ ] Test XPEventOverlay triggers on GM success
- [ ] Verify icons render correctly (sun, star, flash)
- [ ] Confirm NO emojis in code (grep search)
- [ ] Confirm NO multichain UI (no chain selector)
- [ ] Confirm NO confetti (only XPEventOverlay)
- [ ] Test mobile layout (375px width)
- [ ] Test streak milestone display
- [ ] Test viral share button

### Phase 4: Documentation Update
- [ ] Update CURRENT-TASK.md (revert to 0% Phase 2)
- [ ] Update FOUNDATION-REBUILD-ROADMAP.md
- [ ] Remove Section 2.1 emoji completion note
- [ ] Add Section 2.1 professional rebuild note

---

## 🚫 Rules (2nd Reminder Compliance)

1. **NO EMOJIS** - All visual elements use SVG icons from `components/icons/`
2. **NO MULTICHAIN** - Base chain only (`GMChainKey = 'base'`), no chain selector UI
3. **NO CONFETTI** - XPEventOverlay component only for celebrations
4. **CONTRACT EVENTS** - Use ABIs from `lib/gmeow-utils.ts` (GmeowCore, GmeowGuild)
5. **PROFESSIONAL TEMPLATES** - Use `pixel-card`, `dash-gm-card` CSS classes

---

## 📝 Next Steps

1. **NOW**: Create new `app/Dashboard/page.tsx` with professional structure
2. **THEN**: Test GM button with XPEventOverlay celebration
3. **FINALLY**: Update progress documents (revert Phase 2 to 0%)

**Estimated Time**: 3-4 hours for professional rebuild  
**Priority**: 🔥🔥🔥 CRITICAL - Core retention page

---

**Remember**: This is the 2nd reminder about NO EMOJIS. We must get this right! 🎯
