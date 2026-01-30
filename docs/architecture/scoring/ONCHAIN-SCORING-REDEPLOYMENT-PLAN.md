# On-Chain Scoring System - Complete Redeployment Plan

**Date**: December 31, 2025  
**Goal**: Migrate XP, Level, Rank, and Multiplier calculations from off-chain to on-chain  
**Pattern**: Use existing `unified-calculator.ts` logic, implement in Solidity

---

## Executive Summary

### Current System (Off-Chain)
- ✅ **Working**: All calculations in `lib/scoring/unified-calculator.ts`
- ✅ **Complete**: Level, Rank, Multiplier, Viral XP fully implemented
- ✅ **Tested**: Active in production (viral stats, leaderboard APIs)
- ❌ **Issue**: All calculations happen in JavaScript, not on blockchain

### Target System (On-Chain)
- ✅ **Immutable**: Calculations enforced by smart contract
- ✅ **Trustless**: Users can verify their level/rank/multiplier
- ✅ **Composable**: Other contracts can read user stats
- ✅ **Efficient**: Gas-optimized for frequent updates

---

## Current Calculation System Analysis

### 1. **Level Progression** (Quadratic Formula)

**Current Implementation**: `lib/scoring/unified-calculator.ts` lines 422-470

```typescript
// Formula: 300 + (level-1) × 200 XP per level
const LEVEL_XP_BASE = 300
const LEVEL_XP_INCREMENT = 200

function getXpForLevel(level: number): number {
  return LEVEL_XP_BASE + (level - 1) * LEVEL_XP_INCREMENT
}

function getTotalXpToReachLevel(level: number): number {
  const n = level - 1
  const a = LEVEL_XP_INCREMENT / 2
  const b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  return a * n * n + b * n
}

// Quadratic solver to find level from points
calculateLevelProgress(points) {
  const a = 100 // LEVEL_XP_INCREMENT / 2
  const b = 200 // (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2
  const c = -points
  const discriminant = b² - 4ac
  const level = (-b + √discriminant) / (2a)
  return Math.floor(level) + 1
}
```

**Used in**:
- `/api/viral/stats` - User profile level display
- `/api/viral/leaderboard` - Leaderboard level column
- `/test-xp-celebration` - Level up animations

**Gas Cost**: ~5,000 gas (quadratic formula with sqrt)

---

### 2. **Rank Tier System** (12 Tiers)

**Current Implementation**: `lib/scoring/unified-calculator.ts` lines 231-353

```typescript
const IMPROVED_RANK_TIERS = [
  { name: 'Signal Kitten', minPoints: 0, maxPoints: 500, tier: 'beginner' },
  { name: 'Warp Scout', minPoints: 500, maxPoints: 1500, tier: 'beginner' },
  { name: 'Beacon Runner', minPoints: 1500, maxPoints: 4000, tier: 'beginner', reward: { multiplier: 1.1 } },
  { name: 'Night Operator', minPoints: 4000, maxPoints: 8000, tier: 'intermediate' },
  { name: 'Star Captain', minPoints: 8000, maxPoints: 15000, tier: 'intermediate', reward: { multiplier: 1.2 } },
  { name: 'Nebula Commander', minPoints: 15000, maxPoints: 25000, tier: 'intermediate' },
  { name: 'Quantum Navigator', minPoints: 25000, maxPoints: 40000, tier: 'advanced', reward: { multiplier: 1.3 } },
  { name: 'Cosmic Architect', minPoints: 40000, maxPoints: 60000, tier: 'advanced' },
  { name: 'Void Walker', minPoints: 60000, maxPoints: 100000, tier: 'advanced', reward: { multiplier: 1.5 } },
  { name: 'Singularity Prime', minPoints: 100000, maxPoints: 250000, tier: 'legendary' },
  { name: 'Infinite GM', minPoints: 250000, maxPoints: 500000, tier: 'legendary', reward: { multiplier: 2.0 } },
  { name: 'Omniversal Being', minPoints: 500000, maxPoints: Infinity, tier: 'mythic' },
]

function getRankTierByPoints(points) {
  for (const tier of IMPROVED_RANK_TIERS) {
    if (points >= tier.minPoints && points < tier.maxPoints) {
      return tier
    }
  }
  return IMPROVED_RANK_TIERS[IMPROVED_RANK_TIERS.length - 1]
}
```

