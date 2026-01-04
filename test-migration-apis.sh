#!/bin/bash

# Migration API Testing Script
# Tests all 12 migrated pages across Phases 1-5
# Date: January 2, 2026

set -e

BASE_URL="http://localhost:3000"
RESULTS_FILE="/tmp/migration-api-test-results.txt"
FAILED_TESTS=0
PASSED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🧪 Migration API Testing - Phases 1-5" | tee "$RESULTS_FILE"
echo "======================================" | tee -a "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"
echo "Base URL: $BASE_URL" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Function to test API endpoint
test_api() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... " | tee -a "$RESULTS_FILE"
    
    # Make request and capture status code and response time
    response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "$BASE_URL$endpoint" 2>&1)
    status_code=$(echo "$response" | cut -d'|' -f1)
    response_time=$(echo "$response" | cut -d'|' -f2)
    
    # Convert response time to milliseconds
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($status_code, ${response_time_ms}ms)" | tee -a "$RESULTS_FILE"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code, ${response_time_ms}ms)" | tee -a "$RESULTS_FILE"
        ((FAILED_TESTS++))
    fi
}

# Check if server is running
echo "🔍 Checking if dev server is running..." | tee -a "$RESULTS_FILE"
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Dev server not running!${NC}" | tee -a "$RESULTS_FILE"
    echo -e "${YELLOW}Please run: pnpm dev${NC}" | tee -a "$RESULTS_FILE"
    exit 1
fi
echo -e "${GREEN}✅ Dev server is running${NC}\n" | tee -a "$RESULTS_FILE"

# ========================================
# PHASE 1-2: Leaderboard, Dashboard, Profile
# ========================================
echo -e "${BLUE}Phase 1-2: Leaderboard, Dashboard, Profile${NC}" | tee -a "$RESULTS_FILE"
echo "-------------------------------------------" | tee -a "$RESULTS_FILE"

# Page 1: Leaderboard
test_api "Leaderboard API (v2)" "/api/leaderboard-v2"
test_api "Leaderboard Stats API" "/api/leaderboard-v2/stats"
test_api "Leaderboard Badges API" "/api/leaderboard-v2/badges"

# Page 2: Dashboard
test_api "Dashboard Activity Feed" "/api/dashboard/activity-feed"
test_api "Dashboard Top Casters" "/api/dashboard/top-casters"
test_api "Dashboard Trending Channels" "/api/dashboard/trending-channels"

# Page 3 & 4: Profile (Own & Other User)
# Note: FID 3 is example - use actual FID from your data
test_api "User Profile API (FID 3)" "/api/user/profile/3"
test_api "User Activity API (FID 3)" "/api/user/activity/3"
test_api "User Badges API (FID 3)" "/api/user/badges/3"

echo "" | tee -a "$RESULTS_FILE"

# ========================================
# PHASE 3: Guild Pages
# ========================================
echo -e "${BLUE}Phase 3: Guild Pages${NC}" | tee -a "$RESULTS_FILE"
echo "-------------------------------------------" | tee -a "$RESULTS_FILE"

# Page 5: Guild List
test_api "Guild List API" "/api/guild/list"
test_api "Guild Leaderboard API" "/api/guild/leaderboard"

# Page 6: Guild Detail (Guild ID 1 as example)
test_api "Guild Detail API (ID 1)" "/api/guild/1"
test_api "Guild Members API (ID 1)" "/api/guild/1/members"
test_api "Guild Analytics API (ID 1)" "/api/guild/1/analytics"
test_api "Guild Treasury API (ID 1)" "/api/guild/1/treasury"
test_api "Guild Events API (ID 1)" "/api/guild/1/events"

echo "" | tee -a "$RESULTS_FILE"

# ========================================
# PHASE 4: Quest Pages
# ========================================
echo -e "${BLUE}Phase 4: Quest Pages${NC}" | tee -a "$RESULTS_FILE"
echo "-------------------------------------------" | tee -a "$RESULTS_FILE"

# Page 7: Quest List
test_api "Quest List API" "/api/quests"

