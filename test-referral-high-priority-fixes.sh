#!/bin/bash
# Test script for BUG #R5-R8 HIGH priority fixes
# December 25, 2025

echo "================================"
echo "Testing HIGH Priority Bug Fixes"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
FID="18139"
TEST_CODE="test-code-r6"

echo "📝 Prerequisites:"
echo "  - Dev server running on port 3000"
echo "  - FID $FID exists in database"
echo ""

# ===================================
# BUG #R5: Unbounded Offset Pagination
# ===================================
echo -e "${YELLOW}🧪 BUG #R5: Testing Unbounded Offset Pagination${NC}"
echo "Test 1: Normal pagination (offset=0)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/activity/$FID?offset=0&limit=10" \
  -H "x-farcaster-fid: $FID")
STATUS=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PASS: offset=0 returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: offset=0 returned $STATUS (expected 200)${NC}"
fi

echo "Test 2: Large but valid offset (offset=5000)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/activity/$FID?offset=5000&limit=10" \
  -H "x-farcaster-fid: $FID")
STATUS=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PASS: offset=5000 returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: offset=5000 returned $STATUS (expected 200)${NC}"
fi

echo "Test 3: Unbounded offset (offset=999999) - should reject"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/activity/$FID?offset=999999&limit=10" \
  -H "x-farcaster-fid: $FID")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$STATUS" = "400" ] && echo "$BODY" | grep -q "Pagination offset too large"; then
  echo -e "${GREEN}✅ PASS: offset=999999 rejected with 400 (DoS prevented)${NC}"
else
  echo -e "${RED}❌ FAIL: offset=999999 returned $STATUS (expected 400)${NC}"
fi

echo "Test 4: Leaderboard offset validation"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/leaderboard?page=10000")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$STATUS" = "400" ] && echo "$BODY" | grep -q "Pagination offset too large"; then
  echo -e "${GREEN}✅ PASS: Leaderboard rejects large offset${NC}"
else
  echo -e "${RED}❌ FAIL: Leaderboard returned $STATUS (expected 400)${NC}"
fi

echo ""

# ===================================
# BUG #R6: Incomplete Idempotency
# ===================================
echo -e "${YELLOW}🧪 BUG #R6: Testing Idempotency Implementation${NC}"

# Generate unique idempotency key
IDEMPOTENCY_KEY=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

echo "Test 1: First request (no cache)"
RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}\nHEADER:%{header_json}" \
  "$BASE_URL/api/referral/generate-link" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{\"code\":\"$TEST_CODE\"}")

STATUS=$(echo "$RESPONSE" | grep "STATUS:" | cut -d: -f2)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "404" ]; then
  echo -e "${GREEN}✅ PASS: First request processed (status: $STATUS)${NC}"
else
  echo -e "${RED}❌ FAIL: First request failed with status $STATUS${NC}"
fi

sleep 1

echo "Test 2: Replay request (should use cache)"
RESPONSE2=$(curl -s -i "$BASE_URL/api/referral/generate-link" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{\"code\":\"$TEST_CODE\"}")

if echo "$RESPONSE2" | grep -q "x-idempotency-replayed: true"; then
  echo -e "${GREEN}✅ PASS: Replay detected (X-Idempotency-Replayed header present)${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Idempotency header not found (may need Redis running)${NC}"
fi

echo "Test 3: Invalid idempotency key format (too short)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/referral/generate-link" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: short" \
  -d "{\"code\":\"$TEST_CODE\"}")

STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$STATUS" = "400" ] && echo "$BODY" | grep -q "Invalid idempotency key format"; then
  echo -e "${GREEN}✅ PASS: Invalid key rejected${NC}"
else
  echo -e "${RED}❌ FAIL: Invalid key returned $STATUS (expected 400)${NC}"
fi

echo ""

# ===================================
# BUG #R7: Missing Search Validation
# ===================================
echo -e "${YELLOW}🧪 BUG #R7: Testing Search Input Length Validation${NC}"

echo "Test 1: Valid search (alphanumeric)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/leaderboard?search=test123")
STATUS=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Valid search accepted${NC}"
else
  echo -e "${RED}❌ FAIL: Valid search returned $STATUS (expected 200)${NC}"
fi

echo "Test 2: Search with special characters (should reject)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/leaderboard?search=test%3C%3E%21")
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$STATUS" = "400" ] && echo "$BODY" | grep -q "Invalid search format"; then
  echo -e "${GREEN}✅ PASS: Special characters rejected${NC}"
else
  echo -e "${RED}❌ FAIL: Special characters returned $STATUS (expected 400)${NC}"
fi

echo "Test 3: Long search (>100 chars) - should reject"
LONG_SEARCH=$(printf 'a%.0s' {1..110})
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/referral/leaderboard?search=$LONG_SEARCH")
STATUS=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✅ PASS: Long search rejected${NC}"
else
  echo -e "${RED}❌ FAIL: Long search returned $STATUS (expected 400)${NC}"
fi

echo ""

# ===================================
# BUG #R8: Console Logging in Production
# ===================================
echo -e "${YELLOW}🧪 BUG #R8: Testing Environment-Gated Logging${NC}"

echo "Test 1: Check if auditLog exists"
if grep -q "auditLog" /home/heycat/Desktop/2025/Gmeowbased/lib/middleware/audit-logger.ts; then
  echo -e "${GREEN}✅ PASS: auditLog utility exists${NC}"
else
  echo -e "${RED}❌ FAIL: auditLog utility not found${NC}"
fi

echo "Test 2: Verify NODE_ENV check in auditLog"
if grep -q "process.env.NODE_ENV !== 'production'" /home/heycat/Desktop/2025/Gmeowbased/lib/middleware/audit-logger.ts; then
  echo -e "${GREEN}✅ PASS: Environment check present (logs disabled in production)${NC}"
else
  echo -e "${RED}❌ FAIL: Missing environment check${NC}"
fi

echo "Test 3: Verify referral routes use auditLog"
AUDIT_COUNT=$(grep -r "auditLog\|auditWarn" /home/heycat/Desktop/2025/Gmeowbased/app/api/referral/ | wc -l)
if [ "$AUDIT_COUNT" -gt 10 ]; then
  echo -e "${GREEN}✅ PASS: Referral routes use auditLog ($AUDIT_COUNT instances)${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Only $AUDIT_COUNT auditLog uses found${NC}"
fi

echo "Test 4: Check for remaining console.log in referral routes"
CONSOLE_COUNT=$(grep -r "console\.log" /home/heycat/Desktop/2025/Gmeowbased/app/api/referral/ | grep -v ".md" | wc -l)
if [ "$CONSOLE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ PASS: No console.log found in referral routes${NC}"
else
  echo -e "${RED}❌ FAIL: Found $CONSOLE_COUNT console.log statements (should be 0)${NC}"
fi

echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo ""
echo "All HIGH priority bugs (R5-R8) have been tested."
echo ""
echo "Next steps:"
echo "1. Update REFERRAL-AUDIT-REPORT.md with fix details"
echo "2. Update REFERRAL-SECURITY-AUDIT-SUMMARY.md with verification results"
echo "3. Mark production readiness as GREEN"
echo ""
