#!/bin/bash

# Simple test script for dynamic frame image generation (Stage 5.18)
# Tests image generation by checking file structure and code paths

set -e

echo "🧪 Stage 5.18: Code Verification Test"
echo "===================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: Verify buildDynamicFrameImageUrl exists in lib/share.ts
echo -n "Test 1: buildDynamicFrameImageUrl function exists... "
if grep -q "export function buildDynamicFrameImageUrl" lib/share.ts; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 2: Verify buildDynamicFrameImageUrl is imported in app/api/frame/route.tsx
echo -n "Test 2: buildDynamicFrameImageUrl imported in frame route... "
if grep -q "buildDynamicFrameImageUrl" app/api/frame/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 3: Verify buildDynamicFrameImageUrl is called in app/api/frame/route.tsx
echo -n "Test 3: buildDynamicFrameImageUrl called to generate image URL... "
if grep -q "const dynamicImageUrl = buildDynamicFrameImageUrl" app/api/frame/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 4: Verify image route handles 'gm' type
echo -n "Test 4: Image route handles 'gm' type... "
if grep -q "if (type === 'gm')" app/api/frame/image/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 5: Verify image route handles 'quest' type
echo -n "Test 5: Image route handles 'quest' type... "
if grep -q "if (type === 'quest')" app/api/frame/image/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 6: Verify image route handles 'leaderboard' type
echo -n "Test 6: Image route handles 'leaderboard' type... "
if grep -q "if (type === 'leaderboard')" app/api/frame/image/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 7: Verify image dimensions are 1200x800 (3:2 aspect ratio)
echo -n "Test 7: Image dimensions are 1200x800 (Farcaster 3:2 ratio)... "
if grep -q "const WIDTH = 1200" app/api/frame/image/route.tsx && grep -q "const HEIGHT = 800" app/api/frame/image/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 8: Verify GM image shows gmCount parameter
echo -n "Test 8: GM image renders gmCount... "
if grep -A 20 "if (type === 'gm')" app/api/frame/image/route.tsx | grep -q "gmCount"; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 9: Verify quest image shows questName parameter
echo -n "Test 9: Quest image renders questName... "
if grep -A 20 "if (type === 'quest')" app/api/frame/image/route.tsx | grep -q "questName"; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 10: Verify leaderboard image shows season parameter
echo -n "Test 10: Leaderboard image renders season... "
if grep -A 20 "if (type === 'leaderboard')" app/api/frame/image/route.tsx | grep -q "season"; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 11: Check documentation exists
echo -n "Test 11: FRAME-DYNAMIC-IMAGE-FIX-PLAN.md exists... "
if [ -f "FRAME-DYNAMIC-IMAGE-FIX-PLAN.md" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 12: Check summary documentation exists
echo -n "Test 12: FRAME-FIX-SUMMARY.md exists... "
if [ -f "FRAME-FIX-SUMMARY.md" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 13: Check testing documentation exists
echo -n "Test 13: FRAME-DYNAMIC-IMAGE-TESTING.md exists... "
if [ -f "FRAME-DYNAMIC-IMAGE-TESTING.md" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 14: Verify no hardcoded static image URLs remain
echo -n "Test 14: No hardcoded /frame-image.png in frame route (line 1931)... "
if grep -n "const defaultFrameImage = " app/api/frame/route.tsx | grep -q "buildDynamicFrameImageUrl"; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 15: Verify ImageResponse is used for rendering
echo -n "Test 15: ImageResponse used for dynamic image generation... "
if grep -q "ImageResponse" app/api/frame/image/route.tsx; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "===================================="
echo "📊 Test Results Summary"
echo "===================================="
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All code verification tests passed!${NC}"
    echo ""
    echo "✅ buildDynamicFrameImageUrl function implemented"
    echo "✅ Frame route integrated with dynamic image URL"
    echo "✅ Image route handles all frame types (GM, quest, leaderboard)"
    echo "✅ Correct 1200x800 dimensions (3:2 Farcaster spec)"
    echo "✅ Documentation complete"
    echo ""
    echo "Code implementation verified! Ready for runtime testing."
    echo ""
    echo "Next steps:"
    echo "  1. Fix the home page module error"
    echo "  2. Test runtime image generation"
    echo "  3. Deploy to production for live testing"
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    echo ""
    echo "Please review the failures and fix any issues."
    exit 1
fi
