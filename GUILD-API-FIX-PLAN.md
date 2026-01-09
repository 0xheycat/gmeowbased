# Guild API Fixes - Action Plan

## Summary
After audit, found that `guild_metadata` has mixed purpose:
- ✅ **Keep:** `description`, `banner` (off-chain features)
- ❌ **Remove:** `name` field (redundant - already on-chain)
- ❌ **Remove:** `guild_stats_cache` (fully redundant)
- ❌ **Remove:** `guild_analytics_cache` (fully redundant)

## Fix Strategy

### ✅ What's Already Good:
1. **Rate Limiting:** All routes use Upstash Redis
2. **Caching:** All expensive queries use `getCached()`
3. **guild_events:** Correctly used for activity feed only

### 🔴 What Needs Fixing:

#### Fix 1: Keep `guild_metadata` but clarify purpose
**Current Usage:**
```typescript
// app/api/guild/[guildId]/route.ts:303
.from('guild_metadata')
.select('guild_id, name, description, banner, created_at')
```

**Fixed Usage:**
```typescript
// Only query off-chain fields
.from('guild_metadata')
.select('description, banner')  // ❌ Remove 'name' - use Subsquid instead
```

**Reason:** `name` is on-chain (in smart contract), `description` and `banner` are off-chain only

---

#### Fix 2: Remove `guild_stats_cache` completely
**Current Usage:**
```typescript
// app/api/guild/list/route.ts:264
.from('guild_stats_cache')
```

**Replacement:**
```typescript
// Use Subsquid aggregation (already have guild data from GET_ALL_GUILDS query)
const stats = {
  totalPoints: guild.totalPoints,
  memberCount: guild.memberCount,
  level: guild.level
}
```

**Action:** Delete query, compute from Subsquid data

---

#### Fix 3: Remove `guild_analytics_cache` completely
**Current Usage:**
```typescript
// app/api/guild/[guildId]/analytics/route.ts:270
.from('guild_analytics_cache')
```

**Replacement:**
```typescript
// Use getGuildDepositAnalytics() (already implemented!)
const analytics = await getGuildDepositAnalytics(guildId, period)
```

**Action:** Already have the function, just remove Supabase fallback

---

## Implementation Order

### Step 1: Update guild_metadata queries (5 min)
Files:
- `app/api/guild/[guildId]/route.ts` (line 303)
- `app/api/guild/list/route.ts` (line 254)

Change:
```diff
- .select('guild_id, name, description, banner, created_at')
+ .select('description, banner')
```

### Step 2: Remove guild_stats_cache queries (10 min)
File:
- `app/api/guild/list/route.ts` (line 264)

Replace Supabase query with direct calculation from Subsquid data

### Step 3: Remove guild_analytics_cache fallback (5 min)
File:
- `app/api/guild/[guildId]/analytics/route.ts` (line 270)

Remove Supabase fallback, use only `getGuildDepositAnalytics()`

### Step 4: Test (30 min)
- [ ] Guild list page loads
- [ ] Guild detail page shows correct data
- [ ] Analytics page works
- [ ] No errors in console

### Step 5: Database cleanup (after 7 days monitoring)
```sql
-- Rename guild_metadata to clarify purpose
ALTER TABLE guild_metadata RENAME TO guild_off_chain_metadata;

-- Drop redundant name column
ALTER TABLE guild_off_chain_metadata DROP COLUMN name;

-- Drop fully redundant tables
DROP TABLE guild_stats_cache;
DROP TABLE guild_analytics_cache;
DROP TABLE guild_member_stats_cache;
```

---

## Total Time: ~1 hour development + testing
## Safe to deploy referral page after: ✅ Step 3 complete + 1 hour testing