**Used in**:
- `/api/viral/stats` - User rank display
- `/api/viral/leaderboard` - Leaderboard rank column
- Profile pages - Rank badges

**Gas Cost**: ~3,000 gas (linear search through 12 tiers)

---

### 3. **Multiplier System** (Rank-Based)

**Current Implementation**: `lib/scoring/unified-calculator.ts` lines 549-569

```typescript
function applyRankMultiplier(baseXP: number, currentPoints: number): number {
  const currentTier = getRankTierByPoints(currentPoints)
  
  if (currentTier?.reward?.type === 'multiplier' && currentTier.reward.value) {
    return Math.floor(baseXP * currentTier.reward.value)
  }
  
  return Math.floor(baseXP)
}

// Multiplier values by tier:
// - Beacon Runner (1,500+): 1.1x (+10%)
// - Star Captain (8,000+): 1.2x (+20%)
// - Quantum Navigator (25,000+): 1.3x (+30%)
// - Void Walker (60,000+): 1.5x (+50%)
// - Infinite GM (250,000+): 2.0x (+100%)
```

**Used in**:
- Quest reward calculations
- GM reward bonuses
- Event reward multipliers

**Gas Cost**: ~2,000 gas (rank lookup + multiplication)

---

### 4. **Total Score Calculation** (3-Layer Architecture)

**Current Implementation**: `lib/scoring/unified-calculator.ts` lines 40-68

```typescript
// LAYER 1: Blockchain (Subsquid)
pointsBalance = User.pointsBalance  // GM rewards, quest claims

// LAYER 2: Off-Chain (Supabase)
viralPoints = SUM(badge_casts.viral_bonus_xp)
questPoints = SUM(user_quest_progress.points)
guildPoints = SUM(guild_activity.points)
referralPoints = SUM(referrals.points)

// LAYER 3: Application (Computed)
totalScore = pointsBalance + viralPoints + questPoints + guildPoints + referralPoints

// Then calculate:
level = calculateLevelProgress(totalScore)
rank = getRankTierByPoints(totalScore)
multiplier = applyRankMultiplier(baseXP, totalScore)
```

**Problem**: Only `pointsBalance` is on-chain. Everything else is off-chain and can't be used for multipliers in smart contract functions.

---

## Proposed On-Chain Implementation

### Contract Structure

```
contract/modules/ScoringModule.sol (NEW)
├── State Variables
│   ├── mapping(address => uint256) public userLevel
│   ├── mapping(address => uint8) public userRankTier
│   ├── mapping(address => uint256) public totalScore
│   └── RankTierConfig[12] public rankTiers
│
├── Internal Functions
│   ├── _calculateLevel(uint256 points) → uint256
│   ├── _getRankTier(uint256 points) → uint8
│   ├── _getMultiplier(uint8 tierIndex) → uint16
│   └── _updateUserStats(address user)
│
├── Public Functions
│   ├── getUserStats(address) → (level, tier, score)
│   ├── getLevelProgress(address) → (level, xpIntoLevel, xpForLevel)
│   └── getRankProgress(address) → (tier, pointsIntoTier, pointsToNext)
│
└── Admin Functions
    └── setRankTierConfig(uint8 index, RankTierConfig)
```

### 1. Level Calculation (Solidity)

