# Migration Test Checklist

**Migration:** Full Points Naming Migration (OPTION B)  
**Date:** December 22, 2025  
**Status:** ✅ **ALL 7 SUPABASE MIGRATIONS COMPLETED**

---

## ✅ PRIORITY 1: SUPABASE SCHEMA - **COMPLETED**

### Migration 001: user_profiles ✅
- [x] Column `points` → `points_balance` 
- [x] Column `total_points_earned` → `total_earned_from_gms`
- [x] Column `xp` dropped (deprecated)
- [x] Index `idx_user_profiles_points_balance` created
- [x] Index `idx_user_profiles_total_earned` created
- [x] View `points_leaderboard` recreated (removed xp reference)
- [x] Column comments added

**Validation Query:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('points_balance', 'total_earned_from_gms');
```

### Migration 002: badge_casts ✅
- [x] Column `viral_bonus_xp` → `viral_bonus_points`
- [x] Index `idx_badge_casts_viral_bonus_points` created
- [x] Column comment added

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'badge_casts' AND column_name = 'viral_bonus_points';
```

### Migration 003: quest tables ✅
- [x] `quest_definitions.reward_xp` → `reward_points_awarded`
- [x] `unified_quests.reward_points` → `reward_points_awarded`
- [x] `unified_quests.total_earned_points` → `total_points_awarded`
- [x] Duplicate column `quest_definitions.reward_points` dropped
- [x] Indexes created on all renamed columns
- [x] Column comments added

**Validation Query:**
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('quest_definitions', 'unified_quests')
  AND column_name LIKE '%reward_points_awarded%' OR column_name LIKE '%total_points_awarded%';
```

### Migration 004: user_points_balances ✅
- [x] Column `base_points` → `points_balance`
- [x] Column `viral_xp` → `viral_points`
- [x] Column `guild_bonus` → `guild_points_awarded`
- [x] Column `total_points` → `total_score`
- [x] Indexes updated
- [x] Column comments added

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_points_balances' 
  AND column_name IN ('points_balance', 'viral_points', 'guild_points_awarded', 'total_score');
```

### Migration 005: reward_claims ✅
- [x] Column `viral_xp_claimed` → `viral_points_claimed`
- [x] Column `guild_bonus_claimed` → `guild_points_claimed`
- [x] Column `total_claimed` → `total_points_claimed`
- [x] Indexes updated
- [x] Column comments added

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'reward_claims' 
  AND column_name IN ('viral_points_claimed', 'guild_points_claimed', 'total_points_claimed');
```

### Migration 006: referral_stats ✅
- [x] Column `points_earned` → `points_awarded`
- [x] Index `idx_referral_stats_points_awarded` created
- [x] Column comment added

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'referral_stats' AND column_name = 'points_awarded';
```

### Migration 007: points_transactions ✅
- [x] Column `balance_after` → `points_balance_after`
- [x] Index `idx_points_transactions_points_balance_after` created
- [x] Column comments added (amount + points_balance_after)

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'points_transactions' AND column_name = 'points_balance_after';
```

---

## 🔲 PRIORITY 2: SUBSQUID MODELS

### Models to Update:
- [ ] `Guild.totalPoints` → `treasuryPointsBalance`
- [ ] `Quest.totalPointsAwarded` → `pointsAwarded`
- [ ] `DailyStats.totalPointsAwarded` → `dailyPointsAwarded`
- [ ] Deprecate `LeaderboardEntry` model (mixed layers)

### Steps:
1. [ ] Update schema.graphql
2. [ ] Run `sqd codegen`
3. [ ] Update processor mapping logic
4. [ ] Test with `sqd process`
5. [ ] **Re-index from block 0** (24h process)
6. [ ] Verify data consistency

**Validation:**
```bash
# Check Subsquid API
curl http://localhost:4350/graphql -H "Content-Type: application/json" \
  -d '{"query": "{ guilds(limit: 1) { treasuryPointsBalance } }"}'
