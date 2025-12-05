# NEW QUEST SYSTEM COMPLETE BREAKDOWN

**Date**: December 4, 2025  
**Status**: 🔍 **ARCHITECTURE ANALYSIS COMPLETE**  
**Purpose**: Explain how new Supabase-based quest system works vs old on-chain system

---

## ✅ QUEST SYSTEM CLARIFIED: Only NEW Supabase System Active

**Important**: Old on-chain verification API has been **DELETED** to prevent confusion.

### System 1: OLD On-Chain System (DELETED) ❌ **REMOVED**
- **Route**: `/api/quests/verify` - ❌ **DELETED** (was 1890 lines, deprecated)
- **Storage**: Smart contracts on Base mainnet (no longer used for quests)
- **Contract**: `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92` (GmeowCore) - **NOT USED FOR QUESTS**
- **Pattern**: Quest created on-chain → Oracle verifies → User claims with signature
- **Status**: ❌ **REMOVED** (confusing, broken, replaced by NEW system)
- **Note**: Contract still exists for legacy NFT/Guild features, but **NOT for quests**

### System 2: NEW Supabase System (Current) ✅ **IN USE**
- **Routes**: `/api/quests`, `/api/quests/[slug]`, `/api/quests/[slug]/progress`
- **Storage**: PostgreSQL via Supabase (table: `unified_quests`)
- **Verification**: Backend validates, updates database directly
- **Pattern**: Quest stored in DB → Backend verifies → Updates progress → Awards XP
- **Status**: ✅ **Working** (5/8 tests passing, 6 quests seeded)
- **Reference**: Build during Foundation Rebuild Phase 2.7

---

## 📊 DATABASE SCHEMA ANALYSIS

### Core Quest Tables

