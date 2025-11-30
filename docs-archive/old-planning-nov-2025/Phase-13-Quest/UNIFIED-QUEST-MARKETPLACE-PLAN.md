# Phase 13: Unified Quest Marketplace - On-Chain + Social Quests

**Date**: November 28, 2025  
**Status**: 🚀 READY TO START  
**Goal**: Build unified quest system supporting both on-chain (token/NFT verification) and social (Farcaster interactions) user-generated quests  
**Est. Time**: 24-28 hours (~4 days)  
**Priority**: 🔴 HIGH - Drive ecosystem growth & user engagement

---

## 🎯 Mission

**User Request**: "oh ya so we have onchain + social quest, we need move quest, give me better approach regarding onchain quest as well"

**Phase 13 Objectives**:
- ✅ **Unified Marketplace**: Single marketplace for both on-chain + social quests
- ✅ **On-Chain Quests**: Token holdings, NFT ownership, transaction verification via RPC
- ✅ **Social Quests**: Farcaster interactions (follow, like, recast) via Neynar
- ✅ **User-Generated**: Users spend points to create quests (100-500 pts)
- ✅ **Dynamic Structure**: NO hardcoded - JSONB `verification_data` for flexibility
- ✅ **Creator Economy**: Quest creators earn % of completions + viral bonuses
- ✅ **Dual Verification**: Neynar API (social) + RPC calls (on-chain)
- ❌ **NEVER** use old foundation UI/UX/CSS

**Success Criteria**: Users can create, discover, and complete both quest types with viral growth loop

---

## ⏱️ Timeline & Tasks

| Task | Est. Time | Priority | Dependencies |
|------|-----------|----------|--------------|
| 0. Old Foundation Quest System Audit | 2 hours | 🔴 HIGH | Phase 12 complete ✅ |
| 1. Unified Quest Data Models & Economy | 3 hours | 🔴 HIGH | Task 0 |
| 2. Quest Marketplace UI Components | 6-7 hours | 🔴 HIGH | Task 1 |
| 3. Unified Quest Creation Wizard | 4 hours | 🔴 HIGH | Task 1, 2 |
| 4. Quest API Routes (Create/List/Verify/Complete) | 5 hours | 🟡 MEDIUM | Task 1 |
| 5. Dual Verification System (Neynar + RPC) | 4 hours | 🟡 MEDIUM | Task 4 |
| 6. Creator Economy & Viral Rewards | 2-3 hours | 🟢 MEDIUM | Task 4, 5 |
| **TOTAL** | **26-30 hours** | **~4 days** | - |

---

## 🌟 Unified Quest System Architecture

### Quest Categories & Types

**Two Main Categories**:

#### 1. On-Chain Quests (Blockchain Verification)
```typescript
type OnChainQuestType = 
  | 'token_hold'        // Hold X tokens for Y days
  | 'nft_own'           // Own specific NFT
  | 'transaction_make'  // Make on-chain transaction
  | 'multichain_gm'     // GM on multiple chains
  | 'contract_interact' // Interact with specific contract
  | 'liquidity_provide' // Provide liquidity in DEX

interface OnChainVerificationData {
  chain: GMChainKey          // Base, OP, Arbitrum, etc.
  token_address?: string     // For token_hold
  min_amount?: string        // Minimum amount to hold
  nft_address?: string       // For nft_own
  contract_address?: string  // For contract_interact
  function_signature?: string // For contract_interact
  multi_chain_count?: number // For multichain_gm (e.g., 3 chains)
}
```

#### 2. Social Quests (Farcaster Verification)
```typescript
type SocialQuestType = 
  | 'follow_user'      // Follow specific Farcaster user
  | 'like_cast'        // Like specific cast by hash
  | 'recast_cast'      // Recast specific cast
  | 'reply_cast'       // Reply to specific cast
  | 'join_channel'     // Join Farcaster channel
  | 'cast_mention'     // Cast mentioning specific user
  | 'cast_hashtag'     // Cast with specific hashtag

interface SocialVerificationData {
  target_fid?: number        // For follow_user, cast_mention
  target_cast_hash?: string  // For like/recast/reply
  target_channel?: string    // For join_channel
  required_text?: string     // For cast_hashtag
}
```

### Unified Quest Schema

**Supabase Table** (supports both types with dynamic JSONB):
```typescript
interface UnifiedQuest {
  id: string
  creator_fid: number
  
  // Quest category & type
  category: 'onchain' | 'social'
  type: OnChainQuestType | SocialQuestType
  
  // Basic info
  title: string
  description: string
  
  // Dynamic verification (NO hardcoded structure)
  verification_data: OnChainVerificationData | SocialVerificationData // JSONB
  
  // Rewards
  xp_reward: number
  point_reward: number
  badge_reward?: string
  
  // Creator economy
  creation_cost: number      // Points spent to create (100-500)
  creator_earn_pct: number   // % of completions (10-20%)
  total_completions: number
  max_completions?: number   // Optional cap
  
  // Viral metrics
  completion_rate: number
  avg_completion_time: number
  viral_bonus_earned: boolean
  
  // Status
  active: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}
```

### Quest Creation Cost Tiers

**Dynamic Pricing** (applies to both on-chain + social quests):
```typescript
const QUEST_CREATION_TIERS = {
  basic: {
    cost: 100,              // 100 points to create
    max_reward_xp: 50,
    max_reward_points: 25,
    creator_earn_pct: 10,   // 10% of completions
    label: 'Basic Quest',
    description: 'Perfect for simple challenges'
  },
  standard: {
    cost: 250,
    max_reward_xp: 150,
    max_reward_points: 75,
    creator_earn_pct: 15,
    label: 'Standard Quest',
    description: 'Balanced rewards for moderate challenges'
  },
  premium: {
    cost: 500,
    max_reward_xp: 300,
    max_reward_points: 150,
    creator_earn_pct: 20,
    label: 'Premium Quest',
    description: 'High-value quests for serious challenges'
  }
}

// On-chain quests may cost +50pts more due to RPC verification costs
const ON_CHAIN_COST_MODIFIER = 50
```

### Verification Flow Comparison

**On-Chain Verification Flow**:
```
User starts quest → Read blockchain via RPC
    ↓
Check token balance / NFT ownership / transaction history
    ↓
Verify criteria met (e.g., balance >= 1000 tokens)
    ↓
Mark complete → Award rewards → Pay creator
```

**Social Verification Flow**:
```
User starts quest → Call Neynar API
    ↓
Check Farcaster action (follow, like, recast, etc.)
    ↓
Verify action exists (e.g., user follows target FID)
    ↓
Mark complete → Award rewards → Pay creator
```

