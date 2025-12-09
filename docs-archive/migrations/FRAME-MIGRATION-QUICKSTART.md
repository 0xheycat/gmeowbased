# 🚀 Frame Migration Quick Start Guide

**Target:** Migrate from OnchainKit to Frog Framework  
**Timeline:** 2-6 days (December 5-11, 2025)  
**Status:** Ready to Execute

---

## ⚡ Quick Commands

### Install Frog Framework
```bash
cd /home/heycat/Desktop/2025/Gmeowbased
pnpm add frog hono
pnpm add -D @types/hono
```

### Apply Database Migration
```bash
# Connect to Supabase (staging first!)
# Run the migration script
psql $DATABASE_URL < supabase/migrations/20251205_frame_migration.sql

# Or use Supabase CLI
supabase db push
```

### Verify Migration
```bash
# Check if columns were added
psql $DATABASE_URL -c "
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'gmeow_rank_events' 
  AND column_name IN ('session_id', 'frame_type', 'interaction_type');
"

# Check if indexes were created
psql $DATABASE_URL -c "
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename IN ('gmeow_rank_events', 'frame_sessions') 
  AND indexname LIKE 'idx_%frame%';
"
```

---

## 📁 Files Created

| File | Purpose | Status |
|------|---------|--------|
| `FRAME-MIGRATION-PLAN.md` | Complete migration strategy (50+ pages) | ✅ Ready |
| `FRAME-MIGRATION-STATUS.md` | Current status & quick reference | ✅ Ready |
| `supabase/migrations/20251205_frame_migration.sql` | Database schema changes | ✅ Ready |
| `FRAME-MIGRATION-QUICKSTART.md` (this file) | Quick commands & cheat sheet | ✅ Ready |

---

## 🎯 Day-by-Day Checklist

### **Day 1: Foundation** (Dec 5)
```bash
# 1. Install Frog
pnpm add frog hono

# 2. Apply database migration (STAGING FIRST!)
psql $STAGING_DATABASE_URL < supabase/migrations/20251205_frame_migration.sql

# 3. Create base Frog app
mkdir -p app/api/frog/\[\[...routes\]\]
touch app/api/frog/\[\[...routes\]\]/route.tsx

# 4. Copy GM frame logic
# From: app/frame/gm/route.tsx
# To: app/api/frog/\[\[...routes\]\]/route.tsx

# 5. Test locally
pnpm dev
curl http://localhost:3000/api/frog/gm
```

### **Day 2: Security** (Dec 6)
```bash
# Add rate limiting
pnpm add @upstash/ratelimit @upstash/redis

# Test signature validation
npm run test -- frame-security.spec.ts

# Monitor logs
tail -f logs/frame-events.log
```

### **Day 3: Quests** (Dec 7)
```bash
# Migrate quest frames
# Copy from: app/frame/quest/[questId]/route.tsx
# To: app/api/frog/quest/[questId]/route.tsx

# Test quest frame
curl http://localhost:3000/api/frog/quest/1

# Check database events
psql $DATABASE_URL -c "
  SELECT * FROM gmeow_rank_events 
  WHERE frame_type = 'quest' 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

### **Day 4: Leaderboard** (Dec 8)
```bash
# Migrate leaderboard frames
# Test with filters
curl http://localhost:3000/api/frog/leaderboard?period=weekly&chain=base

# Check performance
npm run test:e2e -- leaderboard-frames.spec.ts
```

### **Day 5: Remaining Frames** (Dec 9)
```bash
# Migrate: badge, points, referral, stats, verify, guild
# Batch test all frames
npm run test:e2e -- all-frames.spec.ts
```

### **Day 6: Deploy** (Dec 10-11)
```bash
# 1. Run full test suite
npm run test && npm run test:e2e

# 2. Deploy to staging
vercel --prod --env staging

# 3. Test on staging
curl https://staging.gmeowhq.art/api/frog/gm

# 4. Gradual rollout
# - 10% traffic → monitor 1 hour
# - 50% traffic → monitor 2 hours  
# - 100% traffic → monitor 24 hours

