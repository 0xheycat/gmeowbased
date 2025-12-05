# Quest System Duplicate Audit - CRITICAL FINDINGS

**Date**: 2025-01-19  
**Status**: 🔴 DUPLICATES FOUND  
**Severity**: HIGH - Architectural inconsistency blocking production readiness

---

## Executive Summary

Comprehensive scan across **17 quest-related files** revealed **5 critical duplicate patterns**:

1. **Type Duplication**: 2 conflicting `Quest` interfaces with different schemas
2. **Function Duplication**: 2 implementations of `getQuestBySlug` 
3. **Architectural Duplication**: `QuestService` class vs standalone query functions
4. **Dead References**: 15+ references to non-existent `components/Quest/QuestCard.tsx`
5. **Type Fragmentation**: `QuestType` defined in 3 different locations

**Impact**: Maintenance overhead, type safety issues, confusing architecture, outdated task tracking

---

## 1. Quest Interface Duplication ❌

### Duplicate Type Definitions

**Location 1**: `lib/api/quests/types.ts` (155 lines)
```typescript
export interface Quest {
  id: string;                  // ⚠️ string
  title: string;
  slug: string;
  description: string;
  category: 'onchain' | 'social' | 'creative' | 'learn';  // ⚠️ 4 categories
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  coverImage: string;
  badgeImage?: string;
  xpReward: number;
  estimatedTime: string;
  requirements: QuestRequirement[];
  status: 'draft' | 'active' | 'completed' | 'archived';  // ⚠️ 4 statuses
  creator: QuestCreator;
  participantCount: number;
  completionCount: number;
  successRate: number;
}
```

**Location 2**: `lib/supabase/types/quest.ts` (181 lines)
```typescript
export interface Quest {
  id: number;                  // ⚠️ number (database primary key)
  created_at: string;
  title: string;
  description: string;
  category: 'onchain' | 'social';                         // ⚠️ 2 categories only
  type: QuestType;
  creator_fid: number;
  reward_points: number;
  reward_mode: RewardMode;
  verification_data: Record<string, any>;
  status: 'active' | 'paused' | 'completed' | 'expired'; // ⚠️ 4 different statuses
  max_completions?: number;
  cover_image_url?: string;
  difficulty?: QuestDifficulty;
  estimated_time_minutes?: number;
  tags: string[];
  participant_count: number;
  tasks: QuestTask[];          // ⚠️ Multi-step tasks (not in API version)
}
```

### Conflicts
- **ID Type**: `string` vs `number`
- **Category Values**: 4 vs 2 options
- **Status Values**: Different sets
- **Field Names**: camelCase vs snake_case
- **Creator Format**: Nested object vs FID number
- **Tasks**: Not in API types

### Impact
- ❌ Type imports from wrong location cause runtime errors
- ❌ API responses don't match Supabase schema
- ❌ Components receive incompatible data shapes
- ❌ TypeScript doesn't catch mismatches (both named `Quest`)

---

## 2. Function Duplication: getQuestBySlug ❌

### Implementation 1: API Service
**Location**: `lib/api/quests/service.ts` (line 81)
```typescript
async getQuestBySlug(slug: string): Promise<Quest | null> {
  return Array.from(QUESTS_DB.values()).find(q => q.slug === slug) || null;
}
```
- Uses in-memory `QUESTS_DB` Map
- Mock data for development
- Returns `Quest` from `lib/api/quests/types.ts`

### Implementation 2: Supabase Queries
**Location**: `lib/supabase/queries/quests.ts` (line 111)
```typescript
export async function getQuestBySlug(
  slug: string,
  userFid?: number
): Promise<QuestWithProgress | null> {
  // Uses mock data OR Supabase query
  if (USE_MOCK_DATA) {
    return getMockQuest(slug);
  }
  
  const supabase = getSupabaseServerClient();
  // ... Supabase query logic
  return data as Quest;
}
```
- Uses Supabase database OR mock data (toggle)
- Returns `Quest` from `lib/supabase/types/quest.ts`
- Optional user progress included

### Usage Confusion
**Page Component**: `app/quests/[slug]/page.tsx`
```typescript
import { getQuestBySlug } from '@/lib/supabase/queries/quests';  // ✅ Correct
```

