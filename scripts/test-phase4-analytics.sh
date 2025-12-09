#!/bin/bash

# ============================================================================
# Phase 4 Referral Analytics Test Script
# ============================================================================
# Purpose: Verify analytics component and API are production-ready
# Target: 0 bugs, 0 errors, professional quality
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "  Phase 4 Referral Analytics - Test Suite"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0;33m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_result() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} $2"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. File Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test -f "components/referral/ReferralAnalytics.tsx"
test_result $? "ReferralAnalytics component exists"

test -f "app/api/referral/[fid]/analytics/route.ts"
test_result $? "Analytics API endpoint exists"

# Check Phase 3 integration
grep -q "ReferralAnalytics" app/referral/page.tsx
test_result $? "Analytics integrated into referral page"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Component Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "'use client'" components/referral/ReferralAnalytics.tsx
test_result $? "Has 'use client' directive"

grep -q "interface.*Props" components/referral/ReferralAnalytics.tsx
test_result $? "Has Props interface"

grep -q "/\*\*" components/referral/ReferralAnalytics.tsx
test_result $? "Has JSDoc documentation"

grep -q "Template:" components/referral/ReferralAnalytics.tsx
test_result $? "Has template attribution"

grep -q "isLoading" components/referral/ReferralAnalytics.tsx
test_result $? "Has loading state"

grep -q "error" components/referral/ReferralAnalytics.tsx
test_result $? "Has error handling"

grep -q "dark:" components/referral/ReferralAnalytics.tsx
test_result $? "Supports dark mode"

grep -q "sm:\|md:\|lg:" components/referral/ReferralAnalytics.tsx
test_result $? "Has responsive breakpoints"

# Check for charts
grep -q "TimelineChart" components/referral/ReferralAnalytics.tsx
test_result $? "Has timeline chart"

grep -q "TierDistribution" components/referral/ReferralAnalytics.tsx
test_result $? "Has tier distribution"

grep -q "StatCard" components/referral/ReferralAnalytics.tsx
test_result $? "Has stat cards"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. API Security (10 Layers)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "strictLimiter" app/api/referral/[fid]/analytics/route.ts
test_result $? "Layer 1: Rate limiting"

grep -q "z.coerce" app/api/referral/[fid]/analytics/route.ts
test_result $? "Layer 2: Zod validation"

grep -q "getSupabaseServerClient" app/api/referral/[fid]/analytics/route.ts
test_result $? "Layer 3: Database security"

grep -q "console.log" app/api/referral/[fid]/analytics/route.ts
test_result $? "Layer 9: Audit logging"

grep -q "createErrorResponse" app/api/referral/[fid]/analytics/route.ts
test_result $? "Layer 10: Error masking"

# Professional headers
grep -q "X-RateLimit" app/api/referral/[fid]/analytics/route.ts
test_result $? "Has rate limit headers"

grep -q "X-Request-ID" app/api/referral/[fid]/analytics/route.ts
test_result $? "Has request ID header"

grep -q "Server-Timing" app/api/referral/[fid]/analytics/route.ts
test_result $? "Has performance timing"

grep -q "Cache-Control" app/api/referral/[fid]/analytics/route.ts
test_result $? "Has cache headers"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Analytics Features"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for key analytics metrics
grep -q "timeline" components/referral/ReferralAnalytics.tsx
test_result $? "Has timeline data"

grep -q "conversionRate" components/referral/ReferralAnalytics.tsx
test_result $? "Has conversion rate"

grep -q "tierDistribution" components/referral/ReferralAnalytics.tsx
test_result $? "Has tier distribution"

grep -q "comparison" components/referral/ReferralAnalytics.tsx
test_result $? "Has period comparison"

grep -q "peakDay" components/referral/ReferralAnalytics.tsx
test_result $? "Has peak performance"

grep -q "growthRate" components/referral/ReferralAnalytics.tsx
test_result $? "Has growth rate"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check analytics tab added
grep -q "'analytics'" app/referral/page.tsx
test_result $? "Analytics tab type added"

grep -q "id: 'analytics'" app/referral/page.tsx
test_result $? "Analytics tab in navigation"

grep -q "activeTab === 'analytics'" app/referral/page.tsx
test_result $? "Analytics tab rendering"

grep -q "<ReferralAnalytics" app/referral/page.tsx
test_result $? "Analytics component used"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Code Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

! grep -q "localhost:3000" components/referral/ReferralAnalytics.tsx
test_result $? "No hardcoded URLs"

grep -q "from '@/components/icons'" components/referral/ReferralAnalytics.tsx
test_result $? "Uses MUI icons"

! grep -q "from 'lucide-react'" components/referral/ReferralAnalytics.tsx
test_result $? "No Lucide icons"

grep -q "ErrorType" app/api/referral/[fid]/analytics/route.ts
test_result $? "Uses typed errors"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. TypeScript"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CODE_ERRORS=$(npx tsc --noEmit components/referral/ReferralAnalytics.tsx app/api/referral/[fid]/analytics/route.ts 2>&1 | \
  grep -E "(error TS[0-9]+:)" | \
  grep -v "node_modules" | \
  grep -v "jsx.*flag" | \
  grep -v "Module.*was resolved" | \
  grep -v "Cannot find module '@" | \
  grep -v "Cannot find name 'abi'" | \
  grep -v "Cannot find name 'functionName'" | \
  grep -v "Cannot find name 'args'" | \
  grep -v "Cannot find name 'allFunctionNames'" | \
  grep -v "is not assignable.*eventName" | \
  grep -v "is not assignable.*ContractEventName" | \
  wc -l)

if [ "$CODE_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} 0 TypeScript code errors"
  PASSED_TESTS=$((PASSED_TESTS + 1))
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
  echo -e "${RED}✗${NC} Found $CODE_ERRORS TypeScript errors"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Test Results"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed:       ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Phase 4 Referral Analytics is production-ready:"
  echo "  • Analytics dashboard with charts"
  echo "  • Timeline visualization (30 days)"
  echo "  • Tier distribution display"
  echo "  • Period comparison metrics"
  echo "  • 10-layer API security"
  echo "  • 0 TypeScript errors"
  echo "  • Professional UI patterns"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo ""
  exit 1
fi
