# 🤖 Farcaster Bot Enhancement Plan - Part 2: Calculations, Integration & Enhancements

**Document Version**: 1.0  
**Date**: December 16, 2025  
**Status**: Active Analysis  
**Scope**: XP/Level System, Neynar Integration, Proposed Enhancements

---

## 4. XP, Level & Bonus Calculation

### 4.1 Current XP Sources

**Primary XP Sources** (from `leaderboard_calculations` table):

1. **Base Points** (`base_points` column)
   - Source: Quest completion events from smart contracts
   - Calculation: Summed from `QuestCompleted` contract events
   - Typical values: 10-100 XP per quest
   - Indexed by Subsquid (future) or manual aggregation (current)

2. **Viral XP** (`viral_xp` column)
   - Source: Cast engagement metrics from `badge_casts` table
   - Calculation: See Section 4.2 below
   - Typical values: 25-200 XP per viral tier upgrade
   - Triggers: Likes, recasts, replies on badge casts

3. **Guild Bonus** (`guild_bonus` column)
   - Source: Guild membership and officer status
   - Calculation: `guild_level * 100` (base) + member bonus
   - Member bonus: 10% of total score
   - Officer bonus: +5% additional (15% total)
   - Typical values: 100-500 XP

4. **Referral Bonus** (`referral_bonus` column)
   - Source: Referral registrations from contract events
   - Calculation: `referral_count * 50`
   - Reward: 50 XP per successful referral
   - Typical values: 50-500 XP

5. **Streak Bonus** (`streak_bonus` column)
   - Source: GM streak events from `gmeow_rank_events`
   - Calculation: `streak_days * 10`
   - Reward: 10 XP per consecutive day
   - Typical values: 30-300 XP (3-30 day streaks)

6. **Badge Prestige** (`badge_prestige` column)
   - Source: Badge collection from `user_badges` table
   - Calculation: `badge_count * 25`
   - Reward: 25 XP per unique badge earned
   - Typical values: 25-250 XP

**Total Score Formula**:
```sql
-- Generated column in leaderboard_calculations
total_score = base_points + viral_xp + guild_bonus + 
              referral_bonus + streak_bonus + badge_prestige + 
              guild_bonus_points
```

### 4.2 Viral XP Calculation (Detailed)

**Viral Score Formula**:
```typescript
// From lib/viral-engagement-sync.ts
viral_score = (recasts × 10) + (replies × 5) + (likes × 2)
```

**Viral Tier Thresholds**:
```typescript
const VIRAL_TIERS = {
  none: 0,           // No engagement
  active: 25,        // 25+ viral score → +25 XP
  engaging: 100,     // 100+ viral score → +50 XP (cumulative: +75 XP)
  popular: 250,      // 250+ viral score → +100 XP (cumulative: +175 XP)
  viral: 500,        // 500+ viral score → +150 XP (cumulative: +325 XP)
  mega_viral: 1000,  // 1000+ viral score → +200 XP (cumulative: +525 XP)
}
```

**XP Award per Tier Upgrade**:
```typescript
const TIER_XP_AWARDS = {
  active: 25,
  engaging: 50,
  popular: 100,
  viral: 150,
  mega_viral: 200,
}

// Example: Cast goes from 'active' to 'popular'
// Earns: +50 XP (engaging) + +100 XP (popular) = +150 XP total
```

**Viral Engagement Sync Process**:
```typescript
// 1. Fetch current metrics from Neynar API
const cast = await neynar.lookUpCastByHashOrWarpcastUrl(castHash)
const likes = cast.reactions.likes_count
const recasts = cast.reactions.recasts_count
const replies = cast.replies.count

// 2. Calculate new viral score
const newScore = (recasts * 10) + (replies * 5) + (likes * 2)

// 3. Determine new tier
let newTier = 'none'
if (newScore >= 1000) newTier = 'mega_viral'
else if (newScore >= 500) newTier = 'viral'
else if (newScore >= 250) newTier = 'popular'
else if (newScore >= 100) newTier = 'engaging'
else if (newScore >= 25) newTier = 'active'

// 4. If tier upgraded, award XP difference
if (newTier !== oldTier) {
  const tierOrder = ['none', 'active', 'engaging', 'popular', 'viral', 'mega_viral']
  const oldIndex = tierOrder.indexOf(oldTier)
  const newIndex = tierOrder.indexOf(newTier)
  
  let additionalXp = 0
  for (let i = oldIndex + 1; i <= newIndex; i++) {
    additionalXp += TIER_XP_AWARDS[tierOrder[i]]
  }
  
  // Update badge_casts table
  await supabase
    .from('badge_casts')
    .update({ 
      viral_score: newScore,
      viral_tier: newTier,
      viral_bonus_xp: oldBonusXp + additionalXp,
      last_metrics_update: new Date().toISOString()
    })
    .eq('cast_hash', castHash)
  
  // Log to xp_transactions
  await supabase
    .from('xp_transactions')
    .insert({
      fid: authorFid,
      amount: additionalXp,
      source: 'viral_tier_upgrade',
      metadata: { castHash, oldTier, newTier, newScore }
    })
}
```

