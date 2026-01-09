# Guild Contribution & Rewards System Guide

**Status:** Complete System Verification  
**Your Address:** `0x8870C155666809609176260F2B65a626C000D773`  
**Guild:** #1 (Gmeow Test Guild) - **You are the Owner**  
**Current Treasury:** 0 points

---

## 🎯 How the Contribution System Works

### 1. **Deposit Points to Guild Treasury**

**What Happens:**
- You contribute your personal points to the guild's shared treasury
- Formula: `guildTreasuryPoints[guildId] += depositAmount`
- Guild also earns 10% as guild XP: `guildPoints += (depositAmount / 10)`
- **Your role multiplier applies when claiming (not depositing)**

**API Endpoint:**
```bash
POST /api/guild/1/deposit
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 1000
}
```

**Contract Function:**
```solidity
function depositGuildPoints(uint256 guildId, uint256 points) external {
  require(getUserPoints(msg.sender) >= points, "Insufficient points");
  deductPoints(msg.sender, points);
  guildTreasuryPoints[guildId] += points;
  addGuildPoints(guildId, points / 10);  // Guild earns 10% XP
  emit GuildPointsDeposited(guildId, msg.sender, points);
}
```

**What You Lose:** `amount` points from your personal balance  
**What Guild Gains:**
- `amount` points in treasury
- `amount / 10` guild XP points

---

### 2. **Claim Rewards from Treasury (Owner/Officer Only)**

**Your Multiplier as Owner:** **2.0x** (you get double rewards!)

**What Happens:**
1. Guild treasury decreases by claim amount
2. You get bonus applied based on your rank tier
3. Rank multiplier stacks with role multiplier

**API Endpoint:**
```bash
POST /api/guild/1/claim
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 500
}
```

**Calculation Flow:**
```typescript
// Step 1: Deduct from treasury
guildTreasuryPoints[guildId] -= claimAmount

// Step 2: Apply rank multiplier (from your total score)
const rankTier = getRankTier(totalScore)
const rankMultiplier = getMultiplier(rankTier)
const bonusPoints = (claimAmount * rankMultiplier) / 1000

// Step 3: Add to your personal points
userPoints[msg.sender] += bonusPoints

// Example: Platinum tier (1.3x multiplier)
// Claim 500 → Get 500 * 1.3 = 650 points
```

**Contract Code:**
```solidity
function claimGuildReward(uint256 guildId, uint256 points) external {
  require(guildOf[msg.sender] == guildId, "Not a member");
  require(isLeader || isOfficer, "Only leaders/officers can claim");
  require(guildTreasuryPoints[guildId] >= points, "Insufficient treasury");
  
  guildTreasuryPoints[guildId] -= points;
  
  // Apply rank multiplier
  uint8 tierIndex = scoringModule.userRankTier(msg.sender);
  uint256 bonusPoints = scoringModule.applyMultiplier(points, tierIndex);
  
  scoringModule.addPoints(msg.sender, bonusPoints);
  emit GuildRewardClaimed(guildId, msg.sender, bonusPoints);
}
```

---

## 💰 The 988,985 Number You See

Based on the guild treasury API showing `"balance": "0"`, that number is likely from:

**Possible Sources:**
1. **Your Personal Points Balance** - Check at `/dashboard`
2. **Cached Guild Analytics** - Old data before treasury was emptied
3. **Display formatting issue** - Check browser console

**To verify, check:**
```bash
# Your personal points
curl "https://gmeowhq.art/api/user/points?address=0x8870C155666809609176260F2B65a626C000D773"

# Guild treasury
curl "https://gmeowhq.art/api/guild/1/treasury"
```

---

## 🎮 Complete XP/Level/Rank/Multiplier System

### **Layer 1: Base Points (Your Raw Score)**

**Sources:**
- `pointsBalance`: Points from quests, tips, claims
- `viralPoints`: Cast engagement rewards
- `questPoints`: Quest completion rewards
- `guildPoints`: Guild contribution bonuses
- `referralPoints`: Referral network rewards

