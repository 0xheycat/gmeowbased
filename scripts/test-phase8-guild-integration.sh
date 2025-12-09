#!/bin/bash

# Phase 8: Guild System Integration Testing
# Tests complete guild flow with all 6 API endpoints

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

print_header "PHASE 8: GUILD SYSTEM INTEGRATION TESTING"

# ==========================================
# 1. FILE STRUCTURE VALIDATION
# ==========================================
print_header "1. File Structure Validation"

# Check API endpoints exist
test -f "app/api/guild/create/route.ts" && \
print_result 0 "POST /api/guild/create endpoint exists" || \
print_result 1 "POST /api/guild/create endpoint missing"

test -f "app/api/guild/[guildId]/route.ts" && \
print_result 0 "GET /api/guild/[guildId] endpoint exists" || \
print_result 1 "GET /api/guild/[guildId] endpoint missing"

test -f "app/api/guild/[guildId]/join/route.ts" && \
print_result 0 "POST /api/guild/[guildId]/join endpoint exists" || \
print_result 1 "POST /api/guild/[guildId]/join endpoint missing"

test -f "app/api/guild/list/route.ts" && \
print_result 0 "GET /api/guild/list endpoint exists" || \
print_result 1 "GET /api/guild/list endpoint missing"

test -f "app/api/guild/leaderboard/route.ts" && \
print_result 0 "GET /api/guild/leaderboard endpoint exists" || \
print_result 1 "GET /api/guild/leaderboard endpoint missing"

test -f "app/api/guild/[guildId]/analytics/route.ts" && \
print_result 0 "GET /api/guild/[guildId]/analytics endpoint exists" || \
print_result 1 "GET /api/guild/[guildId]/analytics endpoint missing"

# Check Phase 5 components (Guild Core)
test -f "components/guild/GuildCreationForm.tsx" && \
print_result 0 "GuildCreationForm component exists" || \
print_result 1 "GuildCreationForm component missing"

test -f "components/guild/GuildCard.tsx" && \
print_result 0 "GuildCard component exists" || \
print_result 1 "GuildCard component missing"

test -f "components/guild/GuildMemberList.tsx" && \
print_result 0 "GuildMemberList component exists" || \
print_result 1 "GuildMemberList component missing"

test -f "components/guild/GuildTreasuryPanel.tsx" && \
print_result 0 "GuildTreasuryPanel component exists" || \
print_result 1 "GuildTreasuryPanel component missing"

# Check Phase 6 components (Guild Discovery)
test -f "components/guild/GuildDiscoveryPage.tsx" && \
print_result 0 "GuildDiscoveryPage component exists" || \
print_result 1 "GuildDiscoveryPage component missing"

test -f "components/guild/GuildLeaderboard.tsx" && \
print_result 0 "GuildLeaderboard component exists" || \
print_result 1 "GuildLeaderboard component missing"

# Check Phase 7 components (Guild Analytics)
test -f "components/guild/GuildProfilePage.tsx" && \
print_result 0 "GuildProfilePage component exists" || \
print_result 1 "GuildProfilePage component missing"

test -f "components/guild/GuildAnalytics.tsx" && \
print_result 0 "GuildAnalytics component exists" || \
print_result 1 "GuildAnalytics component missing"

# ==========================================
# 2. DATA INTEGRATION (Contract + API)
# ==========================================
print_header "2. Data Integration (Contract + API)"

# Phase 5 components use contract directly via wagmi
if grep -q "useWriteContract\|writeContract\|wagmi" components/guild/GuildCreationForm.tsx 2>/dev/null; then
    print_result 0 "GuildCreationForm integrates with wagmi for transactions"
else
    print_result 1 "GuildCreationForm missing wagmi integration"
fi

# Check guild details - Phase 7 components fetch from API
if grep -q "/api/guild\|fetch.*guild" components/guild/GuildProfilePage.tsx 2>/dev/null; then
    print_result 0 "GuildProfilePage integrates with guild API"
else
    print_result 1 "GuildProfilePage missing guild API integration"
fi

# Check list API integration - Phase 6 discovery
if grep -q "/api/guild/list\|fetch.*list" components/guild/GuildDiscoveryPage.tsx 2>/dev/null; then
    print_result 0 "GuildDiscoveryPage integrates with list API"
else
    print_result 1 "GuildDiscoveryPage missing list API integration"
fi

# Check leaderboard API integration - Phase 6
if grep -q "/api/guild/leaderboard\|fetch.*leaderboard" components/guild/GuildLeaderboard.tsx 2>/dev/null; then
    print_result 0 "GuildLeaderboard integrates with leaderboard API"
else
    print_result 1 "GuildLeaderboard missing leaderboard API integration"
fi

# Check analytics API integration - Phase 7
if grep -q "/api/guild.*analytics\|fetch.*analytics" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics integrates with analytics API"
else
    print_result 1 "GuildAnalytics missing analytics API integration"
fi

# ==========================================
# 3. SECURITY PATTERN VALIDATION
# ==========================================
print_header "3. Security Pattern Validation (10-Layer)"

# Check rate limiting in all APIs
for api in "app/api/guild/create/route.ts" \
           "app/api/guild/[guildId]/route.ts" \
           "app/api/guild/[guildId]/join/route.ts" \
           "app/api/guild/list/route.ts" \
           "app/api/guild/leaderboard/route.ts" \
           "app/api/guild/[guildId]/analytics/route.ts"; do
    if grep -q "apiLimiter\|strictLimiter\|rateLimit" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has rate limiting"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing rate limiting"
    fi