# Page 8: Quest Detail (using 'daily-engage' as example slug)
test_api "Quest Detail API (daily-engage)" "/api/quests/daily-engage"
test_api "Quest Progress API (daily-engage)" "/api/quests/daily-engage/progress"

# Page 9: Quest Create (covered by /api/quests/create - tested via UI)
# Page 10: Quest Manage (covers multiple quest management endpoints)
test_api "User Quests API (FID 3)" "/api/user/quests/3"
test_api "Unclaimed Quests API" "/api/quests/unclaimed"

echo "" | tee -a "$RESULTS_FILE"

# ========================================
# PHASE 5: Referral Pages
# ========================================
echo -e "${BLUE}Phase 5: Referral Pages${NC}" | tee -a "$RESULTS_FILE"
echo "-------------------------------------------" | tee -a "$RESULTS_FILE"

# Page 11-12: Referral Dashboard & Activity
test_api "Referral Leaderboard API" "/api/referral/leaderboard"
test_api "Referral Stats API (FID 3)" "/api/referral/3/stats"
test_api "Referral Analytics API (FID 3)" "/api/referral/3/analytics"
test_api "Referral Activity API (FID 3)" "/api/referral/activity/3"

echo "" | tee -a "$RESULTS_FILE"

# ========================================
# SUMMARY
# ========================================
echo "======================================" | tee -a "$RESULTS_FILE"
echo -e "${BLUE}TEST SUMMARY${NC}" | tee -a "$RESULTS_FILE"
echo "======================================" | tee -a "$RESULTS_FILE"
TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
echo "Total Tests: $TOTAL_TESTS" | tee -a "$RESULTS_FILE"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}" | tee -a "$RESULTS_FILE"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}" | tee -a "$RESULTS_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}" | tee -a "$RESULTS_FILE"
    echo "Migration APIs are working correctly." | tee -a "$RESULTS_FILE"
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}" | tee -a "$RESULTS_FILE"
    echo "Please check the failed endpoints above." | tee -a "$RESULTS_FILE"
fi

echo "" | tee -a "$RESULTS_FILE"
echo "Full results saved to: $RESULTS_FILE" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# ========================================
# BROWSER TESTING GUIDE
# ========================================
echo -e "${BLUE}NEXT STEPS: Browser Testing${NC}" | tee -a "$RESULTS_FILE"
echo "======================================" | tee -a "$RESULTS_FILE"
echo "Open these pages in your browser:" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Phase 1-2:" | tee -a "$RESULTS_FILE"
echo "  1. $BASE_URL/leaderboard" | tee -a "$RESULTS_FILE"
echo "  2. $BASE_URL/dashboard" | tee -a "$RESULTS_FILE"
echo "  3. $BASE_URL/profile" | tee -a "$RESULTS_FILE"
echo "  4. $BASE_URL/profile/3" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Phase 3:" | tee -a "$RESULTS_FILE"
echo "  5. $BASE_URL/guilds" | tee -a "$RESULTS_FILE"
echo "  6. $BASE_URL/guilds/1" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Phase 4:" | tee -a "$RESULTS_FILE"
echo "  7. $BASE_URL/quests" | tee -a "$RESULTS_FILE"
echo "  8. $BASE_URL/quests/daily-engage" | tee -a "$RESULTS_FILE"
echo "  9. $BASE_URL/quests/create" | tee -a "$RESULTS_FILE"
echo " 10. $BASE_URL/quests/manage" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Phase 5:" | tee -a "$RESULTS_FILE"
echo " 11. $BASE_URL/referral" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Check for:" | tee -a "$RESULTS_FILE"
echo "  ✅ Data loads from Subsquid/Supabase" | tee -a "$RESULTS_FILE"
echo "  ✅ Skeleton loading appears briefly" | tee -a "$RESULTS_FILE"
echo "  ✅ No console errors (F12 → Console)" | tee -a "$RESULTS_FILE"
echo "  ✅ GraphQL queries <100ms (F12 → Network)" | tee -a "$RESULTS_FILE"

exit $FAILED_TESTS
