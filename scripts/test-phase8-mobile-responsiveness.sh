#!/bin/bash

# Phase 8: Mobile Responsiveness Audit
# Tests all Phase 5-7 components for mobile breakpoint compliance

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

print_header "PHASE 8: MOBILE RESPONSIVENESS AUDIT"

# ==========================================
# 1. PHASE 5 COMPONENTS (Guild Core)
# ==========================================
print_header "1. Phase 5 Components (Guild Core)"

# GuildCreationForm - Form should stack vertically
if grep -q "flex-col\|space-y-\|gap-" components/guild/GuildCreationForm.tsx 2>/dev/null; then
    print_result 0 "GuildCreationForm: Vertical stacking present"
else
    print_result 1 "GuildCreationForm: Missing vertical stacking"
fi

# GuildCard - Should adapt layout at breakpoints
if grep -q "sm:\|md:\|lg:\|grid-cols" components/guild/GuildCard.tsx 2>/dev/null; then
    print_result 0 "GuildCard: Responsive breakpoints present"
else
    print_result 1 "GuildCard: Missing responsive breakpoints"
fi

# GuildMemberList - Should handle table overflow or switch to cards
if grep -q "overflow-x-auto\|sm:block\|md:table" components/guild/GuildMemberList.tsx 2>/dev/null; then
    print_result 0 "GuildMemberList: Table overflow handling present"
else
    print_result 1 "GuildMemberList: Missing table overflow handling"
fi

# GuildTreasuryPanel - Forms should stack vertically on mobile
if grep -q "flex-col\|lg:flex-row\|space-y-\|sm:grid-cols" components/guild/GuildTreasuryPanel.tsx 2>/dev/null; then
    print_result 0 "GuildTreasuryPanel: Vertical stacking present"
else
    print_result 1 "GuildTreasuryPanel: Missing vertical stacking"
fi

# ==========================================
# 2. PHASE 6 COMPONENTS (Guild Discovery)
# ==========================================
print_header "2. Phase 6 Components (Guild Discovery)"

# GuildDiscoveryPage - Grid should collapse on mobile
if grep -q "grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-3\|grid.*sm:.*lg:" components/guild/GuildDiscoveryPage.tsx 2>/dev/null; then
    print_result 0 "GuildDiscoveryPage: Responsive grid present"
else
    print_result 1 "GuildDiscoveryPage: Missing responsive grid"
fi

# GuildLeaderboard - Table should handle overflow
if grep -q "overflow-x-auto" components/guild/GuildLeaderboard.tsx 2>/dev/null; then
    print_result 0 "GuildLeaderboard: Table overflow handling present"
else
    print_result 1 "GuildLeaderboard: Missing table overflow handling"
fi

# ==========================================
# 3. PHASE 7 COMPONENTS (Guild Analytics)
# ==========================================
print_header "3. Phase 7 Components (Guild Analytics)"

# GuildProfilePage - Should have responsive layout
if grep -q "sm:\|md:\|lg:\|grid.*cols\|flex-col.*lg:flex-row" components/guild/GuildProfilePage.tsx 2>/dev/null; then
    print_result 0 "GuildProfilePage: Responsive layout present"
else
    print_result 1 "GuildProfilePage: Missing responsive layout"
fi

# GuildAnalytics - Charts should be responsive
if grep -q "w-full\|max-w-\|sm:\|md:\|lg:" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics: Responsive charts present"
else
    print_result 1 "GuildAnalytics: Missing responsive charts"
fi

# ==========================================
# 4. TOUCH TARGET VALIDATION
# ==========================================
print_header "4. Touch Target Validation (44×44px minimum)"

# Check for proper button/link sizing
COMPONENTS=(
    "components/guild/GuildCreationForm.tsx"
    "components/guild/GuildCard.tsx"
    "components/guild/GuildMemberList.tsx"
    "components/guild/GuildTreasuryPanel.tsx"
    "components/guild/GuildDiscoveryPage.tsx"
    "components/guild/GuildLeaderboard.tsx"
    "components/guild/GuildProfilePage.tsx"
    "components/guild/GuildAnalytics.tsx"
)