### 4.3 Level Calculation

**Level Thresholds** (from `gmeow-utils.ts`):
```typescript
const LEVEL_THRESHOLDS = [
  { level: 1, minXP: 0, maxXP: 100 },
  { level: 2, minXP: 101, maxXP: 250 },
  { level: 3, minXP: 251, maxXP: 500 },
  { level: 4, minXP: 501, maxXP: 1000 },
  { level: 5, minXP: 1001, maxXP: 2000 },
  { level: 6, minXP: 2001, maxXP: 3500 },
  { level: 7, minXP: 3501, maxXP: 5500 },
  { level: 8, minXP: 5501, maxXP: 8000 },
  { level: 9, minXP: 8001, maxXP: 12000 },
  { level: 10, minXP: 12001, maxXP: Infinity },
]

function calculateLevel(totalXP: number): number {
  const threshold = LEVEL_THRESHOLDS.find(t => totalXP >= t.minXP && totalXP <= t.maxXP)
  return threshold?.level || 1
}
```

**XP Progress in Level**:
```typescript
function getXPProgressInLevel(totalXP: number): {
  level: number
  xpIntoLevel: number
  xpForLevel: number
  progressPercent: number
} {
  const level = calculateLevel(totalXP)
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === level)
  
  const xpIntoLevel = totalXP - threshold.minXP
  const xpForLevel = threshold.maxXP - threshold.minXP
  const progressPercent = (xpIntoLevel / xpForLevel) * 100
  
  return { level, xpIntoLevel, xpForLevel, progressPercent }
}
```

### 4.4 Tier Calculation (Neynar Score Based)

**Neynar Tier Mapping**:
```typescript
// From user_profiles.neynar_tier column
type NeynarTier = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

function calculateNeynarTier(score: number): NeynarTier {
  if (score >= 0.9) return 'mythic'
  if (score >= 0.7) return 'legendary'
  if (score >= 0.5) return 'epic'
  if (score >= 0.3) return 'rare'
  return 'common'
}
```

**Neynar Score Ranges**:
- `0.0 - 0.29`: Common (no badge shown)
- `0.3 - 0.49`: Rare (`[🌟 0.42]`)
- `0.5 - 0.69`: Epic (`[✨ 0.62]`)
- `0.7 - 0.89`: Legendary (`[⭐ 0.81]`)
- `0.9 - 1.0+`: Mythic (`[⭐ 0.96]`)

**Tier Badge Display in Bot Replies**:
```typescript
// From lib/agent-auto-reply.ts
function formatNeynarScoreBadge(score: number | null): string {
  if (score == null || score < 0.3) return '' // Don't show for low scores
  
  const badge = score >= 0.8 ? '⭐' : score >= 0.5 ? '✨' : '🌟'
  return `[${badge} ${score.toFixed(2)}]`
}

// Example outputs:
// score 0.81 → "[⭐ 0.81]"
// score 0.62 → "[✨ 0.62]"
// score 0.25 → "" (not shown)
```

### 4.5 Leaderboard Rank Calculation

**Ranking Logic**:
```sql
-- Global rank query
WITH ranked_users AS (
  SELECT 
    farcaster_fid,
    total_score,
    ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
  FROM leaderboard_calculations
  WHERE period = 'all_time'
)
UPDATE leaderboard_calculations lc
SET 
  global_rank = ru.rank,
  rank_change = COALESCE(lc.global_rank, 0) - ru.rank,
  updated_at = NOW()
FROM ranked_users ru
WHERE lc.farcaster_fid = ru.farcaster_fid
  AND lc.period = 'all_time'
```

**Rank Tier Assignment**:
```typescript
function calculateRankTier(rank: number, totalUsers: number): string {
  const percentile = (rank / totalUsers) * 100
  
  if (percentile <= 1) return 'legendary'    // Top 1%
  if (percentile <= 5) return 'epic'         // Top 5%
  if (percentile <= 10) return 'rare'        // Top 10%
  if (percentile <= 25) return 'uncommon'    // Top 25%
  return 'common'                             // Rest
}
```

**Rank Change Tracking**:
```typescript
// rank_change column shows movement since last calculation
// Positive = moved up, Negative = moved down
// Example: rank_change = +5 means moved up 5 positions
```

### 4.6 Decay Rules (Future Implementation)

**Current State**: No time decay implemented  
**Proposed Decay System**:

```typescript
// Time-based XP decay (not yet implemented)
interface DecayConfig {
  enabled: boolean
  decayPeriodDays: number     // 90 days
  decayRate: number           // 5% per period
  minRetainedPercent: number  // 50% (floor)
}

// Formula (proposed):
function applyTimeDecay(xp: number, lastActivityDate: Date, config: DecayConfig): number {
  if (!config.enabled) return xp
  
  const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  const periodsElapsed = Math.floor(daysSinceActivity / config.decayPeriodDays)
  
  if (periodsElapsed === 0) return xp
  
  const decayMultiplier = Math.pow(1 - config.decayRate, periodsElapsed)
  const decayedXP = xp * decayMultiplier
  
  // Apply floor
  const minRetainedXP = xp * config.minRetainedPercent
  return Math.max(decayedXP, minRetainedXP)
}

// Example: User with 1000 XP, inactive for 180 days (2 periods)
// Decay: 1000 × (1 - 0.05)² = 1000 × 0.9025 = 902.5 XP
// With 50% floor: max(902.5, 500) = 902.5 XP ✓
```

**Rationale for No Current Decay**:
- Early-stage platform: Encouraging long-term participation
- Low activity currently (27 users with scores)
- May introduce decay in future when DAUs > 1000
- Prevents "ghost" high-rankers from inactive users

### 4.7 Edge Cases & Exploits

**Identified Edge Cases**:

1. **Viral Score Gaming**
   - **Exploit**: User could self-recast from multiple accounts
   - **Mitigation**: Viral score weighted by unique users (not implemented yet)
   - **Proposed**: Track unique recast FIDs, limit self-recasts

2. **Quest Spam**
   - **Exploit**: Repeatedly complete easy quests
   - **Mitigation**: Quest cooldowns (daily/weekly resets)
   - **Status**: Implemented in `quest_definitions.quest_type`

3. **Referral Farming**
   - **Exploit**: Create fake accounts to claim referral bonuses
   - **Mitigation**: Neynar score check (minimum 0.3 required)
   - **Status**: Not fully implemented (relies on manual review)

4. **Guild Bonus Stacking**
   - **Exploit**: Join/leave guilds to double-count bonuses
   - **Mitigation**: Guild bonus recalculated on each update
   - **Status**: Partially mitigated (race conditions possible)

5. **XP Transaction Replay**
   - **Exploit**: Duplicate XP transactions via API replay
   - **Mitigation**: Idempotency keys, unique constraints
   - **Status**: Fully mitigated (database + application layer)

**Missing Validations** (to be implemented):

```typescript
// Proposed validation layer
interface XPAwardValidation {
  maxViralXPPerCast: number        // 525 XP (mega_viral max)
  maxQuestXPPerDay: number         // 1000 XP
  maxReferralXPPerDay: number      // 500 XP (10 referrals max)
  minTimeBetweenGM: number         // 24 hours
  neynarScoreMinForReferral: number // 0.3
}

function validateXPAward(award: XPAward, config: XPAwardValidation): boolean {
  switch (award.source) {
    case 'viral_tier_upgrade':
      return award.amount <= config.maxViralXPPerCast
    
    case 'quest_completion':
      const todayQuestXP = getTodayQuestXP(award.fid)
      return todayQuestXP + award.amount <= config.maxQuestXPPerDay
    
    case 'referral':
      const referrerScore = getNeynarScore(award.fid)
      return referrerScore >= config.neynarScoreMinForReferral
    
    case 'gm_streak':
      const lastGM = getLastGMTimestamp(award.fid)
      const hoursSinceLastGM = (Date.now() - lastGM) / (1000 * 60 * 60)
      return hoursSinceLastGM >= config.minTimeBetweenGM
    
    default:
      return true
  }
}
```

### 4.8 Formulas Summary

**Total Score (Leaderboard)**:
```
total_score = Σ(base_points) + Σ(viral_xp) + guild_bonus + 
              referral_bonus + streak_bonus + badge_prestige + 
              guild_bonus_points

Where:
- base_points = Σ quest_completion_xp (from contract events)
- viral_xp = Σ viral_tier_upgrade_xp (from badge_casts)
- guild_bonus = guild_level × 100
- referral_bonus = referral_count × 50
- streak_bonus = streak_days × 10
- badge_prestige = badge_count × 25
- guild_bonus_points = (total_score × 0.10) if member
                      + (total_score × 0.05) if officer
```

**Viral Score**:
```
viral_score = (recasts × 10) + (replies × 5) + (likes × 2)

Tier Thresholds:
- none:       0-24
- active:     25-99    (+25 XP)
- engaging:   100-249  (+50 XP)
- popular:    250-499  (+100 XP)
- viral:      500-999  (+150 XP)
- mega_viral: 1000+    (+200 XP)
```

**Level Progression**:
```
Level 1:  0-100 XP
Level 2:  101-250 XP
Level 3:  251-500 XP
Level 4:  501-1000 XP
Level 5:  1001-2000 XP
Level 6:  2001-3500 XP
Level 7:  3501-5500 XP
Level 8:  5501-8000 XP
Level 9:  8001-12000 XP
Level 10: 12001+ XP
```