**Why Unified System?**:
- Single marketplace UI (easier discovery)
- Shared creator economy (same earning %)
- Consistent reward structure
- Easier to combine (e.g., "Follow @gmeow AND hold 1000 tokens")

### Creator Economy Flow

```
User creates quest → Spend points (100-500)
    ↓
Quest goes live in marketplace
    ↓
Other users complete quest
    ↓
Creator earns:
  - 10-20% of completion rewards
  - Viral bonus if 10+ completions (50 XP)
  - Badge if 50+ completions (Quest Master)
```

---

## 📋 Task Breakdown

### Task 0: Old Foundation Quest System Audit (2 hours)

**Objective**: Analyze old quest system for both on-chain and social patterns

**Steps**:
1. **On-Chain Quest Logic**:
   - Read `backups/pre-migration-20251126-213424/lib/quests.ts`
   - Read `backups/pre-migration-20251126-213424/lib/quest-verification.ts`
   - Document token balance checking patterns
   - Document NFT ownership verification
   - Document transaction verification methods
   - Identify RPC call patterns (viem usage)

2. **Social Quest Logic**:
   - Read `backups/pre-migration-20251126-213424/lib/farcaster-utils.ts`
   - Check Neynar API usage patterns
   - Review social verification logic (follows, likes, recasts)
   - Document API patterns for reuse

3. **Common Patterns**:
   - Caching strategies (ServerCache class)
   - Error handling & retry logic
   - Anti-spam mechanisms
   - Reward distribution flow

**Deliverables**:
- `OLD-FOUNDATION-QUEST-AUDIT.md` - Comprehensive analysis
- List of functions to reuse for on-chain verification
- List of Neynar API endpoints to reuse for social verification
- Comparison table: On-Chain vs Social patterns

---

### Task 1: Unified Quest Data Models & Economy (3 hours)

**Objective**: Design unified quest system supporting both on-chain + social with points economy

**Database Schema** (Supabase via MCP):

```sql
-- Unified quests table (supports both onchain + social)
CREATE TABLE unified_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_fid BIGINT NOT NULL,
  
  -- Quest category & type
  category TEXT NOT NULL CHECK (category IN ('onchain', 'social')),
  type TEXT NOT NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Dynamic verification (NO hardcoded structure)
  verification_data JSONB NOT NULL,
  
  -- Rewards
  xp_reward INTEGER NOT NULL,
  point_reward INTEGER NOT NULL,
  badge_reward TEXT,
  
  -- Creator economy
  creation_cost INTEGER NOT NULL,
  creator_earn_pct INTEGER NOT NULL,
  total_completions INTEGER DEFAULT 0,
  max_completions INTEGER,
  
  -- Viral metrics
  completion_rate DECIMAL(5,2) DEFAULT 0,
  avg_completion_time INTERVAL,
  viral_bonus_earned BOOLEAN DEFAULT FALSE,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('onchain', 'social')),
  CONSTRAINT valid_onchain_type CHECK (
    category != 'onchain' OR type IN (
      'token_hold', 'nft_own', 'transaction_make', 
      'multichain_gm', 'contract_interact', 'liquidity_provide'
    )
  ),
  CONSTRAINT valid_social_type CHECK (
    category != 'social' OR type IN (
      'follow_user', 'like_cast', 'recast_cast', 
      'reply_cast', 'join_channel', 'cast_mention', 'cast_hashtag'
    )
  )
);

-- Quest completions (track who completed what)
CREATE TABLE quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES unified_quests(id),
  completer_fid BIGINT NOT NULL,
  
  -- Verification proof
  verification_proof JSONB,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Rewards distributed
  xp_earned INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  creator_reward_sent BOOLEAN DEFAULT FALSE,
  
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(quest_id, completer_fid) -- Can't complete same quest twice
);

-- Creator earnings (track creator economy)
CREATE TABLE quest_creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES unified_quests(id),
  creator_fid BIGINT NOT NULL,
  
  -- Earnings
  total_xp_earned INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  
  -- Viral bonuses
  viral_bonus_xp INTEGER DEFAULT 0,
  badges_earned TEXT[],
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_unified_quests_active ON unified_quests(active, created_at DESC);
CREATE INDEX idx_unified_quests_category ON unified_quests(category, type);
CREATE INDEX idx_unified_quests_creator ON unified_quests(creator_fid);
CREATE INDEX idx_quest_completions_fid ON quest_completions(completer_fid);
CREATE INDEX idx_quest_completions_quest ON quest_completions(quest_id);
CREATE INDEX idx_quest_creator_earnings_fid ON quest_creator_earnings(creator_fid);
```

**TypeScript Types**:
```typescript
// types/unified-quest.ts
export type QuestCategory = 'onchain' | 'social'

export type OnChainQuestType = 
  | 'token_hold' 
  | 'nft_own' 
  | 'transaction_make' 
  | 'multichain_gm' 
  | 'contract_interact'
  | 'liquidity_provide'

export type SocialQuestType = 
  | 'follow_user' 
  | 'like_cast' 
  | 'recast_cast' 
  | 'reply_cast' 
  | 'join_channel' 
  | 'cast_mention' 
  | 'cast_hashtag'

export type QuestType = OnChainQuestType | SocialQuestType

export interface UnifiedQuest {
  id: string
  creator_fid: number
  category: QuestCategory
  type: QuestType
  title: string
  description: string
  verification_data: OnChainVerificationData | SocialVerificationData
  xp_reward: number
  point_reward: number
  badge_reward?: string
  creation_cost: number
  creator_earn_pct: number
  total_completions: number
  max_completions?: number
  completion_rate: number
  avg_completion_time?: string
  viral_bonus_earned: boolean
  active: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}

// On-chain verification data structures
export interface OnChainVerificationData {
  chain: GMChainKey
  token_address?: string
  min_amount?: string
  nft_address?: string
  contract_address?: string
  function_signature?: string
  multi_chain_count?: number
}

// Social verification data structures  
export interface SocialVerificationData {
  target_fid?: number
  target_cast_hash?: string
  target_channel?: string
  required_text?: string
}

export interface QuestCreationTier {
  cost: number
  max_reward_xp: number
  max_reward_points: number
  creator_earn_pct: number
  label: string
  description: string
}

export const QUEST_CREATION_TIERS: Record<string, QuestCreationTier> = {
  basic: {
    cost: 100,
    max_reward_xp: 50,
    max_reward_points: 25,
    creator_earn_pct: 10,
    label: 'Basic Quest',
    description: 'Perfect for simple challenges'
  },
  standard: {
    cost: 250,
    max_reward_xp: 150,
    max_reward_points: 75,
    creator_earn_pct: 15,
    label: 'Standard Quest',
    description: 'Balanced rewards'
  },
  premium: {
    cost: 500,
    max_reward_xp: 300,
    max_reward_points: 150,
    creator_earn_pct: 20,
    label: 'Premium Quest',
    description: 'High-value challenges'
  }
}

// On-chain quests cost +50pts more (RPC fees)
export const ON_CHAIN_COST_MODIFIER = 50
```

