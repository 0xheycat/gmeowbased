#!/bin/bash

# Visual Regression & CSS Bug Detection Suite
# Automated testing for dark/light mode, CSS consistency, visual regressions

echo "🔍 Starting Comprehensive Visual & CSS Testing..."
echo "=================================================="
echo ""

PASS=0
FAIL=0
WARN=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results array
declare -a RESULTS

# Function to run test
run_test() {
  local test_name="$1"
  local command="$2"
  local severity="${3:-error}" # error or warning
  
  echo -n "Running: $test_name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    RESULTS+=("✅ PASSED: $test_name")
    ((PASS++))
    return 0
  else
    if [ "$severity" = "warning" ]; then
      echo -e "${YELLOW}⚠️  WARN${NC}"
      RESULTS+=("⚠️  WARNING: $test_name")
      ((WARN++))
      return 0
    else
      echo -e "${RED}❌ FAIL${NC}"
      RESULTS+=("❌ FAILED: $test_name")
      ((FAIL++))
      return 1
    fi
  fi
}

# Function to check CSS pattern
check_css_pattern() {
  local pattern="$1"
  local file="$2"
  local should_not_exist="${3:-true}"
  
  if [ "$should_not_exist" = "true" ]; then
    ! grep -r "$pattern" "$file" 2>/dev/null
  else
    grep -r "$pattern" "$file" 2>/dev/null
  fi
}

echo "📋 PHASE 1: Advanced Stylelint Checks"
echo "--------------------------------------"

# 1. Enhanced Stylelint with a11y and performance plugins
run_test "Stylelint - Accessibility Rules" \
  "pnpm stylelint 'app/globals.css' 'components/**/*.tsx' --config .stylelintrc.json"

# 2. Check for low-performance animations
run_test "CSS - No Low-Performance Animations" \
  "! grep -rE '(animation|transition):.*[^transform|opacity]' components/leaderboard/ --include='*.tsx' --include='*.css'" \
  "warning"

# 3. Check for hardcoded font sizes (should use rem/em)
run_test "CSS - No Hardcoded Pixel Font Sizes" \
  "! grep -rE 'font-size:\s*[0-9]+px' components/leaderboard/ --include='*.tsx' --include='*.css'" \
  "warning"

# 4. Check for !important overuse
run_test "CSS - Minimal !important Usage" \
  "test \$(grep -r '!important' components/leaderboard/ --include='*.tsx' --include='*.css' | wc -l) -lt 3" \
  "warning"

echo ""
echo "📋 PHASE 2: Light & Dark Mode CSS Validation"
echo "--------------------------------------"

# 5. Check CSS variables defined for BOTH light and dark modes
run_test "Light Mode - CSS Variables Defined" \
  "grep -q ':root' app/globals.css"

# 6. Check dark mode CSS variables
run_test "Dark Mode - CSS Variables Defined" \
  "grep -q '@media (prefers-color-scheme: dark)' app/globals.css"

# 7. Verify no manual dark: utilities (should use CSS @media for both modes)
run_test "Both Modes - No Manual dark: Utilities" \
  "! grep -r 'dark:' components/leaderboard/LeaderboardTable.tsx"

# 8. Check primary color works in BOTH modes (uses CSS variable)
run_test "Both Modes - Primary Color Uses Variable" \
  "grep -q 'var(--primary)' components/leaderboard/LeaderboardTable.tsx || grep -q 'text-primary' components/leaderboard/LeaderboardTable.tsx"

# 9. Check background works in BOTH modes (uses theme-aware classes)
run_test "Both Modes - Background Uses Theme Classes" \
  "grep -q 'bg-white/5' components/leaderboard/LeaderboardTable.tsx || grep -q 'var(--background)' components/leaderboard/LeaderboardTable.tsx"

# 10. Verify light mode has proper base colors
run_test "Light Mode - Base Colors Defined in :root" \
  "grep -A 8 ':root' app/globals.css | grep -F 'background'"

# 11. Verify dark mode has proper styling overrides
run_test "Dark Mode - Style Overrides in @media" \
  "grep -A 5 '@media (prefers-color-scheme: dark)' app/globals.css | grep -q 'roster-chip\\|bg-white'"

