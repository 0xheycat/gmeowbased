#!/bin/bash
# GI-12 Frame Button Validation Test Suite
# Tests frame format compliance against Farcaster vNext spec

set -e

echo "🔍 GI-12: Frame Button Validation Test Suite"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Test 1: Check for deprecated fc:frame:button:N tags
echo "Test 1: Check for deprecated fc:frame:button:N tags in source code"
if grep -r "fc:frame:button:" app/api/frame/route.tsx 2>/dev/null | grep -v "fc:miniapp:frame:button:" | grep -v "//"; then
    echo -e "${RED}❌ FAIL${NC}: Found deprecated fc:frame:button:N tags in source"
    FAIL=$((FAIL + 1))
else
    echo -e "${GREEN}✅ PASS${NC}: No deprecated fc:frame:button:N tags found in source"
    PASS=$((PASS + 1))
fi
echo ""

# Test 2: Check for modern fc:miniapp:frame:button:N format
echo "Test 2: Check for modern fc:miniapp:frame:button:N format"
if grep -q "fc:miniapp:frame:button:" app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Uses modern fc:miniapp:frame:button:N format"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Missing modern fc:miniapp:frame:button:N format"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 3: Check image aspect ratio
echo "Test 3: Check image aspect ratio (should be 3:2)"
if grep -q '3:2' app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Uses correct 3:2 aspect ratio"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Incorrect aspect ratio (should be 3:2)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 4: Check for sanitizeButtons usage
echo "Test 4: Check for button limit enforcement (sanitizeButtons)"
if grep -q "sanitizeButtons" app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Uses sanitizeButtons for 4-button limit"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Missing sanitizeButtons enforcement"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 5: Check for input validation imports
echo "Test 5: Check for input validation imports"
if grep -q "from '@/lib/frame-validation'" app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Imports frame validation functions"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Missing frame validation imports"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 6: Check validation functions exist
echo "Test 6: Check validation functions exist"
if [ -f "lib/frame-validation.ts" ]; then
    echo -e "${GREEN}✅ PASS${NC}: lib/frame-validation.ts exists"
    PASS=$((PASS + 1))
    
    # Check specific functions
    for func in sanitizeFID sanitizeQuestId sanitizeChainKey sanitizeButtons; do
        if grep -q "export function $func" lib/frame-validation.ts; then
            echo -e "  ${GREEN}✅${NC} $func() implemented"
        else
            echo -e "  ${RED}❌${NC} $func() missing"
            FAIL=$((FAIL + 1))
        fi
    done
else
    echo -e "${RED}❌ FAIL${NC}: lib/frame-validation.ts not found"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 7: Check Warpcast-safe routes exist
echo "Test 7: Check Warpcast-safe /frame/* routes exist"
ROUTES=(
    "app/frame/badge/[fid]/route.tsx"
    "app/frame/quest/[questId]/route.tsx"
    "app/frame/leaderboard/route.tsx"
    "app/frame/stats/[fid]/route.tsx"
)

for route in "${ROUTES[@]}"; do
    if [ -f "$route" ]; then
        echo -e "  ${GREEN}✅${NC} $route exists"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌${NC} $route missing"
        FAIL=$((FAIL + 1))
    fi
done
echo ""

# Test 8: Check for vNext in source
echo "Test 8: Check for vNext version marker"
if grep -q 'content="vNext"' app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Uses vNext version marker"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Missing vNext version marker"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 9: Check TypeScript compilation
echo "Test 9: TypeScript compilation check"
if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ FAIL${NC}: TypeScript errors found"
    FAIL=$((FAIL + 1))
else
    echo -e "${GREEN}✅ PASS${NC}: No TypeScript errors"
    PASS=$((PASS + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "Test Results Summary"
echo "=============================================="
echo -e "${GREEN}PASS: $PASS${NC}"
echo -e "${RED}FAIL: $FAIL${NC}"
echo -e "${YELLOW}WARN: $WARN${NC}"
echo ""

TOTAL=$((PASS + FAIL + WARN))
SCORE=$((PASS * 100 / TOTAL))

echo "Overall Score: $SCORE/100"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ GI-12 VALIDATION PASSED${NC}"
    exit 0
else
    echo -e "${RED}❌ GI-12 VALIDATION FAILED${NC}"
    echo "Please fix the issues above before deployment"
    exit 1
fi