#### 1. `unified_quests` (Main Quest Registry)
```sql
CREATE TABLE unified_quests (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('onchain', 'social')),
  type TEXT NOT NULL,  -- 'follow_user', 'mint_nft', 'swap_token', etc.
  
  -- Creator Info
  creator_fid BIGINT NOT NULL,
  creator_address TEXT NOT NULL,
  
  -- Rewards
  reward_points BIGINT DEFAULT 0,
  reward_mode TEXT DEFAULT 'points' CHECK (reward_mode IN ('points', 'token', 'nft')),
  reward_token_address TEXT,
  reward_token_amount NUMERIC,
  reward_nft_address TEXT,
  
  -- Quest Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
  max_completions BIGINT,
  expiry_date TIMESTAMPTZ,
  
  -- Verification
  verification_data JSONB DEFAULT '{}',  -- Quest-specific requirements
  
  -- UI/UX
  cover_image_url TEXT,
  badge_image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  
  -- Multi-step quests
  tasks JSONB DEFAULT '[]',  -- [{"id": 1, "title": "...", "type": "...", "status": "pending"}]
  
  -- Viral mechanics
  min_viral_xp_required BIGINT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  featured_order INTEGER,
  
  -- Stats
  participant_count BIGINT DEFAULT 0,
  total_completions BIGINT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `user_quest_progress` (Progress Tracking)
```sql
CREATE TABLE user_quest_progress (
  id BIGSERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  quest_id BIGINT REFERENCES unified_quests(id),
  
  -- Multi-step progress
  current_task_index INTEGER DEFAULT 0,
  completed_tasks INTEGER[] DEFAULT '{}',
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

#### 3. `task_completions` (Individual Task Records)
```sql
CREATE TABLE task_completions (
  id BIGSERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  quest_id BIGINT REFERENCES unified_quests(id),
  task_index INTEGER NOT NULL,
  verification_proof JSONB DEFAULT '{}',  -- Proof of completion
  verified_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `quest_completions` (Final Quest Completion)
```sql
CREATE TABLE quest_completions (
  id BIGSERIAL PRIMARY KEY,
  quest_id BIGINT REFERENCES unified_quests(id),
  completer_fid BIGINT NOT NULL,
  completer_address TEXT NOT NULL,
  verification_proof JSONB DEFAULT '{}',
  points_awarded BIGINT DEFAULT 0,
  token_awarded NUMERIC,
  nft_awarded_token_id NUMERIC,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 HOW THE NEW SYSTEM WORKS

### Part 1: Quest Creation Flow

**Step 1: User Creates Quest**
```typescript
// User fills form on /quests/create page
POST /api/quests/create
{
  title: "Follow @gmeowbased on Farcaster",
  description: "Join our community",
  category: "social",
  type: "follow_user",
  verification_data: {
    target_fid: 1069798,  // @gmeow bot FID
    target_username: "gmeow"
  },
  reward_points: 50,
  difficulty: "beginner"
}
```

**Step 2: Backend Validates & Creates**
```typescript
// File: app/api/quests/create/route.ts (not shown, but pattern)
export async function POST(request: Request) {
  // 1. Validate request with Zod schema
  const body = await request.json();
  const validated = QuestCreateSchema.parse(body);
  
  // 2. Insert into database
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('unified_quests')
    .insert({
      title: validated.title,
      description: validated.description,
      category: validated.category,
      type: validated.type,
      creator_fid: validated.creator_fid,
      creator_address: validated.creator_address,
      reward_points: validated.reward_points,
      verification_data: validated.verification_data,
      status: 'active',
      tasks: validated.tasks || [],  // Multi-step tasks (optional)
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  // 3. Return quest ID
  return NextResponse.json({ success: true, quest: data });
}
```

**Step 3: Quest Stored in Database**
```sql
-- Quest now exists in unified_quests table
SELECT * FROM unified_quests WHERE id = 2;

-- Result:
{
  "id": 2,
  "title": "Follow @gmeowbased on Farcaster",
  "category": "social",
  "type": "follow_user",
  "verification_data": {"target_fid": 1069798, "target_username": "gmeow"},
  "reward_points": 50,
  "status": "active",
  "tasks": []  -- Empty for single-step quest
}
```

---

### Part 2: User Discovers Quest

**Step 1: User Browses Quests**
```typescript
// File: app/quests/page.tsx
GET /api/quests?category=social

// Returns 6 quests from database:
{
  "success": true,
  "data": [
    {
      "id": 2,
      "title": "Follow @gmeowbased on Farcaster",
      "category": "social",
      "type": "follow_user",
      "reward_points": 50,
      "difficulty": "beginner",
      "status": "active"
    },
    // ... more quests
  ]
}
```

**Step 2: User Clicks Quest Card**
```typescript
// Navigates to /quests/2
GET /api/quests/2?userFid=18139

// Backend checks user progress:
const supabase = getSupabaseServerClient();

// Fetch quest
const quest = await supabase
  .from('unified_quests')
  .select('*')
  .eq('id', 2)
  .single();

// Fetch user progress
const progress = await supabase
  .from('user_quest_progress')
  .select('*')
  .eq('user_fid', 18139)
  .eq('quest_id', 2)
  .single();

// Returns:
{
  "success": true,
  "data": {
    ...quest,
    "user_progress": {
      "status": "not_started",  // or "in_progress", "completed"
      "current_task_index": 0,
      "progress_percentage": 0
    },
    "is_locked": false,  // Check if user has min_viral_xp_required
    "is_completed": false
  }
}
```

---

### Part 3: Verification Flow (The Core)

#### 3.1 Social Quest Verification (Farcaster)

**Example: User Clicks "Verify" on "Follow @gmeowbased" Quest**

```typescript
// File: components/quests/QuestVerification.tsx
const handleVerify = async () => {
  const response = await fetch(`/api/quests/2/progress`, {
    method: 'POST',
    body: JSON.stringify({
      userFid: 18139,
      walletAddress: '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e'
    })
  });
};
```

**Backend Verification Process**:
```typescript
// File: app/api/quests/[slug]/progress/route.ts
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const { userFid, walletAddress } = await request.json();
  const questId = parseInt(params.slug);  // "2"
  
  // 1. Fetch quest from database
  const supabase = getSupabaseServerClient();
  const quest = await supabase
    .from('unified_quests')
    .select('*')
    .eq('id', questId)
    .single();
  
  // 2. Route to verification orchestrator
  const result = await verifyQuest({
    userFid,
    userAddress: walletAddress,
    questId,
  });
  
  return NextResponse.json(result);
}
```

**Verification Orchestrator**:
```typescript
// File: lib/quests/verification-orchestrator.ts
export async function verifyQuest(request: QuestVerificationRequest) {
  // 1. Fetch quest details
  const questWithProgress = await getQuestWithProgress(request.questId, request.userFid);
  
  if (questWithProgress.category === 'social') {
    // 2. Call Farcaster verification
    const socialData: SocialVerificationData = {
      userFid: request.userFid,
      questType: questWithProgress.type,  // 'follow_user'
      verificationData: questWithProgress.verification_data,  // {"target_fid": 1069798}
    };
    
    const result = await verifySocialQuest(socialData);
    
    if (result.verified) {
      // 3. Update database
      await completeQuestTask({
        userFid: request.userFid,
        questId: request.questId,
        taskIndex: 0,
        verificationProof: result.proof,
      });
      
      return {
        success: true,
        message: 'Quest completed!',
        quest_completed: true,
        task_completed: true,
        rewards: {
          xp_earned: questWithProgress.reward_points,
          points_earned: questWithProgress.reward_points,
        },
      };
    }
  }
  
  return {
    success: false,
    message: 'Verification failed',
    quest_completed: false,
    task_completed: false,
  };
}
```

**Farcaster Verification Logic**:
```typescript
// File: lib/quests/farcaster-verification.ts
export async function verifySocialQuest(data: SocialVerificationData): Promise<SocialVerificationResult> {
  const { userFid, questType, verificationData } = data;
  
  if (questType === 'follow_user') {
    // Call Neynar API to check if user follows target
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/${userFid}/following`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!,
        },
      }
    );
    
    const following = await response.json();
    const targetFid = verificationData.target_fid;  // 1069798
    
    const isFollowing = following.users.some((user: any) => user.fid === targetFid);
    
    if (isFollowing) {
      return {
        verified: true,
        proof: {
          type: 'follow_user',
          target_fid: targetFid,
          verified_at: new Date().toISOString(),
          source: 'neynar_api',
        },
      };
    }
    
    return {
      verified: false,
      error: `User ${userFid} does not follow FID ${targetFid}`,
    };
  }
  
  if (questType === 'like_cast') {
    // Check if user liked specific cast
    const castHash = verificationData.cast_hash;
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast/${castHash}/reactions`,
      {
        headers: { 'api_key': process.env.NEYNAR_API_KEY! },
      }
    );
    
    const reactions = await response.json();
    const hasLiked = reactions.likes.some((like: any) => like.fid === userFid);
    
    return {
      verified: hasLiked,
      proof: hasLiked ? {
        type: 'like_cast',
        cast_hash: castHash,
        verified_at: new Date().toISOString(),
      } : undefined,
      error: hasLiked ? undefined : `User ${userFid} has not liked cast ${castHash}`,
    };
  }
  
  // ... similar logic for recast, reply, create_cast_with_tag
}
```

#### 3.2 On-Chain Quest Verification

**Example: User Clicks "Verify" on "Mint Your First Base NFT" Quest**

```typescript
// Same frontend call, but backend routes to on-chain verification
export async function verifyQuest(request: QuestVerificationRequest) {
  const questWithProgress = await getQuestWithProgress(request.questId, request.userFid);
  
  if (questWithProgress.category === 'onchain') {
    // Call on-chain verification
    const onchainData: OnChainVerificationData = {
      userAddress: request.userAddress!,
      questType: questWithProgress.type,  // 'mint_nft'
      verificationData: questWithProgress.verification_data,  // {"nft_contract": "0xD99a..."}
    };
    
    const result = await verifyOnChainQuest(onchainData);
    
    if (result.verified) {
      await completeQuestTask({
        userFid: request.userFid,
        questId: request.questId,
        taskIndex: 0,
        verificationProof: result.proof,
      });
      
      return {
        success: true,
        message: 'Quest completed!',
        quest_completed: true,
        task_completed: true,
        rewards: {
          xp_earned: questWithProgress.reward_points,
        },
      };
    }
  }
}
```

**On-Chain Verification Logic**:
```typescript
// File: lib/quests/onchain-verification.ts
import { createPublicClient, http, erc721Abi } from 'viem';
import { base } from 'viem/chains';

export async function verifyOnChainQuest(data: OnChainVerificationData): Promise<OnChainResult> {
  const { userAddress, questType, verificationData } = data;
  
  if (questType === 'mint_nft' || questType === 'hold_erc721') {
    // Check NFT balance via RPC
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_BASE || 'https://mainnet.base.org'),
    });
    
    const nftContract = verificationData.nft_contract as `0x${string}`;
    const balance = await client.readContract({
      address: nftContract,
      abi: erc721Abi,
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    const minBalance = verificationData.min_balance || 1;
    const hasNFT = Number(balance) >= minBalance;
    
    if (hasNFT) {
      return {
        verified: true,
        proof: {
          type: 'mint_nft',
          contract: nftContract,
          balance: Number(balance),
          verified_at: new Date().toISOString(),
          chain: 'base',
        },
      };
    }
    
    return {
      verified: false,
      error: `User ${userAddress} does not own ${minBalance} NFT(s) from ${nftContract}`,
    };
  }
  
  if (questType === 'swap_token') {
    // ⚠️ NOT IMPLEMENTED YET
    // Would check token balance change or DEX events
    return {
      verified: false,
      error: 'Token swap verification not yet implemented (Phase 7)',
    };
  }
  
  if (questType === 'provide_liquidity') {
    // ⚠️ NOT IMPLEMENTED YET
    // Would check LP token balance
    return {
      verified: false,
      error: 'Liquidity verification not yet implemented (Phase 7)',
    };
  }
}
```

---

### Part 4: Database Updates After Verification

**Step 1: Mark Task as Complete**
```sql
-- Insert task completion record
INSERT INTO task_completions (user_fid, quest_id, task_index, verification_proof, verified_at)
VALUES (18139, 2, 0, '{"type": "follow_user", "target_fid": 1069798, ...}', NOW());
```

**Step 2: Update User Progress**
```sql
-- Update or insert user progress
INSERT INTO user_quest_progress (user_fid, quest_id, current_task_index, completed_tasks, status, progress_percentage)
VALUES (18139, 2, 1, ARRAY[0], 'completed', 100)
ON CONFLICT (user_fid, quest_id)
DO UPDATE SET
  current_task_index = 1,
  completed_tasks = ARRAY[0],
  status = 'completed',
  progress_percentage = 100,
  completed_at = NOW();
```

**Step 3: Record Final Completion**
```sql
-- Insert quest completion record
INSERT INTO quest_completions (quest_id, completer_fid, completer_address, points_awarded, completed_at)
VALUES (2, 18139, '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e', 50, NOW());

-- Update quest stats
UPDATE unified_quests
SET 
  total_completions = total_completions + 1,
  participant_count = participant_count + 1
WHERE id = 2;
```

**Step 4: Award XP and Points to User**
```sql
-- Update user profile with both XP and Points
-- Points are the core currency for creating quests and minting badges
UPDATE user_profiles
SET 
  xp = xp + 50,           -- XP for progression/ranking
  points = points + 50,    -- Points = Gmeowbased currency (create quests, mint badges)
  updated_at = NOW()
WHERE fid = 18139;

-- Insert XP transaction record
INSERT INTO xp_transactions (fid, amount, source, created_at)
VALUES (18139, 50, 'quest_completion:2', NOW());

-- Insert Points transaction record
INSERT INTO points_transactions (fid, amount, source, created_at)
VALUES (18139, 50, 'quest_completion:2', NOW());
```

---

## 🔍 ANTI-FRAUD MECHANISMS

### 1. Prevent Fake Data

**Problem**: User claims they liked a cast but didn't actually do it

**Solution**: Backend calls Neynar API to verify
```typescript
// ❌ BAD: Trust client data
if (userData.hasLiked) {
  awardXP(userFid, 50);
}

// ✅ GOOD: Verify with Neynar
const reactions = await neynar.getCastReactions(castHash);
const actuallyLiked = reactions.likes.some(like => like.fid === userFid);

if (actuallyLiked) {
  awardXP(userFid, 50);
} else {
  return { error: 'Verification failed: Cast not liked' };
}
```

### 2. Prevent Double Claims

**Problem**: User tries to complete same quest multiple times

**Solution**: Database unique constraint + status check
```typescript
// Check if quest already completed
const existingCompletion = await supabase
  .from('quest_completions')
  .select('id')
  .eq('quest_id', questId)
  .eq('completer_fid', userFid)
  .single();

if (existingCompletion) {
  return { error: 'Quest already completed' };
}

// Check user progress status
const progress = await supabase
  .from('user_quest_progress')
  .select('status')
  .eq('quest_id', questId)
  .eq('user_fid', userFid)
  .single();

if (progress?.status === 'completed') {
  return { error: 'Quest already completed' };
}
```

### 3. Verify Wallet Ownership

**Problem**: User claims wrong wallet address

**Solution**: Check Farcaster verified addresses
```typescript
// Fetch user profile from Neynar
const userProfile = await neynar.getUserByFid(userFid);
const verifiedAddresses = userProfile.verified_addresses.eth_addresses || [];

// Check if claimed address is verified
if (!verifiedAddresses.includes(walletAddress.toLowerCase())) {
  return { 
    error: 'Wallet not verified on Farcaster',
    hint: 'Add this wallet to your Farcaster profile first'
  };
}
```

### 4. Rate Limiting

**Problem**: Spam verification requests

**Solution**: Rate limit per user + IP
```typescript
// File: lib/rate-limit.ts
const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 requests per minute
  prefix: 'quest_verify',
});

// Check rate limit
const result = await rateLimiter.limit(`verify:${userFid}`);
if (!result.success) {
  return { 
    error: 'Rate limit exceeded',
    retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
  };
}
```

---

## 🎯 MULTI-STEP QUEST FLOW

**Example: "Complete Your First Base Transaction" (2 tasks)**

**Quest Structure in Database**:
```json
{
  "id": 1,
  "title": "Complete Your First Base Transaction",
  "category": "onchain",
  "tasks": [
    {
      "id": 1,
      "title": "Connect Wallet",
      "description": "Connect your wallet to Base network",
      "type": "custom",
      "status": "pending"
    },
    {
      "id": 2,
      "title": "Send Transaction",
      "description": "Complete a transaction on Base",
      "type": "custom",
      "status": "pending"
    }
  ]
}
```

**User Progress Flow**:

1. **Start Quest** → Status: `in_progress`, Task Index: 0
2. **Complete Task 1** → Update: `completed_tasks: [0]`, `current_task_index: 1`
3. **Complete Task 2** → Update: `completed_tasks: [0, 1]`, `status: completed`, `progress_percentage: 100`

**Verification Code**:
```typescript
export async function verifyQuest(request: QuestVerificationRequest) {
  const tasks = questWithProgress.tasks || [];
  const taskIndex = request.taskIndex ?? questWithProgress.user_progress?.current_task_index ?? 0;
  const currentTask = tasks[taskIndex];
  
  // Verify current task
  const result = await verifyTask(currentTask, request);
  
  if (result.verified) {
    // Mark task complete
    await completeQuestTask({
      userFid: request.userFid,
      questId: request.questId,
      taskIndex,
      verificationProof: result.proof,
    });
    
    // Check if all tasks complete
    const allTasksComplete = taskIndex === tasks.length - 1;
    
    if (allTasksComplete) {
      // Award final quest rewards
      return {
        success: true,
        message: 'Quest completed!',
        quest_completed: true,
        task_completed: true,
        rewards: {
          xp_earned: questWithProgress.reward_points,
        },
      };
    } else {
      // Move to next task
      return {
        success: true,
        message: `Task ${taskIndex + 1} completed! Next: ${tasks[taskIndex + 1].title}`,
        quest_completed: false,
        task_completed: true,
        next_task_index: taskIndex + 1,
      };
    }
  }
}
```

---

## 📋 COMPARISON: OLD vs NEW SYSTEM

| Feature | OLD (On-Chain) | NEW (Supabase) |
|---------|----------------|----------------|
| **Storage** | Smart contracts | PostgreSQL database |
| **Quest Creation** | Call contract function | Insert into `unified_quests` |
| **Verification** | Oracle signs → User claims | Backend verifies → Updates DB |
| **Data Source** | Contract `readQuestStatus()` | Query `unified_quests` table |
| **User Progress** | Contract storage | `user_quest_progress` table |
| **Proof Storage** | On-chain event logs | `task_completions` table |
| **Rewards** | Contract transfer | Update `user_profiles.xp` |
| **Cost** | Gas fees required | Free (database writes) |
| **Speed** | 1-2 block confirmations (~2-4s) | Instant (<100ms) |
| **Flexibility** | Immutable (once deployed) | Easily update quests |
| **Status** | ❌ Broken (empty data) | ✅ Working (6 quests seeded) |

---

## 🔧 CONTRACT ADDRESSES (Current Config)

From `lib/gmeow-utils.ts`:
```typescript
export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
  base: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',  // GmeowCore (OLD, not used for quests)
};

export const STANDALONE_ADDRESSES = {
  base: {
    core: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',    // OLD quest contract (broken)
    guild: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',   // Guild contract
    nft: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',     // NFT contract (used for badge rewards)
    proxy: '0x6A48B758ed42d7c934D387164E60aa58A92eD206',   // Proxy contract
  },
};
```

**⚠️ IMPORTANT**: 
- `GmeowCore` contract (`0x9BDD...`) is **NOT used** for new quest system
- New quests are **stored in Supabase**, not on-chain
- Contracts are only used for:
  - NFT minting rewards (`0xD99a...`)
  - Guild membership (`0x9674...`)
  - Future: Token rewards, on-chain proof verification

---

## 🚀 NEXT STEPS TO FIX

### Issue 1: Wrong Contract Reference ❌

**Current**:
```typescript
// Mock data still references old NFT contract
nft_reward_contract: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',
```

**Fix**:
- This is correct for NFT rewards
- Remove references to `GmeowCore` for quest verification
- Update any code that tries to read quests from contract

### Issue 2: Missing Slug Field ⚠️

**Current**: Routes expect `/api/quests/[slug]` but data has numeric IDs

**Fix**:
```sql
-- Add slug column
ALTER TABLE unified_quests ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs
UPDATE unified_quests 
SET slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'));

-- Update routes to accept both
export async function GET(request, { params }) {
  const identifier = params.slug;
  const questId = parseInt(identifier);
  const quest = isNaN(questId)
    ? await getQuestBySlug(identifier)
    : await getQuestById(questId);
}
```

### Issue 3: Verification Data Validation ⚠️

**Current**: No strict validation on `verification_data` JSON

**Fix**:
```typescript
// Define schemas for each quest type
const FollowUserSchema = z.object({
  target_fid: z.number().int().min(1),
  target_username: z.string().optional(),
});

const MintNFTSchema = z.object({
  nft_contract: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  min_balance: z.number().int().min(1).default(1),
});

// Validate before storing
const verificationData = FollowUserSchema.parse(quest.verification_data);
```

---

## ✅ VERIFICATION CHECKLIST

### For Social Quests (Farcaster):
- [ ] User must have Farcaster account (FID required)
- [ ] Backend calls Neynar API to verify action
- [ ] Supported types:
  - [ ] `follow_user` - Check following list
  - [ ] `like_cast` - Check cast reactions
  - [ ] `recast` - Check recast activity
  - [ ] `reply_to_cast` - Check cast replies
  - [ ] `create_cast_with_tag` - Check user casts for tag

### For On-Chain Quests:
- [ ] User must have wallet connected
- [ ] Wallet must be verified on Farcaster
- [ ] Backend calls RPC to check on-chain data
- [ ] Supported types:
  - [ ] `mint_nft` / `hold_erc721` - Check NFT balance
  - [ ] `hold_erc20` - Check token balance
  - [ ] ⏳ `swap_token` - NOT IMPLEMENTED (Phase 7)
  - [ ] ⏳ `provide_liquidity` - NOT IMPLEMENTED (Phase 7)

### Anti-Fraud Checks:
- [ ] Verify data with external API (Neynar, RPC)
- [ ] Check if quest already completed (prevent double claims)
- [ ] Verify wallet ownership (Farcaster verified addresses)
- [ ] Rate limit verification requests (10 per minute)
- [ ] Validate all input data with Zod schemas

---

## 📚 KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `lib/supabase/queries/quests.ts` | Database queries (getActiveQuests, getQuestById) |
| `lib/quests/verification-orchestrator.ts` | Main verification coordinator |
| `lib/quests/farcaster-verification.ts` | Social quest verification (Neynar API) |
| `lib/quests/onchain-verification.ts` | On-chain quest verification (RPC calls) |
| `app/api/quests/route.ts` | List quests API |
| `app/api/quests/[slug]/route.ts` | Quest details API |
| `app/api/quests/[slug]/progress/route.ts` | Quest verification API |
| `components/quests/QuestVerification.tsx` | Frontend verification UI |

---

**Status**: 🟢 ANALYSIS COMPLETE  
**Summary**: New quest system uses **Supabase database**, not on-chain contracts. Old contract system is broken and not used. Verification happens via backend API calls (Neynar for social, RPC for on-chain), then updates database directly.
