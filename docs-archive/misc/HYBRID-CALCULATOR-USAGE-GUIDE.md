# Hybrid Calculator Usage Guide

**Quick Reference**: How to use the new hybrid scoring system

---

## 🚀 Quick Start

### **1. Calculate User Score**

```typescript
import { calculateHybridScore } from '@/lib/scoring/hybrid-calculator'

// Get complete score with breakdown
const score = await calculateHybridScore(
  12345,              // fid
  '0xabc123...'       // walletAddress
)

console.log(score.totalScore)     // 4250
console.log(score.breakdown)      // { basePoints: 1000, viralXP: 500, ... }
```

### **2. Get Category Score**

```typescript
import { calculateCategoryScore } from '@/lib/scoring/hybrid-calculator'

// Get score for specific category
const questScore = await calculateCategoryScore(
  'quest_masters',    // category
  12345,              // fid
  '0xabc123...'       // walletAddress
)

console.log(questScore)  // 1000 (just basePoints)
```

### **3. Generate Leaderboard**

```typescript
import { calculateBatchScores } from '@/lib/scoring/hybrid-calculator'

// Batch calculate for multiple users
const users = [
  { fid: 12345, walletAddress: '0xabc...' },
  { fid: 67890, walletAddress: '0xdef...' },
  // ... more users
]

const leaderboard = await calculateBatchScores(users)

// Returns sorted by totalScore with ranks
leaderboard.forEach(entry => {
  console.log(`#${entry.rank}: ${entry.fid} - ${entry.totalScore} points`)
})
```

---

## 📊 Score Breakdown

### **9 Components**

| Component | Source | Formula | Example |
|-----------|--------|---------|---------|
| `basePoints` | Supabase | Quest completions | 1000 |
| `viralXP` | Supabase | Badge cast engagement | 500 |
| `guildBonus` | Subsquid | Guild level × 100 | 300 |
| `referralBonus` | Subsquid | Referral count × 50 | 200 |
| `streakBonus` | Subsquid | GM streak × 10 | 150 |
| `badgePrestige` | Subsquid | Badge count × 25 | 125 |
| `tipPoints` | Supabase | Tip activity | 100 |
| `nftPoints` | Subsquid | NFT count × 100 | 200 |
| `guildBonusPoints` | Supabase | 10% member + 5% officer | 75 |
| **TOTAL** | | **Sum of all** | **2650** |

---

## 🎯 Category Mapping

### **Leaderboard Categories**

```typescript
// Map UI category names to score components
const categoryMap = {
  'all_pilots': 'totalScore',           // All 9 components
  'quest_masters': 'basePoints',        // Quest completions
  'viral_legends': 'viralXP',           // Cast engagement
  'guild_heroes': 'guildBonus + guildBonusPoints', // Guild bonuses
  'referral_champions': 'referralBonus', // Referrals
  'streak_kings': 'streakBonus',        // GM streaks
  'badge_collectors': 'badgePrestige',  // Badge count
  'tip_lords': 'tipPoints',             // Tip activity
  'nft_holders': 'nftPoints',           // NFT ownership
}
```

---

## 🔌 API Integration Examples

### **Example 1: Single User Profile**

```typescript
// app/api/user/[fid]/route.ts
import { calculateHybridScore } from '@/lib/scoring/hybrid-calculator'
import { getWalletFromFid } from '@/lib/supabase/queries/gm'

export async function GET(request, { params }) {
  const { fid } = params
  const walletAddress = await getWalletFromFid(Number(fid))
  
  const score = await calculateHybridScore(Number(fid), walletAddress)
  
  return Response.json({
    fid,
    walletAddress,
    totalScore: score.totalScore,
    rank: score.rank,
    breakdown: score.breakdown,
  })
}
```

### **Example 2: Leaderboard (All Pilots)**

```typescript
// app/api/leaderboard/route.ts
import { calculateBatchScores } from '@/lib/scoring/hybrid-calculator'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  
  // Get all users with FID mapping
  const { data: users } = await supabase
    .from('user_profiles')
    .select('farcaster_fid, wallet_address')
    .not('wallet_address', 'is', null)
  
  const formattedUsers = users.map(u => ({
    fid: u.farcaster_fid,
    walletAddress: u.wallet_address
  }))
  
  const leaderboard = await calculateBatchScores(formattedUsers)
  
  return Response.json(leaderboard.slice(0, 100)) // Top 100
}
```

### **Example 3: Category Leaderboard**

```typescript
// app/api/leaderboard/category/[type]/route.ts
import { calculateBatchScores, calculateCategoryScore } from '@/lib/scoring/hybrid-calculator'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  const { type } = params // 'quest_masters', 'viral_legends', etc.
  
  const supabase = createClient()
  const { data: users } = await supabase
    .from('user_profiles')
    .select('farcaster_fid, wallet_address')
    .not('wallet_address', 'is', null)
  
  // Calculate full scores
  const formattedUsers = users.map(u => ({
    fid: u.farcaster_fid,
    walletAddress: u.wallet_address
  }))
  
  const scores = await calculateBatchScores(formattedUsers)
  
  // Extract category score
  const categoryLeaderboard = scores.map(score => ({
    fid: score.fid,
    walletAddress: score.walletAddress,
    categoryScore: getCategoryValue(type, score.breakdown),
  })).sort((a, b) => b.categoryScore - a.categoryScore)
  
  return Response.json(categoryLeaderboard.slice(0, 100))
}