---

## 5. Neynar Integration (MCP)

### 5.1 Neynar MCP Tools Available

**Search Tool**:
```typescript
mcp_neynar_SearchNeynar({
  query: "how to fetch user by fid"
})
// Returns: Documentation snippets with titles and links
```

### 5.2 Webhooks vs Polling

**Current Implementation**: Webhooks (100% webhook-based)

**Webhook Configuration**:
```typescript
// Environment variables
NEYNAR_WEBHOOK_SECRET     // HMAC secret for signature verification
NEYNAR_WEBHOOK_URL        // https://gmeowhq.art/api/neynar/webhook

// Registered webhook events
- cast.created            // Primary trigger for bot replies
- cast.deleted            // Not handled (skipped)
- reaction.created        // Not handled (use engagement sync instead)
- miniapp_added          // Notification token registration
- miniapp_removed        // Token cleanup
- notifications_enabled   // Token activation
- notifications_disabled  // Token deactivation
```

**Why Webhooks (Not Polling)**:
- ✅ Real-time event delivery (<1s latency)
- ✅ No API rate limit consumption for monitoring
- ✅ Scalable (handles 1000+ events/min)
- ✅ Idempotent with event deduplication
- ✅ Automatic retry by Neynar (3 retries with exp backoff)

**Webhook Reliability**:
- Neynar retries failed deliveries up to 3 times
- Exponential backoff: 1s → 5s → 15s
- After 3 failures, event is marked as lost
- Our webhook returns 200 OK even if internal processing fails
- Failed operations logged for manual retry

### 5.3 Event Types Consumed

**Primary Events**:

1. **cast.created** (HIGH PRIORITY)
   ```typescript
   {
     type: 'cast.created',
     created_at: 1734364800,
     data: {
       hash: '0xabc123...',
       author: { fid: 12345, username: 'alice' },
       text: '@gmeowbased show me my stats',
       mentioned_profiles: [{ fid: 67890, username: 'gmeowbased' }],
       parent_hash: null,  // Top-level cast
       embeds: []
     }
   }
   ```
   - **Usage**: Bot targeting check, auto-reply generation
   - **Frequency**: ~500-1000 events/day
   - **Processing Time**: 1-2 seconds

2. **miniapp_added** (MEDIUM PRIORITY)
   ```typescript
   {
     event: 'miniapp_added',
     fid: 12345,
     appFid: 67890,
     notificationDetails: {
       token: 'eyJhbGc...',
       url: 'https://api.neynar.com/v2/farcaster/miniapp/notification'
     }
   }
   ```
   - **Usage**: Store notification token for push delivery
   - **Frequency**: ~10-50 events/day
   - **Processing Time**: 200-500ms

3. **notifications_enabled** (MEDIUM PRIORITY)
   - Same structure as `miniapp_added`
   - **Usage**: Activate push notification delivery
   - **Frequency**: ~5-20 events/day

4. **notifications_disabled** (LOW PRIORITY)
   - Same structure as `miniapp_added`
   - **Usage**: Deactivate push notifications
   - **Frequency**: ~2-10 events/day

5. **miniapp_removed** (LOW PRIORITY)
   - Same structure as `miniapp_added`
   - **Usage**: Remove notification token from database
   - **Frequency**: ~1-5 events/day

**Events NOT Consumed** (but available):
- `cast.deleted` - Not needed (casts are immutable for our purposes)
- `reaction.created` - Use viral engagement sync instead (batched)
- `follow.created` - Not relevant for bot
- `user.updated` - Use cached profile data instead

### 5.4 Cast, User, and Engagement Lookups

**API Methods Used**:

1. **User Lookup by FID**
   ```typescript
   // lib/neynar.ts
   export async function fetchUserByFid(fid: number): Promise<FarcasterUser | null> {
     try {
       const client = getNeynarServerClient()
       const response = await client.fetchBulkUsers({ fids: [fid] })
       const user = response.users[0]
       
       return {
         fid: user.fid,
         username: user.username,
         displayName: user.display_name,
         pfp: user.pfp_url,
         bio: user.profile.bio.text,
         followerCount: user.follower_count,
         followingCount: user.following_count,
         verifiedAddresses: user.verified_addresses.eth_addresses,
       }
     } catch (error) {
       console.error('[neynar] Failed to fetch user:', error)
       return null
     }
   }
   ```
   - **Cache**: User profiles cached in Supabase (`user_profiles` table)
   - **TTL**: 1 hour (updated on webhook events)
   - **Fallback**: If cache miss, fetch from Neynar

