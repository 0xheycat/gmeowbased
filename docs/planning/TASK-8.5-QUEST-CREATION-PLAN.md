# Task 8.5: Quest Creation System - Professional Modern Pattern

**Date**: December 4, 2025  
**Status**: 🔄 IN PROGRESS (Foundation Complete - 25%)  
**Priority**: HIGH (Blocks Phase 5 completion)  
**Estimated Time**: 8-12 hours  
**Goal**: Professional quest creation interface for users (social quests using BASE POINTS from contract)

---

## 🎯 Objectives

1. **Build Professional Quest Creation UI** - Modern multi-step wizard with template selection
2. **Points Cost System** - Users spend BASE POINTS (from contract) to create social quests
3. **Template Library** - Pre-built patterns for quick quest creation (social, onchain, hybrid)
4. **Full Optimization & Polish** - NO MORE REWORK after this rebuild
5. **Never Reference Old Foundation** - Use big platform patterns (Layer3, Galxe, Rabbithole)
6. **Template-Based UI** - Use components from TEMPLATE-SELECTION.md (gmeowbased0.6, trezoadmin-41, music)
7. **Icon System** - Use existing icon components from components/icons/ (NO external packages)

---

## 🔍 Platform Research: Best Quest Creation Patterns

### Layer3.xyz Quest Creation Flow

**URL**: https://layer3.xyz/create

**Key Features**:
1. **Template Selection First** - Users choose from pre-built templates:
   - Social Quest (Follow/Like/Recast)
   - Token Quest (Swap/Hold)
   - NFT Quest (Mint/Hold)
   - Learning Quest (Read/Quiz)
   
2. **Multi-Step Wizard** (4 steps):
   - Step 1: Quest Details (title, description, cover image)
   - Step 2: Tasks Setup (add verification requirements)
   - Step 3: Rewards (XP, achievement badges, NFT rewards)
   - Step 4: Preview & Publish

3. **Live Preview** - Right sidebar shows quest card as user builds

4. **Smart Defaults** - Templates pre-fill common fields

5. **Verification Config** - Visual builder for requirements:
   - Drag-drop task ordering
   - AND/OR logic for complex requirements
   - Test verification before publish

### Galxe.com Quest Creation

**URL**: https://galxe.com/campaign/create

**Key Features**:
1. **Campaign Builder** - Create quest campaigns with multiple tasks

2. **Credential System**:
   - Select from 50+ credential types
   - Social (Twitter, Discord, Farcaster)
   - Onchain (Token hold, NFT own, Transaction)
   - Off-chain (Email, Quiz, Manual)

3. **Visual Task Builder**:
   - Add task → Configure → Preview
   - Reorder tasks with drag-drop
   - Set task dependencies

4. **Reward Types**:
   - OAT (Onchain Achievement Token) - Free NFT
   - Points/XP
   - Token airdrop (with escrow)
   - Role assignments (Discord/Farcaster)

5. **Advanced Settings**:
   - Start/end dates
   - Max participants cap
   - Whitelist/blacklist users
   - Quest visibility (public/private)

### Rabbithole.gg Quest Creation

**URL**: https://rabbithole.gg/admin/quests/create

**Key Features**:
1. **Protocol Integration** - Select protocol partner first

2. **Educational Focus**:
   - Quest objectives (learning goals)
   - Tutorial content (embedded guides)
   - Step-by-step instructions

3. **Skill Levels**:
   - Beginner (simple tasks)
   - Intermediate (multi-step)
   - Advanced (complex DeFi)

4. **Verification Methods**:
   - Onchain state checks (automated)
   - Transaction receipts (automated)
   - Manual review (admin approval)

5. **Reward Distribution**:
   - NFT credentials (auto-mint)
   - Token rewards (escrow + claim)
   - XP/leveling system

---

## 🎨 Our Quest Creation Architecture

### Design Philosophy

**Inspired By**: Layer3 (template-first) + Galxe (visual builder) + Rabbithole (educational)

**Template Strategy** (from `docs/migration/TEMPLATE-SELECTION.md`):
- **Primary**: gmeowbased0.6 - Web3/crypto patterns (0-10% adaptation)
- **Secondary**: trezoadmin-41 - Professional admin UI (30-50% adaptation)
- **Tertiary**: music - DataTables, forms, charts (30-40% adaptation)
- **File Upload**: gmeowbased0.7 - FileUploader (20% adaptation)

