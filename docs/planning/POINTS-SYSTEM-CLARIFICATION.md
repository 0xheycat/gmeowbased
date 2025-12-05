# Points System Clarification

**Date**: December 4, 2025  
**Status**: ✅ **CLARIFIED** - Points are the core currency of Gmeowbased  

---

## 🎯 What Are Points?

**Points are Gmeowbased's internal currency** - not just a progression metric like XP.

### XP vs Points

| Feature | XP (Experience Points) | Points (Currency) |
|---------|------------------------|-------------------|
| **Purpose** | Progression, ranking, levels | Currency for creating quests and minting badges |
| **Usage** | Display user rank/level | **Spend** to create quests, mint badges, unlock features |
| **Source** | Quest completion, daily GM | Quest completion, daily GM, achievements |
| **Transferable** | No | Future: Yes (maybe) |
| **Economy** | Infinite (just grows) | **Finite** (earned and spent) |

---

## 💰 Points Economy

### How Users Earn Points

1. **Quest Completion** - Primary source
   ```typescript
   // Quest awards both XP and Points
   rewards: {
     xp_earned: 50,       // XP for progression
     points_earned: 50,   // Points to spend
   }
   ```

2. **Daily GM** - Streak rewards
   - 1 day streak: +10 Points
   - 7 day streak: +100 Points bonus
   - 30 day streak: +500 Points bonus

3. **Achievements** - One-time rewards
   - First quest completed: +100 Points
   - 10 quests completed: +500 Points
   - Referred 5 friends: +250 Points

### How Users Spend Points

1. **Create User-Generated Quests**
   ```typescript
   // Cost: 100 Points per quest
   const questCreationCost = 100;
   
   // Deduct from user's balance
   UPDATE user_profiles
   SET points = points - 100
   WHERE fid = user_fid;
   ```

2. **Mint Custom Badges**
   ```typescript
   // Cost: 50 Points per badge
   const badgeMintCost = 50;
   
   // Badge becomes NFT on-chain
   await mintBadgeNFT(user_address, badge_metadata);
   ```

3. **Unlock Premium Features** (Future)
   - Custom quest templates: 200 Points
   - Featured quest placement: 500 Points
   - Guild creation: 1000 Points

---

## 🗄️ Database Schema

### Points Tracking

```sql
-- User balance
CREATE TABLE user_profiles (
  fid BIGINT PRIMARY KEY,
  points BIGINT DEFAULT 0,      -- Current balance
  xp BIGINT DEFAULT 0,           -- Total XP (never decreases)
  total_points_earned BIGINT DEFAULT 0,  -- Lifetime earnings
  total_points_spent BIGINT DEFAULT 0,   -- Lifetime spending
  ...
);

-- Points transaction log
CREATE TABLE points_transactions (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  amount BIGINT NOT NULL,        -- Positive = earned, Negative = spent
  source TEXT NOT NULL,          -- 'quest_completion:2', 'daily_gm', 'quest_creation'
  balance_after BIGINT NOT NULL, -- Balance after transaction
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Quest Rewards

```sql
-- Quest completion awards both XP and Points
INSERT INTO quest_completions (
  quest_id, 
  completer_fid, 
  completer_address, 
  points_awarded,  -- Points earned
  xp_awarded,      -- XP earned (optional separate tracking)
  completed_at
)
VALUES (2, 18139, '0x...', 50, 50, NOW());
```

---

## 💡 Why Points Matter

### User-Generated Content Economy

Points enable a **self-sustaining quest marketplace**:

1. **User completes official quests** → Earns 50 Points
2. **User spends 100 Points** → Creates own quest
3. **Other users complete user's quest** → Earn Points
4. **Cycle repeats** → Growing quest marketplace

### Scarcity Creates Value

- **XP is infinite** (always grows, never spent)
- **Points are finite** (earned and spent)
- Users must **choose** what to spend on
- Creates economic value and engagement

---

## 🔄 Reward Flow

### Quest Completion Flow

```typescript
// 1. User completes quest
const questReward = 50; // reward_points from quest

// 2. Award both XP and Points
await supabase
  .from('user_profiles')
  .update({
    xp: user.xp + questReward,           // XP grows infinitely
    points: user.points + questReward,   // Points can be spent
    total_points_earned: user.total_points_earned + questReward
  })
  .eq('fid', userFid);

// 3. Log Points transaction
await supabase
  .from('points_transactions')
  .insert({
    fid: userFid,
    amount: questReward,
    source: `quest_completion:${questId}`,
    balance_after: user.points + questReward,
  });

// 4. Log quest completion
await supabase
  .from('quest_completions')
  .insert({
    quest_id: questId,
    completer_fid: userFid,
    points_awarded: questReward,
    xp_awarded: questReward, // Optional: track XP separately
  });
```

### Quest Creation Flow

```typescript
// 1. Check user has enough Points
const user = await getUser(userFid);
const cost = 100; // Quest creation cost

if (user.points < cost) {
  throw new Error('Insufficient Points');
}

// 2. Deduct Points
await supabase
  .from('user_profiles')
  .update({
    points: user.points - cost,
    total_points_spent: user.total_points_spent + cost
  })
  .eq('fid', userFid);

// 3. Log Points transaction
await supabase
  .from('points_transactions')
  .insert({
    fid: userFid,
    amount: -cost, // Negative = spent
    source: 'quest_creation',
    balance_after: user.points - cost,
  });

// 4. Create quest
await supabase
  .from('unified_quests')
  .insert({
    title: 'My Custom Quest',
    creator_fid: userFid,
    reward_points: 25, // Quest rewards 25 Points
    ...
  });
```

---

## 📊 UI Display Examples

### Profile Page

```
@heycat
Rank: #42 🏆
XP: 2,450 ⚡
Points: 350 💎    ← Spendable currency

[Create Quest - 100 Points]
[Mint Badge - 50 Points]
```

### Quest Completion Notification

```
✅ Quest Complete!
  
"Follow @gmeowbased on Farcaster"

Rewards:
  +50 XP ⚡
  +50 Points 💎
```

### Quest Creation Page

```
Create Custom Quest

Cost: 100 Points 💎
Your Balance: 350 Points

Quest Reward: 25 Points
(Other users earn 25 Points when completing your quest)

[Create Quest]
```

---

## 🚀 Implementation Status

### ✅ Completed
- [x] Clarified Points vs XP distinction
- [x] Updated verification orchestrator to award both XP and Points
- [x] Updated types to include `points_earned` in rewards
- [x] Updated documentation (NEW-QUEST-SYSTEM-BREAKDOWN.md)
- [x] Deleted old on-chain verification API

### ⏳ TODO (Future Phases)
- [ ] Implement Points deduction for quest creation
- [ ] Add Points transaction logging
- [ ] Create Points economy dashboard
- [ ] Add Points balance checks before spending
- [ ] Implement badge minting with Points cost
- [ ] Add Points transaction history to profile page
- [ ] Create Points leaderboard (separate from XP leaderboard)

---

## 🎯 Key Takeaways

1. **Points are currency, XP is progression** - Different purposes
2. **Users earn Points from quests** - Primary source
3. **Users spend Points to create content** - Quest creation, badge minting
4. **Points create a self-sustaining economy** - Users reward each other
5. **Always award both XP and Points** - Quest completion gives both

---

**Status**: ✅ CLARIFIED  
**Next Steps**: Continue with quest system implementation using XP + Points rewards
