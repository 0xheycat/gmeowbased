# Quest Page Sprint 2 - Preparation & Resources

**Date**: November 14, 2025  
**Status**: Sprint 1 Complete ✅ → Sprint 2 Ready 🚀

---

## Sprint 1 Achievements ✅

**Build Results**:
- ✅ Quest page: **25.6 kB** (+400 bytes from 25.2 kB)
- ✅ 0 errors, 0 warnings
- ✅ Virtual scrolling implemented (20+ quests trigger)
- ✅ 44px minimum touch targets
- ✅ Horizontal overflow fixes
- ✅ Image lazy loading with blur placeholders

---

## Sprint 2 Objectives 🎯

From `QUEST_PAGE_AUDIT.md` Sprint 2:

### 1. Split QuestCard Component (2,018 lines → smaller components)
### 2. Pre-compute Quest Metadata
### 3. Debounce Search Input
### 4. Memoize Featured Quests Calculation
### 5. Add Archive Modal Virtualization

**Expected Impact**:
- Search typing lag: **300ms → <50ms** (-83%)
- Filter toggle: **100ms → instant**
- Memory usage: **-40%**
- CPU usage: **-50%**

---

## Available Utility Libraries & Components 📚

### Core Quest Utilities

#### 1. **`lib/formatters.ts`** ✅ REUSABLE
```typescript
// Already exists - can be expanded
export function formatNumber(value: number): string
export function formatQuestTypeLabel(value: string): string
```

**Sprint 2 Usage**:
- Extract ALL format functions from QuestCard.tsx (2,018 lines)
- Move to `formatters.ts` for reuse
- Examples to extract:
  - `formatRewardAmount()` - Currently inline in QuestCard
  - `formatExpiryCountdown()` - Currently in Quest page
  - `formatQuestDuration()` - Currently duplicated
  - `formatParticipantCount()` - Currently inline

#### 2. **`lib/quest-policy.ts`** ✅ ALREADY EXISTS
```typescript
// Quest creation policy & validation
export function resolveCreatorTier(identity: CreatorIdentity): CreatorTier
export function getQuestPolicy(tier: CreatorTier): QuestPolicy
export function questTypeRequiresGate(questTypeKey: string): 'token' | 'nft' | null
export function isAssetAllowed(asset: AssetLike, policy: QuestPolicy): boolean
```

**Sprint 2 Usage**:
- Not needed for Sprint 2 (creator-focused)
- Keep for future Quest creator optimizations

#### 3. **`lib/bot-quest-recommendations.ts`** ✅ REFERENCE ONLY
```typescript
// Smart quest recommendations based on user history
export async function generateQuestRecommendations(address: string, limit: number): Promise<QuestRecommendation[]>
export function formatQuestRecommendations(recommendations: QuestRecommendation[]): string
```

**Sprint 2 Usage**:
- Reference for scoring logic
- Could inspire "Featured Quests" improvements
- Not needed immediately

#### 4. **`lib/cache-storage.ts`** ✅ REUSABLE
```typescript
// Unified caching with TTL, eviction, type safety
export class CacheStorage<T> {
  get(key: string): T | null
  set(key: string, value: T): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
}

// Features:
- localStorage / sessionStorage / memory support
- TTL-based expiration
- Automatic eviction (maxEntries)
- SSR-safe
- Type-safe generics
```

**Sprint 2 Usage**:
- **CRITICAL**: Replace `readStorageCache`/`writeStorageCache` in Quest page
- Current Quest page uses primitive utils.ts cache
- CacheStorage provides:
  - Better eviction (current has no max entries)
  - Memory fallback (SSR-safe)
  - Type safety (current uses `any`)

**Refactor Example**:
```typescript
// BEFORE (app/Quest/page.tsx):
const cached = readStorageCache<{ quests: QuestSummary[]; lastSync: number }>(
  QUEST_CACHE_KEY,
  QUEST_CACHE_TTL_MS
)

// AFTER (using CacheStorage):
const questCache = new CacheStorage<{ quests: QuestSummary[]; lastSync: number }>({
  storage: 'localStorage',
  prefix: 'gmeow_quest_hub',
  ttl: QUEST_CACHE_TTL_MS,
  maxEntries: 50, // Prevent quota issues
})
const cached = questCache.get('quests')
```

#### 5. **`lib/utils.ts`** ✅ BASIC UTILITIES
```typescript
// Currently in use by Quest page
export function cn(...inputs: ClassValue[]) // Tailwind merge
export function clamp(value: number, min: number, max: number)
export function readStorageCache<T>(key: string, maxAgeMs: number): T | null
export function writeStorageCache<T>(key: string, value: T)
export function clearStorageCache(key: string)
```

