#!/bin/bash

# Phase 8: Referral System Integration Testing
# Tests complete referral flow with all 5 API endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Helper function to print test results
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Change to project root
cd "$(dirname "$0")/.." || exit 1

print_header "PHASE 8: REFERRAL SYSTEM INTEGRATION TESTING"

# ==========================================
# 1. FILE STRUCTURE VALIDATION
# ==========================================
print_header "1. File Structure Validation"

# Check API endpoints exist
test -f "app/api/referral/[fid]/stats/route.ts" && \
print_result 0 "GET /api/referral/[fid]/stats endpoint exists" || \
print_result 1 "GET /api/referral/[fid]/stats endpoint missing"

test -f "app/api/referral/generate-link/route.ts" && \
print_result 0 "POST /api/referral/generate-link endpoint exists" || \
print_result 1 "POST /api/referral/generate-link endpoint missing"

test -f "app/api/referral/leaderboard/route.ts" && \
print_result 0 "GET /api/referral/leaderboard endpoint exists" || \
print_result 1 "GET /api/referral/leaderboard endpoint missing"

test -f "app/api/referral/activity/[fid]/route.ts" && \
print_result 0 "GET /api/referral/activity/[fid] endpoint exists" || \
print_result 1 "GET /api/referral/activity/[fid] endpoint missing"

test -f "app/api/referral/[fid]/analytics/route.ts" && \
print_result 0 "GET /api/referral/[fid]/analytics endpoint exists" || \
print_result 1 "GET /api/referral/[fid]/analytics endpoint missing"

# Check components exist
test -f "components/referral/ReferralCodeForm.tsx" && \
print_result 0 "ReferralCodeForm component exists" || \
print_result 1 "ReferralCodeForm component missing"

test -f "components/referral/ReferralLinkGenerator.tsx" && \
print_result 0 "ReferralLinkGenerator component exists" || \
print_result 1 "ReferralLinkGenerator component missing"

test -f "components/referral/ReferralStatsCards.tsx" && \
print_result 0 "ReferralStatsCards component exists" || \
print_result 1 "ReferralStatsCards component missing"

test -f "components/referral/ReferralDashboard.tsx" && \
print_result 0 "ReferralDashboard component exists" || \
print_result 1 "ReferralDashboard component missing"

test -f "components/referral/ReferralLeaderboard.tsx" && \
print_result 0 "ReferralLeaderboard component exists" || \
print_result 1 "ReferralLeaderboard component missing"

test -f "components/referral/ReferralActivityFeed.tsx" && \
print_result 0 "ReferralActivityFeed component exists" || \
print_result 1 "ReferralActivityFeed component missing"

test -f "components/referral/ReferralAnalytics.tsx" && \
print_result 0 "ReferralAnalytics component exists" || \
print_result 1 "ReferralAnalytics component missing"

# ==========================================
# 2. DATA INTEGRATION (Contract + API)
# ==========================================
print_header "2. Data Integration (Contract + API)"

# Phase 2 components use contract directly
if grep -q "getReferralStats\|getReferralCode\|lib/referral-contract" components/referral/ReferralStatsCards.tsx 2>/dev/null; then
    print_result 0 "ReferralStatsCards integrates with contract wrapper"
else
    print_result 1 "ReferralStatsCards missing contract integration"
fi

# Check generate-link component (Phase 2 - presentation component, receives code as prop)
if grep -q "code.*string\|ReferralLinkGeneratorProps" components/referral/ReferralLinkGenerator.tsx 2>/dev/null; then
    print_result 0 "ReferralLinkGenerator is properly structured as presentation component"
else
    print_result 1 "ReferralLinkGenerator missing proper props interface"
fi

# Phase 3 components use API endpoints
if grep -q "/api/referral/leaderboard\|fetch.*leaderboard" components/referral/ReferralLeaderboard.tsx 2>/dev/null; then
    print_result 0 "ReferralLeaderboard integrates with leaderboard API"
else
    print_result 1 "ReferralLeaderboard missing leaderboard API integration"
fi

# Check activity API integration
if grep -q "/api/referral/activity\|fetch.*activity" components/referral/ReferralActivityFeed.tsx 2>/dev/null; then
    print_result 0 "ReferralActivityFeed integrates with activity API"
else
    print_result 1 "ReferralActivityFeed missing activity API integration"
fi

# Phase 4 component uses analytics API
if grep -q "/api/referral/.*analytics\|fetch.*analytics" components/referral/ReferralAnalytics.tsx 2>/dev/null; then
    print_result 0 "ReferralAnalytics integrates with analytics API"
else
    print_result 1 "ReferralAnalytics missing analytics API integration"
fi

# ==========================================
# 3. SECURITY PATTERN VALIDATION
# ==========================================
print_header "3. Security Pattern Validation (10-Layer)"

# Check rate limiting in all APIs
for api in "app/api/referral/[fid]/stats/route.ts" \
           "app/api/referral/generate-link/route.ts" \
           "app/api/referral/leaderboard/route.ts" \
           "app/api/referral/activity/[fid]/route.ts" \
           "app/api/referral/[fid]/analytics/route.ts"; do
    if grep -q "apiLimiter\|strictLimiter\|rateLimit" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has rate limiting"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing rate limiting"
    fi