```solidity
// File: contract/modules/ScoringModule.sol

uint256 constant LEVEL_XP_BASE = 300;
uint256 constant LEVEL_XP_INCREMENT = 200;

/**
 * @notice Calculate level from total points (quadratic formula)
 * @param points Total user score
 * @return level Current level (1-based)
 */
function _calculateLevel(uint256 points) internal pure returns (uint256 level) {
    if (points == 0) return 1;
    
    // Quadratic formula: level = (-b + sqrt(b² - 4ac)) / (2a)
    // where: a = 100, b = 200, c = -points
    uint256 a = LEVEL_XP_INCREMENT / 2;  // 100
    uint256 b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2;  // 200
    
    // Calculate discriminant: b² - 4ac
    uint256 discriminant = (b * b) + (4 * a * points);
    
    // Newton's method for sqrt (gas-efficient)
    uint256 sqrtDiscriminant = _sqrt(discriminant);
    
    // Solve quadratic
    uint256 rawLevel = (sqrtDiscriminant - b) / (2 * a);
    
    // Round down and add 1 (we're 1-indexed)
    return rawLevel + 1;
}

/**
 * @notice Gas-efficient square root using Newton's method
 * @param x Input value
 * @return y Square root of x
 */
function _sqrt(uint256 x) internal pure returns (uint256 y) {
    if (x == 0) return 0;
    
    uint256 z = (x + 1) / 2;
    y = x;
    
    while (z < y) {
        y = z;
        z = (x / z + z) / 2;
    }
}

/**
 * @notice Calculate XP required for a specific level
 * @param level Target level
 * @return xp XP needed
 */
function getXpForLevel(uint256 level) public pure returns (uint256 xp) {
    require(level >= 1, "Level must be >= 1");
    return LEVEL_XP_BASE + ((level - 1) * LEVEL_XP_INCREMENT);
}

/**
 * @notice Calculate total XP to reach a level
 * @param level Target level
 * @return totalXp Cumulative XP
 */
function getTotalXpToReachLevel(uint256 level) public pure returns (uint256 totalXp) {
    if (level <= 1) return 0;
    
    uint256 n = level - 1;
    uint256 a = LEVEL_XP_INCREMENT / 2;
    uint256 b = (2 * LEVEL_XP_BASE - LEVEL_XP_INCREMENT) / 2;
    
    return (a * n * n) + (b * n);
}
```

**Gas Cost**: ~8,000 gas (includes sqrt calculation)

---

### 2. Rank Tier System (Solidity)

```solidity
// File: contract/modules/ScoringModule.sol

struct RankTierConfig {
    uint256 minPoints;
    uint256 maxPoints;
    uint16 multiplier;  // In basis points (1000 = 1.0x, 1100 = 1.1x)
    bool hasMultiplier;
}

// 12-tier rank system (immutable thresholds)
RankTierConfig[12] public rankTiers;

constructor() {
    // Beginner tiers (0-4K)
    rankTiers[0] = RankTierConfig(0, 500, 1000, false);           // Signal Kitten
    rankTiers[1] = RankTierConfig(500, 1500, 1000, false);        // Warp Scout
    rankTiers[2] = RankTierConfig(1500, 4000, 1100, true);        // Beacon Runner: 1.1x
    
    // Intermediate tiers (4K-25K)
    rankTiers[3] = RankTierConfig(4000, 8000, 1000, false);       // Night Operator
    rankTiers[4] = RankTierConfig(8000, 15000, 1200, true);       // Star Captain: 1.2x
    rankTiers[5] = RankTierConfig(15000, 25000, 1000, false);     // Nebula Commander
    
    // Advanced tiers (25K-100K)
    rankTiers[6] = RankTierConfig(25000, 40000, 1300, true);      // Quantum Navigator: 1.3x
    rankTiers[7] = RankTierConfig(40000, 60000, 1000, false);     // Cosmic Architect
    rankTiers[8] = RankTierConfig(60000, 100000, 1500, true);     // Void Walker: 1.5x
    
    // Legendary tiers (100K+)
    rankTiers[9] = RankTierConfig(100000, 250000, 1000, false);   // Singularity Prime
    rankTiers[10] = RankTierConfig(250000, 500000, 2000, true);   // Infinite GM: 2.0x
    rankTiers[11] = RankTierConfig(500000, type(uint256).max, 1000, false);  // Omniversal Being
}

/**
 * @notice Get rank tier index from points
 * @param points Total user score
 * @return tierIndex Index (0-11)
 */
function _getRankTier(uint256 points) internal view returns (uint8 tierIndex) {
    for (uint8 i = 0; i < 12; i++) {
        if (points >= rankTiers[i].minPoints && points < rankTiers[i].maxPoints) {
            return i;
        }
    }
    return 11;  // Omniversal Being (500K+)
}

/**
 * @notice Get multiplier for a rank tier
 * @param tierIndex Tier index (0-11)
 * @return multiplier In basis points (1100 = 1.1x)
 */
function _getMultiplier(uint8 tierIndex) internal view returns (uint16 multiplier) {
    require(tierIndex < 12, "Invalid tier");
    
    RankTierConfig memory tier = rankTiers[tierIndex];
    return tier.hasMultiplier ? tier.multiplier : 1000;  // Default 1.0x
}

/**
 * @notice Apply rank multiplier to XP
 * @param baseXP Base XP amount
 * @param tierIndex User's rank tier
 * @return finalXP Multiplied XP
 */
function applyMultiplier(uint256 baseXP, uint8 tierIndex) public view returns (uint256 finalXP) {
    uint16 multiplier = _getMultiplier(tierIndex);
    return (baseXP * multiplier) / 1000;
}
```

