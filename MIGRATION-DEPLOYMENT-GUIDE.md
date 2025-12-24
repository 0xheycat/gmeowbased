# Migration Deployment Guide

**Migration:** Full Points Naming Migration (OPTION B)  
**Scheduled:** Sunday, December 29, 2025, 2:00 AM - 8:00 AM UTC  
**Duration:** 4-6 hours (includes testing & verification)  
**Risk Level:** High (Breaking changes to API responses)

---

## 📅 PRE-DEPLOYMENT (Dec 22-28)

### Week 1: Database & Subsquid (Dec 22-24)

**Day 1 (Dec 22): ✅ COMPLETED**
- [x] Created all 7 Supabase migration SQL files
- [x] Created all 7 rollback SQL files
- [x] Applied all 7 migrations via Supabase MCP
- [x] Validated all column renames
- [x] Recreated `points_leaderboard` view
- [x] Updated indexes and comments

**Day 2 (Dec 23): Subsquid Models**
- [ ] Update `schema.graphql`:
  ```graphql
  type Guild @entity {
    treasuryPointsBalance: BigInt!  # was totalPoints
  }
  
  type Quest @entity {
    pointsAwarded: Int!  # was totalPointsAwarded
  }
  
  type DailyStats @entity {
    dailyPointsAwarded: BigInt!  # was totalPointsAwarded
  }
  ```
- [ ] Run `sqd codegen`
- [ ] Update processor mapping logic in `src/processor.ts`
- [ ] Test with `sqd process --from 0`
- [ ] Backup current Subsquid database

**Day 3 (Dec 24): Subsquid Re-indexing**
- [ ] Start re-index from block 0 (24h process)
- [ ] Monitor indexing progress
- [ ] Verify data consistency during indexing

### Week 2: Backend Code (Dec 25-27)

**Day 4 (Dec 25): unified-calculator.ts**
- [ ] Update `lib/unified-calculator.ts`:
  ```typescript
  interface TotalScore {
    pointsBalance: number;  // was blockchainPoints
    viralPoints: number;    // was viralXP
    questPoints: number;
    guildPoints: number;
    totalScore: number;
  }
  ```
- [ ] Update `calculateCompleteStats` function
- [ ] Run unit tests: `npm run test -- unified-calculator`

**Day 5 (Dec 26): API Routes**
- [ ] Update all API routes to use camelCase:
  ```typescript
  // OLD: { base_points, viral_xp, total_score }
  // NEW: { pointsBalance, viralPoints, totalScore }
  ```
- [ ] Search & replace in `app/api/`:
  ```bash
  grep -r "base_points" app/api/
  grep -r "viral_xp" app/api/
  grep -r "total_score" app/api/
  ```
- [ ] Update response serializers
- [ ] Run API tests: `npm run test:api`

**Day 6 (Dec 27): Backend Queries + Test Data**
- [ ] Update all Supabase queries:
  ```typescript
  // OLD: SELECT points, total_points_earned FROM user_profiles
  // NEW: SELECT points_balance, total_earned_from_gms FROM user_profiles
  ```
- [ ] Update TypeScript interfaces
- [ ] Clean up test data (FID 18139 only)
- [ ] Run full test suite: `npm run test`

### Day 7 (Dec 28): Final Preparation

**Pre-Deployment Checklist:**
- [ ] All 6 priorities completed on staging
- [ ] Full test suite passing (0 failures)
- [ ] Database backup created and verified
- [ ] Rollback scripts tested on staging
- [ ] Frontend team notified (API breaking changes)
- [ ] Monitoring dashboards prepared
- [ ] Team availability confirmed (Dec 29, 2-8 AM UTC)

**Create Database Backup:**
```bash
# Supabase MCP backup
supabase db dump -f backup_pre_migration_20251229.sql

# Verify backup size
ls -lh backup_pre_migration_20251229.sql

# Test backup restore on staging
supabase db reset --db-url <staging-url>
psql <staging-url> < backup_pre_migration_20251229.sql
```

**Communication Template:**
```
🚨 MAINTENANCE WINDOW SCHEDULED 🚨

Date: Sunday, December 29, 2025
Time: 2:00 AM - 8:00 AM UTC (6 hours)
Impact: Platform unavailable during migration

Changes:
✅ Database schema updated (contract naming)
✅ API field names changed (camelCase)
✅ Backend calculations optimized
⚠️ Breaking changes for API consumers

Please plan accordingly. Updates will be posted every hour.
```

---

## 🚀 DEPLOYMENT DAY (Dec 29)

### Phase 1: Preparation (1:45 AM - 2:00 AM)

**1:45 AM - Enable Maintenance Mode**
```bash
# Set environment variable
NEXT_PUBLIC_MAINTENANCE_MODE=true

# Redeploy frontend
vercel --prod
```

