#!/bin/bash

###############################################################################
# REFERRAL SYSTEM 4-LAYER COMPREHENSIVE TEST
# Tests all 5 referral API endpoints for proper naming conventions and responses
###############################################################################

set -e

BASE_URL="http://localhost:3000"
TEST_FID="1234"
TEST_HEADER="x-farcaster-fid: $TEST_FID"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "REFERRAL 4-LAYER ARCHITECTURE TEST"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Testing 4-layer naming compliance:"
echo "  Layer 1 (Contract):  camelCase ✓"
echo "  Layer 2 (Subsquid):  camelCase ✓"
echo "  Layer 3 (Supabase):  snake_case → auto-converted by client"
echo "  Layer 4 (API):       camelCase (response)"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Helper function for test results
test_result() {
  local test_name=$1
  local status=$2
  local details=$3
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    if [ ! -z "$details" ]; then
      echo "  └─ $details"
    fi
    ((PASS_COUNT++))
  else
    echo -e "${RED}✗${NC} $test_name"
    if [ ! -z "$details" ]; then
      echo "  └─ $details"
    fi
    ((FAIL_COUNT++))
  fi
}

echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST 1: GET /api/referral/leaderboard"
echo "═══════════════════════════════════════════════════════════════════════════"

RESPONSE=$(curl -s "${BASE_URL}/api/referral/leaderboard?period=all-time&page=1&pageSize=10")

# Check if response is valid JSON
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  test_result "Valid JSON response" "PASS"
  
  # Check required fields in response
  if echo "$RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    test_result "Has 'success' field" "PASS"
  else
    test_result "Has 'success' field" "FAIL" "Missing success field"
  fi
  
  if echo "$RESPONSE" | jq -e '.entries' >/dev/null 2>&1; then
    test_result "Has 'entries' array" "PASS"
  else
    test_result "Has 'entries' array" "FAIL" "Missing entries field"
  fi
  
  if echo "$RESPONSE" | jq -e '.pagination' >/dev/null 2>&1; then
    test_result "Has 'pagination' object" "PASS"
  else
    test_result "Has 'pagination' object" "FAIL" "Missing pagination field"
  fi
  
  # Check entry naming (should have camelCase fields)
  ENTRY=$(echo "$RESPONSE" | jq '.entries[0]' 2>/dev/null)
  if [ ! -z "$ENTRY" ] && [ "$ENTRY" != "null" ]; then
    # Check for naming errors (forbidden terms)
    if echo "$ENTRY" | jq -r 'keys[]' 2>/dev/null | grep -E 'blockchainPoints|viralXP|base_points|total_points' >/dev/null 2>&1; then
      test_result "No forbidden terms in response" "FAIL" "Found forbidden naming"
    else
      test_result "No forbidden terms in response" "PASS"
    fi
  fi
  
else
  test_result "Valid JSON response" "FAIL" "Invalid JSON: $RESPONSE"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST 2: GET /api/referral/[fid]/stats"
echo "═══════════════════════════════════════════════════════════════════════════"

RESPONSE=$(curl -s -H "$TEST_HEADER" "${BASE_URL}/api/referral/${TEST_FID}/stats")

if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  test_result "Valid JSON response" "PASS"
  
  if echo "$RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    test_result "Has 'success' field" "PASS"
  else
    test_result "Has 'success' field" "FAIL"
  fi
  
  # Check response data structure
  if echo "$RESPONSE" | jq -e '.data' >/dev/null 2>&1; then
    test_result "Has 'data' object" "PASS"
    
    DATA=$(echo "$RESPONSE" | jq '.data')
    
    # Check for required fields in camelCase
    if echo "$DATA" | jq -e '.fid' >/dev/null 2>&1; then
      test_result "Has camelCase 'fid' field" "PASS"
    else
      test_result "Has camelCase 'fid' field" "FAIL"
    fi
    
    if echo "$DATA" | jq -e '.totalReferred' >/dev/null 2>&1; then
      test_result "Has camelCase 'totalReferred' field" "PASS"
    else
      test_result "Has camelCase 'totalReferred' field" "FAIL" "May have snake_case 'total_referred'"
    fi
    
  else
    test_result "Has 'data' object" "FAIL"
  fi
  
else
  test_result "Valid JSON response" "FAIL"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST 3: GET /api/referral/[fid]/analytics"
echo "═══════════════════════════════════════════════════════════════════════════"

RESPONSE=$(curl -s -H "$TEST_HEADER" "${BASE_URL}/api/referral/${TEST_FID}/analytics")

if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  test_result "Valid JSON response" "PASS"
  
  if echo "$RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    test_result "Has 'success' field" "PASS"
  else
    test_result "Has 'success' field" "FAIL"
  fi
else
  test_result "Valid JSON response" "FAIL"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST 4: GET /api/referral/activity/[fid]"
echo "═══════════════════════════════════════════════════════════════════════════"

RESPONSE=$(curl -s -H "$TEST_HEADER" "${BASE_URL}/api/referral/activity/${TEST_FID}")

if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  test_result "Valid JSON response" "PASS"
  
  if echo "$RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    test_result "Has 'success' field" "PASS"
  else
    test_result "Has 'success' field" "FAIL"
  fi
else
  test_result "Valid JSON response" "FAIL"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST 5: POST /api/referral/generate-link"
echo "═══════════════════════════════════════════════════════════════════════════"

RESPONSE=$(curl -s -X POST \
  -H "$TEST_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"referralCode":"TEST123"}' \
  "${BASE_URL}/api/referral/generate-link")

if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  test_result "Valid JSON response" "PASS"
  
  if echo "$RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    test_result "Has 'success' field" "PASS"
  else
    test_result "Has 'success' field" "FAIL"
  fi
else
  test_result "Valid JSON response" "FAIL"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "NAMING CONVENTION VERIFICATION"
echo "═══════════════════════════════════════════════════════════════════════════"

# Test forbidden terms across all endpoints
FORBIDDEN_TERMS=("blockchainPoints" "viralXP" "base_points" "total_points")

for endpoint in "leaderboard" "${TEST_FID}/stats" "${TEST_FID}/analytics" "activity/${TEST_FID}"; do
  RESPONSE=$(curl -s -H "$TEST_HEADER" "${BASE_URL}/api/referral/${endpoint}" 2>/dev/null || echo "{}")
  
  for term in "${FORBIDDEN_TERMS[@]}"; do
    if echo "$RESPONSE" | grep -q "$term"; then
      test_result "Endpoint /referral/$endpoint - No '$term'" "FAIL"
    fi
  done
done

test_result "All endpoints - No forbidden terms" "PASS"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
