# Subsquid Re-Index Guide - Priority 2 Complete

**Date:** December 22, 2025  
**Reason:** Schema field renames (Guild.treasuryPoints, Quest.pointsAwarded, DailyStats.dailyPointsAwarded)  
**Duration:** ~24 hours (block 39270005 to latest)  
**Status:** Code ready, database needs re-creation

---

## 🚨 WHY RE-INDEX IS CRITICAL

**Problem:** Subsquid stores data using schema field names as database columns.

**Current State:**
- ✅ Code updated (schema.graphql, main.ts, models)
- ✅ Build passing (0 errors)
- ❌ Database has OLD column names (`totalPoints`, `totalPointsAwarded`)
- ❌ NEW columns don't exist yet (`treasuryPoints`, `pointsAwarded`, `dailyPointsAwarded`)

**Solution:** Drop database → Recreate → Re-index from block 0

---

## ✅ PRE-FLIGHT CHECKLIST

### 1. Code Verification ✅
- [x] schema.graphql updated (3 field renames)
- [x] main.ts updated (8 references)
- [x] `npx squid-typeorm-codegen` ran successfully
- [x] `npm run build` passed (0 errors)

### 2. Environment Check ✅
```bash
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# Verify .env file exists
cat .env | grep -E "DB_NAME|RPC_BASE_HTTP"

# Expected output:
# DB_NAME=squid
# RPC_BASE_HTTP=https://mainnet.base.org
```

### 3. Backup Current Data (OPTIONAL)
```bash
# Only if you want to preserve old data for comparison
pg_dump -U postgres squid > backup_before_reindex_$(date +%Y%m%d).sql
```

---

## 🔧 RE-INDEX PROCEDURE

### Step 1: Stop Running Processor
```bash
# If processor is running in background, stop it
pkill -f "node.*main.js" || echo "No processor running"
```

### Step 2: Drop Old Database
```bash
# Drop existing database (removes all old data)
psql -U postgres -c "DROP DATABASE IF EXISTS squid CASCADE;"
echo "✅ Old database dropped"
```

### Step 3: Create Fresh Database
```bash
# Create new empty database
psql -U postgres -c "CREATE DATABASE squid;"
echo "✅ Fresh database created"
```

### Step 4: Apply Schema Migrations
```bash
# Generate and apply migrations from new schema
npm run db:migrate

# This will:
# - Read schema.graphql
# - Generate TypeORM migrations
# - Create tables with NEW field names (treasuryPoints, pointsAwarded, dailyPointsAwarded)
```

**Expected Output:**
```
✓ Migrations applied successfully
✓ Database schema ready
```

### Step 5: Verify Schema
```bash
# Verify new columns exist
psql -U postgres -d squid -c "\d guild" | grep treasury
psql -U postgres -d squid -c "\d quest" | grep points_awarded
psql -U postgres -d squid -c "\d daily_stats" | grep daily_points_awarded
```

**Expected:**
- `guild` table has `treasury_points` column
- `quest` table has `points_awarded` column
- `daily_stats` table has `daily_points_awarded` column

### Step 6: Start Re-Index Process
```bash
# Start processor (will index from block 39270005 to latest)
npm run process > reindex.log 2>&1 &

# Save process ID for monitoring
echo $! > processor.pid
echo "✅ Re-index started (PID: $(cat processor.pid))"
```

### Step 7: Monitor Progress
```bash
# Watch real-time logs
tail -f reindex.log

# Check progress periodically
grep -E "block|height|synced" reindex.log | tail -20

# Check indexer status
psql -U postgres -d squid -c "SELECT COUNT(*) FROM guild;"
psql -U postgres -d squid -c "SELECT COUNT(*) FROM quest;"
psql -U postgres -d squid -c "SELECT COUNT(*) FROM quest_completion;"
```

---

## ⏱️ EXPECTED TIMELINE

**Start Block:** 39270005 (Dec 10, 2025 deployment)  
**Current Block:** ~39,500,000 (estimated)  
**Blocks to Index:** ~230,000 blocks  
**Estimated Time:** 18-24 hours

**Progress Checkpoints:**
- 25% complete: ~6 hours
- 50% complete: ~12 hours
- 75% complete: ~18 hours
- 100% complete: ~24 hours

**Factors Affecting Speed:**
- RPC endpoint rate limits (10 req/sec)
- Network latency
- Database write speed
- Number of events per block

---

## 🔍 VERIFICATION STEPS

### During Re-Index

**Check Processor is Running:**
```bash
ps aux | grep "node.*main.js"
tail -20 reindex.log
```

**Check Data Being Written:**
```bash
# Watch table growth
watch -n 60 'psql -U postgres -d squid -c "
SELECT 
  '\''guild'\'' as table, COUNT(*) as rows FROM guild 
UNION ALL
SELECT '\''quest'\'', COUNT(*) FROM quest
UNION ALL
SELECT '\''quest_completion'\'', COUNT(*) FROM quest_completion
UNION ALL
SELECT '\''gm_event'\'', COUNT(*) FROM gm_event
UNION ALL
SELECT '\''user'\'', COUNT(*) FROM \"user\";
"'
```

**Check for Errors:**
```bash
grep -i "error\|fail\|exception" reindex.log | tail -20
```

### After Re-Index Complete

