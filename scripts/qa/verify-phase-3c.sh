#!/bin/bash
# Phase 3C Verification Script
# Tests badge share frame system endpoints and components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://gmeowbased.com}"
TEST_FID="${TEST_FID:-12345}"
TEST_BADGE_ID="${TEST_BADGE_ID:-gmeow-vanguard}"
TEMP_DIR="/tmp/phase-3c-test"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  FAILED_TESTS=$((FAILED_TESTS + 1))
}

print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Create temp directory
mkdir -p "$TEMP_DIR"

# Test 1: File Existence
print_header "Phase 1: File Existence Checks"

print_test "Checking lib/frame-badge.ts exists"
if [ -f "./lib/frame-badge.ts" ]; then
  print_pass "lib/frame-badge.ts exists"
else
  print_fail "lib/frame-badge.ts not found"
fi

print_test "Checking app/api/frame/badgeShare/route.ts exists"
if [ -f "./app/api/frame/badgeShare/route.ts" ]; then
  print_pass "app/api/frame/badgeShare/route.ts exists"
else
  print_fail "app/api/frame/badgeShare/route.ts not found"
fi

print_test "Checking app/api/frame/badgeShare/image/route.tsx exists"
if [ -f "./app/api/frame/badgeShare/image/route.tsx" ]; then
  print_pass "app/api/frame/badgeShare/image/route.tsx exists"
else
  print_fail "app/api/frame/badgeShare/image/route.tsx not found"
fi

print_test "Checking components/frame/BadgeShareCard.tsx exists"
if [ -f "./components/frame/BadgeShareCard.tsx" ]; then
  print_pass "components/frame/BadgeShareCard.tsx exists"
else
  print_fail "components/frame/BadgeShareCard.tsx not found"
fi

# Test 2: TypeScript Compilation
print_header "Phase 2: TypeScript Compilation"

print_test "Running TypeScript compiler"
if pnpm tsc --noEmit > "$TEMP_DIR/tsc-output.txt" 2>&1; then
  print_pass "No TypeScript errors"
else
  print_fail "TypeScript errors found"
  cat "$TEMP_DIR/tsc-output.txt"
fi

# Test 3: Linting
print_header "Phase 3: Linting"

print_test "Running ESLint"
if pnpm lint > "$TEMP_DIR/lint-output.txt" 2>&1; then
  print_pass "No linting errors"
else
  print_fail "Linting errors found"
  cat "$TEMP_DIR/lint-output.txt"
fi

# Test 4: Frame Endpoint Tests
print_header "Phase 4: Frame Endpoint Tests"

print_test "Testing frame endpoint with valid params"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/frame/badgeShare?fid=$TEST_FID&badgeId=$TEST_BADGE_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  print_pass "Frame endpoint returns 200"
  
  # Check for frame meta tags
  if echo "$BODY" | grep -q 'fc:frame'; then
    print_pass "Frame contains fc:frame meta tag"
  else
    print_fail "Frame missing fc:frame meta tag"
  fi
  
  if echo "$BODY" | grep -q 'fc:frame:image'; then
    print_pass "Frame contains fc:frame:image meta tag"
  else
    print_fail "Frame missing fc:frame:image meta tag"
  fi
  
  if echo "$BODY" | grep -q 'fc:frame:button:1'; then
    print_pass "Frame contains fc:frame:button:1 meta tag"
  else
    print_fail "Frame missing fc:frame:button:1 meta tag"
  fi
else
  print_fail "Frame endpoint returned $HTTP_CODE (expected 200)"
fi

print_test "Testing frame endpoint with missing fid"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frame/badgeShare?badgeId=$TEST_BADGE_ID")
if [ "$HTTP_CODE" = "400" ]; then
  print_pass "Frame endpoint returns 400 for missing fid"
else
  print_fail "Frame endpoint returned $HTTP_CODE (expected 400)"
fi

print_test "Testing frame endpoint with invalid fid"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frame/badgeShare?fid=abc&badgeId=$TEST_BADGE_ID")
if [ "$HTTP_CODE" = "400" ]; then
  print_pass "Frame endpoint returns 400 for invalid fid"
else
  print_fail "Frame endpoint returned $HTTP_CODE (expected 400)"
fi

