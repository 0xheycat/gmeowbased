# Guild Sync Refactor Complete ✅

**Date:** December 21, 2025  
**Route:** `app/api/cron/sync-guilds/route.ts`  
**Status:** Successfully refactored to use Subsquid + Supabase hybrid pattern

---

## 🎯 What Was Changed

### Before (Broken) ❌
```typescript
// Attempted to query non-existent Supabase tables
const { data: guilds } = await supabase.from('guilds').select('*')
// Error: relation "public.guilds" does not exist

const { count: memberCount } = await supabase
  .from('guild_members')
  .select('*', { count: 'exact', head: true })
// Error: relation "public.guild_members" does not exist

const { data: treasuryData } = await supabase
  .from('guild_treasury')
  .select('amount, transaction_type')
// Error: relation "public.guild_treasury" does not exist
```

### After (Refactored) ✅
```typescript
// Uses Subsquid for on-chain stats
import { getSubsquidClient } from '@/lib/subsquid-client'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

const subsquid = getSubsquidClient()
const supabase = getSupabaseAdminClient()

// 1. Get guild IDs from metadata table
const { data: guildMetadata } = await supabase
  .from('guild_metadata')
  .select('guild_id, name, description, banner')

// 2. For each guild, query Subsquid for on-chain stats
const guildStats = await subsquid.getGuildStats(metadata.guild_id)
// Returns: { guildId, memberCount, totalPoints, averagePoints, rank }

// 3. Record sync event for audit trail
await supabase.from('guild_events').insert({
  guild_id: metadata.guild_id,
  event_type: 'GUILD_UPDATED',
  metadata: {
    sync_source: 'subsquid',
    member_count: guildStats.memberCount,
    total_points: guildStats.totalPoints,
  },
})
```

---

## 🏗️ Architecture Understanding

### Data Sources
```
┌─────────────────────────────────────────────┐
│ BASE BLOCKCHAIN (Smart Contracts)          │
│ - Guild creation                            │
│ - Member joins/leaves                       │
│ - Treasury deposits/claims                  │
│ - Points accumulation                       │
└──────────────┬──────────────────────────────┘
               │ (emits events)
               ▼
┌─────────────────────────────────────────────┐
│ SUBSQUID INDEXER (gmeow-indexer)           │
│ - Processes blockchain events               │
│ - Pre-computes guild statistics             │
│ - Provides GraphQL endpoint                 │
│ - Source of truth for on-chain data         │
└──────────────┬──────────────────────────────┘
               │ (GraphQL queries)
               ▼
┌─────────────────────────────────────────────┐
│ API ROUTES (this file)                      │
│ - Query Subsquid for stats                  │
│ - Query Supabase for metadata               │
│ - Merge both sources                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ SUPABASE (Off-chain storage)               │
│ - guild_metadata (names, banners)           │
│ - guild_events (activity logs)              │
│ - user_profiles (FID, display names)        │
└─────────────────────────────────────────────┘
```

### Why This Pattern?

