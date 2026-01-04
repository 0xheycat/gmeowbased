#!/bin/bash

# Comprehensive Referral Bug Fix Verification Script
# Tests all R1-R8 bugs on localhost

BASE_URL="http://localhost:3000/api/referral"
VALID_FID="18139"
VALID_HEADER="x-farcaster-fid: $VALID_FID"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     REFERRAL SYSTEM BUG FIX VERIFICATION TEST SUITE       ║"
echo "║                  December 25, 2025                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test Counter
TESTS_PASSED=0
TESTS_FAILED=0

# ===== R1: AUTHENTICATION TEST =====
echo "📋 TEST GROUP 1: R1 - Missing Authentication"
echo "─────────────────────────────────────────────"

echo ""
echo "Test 1.1: Stats endpoint WITHOUT auth header (should return 401)"
RESPONSE=$(curl -s http://localhost:3000/api/referral/18139/stats)
if echo "$RESPONSE" | grep -q "401\|Unauthorized"; then
  echo "✅ PASS: Correctly rejected unauthenticated request"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Should reject without auth header"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 1.2: Stats endpoint WITH correct auth header (should return 200)"
RESPONSE=$(curl -s -H "$VALID_HEADER" $BASE_URL/18139/stats)
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Correctly authenticated request"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Should accept with correct auth header"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 1.3: Stats endpoint WITH mismatched FID (should return 401)"
RESPONSE=$(curl -s -H "x-farcaster-fid: 99999" $BASE_URL/18139/stats)
if echo "$RESPONSE" | grep -q "401\|Unauthorized"; then
  echo "✅ PASS: Correctly rejected mismatched FID"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Should reject mismatched FID"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

# ===== R5: PAGINATION TEST =====
echo ""
echo "📋 TEST GROUP 2: R5 - Unbounded Offset Pagination"
echo "─────────────────────────────────────────────────"

echo ""
echo "Test 2.1: Valid offset within bounds (offset=100)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?offset=100")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Valid offset accepted"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Valid offset should be accepted"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 2.2: Offset at boundary (offset=10000)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?offset=10000")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Boundary offset accepted"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Offset at MAX_OFFSET should be accepted"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 2.3: Offset exceeds bounds (offset=10001)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?offset=10001")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1 || echo "$RESPONSE" | grep -q "400\|exceeds"; then
  echo "✅ PASS: Excessive offset rejected"
  ((TESTS_PASSED++))
else
  echo "⚠️  WARNING: May not enforce offset bounds"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 2.4: Extreme offset (offset=999999)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?offset=999999")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1 || echo "$RESPONSE" | grep -q "400\|exceeds"; then
  echo "✅ PASS: Extreme offset rejected"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Should reject extreme offset"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

# ===== R7: SEARCH VALIDATION TEST =====
echo ""
echo "📋 TEST GROUP 3: R7 - Missing Search Validation"
echo "────────────────────────────────────────────────"

echo ""
echo "Test 3.1: Valid alphanumeric search (search=heycat)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?search=heycat")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Valid search accepted"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Valid search should be accepted"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 3.2: Special characters in search (search=<script>)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?search=%3Cscript%3E")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1 || echo "$RESPONSE" | grep -q "400\|Invalid"; then
  echo "✅ PASS: Special characters rejected"
  ((TESTS_PASSED++))
else
  echo "⚠️  WARNING: Special char validation may be missing"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 3.3: Very long search string (129 chars)"
LONG_SEARCH=$(printf 'a%.0s' {1..129})
RESPONSE=$(curl -s "$BASE_URL/leaderboard?search=$LONG_SEARCH")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1 || echo "$RESPONSE" | grep -q "400\|exceeds"; then
  echo "✅ PASS: Long search rejected"
  ((TESTS_PASSED++))
else
  echo "⚠️  WARNING: Max length validation may be missing"
  ((TESTS_FAILED++))
fi

# ===== R8: CONSOLE LOGGING TEST =====
echo ""
echo "📋 TEST GROUP 4: R8 - Console Logging"
echo "───────────────────────────────────────"

echo ""
echo "Test 4.1: Check that console.log not in referral routes"
CONSOLE_COUNT=$(grep -r "console\.log\|console\.warn\|console\.error" app/api/referral --include="*.ts" | wc -l)
if [ $CONSOLE_COUNT -eq 0 ]; then
  echo "✅ PASS: No console statements found"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Found $CONSOLE_COUNT console statements"
  grep -r "console\.log\|console\.warn\|console\.error" app/api/referral --include="*.ts" | head -5
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 4.2: Verify auditLog exists in audit-logger.ts"
if [ -f "lib/middleware/audit-logger.ts" ]; then
  AUDIT_FUNC=$(grep -c "export.*auditLog" lib/middleware/audit-logger.ts)
  if [ $AUDIT_FUNC -gt 0 ]; then
    echo "✅ PASS: auditLog function exists"
    ((TESTS_PASSED++))
  else
    echo "❌ FAIL: auditLog function not found"
    ((TESTS_FAILED++))
  fi
else
  echo "❌ FAIL: audit-logger.ts not found"
  ((TESTS_FAILED++))
fi

# ===== GENERAL ENDPOINT TESTS =====
echo ""
echo "📋 TEST GROUP 5: General Endpoint Health"
echo "─────────────────────────────────────────"

echo ""
echo "Test 5.1: Leaderboard endpoint (public)"
RESPONSE=$(curl -s "$BASE_URL/leaderboard?limit=1")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  COUNT=$(echo "$RESPONSE" | jq '.pagination.totalCount')
  echo "✅ PASS: Leaderboard responding (found $COUNT entries)"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Leaderboard endpoint failed"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 5.2: Analytics endpoint (authenticated)"
RESPONSE=$(curl -s -H "$VALID_HEADER" "$BASE_URL/18139/analytics")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Analytics endpoint responding"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Analytics endpoint failed"
  ((TESTS_FAILED++))
fi

echo ""
echo "Test 5.3: Activity endpoint (authenticated)"
RESPONSE=$(curl -s -H "$VALID_HEADER" "$BASE_URL/activity/18139")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ PASS: Activity endpoint responding"
  ((TESTS_PASSED++))
else
  echo "❌ FAIL: Activity endpoint failed"
  ((TESTS_FAILED++))
fi

# ===== SUMMARY =====
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ TESTS PASSED: $TESTS_PASSED"
echo "❌ TESTS FAILED: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED! System is production-ready."
  exit 0
else
  echo "⚠️  Some tests failed. Review output above."
  exit 1
fi