**Gas Cost**: ~4,000 gas (linear search + multiplication)

---

### 3. Total Score Tracking (Solidity)

```solidity
// File: contract/modules/ScoringModule.sol

// User score state
mapping(address => uint256) public totalScore;
mapping(address => uint256) public userLevel;
mapping(address => uint8) public userRankTier;

// Score component tracking (for transparency)
mapping(address => uint256) public pointsBalance;      // From CoreModule
mapping(address => uint256) public viralPoints;        // Updated via oracle
mapping(address => uint256) public questPoints;        // From quest completions
mapping(address => uint256) public guildPoints;        // From guild rewards
mapping(address => uint256) public referralPoints;     // From referral system

/**
 * @notice Update user's total score and derived stats
 * @param user User address
 */
function _updateUserStats(address user) internal {
    // Calculate total score
    uint256 newScore = pointsBalance[user] + viralPoints[user] + 
                       questPoints[user] + guildPoints[user] + 
                       referralPoints[user];
    
    // Update total score
    totalScore[user] = newScore;
    
    // Recalculate level
    userLevel[user] = _calculateLevel(newScore);
    
    // Recalculate rank tier
    userRankTier[user] = _getRankTier(newScore);
    
    emit StatsUpdated(user, newScore, userLevel[user], userRankTier[user]);
}

/**
 * @notice Add points to user balance (called by CoreModule)
 * @param user User address
 * @param amount Points to add
 */
function addPoints(address user, uint256 amount) external onlyAuthorized {
    pointsBalance[user] += amount;
    _updateUserStats(user);
}

/**
 * @notice Set viral points (called by oracle after Farcaster engagement)
 * @param user User address
 * @param amount Total viral XP
 */
function setViralPoints(address user, uint256 amount) external onlyOracle {
    viralPoints[user] = amount;
    _updateUserStats(user);
}

/**
 * @notice Award quest points (called by quest completion)
 * @param user User address
 * @param amount Points earned
 */
function addQuestPoints(address user, uint256 amount) external onlyAuthorized {
    questPoints[user] += amount;
    _updateUserStats(user);
}
```

**Gas Cost**: ~15,000 gas (full stats recalculation)

---

### 4. Public Query Functions