**Key Differentiators**:
- ✅ **Farcaster-Native** - Social verification via Neynar API + existing verification-orchestrator.ts
- ✅ **Base Chain Focus** - Onchain verification via proxy contract (already integrated)
- ✅ **BASE POINTS Economy** - Users spend BASE POINTS (from contract address, NOT backend XP) to create quests
- ✅ **Achievement Badges** - Non-transferable badges for requirements/rewards (NOT transferable NFTs)
- ✅ **NFT Rewards** - Transferable NFTs can be quest rewards (separate from badges)
- ✅ **Template Library** - Pre-built patterns from templates (gmeowbased0.6 patterns)
- ✅ **Bot Integration** - @gmeowbased completion via mentions
- ✅ **Mobile-First** - Touch-optimized creator interface (gmeowbased0.6 responsive patterns)
- ✅ **Icon System** - Use components/icons/ (93 SVG icons), NO external dependencies

**Schema Alignment**:
- ✅ Matches existing `unified_quests` table (slug, creator_fid, reward_points, reward_xp)
- ✅ Matches existing `quest_tasks` table (verification_config JSONB)
- ✅ Matches existing `user_quest_progress` table (current_task_index, status)
- ✅ Matches existing verification system (lib/quests/verification-orchestrator.ts)
- ✅ Uses existing Supabase MCP for database operations
- ✅ Uses existing Coinbase MCP for Base chain operations

**CRITICAL CLARIFICATIONS**:
1. **BASE POINTS vs XP**:
   - BASE POINTS = From contract address (spent to create quests, earned from completions)
   - XP = Backend logic metric (rank, level progression - NOT SPENT)
   - Quest creation COSTS base_points (from leaderboard_calculations table)

2. **Badges vs NFTs**:
   - BADGES = Non-transferable achievements (lib/badges.ts, badge_templates table)
   - Can be quest REQUIREMENTS (e.g., "Must own X badge to start quest")
   - Can be quest REWARDS (earn badge on completion)
   - Managed via existing badge system (BADGE_REGISTRY)
   - NFTs = Transferable tokens (separate system, can also be rewards)

3. **Verification Schema**:
   - Tasks use existing `verification_config` JSONB field
   - Matches lib/quests/verification-orchestrator.ts logic
   - Social tasks → Neynar API verification
   - Onchain tasks → Base RPC + contract calls
   - NO REWORK of existing verification system

---

## 📋 Quest Creation Flow (4 Steps)

### Step 0: Template Selection (NEW)

**Purpose**: Quick-start with pre-configured quests

**Templates Available**:
1. **Social Amplifier** (Free - 100 points)
   - Follow creator
   - Cast in channel
   - Recast announcement
   - Reward: 50 XP (viral_xp)

2. **Community Builder** (150 points)
   - Join channel
   - Cast with hashtag
   - Follow 3 accounts
   - Reward: 100 XP (viral_xp)

3. **Base Chain Explorer** (200 points)
   - Swap tokens on Base
   - Hold 0.01 ETH
   - Mint NFT
   - Reward: 200 XP (base_points)

4. **DeFi Master** (300 points)
   - Provide liquidity
   - Hold LP tokens for 7 days
   - Make 3 swaps
   - Reward: 500 XP (base_points)

5. **Hybrid Champion** (250 points)
   - Social: Follow + Cast
   - Onchain: Swap + Hold NFT
   - Reward: 300 XP (viral_xp + base_points)

6. **Custom Quest** (Free)
   - Start from scratch
   - Full customization
   - No pre-fills

