# Hybrid Architecture Understanding ✅

**Date:** December 21, 2025  
**Discovery:** Subsquid + Supabase Hybrid Pattern

---

## 🏗️ Architecture Pattern

Your application uses a **hybrid data architecture**:

### 1️⃣ **On-Chain Data** (Blockchain → Subsquid)
```
Smart Contracts (Base) 
  ↓ (emit events)
Subsquid Indexer (gmeow-indexer)
  ↓ (process & index)
GraphQL Endpoint (localhost:4350 / subsquid.io)
  ↓ (query)
lib/subsquid-client.ts
```

**Data Types:**
- Guild stats (member counts, total points, levels)
- Points transactions (on-chain history)
- Treasury operations (deposits, claims)
- GM rank events (activity tracking)
- Leaderboard rankings (pre-computed)

**Why Subsquid?**
- ✅ Pre-computed analytics (fast queries)
- ✅ Historical on-chain data indexed
- ✅ GraphQL API (type-safe queries)
- ✅ Real-time event processing
- ✅ No need for heavy database migrations

### 2️⃣ **Off-Chain Data** (Supabase)
```
User Actions
  ↓
API Routes
  ↓
Supabase Database (PostgreSQL)
  ↓
lib/supabase/edge.ts (typed client)
```

**Data Types:**
- User profiles (FID, wallet, display name, pfp)
- Guild metadata (names, descriptions, banners)
- Guild events (activity logs for UI)
- Notifications (user preferences, history)
- Quest definitions (templates, rewards)
- Badge templates (NFT metadata)

**Why Supabase?**
- ✅ Fast writes for user-generated content
- ✅ Real-time subscriptions (notifications)
- ✅ File storage (badges, avatars)
- ✅ Row-level security (RLS)
- ✅ Type-safe TypeScript client

---

## 🔄 Data Flow Examples

### Example 1: Guild Stats Query
```typescript
// ✅ CORRECT: Use Subsquid for on-chain stats
import { getGuildStats } from '@/lib/subsquid-client'

const stats = await getGuildStats(guildId)
// Returns: { memberCount, totalPoints, level, treasuryBalance }
// Source: Subsquid indexer (GraphQL)

// ✅ CORRECT: Use Supabase for metadata
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

const supabase = getSupabaseAdminClient()
const { data } = await supabase
  .from('guild_metadata')
  .select('name, description, banner')
  .eq('guild_id', guildId)
  .single()

// Merge both:
return {
  id: guildId,
  ...stats,        // On-chain data (Subsquid)
  ...data,         // Off-chain metadata (Supabase)
}
```

### Example 2: User Profile Query
```typescript
// ✅ CORRECT: Hybrid approach
import { getUserStats } from '@/lib/subsquid-client'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

// Get on-chain stats (points, rank, activity)
const stats = await getUserStats(walletAddress)
// Source: Subsquid (indexed from blockchain)

// Get off-chain profile (display name, avatar, preferences)
const supabase = getSupabaseAdminClient()
const { data: profile } = await supabase
  .from('user_profiles')
  .select('fid, display_name, avatar_url, bio')
  .eq('wallet_address', walletAddress)
  .single()

// Merge complete user data:
return {
  ...stats,      // On-chain: points, rank, guild bonus
  ...profile,    // Off-chain: display name, avatar, bio
}
```

---

## 🚫 Common Mistakes

### ❌ WRONG: Querying Supabase for on-chain data
```typescript
// This fails - tables don't exist in Supabase!
const { data } = await supabase.from('guilds').select('*')
const { data } = await supabase.from('guild_members').select('*')
const { data } = await supabase.from('points_transactions').select('*')

// Error: relation "public.guilds" does not exist
```

### ✅ CORRECT: Use Subsquid for on-chain data
```typescript
import { getGuildStats, getPointsTransactions } from '@/lib/subsquid-client'

const guildStats = await getGuildStats(guildId)
const transactions = await getPointsTransactions(walletAddress)
```

### ❌ WRONG: Querying Subsquid for user metadata
```typescript
// Subsquid doesn't have user profiles, display names, etc.
const profile = await subsquidClient.getUserProfile(fid) // Doesn't exist
```

### ✅ CORRECT: Use Supabase for user metadata
```typescript
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

const supabase = getSupabaseAdminClient()
const { data } = await supabase
  .from('user_profiles')
  .select('fid, display_name, avatar_url')
  .eq('fid', fid)
  .single()
```

---

## 📋 Data Source Reference

| Data Type | Source | Client | Example |
|-----------|--------|--------|---------|
| Guild stats (members, points) | Subsquid | `lib/subsquid-client.ts` | `getGuildStats()` |
| Guild metadata (name, banner) | Supabase | `lib/supabase/edge.ts` | `guild_metadata` table |
| Guild events (activity logs) | Supabase | `lib/supabase/edge.ts` | `guild_events` table |
| Points transactions | Subsquid | `lib/subsquid-client.ts` | `getPointsTransactions()` |
| User profiles (FID, display name) | Supabase | `lib/supabase/edge.ts` | `user_profiles` table |
| Leaderboard rankings | Subsquid | `lib/subsquid-client.ts` | `getLeaderboard()` |
| Badge templates | Supabase | `lib/supabase/edge.ts` | `badge_templates` table |
| Quest definitions | Supabase | `lib/supabase/edge.ts` | `quest_definitions` table |
| Notifications | Supabase | `lib/supabase/edge.ts` | `user_notification_history` |

---

## 🛠️ Migration Status

### Routes Using Subsquid (Read-Only)
- `lib/bot/core/auto-reply.ts` - Quest history, points, treasury
- `lib/notifications/viral.ts` - Viral milestones
- `app/api/*/leaderboard/*` - Rankings and scores

### Routes Using Supabase (Read/Write)
- ✅ `app/api/badge/upload-metadata/route.ts` - Centralized client
- ✅ `app/api/guild/[guildId]/metadata/route.ts` - Centralized client
- ✅ `app/api/guild/[guildId]/update/route.ts` - Centralized client
- ⚠️ `app/api/cron/sync-guilds/route.ts` - **Needs refactor** (trying to query Subsquid data from Supabase)

### Routes Needing Refactor
1. **`app/api/cron/sync-guilds/route.ts`**
   - Current: Queries `guilds`, `guild_members`, `guild_treasury` from Supabase ❌
   - Correct: Should use `getGuildStats()` from Subsquid ✅

---

## 📚 Reference Files

- **Subsquid Client:** `lib/subsquid-client.ts` (2134 lines)
  - GraphQL queries for on-chain data
  - Functions: `getGuildStats()`, `getUserStats()`, `getLeaderboard()`, etc.
  - Endpoint: `http://localhost:4350/graphql` (dev) or production URL

- **Supabase Client:** `lib/supabase/edge.ts`
  - Typed PostgreSQL client
  - Functions: `getSupabaseAdminClient()`, `getSupabaseClient()`
  - Tables: 36 typed tables in schema

- **Typed Schema:** `types/supabase.generated.ts`
  - Contains: `guild_metadata`, `guild_events`, `user_profiles`, etc.
  - Does NOT contain: `guilds`, `guild_members`, `guild_treasury` (on-chain data)

---

## ✅ Summary

**Your architecture is CORRECT and well-designed!**

- ✅ On-chain data indexed by Subsquid (fast, pre-computed)
- ✅ Off-chain metadata stored in Supabase (flexible, real-time)
- ✅ Hybrid queries merge both sources
- ✅ Type-safe clients for both systems
- ⚠️ One route (`sync-guilds`) needs refactoring to use Subsquid

**This is a modern, scalable blockchain application pattern!** 🎉
