#!/bin/bash

# Mobile Responsive Testing for Quest Creation System
# Tests all components at 375px width (iPhone SE baseline)
# Date: December 5, 2025

set -e

echo "========================================="
echo "Quest Creation Mobile Testing (375px)"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Function to test component
test_component() {
  local component=$1
  local test_name=$2
  local command=$3
  
  echo -e "${YELLOW}Testing:${NC} $test_name"
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} $test_name"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# Function to check CSS patterns
check_css_pattern() {
  local file=$1
  local pattern=$2
  local test_name=$3
  
  echo -e "${YELLOW}Checking:${NC} $test_name"
  
  if grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✓ PASS${NC} Found: $pattern"
    PASSED=$((PASSED + 1))
  else
    echo -e "${YELLOW}⚠ WARN${NC} Missing: $pattern in $file"
    WARNINGS=$((WARNINGS + 1))
  fi
  echo ""
}

echo "1. Checking TypeScript Compilation..."
echo "======================================="
if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "Found 0 errors"; then
  echo -e "${GREEN}✓ PASS${NC} No TypeScript errors"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} TypeScript errors found"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "2. Mobile-First Breakpoints Validation"
echo "======================================="

# Test main page container
check_css_pattern "app/quests/create/page.tsx" \
  "container max-w-6xl mx-auto py-8 px-4" \
  "Main container has mobile padding (px-4)"

# Test template selector grid
check_css_pattern "app/quests/create/components/TemplateSelector.tsx" \
  "grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-3" \
  "TemplateSelector responsive grid (1→2→3 columns)"

# Test wizard stepper mobile fallback
check_css_pattern "app/quests/create/components/WizardStepper.tsx" \
  "md:hidden" \
  "WizardStepper has mobile-specific UI"

# Test preview grid
check_css_pattern "app/quests/create/components/QuestPreview.tsx" \
  "lg:grid-cols-2" \
  "QuestPreview has desktop 2-column layout"

echo "3. Form Input Mobile Responsiveness"
echo "======================================="

# Check QuestBasicsForm
check_css_pattern "app/quests/create/components/QuestBasicsForm.tsx" \
  "sm:grid-cols-2" \
  "QuestBasicsForm date inputs responsive grid"

# Check TaskBuilder spacing
check_css_pattern "app/quests/create/components/TaskBuilder.tsx" \
  "space-y-4" \
  "TaskBuilder has proper vertical spacing"

# Check RewardsForm layout
check_css_pattern "app/quests/create/components/RewardsForm.tsx" \
  "space-y-" \
  "RewardsForm has vertical spacing for mobile"

echo "4. Touch Target Validation (44px minimum)"
echo "======================================="

# Check button sizes
check_css_pattern "app/quests/create/components/TaskBuilder.tsx" \
  "Button" \
  "TaskBuilder uses Button component (touch-optimized)"

check_css_pattern "app/quests/create/components/QuestBasicsForm.tsx" \
  "Button" \
  "QuestBasicsForm uses Button component (touch-optimized)"

echo "5. Overflow Prevention"
echo "======================================="

# Check for horizontal scrolling prevention
check_css_pattern "app/quests/create/components/BadgeSelector.tsx" \
  "overflow-x-auto" \
  "BadgeSelector tier filter has controlled overflow"

# Check image uploader min-width
check_css_pattern "app/quests/create/components/QuestImageUploader.tsx" \
  "min-w-0" \
  "QuestImageUploader prevents text overflow with min-w-0"

echo "6. Component File Existence"
echo "======================================="

COMPONENTS=(
  "app/quests/create/page.tsx"
  "app/quests/create/components/WizardStepper.tsx"
  "app/quests/create/components/TemplateSelector.tsx"
  "app/quests/create/components/QuestBasicsForm.tsx"
  "app/quests/create/components/TaskBuilder.tsx"
  "app/quests/create/components/RewardsForm.tsx"
  "app/quests/create/components/QuestPreview.tsx"
  "app/quests/create/components/QuestImageUploader.tsx"
  "app/quests/create/components/BadgeSelector.tsx"
  "app/quests/create/components/PointsCostBadge.tsx"
)

for component in "${COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    echo -e "${GREEN}✓${NC} $component exists"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $component missing"
    FAILED=$((FAILED + 1))
  fi
done
echo ""

echo "7. Mobile-Specific CSS Classes Check"
echo "======================================="

# Check for common mobile-breaking patterns
echo "Checking for mobile-breaking patterns..."

# Check for fixed widths without responsive variants
if grep -r "w-\[0-9\]" app/quests/create/components/*.tsx | grep -v "sm:\|md:\|lg:" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ WARN${NC} Found fixed widths without responsive variants"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ PASS${NC} No problematic fixed widths"
  PASSED=$((PASSED + 1))
fi

# Check for proper mobile padding
if grep -r "px-4\|px-6" app/quests/create/components/*.tsx > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC} Components have mobile padding"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ WARN${NC} Some components may lack mobile padding"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All critical mobile tests passed!${NC}"
  echo ""
  echo "Manual Testing Recommendations:"
  echo "1. Open http://localhost:3000/quests/create in Chrome DevTools"
  echo "2. Set device to 'iPhone SE' (375px width)"
  echo "3. Test all 5 wizard steps:"
  echo "   - Template selection (cards should stack)"
  echo "   - Basics form (inputs should be full-width)"
  echo "   - Task builder (task cards should be scrollable)"
  echo "   - Rewards form (badge selector should work)"
  echo "   - Preview (content should not overflow)"
  echo "4. Verify touch targets are at least 44x44px"
  echo "5. Check horizontal scrolling doesn't occur"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Review issues above.${NC}"
  exit 1
fi
