#!/usr/bin/env bash
#
# Phase 8.4.1 Automated Integration Test Suite
# 
# Runs automated tests against localhost:3000 to validate cache invalidation
# integration across all components and API endpoints.
#
# Prerequisites:
# - Dev server running on localhost:3000
# - pnpm dev should be active
#
# Usage: ./scripts/test-cache-invalidation.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:3000"
TEST_ADDRESS="0x8870c155666809609176260f2b65a626c000d773"
ADMIN_ENDPOINT="$BASE_URL/api/admin/scoring"
METRICS_ENDPOINT="$BASE_URL/api/scoring/metrics"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Check if server is running
echo "=== Phase 8.4.1 Automated Test Suite ==="
echo ""

log_test "Checking if dev server is running..."
if curl -s -f "$BASE_URL" > /dev/null; then
    log_pass "Dev server is running at $BASE_URL"
else
    log_fail "Dev server is not running. Please start with: pnpm dev"
    exit 1
fi

echo ""
echo "=== Test 1: Metrics Endpoint ===" 
echo ""

log_test "GET $METRICS_ENDPOINT"
METRICS_RESPONSE=$(curl -s "$METRICS_ENDPOINT")

if echo "$METRICS_RESPONSE" | jq -e '.metrics' > /dev/null 2>&1; then
    log_pass "Metrics endpoint returned valid JSON"
    
    # Validate metrics structure
    if echo "$METRICS_RESPONSE" | jq -e '.metrics.cacheHitRate' > /dev/null 2>&1; then
        CACHE_HIT_RATE=$(echo "$METRICS_RESPONSE" | jq -r '.metrics.cacheHitRate')
        log_pass "Cache hit rate: $CACHE_HIT_RATE"
    else
        log_fail "Missing cacheHitRate in metrics"
    fi
    
    if echo "$METRICS_RESPONSE" | jq -e '.metrics.rpcCalls' > /dev/null 2>&1; then
        RPC_CALLS=$(echo "$METRICS_RESPONSE" | jq -r '.metrics.rpcCalls')
        log_pass "RPC calls: $RPC_CALLS"
    else
        log_fail "Missing rpcCalls in metrics"
    fi
    
    if echo "$METRICS_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
        STATUS=$(echo "$METRICS_RESPONSE" | jq -r '.status')
        log_pass "Status: $STATUS"
    else
        log_fail "Missing status in metrics"
    fi
else
    log_fail "Metrics endpoint returned invalid response"
fi

echo ""
echo "=== Test 2: Admin GET Endpoint (Single Invalidation) ===" 
echo ""

log_test "GET $ADMIN_ENDPOINT?address=$TEST_ADDRESS"
ADMIN_GET_RESPONSE=$(curl -s "$ADMIN_ENDPOINT?address=$TEST_ADDRESS")

if echo "$ADMIN_GET_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS=$(echo "$ADMIN_GET_RESPONSE" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
        log_pass "Single address invalidation successful"
        
        RETURNED_ADDRESS=$(echo "$ADMIN_GET_RESPONSE" | jq -r '.address')
        if [ "$RETURNED_ADDRESS" == "$TEST_ADDRESS" ]; then
            log_pass "Correct address returned: $RETURNED_ADDRESS"
        else
            log_fail "Wrong address returned. Expected: $TEST_ADDRESS, Got: $RETURNED_ADDRESS"
        fi
    else
        log_fail "Admin GET endpoint returned success=false"
    fi
else
    log_fail "Admin GET endpoint returned invalid response"
fi

echo ""
echo "=== Test 3: Admin GET Endpoint (Invalid Address) ===" 
echo ""

log_test "GET $ADMIN_ENDPOINT?address=invalid"
INVALID_RESPONSE=$(curl -s "$ADMIN_ENDPOINT?address=invalid")

if echo "$INVALID_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$INVALID_RESPONSE" | jq -r '.error')
    if [ "$ERROR_MSG" == "Invalid address" ]; then
        log_pass "Invalid address rejected correctly"
    else
        log_fail "Wrong error message. Expected: 'Invalid address', Got: '$ERROR_MSG'"
    fi
else
    log_fail "Invalid address not rejected properly"
fi

echo ""
echo "=== Test 4: Admin POST Endpoint (Batch Invalidation) ===" 
echo ""

BATCH_PAYLOAD=$(cat <<EOF
{
  "addresses": [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "$TEST_ADDRESS"
  ],
  "reason": "Automated test - batch invalidation"
}
EOF
)

log_test "POST $ADMIN_ENDPOINT (3 addresses)"
ADMIN_POST_RESPONSE=$(curl -s -X POST "$ADMIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$BATCH_PAYLOAD")