**Total Score Formula:**
```typescript
totalScore = pointsBalance + viralPoints + questPoints + guildPoints + referralPoints
```

---

### **Layer 2: Level Progression (XP-based)**

**Formula:** Quadratic progression
```typescript
// Level = (-b + √(b² + 4ac)) / 2a
// Where: a = LEVEL_XP_INCREMENT (200)
//        b = LEVEL_XP_BASE (300)
//        c = totalScore

level = calculateLevel(totalScore)

// Examples:
// 0 XP     → Level 1
// 300 XP   → Level 2
// 800 XP   → Level 3
// 1500 XP  → Level 4
// 2400 XP  → Level 5
```

**Level Thresholds:**
```
Level  1→2:  300 XP   (+300)
Level  2→3:  800 XP   (+500)
Level  3→4: 1500 XP   (+700)
Level  4→5: 2400 XP   (+900)
Level  5→6: 3500 XP  (+1100)
```

---

### **Layer 3: Rank Tiers (12 Tiers)**

**Tier System:**
```typescript
const RANK_TIERS = [
  { name: "Signal Kitten",    min: 0,      max: 500,     multiplier: 1.0x },
  { name: "Beacon Runner",    min: 500,    max: 1500,    multiplier: 1.1x },
  { name: "Realm Keeper",     min: 1500,   max: 4000,    multiplier: 1.2x },
  { name: "Night Operator",   min: 4000,   max: 8000,    multiplier: 1.2x },
  { name: "Star Captain",     min: 8000,   max: 15000,   multiplier: 1.2x },
  { name: "Platinum",         min: 15000,  max: 30000,   multiplier: 1.3x },
  { name: "Diamond",          min: 30000,  max: 60000,   multiplier: 1.5x },
  { name: "Alpha Cat",        min: 60000,  max: 125000,  multiplier: 1.6x },
  { name: "Ethereal",         min: 125000, max: 250000,  multiplier: 1.7x },
  { name: "Celestial",        min: 250000, max: 500000,  multiplier: 1.8x },
  { name: "Cosmic Being",     min: 500000, max: 1000000, multiplier: 1.9x },
  { name: "Omniversal Being", min: 1000000, max: ∞,      multiplier: 2.0x }
]
```

---

### **Layer 4: Multipliers (3 Types)**

#### **A. Rank Multiplier (Applied to XP Earnings)**

**When Applied:**
- Quest completions
- Viral XP rewards
- Guild reward claims

**Example:**
```typescript
// You're Platinum tier (1.3x multiplier)
// Complete quest worth 100 XP
finalXP = 100 * 1.3 = 130 XP
```

#### **B. Guild Role Multiplier (Bonus Calculation)**

**Role Multipliers:**
- **Owner:** 2.0x
- **Officer:** 1.5x
- **Member:** 1.0x

**Applied to:**
- Guild contribution leaderboard bonuses
- Role-based rewards

**Formula:**
```typescript
guildBonus = pointsContributed * roleMultiplier

// Example (you as owner):
// Deposited 5000 points → 5000 * 2.0 = 10,000 guild bonus
```

#### **C. Quest Category Multiplier**

**Quest Types:**
```typescript
const XP_MULTIPLIERS = {
  social: 1.0x,
  onchain: 1.5x,
  creative: 1.2x,
  learn: 1.0x,
  hybrid: 2.0x,
  custom: 1.0x
}
```

---

## 🔢 Complete Calculation Example

**Your Stats (Hypothetical):**
- Total Score: 25,000 points
- Rank Tier: Platinum (1.3x multiplier)
- Guild Role: Owner (2.0x contribution bonus)
- Current Level: 72

### **Scenario 1: Complete Hybrid Quest**