# 5. Deprecate old routes (after 2 weeks)
```

---

## 🔐 Security Commands

### Test Signature Validation
```typescript
// Test in app/api/frog/[[...routes]]/route.tsx
import { validateFrameSignature } from '@/lib/frame-validation'

const isValid = await validateFrameSignature(request)
if (!isValid) {
  return c.error({ message: 'Invalid signature' })
}
```

### Check Rate Limiting
```bash
# Monitor rate limit logs
psql $DATABASE_URL -c "
  SELECT fid, COUNT(*) as requests, 
         COUNT(*) FILTER (WHERE rate_limited = true) as limited
  FROM gmeow_rank_events
  WHERE created_at > now() - interval '1 hour'
  GROUP BY fid
  HAVING COUNT(*) FILTER (WHERE rate_limited = true) > 0
  ORDER BY limited DESC;
"
```

### Monitor Security Events
```bash
# Check for invalid signatures
psql $DATABASE_URL -c "
  SELECT fid, event_type, created_at, 
         metadata->>'ip_address' as ip
  FROM gmeow_rank_events
  WHERE signature_valid = false
  AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC;
"
```

---

## 📊 Monitoring Queries

### Frame Usage Stats
```sql
-- Last 7 days usage by frame type
SELECT 
  frame_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT fid) as unique_users,
  AVG(duration_ms) as avg_duration
FROM gmeow_rank_events
WHERE frame_type IS NOT NULL
  AND created_at > now() - interval '7 days'
GROUP BY frame_type
ORDER BY total_events DESC;
```

### Quest Frame Performance
```sql
-- Quest views vs completions
SELECT 
  q.id,
  q.title,
  (q.frame_metadata->>'total_frame_views')::int as views,
  COUNT(qc.id) as completions,
  ROUND(COUNT(qc.id)::numeric / NULLIF((q.frame_metadata->>'total_frame_views')::numeric, 0) * 100, 2) as completion_rate
FROM unified_quests q
LEFT JOIN quest_completions qc ON q.id = qc.quest_id
WHERE q.frame_enabled = true
GROUP BY q.id, q.title, q.frame_metadata
ORDER BY views DESC
LIMIT 20;
```

### Active Sessions
```sql
-- Current active frame sessions
SELECT 
  frame_type,
  COUNT(*) as active_sessions,
  AVG(interaction_count) as avg_interactions
FROM frame_sessions
WHERE expires_at > now()
GROUP BY frame_type
ORDER BY active_sessions DESC;
```

### Error Tracking
```sql
-- Frame errors in last hour
SELECT 
  frame_type,
  COUNT(*) as error_count,
  array_agg(DISTINCT metadata->>'error') as error_messages
FROM gmeow_rank_events
WHERE event_type = 'frame-error'
  AND created_at > now() - interval '1 hour'
GROUP BY frame_type
ORDER BY error_count DESC;
```

---

## 🧪 Testing Commands

### Run Unit Tests
```bash
npm run test -- frame-routes
npm run test -- frame-validation
npm run test -- frame-security
```

### Run E2E Tests
```bash
# All frame tests
npm run test:e2e -- frames.spec.ts

# Specific frame type
npm run test:e2e -- quest-frames.spec.ts
npm run test:e2e -- leaderboard-frames.spec.ts

# Performance tests
npm run test:e2e -- frame-performance.spec.ts
```

### Load Testing
```bash
# Install k6 (if not installed)
brew install k6

# Run load test (1000 concurrent users)
k6 run tests/load/frame-load-test.js
```

---

## 🚨 Emergency Procedures

### Rollback Database Migration
```sql
-- EMERGENCY ONLY: Rollback frame migration
BEGIN;

-- Drop new columns
ALTER TABLE gmeow_rank_events 
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS frame_type,
  DROP COLUMN IF EXISTS interaction_type,
  DROP COLUMN IF EXISTS signature_valid,
  DROP COLUMN IF EXISTS rate_limited,
  DROP COLUMN IF EXISTS duration_ms,
  DROP COLUMN IF EXISTS render_time_ms;

-- Drop other columns similarly...