**1:50 AM - Verify Production Backup**
```bash
# Create final backup before changes
supabase db dump -f backup_prod_final_20251229_0150.sql

# Verify backup integrity
pg_restore --list backup_prod_final_20251229_0150.sql | head -20

# Upload to secure storage
aws s3 cp backup_prod_final_20251229_0150.sql s3://backups/
```

**1:55 AM - Team Sync**
- [ ] All team members online
- [ ] Monitoring dashboards open
- [ ] Rollback commands prepared
- [ ] Communication channels ready

### Phase 2: Priority 2-6 Deployment (2:00 AM - 5:00 AM)

**2:00 AM - Subsquid Update**
```bash
# Stop current indexer
sqd down

# Deploy new schema (already re-indexed)
sqd deploy

# Verify GraphQL API
curl http://localhost:4350/graphql -d '{"query": "{ guilds(limit:1) { treasuryPointsBalance } }"}'
```

**2:30 AM - Backend Code Deployment**
```bash
# Deploy updated backend
git checkout migration-full-naming
git pull origin migration-full-naming

# Install dependencies
npm install

# Build production
npm run build

# Deploy to Vercel
vercel --prod
```

**3:00 AM - Database Functions Update**
```sql
-- If using RPC functions, update them
CREATE OR REPLACE FUNCTION get_user_stats(user_fid bigint)
RETURNS TABLE (
  points_balance bigint,
  viral_points bigint,
  total_score bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upb.points_balance,
    upb.viral_points,
    upb.total_score
  FROM user_points_balances upb
  WHERE upb.fid = user_fid;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Testing & Validation (5:00 AM - 6:30 AM)

**5:00 AM - Smoke Tests**
```bash
# Test critical endpoints
curl https://gmeowbased.com/api/stats/complete/18139
curl https://gmeowbased.com/api/leaderboard/global
curl https://gmeowbased.com/api/viral/engagement
curl https://gmeowbased.com/api/guild/1/stats
curl https://gmeowbased.com/api/quests/active

# Verify response format (camelCase)
# Expected: { pointsBalance, viralPoints, totalScore }
```

**5:30 AM - Database Validation**
```sql
-- Verify no old column names exist
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (
    column_name LIKE '%base_points%' 
    OR column_name LIKE '%viral_xp%'
    OR column_name LIKE '%total_points%'
  )
  AND table_name IN (
    'user_profiles', 'badge_casts', 'quest_definitions',
    'unified_quests', 'user_points_balances', 'reward_claims',
    'referral_stats', 'points_transactions'
  );
-- Should return 0 rows
```

**6:00 AM - Feature Testing**

Test all 16 active features:
```bash
# Automated test suite
npm run test:e2e

# Manual verification checklist:
# - Dashboard loads with correct stats
# - Leaderboard displays properly
# - Quests show correct reward points
# - Guild stats accurate
# - Badge gallery functional
# - Notifications working
# - Profile stats correct
# - Viral tracker operational
# - Rewards system working
# - Points history accurate
# - Referrals tracked
# - Settings saved
# - Mobile responsive
# - Bot auto-reply functional
# - Notification bell working
# - Real-time updates working
```

**6:15 AM - Performance Check**
```bash
# Check API response times
time curl https://gmeowbased.com/api/stats/complete/18139

# Check database query performance
EXPLAIN ANALYZE 
SELECT points_balance, viral_points, total_score 
FROM user_points_balances 
WHERE fid = 18139;

# Verify indexes are being used
```

### Phase 4: Go-Live (6:30 AM - 7:00 AM)

**6:30 AM - Disable Maintenance Mode**
```bash
# Remove maintenance flag
NEXT_PUBLIC_MAINTENANCE_MODE=false

# Redeploy
vercel --prod

# Clear CDN cache
vercel env rm NEXT_PUBLIC_MAINTENANCE_MODE
```

**6:35 AM - Monitor Logs**
```bash
# Watch error logs
vercel logs --follow

# Monitor Supabase logs
supabase logs --follow

# Check Subsquid logs
sqd logs --follow
```

**6:45 AM - Announce Completion**
```
✅ MIGRATION COMPLETE

Platform is now live with updated naming system!

Changes:
✅ Database schema: Contract-aligned naming
✅ API responses: camelCase format
✅ Subsquid: Re-indexed from block 0
✅ All features: Tested and operational

Known improvements:
- Consistent terminology across all layers
- Better alignment with smart contract
- Improved developer experience
- Faster query performance (new indexes)