```typescript
// Quest: 100 base XP, hybrid category
baseXP = 100
categoryMultiplier = 2.0x  // Hybrid
rankMultiplier = 1.3x      // Platinum tier

// Step 1: Apply category multiplier
categoryXP = baseXP * categoryMultiplier
          = 100 * 2.0 = 200 XP

// Step 2: Apply rank multiplier
finalXP = categoryXP * rankMultiplier
        = 200 * 1.3 = 260 XP

// You earn: 260 XP total
```

### **Scenario 2: Claim from Guild Treasury**

```typescript
// Guild has 1000 points in treasury
// You claim 500 points

claimAmount = 500
rankTier = "Platinum"
rankMultiplier = 1.3x

// Step 1: Deduct from treasury
treasuryBalance = 1000 - 500 = 500

// Step 2: Apply your rank multiplier
bonusPoints = claimAmount * rankMultiplier
            = 500 * 1.3 = 650 points

// Step 3: Add to your balance
yourPoints += 650

// Net result:
// - Treasury: -500
// - You gain: +650 (30% bonus!)
```

### **Scenario 3: Leaderboard Guild Bonus**

```typescript
// You've deposited 10,000 points total to guild
pointsContributed = 10,000
roleMultiplier = 2.0x  // Owner

guildBonus = pointsContributed * roleMultiplier
           = 10,000 * 2.0 = 20,000 points

// This counts toward leaderboard rankings
```

---

## 🚀 UI Interface Verification

### **Where to See These Numbers:**

1. **Guild Profile Page** (`/guild/1`)
   - Treasury balance
   - Total members
   - Total points
   - Level
   - Settings tab (owner only)

2. **Dashboard** (`/dashboard`)
   - Your total score
   - Current level
   - Rank tier
   - XP progress bars
   - Multiplier indicators

3. **Leaderboard** (`/leaderboard`)
   - Global rank
   - Guild bonus
   - Referral bonus
   - Total score breakdown

4. **Treasury Dialog**
   - Deposit form
   - Claim form (owner/officer only)
   - Transaction history
   - Pending claims

---

## 📊 APIs to Test

```bash
# 1. Guild Detail
curl "https://gmeowhq.art/api/guild/1"

# 2. Guild Treasury
curl "https://gmeowhq.art/api/guild/1/treasury"

# 3. Guild Analytics
curl "https://gmeowhq.art/api/guild/1/analytics?period=week"

# 4. Your Membership Role
curl "https://gmeowhq.art/api/guild/1/is-member?address=0x8870C155666809609176260F2B65a626C000D773"

# 5. Guild Members List
curl "https://gmeowhq.art/api/guild/1/members?limit=50&offset=0"

# 6. Your User Stats (if endpoint works)
curl "https://gmeowhq.art/api/user/0x8870C155666809609176260F2B65a626C000D773/points"
```

---

## ✅ What's Working Right Now

Based on our fixes:

1. ✅ **Settings Tab** - Now visible for guild owner
2. ✅ **Guild Detail API** - Returns correct data
3. ✅ **Metadata API** - Shows "Gmeow Test Guild"
4. ✅ **Analytics API** - Returns analytics data
5. ✅ **Treasury API** - Shows balance (currently 0)
6. ✅ **is-member API** - Returns your role as "owner"

---

## 🎯 Next Steps to Test

1. **Check Your Personal Points Balance**
   - Go to `/dashboard`
   - Look for total score and points balance

2. **Test Deposit Flow**
   - Go to `/guild/1`
   - Click "Manage Treasury"
   - Try depositing points (if you have any)

3. **Verify XP Overlay**
   - Complete a quest
   - Check if XP celebration shows with multipliers

4. **Test Claim Flow**
   - After depositing, try claiming
   - Verify rank multiplier applies

---

## 🔍 Where is 988,985 Coming From?

**To find the source:**

1. Open browser console (F12)
2. Go to `/guild/1`
3. Look for the element showing 988,985
4. Check the Network tab for API responses
5. Search for "988985" or "988,985" in the response data

**Most likely sources:**
- Personal points balance
- Cached guild analytics
- Total score from old data
- Sum of all guild member contributions

Let me know what the browser shows and I can help trace it!
