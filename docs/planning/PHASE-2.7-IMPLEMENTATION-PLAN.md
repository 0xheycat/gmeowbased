# Phase 2.7 Quest Page Implementation Plan

**Date**: January 12, 2025  
**Status**: Ready to start  
**Estimated Duration**: 3 hours  
**Phase**: Foundation Rebuild - Quest System

---

## 🎯 Overview

Rebuild quest page with professional patterns supporting onchain (Base) and social (Farcaster) verification. Replace old quest-wizard with modern, accessible, production-ready system.

---

## ✅ Preparation Complete

### Files Removed
- ✅ `components/quest-wizard/QuestWizard.tsx`
- ✅ `docs/features/quest-wizard/` (58 files)
- ✅ `docs/architecture/analysis/quest-wizard-*.md` (3 audits)
- ✅ `Docs/docs/architecture/adr/001-quest-wizard-refactor.md`
- ✅ Documentation index updated (removed quest-wizard references)

### Research Complete
- ✅ Professional patterns documented (Layer3, Galxe, Rabbithole, Guild.xyz)
- ✅ Verification methods researched (onchain + Farcaster social)
- ✅ UI component patterns defined
- ✅ Database schema designed
- ✅ Reference: `docs/planning/QUEST-PAGE-PROFESSIONAL-PATTERNS.md`

### Template Selection: **gmeowbased0.6**
**Rationale**: Best components for quest UI

**Available Components**:
- `components/ui/collection-card.tsx` - Card layout with gradient overlays
- `components/ui/progressbar.tsx` - Progress tracking (multiple variants)
- `components/ui/badge.tsx` - Status badges
- `components/ui/avatar.tsx` - User/protocol avatars
- `components/ui/list-card.tsx` - List views with actions

**Supplementary Components**:
- Shadcn/ui (already integrated): Card, Button, Progress, Dialog
- Lucide icons (already integrated): Trophy, CheckCircle2, Lock, Star

---

## 📋 Implementation Tasks

### Task 1: Database Schema (30 minutes)
**Files**: `supabase/migrations/[timestamp]_create_quest_system.sql`

**Tables to Create**:
1. `quests` - Quest metadata (title, description, rewards, status)
2. `quest_tasks` - Individual tasks within quests
3. `user_quest_progress` - User progress tracking
4. `task_completions` - Task verification records

**Schema Reference**: See `QUEST-PAGE-PROFESSIONAL-PATTERNS.md` section "Database Schema"

**Subtasks**:
- [ ] Create migration file
- [ ] Define quests table with Base chain support
- [ ] Define quest_tasks table with verification config
- [ ] Define user_quest_progress table
- [ ] Define task_completions table
- [ ] Add RLS policies (user can read own progress, admin can manage quests)
- [ ] Apply migration: `pnpm supabase:migrate`

---

### Task 2: Core Quest Components (60 minutes)
**Directory**: `app/quests/components/`

**Components to Build**:

#### 2.1 QuestCard.tsx
**Purpose**: Display quest summary in grid/list view  
**Template Base**: `gmeowbased0.6/components/ui/collection-card.tsx`  
**Props**:
```typescript
interface QuestCardProps {
  id: string
  title: string
  protocol: string
  logoUrl: string
  progress: number // 0-100
  tasksCompleted: number
  tasksTotal: number
  rewardXP: number
  status: 'locked' | 'available' | 'in-progress' | 'completed'
  chainId: number
}
```

**Features**:
- Gradient overlay card design
- Progress bar (use `progressbar.tsx`)
- Status badge (locked/available/in-progress/completed)
- Reward display (XP + badge icon)
- Chain logo (Base)
- Hover effects (no animation, subtle shadow)

**Icons**: Trophy, Lock, CheckCircle2 (from lucide-react)

#### 2.2 QuestGrid.tsx
**Purpose**: Responsive grid layout for quest cards  
**Props**:
```typescript
interface QuestGridProps {
  quests: Quest[]
  filter?: 'all' | 'active' | 'completed' | 'locked'
}
```

**Features**:
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Filter tabs (All / Active / Completed)
- Empty state with icon (no emoji)
- Loading skeleton (use Shadcn Skeleton)