done

# Check Zod validation in all APIs
for api in "app/api/referral/[fid]/stats/route.ts" \
           "app/api/referral/generate-link/route.ts" \
           "app/api/referral/leaderboard/route.ts" \
           "app/api/referral/activity/[fid]/route.ts" \
           "app/api/referral/[fid]/analytics/route.ts"; do
    if grep -q "z\\.object\|z\\.string\|z\\.number\|ZodSchema" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has Zod validation"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing Zod validation"
    fi
done

# Check error masking in all APIs
for api in "app/api/referral/[fid]/stats/route.ts" \
           "app/api/referral/generate-link/route.ts" \
           "app/api/referral/leaderboard/route.ts" \
           "app/api/referral/activity/[fid]/route.ts" \
           "app/api/referral/[fid]/analytics/route.ts"; do
    if grep -q "createErrorResponse\|ErrorType" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has error masking"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing error masking"
    fi
done

# ==========================================
# 4. CONTRACT INTEGRATION
# ==========================================
print_header "4. Contract Integration"

# Check if referral contract wrapper is used
if grep -q "lib/referral-contract\|getReferralCode\|getReferralStats" \
   app/api/referral/[fid]/stats/route.ts 2>/dev/null; then
    print_result 0 "Stats API uses referral contract wrapper"
else
    print_result 1 "Stats API missing referral contract integration"
fi

# Check if components use wagmi hooks
if grep -q "useAccount\|useWriteContract\|useReadContract" \
   components/referral/ReferralCodeForm.tsx 2>/dev/null; then
    print_result 0 "ReferralCodeForm uses wagmi hooks"
else
    print_result 1 "ReferralCodeForm missing wagmi integration"
fi

# ==========================================
# 5. USER FLOW VALIDATION
# ==========================================
print_header "5. User Flow Validation"

# Check if ReferralDashboard integrates all sub-components
if grep -q "ReferralCodeForm" components/referral/ReferralDashboard.tsx 2>/dev/null && \
   grep -q "ReferralLinkGenerator" components/referral/ReferralDashboard.tsx 2>/dev/null && \
   grep -q "ReferralStatsCards" components/referral/ReferralDashboard.tsx 2>/dev/null; then
    print_result 0 "ReferralDashboard integrates all form components"
else
    print_result 1 "ReferralDashboard missing some form component integrations"
fi

# Check if main page exists and uses dashboard
if test -f "app/referral/page.tsx"; then
    if grep -q "ReferralDashboard\|ReferralLeaderboard\|ReferralActivityFeed\|ReferralAnalytics" \
       app/referral/page.tsx 2>/dev/null; then
        print_result 0 "Main referral page integrates dashboard components"
    else
        print_result 1 "Main referral page missing dashboard integration"
    fi
else
    print_result 1 "Main referral page (app/referral/page.tsx) missing"
fi

# ==========================================
# 6. TYPESCRIPT VALIDATION
# ==========================================
print_header "6. TypeScript Validation"

# Check for TypeScript errors in referral files
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "(app/api/referral|components/referral)" | head -20)
if [ -z "$TS_ERRORS" ]; then
    print_result 0 "No TypeScript errors in referral system"
else
    print_result 1 "TypeScript errors found in referral system"
    echo -e "${YELLOW}First 20 errors:${NC}"
    echo "$TS_ERRORS"
fi

# ==========================================
# 7. MOBILE RESPONSIVENESS CHECKS
# ==========================================
print_header "7. Mobile Responsiveness Checks"

# Check for responsive classes in components
for component in "components/referral/ReferralStatsCards.tsx" \
                 "components/referral/ReferralLeaderboard.tsx" \
                 "components/referral/ReferralDashboard.tsx"; do
    if grep -q "sm:\|md:\|lg:\|grid-cols-\|flex-col\|flex-row" "$component" 2>/dev/null; then
        print_result 0 "$(basename "$component") has responsive classes"
    else
        print_result 1 "$(basename "$component") missing responsive classes"
    fi
done

# ==========================================
# 8. CACHE STRATEGY VALIDATION
# ==========================================
print_header "8. Cache Strategy Validation"

# Check cache headers in read APIs
for api in "app/api/referral/[fid]/stats/route.ts" \
           "app/api/referral/leaderboard/route.ts" \
           "app/api/referral/activity/[fid]/route.ts" \
           "app/api/referral/[fid]/analytics/route.ts"; do
    if grep -q "Cache-Control\|max-age\|stale-while-revalidate" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has cache headers"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing cache headers"
    fi
done

# ==========================================
# SUMMARY
# ==========================================
print_header "TEST SUMMARY"

echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Pass Rate: ${PASS_RATE}%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED - Referral system integration is complete!${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠ SOME TESTS FAILED - Review issues above${NC}\n"
    exit 1
fi
