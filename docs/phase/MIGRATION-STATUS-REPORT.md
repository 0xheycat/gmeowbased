# Supabase Migration Status Report 🔍
**Date**: November 16, 2025

---

## ⚠️ Migration Sync Issue Detected

Your local migrations are **out of sync** with the remote Supabase database.

### **The Problem**:
- **Remote database** has migrations that don't exist in your local `supabase/migrations/` folder
- **Local folder** has migrations that haven't been applied to remote database yet

---

## 📊 Migration Status

### **✅ Applied to Remote Database** (Already Live)
```
20251111083846 - partner_snapshots
20251111120000 - create_gmeow_rank_events
20251114000000 - fix_rank_events_timezone
```

### **⏳ Pending Local Migrations** (Need to Apply)
```
20250112000000 - add_onboarding_tracking.sql
20250115000000 - add_mint_queue_error_tracking.sql
20250115000000 - create_user_badges.sql (duplicate timestamp!)
202511110001   - create_gmeow_badge_adventure.sql
202511110002   - create_supabase_functions_helpers.sql
202511110003   - update_postgrest_schemas.sql
202511110004   - create_public_http_config_wrappers.sql
202511110005   - create_public_badge_adventure_view.sql
20251116000000 - fix_security_advisors.sql
20251116000001 - move_pgrowlocks_to_extensions.sql
20251116083604 - create_badge_casts_table.sql ⚠️ PHASE 5.7
20251116120000 - add_viral_bonus_xp_function.sql ⚠️ PHASE 5.8 (NEW!)
```

### **🔴 Remote-Only Migrations** (Applied via Dashboard/Other Source)
```
202511110001 - (applied remotely, also exists locally)
202511110002 - (applied remotely, also exists locally)
202511110003 - (applied remotely, also exists locally)
202511110004 - (applied remotely, also exists locally)
202511110005 - (applied remotely, also exists locally)
20251116105629 - Unknown (not in local folder)
20251116111328 - Unknown (not in local folder)
20251116130631 - Unknown (not in local folder)
20251116130951 - Unknown (not in local folder)
20251116143619 - Unknown (not in local folder)
```

---

## 🎯 What You Need for Phase 5.8

### **Critical Migration** ⚠️
```sql
File: supabase/migrations/20251116120000_add_viral_bonus_xp_function.sql

Creates:
1. increment_user_xp() RPC function - Atomic XP updates
2. xp_transactions table - Audit trail for all XP awards
3. Indexes on fid, created_at, source

Purpose: Enables viral bonus XP awards from webhook
Status: NOT YET APPLIED TO DATABASE ❌
```

### **Supporting Migration** (Phase 5.7)
```sql
File: supabase/migrations/20251116083604_create_badge_casts_table.sql

Creates:
1. badge_casts table - Tracks badge shares on Warpcast
2. Columns for viral metrics (likes_count, recasts_count, replies_count)
3. viral_bonus_xp column
4. Indexes on cast_hash, fid, created_at

Status: NOT YET APPLIED TO DATABASE ❌
```

---

## 🔧 How to Fix This

### **Option 1: Apply All Pending Migrations** (Recommended)
```bash
cd /home/heycat/Desktop/2025/Gmeowbased

# Apply all pending migrations
npx supabase db push

# If errors occur, see Option 2 below
```

**Pros**: Applies everything, brings database up-to-date  
**Cons**: May fail if duplicate timestamps or conflicts exist

---

### **Option 2: Apply Only Phase 5.8 Migration** (Quick Fix)
```bash
# Manually run the SQL in Supabase dashboard
# Go to: https://supabase.com/dashboard/project/<project-id>/sql/new

# Copy/paste content from:
# supabase/migrations/20251116120000_add_viral_bonus_xp_function.sql
```

**Pros**: Gets viral bonus working immediately  
**Cons**: Doesn't fix migration history, need to sync later

---

### **Option 3: Clean Sync** (Most Thorough)
```bash
# 1. Repair migration history (marks remote migrations as applied locally)
npx supabase migration repair --status applied 20251116105629
npx supabase migration repair --status applied 20251116111328
npx supabase migration repair --status applied 20251116130631
npx supabase migration repair --status applied 20251116130951
npx supabase migration repair --status applied 20251116143619

# 2. Mark duplicate local migrations as already applied
npx supabase migration repair --status applied 202511110001
npx supabase migration repair --status applied 202511110002
npx supabase migration repair --status applied 202511110003
npx supabase migration repair --status applied 202511110004
npx supabase migration repair --status applied 202511110005

# 3. Now push remaining migrations
npx supabase db push
```

**Pros**: Cleanest sync, migration history matches  
**Cons**: Most commands, takes longer

---

## 🚀 Recommended Action

**For Phase 5.8 to work, you MUST apply**:
1. ✅ `20251116083604_create_badge_casts_table.sql` (already exists in remote? Check)
2. ⚠️ `20251116120000_add_viral_bonus_xp_function.sql` (MUST APPLY)

### **Quick Start** (5 minutes):
```bash
# Option A: Try pushing all migrations
npx supabase db push

# Option B: If that fails, manually apply via SQL editor
# Copy/paste from: supabase/migrations/20251116120000_add_viral_bonus_xp_function.sql
```

---

## ✅ Verification

After applying migrations, verify they worked:

```sql
-- Check if RPC function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'increment_user_xp';

-- Check if xp_transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'xp_transactions'
);

-- Check if badge_casts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'badge_casts'
);
```

**Expected**: All 3 should return rows/TRUE

---

## 📝 Summary

**Status**: ⚠️ Phase 5.8 migrations **NOT APPLIED** yet

**Blocking Issue**: Migration history out of sync (remote has unknown migrations)

**Solution**: Apply pending migrations via `npx supabase db push` or manually via SQL editor

**Impact**: Viral bonus system won't work until `increment_user_xp()` function exists

**Next Step**: Choose Option 1, 2, or 3 above and apply migrations

---

**Questions?** Check:
- Supabase Dashboard: https://supabase.com/dashboard/project/<project-id>/sql/new
- Migration file: `/supabase/migrations/20251116120000_add_viral_bonus_xp_function.sql`