function getCategoryValue(category: string, breakdown: any) {
  switch (category) {
    case 'quest_masters': return breakdown.basePoints
    case 'viral_legends': return breakdown.viralXP
    case 'guild_heroes': return breakdown.guildBonus + breakdown.guildBonusPoints
    case 'referral_champions': return breakdown.referralBonus
    case 'streak_kings': return breakdown.streakBonus
    case 'badge_collectors': return breakdown.badgePrestige
    case 'tip_lords': return breakdown.tipPoints
    case 'nft_holders': return breakdown.nftPoints
    default: return breakdown.totalScore
  }
}
```

### **Example 4: Frame Handler Integration**

```typescript
// app/api/frame/route.tsx
import { calculateCategoryScore } from '@/lib/scoring/hybrid-calculator'
import { getWalletFromFid } from '@/lib/supabase/queries/gm'

export async function POST(request: Request) {
  const body = await request.json()
  const { untrustedData } = body
  const fid = untrustedData.fid
  
  // Get wallet address from FID
  const walletAddress = await getWalletFromFid(fid)
  
  if (type === 'leaderboard_quest') {
    // Quest Masters category frame
    const score = await calculateCategoryScore('quest_masters', fid, walletAddress)
    
    return new Response(
      `<html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://gmeow.xyz/frames/quest-masters/${fid}" />
          <meta property="og:image" content="https://gmeow.xyz/frames/quest-masters/${fid}" />
          <meta property="fc:frame:button:1" content="Quest Score: ${score}" />
        </head>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
  
  // ... other frame types
}
```

---

## 🧪 Testing Examples

### **Test 1: Verify Components**

```typescript
// Test each component calculates correctly
const score = await calculateHybridScore(12345, '0xabc...')

console.assert(score.breakdown.basePoints >= 0, 'basePoints should be >= 0')
console.assert(score.breakdown.viralXP >= 0, 'viralXP should be >= 0')
console.assert(score.totalScore === Object.values(score.breakdown).reduce((a, b) => a + b, 0),
  'totalScore should equal sum of breakdown')
```

### **Test 2: Compare with Old System**

```typescript
// Compare hybrid calculator with old leaderboard_calculations table
const supabase = createClient()

const { data: oldScore } = await supabase
  .from('leaderboard_calculations')
  .select('*')
  .eq('farcaster_fid', 12345)
  .single()

const newScore = await calculateHybridScore(12345, oldScore.address)

// Compare totals (should be close, might have small differences)
const diff = Math.abs(oldScore.total_score - newScore.totalScore)
console.log(`Score difference: ${diff} (${diff < 50 ? 'PASS' : 'FAIL'})`)
```

### **Test 3: Performance Benchmark**

```typescript
// Test batch processing performance
const users = Array.from({ length: 100 }, (_, i) => ({
  fid: 10000 + i,
  walletAddress: `0x${i.toString(16).padStart(40, '0')}`
}))

console.time('calculateBatchScores')
const scores = await calculateBatchScores(users)
console.timeEnd('calculateBatchScores')

// Should complete in < 5 seconds for 100 users
```

---

## 🔧 Troubleshooting

### **Issue: Missing FID Mapping**

```typescript
// If wallet address not found for FID
const walletAddress = await getWalletFromFid(fid)
if (!walletAddress) {
  return Response.json({ error: 'User not found' }, { status: 404 })
}
```

### **Issue: Supabase Query Fails**

```typescript
// Handle Supabase errors gracefully
async function getSupabaseStats(fid: number) {
  try {
    const { data, error } = await supabase.from('quest_completions')...
    if (error) throw error
    return data
  } catch (error) {
    console.error('Supabase error:', error)
    return { questCompletions: 0, castEngagement: 0, ... } // Default values
  }
}
```

### **Issue: Subsquid Query Slow**

```typescript
// Add caching for Subsquid queries
import { unstable_cache } from 'next/cache'

const getCachedSubsquidStats = unstable_cache(
  async (walletAddress) => getSubsquidStats(walletAddress),
  ['subsquid-stats'],
  { revalidate: 60 } // 1 minute cache
)
```

---

## 📝 TypeScript Types

```typescript
export interface ScoreBreakdown {
  basePoints: number          // Quest completions
  viralXP: number             // Badge cast engagement
  guildBonus: number          // Guild level * 100
  referralBonus: number       // Referral count * 50
  streakBonus: number         // GM streak * 10
  badgePrestige: number       // Badge count * 25
  tipPoints: number           // Tip activity
  nftPoints: number           // NFT rewards
  guildBonusPoints: number    // 10% member + 5% officer
}

export interface LeaderboardScore {
  totalScore: number
  breakdown: ScoreBreakdown
  fid: number
  walletAddress: string
  rank?: number
}
```

---

## 🎯 Best Practices

1. **Always cache results** - Leaderboard calculation is expensive
2. **Batch when possible** - Use `calculateBatchScores()` for leaderboards
3. **Handle missing data** - Not all users have all data sources
4. **Validate FID mapping** - Always check wallet address exists
5. **Monitor performance** - Log query times, optimize slow queries

---

## 📚 Related Documentation

- [HYBRID-ARCHITECTURE-IMPLEMENTATION-COMPLETE.md](./HYBRID-ARCHITECTURE-IMPLEMENTATION-COMPLETE.md) - Full implementation details
- [FRAME-SYSTEM-COMPREHENSIVE-AUDIT.md](./FRAME-SYSTEM-COMPREHENSIVE-AUDIT.md) - Architecture overview
- [SUBSQUID-SUPABASE-MIGRATION-PLAN.md](./SUBSQUID-SUPABASE-MIGRATION-PLAN.md) - Original hybrid plan
