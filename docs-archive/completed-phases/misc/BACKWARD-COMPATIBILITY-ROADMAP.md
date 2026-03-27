# Backward Compatibility & Deprecation Roadmap

**Last Updated:** December 23, 2025  
**Migration Started:** December 22, 2025  
**Deprecation Window:** 6 months (through June 2026)

## Current Status: V1 API (Dual Support)

The system currently provides **BOTH** old and new field names for maximum backward compatibility.

### Dual-Name Support

| Old Name (Deprecated) | New Name (Active) | Status |
|----------------------|-------------------|--------|
| `base_points` | `points_balance` | ✅ Both supported |
| `viral_xp` | `viral_points` | ✅ Both supported |
| `guild_bonus` | `guild_points_awarded` | ✅ Both supported |
| `total_points` | `total_score` | ✅ Both supported |

### Implementation Locations

**Backend Services:**
```typescript
// lib/leaderboard/leaderboard-service.ts
return {
  points_balance: basePoints,       // ✅ New name (primary)
  base_points: basePoints,          // ⚠️ Deprecated alias
  viral_points: viralBonus,         // ✅ New name (primary)
  viral_xp: viralBonus,             // ⚠️ Deprecated alias
  guild_points_awarded: guildBonus, // ✅ New name (primary)
  guild_bonus: guildBonus,          // ⚠️ Deprecated alias
}
```

**API Responses:**
```typescript
// app/api/guild/[guildId]/members/route.ts
interface GuildMember {
  leaderboardStats?: {
    total_score: number,
    base_points: number,           // Legacy: mapped from points_balance
    viralPoints: number,           // Legacy: mapped from viral_points
    guild_bonus_points: number,    // Legacy: mapped from guild_points_awarded
  }
}
```

**Database Schema:**
```sql
-- user_points_balances table (migrated)
CREATE TABLE user_points_balances (
  fid BIGINT PRIMARY KEY,
  points_balance BIGINT,          -- ✅ New column name
  viral_points BIGINT,            -- ✅ New column name
  guild_points_awarded BIGINT,    -- ✅ New column name
  total_score BIGINT GENERATED,   -- ✅ New column name
  ...
);
-- Old column names removed via migration 20251222_004
```

## Deprecation Timeline

### Phase 1: Dual Support (Current - June 2026)
**Duration:** 6 months  
**Status:** ✅ Active

**What's Available:**
- All APIs return both old and new field names
- Database uses new schema only
- Old names are aliases that point to new data
- No breaking changes for existing clients

**Example Response:**
```json
{
  "points_balance": 1000,    // ✅ Use this
  "base_points": 1000,       // ⚠️ Deprecated, but still works
  "viral_points": 500,       // ✅ Use this
  "viral_xp": 500,           // ⚠️ Deprecated, but still works
  "total_score": 1500        // ✅ Use this
}
```

**Migration Actions for Consumers:**
1. Update frontend code to use new field names
2. Update API clients to use new field names
3. Test with new names while old names still work
4. Monitor deprecation warnings (if logging enabled)

### Phase 2: Deprecation Warnings (April 2026)
**Duration:** 2 months  
**Status:** 🔵 Planned

**What Changes:**
- Add console warnings when old field names are accessed
- Update API documentation to mark old fields as deprecated
- Email notifications to API consumers
- Dashboard banner for logged-in users

**Warning Format:**
```typescript
console.warn(
  '[DEPRECATION] Field "base_points" is deprecated. Use "points_balance" instead. ' +
  'Support for old field names will be removed in V2 API (July 2026).'
)
```

### Phase 3: V2 API Launch (July 2026)
**Duration:** Ongoing  
**Status:** 🔵 Planned

**Breaking Changes:**
- Remove all old field name aliases
- V2 endpoints: `/api/v2/*`
- V1 endpoints: `/api/v1/*` (deprecated, redirects to v2)

**V2 Response (No Legacy Fields):**
```json
{
  "points_balance": 1000,
  "viral_points": 500,
  "guild_points_awarded": 200,
  "total_score": 1700
}
```

**Migration Path:**
1. V1 API continues working with redirects
2. Clients update to use `/api/v2/*` endpoints
3. V1 API sunsets after 3 months (October 2026)