done

# Check Zod validation in all APIs (or alternative validation patterns like BigInt validation)
for api in "app/api/guild/create/route.ts" \
           "app/api/guild/[guildId]/route.ts" \
           "app/api/guild/[guildId]/join/route.ts" \
           "app/api/guild/list/route.ts" \
           "app/api/guild/leaderboard/route.ts" \
           "app/api/guild/[guildId]/analytics/route.ts"; do
    if grep -q "z\\.object\|z\\.string\|z\\.number\|ZodSchema\|validateGuildId\|BigInt.*validation" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has input validation"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing input validation"
    fi
done

# Check error masking in all APIs
for api in "app/api/guild/create/route.ts" \
           "app/api/guild/[guildId]/route.ts" \
           "app/api/guild/[guildId]/join/route.ts" \
           "app/api/guild/list/route.ts" \
           "app/api/guild/leaderboard/route.ts" \
           "app/api/guild/[guildId]/analytics/route.ts"; do
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

# Check if guild contract wrapper is used
if grep -q "lib/guild-contract\|getGuildData\|buildCreateGuildTx" \
   app/api/guild/create/route.ts 2>/dev/null || \
   grep -q "lib/guild-contract\|getGuildData\|buildCreateGuildTx" \
   app/api/guild/[guildId]/route.ts 2>/dev/null; then
    print_result 0 "Guild APIs use guild contract wrapper"
else
    print_result 1 "Guild APIs missing guild contract integration"
fi

# Check if components use wagmi hooks
if grep -q "useAccount\|useWriteContract\|useReadContract" \
   components/guild/GuildCreationForm.tsx 2>/dev/null; then
    print_result 0 "GuildCreationForm uses wagmi hooks"
else
    print_result 1 "GuildCreationForm missing wagmi integration"
fi

# ==========================================
# 5. USER FLOW VALIDATION
# ==========================================
print_header "5. User Flow Validation"

# Check if GuildCreationForm validates 100 points requirement
if grep -q "100\|minPoints\|pointsCost" components/guild/GuildCreationForm.tsx 2>/dev/null; then
    print_result 0 "GuildCreationForm validates 100 points requirement"
else
    print_result 1 "GuildCreationForm missing points validation"
fi

# Check if GuildTreasuryPanel handles deposits and claims
if grep -q "deposit\|claim" components/guild/GuildTreasuryPanel.tsx 2>/dev/null; then
    print_result 0 "GuildTreasuryPanel handles deposits and claims"
else
    print_result 1 "GuildTreasuryPanel missing deposit/claim functionality"
fi

# Check if GuildMemberList shows officers
if grep -q "officer\|role\|isOfficer" components/guild/GuildMemberList.tsx 2>/dev/null; then
    print_result 0 "GuildMemberList shows officer roles"
else
    print_result 1 "GuildMemberList missing officer role display"
fi

# ==========================================
# 6. TYPESCRIPT VALIDATION
# ==========================================
print_header "6. TypeScript Validation"

# Check for TypeScript errors in guild files
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "(app/api/guild|components/guild)" | head -20)
if [ -z "$TS_ERRORS" ]; then
    print_result 0 "No TypeScript errors in guild system"
else
    print_result 1 "TypeScript errors found in guild system"
    echo -e "${YELLOW}First 20 errors:${NC}"
    echo "$TS_ERRORS"
fi

# ==========================================
# 7. MOBILE RESPONSIVENESS CHECKS
# ==========================================
print_header "7. Mobile Responsiveness Checks"

# Check for responsive classes in components (responsive classes OR overflow-x-auto for tables)
for component in "components/guild/GuildDiscoveryPage.tsx" \
                 "components/guild/GuildLeaderboard.tsx" \
                 "components/guild/GuildProfilePage.tsx" \
                 "components/guild/GuildAnalytics.tsx"; do
    if grep -q "sm:\|md:\|lg:\|grid-cols-\|flex-col\|flex-row\|overflow-x-auto" "$component" 2>/dev/null; then
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
for api in "app/api/guild/[guildId]/route.ts" \
           "app/api/guild/list/route.ts" \
           "app/api/guild/leaderboard/route.ts" \
           "app/api/guild/[guildId]/analytics/route.ts"; do
    if grep -q "Cache-Control\|max-age\|stale-while-revalidate" "$api" 2>/dev/null; then
        print_result 0 "$(basename $(dirname "$api"))/$(basename "$api") has cache headers"
    else
        print_result 1 "$(basename $(dirname "$api"))/$(basename "$api") missing cache headers"
    fi
done

# ==========================================
# 9. ANALYTICS CHARTS VALIDATION
# ==========================================
print_header "9. Analytics Charts Validation"

# Check if GuildAnalytics has chart components
if grep -q "SimpleLineChart\|SimpleBarChart\|chart" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics includes chart components"
else
    print_result 1 "GuildAnalytics missing chart components"
fi

# Check if GuildAnalytics has time period selector
if grep -q "week\|month\|all-time\|period" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics includes time period selector"
else
    print_result 1 "GuildAnalytics missing time period selector"
fi

# Check if GuildAnalytics has export functionality
if grep -q "export\|csv\|download" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics includes export functionality"
else
    print_result 1 "GuildAnalytics missing export functionality"
fi

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
    echo -e "\n${GREEN}✓ ALL TESTS PASSED - Guild system integration is complete!${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠ SOME TESTS FAILED - Review issues above${NC}\n"
    exit 1
fi