**API Service Usage**: Internal to `lib/api/quests/service.ts`
```typescript
const quest = await this.getQuestBySlug(slug);  // 🤔 Uses Map, not DB
```

### Impact
- ❌ Two sources of truth for quest data
- ❌ Inconsistent behavior: Map vs Database
- ❌ Difficult to debug which implementation is called
- ❌ Mock data in two places (`QUESTS_DB` + `mock-quest-data.ts`)

---

## 3. Architectural Duplication: Service vs Queries ❌

### Pattern 1: QuestService Class
**Location**: `lib/api/quests/service.ts`
```typescript
export class QuestService {
  async getQuests(filters?: QuestFilters): Promise<Quest[]>
  async getQuestById(questId: string): Promise<Quest | null>
  async getQuestBySlug(slug: string): Promise<Quest | null>
  async getQuestWithProgress(questId: string, userFid: number)
  async checkQuestProgress(questId: string, userFid: number)
  async seedQuests(): Promise<void>
}

export const questService = new QuestService();
```
- Object-oriented approach
- In-memory storage (`Map`)
- Used by API routes only

### Pattern 2: Standalone Query Functions
**Location**: `lib/supabase/queries/quests.ts`
```typescript
export async function getActiveQuests(params)
export async function getFeaturedQuests(limit)
export async function getQuestBySlug(slug, userFid?)
export async function getQuestWithProgress(questId, userFid)
```
- Functional approach
- Supabase database access
- Used by page components

### Usage Split
**API Routes** → `questService` (Map-based)
```typescript
// app/api/quests/route.ts
const quests = await questService.getQuests(filters);
```

**Page Components** → Query functions (Supabase-based)
```typescript
// app/quests/[slug]/page.tsx
const quest = await getQuestBySlug(slug);
```

### Impact
- ❌ Two parallel implementations of same functionality
- ❌ API routes use different data source than pages
- ❌ Inconsistent patterns confuse new developers
- ❌ Migration path unclear (which to keep?)

---

## 4. Dead References: components/Quest/QuestCard.tsx ❌

### Ghost Folder References
**Location**: `lib/maintenance/tasks.ts` (15+ references)

```typescript
// Lines 70, 162, 318, 404, 557, 766, 842, 917, 1040, 1181, 1285, 1348, 1428, 1570, 1839, 1877
files: [
  'components/Quest/QuestCard.tsx',  // ❌ DOES NOT EXIST
  // ...
]
```

**Actual Location**: `components/quests/QuestCard.tsx` ✅

### Documentation References
Multiple markdown files reference the old path:
- `docs/architecture/analysis/quest-page-audit.md`
- `Docs/Maintenance/UI-UX/CHANGELOG-CATEGORY-5.md`
- `Docs/Maintenance/frame/Phase-1/Phase-1C/*`
- `docs/phase-reports/PHASE-1-FRESH-CSS-PROGRESS.md`

### Impact
- ❌ Maintenance task tracking points to wrong files
- ❌ Developers can't find referenced components
- ❌ Documentation outdated by folder rename
- ❌ 15+ task entries need updating

---

## 5. QuestType Fragmentation ❌

### Definition 1: Home Types
**Location**: `components/home/types.ts`
```typescript
export type QuestType = 'FARCASTER_CAST' | 'FARCASTER_FRAME_INTERACT' | 'GENERIC'
```
- Used by `LiveQuests.tsx`
- SCREAMING_SNAKE_CASE style
- Farcaster-specific actions

### Definition 2: Supabase Types
**Location**: `lib/supabase/types/quest.ts`
```typescript
export type QuestType = 'mint_nft' | 'swap_token' | 'provide_liquidity' | 
                       'follow_user' | 'like_cast' | 'recast' | 'custom';
```
- Used by database schema
- snake_case style
- Onchain + social actions
- More granular types

### Definition 3: Utility Types
**Location**: `lib/gmeow-utils.ts`
```typescript
export type QuestTypeKey = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8  // Numeric keys
  // Mapped to quest types for contract calls
```

### Impact
- ❌ Three incompatible `QuestType` definitions
- ❌ `components/home/types.ts` types don't match database
- ❌ Name collision causes import confusion
- ❌ Need unified quest type taxonomy