```solidity
/**
 * @notice Get complete user stats
 * @param user User address
 * @return level Current level
 * @return tier Rank tier index (0-11)
 * @return score Total score
 * @return multiplier Current multiplier (basis points)
 */
function getUserStats(address user) external view returns (
    uint256 level,
    uint8 tier,
    uint256 score,
    uint16 multiplier
) {
    return (
        userLevel[user],
        userRankTier[user],
        totalScore[user],
        _getMultiplier(userRankTier[user])
    );
}

/**
 * @notice Get level progression details
 * @param user User address
 * @return level Current level
 * @return xpIntoLevel XP earned in current level
 * @return xpForLevel Total XP needed for this level
 * @return xpToNext XP needed for next level
 */
function getLevelProgress(address user) external view returns (
    uint256 level,
    uint256 xpIntoLevel,
    uint256 xpForLevel,
    uint256 xpToNext
) {
    uint256 score = totalScore[user];
    level = _calculateLevel(score);
    
    uint256 levelFloor = getTotalXpToReachLevel(level);
    uint256 nextLevelTarget = getTotalXpToReachLevel(level + 1);
    
    xpIntoLevel = score - levelFloor;
    xpForLevel = nextLevelTarget - levelFloor;
    xpToNext = nextLevelTarget - score;
    
    return (level, xpIntoLevel, xpForLevel, xpToNext);
}

/**
 * @notice Get rank progression details
 * @param user User address
 * @return tierIndex Current tier (0-11)
 * @return pointsIntoTier Points earned in current tier
 * @return pointsToNext Points to next tier
 * @return hasMultiplier Whether tier has multiplier
 */
function getRankProgress(address user) external view returns (
    uint8 tierIndex,
    uint256 pointsIntoTier,
    uint256 pointsToNext,
    bool hasMultiplier
) {
    uint256 score = totalScore[user];
    tierIndex = _getRankTier(score);
    
    RankTierConfig memory tier = rankTiers[tierIndex];
    pointsIntoTier = score - tier.minPoints;
    pointsToNext = tierIndex < 11 ? rankTiers[tierIndex + 1].minPoints - score : 0;
    hasMultiplier = tier.hasMultiplier;
    
    return (tierIndex, pointsIntoTier, pointsToNext, hasMultiplier);
}
```

**Gas Cost**: ~3,000 gas per query (read-only)

---

## Integration with Existing Contract

### Modified CoreModule.sol

```solidity
// File: contract/modules/CoreModule.sol

import "./ScoringModule.sol";

contract CoreModule is BaseModule {
    ScoringModule public scoringModule;
    
    constructor() {
        scoringModule = new ScoringModule();
    }
    
    /**
     * @notice Complete quest and award points (MODIFIED)
     * @dev Now applies rank multiplier before awarding
     */
    function completeQuest(
        uint256 questId,
        address user,
        uint256 fid,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // ... existing validation ...
        
        Quest storage q = quests[questId];
        uint256 basePoints = q.rewardPoints;
        
        // NEW: Apply rank multiplier
        uint8 userTier = scoringModule.userRankTier(user);
        uint256 multipliedPoints = scoringModule.applyMultiplier(basePoints, userTier);
        
        // Award multiplied points
        pointsBalance[user] += multipliedPoints;
        scoringModule.addPoints(user, multipliedPoints);
        
        emit QuestCompleted(questId, user, multipliedPoints, fid, address(0), 0);
    }
    
    /**
     * @notice Send GM (MODIFIED)
     * @dev Now applies rank multiplier on top of streak multiplier
     */
    function sendGM() external nonReentrant whenNotPaused {
        // ... existing streak calculation ...
        
        uint256 baseReward = gmRewardPoints;
        uint256 streakMultiplied = _computeGMReward(baseReward, gmStreak[msg.sender]);
        
        // NEW: Apply rank multiplier
        uint8 userTier = scoringModule.userRankTier(msg.sender);
        uint256 finalReward = scoringModule.applyMultiplier(streakMultiplied, userTier);
        
        // Award final points
        pointsBalance[msg.sender] += finalReward;
        scoringModule.addPoints(msg.sender, finalReward);
        
        emit GMSent(msg.sender, gmStreak[msg.sender], finalReward);
    }
}
```

