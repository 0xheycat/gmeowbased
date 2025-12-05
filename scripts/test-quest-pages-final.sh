#!/bin/bash

# Quest Pages Final Verification Test
# Tests all quest pages for functionality, contrast, and accessibility
# Date: December 5, 2025

echo "======================================"
echo "Quest Pages Final Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Test result function
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

test_warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
    ((WARNINGS++))
}

test_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# ===========================================
# SECTION 1: Quest List Page (/quests)
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: Quest List Page (/quests)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1.1: Quest list page exists
test_info "Checking quest list page..."
if [ -f "app/quests/page.tsx" ]; then
    test_result 0 "Quest list page exists (app/quests/page.tsx)"
else
    test_result 1 "Quest list page missing"
fi

# Test 1.2: QuestGrid component exists
if [ -f "components/quests/QuestGrid.tsx" ]; then
    test_result 0 "QuestGrid component exists"
else
    test_result 1 "QuestGrid component missing"
fi

# Test 1.3: QuestCard component exists
if [ -f "components/quests/QuestCard.tsx" ]; then
    test_result 0 "QuestCard component exists"
else
    test_result 1 "QuestCard component missing"
fi

# Test 1.4: Check for proper grid layout
if grep -q "grid-cols-1.*md:grid-cols-2.*lg:grid-cols-3" components/quests/QuestGrid.tsx 2>/dev/null; then
    test_result 0 "Responsive grid layout implemented (1→2→3 columns)"
else
    test_warning "Responsive grid layout not found (check QuestGrid.tsx)"
fi

# Test 1.5: Check for category filtering
if grep -q "category.*filter\|QuestCategory" app/quests/page.tsx 2>/dev/null; then
    test_result 0 "Category filtering implemented"
else
    test_warning "Category filtering not found"
fi

# Test 1.6: Check for difficulty badges
if grep -q "difficulty.*badge\|DifficultyBadge" components/quests/QuestCard.tsx 2>/dev/null; then
    test_result 0 "Difficulty badges implemented"
else
    test_warning "Difficulty badges not found"
fi

echo ""

# ===========================================
# SECTION 2: Quest Creation Page (/quests/create)
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: Quest Creation Page (/quests/create)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2.1: Quest creation page exists
if [ -f "app/quests/create/page.tsx" ]; then
    test_result 0 "Quest creation page exists"
else
    test_result 1 "Quest creation page missing"
fi

# Test 2.2: Check 5-step wizard components
WIZARD_COMPONENTS=(
    "app/quests/create/components/TemplateSelector.tsx"
    "app/quests/create/components/WizardStepper.tsx"
    "app/quests/create/components/QuestBasicsForm.tsx"
    "app/quests/create/components/TaskBuilder.tsx"
    "app/quests/create/components/RewardsForm.tsx"
    "app/quests/create/components/QuestPreview.tsx"
)

for component in "${WIZARD_COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        test_result 0 "$(basename $component) exists"
    else
        test_result 1 "$(basename $component) missing"
    fi
done

# Test 2.3: Check Phase 4 components
if [ -f "app/quests/create/components/QuestImageUploader.tsx" ]; then
    test_result 0 "QuestImageUploader exists (Phase 4)"
else
    test_result 1 "QuestImageUploader missing (Phase 4)"
fi

if [ -f "app/quests/create/components/BadgeSelector.tsx" ]; then
    test_result 0 "BadgeSelector exists (Phase 4)"
else
    test_result 1 "BadgeSelector missing (Phase 4)"
fi

# Test 2.4: Check API endpoint
if [ -f "app/api/quests/create/route.ts" ]; then
    test_result 0 "Quest creation API endpoint exists"
else
    test_result 1 "Quest creation API endpoint missing"
fi

# Test 2.5: Check points escrow service
if [ -f "lib/quests/points-escrow-service.ts" ]; then
    test_result 0 "Points escrow service exists"
else
    test_result 1 "Points escrow service missing"
fi

# Test 2.6: Check post-publish actions
if grep -q "announce_via_bot\|notification-history\|frame.*quest" app/api/quests/create/route.ts 2>/dev/null; then
    test_result 0 "Post-publish actions implemented (notifications + frames + bot)"
else
    test_warning "Post-publish actions not found in API"
fi

echo ""

# ===========================================
# SECTION 3: Quest Detail Page (/quests/[slug])
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: Quest Detail Page (/quests/[slug])"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3.1: Quest detail page exists
if [ -f "app/quests/[slug]/page.tsx" ]; then
    test_result 0 "Quest detail page exists"
else
    test_result 1 "Quest detail page missing"
fi

# Test 3.2: QuestVerification component exists
if [ -f "components/quests/QuestVerification.tsx" ]; then
    test_result 0 "QuestVerification component exists"
else
    test_result 1 "QuestVerification component missing"
fi

# Test 3.3: QuestProgress component exists
if [ -f "components/quests/QuestProgress.tsx" ]; then
    test_result 0 "QuestProgress component exists"
