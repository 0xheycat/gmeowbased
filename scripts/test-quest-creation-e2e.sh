#!/bin/bash

# E2E Testing for Quest Creation System
# Tests complete flow: template → basics → tasks → rewards → preview → publish
# Date: December 5, 2025

set -e

echo "========================================="
echo "Quest Creation E2E Testing"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}Test Plan:${NC}"
echo "1. Wizard flow validation (5 steps)"
echo "2. State management (draft persistence)"
echo "3. Validation logic (pre-publish checks)"
echo "4. Cost calculation (real-time updates)"
echo "5. Component integration (all pieces work together)"
echo ""

# Function to test
test_check() {
  local test_name=$1
  local condition=$2
  
  echo -n "Testing: $test_name ... "
  
  if [ "$condition" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  elif [ "$condition" = "warn" ]; then
    echo -e "${YELLOW}⚠ WARN${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED=$((FAILED + 1))
  fi
}

echo "========================================="
echo "1. Wizard Flow Components"
echo "========================================="

# Check all wizard steps exist
test_check "TemplateSelector component exists" "$([ -f app/quests/create/components/TemplateSelector.tsx ] && echo true || echo false)"
test_check "QuestBasicsForm component exists" "$([ -f app/quests/create/components/QuestBasicsForm.tsx ] && echo true || echo false)"
test_check "TaskBuilder component exists" "$([ -f app/quests/create/components/TaskBuilder.tsx ] && echo true || echo false)"
test_check "RewardsForm component exists" "$([ -f app/quests/create/components/RewardsForm.tsx ] && echo true || echo false)"
test_check "QuestPreview component exists" "$([ -f app/quests/create/components/QuestPreview.tsx ] && echo true || echo false)"

# Check wizard stepper
test_check "WizardStepper component exists" "$([ -f app/quests/create/components/WizardStepper.tsx ] && echo true || echo false)"

echo ""
echo "========================================="
echo "2. State Management"
echo "========================================="

# Check draft auto-save hook
test_check "use-quest-draft-autosave hook exists" "$([ -f lib/hooks/use-quest-draft-autosave.ts ] && echo true || echo false)"

# Check page has draft state
test_check "Main page has questDraft state" "$(grep -q "questDraft" app/quests/create/page.tsx && echo true || echo false)"

# Check localStorage integration
test_check "Auto-save hook uses localStorage" "$(grep -q "localStorage" lib/hooks/use-quest-draft-autosave.ts && echo true || echo false)"

echo ""
echo "========================================="
echo "3. Validation Logic"
echo "========================================="

# Check QuestBasicsForm validation
test_check "QuestBasicsForm has validation" "$(grep -q "validate\|errors" app/quests/create/components/QuestBasicsForm.tsx && echo true || echo false)"

# Check TaskBuilder has task validation
test_check "TaskBuilder validates tasks" "$(grep -q "title.*description" app/quests/create/components/TaskBuilder.tsx && echo true || echo false)"

# Check QuestPreview has validation checks
test_check "QuestPreview has validation checks" "$(grep -q "validationChecks" app/quests/create/components/QuestPreview.tsx && echo true || echo false)"

# Count validation checks in preview
VALIDATION_COUNT=$(grep -c "label:.*passed:" app/quests/create/components/QuestPreview.tsx || echo 0)
test_check "QuestPreview has 6+ validation checks" "$([ $VALIDATION_COUNT -ge 6 ] && echo true || echo false)"

echo ""
echo "========================================="
echo "4. Cost Calculation"
echo "========================================="

# Check cost calculator exists
test_check "Cost calculator module exists" "$([ -f lib/quests/cost-calculator.ts ] && echo true || echo false)"

# Check PointsCostBadge component
test_check "PointsCostBadge component exists" "$([ -f app/quests/create/components/PointsCostBadge.tsx ] && echo true || echo false)"

# Check main page uses cost calculator
test_check "Main page imports calculateQuestCost" "$(grep -q "calculateQuestCost" app/quests/create/page.tsx && echo true || echo false)"

# Check real-time cost updates
test_check "Cost updates on draft changes" "$(grep -q "estimatedCost" app/quests/create/page.tsx && echo true || echo false)"

echo ""
echo "========================================="
echo "5. Component Integration"
echo "========================================="

# Check main page integrates all components
test_check "Main page imports TemplateSelector" "$(grep -q "import.*TemplateSelector" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page imports QuestBasicsForm" "$(grep -q "import.*QuestBasicsForm" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page imports TaskBuilder" "$(grep -q "import.*TaskBuilder" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page imports RewardsForm" "$(grep -q "import.*RewardsForm" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page imports QuestPreview" "$(grep -q "import.*QuestPreview" app/quests/create/page.tsx && echo true || echo false)"

# Check step navigation handlers
test_check "Main page has handleUpdateBasics" "$(grep -q "handleUpdateBasics" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page has handleUpdateTasks" "$(grep -q "handleUpdateTasks" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page has handleUpdateRewards" "$(grep -q "handleUpdateRewards" app/quests/create/page.tsx && echo true || echo false)"
test_check "Main page has handlePublish" "$(grep -q "handlePublish" app/quests/create/page.tsx && echo true || echo false)"

echo ""
echo "========================================="
echo "6. API Integration"
echo "========================================="

# Check API route exists
test_check "Quest creation API exists" "$([ -f app/api/quests/create/route.ts ] && echo true || echo false)"

# Check main page calls API
test_check "Main page calls /api/quests/create" "$(grep -q "/api/quests/create" app/quests/create/page.tsx && echo true || echo false)"

# Check points escrow service
test_check "Points escrow service exists" "$([ -f lib/quests/points-escrow-service.ts ] && echo true || echo false)"

echo ""
echo "========================================="
echo "7. Template System Integration"
echo "========================================="

# Check template actions exist
test_check "Quest templates actions exist" "$([ -f app/actions/quest-templates.ts ] && echo true || echo false)"

# Check main page fetches templates
test_check "Main page fetches templates" "$(grep -q "fetchQuestTemplates" app/quests/create/page.tsx && echo true || echo false)"

# Check template selection handler
test_check "Template selection updates draft" "$(grep -q "handleTemplateSelect" app/quests/create/page.tsx && echo true || echo false)"

echo ""
echo "========================================="
echo "8. Phase 4 Features"
echo "========================================="

# Check image upload
test_check "QuestImageUploader exists" "$([ -f app/quests/create/components/QuestImageUploader.tsx ] && echo true || echo false)"
test_check "QuestBasicsForm uses QuestImageUploader" "$(grep -q "QuestImageUploader\|ImageUploader" app/quests/create/components/QuestBasicsForm.tsx && echo true || echo false)"

# Check badge selection
test_check "BadgeSelector exists" "$([ -f app/quests/create/components/BadgeSelector.tsx ] && echo true || echo false)"
test_check "RewardsForm uses BadgeSelector" "$(grep -q "BadgeSelector" app/quests/create/components/RewardsForm.tsx && echo true || echo false)"

# Check icon components
test_check "UploadIcon exists" "$([ -f components/icons/upload-icon.tsx ] && echo true || echo false)"
test_check "ImageIcon exists" "$([ -f components/icons/image-icon.tsx ] && echo true || echo false)"
test_check "CheckIcon exists" "$([ -f components/icons/check-icon.tsx ] && echo true || echo false)"

echo ""
echo "========================================="
echo "9. Type Safety"
echo "========================================="

# Check types file
test_check "Quest types module exists" "$([ -f lib/quests/types.ts ] && echo true || echo false)"

# Check QuestDraft interface
test_check "QuestDraft interface exists" "$(grep -q "interface QuestDraft" lib/quests/types.ts && echo true || echo false)"

# Check TaskConfig interface
test_check "TaskConfig interface exists" "$(grep -q "interface TaskConfig" lib/quests/types.ts && echo true || echo false)"

# Check QuestTemplate interface
test_check "QuestTemplate interface exists" "$(grep -q "interface QuestTemplate" lib/quests/types.ts && echo true || echo false)"

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All E2E structure tests passed!${NC}"
  echo ""
  echo -e "${BLUE}Manual E2E Testing Steps:${NC}"
  echo ""
  echo "1. Start dev server: npm run dev"
  echo "2. Navigate to: http://localhost:3000/quests/create"
  echo ""
  echo "3. Test Template Selection Step:"
  echo "   - Verify 3 templates display"
  echo "   - Click 'Social Amplifier' template"
  echo "   - Verify wizard advances to 'Basics' step"
  echo ""
  echo "4. Test Quest Basics Step:"
  echo "   - Fill title: 'Test Quest E2E'"
  echo "   - Fill description (20+ chars)"
  echo "   - Select category: Social"
  echo "   - Select difficulty: Beginner"
  echo "   - Upload cover image (optional)"
  echo "   - Set end date (future date)"
  echo "   - Click 'Continue'"
  echo "   - Verify wizard advances to 'Tasks' step"
  echo ""
  echo "5. Test Task Builder Step:"
  echo "   - Click 'Add Task' button"
  echo "   - Fill task title: 'Follow @gmeowbased'"
  echo "   - Fill task description"
  echo "   - Select type: Social"
  echo "   - Add verification data (FID)"
  echo "   - Click 'Continue'"
  echo "   - Verify wizard advances to 'Rewards' step"
  echo ""
  echo "6. Test Rewards Step:"
  echo "   - Set BASE POINTS: 100"
  echo "   - Set XP: 50"
  echo "   - Open badge selector"
  echo "   - Filter by tier: legendary"
  echo "   - Select 1 badge"
  echo "   - Verify cost breakdown updates"
  echo "   - Click 'Continue'"
  echo "   - Verify wizard advances to 'Preview' step"
  echo ""
  echo "7. Test Preview Step:"
  echo "   - Verify all 6 validation checks pass"
  echo "   - Verify quest details display correctly"
  echo "   - Verify tasks list shows"
  echo "   - Verify rewards display"
  echo "   - Verify cost badge shows total"
  echo "   - Click 'Show Validation' to check errors"
  echo ""
  echo "8. Test Draft Auto-Save:"
  echo "   - Fill some fields in Basics step"
  echo "   - Refresh page"
  echo "   - Verify recovery prompt appears"
  echo "   - Click 'Restore Draft'"
  echo "   - Verify fields are restored"
  echo ""
  echo "9. Test Error Scenarios:"
  echo "   - Try to advance without filling required fields"
  echo "   - Verify error messages display"
  echo "   - Try to publish without sufficient points"
  echo "   - Verify error handling works"
  echo ""
  echo "10. Test Success Flow (if points available):"
  echo "    - Complete all steps"
  echo "    - Click 'Publish Quest'"
  echo "    - Verify loading state shows"
  echo "    - Verify redirect to quest page"
  echo "    - Verify quest appears in /quests list"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some E2E structure tests failed. Review issues above.${NC}"
  exit 1
fi