**UI Pattern**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {templates.map(template => (
    <Card 
      key={template.id}
      onClick={() => selectTemplate(template)}
      className="hover:border-primary cursor-pointer"
    >
      <CardHeader>
        <Badge>{template.cost} Points</Badge>
        <CardTitle>{template.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {template.description}
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs">{template.tasks} tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">{template.reward} XP reward</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          Use Template →
        </Button>
      </CardFooter>
    </Card>
  ))}
</div>
```

### Step 1: Quest Basics

**Fields**:
- Quest Title (max 100 chars)
- Short Description (max 200 chars)
- Full Description (markdown support, max 2000 chars)
- Cover Image Upload (Supabase storage)
- Category (onchain, social, creative, learn)
- Difficulty (beginner, intermediate, advanced)
- Estimated Time (5min, 15min, 30min, 1hr, 2hr, 4hr+)
- Start Date (optional, default: now)
- End Date (required, max 90 days)
- Max Participants (optional, unlimited or cap)

**Validation**:
- Title: Required, 10-100 chars
- Description: Required, 20-200 chars
- Cover Image: Optional, max 10MB, jpg/png/webp
- End Date: Must be > start date, max 90 days from now

**UI Components** (from TEMPLATE-SELECTION.md):
- Text inputs: gmeowbased0.6/input.tsx (0% adaptation)
- Textarea: trezoadmin-41/textarea-05.tsx (30% adaptation)
- Image upload: gmeowbased0.7/file-uploader.tsx (20% adaptation)
- Date pickers: trezoadmin-41/date-picker-02.tsx (40% adaptation)
- Dropdowns: gmeowbased0.6/select.tsx (0% adaptation)
- Form layout: trezoadmin-41/form-layout-01.tsx (35% adaptation)

### Step 2: Tasks Setup

**Task Types**:
1. **Social Tasks** (Farcaster):
   - Follow account (target_fid)
   - Cast in channel (channel_id, optional text requirement)
   - Recast specific cast (cast_hash)
   - Like specific cast (cast_hash)
   - Join channel (channel_id)
   - Cast with mention (@username)

2. **Onchain Tasks** (Base):
   - Hold token (token_address, min_amount)
   - Swap tokens (min_amount)
   - Hold NFT (nft_contract, min_balance)
   - Mint NFT (nft_contract)
   - Provide liquidity (pool_address, min_liquidity)

3. **Manual Tasks**:
   - Upload screenshot (proof_required)
   - Submit text answer (answer_validation)
   - External link visit (url_tracking)

**Task Builder UI** (from TEMPLATE-SELECTION.md):
```tsx
// Use gmeowbased0.6 card patterns + music DataTable for drag-drop
import { CollectionCard } from '@/templates/gmeowbased0.6/collection-card' // 5% adaptation
import { DataTable } from '@/templates/music/data-table' // 40% adaptation for drag-drop rows
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusIcon } from '@/components/icons' // Existing icon system

<div className="space-y-4">
  {/* DataTable with draggable rows for task reordering */}
  <DataTable
    columns={taskColumns}
    data={tasks}
    draggable={true}
    onReorder={handleTaskReorder}
    renderRow={(task, index) => (
      <div className="flex items-center gap-4 p-4 border rounded-lg">
        <Badge variant="outline">Task {index + 1}</Badge>
        <div className="flex-1">
          <p className="font-medium">{task.title}</p>
          <p className="text-sm text-muted-foreground">{task.type}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => moveTaskUp(index)}>
            <ChevronUpIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveTaskDown(index)}>
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => removeTask(index)}>
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  />
  
  <Button onClick={addTask} variant="outline" className="w-full">
    <PlusIcon className="w-4 h-4 mr-2" />
    Add Task
  </Button>
