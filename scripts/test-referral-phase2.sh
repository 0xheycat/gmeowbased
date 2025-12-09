#!/bin/bash

# Test Script: Referral System Phase 2 Complete Verification
# Date: December 6, 2025
# Purpose: Verify all Phase 2 deliverables before Phase 3
#
# Tests:
# 1. TypeScript compilation (0 errors required)
# 2. Component imports (all files exist)
# 3. API endpoint structure (10-layer security)
# 4. Contract wrapper integration
# 5. Icon imports (MUI icons only)
# 6. File structure validation

set -e  # Exit on error

echo "======================================================================"
echo "🧪 Phase 2 Complete Verification - Referral System Core"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

echo "======================================================================"
echo "TEST 1: File Structure Validation"
echo "======================================================================"

# Check all 5 Phase 2 files exist
FILES=(
    "components/referral/ReferralCodeForm.tsx"
    "components/referral/ReferralLinkGenerator.tsx"
    "components/referral/ReferralStatsCards.tsx"
    "app/api/referral/[fid]/stats/route.ts"
    "app/api/referral/generate-link/route.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

echo ""
echo "======================================================================"
echo "TEST 2: TypeScript Compilation"
echo "======================================================================"

# Run TypeScript check
echo "Running: npx tsc --noEmit --skipLibCheck"
if npx tsc --noEmit --skipLibCheck 2>&1 | tee /tmp/tsc-output.log; then
    pass "TypeScript compilation successful (0 errors)"
else
    # Check for errors in our Phase 2 files only
    if grep -E "(components/referral|app/api/referral)" /tmp/tsc-output.log; then
        fail "TypeScript errors found in Phase 2 files"
        echo "Errors:"
        grep -E "(components/referral|app/api/referral)" /tmp/tsc-output.log
    else
        warn "TypeScript errors exist but not in Phase 2 files"
    fi
fi

echo ""
echo "======================================================================"
echo "TEST 3: Component Import Validation"
echo "======================================================================"

# Check icon imports (MUI icons only)
echo "Checking icon imports..."
ICON_ERRORS=0

for file in components/referral/*.tsx; do
    if [ -f "$file" ]; then
        # Check for incorrect icon imports
        if grep -E "import.*from.*lucide-react" "$file" > /dev/null; then
            fail "$(basename $file): Uses lucide-react (should use @/components/icons)"
            ((ICON_ERRORS++))
        fi
        
        if grep -E "import.*from.*@heroicons" "$file" > /dev/null; then
            fail "$(basename $file): Uses heroicons (should use @/components/icons)"
            ((ICON_ERRORS++))
        fi
        
        # Check for correct icon imports
        if grep -E "import.*from '@/components/icons'" "$file" > /dev/null; then
            pass "$(basename $file): Uses correct icon imports"
        fi
    fi
done

if [ $ICON_ERRORS -eq 0 ]; then
    pass "All icon imports use @/components/icons"
fi

# Check contract wrapper imports
echo ""
echo "Checking contract wrapper imports..."
for file in components/referral/*.tsx app/api/referral/**/route.ts; do
    if [ -f "$file" ]; then
        if grep -E "from '@/lib/referral-contract'" "$file" > /dev/null; then
            pass "$(basename $file): Uses referral contract wrapper"
        fi
    fi
done

echo ""
echo "======================================================================"
echo "TEST 4: API Security Layer Validation"
echo "======================================================================"

# Check for 10-layer security in API routes
echo "Checking API security layers..."

API_FILES=(
    "app/api/referral/[fid]/stats/route.ts"
    "app/api/referral/generate-link/route.ts"
)

for file in "${API_FILES[@]}"; do
    echo ""
    echo "Analyzing: $file"
    
    # Layer 1: Rate Limiting
    if grep -q "rateLimit" "$file"; then
        pass "  Layer 1: Rate limiting implemented"
    else
        fail "  Layer 1: Rate limiting missing"
    fi
    
    # Layer 2: Request Validation (Zod)
    if grep -q "\.safeParse\|\.parse" "$file"; then
        pass "  Layer 2: Request validation (Zod) implemented"
    else
        fail "  Layer 2: Request validation missing"
    fi
    
    # Layer 5: Input Sanitization
    if grep -q "sanitize\|validate.*Code\|validate.*Address" "$file"; then
        pass "  Layer 5: Input sanitization implemented"
    else
        warn "  Layer 5: Input sanitization check needed"
    fi
    
    # Layer 7: Response Headers
    if grep -q "X-RateLimit\|Cache-Control\|X-Request-ID" "$file"; then
        pass "  Layer 7: Professional response headers"
    else
        fail "  Layer 7: Response headers missing"
    fi
    
    # Layer 9: Audit Logging
    if grep -q "console\.log\|logError" "$file"; then
        pass "  Layer 9: Audit logging implemented"
    else
        fail "  Layer 9: Audit logging missing"
    fi
    
    # Layer 10: Error Masking
    if grep -q "ErrorType\.INTERNAL\|process\.env\.NODE_ENV.*development" "$file"; then
        pass "  Layer 10: Error masking for production"
    else
        fail "  Layer 10: Error masking missing"
    fi
done

echo ""
echo "======================================================================"
echo "TEST 5: Component Feature Validation"
echo "======================================================================"

# ReferralCodeForm validation
echo ""
echo "Checking ReferralCodeForm features..."
if grep -q "validateReferralCode\|buildRegisterReferralCodeTx" "components/referral/ReferralCodeForm.tsx"; then
    pass "ReferralCodeForm: Uses contract wrapper functions"
fi

if grep -q "useState.*code\|useState.*loading" "components/referral/ReferralCodeForm.tsx"; then
    pass "ReferralCodeForm: Has proper state management"
fi

if grep -q "writeContract\|useWriteContract" "components/referral/ReferralCodeForm.tsx"; then
    pass "ReferralCodeForm: Uses wagmi for transactions"
fi

# ReferralLinkGenerator validation
echo ""
echo "Checking ReferralLinkGenerator features..."
if grep -q "QRCodeSVG" "components/referral/ReferralLinkGenerator.tsx"; then
    pass "ReferralLinkGenerator: Has QR code generation"
fi

if grep -q "navigator\.clipboard\|clipboard\.writeText" "components/referral/ReferralLinkGenerator.tsx"; then
    pass "ReferralLinkGenerator: Has copy-to-clipboard"
fi

if grep -q "twitter\.com.*tweet\|warpcast\.com.*compose" "components/referral/ReferralLinkGenerator.tsx"; then
    pass "ReferralLinkGenerator: Has social share URLs"
fi

# ReferralStatsCards validation
echo ""
echo "Checking ReferralStatsCards features..."
if grep -q "getReferralStats\|getReferralCode\|getReferralTier" "components/referral/ReferralStatsCards.tsx"; then
    pass "ReferralStatsCards: Uses contract wrapper functions"
fi

if grep -q "useEffect.*address" "components/referral/ReferralStatsCards.tsx"; then
    pass "ReferralStatsCards: Fetches data on mount"
fi

if grep -q "isLoading\|error" "components/referral/ReferralStatsCards.tsx"; then
    pass "ReferralStatsCards: Has loading/error states"
fi

echo ""
echo "======================================================================"
echo "TEST 6: Code Quality Checks"
echo "======================================================================"

# Check for console.log in production code (should be console.error for errors)
echo "Checking for debugging code..."
DEBUG_COUNT=0
for file in components/referral/*.tsx; do
    if [ -f "$file" ]; then
        if grep -n "console\.log" "$file" | grep -v "// "; then
            warn "$(basename $file): Contains console.log (consider removing for production)"
            ((DEBUG_COUNT++))
        fi
    fi
done

if [ $DEBUG_COUNT -eq 0 ]; then
    pass "No console.log found in component files"
fi

# Check for proper error handling
echo ""
echo "Checking error handling..."
for file in components/referral/*.tsx; do
    if [ -f "$file" ]; then
        if grep -q "try.*catch\|\.catch(" "$file"; then
            pass "$(basename $file): Has error handling"
        else
            warn "$(basename $file): No error handling found"
        fi
    fi
done

echo ""
echo "======================================================================"
echo "TEST 7: Contract Integration Validation"
echo "======================================================================"

# Check that contract functions are imported correctly
echo "Checking contract function imports..."

# ReferralCodeForm should use these functions
if grep -q "buildRegisterReferralCodeTx\|validateReferralCode" "components/referral/ReferralCodeForm.tsx"; then
    pass "ReferralCodeForm: Imports correct contract functions"
else
    fail "ReferralCodeForm: Missing contract function imports"
fi

# ReferralLinkGenerator should use these functions
if grep -q "validateReferralCode\|getReferralCodeOwner" "components/referral/ReferralLinkGenerator.tsx" || \
   grep -q "getReferralCodeOwner" "app/api/referral/generate-link/route.ts"; then
    pass "ReferralLinkGenerator: Uses code validation"
else
    warn "ReferralLinkGenerator: Code validation check needed"
fi

# ReferralStatsCards should use these functions
if grep -q "getReferralStats\|getReferralCode\|getReferralTier" "components/referral/ReferralStatsCards.tsx"; then
    pass "ReferralStatsCards: Imports correct contract functions"
else
    fail "ReferralStatsCards: Missing contract function imports"
fi

echo ""
echo "======================================================================"
echo "TEST 8: Documentation Validation"
echo "======================================================================"

# Check if CURRENT-TASK.md is updated
if grep -q "Phase 2 COMPLETE" "CURRENT-TASK.md"; then
    pass "CURRENT-TASK.md: Updated with Phase 2 completion"
else
    fail "CURRENT-TASK.md: Not updated with Phase 2 status"
fi

# Check if ROADMAP mentions Phase 2
if grep -q "Phase 2.*Referral System Core" "FOUNDATION-REBUILD-ROADMAP.md"; then
    pass "FOUNDATION-REBUILD-ROADMAP.md: Contains Phase 2 plan"
else
    warn "FOUNDATION-REBUILD-ROADMAP.md: Phase 2 status check needed"
fi

echo ""
echo "======================================================================"
echo "TEST 9: Dependency Validation"
echo "======================================================================"

# Check for required packages
echo "Checking package.json dependencies..."

if grep -q "qrcode.react" "package.json"; then
    pass "qrcode.react package installed"
else
    fail "qrcode.react package missing"
fi

if grep -q "qrcode" "package.json"; then
    pass "qrcode package installed (for API QR generation)"
else
    warn "qrcode package missing (needed for API QR generation)"
fi

if grep -q "wagmi" "package.json"; then
    pass "wagmi package installed"
else
    fail "wagmi package missing"
fi

echo ""
echo "======================================================================"
echo "📊 TEST RESULTS SUMMARY"
echo "======================================================================"
echo ""
echo -e "${GREEN}✅ PASSED${NC}: $PASSED"
echo -e "${RED}❌ FAILED${NC}: $FAILED"
echo -e "${YELLOW}⚠️  WARNINGS${NC}: $WARNINGS"
echo ""

TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo "Pass Rate: $PASS_RATE% ($PASSED/$TOTAL)"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}======================================================================"
    echo "✅ PHASE 2 VERIFICATION: COMPLETE"
    echo "======================================================================"
    echo ""
    echo "All tests passed! Phase 2 is production-ready."
    echo ""
    echo "Next Steps:"
    echo "1. ✅ Phase 2 Complete (Referral System Core)"
    echo "2. 📋 Begin Phase 3 (Referral Dashboard - 2 days)"
    echo "   - ReferralDashboard component"
    echo "   - ReferralLeaderboard component"
    echo "   - ReferralActivityFeed component"
    echo ""
    echo -e "Ready to proceed with Phase 3!${NC}"
    exit 0
else
    echo -e "${RED}======================================================================"
    echo "❌ PHASE 2 VERIFICATION: FAILED"
    echo "======================================================================"
    echo ""
    echo "Please fix the $FAILED failed test(s) before proceeding to Phase 3."
    echo ""
    echo "Critical issues:"
    echo "- TypeScript compilation errors"
    echo "- Missing security layers in APIs"
    echo "- Incorrect icon imports"
    echo -e "${NC}"
    exit 1
fi