2. **Cast Lookup by Hash**
   ```typescript
   // For viral engagement sync
   export async function lookUpCastByHashOrWarpcastUrl(
     castHash: string
   ): Promise<NeynarCast | null> {
     const client = getNeynarServerClient()
     const response = await client.lookUpCastByHashOrWarpcastUrl({
       identifier: castHash,
       type: 'hash',
     })
     
     return {
       hash: response.cast.hash,
       author: response.cast.author,
       text: response.cast.text,
       reactions: {
         likes_count: response.cast.reactions.likes_count,
         recasts_count: response.cast.reactions.recasts_count,
       },
       replies: {
         count: response.cast.replies.count,
       },
     }
   }
   ```
   - **Usage**: Viral engagement sync (background task)
   - **Frequency**: Every 5 minutes for active badge casts
   - **Rate Limit**: 100 requests/min (Neynar API limit)

3. **Publish Cast (Bot Reply)**
   ```typescript
   const client = getNeynarServerClient()
   const response = await client.publishCast({
     signerUuid: BOT_SIGNER_UUID,
     text: replyText,
     parent: parentCastHash,
     parentAuthorFid: authorFid,
     idem: `gmeowbased:${parentCastHash}`,  // Idempotency key
     embeds: [{ url: frameUrl }],            // Optional frame embed
   })
   
   return response.cast.hash  // New cast hash
   ```
   - **Usage**: Bot auto-reply generation
   - **Frequency**: ~50-100 casts/day
   - **Idempotency**: Neynar deduplicates based on `idem` key

4. **Bulk User Lookup (Optimization)**
   ```typescript
   // For leaderboard with usernames
   const response = await client.fetchBulkUsers({ 
     fids: [12345, 67890, 11111],
     viewer_fid: viewerFid  // Optional: for mutual follows
   })
   
   const users = response.users.map(u => ({
     fid: u.fid,
     username: u.username,
     pfp: u.pfp_url,
     neynarScore: u.power_badge ? 0.8 : 0.3,  // Approximate
   }))
   ```
   - **Usage**: Enrich leaderboard with usernames/avatars
   - **Batch Size**: 100 FIDs per request
   - **Cache**: Results cached for 5 minutes

### 5.5 Data Consistency (Neynar → Bot → Supabase)

**Data Flow**:
```
NEYNAR HUB (Source of Truth)
  ↓ Webhook Event
BOT WEBHOOK HANDLER
  ↓ Parse & Validate
SUPABASE CACHE (user_profiles, badge_casts)
  ↓ Query for Stats
BOT AUTO-REPLY
  ↓ Publish Cast
NEYNAR HUB (Reply Visible)
```

**Consistency Guarantees**:

1. **User Profile Consistency**
   ```typescript
   // Update profile on every webhook event
   await supabase
     .from('user_profiles')
     .upsert({
       fid: author.fid,
       display_name: author.display_name,
       neynar_score: author.power_badge ? 0.8 : calculateScore(author),
       updated_at: new Date().toISOString(),
     }, { onConflict: 'fid' })
   ```
   - **Eventual Consistency**: Profile updates may lag by 1-5 seconds
   - **Acceptable**: Bot uses cached data (1 hour TTL)
   - **Refresh**: Webhook events trigger cache updates

2. **Cast Engagement Consistency**
   ```typescript
   // Viral engagement sync runs every 5 minutes
   // Acceptable lag: 5 minutes for viral tier upgrades
   // Critical path: XP notifications sent immediately after upgrade
   ```

3. **XP Transaction Consistency**
   ```typescript
   // XP transactions are append-only (no updates)
   // Idempotency: unique constraint on (fid, source, metadata->castHash)
   // Prevents duplicate XP awards for same event
   ```

4. **Notification Delivery Consistency**
   ```typescript
   // Notifications sent via notifyWithXPReward()
   // Stored in user_notification_history immediately
   // Push notification sent asynchronously (fire & forget)
   // If push fails, notification still visible in app
   ```

**Conflict Resolution**:

1. **Concurrent Cast Replies**
   - Scenario: Two users mention bot simultaneously
   - Resolution: Rate limiter ensures sequential processing
   - Outcome: Both replies sent (no data loss)

2. **Duplicate Webhook Events**
   - Scenario: Neynar retries failed delivery
   - Resolution: Idempotency keys (`idem` field)
   - Outcome: Neynar deduplicates, only one cast published

3. **Stale Cache Reads**
   - Scenario: User profile updated, cache not refreshed
   - Resolution: Accept stale data (1 hour TTL acceptable)
   - Outcome: Bot may show slightly outdated stats

4. **Race Condition on XP Awards**
   - Scenario: Two viral tier upgrades process simultaneously
   - Resolution: Database transaction isolation + unique constraints
   - Outcome: Only one XP transaction succeeds, duplicate is rejected

### 5.6 Retry, Failure Handling, Rate Limits