**Deliverables**:
- `types/unified-quest.ts` - TypeScript types for both categories
- Supabase migration via MCP (3 tables + 6 indexes)
- `lib/quest-economy.ts` - Quest tier calculations
- `lib/quest-types.ts` - Quest type constants & helpers

---

### Task 2: Unified Quest Marketplace UI Components (6-7 hours)

**Objective**: Build unified marketplace with Tailwick v2.0 UI supporting both on-chain + social quests

**Components to Build**:

**1. QuestMarketplace.tsx** (Container - 2h)
```tsx
// NEW: app/app/quests/page.tsx
import { QuestDiscovery, MyQuests, CreateQuestModal } from '@/components/quests'

export default function QuestMarketplacePage() {
  const { fid, isAuthenticated } = useUnifiedFarcasterAuth()
  const [view, setView] = useState<'discover' | 'my-quests' | 'create'>('discover')
  
  if (!isAuthenticated) {
    return <FarcasterSignIn message="Sign in to discover quests!" />
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tab navigation */}
      <div className="flex gap-4 mb-8">
        <Button 
          variant={view === 'discover' ? 'primary' : 'secondary'}
          onClick={() => setView('discover')}
        >
          Discover Quests
        </Button>
        <Button 
          variant={view === 'my-quests' ? 'primary' : 'secondary'}
          onClick={() => setView('my-quests')}
        >
          My Quests
        </Button>
        <Button 
          variant="success"
          onClick={() => setView('create')}
        >
          + Create Quest
        </Button>
      </div>
      
      {/* Dynamic view rendering */}
      {view === 'discover' && <QuestDiscovery fid={fid} />}
      {view === 'my-quests' && <MyQuests fid={fid} />}
      {view === 'create' && <CreateQuestModal fid={fid} onClose={() => setView('discover')} />}
    </div>
  )
}
```