Thank you for your patience!
```

### Phase 5: Post-Deployment Monitoring (7:00 AM - 8:00 AM)

**Continuous Monitoring:**
- [ ] Error rate < 0.1%
- [ ] API response time < 500ms
- [ ] Database CPU < 70%
- [ ] No 500 errors in logs
- [ ] User reports reviewed
- [ ] Bot functioning correctly

**Verification Queries:**
```sql
-- Check data integrity
SELECT COUNT(*) FROM user_points_balances 
WHERE points_balance IS NULL OR viral_points IS NULL;
-- Should be 0

-- Check for negative values
SELECT COUNT(*) FROM user_points_balances 
WHERE guild_points_awarded < 0;
-- Should be 0

-- Verify leaderboard calculation
SELECT fid, points_balance, total_score 
FROM user_points_balances 
ORDER BY total_score DESC 
LIMIT 10;
-- Should show correct rankings
```

---

## 🚨 ROLLBACK PROCEDURE

**If Critical Issues Found:**

### Immediate Rollback (< 30 min)

**Step 1: Enable Maintenance Mode**
```bash
NEXT_PUBLIC_MAINTENANCE_MODE=true
vercel --prod
```

**Step 2: Rollback Database (10-15 min)**
```bash
# Restore from backup
psql $DATABASE_URL < backup_prod_final_20251229_0150.sql

# Or use Supabase MCP rollback migrations
supabase db reset
psql $DATABASE_URL < rollback_007_points_transactions.sql
psql $DATABASE_URL < rollback_006_referral_stats.sql
psql $DATABASE_URL < rollback_005_reward_claims.sql
psql $DATABASE_URL < rollback_004_user_points_balances.sql
psql $DATABASE_URL < rollback_003_quest_tables.sql
psql $DATABASE_URL < rollback_002_badge_casts.sql
psql $DATABASE_URL < rollback_001_user_profiles.sql
```

**Step 3: Rollback Code (5 min)**
```bash
# Revert to previous deployment
vercel rollback

# Or deploy previous commit
git checkout production
vercel --prod
```

**Step 4: Rollback Subsquid (10 min)**
```bash
# Deploy previous Subsquid version
git checkout subsquid-stable
sqd deploy
```

**Step 5: Verify Rollback**
```bash
# Test old endpoints
curl https://gmeowbased.com/api/stats/complete/18139
# Should return: { base_points, viral_xp, total_score }

# Verify database
psql $DATABASE_URL -c "SELECT points, total_points_earned FROM user_profiles LIMIT 1;"
```

**Step 6: Disable Maintenance Mode**
```bash
NEXT_PUBLIC_MAINTENANCE_MODE=false
vercel --prod
```

**Step 7: Post-Mortem**
- Document what went wrong
- Analyze root cause
- Update migration plan
- Schedule retry (if applicable)

### Rollback Decision Criteria:

**Immediate Rollback If:**
- Error rate > 5%
- API response time > 2 seconds
- Critical feature broken (dashboard, leaderboard)
- Database corruption detected
- More than 10 user complaints in first hour

**Can Continue If:**
- Minor UI issues (can be hotfixed)
- Single non-critical endpoint failing
- Performance degradation < 20%
- Less than 5 user complaints

---

## 📊 SUCCESS CRITERIA

**Migration Successful If:**
- [x] All 7 Supabase migrations applied
- [ ] All Subsquid models updated
- [ ] All API routes returning camelCase
- [ ] All backend queries using new column names
- [ ] Zero deprecated field names in codebase
- [ ] All 16 features operational
- [ ] Error rate < 0.1%
- [ ] API response time < 500ms
- [ ] No negative guild points
- [ ] Test data cleaned (FID 18139 only)
- [ ] Bot auto-reply working
- [ ] Notifications working
- [ ] Viral tracking accurate

---

## 📞 EMERGENCY CONTACTS

**On-Call Team (Dec 29, 1:00 AM - 9:00 AM UTC):**
- Backend Lead: [Name]
- Database Admin: [Name]
- Frontend Lead: [Name]
- DevOps: [Name]

**Communication Channels:**
- Primary: Slack #migration-war-room
- Secondary: Discord #dev-emergency
- Escalation: Phone tree

---

## 📝 POST-DEPLOYMENT TASKS

**Week Following Deployment (Dec 29 - Jan 5):**
- [ ] Monitor error logs daily
- [ ] Review performance metrics
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Update API documentation
- [ ] Archive migration files
- [ ] Update CHANGELOG.md
- [ ] Schedule team retrospective

**Documentation Updates:**
- [ ] Update README.md with new field names
- [ ] Update API docs with camelCase examples
- [ ] Update developer guides
- [ ] Create migration blog post (optional)

---

**Last Updated:** December 22, 2025  
**Next Review:** December 28, 2025 (final pre-deployment check)  
**Deployment:** Sunday, December 29, 2025, 2:00 AM UTC ⏰