#### 2.3 TaskList.tsx
**Purpose**: Display quest tasks with verification status  
**Props**:
```typescript
interface TaskListProps {
  tasks: QuestTask[]
  userProgress: TaskCompletion[]
  onVerify: (taskId: string) => Promise<void>
}
```

**Features**:
- Task cards with status icons (pending/verifying/completed/failed)
- Verification buttons (Connect Wallet / Verify / Retry)
- Task description + type badge (Onchain / Social)
- Progress indicator (current step highlighted)

#### 2.4 QuestProgress.tsx
**Purpose**: Visual progress tracking  
**Template Base**: `gmeowbased0.6/components/ui/progressbar.tsx`  
**Props**:
```typescript
interface QuestProgressProps {
  currentStep: number
  totalSteps: number
  steps: Array<{
    id: string
    title: string
    status: 'completed' | 'current' | 'upcoming'
  }>
}
```

**Features**:
- Linear step progress bar
- Step list with status icons
- Active step highlight (primary color)
- Completed steps (green checkmark)

#### 2.5 VerificationButton.tsx
**Purpose**: Handle task verification with loading states  
**Props**:
```typescript
interface VerificationButtonProps {
  taskId: string
  taskType: 'onchain' | 'social'
  status: 'pending' | 'verifying' | 'completed' | 'failed'
  onVerify: () => Promise<void>
}
```

**Features**:
- Dynamic button text based on status
- Loading spinner (Loader2 icon)
- Error handling with retry
- Connect wallet prompt if needed

---

### Task 3: Quest Pages (45 minutes)
**Directory**: `app/quests/`

#### 3.1 app/quests/page.tsx
**Purpose**: Quest list/grid view

**Features**:
- Page header with title + description
- Filter tabs (All / Active / Completed)
- QuestGrid component
- Empty states
- Search (future: Phase 3)

**Layout**:
```tsx
<div className="container mx-auto px-4 py-8">
  <h1>Quests</h1>
  <p className="text-muted-foreground">Complete quests to earn XP and badges</p>
  
  <Tabs defaultValue="all">
    <TabsList>
      <TabsTrigger value="all">All Quests</TabsTrigger>
      <TabsTrigger value="active">Active</TabsTrigger>
      <TabsTrigger value="completed">Completed</TabsTrigger>
    </TabsList>
    
    <TabsContent value="all">
      <QuestGrid quests={allQuests} />
    </TabsContent>
    {/* ... other tabs */}
  </Tabs>
</div>
```

#### 3.2 app/quests/[questId]/page.tsx
**Purpose**: Quest detail view with task list

**Features**:
- Quest header (title, protocol, rewards)
- QuestProgress component
- TaskList component
- Claim reward button (when completed)
- Back to quests link

**Data Fetching**:
```typescript
// Fetch quest details
const quest = await supabase
  .from('quests')
  .select('*, quest_tasks(*)')
  .eq('id', params.questId)
  .single()

// Fetch user progress
const progress = await supabase
  .from('user_quest_progress')
  .select('*, task_completions(*)')
  .eq('quest_id', params.questId)
  .eq('user_fid', userFid)
  .single()
```

#### 3.3 app/quests/[questId]/complete/page.tsx
**Purpose**: Quest completion celebration

**Features**:
- Success icon animation (subtle scale in, NO confetti)
- Quest title + rewards display
- XP earned + leaderboard position
- Badge earned (if applicable)
- "Back to Quests" button
- Share to Farcaster button

**Professional Celebration Pattern**:
```tsx
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  <CheckCircle2 className="w-24 h-24 text-green-500" />
  <h1 className="mt-6 text-3xl font-bold">Quest Completed!</h1>
  <div className="mt-8 space-y-4">
    <div className="flex items-center gap-3">
      <Trophy className="w-6 h-6 text-yellow-500" />
      <span className="text-xl">+{rewardXP} XP</span>
    </div>
    {badge && (
      <div className="flex items-center gap-3">
        <Star className="w-6 h-6 text-blue-500" />
        <span className="text-xl">Badge Unlocked: {badge.name}</span>
      </div>
    )}
  </div>
</motion.div>
```

---