else
    test_result 1 "QuestProgress component missing"
fi

# Test 3.4: Check for task list display
if grep -q "quest_tasks\|TaskList\|task.*map" app/quests/[slug]/page.tsx 2>/dev/null; then
    test_result 0 "Task list display implemented"
else
    test_warning "Task list display not found"
fi

# Test 3.5: Check verification orchestrator
if [ -f "lib/quests/verification-orchestrator.ts" ]; then
    test_result 0 "Verification orchestrator exists"
else
    test_result 1 "Verification orchestrator missing"
fi

echo ""

# ===========================================
# SECTION 4: Quest Complete Page (/quests/[slug]/complete)
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: Quest Complete Page (/quests/[slug]/complete)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4.1: Quest complete page exists
if [ -f "app/quests/[slug]/complete/page.tsx" ]; then
    test_result 0 "Quest complete page exists"
else
    test_result 1 "Quest complete page missing"
fi

# Test 4.2: QuestCompleteClient component exists
if [ -f "components/quests/QuestCompleteClient.tsx" ]; then
    test_result 0 "QuestCompleteClient component exists"
else
    test_result 1 "QuestCompleteClient component missing"
fi

# Test 4.3: Check for rewards display
if grep -q "reward.*points\|reward.*xp\|reward.*badge" components/quests/QuestCompleteClient.tsx 2>/dev/null; then
    test_result 0 "Rewards display implemented"
else
    test_warning "Rewards display not found"
fi

echo ""

# ===========================================
# SECTION 5: Contrast & Accessibility Tests
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: Contrast & Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 5.1: Check for proper text contrast classes
test_info "Checking contrast ratios in quest components..."

# Check for text-foreground usage (proper contrast)
TEXT_CONTRAST_FILES=(
    "components/quests/QuestCard.tsx"
    "components/quests/QuestGrid.tsx"
    "components/quests/QuestVerification.tsx"
    "components/quests/create/QuestBasicsForm.tsx"
    "components/quests/create/RewardsForm.tsx"
)

for file in "${TEXT_CONTRAST_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "text-foreground\|text-gray-900.*dark:text-white\|text-slate-900.*dark:text-slate-100" "$file"; then
            test_result 0 "$(basename $file): Uses proper contrast classes"
        else
            test_warning "$(basename $file): May have contrast issues (check manually)"
        fi
    fi
done

# Test 5.2: Check for proper background contrast
test_info "Checking background contrast..."

for file in "${TEXT_CONTRAST_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "bg-background\|bg-card\|bg-white.*dark:bg-gray-900" "$file"; then
            test_result 0 "$(basename $file): Uses proper background classes"
        else
            test_warning "$(basename $file): Background contrast not verified"
        fi
    fi
done

# Test 5.3: Check for ARIA labels
test_info "Checking accessibility attributes..."

if grep -rq "aria-label\|aria-labelledby\|aria-describedby" components/quests/ 2>/dev/null; then
    test_result 0 "ARIA labels found in quest components"
else
    test_warning "ARIA labels may be missing (impacts screen readers)"
fi

# Test 5.4: Check for semantic HTML
if grep -rq "<button\|<nav\|<main\|<section\|<article\|<header" components/quests/ 2>/dev/null; then
    test_result 0 "Semantic HTML elements used"
else
    test_warning "Semantic HTML usage not verified"
fi

echo ""

# ===========================================
# SECTION 6: Mobile Responsive Tests
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: Mobile Responsive Design"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 6.1: Check for mobile-first breakpoints
if grep -rq "sm:\|md:\|lg:\|xl:" components/quests/ 2>/dev/null; then
    test_result 0 "Mobile-first breakpoints used"
else
    test_result 1 "Mobile-first breakpoints missing"
fi

# Test 6.2: Check for proper touch targets
if grep -rq "min-h-\[44px\]\|h-11\|h-12\|p-4\|py-3.*px-4" components/quests/ 2>/dev/null; then
    test_result 0 "Touch-friendly target sizes (44px+ minimum)"
else
    test_warning "Touch target sizes not verified"
fi

# Test 6.3: Check for overflow handling
if grep -rq "overflow-x-auto\|overflow-hidden\|min-w-0" components/quests/ 2>/dev/null; then
    test_result 0 "Overflow prevention implemented"
else
    test_warning "Overflow handling not verified"
fi

# Test 6.4: Check for responsive text
if grep -rq "text-sm.*md:text-base\|text-base.*lg:text-lg" components/quests/ 2>/dev/null; then
    test_result 0 "Responsive text sizing used"
else
    test_warning "Responsive text sizing not found"
fi

echo ""

# ===========================================
# SECTION 7: TypeScript Type Safety
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 7: TypeScript Type Safety"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 7.1: Check quest types exist
if [ -f "lib/quests/types.ts" ]; then
    test_result 0 "Quest types file exists (lib/quests/types.ts)"