</div>
```

**Verification Config** (matches existing QuestTask.verification_data):
```typescript
// Aligns with lib/supabase/types/quest.ts QuestTask interface
interface TaskConfig {
  id: string
  type: 'social' | 'onchain' | 'manual'
  title: string
  description: string
  verification_data: { // MUST match existing quest_tasks.verification_data JSONB field
    // Social (verified via Neynar API + lib/quests/verification-orchestrator.ts)
    target_fid?: number
    channel_id?: string
    cast_hash?: string
    required_text?: string
    
    // Onchain (verified via Base RPC + proxy contract)
    token_address?: string
    nft_contract?: string
    min_amount?: string
    min_balance?: number
    
    // Manual (admin/creator approval)
    proof_required?: boolean
    answer?: string
  }
  required: boolean
  order: number
}
```

### Step 3: Rewards

**Reward Types**:
1. **BASE POINTS Rewards** (Required):
   - Amount (min 10, max 1000 per quest)
   - Source: leaderboard_calculations.base_points (from contract address)
   - Creator's points are ESCROWED until quest completion/expiry
   
2. **XP Rewards** (Optional):
   - Amount (min 10, max 500)
   - Source: viral_xp (backend logic, NOT spent by creator)
   - Used for rank/level progression, NOT quest creation costs
   
3. **Badge Rewards** (Optional):
   - Select from existing badges (lib/badges.ts BADGE_REGISTRY)
   - Badges are NON-TRANSFERABLE achievements (badge_templates table)
   - User earns badge on quest completion (stored in user_badge_collection)
   - Badge tiers: mythic/legendary/epic/rare/common
   
4. **NFT Rewards** (Future):
   - ERC721 tokens (transferable, unlike badges)
   - Requires escrow contract integration
   - Separate from badge system

**CRITICAL: Badges vs NFTs**:
- ✅ BADGES = Non-transferable achievements (existing badge system)
- ✅ Can be quest REWARDS ("Earn Badge X on completion")
- ✅ Can be quest REQUIREMENTS ("Must own Badge Y to start")
- ❌ Badges are NOT transferable tokens
- ✅ NFTs = Transferable ERC721 tokens (future feature)
- ✅ Use Supabase MCP for badge operations (badge_templates, user_badge_collection)

**Points Cost Calculation** (uses BASE POINTS from contract):
```typescript
// From lib/quests/cost-calculator.ts (already implemented)
function calculateQuestCost(quest: QuestDraft): number {
  let baseCost = 100 // Base creation cost (BASE POINTS)
  
  // Social quests cheaper (encourage community engagement)
  if (quest.category === 'social') {
    baseCost = 50
  }
  
  // Onchain quests more expensive (higher value)
  if (quest.category === 'onchain') {
    baseCost = 200
  }
  
  // Add cost per task
  const taskCost = quest.tasks.length * 20
  
  // Add cost for BASE POINTS rewards (must escrow from creator)
  const rewardCost = quest.reward_points || 0
  
  // Add cost for badge creation (if creating new badge)
  const badgeCost = quest.create_new_badge ? 50 : 0
  
  return baseCost + taskCost + rewardCost + badgeCost
}
```

**Escrow Requirements** (BASE POINTS):
- Creator must have sufficient base_points (from leaderboard_calculations)
- Points locked in quest_creation_costs table until quest expires
- Refund unused points after quest ends (if max participants not reached)
- Anti-spam: Min 7 day active time
- Use Supabase MCP for escrow transactions

### Step 4: Preview & Publish

**Preview Components** (from TEMPLATE-SELECTION.md):
1. Quest Card Preview: gmeowbased0.6/collection-card.tsx (5% adaptation)
2. Quest Detail Preview: gmeowbased0.6/jumbo-7.4.tsx (60% adaptation for featured layout)
3. Task List Preview: music/data-table.tsx (40% adaptation for task steps)
4. Reward Display Preview: gmeowbased0.6/badge-display.tsx (0% adaptation)

**Icons** (from components/icons/):
- Use existing SVG icon components (93 icons available)
- NO external icon libraries (no Lucide, no Phosphor, no emoji packages)
- Examples: CheckCircleIcon, XCircleIcon, ClockIcon, CoinsIcon, BadgeIcon, etc.

**Pre-Publish Checks**:
- [ ] All required fields filled
- [ ] At least 1 task configured
- [ ] Valid verification_data for each task (matches QuestTask schema)
- [ ] Sufficient base_points for creation cost (check leaderboard_calculations)
- [ ] Cover image uploaded (via gmeowbased0.7/file-uploader.tsx)
- [ ] End date is valid (max 90 days)
- [ ] Creator has Farcaster profile verified (check user_profiles.verified)

**Publish Options**:
1. **Publish Now** - Quest goes live immediately (charge base_points via Supabase MCP)
2. **Schedule** - Quest goes live at start_date (escrow base_points now)
3. **Save Draft** - Save for later (no points charged, store in unified_quests with status='draft')

**Post-Publish Actions** (via Supabase MCP):
- Charge base_points from creator (UPDATE leaderboard_calculations)
- Create quest record (INSERT unified_quests)
- Create quest_tasks records (INSERT quest_tasks with verification_data)
- Escrow reward points (INSERT quest_creation_costs)
- Generate quest frame for sharing (existing frame system)
- Send notification to creator (existing notification system)
- Optionally: Cast announcement via @gmeowbased bot (lib/bot-instance)

---

## 🗄️ Database Schema Updates

```sql
-- Quest creators table
CREATE TABLE quest_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL REFERENCES user_profiles(fid),
  total_quests_created INTEGER DEFAULT 0,
  total_points_spent BIGINT DEFAULT 0,
  active_quests INTEGER DEFAULT 0,
  max_active_quests INTEGER DEFAULT 5, -- Limit based on tier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest creation costs tracking
CREATE TABLE quest_creation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES unified_quests(id),
  creator_fid BIGINT NOT NULL,
  total_cost BIGINT NOT NULL,
  breakdown JSONB NOT NULL, -- { base: 100, tasks: 40, rewards: 50, badge: 50 }
  points_escrowed BIGINT NOT NULL,
  points_refunded BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest templates library