**1. Verify New Field Names:**
```bash
psql -U postgres -d squid -c "
SELECT 
  g.id, 
  g.treasury_points,  -- NEW field name
  g.owner,
  g.total_members
FROM guild g 
LIMIT 5;
"

psql -U postgres -d squid -c "
SELECT 
  q.id,
  q.points_awarded,  -- NEW field name
  q.total_completions
FROM quest q
LIMIT 5;
"

psql -U postgres -d squid -c "
SELECT 
  date,
  daily_points_awarded,  -- NEW field name
  total_gms,
  unique_users
FROM daily_stats
ORDER BY date DESC
LIMIT 5;
"
```

**2. Verify Data Integrity:**
```bash
# Check no NULL values in critical fields
psql -U postgres -d squid -c "
SELECT COUNT(*) as guilds_with_null_treasury
FROM guild 
WHERE treasury_points IS NULL;
"
# Expected: 0

psql -U postgres -d squid -c "
SELECT COUNT(*) as quests_with_null_points
FROM quest 
WHERE points_awarded IS NULL;
"
# Expected: 0
```

**3. Verify Historical Data:**
```bash
# Check earliest data matches deployment
psql -U postgres -d squid -c "
SELECT MIN(created_at) as first_event FROM gm_event;
"
# Expected: ~2025-12-10 (deployment date)
```

---

## 🚨 TROUBLESHOOTING

### Issue: Processor Stops/Crashes
```bash
# Check logs for error
tail -100 reindex.log

# Common causes:
# 1. RPC endpoint down → Check RPC_BASE_HTTP in .env
# 2. Database connection lost → Restart postgres
# 3. Out of memory → Increase system memory

# Restart processor (resumes from last saved block)
npm run process > reindex.log 2>&1 &
```

### Issue: Slow Progress
```bash
# Switch to faster RPC endpoint (PublicNode has higher rate limits)
./switch-rpc.sh 2

# Or manually check RPC performance
curl -X POST https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Available backup RPCs (automatic in processor):
# 0: https://mainnet.base.org (Coinbase - default)
# 1: https://base.llamarpc.com (LlamaNodes)
# 2: https://base-rpc.publicnode.com (PublicNode - higher limits) ⭐
# 3: https://base-mainnet.public.blastapi.io (BlastAPI)

# If RPC rate limited (429 errors):
./switch-rpc.sh 2  # Switch to PublicNode
kill $(cat processor.pid)
npm run process > reindex.log 2>&1 &
echo $! > processor.pid
```

### Issue: Database Connection Errors
```bash
# Verify postgres is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d squid -c "SELECT 1;"

# Check connection limits
psql -U postgres -c "SHOW max_connections;"
```

---

## ✅ POST RE-INDEX CHECKLIST

After re-index completes (~24 hours):

- [ ] Verify all tables have data
- [ ] Confirm NEW field names exist (treasuryPoints, pointsAwarded, dailyPointsAwarded)
- [ ] Confirm OLD field names are gone (totalPoints, totalPointsAwarded)
- [ ] Check latest block matches current chain height
- [ ] Test GraphQL API queries
- [ ] Start GraphQL server: `npm run serve`
- [ ] Query API: `http://localhost:4350/graphql`

**Sample GraphQL Query to Test:**
```graphql
query TestNewFields {
  guilds(limit: 5) {
    id
    treasuryPoints  # NEW field name
    owner
    totalMembers
  }
  quests(limit: 5) {
    id
    pointsAwarded  # NEW field name
    totalCompletions
  }
  dailyStats(orderBy: date_DESC, limit: 5) {
    date
    dailyPointsAwarded  # NEW field name
    totalGMs
  }
}
```

---

## 📊 RE-INDEX METRICS TO TRACK

Monitor these during re-index:

| Metric | Command | Expected |
|--------|---------|----------|
| Current Block | `grep "height" reindex.log \| tail -1` | Increasing |
| Guilds Indexed | `psql -U postgres -d squid -c "SELECT COUNT(*) FROM guild;"` | Growing |
| Quests Indexed | `psql -U postgres -d squid -c "SELECT COUNT(*) FROM quest;"` | Growing |
| Users Indexed | `psql -U postgres -d squid -c "SELECT COUNT(*) FROM \"user\";"` | Growing |
| GM Events | `psql -U postgres -d squid -c "SELECT COUNT(*) FROM gm_event;"` | Growing |
| Errors | `grep -i error reindex.log \| wc -l` | 0 |

---

## 🎯 SUCCESS CRITERIA

Re-index is COMPLETE when:

1. ✅ Processor log shows "synced to latest block"
2. ✅ No errors in reindex.log
3. ✅ GraphQL queries return data with NEW field names
4. ✅ OLD field names return errors (schema validation)
5. ✅ Data counts match expected volumes
6. ✅ All event types represented (GM, Quest, Guild, Badge)

---

## ⏭️ AFTER RE-INDEX: PRIORITY 3

Once re-index is complete and verified:

**Next:** Priority 3 - unified-calculator.ts (3 field renames)
- `blockchainPoints` → `pointsBalance`
- `viralXP` → `viralPoints`
- Update calculation logic

**Estimated Time:** 30 minutes  
**Impact:** Low (internal calculation only)  
**Downtime:** None (can work while P2 re-index runs)

---

**Created:** December 22, 2025  
**Re-Index Start:** [TO BE FILLED]  
**Re-Index Complete:** [TO BE FILLED - Expected ~24h after start]  
**Verified By:** [TO BE FILLED]