---

## Redeployment Steps

### Phase 1: Contract Preparation (30 min)

1. **Create ScoringModule.sol**
   ```bash
   # Create new module
   touch contract/modules/ScoringModule.sol
   
   # Copy level/rank/multiplier logic from unified-calculator.ts
   # Translate TypeScript → Solidity
   ```

2. **Update CoreModule.sol**
   ```solidity
   // Add ScoringModule integration
   // Modify completeQuest() to use multipliers
   // Modify sendGM() to use multipliers
   ```

3. **Add Tests**
   ```bash
   # Create test file
   touch test/ScoringModule.t.sol
   
   # Test cases:
   # - Level calculation accuracy
   # - Rank tier boundaries
   # - Multiplier application
   # - Gas costs
   ```

4. **Run Local Tests**
   ```bash
   forge test --match-contract ScoringModuleTest -vvv
   ```

### Phase 2: Deployment Script (15 min)

1. **Create Deploy Script**
   ```bash
   touch scripts/deploy-with-scoring.sh
   ```

   ```bash
   #!/bin/bash
   # Deploy complete system with scoring module
   
   echo "🚀 Deploying GmeowCore with On-Chain Scoring"
   
   # 1. Build contracts
   forge build
   
   # 2. Deploy to Base Mainnet
   forge create contract/proxy/GmeowCore.sol:GmeowCore \
     --rpc-url $BASE_RPC \
     --private-key $ORACLE_PRIVATE_KEY \
     --verify \
     --etherscan-api-key $BASESCAN_API_KEY
   
   # 3. Save deployment info
   echo "NEW_CORE_ADDRESS=$DEPLOYED_ADDRESS" >> deployment.env
   
   # 4. Initialize scoring module
   cast send $DEPLOYED_ADDRESS \
     "initialize(address)" $ORACLE_ADDRESS \
     --rpc-url $BASE_RPC \
     --private-key $ORACLE_PRIVATE_KEY
   
   echo "✅ Deployment complete!"
   ```

2. **Test on Sepolia First**
   ```bash
   # Switch to testnet
   export BASE_RPC=https://sepolia.base.org
   
   # Deploy
   bash scripts/deploy-with-scoring.sh
   
   # Test queries
   cast call $DEPLOYED_ADDRESS "getUserStats(address)" $TEST_USER
   ```

### Phase 3: Frontend Updates (30 min)

1. **Update Contract ABI**
   ```bash
   # Generate new ABI
   forge inspect GmeowCore abi > abi/GmeowCore.json
   
   # Update imports
   # All files using GM_CONTRACT_ABI need to import new ABI
   ```

2. **Update API Routes**
   ```typescript
   // File: app/api/viral/stats/route.ts
   
   // BEFORE (off-chain):
   import { calculateLevelProgress, getRankTierByPoints } from '@/lib/scoring/unified-calculator'
   const levelData = calculateLevelProgress(totalScore)
   const rankTier = getRankTierByPoints(totalScore)
   
   // AFTER (on-chain):
   import { readContract } from 'viem'
   const [level, tier, score, multiplier] = await readContract({
     address: CORE_CONTRACT_ADDRESS,
     abi: GM_CONTRACT_ABI,
     functionName: 'getUserStats',
     args: [userAddress]
   })
   ```