### Task 4: Verification Functions (45 minutes)
**Directory**: `lib/quests/`

#### 4.1 lib/quests/onchain-verification.ts
**Purpose**: Base chain verification functions

**Functions**:
```typescript
// Verify transaction receipt
export async function verifyTransaction(
  walletAddress: string,
  targetContract: string,
  eventSignature: string
): Promise<boolean>

// Verify balance (token/NFT)
export async function verifyBalance(
  walletAddress: string,
  tokenAddress: string,
  minAmount: bigint
): Promise<boolean>

// Verify contract state
export async function verifyContractState(
  walletAddress: string,
  contractAddress: string,
  method: string,
  expectedValue: any
): Promise<boolean>
```

**Dependencies**:
- viem: `import { createPublicClient, http } from 'viem'`
- Base RPC: `https://mainnet.base.org`

#### 4.2 lib/quests/farcaster-verification.ts
**Purpose**: Farcaster social verification functions

**Functions**:
```typescript
// Verify follow
export async function verifyFollow(
  fid: number,
  targetFid: number
): Promise<boolean>

// Verify cast (text match)
export async function verifyCast(
  fid: number,
  requiredText: string,
  channelId?: string
): Promise<boolean>

// Verify channel membership
export async function verifyChannelMembership(
  fid: number,
  channelId: string
): Promise<boolean>

// Verify recast
export async function verifyRecast(
  fid: number,
  castHash: string
): Promise<boolean>

// Verify like
export async function verifyLike(
  fid: number,
  castHash: string
): Promise<boolean>
```

**Dependencies**:
- Neynar SDK: Already installed
- API key: From environment

#### 4.3 lib/quests/verification-orchestrator.ts
**Purpose**: Coordinate verification based on task type

**Function**:
```typescript
export async function verifyTask(
  task: QuestTask,
  userFid: number,
  walletAddress?: string
): Promise<{
  verified: boolean
  error?: string
  verificationData?: any
}>
```

**Logic**:
1. Check task type (onchain / social)
2. Parse verification_config JSON
3. Call appropriate verification function
4. Record result in task_completions table
5. Update user_quest_progress
6. Award XP if quest completed

---

## 🎨 Design Guidelines

### Colors & Icons
- ✅ Use Lucide icons (Trophy, Star, CheckCircle2, Lock, Flame, etc.)
- ❌ NO emoji characters
- ✅ Status colors: Green (completed), Blue (in-progress), Gray (pending), Red (failed)
- ✅ Chain logo: Base logo SVG

### Animations
- ✅ Subtle scale/fade animations (Framer Motion)
- ❌ NO confetti animations
- ✅ Loading spinners (Loader2 icon)
- ✅ Hover effects (shadow, slight translate)

### Typography
- Headings: font-bold, tracking-tight
- Body: font-normal, text-muted-foreground
- Rewards: font-semibold, larger size

### Spacing
- Container: `container mx-auto px-4 py-8`
- Card gaps: `gap-4` (grid), `gap-3` (flex)
- Section spacing: `space-y-6`

---

## 🔒 Blocked Patterns

### Confetti Usage
**Status**: ❌ BLOCKED  
**Reason**: Not professional  
**Alternative**: Subtle icon animations (scale, fade)

**Example Replacement**:
```tsx
// OLD (blocked):
import confetti from 'canvas-confetti'
confetti({ /* ... */ })

// NEW (allowed):
import { motion } from 'framer-motion'
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
>
  <CheckCircle2 className="w-16 h-16 text-green-500" />
</motion.div>
```

### Emoji Usage
**Status**: ❌ BLOCKED  
**Reason**: Inconsistent rendering, not accessible  
**Alternative**: Lucide React icons

**Icon Mapping**:
- 🏆 → `<Trophy />`
- ⭐ → `<Star />`
- ✓ → `<CheckCircle2 />`
- 🔒 → `<Lock />`
- 🔥 → `<Flame />`
- 📊 → `<BarChart3 />`
- 🎯 → `<Target />`

**Example Replacement**:
```tsx
// OLD (blocked):
<div>🏆 Reward: 100 XP</div>

// NEW (allowed):
<div className="flex items-center gap-2">
  <Trophy className="w-4 h-4 text-yellow-500" />
  <span>Reward: 100 XP</span>
</div>
```