-- Drop indexes
DROP INDEX IF EXISTS idx_rank_events_session_id;
-- Drop other indexes...

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_frame_sessions();
DROP FUNCTION IF EXISTS update_user_frame_stats();
DROP FUNCTION IF EXISTS update_quest_frame_stats();

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_user_frame_stats ON gmeow_rank_events;
DROP TRIGGER IF EXISTS trigger_update_quest_frame_stats ON gmeow_rank_events;

COMMIT;
```

### Rollback Code (Revert to Old Frames)
```bash
# 1. Revert Frog migration
git revert <frog-migration-commit>

# 2. Redeploy old version
vercel --prod

# 3. Monitor old frame routes
curl https://gmeowhq.art/frame/gm

# 4. Notify users (if needed)
```

### Switch Traffic Back to Old Routes
```typescript
// In app/api/frog/[[...routes]]/route.tsx
// Add emergency redirect
export async function GET(req: Request) {
  // EMERGENCY: Redirect to old frame routes
  const url = new URL(req.url)
  const frameType = url.searchParams.get('type')
  return NextResponse.redirect(`${url.origin}/frame/${frameType}`)
}
```

---

## 📞 Troubleshooting

### Problem: Frames not rendering
```bash
# Check Frog app is running
curl http://localhost:3000/api/frog

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check logs
tail -f .next/server/app/api/frog/[[...routes]]/route.log
```

### Problem: Slow performance
```sql
-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%gmeow_rank_events%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'gmeow_rank_events'
AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

### Problem: High error rate
```bash
# Check error logs
psql $DATABASE_URL -c "
  SELECT 
    event_type,
    COUNT(*) as error_count,
    array_agg(metadata->>'error') as errors
  FROM gmeow_rank_events
  WHERE event_type = 'frame-error'
  AND created_at > now() - interval '1 hour'
  GROUP BY event_type;
"

# Check Sentry (if configured)
open https://sentry.io/organizations/gmeowbased/issues/
```

---

## 📚 Documentation Links

### Migration Docs
- **Complete Plan:** `/FRAME-MIGRATION-PLAN.md`
- **Status Summary:** `/FRAME-MIGRATION-STATUS.md`
- **Database Migration:** `/supabase/migrations/20251205_frame_migration.sql`

### External Resources
- [Frog Framework Docs](https://frog.fm/)
- [Farcaster Frames v2](https://docs.farcaster.xyz/frames/)
- [Hono.js Docs](https://hono.dev/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

### Internal APIs
- Quest API: `/app/api/quests/*`
- Leaderboard API: `/app/api/leaderboard-v2/route.ts`
- User API: `/app/api/user/*`

---

## ✅ Pre-Flight Checklist

Before starting migration:
- [ ] Read `FRAME-MIGRATION-PLAN.md` (complete guide)
- [ ] Read `FRAME-MIGRATION-STATUS.md` (current status)
- [ ] Backup production database
- [ ] Set up staging environment
- [ ] Install Frog framework locally
- [ ] Test SQL migration on staging
- [ ] Review security architecture
- [ ] Set up monitoring dashboards
- [ ] Prepare rollback plan
- [ ] Notify team of migration schedule

---

## 🎯 Success Criteria

Migration is successful when:
- [ ] All 9 frame types migrated
- [ ] 100% feature parity maintained
- [ ] Error rate < 0.1%
- [ ] Frame render time < 2s (p95)
- [ ] Database query time < 100ms (p95)
- [ ] Zero security incidents
- [ ] Test coverage > 80%
- [ ] Old routes deprecated after 2 weeks

---

**Quick Start Version:** 1.0  
**Created:** December 5, 2025  
**Ready to Execute:** ✅ Yes

---

## 🚀 START HERE

```bash
# Clone this guide to your local machine
cd /home/heycat/Desktop/2025/Gmeowbased

# Review migration plan
cat FRAME-MIGRATION-PLAN.md

# Install dependencies
pnpm add frog hono

# Apply database migration (STAGING FIRST!)
psql $STAGING_DATABASE_URL < supabase/migrations/20251205_frame_migration.sql

# Start development
pnpm dev

# You're ready to migrate! Follow Day 1 checklist above.
```

Good luck! 🎉