3. **Update ENV Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_CORE_CONTRACT_ADDRESS=0x...  # New deployed address
   NEXT_PUBLIC_DEPLOY_BLOCK=12345678         # Block number for indexing
   ```

### Phase 4: Subsquid Indexer Updates (20 min)

1. **Update Indexer Config**
   ```typescript
   // File: gmeow-indexer/src/main.ts
   
   // Add new event handlers
   processor.addLog({
     address: [GMEOW_CORE_ADDRESS],
     topic0: [
       abi.events.StatsUpdated.topic,  // New event
       abi.events.LevelUp.topic,       // New event
       abi.events.RankUp.topic,        // New event
     ],
   })
   
   // Add level/rank/score tracking
   ctx.store.save(new User({
     address: user.toLowerCase(),
     totalScore: event.args.totalScore,
     level: event.args.level,
     rankTier: event.args.tierIndex,
     // ... existing fields
   }))
   ```

2. **Redeploy Indexer**
   ```bash
   cd gmeow-indexer
   
   # Update schema
   npm run build
   
   # Reset database (fresh start)
   npx sqd db drop
   npx sqd db create
   npx sqd db migrate
   
   # Restart indexer
   npx sqd run
   ```

### Phase 5: Verification & Testing (30 min)

1. **Contract Verification**
   ```bash
   # Verify on BaseScan
   forge verify-contract \
     --chain-id 8453 \
     --compiler-version v0.8.23 \
     --etherscan-api-key $BASESCAN_API_KEY \
     $DEPLOYED_ADDRESS \
     contract/proxy/GmeowCore.sol:GmeowCore
   ```

2. **Query Test**
   ```bash
   # Test level calculation
   cast call $DEPLOYED_ADDRESS \
     "getUserStats(address)" $TEST_USER \
     --rpc-url https://mainnet.base.org
   
   # Expected output: (level, tier, score, multiplier)
   # Example: (5, 2, 2100, 1100) = Level 5, Beacon Runner, 2100 points, 1.1x
   ```

3. **Frontend Test**
   ```bash
   # Start dev server
   pnpm dev
   
   # Test pages:
   # - http://localhost:3000/profile (should show on-chain level/rank)
   # - http://localhost:3000/leaderboard (should query contract)
   # - http://localhost:3000/quests (multipliers should apply)
   ```

4. **Integration Test**
   ```bash
   # Complete a quest
   # Check if multiplier was applied
   
   # Send GM
   # Check if both streak + rank multiplier applied
   
   # View profile
   # Verify level/rank match contract query
   ```

---

## Gas Cost Analysis

### Operation Costs

| Operation | Gas Cost | Frequency | Notes |
|-----------|----------|-----------|-------|
| Calculate Level | ~8,000 | On update | Quadratic + sqrt |
| Get Rank Tier | ~4,000 | On update | Linear search |
| Apply Multiplier | ~2,000 | On update | Multiplication |
| Full Stats Update | ~15,000 | Per reward | Level + Rank + Store |
| getUserStats() | ~3,000 | Per query | Read-only |
| Quest Complete | +15,000 | Per claim | Original + multiplier |
| Send GM | +15,000 | Per GM | Original + multiplier |

**Total Additional Cost**: ~15,000 gas per reward event

**At Current Gas Prices** (Base Mainnet):
- 0.1 gwei base fee
- 15,000 gas = 0.0000015 ETH = ~$0.003 per transaction

---

## Migration Strategy

### Option A: Clean Slate (RECOMMENDED)

**Approach**: Start fresh, ignore old data

1. Deploy new contract
2. Update all frontend code
3. Start from block 0
4. Users build up new scores

**Pros**:
- ✅ Cleanest approach
- ✅ No migration bugs
- ✅ Fastest deployment

**Cons**:
- ❌ Users lose historical points
- ❌ Need to rebuild leaderboard

**Decision**: User said "we can ignore about points from wallet" - this is the approach!

### Option B: Oracle Migration (Complex)

**Approach**: Oracle copies old scores to new contract

1. Deploy new contract
2. Read all user scores from old contract
3. Oracle calls setInitialScore() for each user
4. ~10,000 users = ~10,000 transactions

**Pros**:
- ✅ Preserves user progress

**Cons**:
- ❌ Very expensive (~$30+ in gas)
- ❌ Takes several hours
- ❌ Risk of errors

**Decision**: NOT NEEDED per user request

---

## Documentation Updates

### Files to Update

1. **CONTRACT-FIX-OPTIONS.md** → Archive
2. **QUEST-ESCROW-BUG-FIX.md** → Archive
3. **Create NEW**:
   - `ONCHAIN-SCORING-IMPLEMENTATION.md` (This file)
   - `SCORING-MODULE-API.md` (Contract interface docs)
   - `MIGRATION-GUIDE.md` (Step-by-step for team)

### Code Comments to Add

```solidity
/**
 * SCORING SYSTEM OVERVIEW
 * 
 * This contract implements a complete on-chain scoring system with:
 * 
 * 1. LEVEL PROGRESSION (Quadratic Formula)
 *    - Base: 300 XP for level 1
 *    - Increment: +200 XP per level
 *    - Formula: level = (-b + √(b² + 4ac)) / 2a
 *    - Example: 2100 XP = Level 5
 * 
 * 2. RANK TIERS (12 Tiers)
 *    - Beginner: 0-4K points (3 tiers)
 *    - Intermediate: 4K-25K points (3 tiers)
 *    - Advanced: 25K-100K points (3 tiers)
 *    - Legendary: 100K+ points (3 tiers)
 * 
 * 3. MULTIPLIERS (Rank-Based)
 *    - Beacon Runner (1,500+): 1.1x
 *    - Star Captain (8,000+): 1.2x
 *    - Quantum Navigator (25,000+): 1.3x
 *    - Void Walker (60,000+): 1.5x
 *    - Infinite GM (250,000+): 2.0x
 * 
 * 4. TOTAL SCORE TRACKING
 *    - Points Balance (GM rewards, quest claims)
 *    - Viral XP (Farcaster engagement, oracle-updated)
 *    - Quest Points (off-chain completions)
 *    - Guild Points (guild rewards)
 *    - Referral Points (referral bonuses)
 * 
 * All formulas match lib/scoring/unified-calculator.ts for consistency.
 */