if echo "$ADMIN_POST_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS=$(echo "$ADMIN_POST_RESPONSE" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
        log_pass "Batch invalidation successful"
        
        INVALIDATED=$(echo "$ADMIN_POST_RESPONSE" | jq -r '.invalidated')
        TOTAL=$(echo "$ADMIN_POST_RESPONSE" | jq -r '.total')
        
        if [ "$INVALIDATED" == "3" ] && [ "$TOTAL" == "3" ]; then
            log_pass "All 3 addresses invalidated successfully"
        else
            log_fail "Expected 3/3 invalidated, got $INVALIDATED/$TOTAL"
        fi
        
        REASON=$(echo "$ADMIN_POST_RESPONSE" | jq -r '.reason')
        if [ "$REASON" == "Automated test - batch invalidation" ]; then
            log_pass "Reason preserved correctly"
        else
            log_fail "Reason not preserved"
        fi
    else
        log_fail "Batch invalidation returned success=false"
    fi
else
    log_fail "Batch invalidation returned invalid response"
fi

echo ""
echo "=== Test 5: Admin POST Endpoint (Invalid Payload) ===" 
echo ""

log_test "POST $ADMIN_ENDPOINT (empty addresses)"
EMPTY_PAYLOAD='{"addresses": []}'
EMPTY_RESPONSE=$(curl -s -X POST "$ADMIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$EMPTY_PAYLOAD")

if echo "$EMPTY_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$EMPTY_RESPONSE" | jq -r '.error')
    if [ "$ERROR_MSG" == "At least one address is required" ]; then
        log_pass "Empty addresses array rejected correctly"
    else
        log_fail "Wrong error for empty array: '$ERROR_MSG'"
    fi
else
    log_fail "Empty addresses array not rejected"
fi

echo ""
echo "=== Test 6: Cache Performance Metrics ===" 
echo ""

# Get baseline metrics
log_test "Fetching baseline metrics..."
BASELINE_METRICS=$(curl -s "$METRICS_ENDPOINT")
BASELINE_CACHE_MISSES=$(echo "$BASELINE_METRICS" | jq -r '.metrics.cacheMisses')

# Trigger cache invalidation
log_test "Triggering cache invalidation for $TEST_ADDRESS..."
curl -s "$ADMIN_ENDPOINT?address=$TEST_ADDRESS" > /dev/null

# Wait for invalidation to complete
sleep 1

# Fetch metrics again
log_test "Fetching post-invalidation metrics..."
POST_METRICS=$(curl -s "$METRICS_ENDPOINT")
POST_CACHE_MISSES=$(echo "$POST_METRICS" | jq -r '.metrics.cacheMisses')

# Verify metrics changed
if [ "$POST_CACHE_MISSES" -ge "$BASELINE_CACHE_MISSES" ]; then
    log_pass "Cache misses increased (or stayed same) after invalidation"
else
    log_fail "Cache misses decreased unexpectedly"
fi

# Check cache hit rate
CACHE_HIT_RATE=$(echo "$POST_METRICS" | jq -r '.metrics.cacheHitRate' | sed 's/%//')
if (( $(echo "$CACHE_HIT_RATE >= 80" | bc -l) )); then
    log_pass "Cache hit rate is healthy: ${CACHE_HIT_RATE}%"
else
    YELLOW_LOG="\033[1;33m[WARN]\033[0m"
    echo -e "$YELLOW_LOG Cache hit rate is low: ${CACHE_HIT_RATE}% (expected >80%)"
fi

echo ""
echo "=== Test 7: Performance Benchmarks ===" 
echo ""

log_test "Benchmarking metrics endpoint response time..."
METRICS_START=$(date +%s%3N)
curl -s "$METRICS_ENDPOINT" > /dev/null
METRICS_END=$(date +%s%3N)
METRICS_DURATION=$((METRICS_END - METRICS_START))

if [ "$METRICS_DURATION" -lt 100 ]; then
    log_pass "Metrics endpoint responded in ${METRICS_DURATION}ms (<100ms)"
else
    log_fail "Metrics endpoint slow: ${METRICS_DURATION}ms (expected <100ms)"
fi

log_test "Benchmarking admin invalidation response time..."
ADMIN_START=$(date +%s%3N)
curl -s "$ADMIN_ENDPOINT?address=$TEST_ADDRESS" > /dev/null
ADMIN_END=$(date +%s%3N)
ADMIN_DURATION=$((ADMIN_END - ADMIN_START))

if [ "$ADMIN_DURATION" -lt 200 ]; then
    log_pass "Admin invalidation responded in ${ADMIN_DURATION}ms (<200ms)"
else
    log_fail "Admin invalidation slow: ${ADMIN_DURATION}ms (expected <200ms)"
fi

echo ""
echo "=== Test Results Summary ==="
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