print_test "Testing frame endpoint with missing badgeId"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frame/badgeShare?fid=$TEST_FID")
if [ "$HTTP_CODE" = "400" ]; then
  print_pass "Frame endpoint returns 400 for missing badgeId"
else
  print_fail "Frame endpoint returned $HTTP_CODE (expected 400)"
fi

print_test "Testing frame endpoint with invalid badgeId"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frame/badgeShare?fid=$TEST_FID&badgeId=INVALID_ID")
if [ "$HTTP_CODE" = "400" ]; then
  print_pass "Frame endpoint returns 400 for invalid badgeId"
else
  print_fail "Frame endpoint returned $HTTP_CODE (expected 400)"
fi

print_test "Testing frame endpoint cache headers"
CACHE_HEADER=$(curl -s -I "$BASE_URL/api/frame/badgeShare?fid=$TEST_FID&badgeId=$TEST_BADGE_ID" | grep -i "cache-control")
if echo "$CACHE_HEADER" | grep -q "max-age=300"; then
  print_pass "Frame endpoint has correct cache headers"
else
  print_fail "Frame endpoint missing correct cache headers"
fi

# Test 5: OG Image Endpoint Tests
print_header "Phase 5: OG Image Endpoint Tests"

print_test "Testing OG image endpoint with valid params"
HTTP_CODE=$(curl -s -o "$TEMP_DIR/test-image.png" -w "%{http_code}" "$BASE_URL/api/frame/badgeShare/image?fid=$TEST_FID&badgeId=$TEST_BADGE_ID")
if [ "$HTTP_CODE" = "200" ]; then
  print_pass "OG image endpoint returns 200"
  
  # Check if file is a valid PNG
  if file "$TEMP_DIR/test-image.png" | grep -q "PNG"; then
    print_pass "OG image is valid PNG"
    
    # Check image dimensions (requires imagemagick)
    if command -v identify &> /dev/null; then
      DIMENSIONS=$(identify -format "%wx%h" "$TEMP_DIR/test-image.png")
      if [ "$DIMENSIONS" = "1200x628" ]; then
        print_pass "OG image has correct dimensions (1200x628)"
      else
        print_fail "OG image has incorrect dimensions ($DIMENSIONS, expected 1200x628)"
      fi
    else
      print_info "Skipping dimension check (imagemagick not installed)"
    fi
    
    # Check file size
    FILE_SIZE=$(stat -f%z "$TEMP_DIR/test-image.png" 2>/dev/null || stat -c%s "$TEMP_DIR/test-image.png" 2>/dev/null)
    if [ "$FILE_SIZE" -lt 204800 ]; then # 200 KB
      print_pass "OG image size is acceptable ($(($FILE_SIZE / 1024)) KB)"
    else
      print_fail "OG image size is too large ($(($FILE_SIZE / 1024)) KB, expected < 200 KB)"
    fi
  else
    print_fail "OG image is not a valid PNG"
  fi
else
  print_fail "OG image endpoint returned $HTTP_CODE (expected 200)"
fi

print_test "Testing OG image endpoint with invalid fid"
HTTP_CODE=$(curl -s -o "$TEMP_DIR/error-image.png" -w "%{http_code}" "$BASE_URL/api/frame/badgeShare/image?fid=abc&badgeId=$TEST_BADGE_ID")
if [ "$HTTP_CODE" = "200" ]; then
  print_pass "OG image endpoint returns error image for invalid fid"
else
  print_fail "OG image endpoint returned $HTTP_CODE (expected 200)"
fi

print_test "Testing OG image endpoint cache headers"
CACHE_HEADER=$(curl -s -I "$BASE_URL/api/frame/badgeShare/image?fid=$TEST_FID&badgeId=$TEST_BADGE_ID" | grep -i "cache-control")
if echo "$CACHE_HEADER" | grep -q "max-age=300"; then
  print_pass "OG image endpoint has correct cache headers"
else
  print_fail "OG image endpoint missing correct cache headers"
fi

# Test 6: Helper Function Tests
print_header "Phase 6: Helper Function Tests"

print_test "Checking buildBadgeShareFrameUrl() export"
if grep -q "export function buildBadgeShareFrameUrl" "./lib/frame-badge.ts"; then
  print_pass "buildBadgeShareFrameUrl() is exported"