CREATE TABLE quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  template_data JSONB NOT NULL, -- Pre-filled quest config
  usage_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'system',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new fields to unified_quests
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS creator_fid BIGINT REFERENCES user_profiles(fid);
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS creation_cost BIGINT DEFAULT 0;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quest_templates(id);
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
```

---

## 🎨 Component Architecture

### File Structure

```
app/quests/
├── create/
│   ├── page.tsx                    # Quest creation main page
│   ├── loading.tsx                 # Loading state (gmeowbased0.6/loading.tsx 0%)
│   └── components/
│       ├── TemplateSelector.tsx    # Step 0: Template selection (gmeowbased0.6/collection-card.tsx 5%)
│       ├── QuestBasicsForm.tsx     # Step 1: Quest details (trezoadmin-41/form-layout-01.tsx 35%)
│       ├── TaskBuilder.tsx         # Step 2: Task setup (music/data-table.tsx 40%)
│       ├── RewardsForm.tsx         # Step 3: Rewards config (trezoadmin-41/form-03.tsx 30%)
│       ├── QuestPreview.tsx        # Step 4: Preview & publish (gmeowbased0.6/jumbo-7.4.tsx 60%)
│       ├── WizardStepper.tsx       # Step progress indicator (trezoadmin-41/wizard-stepper.tsx 35%)
│       ├── PointsCostBadge.tsx     # Real-time cost display (gmeowbased0.6/badge.tsx 0%)
│       └── TaskConfigForm.tsx      # Individual task config (trezoadmin-41/form-layout-02.tsx 40%)

components/quests/
├── QuestImageUploader.tsx          # Cover image upload (gmeowbased0.7/file-uploader.tsx 20%)
├── QuestTemplateCard.tsx           # Template selection cards (gmeowbased0.6/collection-card.tsx 5%)
├── TaskTypeSelector.tsx            # Task type picker (gmeowbased0.6/select.tsx 0%)
└── validation/
    ├── quest-creation-schemas.ts   # Zod validation schemas (ALREADY IMPLEMENTED)
    └── task-verification-schemas.ts # Task config validation (ALREADY IMPLEMENTED)

lib/quests/
├── quest-creation-service.ts       # Quest creation business logic (NEW - use Supabase MCP)
├── points-escrow-service.ts        # Points locking/refunding (NEW - use Supabase MCP)
├── template-library.ts             # Pre-built templates (ALREADY IMPLEMENTED)
└── cost-calculator.ts              # Dynamic cost calculation (ALREADY IMPLEMENTED)
```

**Template Adaptation Strategy**:
- 0-10% = Copy directly, minimal styling tweaks
- 30-50% = Significant logic changes, keep UI structure
- 60%+ = Heavy customization, use as reference only

**Icon Usage**:
- All icons from components/icons/ (93 SVG icons)
- Examples: CheckCircleIcon, XCircleIcon, ClockIcon, CoinsIcon, BadgeIcon, ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusIcon
- NO external packages (no lucide-react, no @phosphor-icons)

### Key Components

#### 1. QuestCreationWizard (Main Container)

```typescript
// app/quests/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient } from '@/lib/supabase'
import { WizardStepper } from './components/WizardStepper' // trezoadmin-41 pattern
import { TemplateSelector } from './components/TemplateSelector' // gmeowbased0.6 cards
import { QuestBasicsForm } from './components/QuestBasicsForm' // trezoadmin-41 form
import { TaskBuilder } from './components/TaskBuilder' // music DataTable
import { RewardsForm } from './components/RewardsForm' // trezoadmin-41 form
import { QuestPreview } from './components/QuestPreview' // gmeowbased0.6 jumbo
import { calculateQuestCost } from '@/lib/quests/cost-calculator' // ALREADY IMPLEMENTED
import { useNotifications } from '@/components/ui/live-notifications' // Existing
import { CoinsIcon } from '@/components/icons' // Existing icon system

type WizardStep = 'template' | 'basics' | 'tasks' | 'rewards' | 'preview'

interface QuestDraft {
  template_id?: string
  title: string
  description: string
  category: string
  difficulty: string
  cover_image_url?: string
  tasks: TaskConfig[]
  reward_points: number // BASE POINTS (from contract, escrowed from creator)
  reward_xp: number // XP (backend logic, NOT escrowed)
  // ... other fields
}