**Sprint 2 Decision**:
- **Keep using** `cn()` and `clamp()`
- **Replace** cache functions with `CacheStorage` class
- Add debounce utility (doesn't exist yet)

---

### Quest Components Available

#### 1. **`QuestRewardCapsule.tsx`** ✅ ALREADY USED
- Current: Used in QuestCard.tsx
- Status: Well-optimized (149 lines)
- Features:
  - Points/token/NFT display
  - Multiplier chips
  - Hover tooltips
  - Tier styling (common/rare/epic/legendary)

**Sprint 2 Action**: ✅ Keep as-is

#### 2. **`QuestChainBadge.tsx`** ✅ ALREADY USED
- Current: Used in QuestCard.tsx
- Components:
  - `QuestChainChip` - Chain pills
  - `ChainIcon` - Chain icons with fallback
- Features:
  - 18px/28px size options
  - Image lazy loading
  - Fallback to initials

**Sprint 2 Action**: ✅ Keep as-is

#### 3. **`QuestTypeIcon.tsx`** ✅ ALREADY USED
- Current: Used in QuestCard.tsx
- Features:
  - 12 quest type icons (FARCASTER_FOLLOW, HOLD_ERC20, etc.)
  - Emoji + label display
  - Fallback for unknown types

**Sprint 2 Action**: ✅ Keep as-is

#### 4. **`QuestProgress.tsx`** ✅ ALREADY USED
- Current: Used in QuestCard.tsx
- Features:
  - Progress bar (0-100%)
  - Completion percentage
  - Streak display (🔥)
  - Player count
  - Gold badge (🥇) at 99%+

**Sprint 2 Action**: ✅ Keep as-is

#### 5. **`QuestLoadingDeck.tsx`** ✅ ALREADY USED
- Current: Used in Quest page
- Features:
  - Shimmer effect loading cards
  - Aurora spin animation
  - Responsive columns (auto/single/dual)
  - Reduced motion support

**Sprint 2 Action**: ✅ Keep as-is

---

## QuestCard.tsx Decomposition Plan 📦

**Current State**: 2,018 lines (TOO LARGE)

### Proposed Structure:

```
components/Quest/QuestCard/
├── index.tsx                    (200 lines) - Main coordinator
├── QuestCardHeader.tsx          (150 lines) - Title, tier badge, expiry
├── QuestCardBody.tsx            (250 lines) - Description, instructions, cast preview
├── QuestCardFooter.tsx          (150 lines) - Actions, social reactions, links
├── QuestCardCreator.tsx         (100 lines) - Creator plate (already exists as CreatorPlate)
├── QuestCardTarget.tsx          (120 lines) - Target profile preview (already TargetPreviewCard)
├── QuestCardMeta.tsx            (100 lines) - Metadata extraction & display
└── utils/
    ├── extractors.ts            (500 lines) - All extract* functions
    ├── formatters.ts            (200 lines) - All format* functions
    └── validators.ts            (150 lines) - Validation helpers
```

### Current QuestCard.tsx Analysis:

**Functions to Extract** (found via grep):
```typescript
// In QuestCard.tsx (lines vary):
- extractFarcasterPreview() - Cast URL parsing
- extractMultiplier() - Reward multiplier
- extractRewardDetails() - Reward breakdown
- extractRewardTokenSymbol() - Token symbol
- extractRewardAsset() - Asset metadata
- extractCreatorIdentity() - Creator info
- extractTargetProfile() - Target user
- deriveInitials() - Avatar fallback
- truncateText() - Text trimming
- resolveCastPreview() - Neynar API call
- mergeCastPreview() - Preview merging
- formatSocialReactions() - Like/recast counts
```

**State Management**:
- Currently 50+ `useMemo`, `useState`, `useEffect` hooks
- Each QuestCard has its own cache Maps
- Heavy re-computation on every render

**Sprint 2 Strategy**:
1. **Phase 1**: Extract utils (extractors.ts, formatters.ts)
2. **Phase 2**: Move to `lib/quest-utils.ts` for reuse
3. **Phase 3**: Pre-compute in Quest page, pass to QuestCard
4. **Phase 4**: Split QuestCard into sub-components

---

## Performance Optimizations Ready 🚀

### 1. Debounce Search (NEW UTILITY NEEDED)

**Create**: `lib/hooks/useDebounce.ts`
```typescript
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

**Usage in Quest page**:
```typescript
// Before:
const [searchTerm, setSearchTerm] = useState('')
// Filters run on EVERY keystroke

// After:
const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 300)
// Filters run 300ms after user stops typing
```

### 2. Featured Quests Memoization

**Current** (app/Quest/page.tsx line ~880):
```typescript
function buildFeaturedQuests(quests: QuestSummary[]): FeaturedQuest[] {
  // Heavy computation: sorting, filtering, truncating
  // Runs on EVERY re-render
}
```

**After**:
```typescript
const featuredQuests = useMemo(
  () => buildFeaturedQuests(quests),
  [quests] // Only recompute when quests array changes
)
```

### 3. Pre-compute Quest Metadata

**Current**: Each QuestCard extracts metadata independently
```typescript
// 50 quest cards × 15 extractions = 750 function calls
```

**After**: Extract once in Quest page
```typescript
const enrichedQuests = useMemo(
  () => quests.map(quest => ({
    ...quest,
    meta: {
      multiplier: extractMultiplier(quest),
      rewardDetails: extractRewardDetails(quest),
      rewardAsset: extractRewardAsset(quest),
      creatorIdentity: extractCreatorIdentity(quest),
      targetProfile: extractTargetProfile(quest),
    }
  })),
  [quests]
)
```

### 4. Archive Modal Virtualization

**Current** (app/Quest/page.tsx):
```typescript
{archiveResults.map((entry) => (
  <article className="quest-archive__item">
    {/* Renders ALL 100+ archived quests */}
  </article>
))}
```

**After**: Use `@tanstack/react-virtual`
```typescript
const virtualizer = useVirtualizer({
  count: archiveResults.length,
  getScrollElement: () => archiveRef.current,
  estimateSize: () => 80, // Archive item height
  overscan: 3,
})
```

---

## Sprint 2 Implementation Checklist 📋

### Task 1: Create Quest Utilities (1-2 hours)
- [ ] Create `lib/quest-utils.ts`
- [ ] Move all `extract*` functions from QuestCard.tsx
- [ ] Move all `format*` functions from Quest page
- [ ] Add to `lib/formatters.ts` for reuse
- [ ] Export types (`CreatorIdentity`, `TargetProfile`, etc.)

### Task 2: Create Debounce Hook (15 min)
- [ ] Create `lib/hooks/useDebounce.ts`
- [ ] Add TypeScript types
- [ ] Test with search input

### Task 3: Upgrade Cache System (30 min)
- [ ] Replace `readStorageCache`/`writeStorageCache` with `CacheStorage`
- [ ] Update Quest page cache initialization
- [ ] Update Archive cache initialization
- [ ] Add `maxEntries: 50` to prevent quota issues

### Task 4: Pre-compute Metadata (1 hour)
- [ ] Add `useMemo` for `enrichedQuests` in Quest page
- [ ] Pass pre-computed metadata to QuestCard
- [ ] Remove duplicate extraction in QuestCard
- [ ] Verify renders decrease

### Task 5: Memoize Featured Quests (15 min)
- [ ] Wrap `buildFeaturedQuests` in `useMemo`
- [ ] Add dependencies: `[quests]`
- [ ] Test filter changes don't recompute

### Task 6: Debounce Search (30 min)
- [ ] Import `useDebounce` hook
- [ ] Apply to `searchTerm` state
- [ ] Update `filteredQuests` useMemo dependencies
- [ ] Test typing performance

### Task 7: Archive Virtualization (1 hour)
- [ ] Add `useVirtualizer` for archive list
- [ ] Calculate archive item height (~80px)
- [ ] Add scroll container ref
- [ ] Test with 100+ archived quests

### Task 8: Build & Verify (30 min)
- [ ] Run `npm run build`
- [ ] Verify 0 errors, 0 warnings
- [ ] Check bundle size stays ~25-30 kB
- [ ] Test search typing lag (<50ms)
- [ ] Test filter toggle (instant)
- [ ] Profile memory usage

---

## Templates Folder Status 📁

**Checked**:
- `planning/templates/gmeow2/` - Old Next.js project (no Quest pages found)
- `planning/templates/gmeow3/` - Old Next.js project (no Quest pages found)

**Conclusion**: No legacy Quest page templates to reuse. Current implementation is already latest.

---

## Migration Notes ⚠️

### Breaking Changes (None Expected)
- QuestCard API stays the same
- Quest page filters unchanged
- Archive modal UX identical

### Performance Gains Expected
- Initial render: **-40% time**
- Search lag: **-83%** (300ms → 50ms)
- Filter toggle: **instant** (100ms → 0ms)
- Memory: **-40%**
- Re-renders: **-60%**

### Bundle Size Target
- Current: **25.6 kB**
- Target: **25-28 kB** (utilities add ~2 kB)
- Max acceptable: **30 kB**

---

## Reference Architecture 🏗️

### Similar Patterns in Codebase:

**Profile Page** (Sprint 3+4 complete):
- ✅ VirtualizedBadgeGrid (20+ items trigger)
- ✅ Memoized format functions
- ✅ Pre-computed rankSnapshot
- ✅ Lazy image loading

**Bot System**:
- ✅ `bot-quest-recommendations.ts` - Scoring logic
- ✅ `bot-cache.ts` - Redis-like caching
- ✅ Smart recommendations algorithm

**Dashboard**:
- ✅ Telemetry hooks with debouncing
- ✅ Memoized chart data
- ✅ Efficient re-render prevention

---

## Next Steps After Sprint 2 ⏭️

**Sprint 3: Accessibility** (4-5 hours)
- Archive modal keyboard navigation
- Filter button ARIA
- Screen reader announcements
- Focus management

**Sprint 4: Mobile Features** (5-6 hours)
- Quest bookmarking
- Floating Action Button
- Pull-to-refresh
- Quick actions menu

**Sprint 5: Code Quality** (6-8 hours)
- Split QuestCard component (if not done in Sprint 2)
- Error boundaries
- Unit tests (70% coverage)

---

## Ready to Start Sprint 2? ✅

All utilities identified, architecture planned, and implementation checklist ready!

**Estimated Time**: 4-6 hours  
**Expected Bundle Size**: 25-28 kB  
**Performance Improvement**: 40-60% faster