---

## 🧪 Testing Requirements

### Component Tests
**Location**: `app/quests/__tests__/`

**Test Files**:
1. `QuestCard.test.tsx` - Card rendering, status badges, progress
2. `QuestGrid.test.tsx` - Grid layout, filters, empty states
3. `TaskList.test.tsx` - Task rendering, verification buttons
4. `QuestProgress.test.tsx` - Progress tracking, step status

**Test Coverage Target**: 80%

### Integration Tests
**Location**: `app/quests/__tests__/integration/`

**Scenarios**:
1. Quest list page loads with real data
2. Quest detail page shows tasks correctly
3. Verification button triggers verification
4. Completion page displays after all tasks verified
5. XP awarded to leaderboard

### E2E Tests
**Location**: `e2e/quests/`

**Scenarios**:
1. User browses quests
2. User starts a quest
3. User completes onchain task
4. User completes social task
5. User claims reward

---

## 📚 Documentation Updates

### Files to Update
1. **FOUNDATION-REBUILD-ROADMAP.md**
   - Change Phase 2.7 status: ⏱️ NOT STARTED → ⏳ IN PROGRESS
   - Add new requirements (onchain + social verification)
   - Update template selection (gmeowbased0.6)
   - Add blocked patterns section

2. **CURRENT-TASK.md**
   - Replace content with Phase 2.7 implementation plan
   - List all subtasks with checkboxes
   - Add verification function references

3. **docs/planning/QUEST-PAGE-PROFESSIONAL-PATTERNS.md**
   - Already created ✅
   - Reference document for implementation

---

## 🚀 Implementation Order

**Total Time**: 3 hours

**Phase 1: Foundation (30 min)**
1. Create database migration
2. Apply migration to development
3. Test database with sample data

**Phase 2: Core Components (60 min)**
1. Build QuestCard component
2. Build QuestGrid component
3. Build TaskList component
4. Build QuestProgress component
5. Build VerificationButton component

**Phase 3: Pages (45 min)**
1. Build quest list page (app/quests/page.tsx)
2. Build quest detail page (app/quests/[questId]/page.tsx)
3. Build completion page (app/quests/[questId]/complete/page.tsx)

**Phase 4: Verification (45 min)**
1. Implement onchain verification functions
2. Implement Farcaster verification functions
3. Implement verification orchestrator
4. Test verification with real Base chain data

**Phase 5: Polish (30 min)**
1. Add loading states
2. Add error states
3. Test accessibility (WCAG AA)
4. Update documentation
5. Mark Phase 2.7 complete

---

## ✅ Definition of Done

- [ ] Database schema created and migrated
- [ ] All 5 core components built and tested
- [ ] All 3 pages functional (list, detail, complete)
- [ ] Onchain verification working (Base chain)
- [ ] Farcaster social verification working (follow, cast, recast, like, channel)
- [ ] XP rewards awarded correctly
- [ ] Leaderboard integration working
- [ ] No confetti animations used
- [ ] No emoji characters used
- [ ] WCAG AA accessibility compliance
- [ ] Component tests: 80% coverage
- [ ] Integration tests passing
- [ ] Documentation updated (FOUNDATION-REBUILD-ROADMAP.md, CURRENT-TASK.md)
- [ ] Phase 2.7 marked complete in roadmap

---

## 🔗 Reference Links

**Documentation**:
- Professional Patterns: `docs/planning/QUEST-PAGE-PROFESSIONAL-PATTERNS.md`
- Template Components: `planning/template/gmeowbased0.6/src/components/ui/`
- Roadmap: `FOUNDATION-REBUILD-ROADMAP.md` (Phase 2.7)

**APIs**:
- Neynar: https://docs.neynar.com
- Base Chain: https://docs.base.org
- Viem: https://viem.sh

**Design**:
- Shadcn/ui: https://ui.shadcn.com
- Lucide Icons: https://lucide.dev
- Framer Motion: https://www.framer.com/motion

---

**Status**: Ready to implement  
**Next Action**: Create database migration file  
**Blocked By**: None  
**Blocking**: None (parallel with other Phase 2 work)