### Phase 4: V1 API Sunset (October 2026)
**Duration:** N/A  
**Status:** 🔵 Planned

**What Happens:**
- V1 API endpoints return 410 Gone
- All clients must use V2 API
- Old field names completely removed from codebase

## Consumer Action Items

### For Frontend Developers

**Immediate (Before April 2026):**
```typescript
// ❌ Update this code:
const points = stats.base_points
const xp = stats.viral_xp

// ✅ To this:
const points = stats.points_balance
const xp = stats.viral_points
```

**Testing:**
1. Search codebase for old field names
2. Update all references to new names
3. Test in staging environment
4. Deploy before April 2026 deprecation warnings

### For API Consumers

**Immediate (Before April 2026):**
```javascript
// ❌ Update API client code:
fetch('/api/profile/18139')
  .then(res => res.json())
  .then(data => {
    console.log(data.base_points)  // Old name
  })

// ✅ To use new names:
fetch('/api/profile/18139')
  .then(res => res.json())
  .then(data => {
    console.log(data.points_balance)  // New name
  })
```

**Before July 2026:**
```javascript
// Update API endpoints from V1 to V2
const API_BASE = 'https://gmeow.xyz/api/v2'  // Update from /api to /api/v2
```

### For Database Queries

**Already Complete:**
- All database queries use new column names
- No action required for database layer
- Old migrations rolled back automatically

### For Third-Party Integrations

**If you're consuming our API:**
1. Subscribe to deprecation announcements
2. Update integration to use new field names
3. Test with V2 API beta (available June 2026)
4. Migrate before October 2026 V1 sunset

## Rollback Plan

If critical issues arise during migration:

### Rollback Database Schema
```bash
# Run rollback migration (if needed)
npm run supabase migration rollback 20251222_004_rename_user_points_balances
```

### Rollback API Changes
```typescript
// Temporarily restore old-only field names
// (Not recommended - causes confusion)
return {
  base_points: basePoints,      // Restore old name
  // points_balance: basePoints  // Comment out new name
}
```

**Note:** Rollback is NOT recommended after April 2026. Plan migrations carefully.

## Monitoring & Metrics

### Track Migration Progress
```sql
-- Count API calls using old vs new field names
SELECT 
  endpoint,
  COUNT(*) FILTER (WHERE request_body LIKE '%base_points%') as old_name_usage,
  COUNT(*) FILTER (WHERE request_body LIKE '%points_balance%') as new_name_usage,
  COUNT(*) as total_calls
FROM api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY endpoint;
```

### Success Metrics
- **Target:** 95% of API calls use new field names by June 2026
- **Monitor:** Weekly reports on old field name usage
- **Alert:** If old field usage increases (indicates regression)

## Communication Plan

### December 2025 (Current)
- ✅ Internal migration complete
- ✅ Documentation updated
- ✅ Backward compatibility active

### February 2026
- 📧 Email to all API consumers
- 📝 Blog post announcing deprecation timeline
- 📊 Dashboard notifications for users

### April 2026
- ⚠️ Console warnings enabled
- 📧 Reminder emails to consumers still using old names
- 📊 Migration progress dashboard

### June 2026
- 🎉 V2 API beta launch
- 📧 Final migration reminder
- 🔔 In-app notifications

### July 2026
- 🚀 V2 API general availability
- 🔄 V1 API redirects to V2
- 📧 V1 sunset announcement (3-month notice)

### October 2026
- 🛑 V1 API sunset
- 🎯 100% migration complete

## FAQ

**Q: Can I use both old and new names in the same API call?**  
A: Yes, during Phase 1 (through June 2026). But use only new names for consistency.

**Q: What happens if I don't migrate before July 2026?**  
A: V1 API will redirect to V2, but your code may break if it expects old field names. Migrate early!

**Q: Will database queries break?**  
A: No. Database already uses new column names. Application code handles the mapping.

**Q: How do I know if my code uses old names?**  
A: Search codebase for: `base_points`, `viral_xp`, `guild_bonus`, `total_points`

**Q: Can I opt-in to V2 API early?**  
A: Yes! Beta access available June 2026. Contact support to enroll.

---

**Questions?** Open an issue or contact: dev@gmeow.xyz  
**Latest Updates:** Check CHANGELOG.md for migration announcements
