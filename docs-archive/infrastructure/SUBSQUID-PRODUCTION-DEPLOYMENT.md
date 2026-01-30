# Subsquid Production Deployment Guide

## Current Status

**Production URL**: `https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql`

**Deployment Date**: January 1, 2026

**Status**: ✅ **LIVE - Production ready with Phase 1 schema**

**Indexer Progress**: Synced to block ~40261797 (current head)

## ✅ Deployment Complete

Production Subsquid successfully deployed with Phase 1 schema! All 17 scoring fields are now available:

### Test Query Results
```graphql
{
  users(limit: 3, orderBy: totalScore_DESC) {
    id
    level
    totalScore
    rankTier
    gmPoints
    viralPoints
    questPoints
  }
}
```

### Sample Response
```json
{
  "data": {
    "users": [
      {
        "id": "0x8870c155666809609176260f2b65a626c000d773",
        "level": 3,
        "totalScore": "910",
        "rankTier": 1,
        "gmPoints": "0",
        "viralPoints": "0",
        "questPoints": "0"
      }
    ]
  }
}
```

## Problem Solved

Production Subsquid was deployed BEFORE Phase 1 schema updates. It only has basic fields:
- ✅ `id` field works
- ❌ Missing all 17 Phase 1 scoring fields:
  - `address`, `level`, `totalScore`
  - `rankTier`, `gmPoints`, `viralPoints`, `questPoints`, `guildPoints`, `referralPoints`
  - `xpIntoLevel`, `xpToNextLevel`, `pointsIntoTier`, `pointsToNextTier`
  - `multiplier`, `firstSeenAt`, `lastUpdatedAt`, `eventCount`

## Testing Production

```bash
# Test 1: Basic query (WORKS)
curl https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users(limit: 1) { id } }"}'
  
# Result: ✅ Success
# {"data":{"users":[{"id":"0x8870c155666809609176260f2b65a626c000d773"}]}}

# Test 2: Phase 1 fields (FAILS)
curl https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users(limit: 1) { id address level totalScore } }"}'
  
# Result: ❌ GraphQL validation errors
# {
#   "errors": [
#     {"message": "Cannot query field \"address\" on type \"User\"."},
#     {"message": "Cannot query field \"level\" on type \"User\"."},
#     {"message": "Cannot query field \"totalScore\" on type \"User\"."}
#   ]
# }
```

## Solution: Redeploy Indexer

### Prerequisites

1. **Local indexer running** with Phase 1 schema
2. **Subsquid Cloud CLI** installed (`npm i -g @subsquid/cli`)
3. **Schema file** at `gmeow-indexer/schema.graphql` (15,347 bytes)
4. **Deployment config** at `gmeow-indexer/squid.yaml`

### Files Ready for Deployment

```bash
cd gmeow-indexer/

# Check files
ls -la
# schema.graphql (15,347 bytes) - Phase 1 schema ✅
# squid.yaml (316 bytes) - Deployment config ✅
# src/ - Processor code ✅
# abi/ScoringModule.abi.json - Contract ABI ✅
```

### Deployment Steps

#### Option A: Using Subsquid Cloud (Recommended)

```bash
cd gmeow-indexer/

# Login to Subsquid Cloud (if not already logged in)
sqd auth

# Deploy to production
sqd deploy .

# Monitor deployment
sqd logs gmeow-indexer@v1 -f

# Wait for indexer to sync from block 40193345
# This may take 15-30 minutes depending on network
```

#### Option B: Update Existing Deployment

```bash
cd gmeow-indexer/

# Update the existing deployment
sqd deploy . --update

# Or redeploy from scratch
sqd deploy . --force
```

### Post-Deployment Verification

1. **Wait for sync** - Monitor logs until indexer reaches current block (~40232000+)

2. **Test GraphQL endpoint**:
   ```bash
   # Test Phase 1 fields
   curl https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "{ users(limit: 1) { id address level totalScore rankTier gmPoints viralPoints questPoints } }"
     }'
   
   # Expected: All fields return successfully ✅
   ```

3. **Update environment variables**:
   ```bash
   # .env
   NEXT_PUBLIC_SUBSQUID_URL=https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
   NEXT_PUBLIC_SUBSQUID_GRAPHQL_URL=https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
   ```

4. **Test Phase 2 components**:
   - Visit dashboard: `http://localhost:3000/dashboard`
   - Check "GM & Stats" tab - Should show scoring data
   - Visit profile: `http://localhost:3000/profile/[fid]`
   - Verify ProfileStats displays correctly

### Expected Timeline

- **Deployment**: 2-5 minutes
- **Reindexing**: 15-30 minutes (from block 40193345 to current)
- **Testing**: 5-10 minutes
- **Total**: ~30-45 minutes

## Current Workaround

All Phase 1 & 2 components currently use **localhost**:
- Development endpoint: `http://localhost:4350/graphql`
- Local indexer: Synced to block 40232051 ✅
- All Phase 2 components work correctly ✅

Code is already prepared to switch to production:
- Production URL documented in all files
- Comments explain the schema mismatch
- Ready to update environment variables after redeployment

## Files Modified for Production Support

1. **lib/apollo-client.ts** (lines 17-21)
   ```typescript
   // Production Subsquid Cloud: https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
   // NOTE: Production needs redeployment with Phase 1 schema
   // Using localhost for now (deployed Jan 1, 2026 - needs schema update)
   const SUBSQUID_GRAPHQL_URL = process.env.NEXT_PUBLIC_SUBSQUID_GRAPHQL_URL || 'http://localhost:4350/graphql'
   ```

2. **.env**
   ```dotenv
   # Production: https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
   # NOTE: Production needs redeployment with Phase 1 schema (17 scoring fields)
   # Using localhost until production is updated
   NEXT_PUBLIC_SUBSQUID_URL=http://localhost:4350/graphql
   NEXT_PUBLIC_SUBSQUID_GRAPHQL_URL=http://localhost:4350/graphql
   ```

3. **lib/jobs/sync-guild-level-ups.ts** (line 166)
4. **lib/jobs/sync-guild-deposits.ts** (line 120)
5. **HYBRID-ARCHITECTURE-MIGRATION-PLAN.md**

## Action Plan

### Immediate (Before Phase 2.5)
- [ ] Deploy indexer to Subsquid Cloud with Phase 1 schema
- [ ] Wait for reindexing to complete
- [ ] Update environment variables to production URL
- [ ] Test all Phase 2 components on production

### Alternative (Continue Development)
- [x] Continue Phase 2.5 on localhost ✅
- [ ] Deploy to production later when ready
- [x] All development work functional on localhost ✅

## Notes

- Production indexer is **healthy** and responding
- Only schema is outdated (deployed before Phase 1)
- No code changes needed, just redeploy indexer
- All 13 Phase 1 files compile with 0 errors ✅
- All 8 Phase 2 files compile with 0 errors ✅
- Local development continues uninterrupted ✅

---

**Status**: Ready for production redeployment
**Blocking**: No (can continue Phase 2.5 on localhost)
**Priority**: Medium (production schema update needed for live deployment)