else
  print_fail "buildBadgeShareFrameUrl() not found"
fi

print_test "Checking buildBadgeShareImageUrl() export"
if grep -q "export function buildBadgeShareImageUrl" "./lib/frame-badge.ts"; then
  print_pass "buildBadgeShareImageUrl() is exported"
else
  print_fail "buildBadgeShareImageUrl() not found"
fi

print_test "Checking buildBadgeShareText() export"
if grep -q "export function buildBadgeShareText" "./lib/frame-badge.ts"; then
  print_pass "buildBadgeShareText() is exported"
else
  print_fail "buildBadgeShareText() not found"
fi

print_test "Checking getBadgeExplorerUrl() export"
if grep -q "export function getBadgeExplorerUrl" "./lib/frame-badge.ts"; then
  print_pass "getBadgeExplorerUrl() is exported"
else
  print_fail "getBadgeExplorerUrl() not found"
fi

print_test "Checking isValidBadgeId() export"
if grep -q "export function isValidBadgeId" "./lib/frame-badge.ts"; then
  print_pass "isValidBadgeId() is exported"
else
  print_fail "isValidBadgeId() not found"
fi

print_test "Checking isValidFid() export"
if grep -q "export function isValidFid" "./lib/frame-badge.ts"; then
  print_pass "isValidFid() is exported"
else
  print_fail "isValidFid() not found"
fi

# Test 7: Share Integration Tests
print_header "Phase 7: Share Integration Tests"

print_test "Checking share.ts has 'badge' type"
if grep -q "'badge'" "./lib/share.ts"; then
  print_pass "share.ts includes 'badge' type"
else
  print_fail "share.ts missing 'badge' type"
fi

print_test "Checking share.ts has badgeId field"
if grep -q "badgeId?" "./lib/share.ts"; then
  print_pass "share.ts includes badgeId field"
else
  print_fail "share.ts missing badgeId field"
fi

print_test "Checking badge inventory page uses frame share"
if grep -q "buildBadgeShareFrameUrl" "./app/profile/[fid]/badges/page.tsx"; then
  print_pass "Badge inventory page uses buildBadgeShareFrameUrl()"
else
  print_fail "Badge inventory page not using buildBadgeShareFrameUrl()"
fi

print_test "Checking badge inventory page uses buildBadgeShareText"
if grep -q "buildBadgeShareText" "./app/profile/[fid]/badges/page.tsx"; then
  print_pass "Badge inventory page uses buildBadgeShareText()"
else
  print_fail "Badge inventory page not using buildBadgeShareText()"
fi

# Test 8: Component Tests
print_header "Phase 8: Component Tests"

print_test "Checking BadgeShareCard component export"
if grep -q "export function BadgeShareCard" "./components/frame/BadgeShareCard.tsx"; then
  print_pass "BadgeShareCard component is exported"
else
  print_fail "BadgeShareCard component not found"
fi

print_test "Checking BadgeShareCard uses openWarpcastComposer"
if grep -q "openWarpcastComposer" "./components/frame/BadgeShareCard.tsx"; then
  print_pass "BadgeShareCard uses openWarpcastComposer()"
else
  print_fail "BadgeShareCard not using openWarpcastComposer()"
fi

print_test "Checking BadgeShareCard has share button"
if grep -q "Share on Warpcast" "./components/frame/BadgeShareCard.tsx"; then
  print_pass "BadgeShareCard has share button"
else
  print_fail "BadgeShareCard missing share button"
fi

# Test 9: Documentation Tests
print_header "Phase 9: Documentation Tests"

print_test "Checking PHASE-3C-SUMMARY.md exists"
if [ -f "./planning/badge/PHASE-3C-SUMMARY.md" ]; then
  print_pass "PHASE-3C-SUMMARY.md exists"
else
  print_fail "PHASE-3C-SUMMARY.md not found"
fi

print_test "Checking PHASE-3C-CHECKLIST.md exists"
if [ -f "./planning/badge/PHASE-3C-CHECKLIST.md" ]; then
  print_pass "PHASE-3C-CHECKLIST.md exists"
else
  print_fail "PHASE-3C-CHECKLIST.md not found"
fi

# Summary
print_header "Test Summary"

echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed.${NC}"
  exit 1
fi