**Neynar API Rate Limits**:
```typescript
// From Neynar documentation
const NEYNAR_RATE_LIMITS = {
  webhook_delivery: 'unlimited',  // Neynar sends as fast as events occur
  api_calls: 100,                  // 100 requests/min per API key
  cast_publish: 50,                // 50 casts/min per signer
  bulk_user_lookup: 100,           // 100 FIDs per request, 100 req/min
}
```

**Our Rate Limit Handling**:

1. **Webhook Rate Limit (IP-based)**
   ```typescript
   // Prevent webhook abuse
   const webhookLimiterConfig = {
     window: '1m',
     limit: 100,
   }
   
   const { success } = await rateLimit(ip, webhookLimiter)
   if (!success) {
     return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
   }
   ```

2. **User Reply Rate Limit**
   ```typescript
   // Prevent bot spam to single user
   const userRateLimitConfig = {
     windowMinutes: 60,
     maxReplies: 5,
   }
   
   const isRateLimited = await checkRateLimit(fid, config)
   if (isRateLimited) {
     return { 
       ok: true, 
       intent: 'rate-limited',
       text: "You've reached your question limit (5/hour).",
       meta: { rateLimitedUntil }
     }
   }
   ```

3. **Neynar API Rate Limit**
   ```typescript
   // @neynar/nodejs-sdk handles this automatically
   // Retry with exponential backoff if 429 received
   // Falls back to cached data if repeated failures
   ```

**Failure Handling**:

1. **Webhook Delivery Failure**
   ```typescript
   // Neynar's retry policy:
   // - Retry 1: 1 second delay
   // - Retry 2: 5 seconds delay
   // - Retry 3: 15 seconds delay
   // - After 3 failures: Event marked as lost
   
   // Our handling:
   // - Always return 200 OK to Neynar (acknowledge receipt)
   // - Log internal errors for manual review
   // - Critical operations (XP awards) logged to database
   ```

2. **Neynar API Call Failure**
   ```typescript
   try {
     const user = await neynar.fetchBulkUsers({ fids: [fid] })
   } catch (error) {
     if (error.status === 429) {
       // Rate limited - wait and retry
       await sleep(5000)
       return await fetchUserByFid(fid)  // Retry once
     }
     
     if (error.status === 404) {
       // User not found - return null
       return null
     }
     
     // Other errors - log and return cached data
     console.error('[neynar] API call failed:', error)
     return getCachedUser(fid)
   }
   ```

3. **Cast Publish Failure**
   ```typescript
   try {
     const response = await client.publishCast(castPayload)
     return { ok: true, hash: response.cast.hash }
   } catch (error) {
     const isDuplicate = error.status === 409
     
     if (isDuplicate) {
       // Idempotency key collision - already published
       console.log('[bot] Cast already published (duplicate idem key)')
       return { ok: true, skipped: 'duplicate' }
     }
     
     // Other errors - log and return failure
     console.error('[bot] Failed to publish cast:', error)
     return { 
       ok: false, 
       error: 'publish failed',
       meta: { text: replyText, castPayload }  // Save for manual retry
     }
   }
   ```

4. **Database Write Failure**
   ```typescript
   try {
     await supabase.from('xp_transactions').insert({ fid, amount, source })
   } catch (error) {
     if (error.code === '23505') {
       // Unique constraint violation - duplicate transaction
       console.log('[db] XP transaction already exists (idempotent)')
       return { ok: true, skipped: 'duplicate' }
     }
     
     // Other errors - log and alert
     console.error('[db] Failed to insert XP transaction:', error)
     await alertAdmin({ type: 'db_write_failure', error, data: { fid, amount, source } })
     throw error  // Propagate to caller
   }
   ```

**Monitoring & Alerts**:
```typescript
// Proposed monitoring (not yet implemented)
interface BotHealthMetrics {
  webhook_success_rate: number      // Target: >99%
  reply_success_rate: number         // Target: >95%
  avg_response_time_ms: number       // Target: <2000ms
  neynar_api_errors_per_hour: number // Target: <5
  db_write_errors_per_hour: number   // Target: <1
}

// Alert thresholds
const ALERT_THRESHOLDS = {
  webhook_success_rate: 0.95,      // Alert if <95%
  reply_failure_count: 10,          // Alert if 10+ failures in 5 min
  neynar_rate_limit_hits: 3,       // Alert if hit 3+ times in 1 hour
}
```

---

## 6. Enhancement Scope

### 6.1 Incremental Improvements (No New Product Requirements)

**Category 1: Smarter Auto-Reply Targeting**

1. **Context-Aware Question Detection**
   - **Current**: Keyword matching + question pattern
   - **Enhancement**: Add previous interaction context
   - **Example**: User asks "what's my rank?", bot replies with stats. User follows up with "and yesterday?" - bot understands context
   - **Implementation**:
     ```typescript
     const context = await getConversationContext(fid)
     const lastIntent = context.interactions[0]?.intent
     
     if (lastIntent === 'stats' && text.includes('yesterday')) {
       // Infer intent: stats from yesterday
       return { type: 'stats', timeframe: resolveYesterday() }
     }
     ```