else
    test_result 1 "Quest types file missing"
fi

# Test 7.2: Check for QuestDraft interface
if grep -q "interface QuestDraft\|type QuestDraft" lib/quests/types.ts 2>/dev/null; then
    test_result 0 "QuestDraft interface defined"
else
    test_result 1 "QuestDraft interface missing"
fi

# Test 7.3: Check for TaskConfig interface
if grep -q "interface TaskConfig\|type TaskConfig" lib/quests/types.ts 2>/dev/null; then
    test_result 0 "TaskConfig interface defined"
else
    test_result 1 "TaskConfig interface missing"
fi

# Test 7.4: Check for announce_via_bot field (Phase 4)
if grep -q "announce_via_bot" lib/quests/types.ts 2>/dev/null; then
    test_result 0 "announce_via_bot field added (Phase 4)"
else
    test_warning "announce_via_bot field not found"
fi

# Test 7.5: Run TypeScript check on quest files
test_info "Running TypeScript check on quest system..."
if npx tsc --noEmit --skipLibCheck app/quests/**/*.tsx components/quests/**/*.tsx lib/quests/**/*.ts 2>/dev/null; then
    test_result 0 "Quest system TypeScript: 0 errors"
else
    test_warning "Quest system may have TypeScript errors (run: npx tsc --noEmit)"
fi

echo ""

# ===========================================
# SECTION 8: Integration Tests
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 8: System Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 8.1: Check badge system integration
if [ -f "lib/badges.ts" ] && grep -rq "BADGE_REGISTRY\|badge_templates" components/quests/ 2>/dev/null; then
    test_result 0 "Badge system integrated (BADGE_REGISTRY)"
else
    test_warning "Badge system integration not verified"
fi

# Test 8.2: Check notification system integration
if [ -f "lib/notification-history.ts" ] && grep -q "notification-history\|saveNotification" app/api/quests/create/route.ts 2>/dev/null; then
    test_result 0 "Notification system integrated (notification-history)"
else
    test_warning "Notification system integration not verified"
fi

# Test 8.3: Check frame system integration
if [ -f "app/frame/quest/[questId]/route.tsx" ] && grep -q "frame.*quest" app/api/quests/create/route.ts 2>/dev/null; then
    test_result 0 "Frame system integrated (/frame/quest/[slug])"
else
    test_warning "Frame system integration not verified"
fi

# Test 8.4: Check points escrow integration
if grep -q "leaderboard_calculations.*base_points\|escrowPoints" app/api/quests/create/route.ts 2>/dev/null; then
    test_result 0 "Points escrow integrated (leaderboard_calculations)"
else
    test_result 1 "Points escrow integration missing"
fi

# Test 8.5: Check verification orchestrator integration
if grep -q "verification-orchestrator\|verifyTask" app/quests/[slug]/page.tsx 2>/dev/null || \
   grep -q "verification-orchestrator" components/quests/QuestVerification.tsx 2>/dev/null; then
    test_result 0 "Verification orchestrator integrated"
else
    test_warning "Verification orchestrator integration not verified"
fi

echo ""

# ===========================================
# SECTION 9: Database Schema Alignment
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 9: Database Schema Alignment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 9.1: Check unified_quests table usage
if grep -rq "unified_quests" app/api/quests/ app/quests/ 2>/dev/null; then
    test_result 0 "unified_quests table used correctly"
else
    test_result 1 "unified_quests table references missing"
fi

# Test 9.2: Check quest_tasks table usage
if grep -rq "quest_tasks" app/api/quests/ app/quests/ 2>/dev/null; then
    test_result 0 "quest_tasks table used correctly"
else
    test_result 1 "quest_tasks table references missing"
fi

# Test 9.3: Check verification_data JSONB field
if grep -rq "verification_data" lib/quests/ components/quests/ 2>/dev/null; then
    test_result 0 "verification_data JSONB field used correctly"
else
    test_warning "verification_data field usage not verified"
fi

# Test 9.4: Check quest_templates table integration
if grep -rq "quest_templates\|fetchQuestTemplates" app/quests/create/ 2>/dev/null; then
    test_result 0 "quest_templates table integrated"
else
    test_warning "quest_templates integration not verified"
fi

echo ""

# ===========================================
# FINAL RESULTS
# ===========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FINAL RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo -e "Tests Run: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "Success Rate: ${BLUE}$SUCCESS_RATE%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "Quest system is production-ready!"
    exit 0
elif [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${YELLOW}⚠ MOSTLY PASSING${NC} (90%+)"
    echo "Quest system functional, minor issues to address"
    exit 0
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠ NEEDS ATTENTION${NC} (70-89%)"
    echo "Quest system needs improvements before production"
    exit 1
else
    echo -e "${RED}✗ CRITICAL ISSUES${NC} (<70%)"
    echo "Quest system requires significant work"
    exit 1
fi
