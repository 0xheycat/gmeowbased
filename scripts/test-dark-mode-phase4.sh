#!/bin/bash

# ============================================================================
# Phase 4 Dark Mode Verification Script
# ============================================================================
# Purpose: Verify comprehensive dark mode support in analytics component
# Checks: All UI elements have proper dark: variants
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "  Phase 4 Dark Mode Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check_result() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}✗${NC} $2"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

FILE="components/referral/ReferralAnalytics.tsx"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Background Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "bg-white dark:bg-gray-800" $FILE
check_result $? "Card backgrounds (bg-white dark:bg-gray-800)"

grep -q "bg-gray-50 dark:bg-gray-700" $FILE
check_result $? "Icon backgrounds (bg-gray-50 dark:bg-gray-700)"

grep -q "bg-gray-100 dark:bg-gray-800" $FILE
check_result $? "Loading skeleton (bg-gray-100 dark:bg-gray-800)"

grep -q "bg-red-50 dark:bg-red-900/20" $FILE
check_result $? "Error background (bg-red-50 dark:bg-red-900/20)"

grep -q "bg-blue-200 dark:bg-blue-800" $FILE
check_result $? "Weekend bars (bg-blue-200 dark:bg-blue-800)"

grep -q "bg-blue-500 dark:bg-blue-600" $FILE
check_result $? "Regular bars (bg-blue-500 dark:bg-blue-600)"

grep -q "bg-gray-200 dark:bg-gray-700" $FILE
check_result $? "Progress track (bg-gray-200 dark:bg-gray-700)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Text Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "text-gray-900 dark:text-white" $FILE
check_result $? "Primary text (text-gray-900 dark:text-white)"

grep -q "text-gray-700 dark:text-gray-300" $FILE
check_result $? "Secondary text (text-gray-700 dark:text-gray-300)"

grep -q "text-gray-600 dark:text-gray-400" $FILE
check_result $? "Tertiary text (text-gray-600 dark:text-gray-400)"

grep -q "text-gray-500 dark:text-gray-400" $FILE
check_result $? "Muted text (text-gray-500 dark:text-gray-400)"

grep -q "text-red-700 dark:text-red-300" $FILE
check_result $? "Error text (text-red-700 dark:text-red-300)"

grep -q "text-red-900 dark:text-red-100" $FILE
check_result $? "Error heading (text-red-900 dark:text-red-100)"

grep -q "text-red-600 dark:text-red-400" $FILE
check_result $? "Error icon (text-red-600 dark:text-red-400)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Border Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "border-gray-200 dark:border-gray-700" $FILE
check_result $? "Card borders (border-gray-200 dark:border-gray-700)"

grep -q "border-red-200 dark:border-red-800" $FILE
check_result $? "Error borders (border-red-200 dark:border-red-800)"

grep -q "border-gray-700 dark:border-gray-600" $FILE
check_result $? "Tooltip borders (border-gray-700 dark:border-gray-600)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Badge/Tag Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "bg-green-100.*dark:bg-green-900/30" $FILE
check_result $? "Positive change badge (bg-green-100 dark:bg-green-900/30)"

grep -q "text-green-700 dark:text-green-400" $FILE
check_result $? "Positive change text (text-green-700 dark:text-green-400)"

grep -q "bg-red-100.*dark:bg-red-900/30" $FILE
check_result $? "Negative change badge (bg-red-100 dark:bg-red-900/30)"

grep -q "text-red-700 dark:text-red-400" $FILE
check_result $? "Negative change text (text-red-700 dark:text-red-400)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Icon Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "text-blue-600 dark:text-blue-400" $FILE
check_result $? "Blue icons (text-blue-600 dark:text-blue-400)"

grep -q "text-green-600 dark:text-green-400" $FILE
check_result $? "Green icons (text-green-600 dark:text-green-400)"

grep -q "text-purple-600 dark:text-purple-400" $FILE
check_result $? "Purple icons (text-purple-600 dark:text-purple-400)"

grep -q "text-yellow-600 dark:text-yellow-400" $FILE
check_result $? "Yellow icons (text-yellow-600 dark:text-yellow-400)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Tier Badge Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "text-amber-600 dark:text-amber-400" $FILE
check_result $? "Bronze tier (text-amber-600 dark:text-amber-400)"

grep -q "bg-amber-600 dark:bg-amber-500" $FILE
check_result $? "Bronze bar (bg-amber-600 dark:bg-amber-500)"

grep -q "text-gray-600 dark:text-gray-400" $FILE
check_result $? "Silver tier (text-gray-600 dark:text-gray-400)"

grep -q "bg-gray-400 dark:bg-gray-500" $FILE
check_result $? "Silver bar (bg-gray-400 dark:bg-gray-500)"

grep -q "text-yellow-600 dark:text-yellow-400" $FILE
check_result $? "Gold tier (text-yellow-600 dark:text-yellow-400)"

grep -q "bg-yellow-500 dark:bg-yellow-400" $FILE
check_result $? "Gold bar (bg-yellow-500 dark:bg-yellow-400)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Interactive Elements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -q "group-hover:bg-blue-600 dark:group-hover:bg-blue-500" $FILE
check_result $? "Bar hover state (group-hover:bg-blue-600 dark:group-hover:bg-blue-500)"

grep -q "bg-gray-900 dark:bg-gray-800" $FILE
check_result $? "Tooltip background (bg-gray-900 dark:bg-gray-800)"

grep -q "text-white dark:text-gray-100" $FILE
check_result $? "Tooltip text (text-white dark:text-gray-100)"

grep -q "text-gray-300 dark:text-gray-400" $FILE
check_result $? "Tooltip secondary text (text-gray-300 dark:text-gray-400)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Component Pattern Consistency"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check all dark: variants follow consistent patterns
DARK_BG_COUNT=$(grep -o "bg-[a-z]*-[0-9]* dark:bg-" $FILE | wc -l)
test $DARK_BG_COUNT -gt 15
check_result $? "Background colors have dark variants ($DARK_BG_COUNT found)"

DARK_TEXT_COUNT=$(grep -o "text-[a-z]*-[0-9]* dark:text-" $FILE | wc -l)
test $DARK_TEXT_COUNT -gt 20
check_result $? "Text colors have dark variants ($DARK_TEXT_COUNT found)"

DARK_BORDER_COUNT=$(grep -o "border-[a-z]*-[0-9]* dark:border-" $FILE | wc -l)
test $DARK_BORDER_COUNT -gt 5
check_result $? "Border colors have dark variants ($DARK_BORDER_COUNT found)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Dark Mode Verification Results"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed:       ${PASSED_CHECKS}${NC}"
echo -e "${RED}Failed:       ${FAILED_CHECKS}${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL DARK MODE CHECKS PASSED!${NC}"
  echo ""
  echo "ReferralAnalytics supports full dark mode:"
  echo "  • Card backgrounds (white → gray-800)"
  echo "  • Text colors (gray-900 → white)"
  echo "  • Border colors (gray-200 → gray-700)"
  echo "  • Badge colors (light → dark variants)"
  echo "  • Icon colors (600 → 400 shades)"
  echo "  • Tier badges (enhanced visibility)"
  echo "  • Interactive states (hover, tooltips)"
  echo "  • Error states (red-50 → red-900/20)"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME DARK MODE CHECKS FAILED${NC}"
  echo ""
  exit 1
fi