2. **Multi-Turn Conversations**
   - **Current**: Each reply is independent (stateless)
   - **Enhancement**: Maintain conversation state for follow-up questions
   - **Example**: 
     - User: "@gmeowbased what quests are available?"
     - Bot: "3 quests: Daily GM, Guild Challenge, Referral Bonus"
     - User: "tell me more about the first one"
     - Bot: "Daily GM: Send a GM cast daily for +10 XP..."
   - **Implementation**:
     ```typescript
     interface ConversationState {
       activeQuests?: Quest[]
       lastStatsShown?: BotUserStats
       lastFrameType?: BotFrameType
     }
     
     // Store in Redis with 5-minute TTL
     await setCachedConversationState(fid, state)
     ```

3. **Intent Confidence Scoring**
   - **Current**: Binary detection (match or no match)
   - **Enhancement**: Score intents by confidence (0.0-1.0)
   - **Example**: Text "show stats" → 0.9 confidence for 'stats' intent
   - **Implementation**:
     ```typescript
     function detectIntentWithConfidence(text: string): {
       intent: AgentIntentType
       confidence: number
     } {
       const scores = {
         stats: calculateKeywordScore(text, ['stats', 'show me', 'how am i']),
         streak: calculateKeywordScore(text, ['streak', 'gm count', 'days']),
         quests: calculateKeywordScore(text, ['quest', 'mission', 'task']),
       }
       
       const maxIntent = Object.entries(scores).reduce((a, b) => 
         b[1] > a[1] ? b : a
       )
       
       return {
         intent: maxIntent[0] as AgentIntentType,
         confidence: maxIntent[1],
       }
     }
     ```

**Category 2: Context-Aware Replies Using User Stats**