for component in "${COMPONENTS[@]}"; do
    # Check for proper button/link padding (min-h-[44px] or p-3/p-4/py-3/py-4)
    if grep -q "min-h-\[44px\]\|min-h-\[48px\]\|p-3\|p-4\|py-3\|py-4" "$component" 2>/dev/null; then
        print_result 0 "$(basename "$component"): Touch targets properly sized"
    else
        # If no explicit sizing, check if buttons have proper padding
        if grep -q "<button\|<Link" "$component" 2>/dev/null && \
           ! grep -q "p-\|py-\|min-h-" "$component" 2>/dev/null; then
            print_result 1 "$(basename "$component"): Touch targets may be undersized"
        else
            print_result 0 "$(basename "$component"): Touch targets appear adequate"
        fi
    fi
done

# ==========================================
# 5. CONTAINER WIDTH VALIDATION
# ==========================================
print_header "5. Container Width Validation"

# Check for proper max-width or container classes
for component in "${COMPONENTS[@]}"; do
    if grep -q "max-w-\|container\|w-full" "$component" 2>/dev/null; then
        print_result 0 "$(basename "$component"): Container width constraints present"
    else
        print_result 1 "$(basename "$component"): Missing container width constraints"
    fi
done

# ==========================================
# 6. TEXT SCALING VALIDATION
# ==========================================
print_header "6. Text Scaling Validation"

# Check for responsive text sizing
for component in "${COMPONENTS[@]}"; do
    if grep -q "text-xs.*sm:text-sm\|text-sm.*md:text-base\|text-base.*lg:text-lg" "$component" 2>/dev/null; then
        print_result 0 "$(basename "$component"): Responsive text sizing present"
    else
        # Check if at least using reasonable base sizes
        if grep -q "text-\(xs\|sm\|base\|lg\|xl\|2xl\)" "$component" 2>/dev/null; then
            print_result 0 "$(basename "$component"): Text sizing present (static)"
        else
            print_result 1 "$(basename "$component"): Missing text sizing classes"
        fi
    fi
done

# ==========================================
# 7. HORIZONTAL SCROLL PREVENTION
# ==========================================
print_header "7. Horizontal Scroll Prevention"

# Check for overflow handling
for component in "${COMPONENTS[@]}"; do
    # Should NOT have overflow-x-scroll (unless intentional like tables)
    # Should have overflow-hidden or overflow-x-auto where needed
    if grep -q "overflow-x-scroll" "$component" 2>/dev/null && \
       ! grep -q "table\|Table" "$component" 2>/dev/null; then
        print_result 1 "$(basename "$component"): Potentially problematic overflow-x-scroll"
    else
        print_result 0 "$(basename "$component"): No horizontal scroll issues detected"
    fi
done

# ==========================================
# 8. CHARTS RESPONSIVENESS
# ==========================================
print_header "8. Charts Responsiveness (Phase 7)"

# GuildAnalytics - Charts should adapt to screen size
if grep -q "viewBox\|preserveAspectRatio\|w-full.*h-auto" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics: SVG charts responsive"
else
    print_result 1 "GuildAnalytics: SVG charts may not be responsive"
fi

# Check if chart containers have proper sizing
if grep -q "min-h-\[200px\]\|min-h-\[300px\]\|h-64\|h-80" components/guild/GuildAnalytics.tsx 2>/dev/null; then
    print_result 0 "GuildAnalytics: Chart containers have minimum heights"
else
    print_result 1 "GuildAnalytics: Chart containers missing minimum heights"
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
    echo -e "\n${GREEN}✓ ALL TESTS PASSED - Components are mobile-responsive!${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠ SOME TESTS FAILED - Review mobile responsiveness above${NC}\n"
    exit 1
fi