```

---

## Timeline

### Total Time: ~2.5 hours

1. **Contract Development**: 30 min
   - Create ScoringModule.sol
   - Update CoreModule.sol
   - Write tests

2. **Deployment**: 15 min
   - Deploy to Base Mainnet
   - Verify on BaseScan
   - Save deployment info

3. **Frontend Updates**: 30 min
   - Update ABI
   - Update API routes
   - Update ENV variables

4. **Subsquid Updates**: 20 min
   - Update indexer schema
   - Add event handlers
   - Redeploy indexer

5. **Testing**: 30 min
   - Contract verification
   - Query tests
   - Frontend tests
   - Integration tests

6. **Buffer**: 15 min
   - Fix any issues
   - Documentation

---

## Success Criteria

✅ **Contract Deployed**: New GmeowCore on Base Mainnet  
✅ **Verified**: Contract verified on BaseScan  
✅ **ABI Updated**: New ABI in `abi/GmeowCore.json`  
✅ **Frontend Working**: All pages query on-chain stats  
✅ **Subsquid Indexing**: Events indexed correctly  
✅ **Multipliers Active**: Quests apply rank multipliers  
✅ **Gas Efficient**: <20,000 gas per operation  
✅ **Tests Passing**: All forge tests green  

---

## Next Steps

1. **Review this plan** ✅
2. **Create ScoringModule.sol** (copy patterns from unified-calculator.ts)
3. **Update CoreModule.sol** (integrate scoring)
4. **Run local tests** (forge test)
5. **Deploy to Sepolia** (test deployment)
6. **Deploy to Base Mainnet** (production)
7. **Update frontend** (new ABI + queries)
8. **Restart Subsquid** (index new events)
9. **Test end-to-end** (quest completion with multiplier)
10. **Document** (update all docs)

---

**Ready to proceed?** Let me know and I'll start with ScoringModule.sol implementation!