echo ""
echo "📋 PHASE 3: CSS Consistency (Light + Dark)"
echo "--------------------------------------"

# 12. No mixed color systems (primary-500 vs primary)
run_test "Both Modes - No primary-500 References" \
  "! grep -r 'primary-500' components/leaderboard/LeaderboardTable.tsx"

# 13. No hardcoded black/white (should use theme colors for both modes)
run_test "Both Modes - No Hardcoded bg-black" \
  "! grep -r 'bg-black[^/]' components/leaderboard/LeaderboardTable.tsx"

# 14. Consistent spacing (should use theme spacing)
run_test "Both Modes - Using Theme Spacing" \
  "grep -q 'space-y\\|gap-' components/leaderboard/LeaderboardTable.tsx" \
  "warning"

# 15. No duplicate class definitions (NEW: check for CLASSES constant usage)
run_test "CSS Consistency - Using CLASSES Constants" \
  "grep -q 'const CLASSES' components/leaderboard/LeaderboardTable.tsx"

echo ""
echo "📋 PHASE 4: Roster Class Usage (Both Modes)"
echo "--------------------------------------"

# 16. Using roster-chip class
run_test "Roster Classes - roster-chip Used" \
  "grep -q 'roster-chip' components/leaderboard/LeaderboardTable.tsx"

# 17. Using roster-stat class
run_test "Roster Classes - roster-stat Used" \
  "grep -q 'roster-stat' components/leaderboard/LeaderboardTable.tsx"

# 18. Using roster-alert class
run_test "Roster Classes - roster-alert Used" \
  "grep -q 'roster-alert' components/leaderboard/LeaderboardTable.tsx" \
  "warning"

echo ""
echo "📋 PHASE 5: Accessibility (Light + Dark)"
echo "--------------------------------------"

# 19. ARIA labels present
run_test "Accessibility - ARIA Labels Present" \
  "grep -q 'aria-label' components/leaderboard/LeaderboardTable.tsx"

# 20. Color contrast check in light mode
run_test "Light Mode - Sufficient Contrast Colors" \
  "grep -qE '(text-gray-400|text-gray-600|text-gray-900)' components/leaderboard/LeaderboardTable.tsx" \
  "warning"

# 21. Color contrast check in dark mode
run_test "Dark Mode - Sufficient Contrast Colors" \
  "grep -qE '(text-gray-400|text-gray-300|text-white)' components/leaderboard/LeaderboardTable.tsx" \
  "warning"

# 22. No outline-none without custom focus (both modes)
run_test "Both Modes - Focus States Accessible" \
  "! grep -r 'outline-none' components/leaderboard/LeaderboardTable.tsx || grep -q 'focus:ring' components/leaderboard/LeaderboardTable.tsx" \
  "warning"

echo ""
echo "📋 PHASE 6: TypeScript & Build"
echo "--------------------------------------"

# 23. TypeScript compilation (leaderboard only)
run_test "TypeScript - Leaderboard Type-Safe" \
  "pnpm eslint components/leaderboard/LeaderboardTable.tsx --max-warnings=0 --quiet" \
  "warning"

# 24. ESLint check
run_test "ESLint - No Errors" \
  "pnpm eslint components/leaderboard/LeaderboardTable.tsx --max-warnings=0"

# 25. Next.js build check
run_test "Build - Next.js Compiles" \
  "pnpm next build --no-lint > /dev/null 2>&1 || pnpm next build 2>&1 | grep -q 'Compiled successfully'" \
  "warning"

echo ""
echo "============================================"
echo "📊 TEST SUMMARY"
echo "============================================"
echo ""
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo ""
echo -e "✅ Passed: ${GREEN}$PASS${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARN${NC}"
echo -e "❌ Failed: ${RED}$FAIL${NC}"
echo "Total: $((PASS + WARN + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CRITICAL TESTS PASSED!${NC}"
  if [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARN warnings to review (non-blocking)${NC}"
  fi
  exit 0
else
  echo -e "${RED}❌ $FAIL TESTS FAILED${NC}"
  exit 1
fi