4. **Personalized Greeting Based on Activity**
   - **Current**: Generic "gm @user! ..."
   - **Enhancement**: Vary greeting by recent activity
   - **Examples**:
     - Active today: "gm @user! Back for more? 🔥"
     - Inactive 7+ days: "Welcome back @user! You've been missed."
     - First interaction: "gm @user! New around here? Let me help!"
   - **Implementation**:
     ```typescript
     function selectGreeting(user: FarcasterUser, stats: BotUserStats): string {
       const daysSinceLastActivity = stats.daysSinceLastActivity
       const totalInteractions = stats.lifetimeInteractions
       
       if (totalInteractions === 0) {
         return `gm @${user.username}! First time? Let me show you around! 🎉`
       }
       
       if (daysSinceLastActivity === 0) {
         return `gm @${user.username}! Back for more? 🔥`
       }
       
       if (daysSinceLastActivity > 7) {
         return `Welcome back @${user.username}! You've been missed. ❤️`
       }
       
       return `gm @${user.username}!`
     }
     ```

5. **Quest Recommendations Based on Progress**
   - **Current**: Shows all active quests
   - **Enhancement**: Recommend quests user is most likely to complete
   - **Scoring Factors**:
     - 50% completion → Higher priority
     - Similar category to completed quests → Higher priority
     - Expiring soon → Higher priority
     - Easy difficulty + beginner user → Higher priority
   - **Implementation**: See `lib/bot-quest-recommendations.ts` (already exists!)

6. **Streak Encouragement**
   - **Current**: Shows streak count only
   - **Enhancement**: Encourage streak continuation
   - **Examples**:
     - Streak 1-2 days: "Keep it going! 💪"
     - Streak 7 days: "One week strong! 🔥"
     - Streak 30 days: "LEGENDARY streak! Don't break it now! 🏆"
     - Streak about to break: "Your 15-day streak expires in 3 hours! Send a GM to keep it alive!"
   - **Implementation**:
     ```typescript
     function formatStreakWithEncouragement(streak: number, lastGMTimestamp: number): string {
       const hoursSinceGM = (Date.now() - lastGMTimestamp) / (1000 * 60 * 60)
       const hoursUntilBreak = 24 - hoursSinceGM
       
       let encouragement = ''
       if (hoursUntilBreak < 3 && streak >= 7) {
         encouragement = ` ⚠️ Streak expires in ${Math.round(hoursUntilBreak)}h!`
       } else if (streak === 7) {
         encouragement = ' 🔥 One week!'
       } else if (streak === 30) {
         encouragement = ' 🏆 LEGENDARY!'
       } else if (streak >= 3) {
         encouragement = ' 💪 Keep it going!'
       }
       
       return `Your streak: ${streak} days${encouragement}`
     }
     ```

**Category 3: Better Notification Timing or Batching**

7. **Quiet Hours Respect**
   - **Current**: Notifications sent immediately
   - **Enhancement**: Respect user's quiet hours preferences
   - **Implementation**:
     ```typescript
     // Already supported in notification_preferences table!
     const prefs = await getNotificationPreferences(fid)
     
     if (prefs.quiet_hours_enabled) {
       const now = new Date()
       const userTime = convertToTimezone(now, prefs.quiet_hours_timezone)
       const hour = userTime.getHours()
       
       const start = parseTime(prefs.quiet_hours_start)  // e.g., 22:00
       const end = parseTime(prefs.quiet_hours_end)      // e.g., 08:00
       
       if (isInQuietHours(hour, start, end)) {
         // Batch notification for later delivery
         await scheduleNotificationForDelivery(notification, end)
         return { ok: true, batched: true }
       }
     }
     
     // Send immediately
     await sendPushNotification(notification)
     ```

8. **Notification Digest (Daily Summary)**
   - **Current**: Each notification sent individually
   - **Enhancement**: Batch low-priority notifications into daily digest
   - **Example**: "📬 Daily Summary: +50 XP from 3 activities, 2 new quest unlocks, guild moved up 3 ranks"
   - **Implementation**:
     ```typescript
     // Cron job runs daily at 9 AM user time
     async function sendDailyDigest(fid: number) {
       const yesterday = getYesterday()
       const notifications = await getUnsentNotifications(fid, yesterday)
       
       if (notifications.length === 0) return
       
       const summary = {
         totalXP: notifications.reduce((sum, n) => sum + (n.metadata?.xp || 0), 0),
         activities: notifications.filter(n => n.category === 'quest').length,
         achievements: notifications.filter(n => n.category === 'achievement').length,
       }
       
       const digestText = `📬 Daily Summary: +${summary.totalXP} XP from ${summary.activities} activities, ${summary.achievements} new achievements`
       
       await sendPushNotification({
         fid,
         title: 'Daily Summary',
         body: digestText,
         priority: 'medium',
       })
       
       // Mark notifications as sent
       await markNotificationsAsSent(notifications.map(n => n.id))
     }
     ```

9. **Smart Notification Throttling**
   - **Current**: All notifications sent if min_priority threshold met
   - **Enhancement**: Throttle rapid-fire notifications (max 3 per hour)
   - **Example**: User completes 5 quests in 10 minutes → Only send 3 notifications, batch rest
   - **Implementation**:
     ```typescript
     const recentNotifications = await getRecentNotifications(fid, { hours: 1 })
     
     if (recentNotifications.length >= 3) {
       // Throttle: Add to batch queue
       await batchNotificationForLater(notification)
       return { ok: true, throttled: true }
     }
     
     // Send immediately
     await sendPushNotification(notification)
     ```

**Category 4: Frame Selection Intelligence**

10. **Dynamic Frame Selection Based on User Context**
    - **Current**: Frame selected based on intent only
    - **Enhancement**: Consider user stats, preferences, and history
    - **Decision Matrix**:
      ```typescript
      function selectOptimalFrame(intent: AgentIntentType, context: UserContext): BotFrameType {
        // Priority 1: User has active quest in progress
        if (context.hasActiveQuest && intent === 'quests') {
          return 'quest-progress'  // Show progress bar, not quest list
        }
        
        // Priority 2: User has new achievement unlocked
        if (context.hasUnseenAchievement) {
          return 'achievement-showcase'  // Celebrate achievement
        }
        
        // Priority 3: User is in a guild
        if (context.isGuildMember && intent === 'guild') {
          return 'guild-leaderboard'  // Show guild rank
        }
        
        // Priority 4: User has low XP, show beginner quests
        if (context.totalXP < 500 && intent === 'quests') {
          return 'beginner-quests'  // Filter to easy quests
        }
        
        // Default: Intent-based frame
        return getDefaultFrameForIntent(intent)
      }
      ```

11. **A/B Testing for Frame Effectiveness**
    - **Current**: Static frame URLs
    - **Enhancement**: Track which frames lead to user engagement
    - **Metrics**: Click-through rate, completion rate, time spent
    - **Implementation**:
      ```typescript
      // Frame URL includes tracking params
      const frameUrl = `https://gmeowhq.art/frames/stats?fid=${fid}&source=bot&variant=A`
      
      // Track frame interactions in database
      await logFrameImpression({
        fid,
        frameType: 'stats',
        variant: 'A',
        castHash,
        timestamp: Date.now(),
      })
      
      // Analyze effectiveness
      const variantA_CTR = await getFrameCTR('stats', 'A')
      const variantB_CTR = await getFrameCTR('stats', 'B')
      
      // Auto-select best variant
      const preferredVariant = variantA_CTR > variantB_CTR ? 'A' : 'B'
      ```

---

**Next Document**: [FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md](FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md)  
**Topics**: Architecture Diagrams, Implementation Priorities, Actionable Recommendations
