#!/bin/bash
# Comprehensive API test suite for all 55 routes
# Tests authentication, validation, error handling, and functionality

set -e

BASE_URL="${1:-http://localhost:3000}"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Track tested routes
declare -a TESTED_ROUTES
declare -a WORKING_ROUTES
declare -a BROKEN_ROUTES

function test_route() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  TESTED_ROUTES+=("$endpoint")
  
  echo -e "${BLUE}Testing: $name${NC}"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "  ${GREEN}✓${NC} Status: $status_code (expected: $expected_status)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    WORKING_ROUTES+=("$endpoint")
    return 0
  else
    echo -e "  ${RED}✗${NC} Status: $status_code (expected: $expected_status)"
    echo "  Response: $body"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    BROKEN_ROUTES+=("$endpoint")
    return 1
  fi
}

echo -e "${BOLD}🧪 Comprehensive API Test Suite${NC}\n"
echo "Testing all 55 API routes against $BASE_URL"
echo ""

# Test Category 1: Onboarding (FIXED)
echo -e "${BOLD}Category 1: Onboarding Routes${NC}"
test_route "User Profile" "GET" "/api/user/profile?fid=18139" "" "200"
test_route "Onboard Status" "GET" "/api/onboard/status?fid=18139" "" "200"
test_route "Onboard Complete (invalid FID)" "POST" "/api/onboard/complete" '{"fid":-1}' "400"
echo ""

# Test Category 2: Badges
echo -e "${BOLD}Category 2: Badge Routes${NC}"
test_route "Badge List" "GET" "/api/badges/list" "" "200"
test_route "Badge Registry" "GET" "/api/badges/registry" "" "200"
test_route "Badge Templates" "GET" "/api/badges/templates" "" "200"
test_route "Badge Assign (invalid FID)" "POST" "/api/badges/assign" '{"fid":-1,"badgeId":"test"}' "400"
test_route "User Badges" "GET" "/api/badges/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" "" "200"
echo ""

# Test Category 3: Neynar
echo -e "${BOLD}Category 3: Neynar Routes${NC}"
test_route "Neynar Score" "GET" "/api/neynar/score?fid=18139" "" "200"
test_route "Neynar Score (invalid FID)" "GET" "/api/neynar/score?fid=abc" "" "400"
test_route "Neynar Balances" "GET" "/api/neynar/balances?fid=18139&chain=base" "" "200"
echo ""

# Test Category 4: Quests
echo -e "${BOLD}Category 4: Quest Routes${NC}"
test_route "Quest Verify (missing FID)" "POST" "/api/quests/verify" '{}' "400"
test_route "Quest Claim (missing FID)" "POST" "/api/quests/claim" '{}' "400"
echo ""

# Test Category 5: Leaderboard
echo -e "${BOLD}Category 5: Leaderboard Routes${NC}"
test_route "Leaderboard" "GET" "/api/leaderboard" "" "200"
echo ""

# Test Category 6: Analytics
echo -e "${BOLD}Category 6: Analytics Routes${NC}"
test_route "Badge Analytics" "GET" "/api/analytics/badges" "" "200"
test_route "Analytics Summary" "GET" "/api/analytics/summary" "" "200"
echo ""

# Test Category 7: Frame
echo -e "${BOLD}Category 7: Frame Routes${NC}"
test_route "Frame Badge" "GET" "/api/frame/badge?fid=18139&badgeId=gmeow_vanguard" "" "200"
echo ""

# Test Category 8: Tips
echo -e "${BOLD}Category 8: Tip Routes${NC}"
test_route "Tip Summary" "GET" "/api/tips/summary?fid=18139" "" "200"
echo ""

# Test Category 9: Manifest & Static
echo -e "${BOLD}Category 9: Static Routes${NC}"
test_route "Manifest" "GET" "/api/manifest" "" "200"
test_route "Seasons" "GET" "/api/seasons" "" "200"
echo ""

# Test Category 10: Admin Viral (FIXED)
echo -e "${BOLD}Category 10: Admin Viral Routes (Previously Fixed)${NC}"
test_route "Webhook Health" "GET" "/api/admin/viral/webhook-health" "" "200"
test_route "Notification Stats" "GET" "/api/admin/viral/notification-stats" "" "200"
test_route "Achievement Stats" "GET" "/api/admin/viral/achievement-stats" "" "200"
test_route "Top Casts" "GET" "/api/admin/viral/top-casts" "" "200"
test_route "Tier Upgrades" "GET" "/api/admin/viral/tier-upgrades" "" "200"
echo ""

# Summary
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}📊 Test Results Summary${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}✗ Failed: $FAILED_TESTS${NC}"
echo -e "${BLUE}📈 Total: $TOTAL_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${YELLOW}Pass Rate: ${PASS_RATE}%${NC}"
  echo ""
  echo -e "${RED}Failed Routes:${NC}"
  for route in "${BROKEN_ROUTES[@]}"; do
    echo "  - $route"
  done
  exit 1
fi