---

## Additional Findings

### 6. Duplicate Mock Data Sources
- `lib/api/quests/service.ts` → `QUESTS_DB` Map (5 seeded quests)
- `lib/supabase/mock-quest-data.ts` → `MOCK_QUESTS` array (mock data toggle)

### 7. Duplicate Hook Patterns
- `hooks/useQuests.ts` → SWR-based, calls `/api/quests`
- Direct Supabase queries in page components
- Different caching strategies

---

## Recommendations

### Priority 1: Unify Quest Types (CRITICAL)
```typescript
// Single source: lib/types/quest.ts
export interface Quest {
  // Merge best of both interfaces
  // Use database schema as source of truth
  // Add type adapters for API layer
}
```

### Priority 2: Consolidate Data Access
**Option A: Keep Supabase Queries** (Recommended)
- Remove `QuestService` class
- Migrate API routes to use `lib/supabase/queries/quests.ts`
- Single data access pattern

**Option B: Keep QuestService**
- Migrate to Supabase inside service methods
- Remove standalone query functions
- Keep OOP pattern

### Priority 3: Clean Dead References
```bash
# Update all references in lib/maintenance/tasks.ts
s/components\/Quest\/QuestCard\.tsx/components\/quests\/QuestCard.tsx/g
```

### Priority 4: Rename QuestType in Home
```typescript
// components/home/types.ts
export type HomeQuestFilter = 'FARCASTER_CAST' | 'FARCASTER_FRAME_INTERACT' | 'GENERIC'
// Avoid name collision with database QuestType
```

---

## Migration Strategy

### Phase 1: Type Unification (2 hours)
1. Create `lib/types/quest.ts` with unified interface
2. Add type adapters: `apiToDb()`, `dbToApi()`
3. Update all imports to use unified types
4. Run TypeScript check: `pnpm tsc --noEmit`

### Phase 2: Data Access Consolidation (3 hours)
1. Choose pattern: Supabase queries (recommended)
2. Update API routes to use query functions
3. Remove `QuestService` class or migrate to Supabase
4. Update hooks to use consistent data source
5. Remove in-memory `QUESTS_DB` Map

### Phase 3: Reference Cleanup (30 minutes)
1. Update `lib/maintenance/tasks.ts` (15 references)
2. Update documentation files (5 files)
3. Verify no broken links: `grep -r "Quest/QuestCard"`

### Phase 4: Type Renaming (30 minutes)
1. Rename `QuestType` in `components/home/types.ts`
2. Update `LiveQuests.tsx` imports
3. Add JSDoc to clarify usage context

---

## Score Impact

**Previous Score**: 98/100  
**Adjusted Score**: 92/100

**Deductions**:
- -3 points: Type duplication (architectural inconsistency)
- -2 points: Function duplication (maintenance overhead)
- -1 point: Dead references (outdated task tracking)

**Recovery Path**: Complete migration strategy above → **99/100** ✅

---

## Files Requiring Updates

### Immediate Action Required
1. `lib/maintenance/tasks.ts` - Update 15+ Quest/QuestCard references
2. `lib/api/quests/types.ts` - Mark as deprecated or merge
3. `lib/supabase/types/quest.ts` - Make primary type source
4. `components/home/types.ts` - Rename QuestType to avoid collision

### Documentation Updates
5. `docs/architecture/analysis/quest-page-audit.md`
6. `Docs/Maintenance/UI-UX/CHANGELOG-CATEGORY-5.md`
7. `docs/phase-reports/PHASE-1-FRESH-CSS-PROGRESS.md`

### Code Cleanup
8. `lib/api/quests/service.ts` - Migrate to Supabase or remove
9. `hooks/useQuests.ts` - Verify data source consistency
10. `app/api/quests/route.ts` - Update to use query functions

---

## Testing Checklist

- [ ] TypeScript compiles with 0 errors after type unification
- [ ] All quest pages load with correct data
- [ ] API routes return consistent response shapes
- [ ] Hooks fetch from correct data source
- [ ] No broken import statements
- [ ] Maintenance tasks point to correct files
- [ ] Documentation reflects current architecture

---

**Next Action**: Update `lib/maintenance/tasks.ts` to fix 15 dead references before proceeding with type unification.