export default function QuestCreationPage() {
  const router = useRouter()
  const supabase = useSupabaseClient() // Supabase MCP available
  const { push: pushNotification } = useNotifications()
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('template')
  const [questDraft, setQuestDraft] = useState<QuestDraft>({} as QuestDraft)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const estimatedCost = calculateQuestCost(questDraft) // Uses cost-calculator.ts
  
  async function handlePublish() {
    setIsSubmitting(true)
    
    try {
      // 1. Verify user has enough base_points (from leaderboard_calculations)
      const { data: leaderboard } = await supabase
        .from('leaderboard_calculations')
        .select('base_points')
        .eq('fid', userFid)
        .single()
      
      if (leaderboard.base_points < estimatedCost) {
        throw new Error('Insufficient BASE POINTS')
      }
      
      // 2. Escrow points (INSERT into quest_creation_costs via Supabase MCP)
      await supabase.rpc('escrow_quest_points', {
        p_fid: userFid,
        p_amount: estimatedCost,
        p_quest_data: questDraft
      })
      
      // 3. Create quest (unified_quests table)
      const { data: quest } = await supabase
        .from('unified_quests')
        .insert({
          ...questDraft,
          creator_fid: userFid,
          creation_cost: estimatedCost,
          status: 'active',
          published_at: new Date().toISOString()
        })
        .select()
        .single()
      
      // 4. Create tasks (quest_tasks with verification_data JSONB)
      await supabase
        .from('quest_tasks')
        .insert(
          questDraft.tasks.map((task, index) => ({
            quest_id: quest.id,
            title: task.title,
            description: task.description,
            type: task.type,
            verification_data: task.verification_data, // JSONB field
            required: task.required,
            order: index
          }))
        )
      
      // 5. Success notification (existing live-notifications system)
      pushNotification({
        tone: 'success',
        title: 'Quest Published!',
        description: `${quest.title} is now live`,
        href: `/quests/${quest.slug}`,
        actionLabel: 'View Quest'
      })
      
      router.push(`/quests/${quest.slug}`)
      
    } catch (error) {
      pushNotification({
        tone: 'error',
        title: 'Creation Failed',
        description: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <WizardStepper 
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />
      
      {/* Real-time cost display (gmeowbased0.6 badge) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create Quest</h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <CoinsIcon className="w-5 h-5 mr-2" />
            Cost: {estimatedCost} BASE POINTS
          </Badge>
        </div>
      </div>
      
      {/* Step content */}
      {currentStep === 'template' && (
        <TemplateSelector 
          onSelect={(template) => {
            setQuestDraft(template.data)
            setCurrentStep('basics')
          }}
        />
      )}
      
      {currentStep === 'basics' && (
        <QuestBasicsForm
          draft={questDraft}
          onChange={setQuestDraft}
          onNext={() => setCurrentStep('tasks')}
        />
      )}
      
      {currentStep === 'tasks' && (
        <TaskBuilder
          draft={questDraft}
          onChange={setQuestDraft}
          onNext={() => setCurrentStep('rewards')}
          onPrev={() => setCurrentStep('basics')}
        />
      )}
      
      {currentStep === 'rewards' && (
        <RewardsForm
          draft={questDraft}
          onChange={setQuestDraft}
          onNext={() => setCurrentStep('preview')}
          onPrev={() => setCurrentStep('tasks')}
        />
      )}
      
      {currentStep === 'preview' && (
        <QuestPreview
          draft={questDraft}
          cost={estimatedCost}
          onPublish={handlePublish}
          onPrev={() => setCurrentStep('rewards')}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
```

---

## 🔒 Security & Validation

### Rate Limiting

```typescript
// app/api/quests/create/route.ts
import { strictLimiter } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Strict rate limit: 10 quest creations per minute
  const rateLimitResult = await strictLimiter.check(userFid.toString())
  
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  // ... creation logic
}
```

### Input Validation

```typescript
// components/quests/validation/quest-creation-schemas.ts
import { z } from 'zod'

export const QuestBasicsSchema = z.object({
  title: z.string().min(10, 'Too short').max(100, 'Too long'),
  description: z.string().min(20).max(2000),
  category: z.enum(['onchain', 'social', 'creative', 'learn']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_time_minutes: z.number().min(5).max(480),
  max_participants: z.number().min(1).max(10000).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime()
})

export const TaskConfigSchema = z.object({
  type: z.enum(['social', 'onchain', 'manual']),
  title: z.string().min(5).max(100),
  description: z.string().max(500),
  verification_data: z.object({ // MUST match QuestTask.verification_data JSONB field
    // Social (verified via Neynar API + lib/quests/verification-orchestrator.ts)
    target_fid: z.number().positive().optional(),
    channel_id: z.string().max(50).optional(),
    cast_hash: z.string().regex(/^0x[a-f0-9]{40}$/).optional(),
    required_text: z.string().max(200).optional(),
    
    // Onchain (verified via Base RPC + proxy contract + Coinbase MCP)
    token_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    nft_contract: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    min_amount: z.string().regex(/^\d+$/).optional(),
    min_balance: z.number().positive().optional()
  }),
  required: z.boolean().default(true),
  order: z.number().nonnegative()
})

export const RewardsSchema = z.object({
  reward_points: z.number().min(10).max(1000), // BASE POINTS (from contract, escrowed)
  reward_xp: z.number().min(0).max(500).optional(), // XP (backend logic, NOT escrowed)
  reward_badge_ids: z.array(z.string().uuid()).optional(), // Select from badge_templates
  create_new_badge: z.boolean().default(false) // Costs 50 BASE POINTS
})
```

### Anti-Spam Measures

```typescript
// lib/quests/quest-creation-service.ts (NEW - use Supabase MCP)
export async function validateQuestCreation(
  creatorFid: number,
  questDraft: QuestDraft
): Promise<{ valid: boolean; error?: string }> {
  // 1. Check creator tier (limits based on user rank)
  const creator = await getQuestCreator(creatorFid)
  
  if (creator.active_quests >= creator.max_active_quests) {
    return {
      valid: false,
      error: `Maximum active quests reached (${creator.max_active_quests})`
    }
  }
  
  // 2. Check min quest duration (7 days to prevent spam)
  const duration = new Date(questDraft.ends_at).getTime() - Date.now()
  const minDuration = 7 * 24 * 60 * 60 * 1000 // 7 days
  
  if (duration < minDuration) {
    return {
      valid: false,
      error: 'Quest must be active for at least 7 days'
    }
  }
  
  // 3. Check for duplicate quests (prevent copy-paste spam)
  const similar = await supabase
    .from('unified_quests')
    .select('id')
    .eq('creator_fid', creatorFid)
    .eq('title', questDraft.title)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  if (similar.data && similar.data.length > 0) {
    return {
      valid: false,
      error: 'Similar quest created recently'
    }
  }
  
  // 4. Validate base_points balance (from leaderboard_calculations, NOT user_profiles)
  const { data: leaderboard } = await supabase
    .from('leaderboard_calculations')
    .select('base_points')
    .eq('fid', creatorFid)
    .single()
  
  const cost = calculateQuestCost(questDraft) // Uses cost-calculator.ts
  
  if (leaderboard.base_points < cost) {
    return {
      valid: false,
      error: `Insufficient BASE POINTS (need ${cost}, have ${leaderboard.base_points})`
    }
  }
  
  return { valid: true }
}
```

---

## 🚀 Implementation Checklist

### Phase 1: Foundation (2-3 hours) ✅ COMPLETE
- [x] Create database migrations (quest_creators, quest_creation_costs, quest_templates) - DONE
- [x] Build template library (6 pre-built templates seeded) - DONE (lib/quests/template-library.ts)
- [x] Create cost calculator function - DONE (lib/quests/cost-calculator.ts)
- [x] Set up validation schemas (Zod) - DONE (lib/quests/quest-creation-validation.ts)

### Phase 2: UI Components (3-4 hours) - NEXT
- [ ] TemplateSelector component (gmeowbased0.6/collection-card.tsx 5%)
- [ ] QuestBasicsForm (trezoadmin-41/form-layout-01.tsx 35%)
- [ ] TaskBuilder (music/data-table.tsx 40% for drag-drop)
- [ ] TaskConfigForm (trezoadmin-41/form-layout-02.tsx 40%)
- [ ] RewardsForm (trezoadmin-41/form-03.tsx 30%)
- [ ] QuestPreview (gmeowbased0.6/jumbo-7.4.tsx 60%)
- [ ] WizardStepper (trezoadmin-41/wizard-stepper.tsx 35%)
- [ ] PointsCostBadge (gmeowbased0.6/badge.tsx 0%)
- [ ] QuestImageUploader (gmeowbased0.7/file-uploader.tsx 20%)

### Phase 3: Business Logic (2-3 hours)
- [ ] Quest creation API endpoint (/api/quests/create) - Use Supabase MCP
- [ ] Points escrow service (lib/quests/points-escrow-service.ts) - Use Supabase MCP
- [ ] Template application logic (DONE in template-library.ts)
- [ ] Draft save/load functionality (localStorage + unified_quests.is_draft)
- [ ] Pre-publish validation checks (use validateQuestCreation())
- [ ] Post-publish actions (notifications via live-notifications, frame generation)

### Phase 4: Polish & Testing (2-3 hours)
- [ ] Mobile responsive design (gmeowbased0.6 responsive patterns)
- [ ] Loading states (gmeowbased0.6/loading.tsx 0%)
- [ ] Error handling & user feedback (live-notifications system)
- [ ] Form autosave (localStorage)
- [ ] Accessibility audit (WCAG AA) - Use existing icon components
- [ ] E2E testing (create → publish → verify via verification-orchestrator.ts)
- [ ] Performance optimization (<2s step transitions)

**CRITICAL NOTES**:
- ✅ Use ONLY template components from TEMPLATE-SELECTION.md
- ✅ Use ONLY icons from components/icons/ (93 SVG icons available)
- ✅ Use Supabase MCP for all database operations
- ✅ Use Coinbase MCP for Base chain verification (onchain tasks)
- ✅ Align all verification with existing verification-orchestrator.ts
- ✅ Use leaderboard_calculations.base_points (NOT user_profiles.points)
- ✅ Badges are achievements (badge_templates), NOT transferable tokens

---

## 📊 Success Metrics

### User Experience
- [ ] <3 minutes to create simple social quest (template → publish)
- [ ] <10 minutes to create complex hybrid quest (custom → publish)
- [ ] 0 TypeScript errors
- [ ] 0 console warnings
- [ ] <2s step transition time
- [ ] 100% mobile responsive (375px → desktop)

### Security
- [ ] Rate limiting works (max 10 creations/minute)
- [ ] BASE POINTS escrow prevents double-spending (from leaderboard_calculations)
- [ ] Input validation catches all malformed data (via Zod schemas)
- [ ] Anti-spam measures block duplicates (7 day minimum, rate limiting)
- [ ] No SQL injection vulnerabilities (Supabase MCP parameterized queries)

### Business
- [ ] Points economy balanced (BASE POINTS creation costs match rewards)
- [ ] Template usage tracked (quest_templates.usage_count analytics)
- [ ] Creator tiers limit spam (5 active quests for new users via quest_creators.max_active_quests)
- [ ] Refund system works (unused BASE POINTS returned via quest_creation_costs after quest ends)

---

## 📋 Key Corrections Summary

**This document has been updated with critical clarifications**:

### ✅ Template References (TEMPLATE-SELECTION.md)
- All UI components now reference gmeowbased0.6/trezoadmin-41/music templates
- Adaptation percentages documented (0-10% = copy, 30-50% = significant changes, 60%+ = reference only)
- NO generic shadcn/ui references, use template-specific components

### ✅ Schema Alignment
- `verification_data` field (JSONB) matches existing `quest_tasks` table
- Aligns with `lib/quests/verification-orchestrator.ts` verification logic
- Uses existing `unified_quests`, `quest_tasks`, `user_quest_progress` tables

### ✅ Badge System Clarification
- Badges are NON-TRANSFERABLE achievements (`badge_templates` table, `lib/badges.ts`)
- Can be quest REQUIREMENTS ("Must own Badge X") or REWARDS ("Earn Badge Y")
- Stored in `user_badge_collection` table
- NOT transferable ERC721 tokens (use NFTs for transferable rewards)

### ✅ Points vs XP Distinction
- **BASE POINTS** = From contract address (`leaderboard_calculations.base_points`)
  - SPENT to create quests (escrowed)
  - EARNED from quest completions
  - Used for quest creation costs
- **XP** = Backend logic metric (`viral_xp` in leaderboard_calculations)
  - NOT spent by creator
  - Earned from social engagement
  - Used for rank/level progression only

### ✅ Icon System
- Use ONLY components/icons/ (93 production SVG icons)
- NO external packages (no lucide-react, no @phosphor-icons, no emoji packages)
- Examples: CheckCircleIcon, XCircleIcon, CoinsIcon, BadgeIcon, ChevronUpIcon, etc.

### ✅ MCP Integration
- **Supabase MCP**: All database operations (quests, tasks, badges, points)
- **Coinbase MCP**: Base chain verification for onchain tasks
- Use `activate_database_migration_tools` for DDL operations
- Use existing Neynar API for social verification

---

## 🎯 Next Steps After 8.5

1. **Task 8.6**: Fix OLD pattern references (bot + frame routes) - 30 minutes
2. **Phase 5.1**: Add FeaturedQuestCard component - 2 hours
3. **Phase 5.2**: Add social proof elements - 2 hours
4. **Phase 5.3**: Polish all quest components - 2 hours
5. **Phase 5.4**: QuestAnalyticsDashboard - 4 hours
6. **Phase 5.5**: QuestManagementTable - 3 hours
7. **Final Improvements**: Accessibility, performance, mobile testing - 2 hours

---

**Status**: Ready to implement  
**Estimated Completion**: December 5, 2025  
**Dependencies**: None (all systems in place)  
**Blocking**: None (can start immediately)