**2. QuestDiscovery.tsx** (Browse all quests with category filter - 2h)
```tsx
// NEW: components/quests/QuestDiscovery.tsx
export function QuestDiscovery({ fid }: { fid: number }) {
  const [quests, setQuests] = useState<UnifiedQuest[]>([])
  const [filters, setFilters] = useState({ 
    category: 'all',  // 'all' | 'onchain' | 'social'
    type: 'all', 
    sort: 'popular' 
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchQuests(filters).then(setQuests).finally(() => setLoading(false))
  }, [filters])
  
  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={filters.category === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(f => ({ ...f, category: 'all', type: 'all' }))}
        >
          All Quests
        </Button>
        <Button 
          variant={filters.category === 'onchain' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(f => ({ ...f, category: 'onchain', type: 'all' }))}
        >
          ⛓️ On-Chain
        </Button>
        <Button 
          variant={filters.category === 'social' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilters(f => ({ ...f, category: 'social', type: 'all' }))}
        >
          💬 Social
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="all">All Types</option>
          {filters.category === 'all' && (
            <>
              <optgroup label="On-Chain">
                <option value="token_hold">Token Hold</option>
                <option value="nft_own">NFT Own</option>
                <option value="multichain_gm">Multi-Chain GM</option>
              </optgroup>
              <optgroup label="Social">
                <option value="follow_user">Follow</option>
                <option value="like_cast">Like</option>
                <option value="recast_cast">Recast</option>
              </optgroup>
            </>
          )}
          {filters.category === 'onchain' && (
            <>
              <option value="token_hold">Token Hold</option>
              <option value="nft_own">NFT Own</option>
              <option value="transaction_make">Transaction</option>
              <option value="multichain_gm">Multi-Chain GM</option>
            </>
          )}
          {filters.category === 'social' && (
            <>
              <option value="follow_user">Follow</option>
              <option value="like_cast">Like</option>
              <option value="recast_cast">Recast</option>
              <option value="reply_cast">Reply</option>
            </>
          )}
        </Select>
        
        <Select value={filters.sort} onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}>
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
          <option value="rewarding">Highest Rewards</option>
        </Select>
      </div>
      
      {/* Quest grid */}
      {loading ? (
        <QuestGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map(quest => (
            <QuestCard key={quest.id} quest={quest} fid={fid} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**3. QuestCard.tsx** (Individual quest display - 1.5h)
```tsx
// NEW: components/quests/QuestCard.tsx
export function QuestCard({ quest, fid }: { quest: UnifiedQuest; fid: number }) {
  const [completing, setCompleting] = useState(false)
  
  // Get category icon
  const categoryIcon = quest.category === 'onchain' ? '⛓️' : '💬'
  const categoryLabel = quest.category === 'onchain' ? 'On-Chain' : 'Social'
  
  async function startQuest() {
    setCompleting(true)
    const result = await completeQuest(quest.id, fid, quest.category)
    if (result.success) {
      toast.success(`Quest complete! +${quest.xp_reward} XP`)
    } else {
      toast.error(result.error)
    }
    setCompleting(false)
  }
  
  return (
    <Card gradient="purple" hoverable>
      <CardBody>
        {/* Category + Type badges */}
        <div className="flex gap-2 mb-2">
          <Badge variant={quest.category === 'onchain' ? 'info' : 'purple'}>
            {categoryIcon} {categoryLabel}
          </Badge>
          <Badge variant={getQuestTypeColor(quest.type)}>
            {formatQuestType(quest.type)}
          </Badge>
        </div>
        
        {/* Creator info */}
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={getProfileImage(quest.creator_fid)} size="sm" />
          <span className="text-sm theme-text-secondary">
            by @{getUsername(quest.creator_fid)}
          </span>
        </div>
        
        {/* Quest details */}
        <CardTitle className="mt-4">{quest.title}</CardTitle>
        <p className="text-sm theme-text-secondary mt-2 line-clamp-2">{quest.description}</p>
        
        {/* On-chain specific info */}
        {quest.category === 'onchain' && (
          <div className="mt-2 text-sm theme-text-secondary">
            <span className="inline-flex items-center gap-1">
              📍 {getChainLabel(quest.verification_data.chain)}
            </span>
          </div>
        )}
        
        {/* Rewards */}
        <div className="flex gap-2 mt-4">
          <Badge variant="xp">+{quest.xp_reward} XP</Badge>
          <Badge variant="points">+{quest.point_reward} pts</Badge>
        </div>
        
        {/* Popularity metrics */}
        <div className="flex items-center gap-4 mt-4 text-sm theme-text-secondary">
          <span>🔥 {quest.total_completions} completed</span>
          <span>⭐ {quest.completion_rate}% rate</span>
        </div>
        
        {/* Action button */}
        <Button 
          variant="primary" 
          className="mt-4 w-full"
          onClick={startQuest}
          loading={completing}
        >
          Start Quest
        </Button>
      </CardBody>
    </Card>
  )
}
```

**4. MyQuests.tsx** (User's created/completed quests - 1h)
```tsx
// NEW: components/quests/MyQuests.tsx
export function MyQuests({ fid }: { fid: number }) {
  const [tab, setTab] = useState<'created' | 'completed'>('created')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'onchain' | 'social'>('all')
  const [createdQuests, setCreatedQuests] = useState<UnifiedQuest[]>([])
  const [completedQuests, setCompletedQuests] = useState<UnifiedQuest[]>([])
  
  useEffect(() => {
    if (tab === 'created') {
      fetchCreatedQuests(fid, categoryFilter).then(setCreatedQuests)
    } else {
      fetchCompletedQuests(fid, categoryFilter).then(setCompletedQuests)
    }
  }, [tab, categoryFilter, fid])
  
  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-4 mb-6">
        <Button 
          variant={tab === 'created' ? 'primary' : 'secondary'}
          onClick={() => setTab('created')}
        >
          Created by Me
        </Button>
        <Button 
          variant={tab === 'completed' ? 'primary' : 'secondary'}
          onClick={() => setTab('completed')}
        >
          Completed by Me
        </Button>
      </div>
      
      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        <Button 
          size="sm"
          variant={categoryFilter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setCategoryFilter('all')}
        >
          All
        </Button>
        <Button 
          size="sm"
          variant={categoryFilter === 'onchain' ? 'primary' : 'secondary'}
          onClick={() => setCategoryFilter('onchain')}
        >
          ⛓️ On-Chain
        </Button>
        <Button 
          size="sm"
          variant={categoryFilter === 'social' ? 'primary' : 'secondary'}
          onClick={() => setCategoryFilter('social')}
        >
          💬 Social
        </Button>
      </div>
      
      {tab === 'created' && (
        <div>
          {/* Creator earnings summary */}
          <CreatorEarningsSummary fid={fid} categoryFilter={categoryFilter} />
          
          {/* Created quests grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {createdQuests.map(quest => (
              <CreatorQuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        </div>
      )}
      
      {tab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedQuests.map(quest => (
            <CompletedQuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Deliverables**:
- 4 new components in `components/quests/`
- `app/app/quests/page.tsx` - Unified marketplace page
- Tailwick Card, Badge, Button patterns
- Dynamic category filtering (on-chain / social)
- Responsive grid layout

---

### Task 3: Quest Creation Form & Validation (3-4 hours)

**Objective**: Build quest creation form with points cost validation

**Component**: CreateQuestModal.tsx
```tsx
// NEW: components/social-quests/CreateQuestModal.tsx
export function CreateQuestModal({ fid, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<QuestFormData>({
    type: 'follow_user',
    title: '',
    description: '',
    verification_data: {},
    reward_tier: 'basic'
  })
  const [creating, setCreating] = useState(false)
  
  const selectedTier = QUEST_CREATION_TIERS[formData.reward_tier]
  const userPoints = useUserPoints(fid) // Hook to get user's current points
  const canAfford = userPoints >= selectedTier.cost
  
  async function createQuest() {
    if (!canAfford) {
      toast.error(`Need ${selectedTier.cost} points to create this quest`)
      return
    }
    
    setCreating(true)
    const result = await submitQuest(fid, formData)
    if (result.success) {
      toast.success(`Quest created! Spent ${selectedTier.cost} points`)
      onClose()
    } else {
      toast.error(result.error)
    }
    setCreating(false)
  }
  
  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader>Create Social Quest</ModalHeader>
      <ModalBody>
        {/* Step 1: Choose quest type */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">What type of quest?</h3>
            <div className="grid grid-cols-2 gap-4">
              {SOCIAL_QUEST_TYPES.map(type => (
                <Card 
                  key={type.id}
                  hoverable
                  className={formData.type === type.id ? 'border-primary-500' : ''}
                  onClick={() => setFormData(f => ({ ...f, type: type.id }))}
                >
                  <CardBody>
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <h4 className="font-semibold">{type.label}</h4>
                    <p className="text-sm theme-text-secondary">{type.description}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
            <Button variant="primary" onClick={() => setStep(2)} className="mt-6">
              Next
            </Button>
          </div>
        )}
        
        {/* Step 2: Quest details */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Quest Details</h3>
            <div className="space-y-4">
              <Input
                label="Quest Title"
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Follow me for exclusive content!"
                maxLength={100}
              />
              
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell users why they should complete this quest..."
                maxLength={500}
                rows={4}
              />
              
              {/* Dynamic verification data based on quest type */}
              <QuestVerificationInput 
                type={formData.type}
                value={formData.verification_data}
                onChange={(data) => setFormData(f => ({ ...f, verification_data: data }))}
              />
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Rewards & cost */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose Reward Tier</h3>
            <div className="space-y-4">
              {Object.entries(QUEST_CREATION_TIERS).map(([tier, config]) => (
                <Card 
                  key={tier}
                  hoverable
                  className={formData.reward_tier === tier ? 'border-primary-500' : ''}
                  onClick={() => setFormData(f => ({ ...f, reward_tier: tier }))}
                >
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold capitalize">{tier}</h4>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="xp">Up to {config.max_reward_xp} XP</Badge>
                          <Badge variant="points">Up to {config.max_reward_points} pts</Badge>
                        </div>
                        <p className="text-sm theme-text-secondary mt-2">
                          You earn {config.creator_earn_pct}% of completions
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{config.cost}</div>
                        <div className="text-sm theme-text-secondary">points</div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
            
            {/* User balance */}
            <div className="mt-6 p-4 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span>Your balance:</span>
                <span className="font-semibold">{userPoints} points</span>
              </div>
              {!canAfford && (
                <p className="text-sm text-red-500 mt-2">
                  Not enough points! Need {selectedTier.cost - userPoints} more.
                </p>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                variant="success" 
                onClick={createQuest}
                loading={creating}
                disabled={!canAfford}
              >
                Create Quest (-{selectedTier.cost} pts)
              </Button>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
```

**Validation Rules**:
```typescript
// lib/social-quest-validation.ts
export async function validateQuestCreation(
  fid: number,
  formData: QuestFormData
): Promise<ValidationResult> {
  const errors: string[] = []
  
  // Check user points
  const userPoints = await getUserPoints(fid)
  const tier = QUEST_CREATION_TIERS[formData.reward_tier]
  if (userPoints < tier.cost) {
    errors.push(`Insufficient points. Need ${tier.cost}, have ${userPoints}`)
  }
  
  // Validate title/description
  if (formData.title.length < 10) errors.push('Title too short (min 10 chars)')
  if (formData.description.length < 20) errors.push('Description too short (min 20 chars)')
  
  // Validate verification data based on type
  if (formData.type === 'follow_user' && !formData.verification_data.target_fid) {
    errors.push('Must specify target user FID')
  }
  if (formData.type === 'like_cast' && !formData.verification_data.target_cast_hash) {
    errors.push('Must specify target cast hash')
  }
  
  // Anti-spam: Check user's recent quest creations
  const recentQuests = await getUserRecentQuests(fid, 24 * 60 * 60 * 1000) // Last 24h
  if (recentQuests.length >= 10) {
    errors.push('Quest creation limit reached (10 per day)')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

**Deliverables**:
- `components/social-quests/CreateQuestModal.tsx`
- `components/social-quests/QuestVerificationInput.tsx` (dynamic input based on quest type)
- `lib/social-quest-validation.ts` - Validation rules
- Anti-spam protection

---

### Task 4: Social Quest API Routes (4-5 hours)

**Objective**: Build 5 API routes for quest creation, discovery, verification, completion, and user quest management.

#### 4.1 Create Quest API

**POST `/api/quests/social/create`** - Create new social quest (spend points)

```tsx
// app/api/quests/social/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QUEST_CREATION_TIERS } from '@/lib/social-quest-tiers'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { fid, quest_data } = await req.json()
  
  // Get user's current points
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('points')
    .eq('fid', fid)
    .single()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Get tier cost
  const tier = QUEST_CREATION_TIERS[quest_data.reward_tier]
  if (!tier) {
    return NextResponse.json({ error: 'Invalid reward tier' }, { status: 400 })
  }
  
  // Check points balance
  if (user.points < tier.cost) {
    return NextResponse.json({ 
      error: 'Insufficient points',
      required: tier.cost,
      available: user.points
    }, { status: 400 })
  }
  
  // Anti-spam: Check daily creation limit
  const { data: recentQuests } = await supabase
    .from('social_quests')
    .select('id')
    .eq('creator_fid', fid)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  if (recentQuests && recentQuests.length >= 10) {
    return NextResponse.json({ 
      error: 'Daily quest creation limit reached (10 per day)'
    }, { status: 429 })
  }
  
  // Create quest & deduct points in transaction
  const { data: quest, error: questError } = await supabase
    .from('social_quests')
    .insert({
      creator_fid: fid,
      type: quest_data.type,
      title: quest_data.title,
      description: quest_data.description,
      verification_data: quest_data.verification_data, // JSONB - dynamic
      xp_reward: tier.max_xp_reward,
      point_reward: tier.max_point_reward,
      reward_tier: quest_data.reward_tier,
      creator_earn_percentage: tier.creator_earn_percentage,
      status: 'active',
      total_completions: 0
    })
    .select()
    .single()
  
  if (questError) {
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 })
  }
  
  // Deduct points
  await supabase
    .from('users')
    .update({ points: user.points - tier.cost })
    .eq('fid', fid)
  
  return NextResponse.json({ quest }, { status: 201 })
}
```

#### 4.2 List Quests API

**GET `/api/quests/social`** - List social quests with dynamic filters

```tsx
// app/api/quests/social/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const searchParams = req.nextUrl.searchParams
  
  // Dynamic filters (no hardcoded structure)
  const type = searchParams.get('type')
  const sort = searchParams.get('sort') || 'created_at'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  
  let query = supabase
    .from('social_quests')
    .select('*')
    .eq('status', 'active')
  
  // Apply dynamic type filter
  if (type && type !== 'all') {
    query = query.eq('type', type)
  }
  
  // Apply sorting
  if (sort === 'popular') {
    query = query.order('total_completions', { ascending: false })
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'rewards') {
    query = query.order('xp_reward', { ascending: false })
  }
  
  // Pagination
  query = query.range(offset, offset + limit - 1)
  
  const { data: quests, error } = await query
  
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 })
  }
  
  return NextResponse.json({ quests }, { status: 200 })
}
```

#### 4.3 Verify Quest Completion API

**POST `/api/quests/social/verify`** - Verify quest completion via Neynar

```tsx
// app/api/quests/social/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySocialQuestCompletion } from '@/lib/neynar-quest-verifier'

export async function POST(req: NextRequest) {
  const { fid, quest_id, quest_type, verification_data } = await req.json()
  
  try {
    // Verify using Neynar API
    const isVerified = await verifySocialQuestCompletion(
      fid,
      quest_type,
      verification_data
    )
    
    return NextResponse.json({ 
      verified: isVerified,
      quest_id 
    }, { status: 200 })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ 
      error: 'Verification failed',
      verified: false
    }, { status: 500 })
  }
}
```

#### 4.4 Complete Quest API

**POST `/api/quests/social/complete`** - Complete quest, claim rewards, pay creator

```tsx
// app/api/quests/social/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { fid, quest_id } = await req.json()
  
  // Check if already completed
  const { data: existing } = await supabase
    .from('social_quest_completions')
    .select('id')
    .eq('fid', fid)
    .eq('quest_id', quest_id)
    .single()
  
  if (existing) {
    return NextResponse.json({ error: 'Quest already completed' }, { status: 400 })
  }
  
  // Get quest details
  const { data: quest } = await supabase
    .from('social_quests')
    .select('*')
    .eq('id', quest_id)
    .single()
  
  if (!quest) {
    return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
  }
  
  // Record completion
  await supabase
    .from('social_quest_completions')
    .insert({
      fid,
      quest_id,
      completed_at: new Date().toISOString()
    })
  
  // Award XP + points to user
  await supabase.rpc('increment_user_xp', { user_fid: fid, amount: quest.xp_reward })
  await supabase.rpc('increment_user_points', { user_fid: fid, amount: quest.point_reward })
  
  // Pay creator (10-20% of rewards)
  const creatorEarning = Math.floor(quest.point_reward * (quest.creator_earn_percentage / 100))
  await supabase.rpc('increment_user_points', { 
    user_fid: quest.creator_fid, 
    amount: creatorEarning 
  })
  
  // Record creator earnings
  await supabase
    .from('quest_creator_earnings')
    .insert({
      creator_fid: quest.creator_fid,
      quest_id,
      completer_fid: fid,
      points_earned: creatorEarning,
      earned_at: new Date().toISOString()
    })
  
  // Increment quest completion count
  await supabase
    .from('social_quests')
    .update({ 
      total_completions: quest.total_completions + 1 
    })
    .eq('id', quest_id)
  
  // Check for viral bonuses (50 XP at 10 completions)
  if (quest.total_completions + 1 === 10) {
    await supabase.rpc('increment_user_xp', { 
      user_fid: quest.creator_fid, 
      amount: 50 
    })
  }
  
  return NextResponse.json({ 
    success: true,
    xp_earned: quest.xp_reward,
    points_earned: quest.point_reward
  }, { status: 200 })
}
```

#### 4.5 My Quests API

**GET `/api/quests/social/my`** - Get user's created + completed quests

```tsx
// app/api/quests/social/my/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const searchParams = req.nextUrl.searchParams
  const fid = searchParams.get('fid')
  const view = searchParams.get('view') || 'created' // 'created' or 'completed'
  
  if (!fid) {
    return NextResponse.json({ error: 'FID required' }, { status: 400 })
  }
  
  if (view === 'created') {
    // Get quests created by user
    const { data: quests, error } = await supabase
      .from('social_quests')
      .select('*, quest_creator_earnings(points_earned)')
      .eq('creator_fid', fid)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch created quests' }, { status: 500 })
    }
    
    // Calculate total earnings
    const totalEarnings = quests.reduce((sum, quest) => {
      const earnings = quest.quest_creator_earnings?.reduce((s: number, e: any) => s + e.points_earned, 0) || 0
      return sum + earnings
    }, 0)
    
    return NextResponse.json({ quests, totalEarnings }, { status: 200 })
  } else {
    // Get quests completed by user
    const { data: completions, error } = await supabase
      .from('social_quest_completions')
      .select('*, social_quests(*)')
      .eq('fid', fid)
      .order('completed_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch completed quests' }, { status: 500 })
    }
    
    return NextResponse.json({ completions }, { status: 200 })
  }
}
```

#### 4.6 Neynar Verification Helper

```tsx
// lib/neynar-quest-verifier.ts
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY!)

// Cache verification results for 2 minutes
const verificationCache = new Map<string, { result: boolean; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export async function verifySocialQuestCompletion(
  fid: number,
  questType: string,
  verificationData: any
): Promise<boolean> {
  const cacheKey = `${fid}-${questType}-${JSON.stringify(verificationData)}`
  
  // Check cache
  const cached = verificationCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }
  
  let result = false
  
  try {
    switch (questType) {
      case 'follow_user':
        result = await verifyFollow(fid, verificationData.target_fid)
        break
      case 'like_cast':
        result = await verifyLike(fid, verificationData.target_cast_hash)
        break
      case 'recast_cast':
        result = await verifyRecast(fid, verificationData.target_cast_hash)
        break
      case 'reply_cast':
        result = await verifyReply(fid, verificationData.target_cast_hash)
        break
      case 'join_channel':
        result = await verifyChannelMembership(fid, verificationData.channel_id)
        break
      case 'cast_mention':
        result = await verifyCastMention(fid, verificationData.mention_fid)
        break
      case 'cast_hashtag':
        result = await verifyCastHashtag(fid, verificationData.hashtag)
        break
      default:
        result = false
    }
    
    // Cache result
    verificationCache.set(cacheKey, { result, timestamp: Date.now() })
    
    return result
  } catch (error) {
    console.error('Neynar verification error:', error)
    return false
  }
}

async function verifyFollow(fid: number, targetFid: number): Promise<boolean> {
  const response = await neynarClient.fetchBulkUsers([fid])
  const user = response.users[0]
  return user.viewer_context?.following || false
}

async function verifyLike(fid: number, castHash: string): Promise<boolean> {
  const reactions = await neynarClient.fetchCastReactions(castHash, { limit: 100 })
  return reactions.reactions.some(r => r.user.fid === fid && r.reaction_type === 'like')
}

async function verifyRecast(fid: number, castHash: string): Promise<boolean> {
  const reactions = await neynarClient.fetchCastReactions(castHash, { limit: 100 })
  return reactions.reactions.some(r => r.user.fid === fid && r.reaction_type === 'recast')
}

async function verifyReply(fid: number, castHash: string): Promise<boolean> {
  const cast = await neynarClient.lookUpCastByHashOrWarpcastUrl(castHash, 'hash')
  const replies = cast.cast.direct_replies || []
  return replies.some(r => r.author.fid === fid)
}

async function verifyChannelMembership(fid: number, channelId: string): Promise<boolean> {
  const user = await neynarClient.fetchBulkUsers([fid])
  const channels = user.users[0].viewer_context?.following_channels || []
  return channels.some(c => c.id === channelId)
}

async function verifyCastMention(fid: number, mentionFid: number): Promise<boolean> {
  const casts = await neynarClient.fetchCastsForUser(fid, { limit: 25 })
  return casts.casts.some(cast => 
    cast.mentioned_profiles?.some(p => p.fid === mentionFid)
  )
}

async function verifyCastHashtag(fid: number, hashtag: string): Promise<boolean> {
  const casts = await neynarClient.fetchCastsForUser(fid, { limit: 25 })
  return casts.casts.some(cast => 
    cast.text.toLowerCase().includes(`#${hashtag.toLowerCase()}`)
  )
}
```

**Deliverables**:
- `app/api/quests/social/create/route.ts`
- `app/api/quests/social/route.ts`
- `app/api/quests/social/verify/route.ts`
- `app/api/quests/social/complete/route.ts`
- `app/api/quests/social/my/route.ts`
- `lib/neynar-quest-verifier.ts`
- Points deduction/earning logic
- Creator economy payment flow

---

### Task 5: Neynar Verification Integration (3-4 hours)

**Objective**: Integrate Neynar API for real-time Farcaster action verification with caching and error handling.

**Implementation** (see Task 4.6 above):
- NeynarQuestVerifier class with 7 verification methods
- 2-minute caching to reduce API calls
- Error handling with fallback
- Rate limit protection

**Testing Checklist**:
- [ ] All 7 quest types verify correctly
- [ ] Cache reduces duplicate API calls
- [ ] Error handling graceful (doesn't break flow)
- [ ] Rate limits respected

**Deliverables**:
- `lib/neynar-quest-verifier.ts` (already shown in Task 4.6)
- Caching layer
- Error handling

---

### Task 6: Creator Economy & Viral Rewards (2-3 hours)

**Objective**: Implement creator earnings distribution and viral bonus milestones.

#### 6.1 Creator Earnings Distribution

Already implemented in Task 4.4 (`/api/quests/social/complete`):
- 10-20% of quest rewards go to creator
- Earnings tracked in `quest_creator_earnings` table
- Real-time payment on quest completion

#### 6.2 Viral Bonus System

**Bonus Milestones**:
- **10 completions**: 50 XP bonus to creator
- **50 completions**: Quest Master badge + 200 XP bonus
- **100 completions**: Viral Quest badge + 500 XP bonus

```tsx
// lib/viral-rewards.ts
import { createClient } from '@/lib/supabase/server'

export async function checkViralBonuses(questId: string, creatorFid: number, totalCompletions: number) {
  const supabase = createClient()
  
  // 10 completion bonus
  if (totalCompletions === 10) {
    await supabase.rpc('increment_user_xp', { 
      user_fid: creatorFid, 
      amount: 50 
    })
    console.log(`🎉 Quest ${questId} hit 10 completions! +50 XP bonus`)
  }
  
  // 50 completion bonus (Quest Master badge)
  if (totalCompletions === 50) {
    await supabase.rpc('increment_user_xp', { 
      user_fid: creatorFid, 
      amount: 200 
    })
    await supabase.from('user_badges').insert({
      fid: creatorFid,
      badge_id: 'quest_master',
      earned_at: new Date().toISOString()
    })
    console.log(`🏆 Quest ${questId} hit 50 completions! Quest Master badge earned`)
  }
  
  // 100 completion bonus (Viral Quest badge)
  if (totalCompletions === 100) {
    await supabase.rpc('increment_user_xp', { 
      user_fid: creatorFid, 
      amount: 500 
    })
    await supabase.from('user_badges').insert({
      fid: creatorFid,
      badge_id: 'viral_quest',
      earned_at: new Date().toISOString()
    })
    console.log(`🚀 Quest ${questId} hit 100 completions! Viral Quest badge earned`)
  }
}
```

**Anti-Spam Protection**:
- Max 10 quest creations per day per user
- Duplicate quest detection (same title + type within 7 days)
- Minimum 100 XP balance to create quests

**Deliverables**:
- `lib/viral-rewards.ts`
- Badge integration for quest milestones
- Anti-spam validation

---

## 🎨 UI/UX Standards (Tailwick v2.0 + Gmeowbased v0.1)

### Social Quest Card Design

**Tailwick Card Component Pattern**:
```tsx
<Card 
  hoverable
  className="social-quest-card transition-all duration-300"
>
  <CardBody>
    {/* Quest type badge */}
    <Badge variant="purple" className="mb-3">
      {questTypeLabels[quest.type]}
    </Badge>
    
    {/* Creator info */}
    <div className="flex items-center gap-2 mb-2">
      <Avatar src={creator.pfp_url} size="sm" />
      <span className="text-sm text-gray-600">by @{creator.username}</span>
    </div>
    
    {/* Quest title & description */}
    <h3 className="text-lg font-semibold mb-2">{quest.title}</h3>
    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{quest.description}</p>
    
    {/* Rewards */}
    <div className="flex gap-2 mb-4">
      <Badge variant="success">+{quest.xp_reward} XP</Badge>
      <Badge variant="info">+{quest.point_reward} pts</Badge>
    </div>
    
    {/* Stats */}
    <div className="flex justify-between text-sm text-gray-500 mb-3">
      <span>{quest.total_completions} completions</span>
      <span>{quest.reward_tier} tier</span>
    </div>
    
    {/* Action button */}
    <Button variant="primary" fullWidth>
      Start Quest
    </Button>
  </CardBody>
</Card>
```

### Quest Type Icons (Gmeowbased v0.1)

**Icon Mapping** (from `assets/gmeow-icons/`):
- `follow_user` → `user-plus.svg`
- `like_cast` → `heart.svg`
- `recast_cast` → `repeat.svg`
- `reply_cast` → `message-circle.svg`
- `join_channel` → `hash.svg`
- `cast_mention` → `at-sign.svg`
- `cast_hashtag` → `tag.svg`

**Usage**:
```tsx
import { QuestIcon } from '@/components/ui/quest-icon'

<QuestIcon type={quest.type} className="w-5 h-5" />
```

### Color Palette for Quest Types

```tsx
const questTypeColors = {
  follow_user: 'purple',
  like_cast: 'red',
  recast_cast: 'green',
  reply_cast: 'blue',
  join_channel: 'orange',
  cast_mention: 'teal',
  cast_hashtag: 'pink'
}
```

### Loading States

```tsx
// Quest card skeleton
<Card>
  <CardBody>
    <Skeleton className="h-6 w-20 mb-3" />
    <Skeleton className="h-8 w-32 mb-2" />
    <Skeleton className="h-4 w-full mb-4" />
    <div className="flex gap-2 mb-4">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
    <Skeleton className="h-10 w-full" />
  </CardBody>
</Card>
```

### Empty States

```tsx
// No quests found
<div className="text-center py-12">
  <img 
    src="/assets/gmeow-illustrations/empty-quests.svg" 
    alt="No quests"
    className="w-48 h-48 mx-auto mb-4"
  />
  <h3 className="text-xl font-semibold mb-2">No quests yet</h3>
  <p className="text-gray-600 mb-4">
    Be the first to create a social quest!
  </p>
  <Button onClick={openCreateModal}>Create Quest</Button>
</div>
```

---

## 🔐 Authentication & Authorization

**Use Phase 12 Unified Auth**:
```tsx
import { useUnifiedFarcasterAuth } from '@/hooks/useUnifiedFarcasterAuth'

export function SocialQuestMarketplace() {
  const { fid, isAuthenticated } = useUnifiedFarcasterAuth()
  
  if (!isAuthenticated) {
    return <FarcasterSignIn message="Sign in to discover social quests" />
  }
  
  return <QuestMarketplace fid={fid} />
}
```

**Permission Checks**:
```tsx
// Check if user can create quest (100 XP minimum)
const canCreateQuest = user.xp >= 100 && user.points >= QUEST_CREATION_TIERS.basic.cost

// Check if user already completed quest
const hasCompleted = await checkQuestCompletion(fid, questId)
```

---

## 📊 Success Metrics

**Phase 13 Complete When**:
- ✅ Social quest marketplace fully functional
- ✅ All 7 quest types working (follow, like, recast, reply, join, mention, hashtag)
- ✅ Neynar verification accurate for all types
- ✅ Quest creation wizard working (3 steps)
- ✅ Points economy working (creation cost, creator earnings)
- ✅ Viral bonuses triggering (10, 50, 100 completions)
- ✅ UI matches Tailwick v2.0 patterns
- ✅ Dynamic quest data (NO hardcoded structure)
- ✅ Anti-spam protection working
- ✅ TypeScript: 0 new errors
- ✅ Documentation updated

**Testing Checklist**:
- [ ] Quest marketplace displays with 3 tabs
- [ ] Quest discovery grid loads correctly
- [ ] Filters work (type, sort)
- [ ] Quest cards display all info correctly
- [ ] Create quest modal opens
- [ ] 3-step wizard navigation works
- [ ] Points balance check prevents creation if insufficient
- [ ] Quest creation deducts points
- [ ] Quest verification works for all 7 types
- [ ] Quest completion awards XP + points
- [ ] Creator earns 10-20% of rewards
- [ ] Viral bonuses trigger at milestones
- [ ] Anti-spam limits enforced (10 per day)
- [ ] My Quests shows created + completed
- [ ] Creator earnings summary accurate
- [ ] Mobile responsive (320px - 1920px)
- [ ] Theme switching works (light/dark)
- [ ] Loading states display correctly
- [ ] Error messages user-friendly

**Performance Benchmarks**:
- Quest list load: < 500ms
- Quest creation: < 1s
- Quest verification: < 2s (with caching)
- Quest completion: < 1s

**Performance Benchmarks**:
- Quest list load: < 500ms
- Quest creation: < 1s
- Quest verification: < 2s (with caching)
- Quest completion: < 1s

---

## 🚀 Quick Start

**Development Setup**:

1. **Database Setup** (Task 1):
   ```bash
   # Create 3 Supabase tables via MCP
   supabase migration new social_quests
   # Copy schema from Task 1.1
   supabase db push
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install @neynar/nodejs-sdk
   ```

3. **Environment Variables**:
   ```env
   NEYNAR_API_KEY=your_api_key_here
   ```

4. **Development Flow**:
   - Start with Task 0 (Old Foundation Audit) - 2h
   - Run Tasks 1-2 in parallel (Data Models + UI) - 9-10h
   - Build Task 3 (Creation Form) - 3-4h
   - Build Task 4 (API Routes) - 4-5h
   - Integrate Task 5 (Neynar) - 3-4h
   - Implement Task 6 (Creator Economy) - 2-3h

5. **Testing Locally**:
   ```bash
   pnpm dev
   # Navigate to /app/quests
   # Test quest creation wizard
   # Test quest completion flow
   # Test creator earnings
   ```

6. **Deployment**:
   ```bash
   # Deploy to Railway
   railway up
   
   # Verify Supabase migrations
   supabase db push --linked
   ```

---

## 📦 Deliverables

**New Files** (~18 files):

```
components/social-quests/
├── QuestMarketplace.tsx          # Main container (3 tabs)
├── QuestDiscovery.tsx            # Discovery grid with filters
├── QuestCard.tsx                 # Quest card component
├── MyQuests.tsx                  # Created/completed views
├── CreateQuestModal.tsx          # 3-step wizard
├── QuestVerificationInput.tsx    # Dynamic input
└── CreatorEarningsSummary.tsx    # Earnings widget

lib/
├── social-quest-types.ts         # TypeScript types
├── social-quest-tiers.ts         # Creation tiers
├── social-quest-validation.ts    # Validation rules
├── neynar-quest-verifier.ts      # Neynar integration
└── viral-rewards.ts              # Bonus system

app/api/quests/social/
├── create/route.ts               # Create quest API
├── route.ts                      # List quests API
├── verify/route.ts               # Verify completion API
├── complete/route.ts             # Complete quest API
└── my/route.ts                   # User's quests API

Docs/Maintenance/Template-Migration/Nov-2025/Phase-12-Active/
├── OLD-FOUNDATION-SOCIAL-QUEST-AUDIT.md
├── PHASE-13-PROGRESS-REPORT.md
└── PHASE-13-COMPLETION-SUMMARY.md
```

**Updated Files**:
- `types/supabase.ts` - Add social quest types
- `CHANGELOG.md` - Phase 13 entry

**Database Migrations**:
- `social_quests` table
- `social_quest_completions` table
- `quest_creator_earnings` table
- 5 indexes for performance

---

## ⚠️ Constraints

**MUST FOLLOW**:
- ✅ Dynamic quest structure (NO hardcoded - use JSONB `verification_data`)
- ✅ User-generated content (users create quests, not admin)
- ✅ Points-based economy (spend to create, earn from completions)
- ✅ Farcaster-native quest types (follow, like, recast, etc.)
- ✅ Neynar API for real-time verification
- ✅ Tailwick v2.0 + Gmeowbased v0.1 for UI
- ✅ Reuse old foundation APIs where possible
- ✅ Keep frame API untouched (still working)
- ✅ Use Phase 12 unified auth system
- ✅ MCP Supabase for database operations
- ✅ Document in Nov-2025 folder

**FORBIDDEN**:
- ❌ Hardcoded quest structure (users hate it!)
- ❌ Using old foundation pixel art UI
- ❌ Admin-only quest creation
- ❌ Breaking existing frame API
- ❌ Creating stubbed/dummy code

---

## 🔮 Future Enhancements (Phase 14+)

**After Phase 13**:
- [ ] Quest chains (sequential multi-quest challenges)
- [ ] Guild collaborative quests (team completions)
- [ ] Quest leaderboards (fastest completers)
- [ ] Quest boosting (spend points to increase visibility)
- [ ] Quest expiration (time-limited quests)
- [ ] Quest reporting (flag inappropriate quests)
- [ ] Advanced analytics (completion rates, popular quest types)
- [ ] Quest templates (pre-filled quest creation)
- [ ] Quest bundles (complete 5 quests for bonus)

---

**Phase 13 Status**: 🚀 READY TO START  
**Est. Completion**: 23-28 hours (~4 days)  
**Next Phase**: Phase 14 - Guild Features  

**Let's build the Social Quest Marketplace! 🚀**
