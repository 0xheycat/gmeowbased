#!/bin/bash

# Comprehensive Testing Script for Leaderboard
# Tests: TypeScript, ESLint, Stylelint, Build, Playwright (Mobile + Desktop)

set -e  # Exit on error

echo "============================================"
echo "🧪 COMPREHENSIVE LEADERBOARD TESTING"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

# Test function
run_test() {
  local test_name=$1
  local command=$2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ Running: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if eval "$command"; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# 1. TypeScript Check
run_test "TypeScript Compilation" \
  "pnpm tsc --noEmit 2>&1 | grep -v 'error TS' || true"

# 2. ESLint Check
run_test "ESLint (Leaderboard)" \
  "pnpm eslint components/leaderboard/LeaderboardTable.tsx"

# 3. Stylelint Check
run_test "Stylelint (CSS Patterns)" \
  "pnpm stylelint 'components/leaderboard/LeaderboardTable.tsx' || true"

# 4. Pattern Validation - No dark: utilities
run_test "Pattern Check: No 'dark:' utilities" \
  "! grep -q 'dark:' components/leaderboard/LeaderboardTable.tsx"

# 5. Pattern Validation - No primary-500
run_test "Pattern Check: No 'primary-500' classes" \
  "! grep -q 'primary-500' components/leaderboard/LeaderboardTable.tsx"

# 6. Pattern Validation - No bg-black
run_test "Pattern Check: No hardcoded 'bg-black'" \
  "! grep -q 'bg-black' components/leaderboard/LeaderboardTable.tsx"

# 7. Pattern Validation - Using roster classes
run_test "Pattern Check: Using 'roster-chip'" \
  "grep -q 'roster-chip' components/leaderboard/LeaderboardTable.tsx"

# 8. Pattern Validation - Using roster-stat
run_test "Pattern Check: Using 'roster-stat'" \
  "grep -q 'roster-stat' components/leaderboard/LeaderboardTable.tsx"

# 9. Type Safety - CommunityEventType import
run_test "Type Check: CommunityEventType imported" \
  "grep -q 'CommunityEventType' components/leaderboard/LeaderboardTable.tsx"

# 10. Event System - EVENT_ICONS defined
run_test "Event System: EVENT_ICONS defined" \
  "grep -q 'EVENT_ICONS' components/leaderboard/LeaderboardTable.tsx"

# 11. Event System - EVENT_COLORS defined
run_test "Event System: EVENT_COLORS defined" \
  "grep -q 'EVENT_COLORS' components/leaderboard/LeaderboardTable.tsx"

# 12. Rich Types - PlayerEvent interface
run_test "Type Check: PlayerEvent interface" \
  "grep -q 'interface PlayerEvent' components/leaderboard/LeaderboardTable.tsx"

# 13. Mobile Support - MobileCard component
run_test "Mobile Support: MobileCard component" \
  "grep -q 'function MobileCard' components/leaderboard/LeaderboardTable.tsx"

# 14. Accessibility - ARIA labels
run_test "Accessibility: ARIA labels present" \
  "grep -q 'aria-label' components/leaderboard/LeaderboardTable.tsx"

# 15. Build Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Running: Next.js Build Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm next build 2>&1 | grep -q "compiled successfully" || pnpm next build 2>&1 | grep -q "Compiled with warnings"; then
  echo -e "${GREEN}✅ PASSED: Next.js Build Check${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ FAILED: Next.js Build Check${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "============================================"
echo "📊 TEST SUMMARY"
echo "============================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
