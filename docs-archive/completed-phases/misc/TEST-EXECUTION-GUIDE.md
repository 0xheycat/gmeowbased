# Phase 8.4.1 - Test Execution Guide

**Automated Testing for Cache Invalidation Integration**

## Quick Start

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Run all tests
./scripts/run-all-tests.sh

# Or run tests individually:
./scripts/test-cache-invalidation.sh
node scripts/test-batch-invalidation.js
```

## Test Suites Overview

### 1. Integration Tests (Bash/curl)
**File:** `scripts/test-cache-invalidation.sh`
**Purpose:** Validates API endpoints, metrics, and cache behavior
**Tests:**
- Test 1: Metrics endpoint validation
- Test 2: Admin GET (single invalidation)
- Test 3: Admin GET (invalid address rejection)
- Test 4: Admin POST (batch invalidation)
- Test 5: Admin POST (invalid payload)
- Test 6: Cache performance (metrics delta)
- Test 7: Performance benchmarks

**Expected Results:**
```
✓ Dev server is running at http://localhost:3000
✓ Metrics endpoint returned valid JSON
✓ Cache hit rate: >90%
✓ RPC calls: <15
✓ Status: healthy
✓ All 15 tests passed!
```

### 2. E2E Tests (Node.js)
**File:** `scripts/test-batch-invalidation.js`
**Purpose:** Tests batch invalidation utilities with various sizes
**Tests:**
- Test 1: Small batch (5 addresses, <500ms)
- Test 2: Large batch (100 addresses, <2s)
- Test 3: Partial failure (mixed addresses)
- Test 4: Performance thresholds (1/10/50 addresses)

**Expected Results:**
```
✓ Server health check passed
✓ Small batch invalidation: 5 addresses in 280ms
✓ Large batch invalidation: 100 addresses in 1450ms
✓ Mixed valid/invalid addresses: Correctly rejected with 400
✓ Performance test: All thresholds met
✓ All 4 test suites passed!
```

### 3. Unit Tests (Vitest)
**Files:**
- `__tests__/lib/scoring/cache-invalidation.test.ts`
- `__tests__/app/api/admin/scoring/route.test.ts`

**Purpose:** Unit tests with mocked dependencies
**Run with:**
```bash
pnpm test __tests__/lib/scoring/cache-invalidation.test.ts
pnpm test __tests__/app/api/admin/scoring/route.test.ts
```

**Expected Results:**
```
Test Files  2 passed (2)
     Tests  19 passed (19)
```

## Manual Test Steps (if automated tests fail)

### Step 1: Verify Dev Server
```bash
curl http://localhost:3000
# Should return HTML with status 200
```

### Step 2: Test Metrics Endpoint
```bash
curl -s http://localhost:3000/api/scoring/metrics | jq '.'
```
**Expected:**
```json
{
  "cacheHitRate": 95.23,
  "rpcCalls": 8,
  "avgLatency": 42,
  "status": "healthy"
}
```

### Step 3: Test Single Invalidation
```bash
curl -X GET "http://localhost:3000/api/admin/scoring?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" | jq '.'
```
**Expected:**
```json
{
  "success": true,
  "message": "Cache invalidated successfully for 1 address(es)",
  "addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"]
}
```

### Step 4: Test Batch Invalidation
```bash
curl -X POST http://localhost:3000/api/admin/scoring \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    ]
  }' | jq '.'
```
**Expected:**
```json
{
  "success": true,
  "message": "Cache invalidated successfully for 3 address(es)",
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  ]
}
```

### Step 5: Verify Cache Invalidation Works
```bash
# Get baseline metrics
curl -s http://localhost:3000/api/scoring/metrics | jq '.cacheHitRate'

# Invalidate cache
curl -X GET "http://localhost:3000/api/admin/scoring?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

# Check metrics again (cache hit rate should drop temporarily)
curl -s http://localhost:3000/api/scoring/metrics | jq '.cacheHitRate'
```

## Troubleshooting

### Issue: Dev server not running
```bash
# Check if process exists
lsof -i :3000

# If stuck, kill and restart
killall node
pnpm dev
```

### Issue: Tests fail with 500 errors
**Likely cause:** Database connection issues or missing environment variables

**Solution:**
```bash
# Check .env.local has:
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
BASE_RPC_URL=your_rpc

# Restart server
pnpm dev
```

### Issue: jq not found
```bash
# Install jq
sudo apt install jq  # Ubuntu/Debian
brew install jq      # macOS
```

### Issue: Permission denied on scripts
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

## Success Criteria

✅ **All tests passing:**
- Integration tests: 15/15 passed
- E2E tests: 4/4 passed
- Unit tests: 19/19 passed

✅ **Performance metrics:**
- Cache hit rate: >90%
- Metrics endpoint: <100ms
- Admin invalidation: <200ms
- Batch invalidation: <2s for 100 addresses

✅ **Functional validation:**
- Single invalidation clears 4 cache keys
- Batch invalidation handles up to 100 addresses
- Invalid addresses rejected with 400
- Cache hit rate recovers after invalidation
- Metrics endpoint returns consistent data

## Next Steps After Tests Pass

1. **Update documentation:**
   ```bash
   # Mark Phase 8.4.1 as complete in HYBRID-ARCHITECTURE-MIGRATION-PLAN.md
   ```

2. **Commit changes:**
   ```bash
   git add __tests__/ scripts/
   git commit -m "feat: Add automated test suite for Phase 8.4.1 cache invalidation"
   ```

3. **CI/CD Integration:**
   - Add test scripts to GitHub Actions workflow
   - Run on every pull request
   - Block merge if tests fail

4. **Production Validation:**
   - Run tests against staging environment
   - Monitor cache metrics in production
   - Set up alerts for cache hit rate <80%

## Related Documentation

- [PHASE-8.4.1-IMPLEMENTATION-SUMMARY.md](./PHASE-8.4.1-IMPLEMENTATION-SUMMARY.md) - Implementation details
- [PHASE-8.4.1-QUICK-REFERENCE.md](./PHASE-8.4.1-QUICK-REFERENCE.md) - Quick commands
- [HYBRID-ARCHITECTURE-MIGRATION-PLAN.md](./HYBRID-ARCHITECTURE-MIGRATION-PLAN.md) - Overall architecture plan
- [SCORING-ARCHITECTURE-TEST-RESULTS.md](./SCORING-ARCHITECTURE-TEST-RESULTS.md) - Original test results

## Test File Locations

```
Gmeowbased/
├── __tests__/
│   ├── lib/scoring/
│   │   └── cache-invalidation.test.ts    (Unit tests)
│   └── app/api/admin/scoring/
│       └── route.test.ts                  (API endpoint tests)
├── scripts/
│   ├── test-cache-invalidation.sh         (Integration tests)
│   ├── test-batch-invalidation.js         (E2E tests)
│   └── run-all-tests.sh                   (Master test runner)
└── TEST-EXECUTION-GUIDE.md                (This file)
```
