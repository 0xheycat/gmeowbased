# 🔧 Workflow Pattern Standardization Plan

**Date**: December 5, 2025  
**Issue**: Mixed patterns - some workflows use API routes, others call scripts directly  
**Goal**: Standardize ALL workflows to use secure API routes with 3-layer protection

---

## 🎯 Current State Analysis

### ✅ Workflows Using API Routes (CORRECT PATTERN)
| Workflow | API Route | Status |
|----------|-----------|--------|
| quest-expiry.yml | `/api/cron/expire-quests` | ✅ NEW - Properly secured |
| leaderboard-update.yml | `/api/cron/update-leaderboard` | ✅ Already correct |

### ⚠️ Workflows Using Direct Scripts (NEEDS UPDATE)
| Workflow | Current Script | API Route Needed |
|----------|----------------|------------------|
| badge-minting.yml | `scripts/automation/mint-badge-queue.ts` | `/api/cron/mint-badges` (EXISTS!) |
| viral-metrics-sync.yml | `scripts/automation/sync-viral-metrics.ts` | **NEW** `/api/cron/sync-viral-metrics` |
| supabase-leaderboard-sync.yml | `scripts/leaderboard/sync-supabase.ts` | **NEW** `/api/cron/sync-leaderboard` |

**Note**: gm-reminders.yml and cache-warmup.yml scripts don't exist in directory!

---

## 🔍 Discovery: Badge Minting Already Has API Route!

**API Route EXISTS**: `app/api/cron/mint-badges/route.ts` ✅
- Created previously
- Follows proper security pattern
- Imports from `scripts/automation/mint-badge-queue.ts`
- Has CRON_SECRET verification

**Problem**: Workflow calls script directly instead of API route!

```yaml
# ❌ CURRENT (badge-minting.yml)
run: npx tsx scripts/automation/mint-badge-queue.ts

# ✅ SHOULD BE
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$DEPLOYMENT_URL/api/cron/mint-badges"
```

---

## 📋 Required Changes

### 1. Update badge-minting.yml ⚠️ HIGH PRIORITY
**Change**: Use existing API route instead of direct script

**Before**:
```yaml
- name: Process badge minting queue
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    # ... many env vars ...
  run: npx tsx scripts/automation/mint-badge-queue.ts
```

**After**:
```yaml
- name: Process badge minting queue
  env:
    CRON_SECRET: ${{ secrets.CRON_SECRET }}
    DEPLOYMENT_URL: ${{ secrets.VERCEL_URL || 'https://gmeowhq.art' }}
  run: |
    echo "🎖️ Starting badge minting..."
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      "$DEPLOYMENT_URL/api/cron/mint-badges")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    echo "Response status: $http_code"
    echo "Response body: $body"
    
    if [ "$http_code" -eq 200 ]; then
      echo "✅ Badge minting completed successfully!"
    else
      echo "❌ Badge minting failed with status $http_code"
      exit 1
    fi
```

**Benefits**:
- ✅ Consistent with quest-expiry and leaderboard-update patterns
- ✅ CRON_SECRET security already implemented
- ✅ No script dependencies needed
- ✅ Simpler workflow (no pnpm install, no tsx, no env vars)
- ✅ Faster execution (~30s instead of ~2min)
- ✅ Better error handling (HTTP status codes)

### 2. Check viral-metrics-sync.yml ⚠️ MEDIUM PRIORITY

**Current**: Calls `scripts/automation/sync-viral-metrics.ts` directly

**Options**:
- A. Create `/api/cron/sync-viral-metrics` route (recommended)
- B. Keep as-is (works fine, but inconsistent)

**If Option A**:
- Create `app/api/cron/sync-viral-metrics/route.ts`
- Add 3-layer security (rate limit + CRON_SECRET + IP tracking)
- Import logic from existing script
- Update workflow to call API route

### 3. Check supabase-leaderboard-sync.yml ⚠️ LOW PRIORITY

**Current**: Calls `scripts/leaderboard/sync-supabase.ts` directly

**Question**: Is this different from `leaderboard-update.yml`?
- leaderboard-update.yml → `/api/cron/update-leaderboard`
- supabase-leaderboard-sync.yml → `scripts/leaderboard/sync-supabase.ts`

**Needs Investigation**: Are these duplicate workflows?

---

## 🚀 Implementation Plan

### Phase 1: Fix Badge Minting (5 minutes) ✅ READY
1. Update `.github/workflows/badge-minting.yml`
2. Change script call to API route call
3. Test workflow manually
4. Commit changes

### Phase 2: Investigate Leaderboard Workflows (10 minutes)
1. Read both workflow files
2. Compare logic in:
   - `/api/cron/update-leaderboard` 
   - `scripts/leaderboard/sync-supabase.ts`
3. Determine if duplicate or different purposes
4. Consolidate if duplicate

### Phase 3: Standardize Viral Metrics (30 minutes)
1. Create `/api/cron/sync-viral-metrics/route.ts`
2. Import logic from `scripts/automation/sync-viral-metrics.ts`
3. Add 3-layer security pattern
4. Update workflow
5. Test manually

### Phase 4: Documentation Update (10 minutes)
1. Update `QUEST-AUTOMATION-GITHUB-CONFIG.md`
2. Document standardized pattern
3. Add security benefits
4. Update workflow inventory

---

## 📊 Security Comparison

### Direct Script Pattern (OLD)
```yaml
- Setup Node.js
- Setup pnpm  
- Install dependencies (1-2 min)
- Run script with 15+ env vars
- No rate limiting
- No CRON_SECRET verification
- No IP tracking
- No audit trail
```

**Issues**:
- ❌ Slow (install dependencies every run)
- ❌ Less secure (no multi-layer protection)
- ❌ Hard to monitor (no HTTP logs)
- ❌ Can't test from browser
- ❌ No rate limiting

### API Route Pattern (NEW)
```yaml
- Call API route with CRON_SECRET
- Vercel handles execution
- Returns HTTP status
```

**Benefits**:
- ✅ Fast (~30s instead of ~2min)
- ✅ Secure (3-layer protection)
- ✅ Easy to monitor (Vercel logs)
- ✅ Can test from browser
- ✅ Rate limiting support
- ✅ Professional pattern

---

## 🎯 Recommendation

**Immediate Action**: Update badge-minting.yml to use existing API route

**Why Urgent**:
1. API route already exists (wasted if not used)
2. Script pattern is outdated (inconsistent with new workflows)
3. Quick fix (5 minutes)
4. Significant benefits (speed, security, simplicity)

**Next Actions**:
1. Fix badge-minting workflow → API route
2. Investigate leaderboard workflow duplication
3. Create viral-metrics API route
4. Document standardized pattern

---

**Ready to proceed with updates?**