```

---

## 🔲 PRIORITY 3: UNIFIED-CALCULATOR.TS

### Types to Update:
- [ ] `TotalScore.blockchainPoints` → `pointsBalance`
- [ ] `TotalScore.viralXP` → `viralPoints`
- [ ] Update `calculateCompleteStats` function signature

### Files:
- [ ] `lib/unified-calculator.ts`
- [ ] `lib/types/stats.ts` (if separate)

**Test:**
```typescript
// Ensure these work:
const stats = calculateCompleteStats({
  pointsBalance: 1000,  // ✅ new name
  viralPoints: 500,     // ✅ new name
  questPoints: 300,
  guildPoints: 200
});
```

---

## 🔲 PRIORITY 4: API ROUTES

### Routes to Update (5 renames):
- [ ] `/api/points/*` - All snake_case → camelCase
- [ ] `base_points` → `pointsBalance`
- [ ] `viral_xp` → `viralPoints`
- [ ] `total_score` → `totalScore`
- [ ] `rank_tier` → `rankTier`
- [ ] `is_guild_officer` → `isGuildOfficer`

### Files to Check:
```bash
grep -r "base_points\|viral_xp\|total_score" app/api/
```

**Test Endpoints:**
```bash
# Test after migration
curl http://localhost:3000/api/stats/complete/18139
# Should return: { pointsBalance, viralPoints, totalScore, ... }
```

---

## 🔲 PRIORITY 5: BACKEND QUERIES

### Supabase Queries to Update:
- [ ] All `SELECT points` → `SELECT points_balance`
- [ ] All `WHERE total_points` → `WHERE total_score`
- [ ] Update TypeScript interfaces
- [ ] Update Supabase RPC functions

### Search & Replace:
```bash
# Find all Supabase queries
grep -r "from('user_profiles')" app/
grep -r "from('user_points_balances')" app/
```

**Run Full Test Suite:**
```bash
npm run test
npm run test:integration
```

---

## 🔲 PRIORITY 6: TEST DATA

### Test User Cleanup:
- [ ] Use FID 18139 consistently across all tests
- [ ] Remove FID 602828 from test data
- [ ] Update `/api/test-infrastructure` endpoint
- [ ] Verify test data has no deprecated field names

**Test Data Validation:**
```sql
-- Ensure FID 18139 has clean data
SELECT * FROM user_profiles WHERE fid = 18139;
SELECT * FROM user_points_balances WHERE fid = 18139;
SELECT * FROM reward_claims WHERE fid = 18139;
```

---

## 🧪 COMPREHENSIVE TESTING

### Unit Tests:
- [ ] Test `unified-calculator.ts` with new field names
- [ ] Test API response serialization (camelCase)
- [ ] Test database query builders

### Integration Tests:
- [ ] Test complete stats calculation flow
- [ ] Test leaderboard generation
- [ ] Test viral points calculation
- [ ] Test guild points aggregation
- [ ] Test quest completion rewards

### API Endpoint Tests:
```bash
# Critical endpoints to test:
GET /api/stats/complete/:fid
GET /api/leaderboard/global
GET /api/viral/engagement
GET /api/guild/:id/stats
GET /api/quests/active
GET /api/profile/:fid
```

### Active Features (16 Pages):
- [ ] 📊 Dashboard (`/dashboard`)
- [ ] 🎯 Quests (`/quests`)
- [ ] 🏆 Leaderboard (`/leaderboard`)
- [ ] 👥 Guilds (`/guilds`)
- [ ] 🎨 Badge Gallery (`/badges`)
- [ ] 🔔 Notifications (`/notifications`)
- [ ] 📈 Profile Stats (`/profile/:fid`)
- [ ] 🚀 Viral Tracker (`/viral`)
- [ ] 🎁 Rewards (`/rewards`)
- [ ] 💰 Points History (`/points/history`)
- [ ] 🔗 Referrals (`/referrals`)
- [ ] ⚙️ Settings (`/settings`)
- [ ] 📱 Mobile View (all pages)
- [ ] 🤖 Bot auto-reply
- [ ] 🔔 Notification bell
- [ ] 📊 Real-time viral tracking

---

## 🚨 BREAKING CHANGES VALIDATION

### Frontend Coordination:
- [ ] Notify frontend team of API field name changes
- [ ] Provide updated TypeScript types
- [ ] Update API documentation
- [ ] Schedule coordinated deployment

### Rollback Plan:
- [ ] Database backup created: `backup_pre_migration_20251222.sql`
- [ ] Rollback scripts tested: `rollback_001` through `rollback_007`
- [ ] Emergency rollback procedure documented
- [ ] Team aware of rollback commands

---

## 📊 SUCCESS METRICS

After completing ALL priorities, verify:

- [x] ✅ All Supabase columns use snake_case contract names
- [ ] ⏳ All Subsquid models use exact contract names
- [ ] ⏳ All API responses use camelCase contract names
- [ ] ⏳ Zero usage of deprecated terms (blockchainPoints, viralXP, base_points, total_points)
- [ ] ⏳ Consistent test data (FID 18139 everywhere, FID 602828 removed)
- [ ] ⏳ No negative guild points
- [ ] ⏳ Metadata fields in all responses
- [ ] ⏳ All 16 active pages working
- [ ] ⏳ Bot auto-reply working
- [ ] ⏳ Notification bell working
- [ ] ⏳ Viral engagement tracking working
- [ ] ⏳ Multi-wallet aggregation working

---

## 🎯 CURRENT STATUS

**Phase:** Week 1 - Priority 1 Complete ✅  
**Next:** Priority 2 (Subsquid Models)  
**Deployment:** Sunday, December 29, 2025 (7 days)

**Priority 1 (Supabase Schema):** ✅ **COMPLETE**
- All 7 migrations applied successfully
- All indexes updated
- All views recreated
- All column comments added
- Validation queries passed

**Priority 2-6:** 🔲 **PENDING**
- Subsquid models
- unified-calculator.ts
- API routes
- Backend queries
- Test data

---

## 📋 DEPLOYMENT CHECKLIST

Pre-Deployment:
- [x] ✅ P1 migrations tested on staging
- [ ] ⏳ P2-P6 changes tested on staging
- [ ] Database backup created
- [ ] Frontend team notified
- [ ] Rollback scripts ready
- [ ] Monitoring dashboards prepared

During Deployment (Dec 29, 2:00-8:00 AM UTC):
- [ ] Maintenance mode enabled
- [ ] Database backup verified
- [ ] Execute Priority 2-6 changes
- [ ] Run comprehensive test suite
- [ ] Monitor error logs
- [ ] Test all 16 active pages
- [ ] Verify bot functionality
- [ ] Check notification system
- [ ] Validate viral tracking

Post-Deployment:
- [ ] 24-hour monitoring active
- [ ] Error logs reviewed
- [ ] Performance metrics checked
- [ ] User feedback collected
- [ ] Rollback plan ready (if needed)

---

**Last Updated:** December 22, 2025  
**Migration Progress:** 1/6 Priorities Complete (17%)  
**Deployment Window:** 7 days remaining