**Subsquid (On-chain data):**
- ✅ Pre-computed analytics (fast queries)
- ✅ Historical blockchain data indexed
- ✅ Real-time event processing
- ✅ Single source of truth for on-chain stats
- ❌ Read-only (can't write to indexer)

**Supabase (Off-chain data):**
- ✅ User-generated content (names, descriptions)
- ✅ Fast reads/writes for metadata
- ✅ Activity logs for UI display
- ✅ Type-safe TypeScript client
- ❌ Not suitable for blockchain event indexing

---

## 📊 Refactor Details

### Changes Made

**1. Imports Updated:**
```typescript
// Before:
import { createClient } from '@supabase/supabase-js'

// After:
import { getSupabaseAdminClient } from '@/lib/supabase/edge'
import { getSubsquidClient } from '@/lib/subsquid-client'
```

**2. Client Initialization:**
```typescript
// Before:
const supabase = createClient(supabaseUrl, supabaseKey)

// After:
const subsquid = getSubsquidClient()
const supabase = getSupabaseAdminClient()
if (!supabase) {
  return NextResponse.json({ error: 'Database error' }, { status: 500 })
}
```

**3. Data Fetching:**
```typescript
// Before: Query non-existent tables
await supabase.from('guilds').select('*')
await supabase.from('guild_members').select('*')
await supabase.from('guild_treasury').select('*')

// After: Query Subsquid for on-chain stats
const guildStats = await subsquid.getGuildStats(guildId)
// Returns pre-computed stats from blockchain indexer
```

**4. Purpose Changed:**
```typescript
// Before: Tried to maintain duplicate guild stats in Supabase
// After: Verifies Subsquid indexer is working + logs audit trail
```

### New Response Format
```json
{
  "success": true,
  "message": "Guild stats sync completed",
  "stats": {
    "total": 5,
    "synced": 5,
    "failed": 0
  },
  "duration": "234ms",
  "timestamp": "2025-12-21T12:00:00.000Z",
  "note": "Guild stats are indexed by Subsquid (read-only). This sync verifies data availability."
}
```

---

## ✅ Benefits

### Performance
- ⚡ **Faster queries**: Subsquid pre-computes guild stats
- 🔄 **No duplicate data**: Single source of truth (blockchain → Subsquid)
- 📉 **Reduced database load**: No unnecessary Supabase writes

### Correctness
- ✅ **No more errors**: Queries real tables (guild_metadata exists)
- ✅ **Type-safe**: Uses centralized, typed clients
- ✅ **Audit trail**: Logs sync events to guild_events

### Maintainability
- 📚 **Clear separation**: On-chain (Subsquid) vs off-chain (Supabase)
- 🏗️ **Hybrid pattern**: Standard architecture for blockchain apps
- 🔧 **Easier debugging**: Centralized client configuration

---

## 🧪 Testing

### Manual Test
```bash
# Trigger the cron job
curl -X POST http://localhost:3000/api/cron/sync-guilds \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Expected response:
{
  "success": true,
  "message": "Guild stats sync completed",
  "stats": {
    "total": 5,
    "synced": 5,
    "failed": 0
  },
  "duration": "234ms"
}
```

### Verification
```typescript
// Check Subsquid has guild stats
import { getSubsquidClient } from '@/lib/subsquid-client'

const subsquid = getSubsquidClient()
const stats = await subsquid.getGuildStats('1')
console.log(stats)
// { guildId: '1', memberCount: 42, totalPoints: 15000, ... }

// Check audit trail in Supabase
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

const supabase = getSupabaseAdminClient()
const { data } = await supabase
  .from('guild_events')
  .select('*')
  .eq('event_type', 'GUILD_UPDATED')
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## 📚 Related Files

**Modified:**
- `app/api/cron/sync-guilds/route.ts` - Refactored to use Subsquid

**Used:**
- `lib/subsquid-client.ts` - Subsquid GraphQL client
- `lib/supabase/edge.ts` - Centralized Supabase client
- `types/supabase.generated.ts` - Typed schema (has guild_metadata, guild_events)

**Documentation:**
- `HYBRID-ARCHITECTURE-EXPLAINED.md` - Architecture guide
- `SUPABASE-MIGRATION-COMPLETE.md` - Migration report
- `INFRASTRUCTURE-CONSOLIDATION-COMPLETE.md` - Infrastructure status

---

## 🎉 Summary

**Refactor Status:** ✅ Complete

- ✅ Removed queries to non-existent tables
- ✅ Implemented Subsquid + Supabase hybrid pattern
- ✅ Uses centralized, type-safe clients
- ✅ Maintains audit trail in guild_events
- ✅ All TypeScript errors resolved
- ✅ Zero compilation errors

**The route now correctly leverages the hybrid architecture!** 🚀
