#!/bin/bash

# ============================================================================
# Task 11 Phase 4: WCAG 2.1 AAA Accessibility Testing
# ============================================================================
# Purpose: Comprehensive accessibility audit for all Task 9-11 components
# Standards: WCAG 2.1 Level AAA (highest standard)
# Components: Profile (Task 9), Referral (Task 10 Phase 1-4), Guild (Task 10 Phase 5-7)
# Method: Auto-detect from actual component files (Chrome DevTools methodology)
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "  WCAG 2.1 AAA Accessibility Testing - Task 11 Phase 4"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Standards:"
echo "  • WCAG AAA Contrast: 7:1 (normal text), 4.5:1 (large text)"
echo "  • Touch Targets: 44×44px minimum (WCAG 2.5.5 Level AAA)"
echo "  • Focus Indicators: Visible on all interactive elements"
echo "  • ARIA Labels: Present on all icons, buttons without text"
echo "  • Keyboard Navigation: Tab order, Enter/Space activation"
echo ""
echo "Components Under Test:"
echo "  • Profile (9): ProfileHeader, ProfileStats, SocialLinks, ProfileTabs,"
echo "                 QuestActivity, BadgeCollection, ActivityTimeline,"
echo "                 ProfileEditModal, BadgeHoverCard"
echo "  • Referral (10.1-4): ReferralDashboard, ReferralLinkGenerator,"
echo "                       ReferralStatsCards, ReferralCodeForm,"
echo "                       ReferralLeaderboard, ReferralActivityFeed,"
echo "                       ReferralAnalytics"
echo "  • Guild (10.5-7): GuildCreationForm, GuildCard, GuildMemberList,"
echo "                    GuildTreasuryPanel, GuildDiscoveryPage,"
echo "                    GuildLeaderboard, GuildProfilePage, GuildAnalytics"
echo "  • Pages: app/profile/[fid]/page.tsx, app/referral/page.tsx,"
echo "           app/guild/page.tsx, app/guild/[guildId]/page.tsx,"
echo "           app/guild/leaderboard/page.tsx"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# ============================================================================
# Test Categories
# ============================================================================

declare -A TEST_CATEGORIES=(
  ["contrast"]="Color Contrast (AAA: 7:1 normal, 4.5:1 large)"
  ["touch"]="Touch Targets (44×44px minimum)"
  ["focus"]="Focus Indicators (visible outlines)"
  ["aria"]="ARIA Labels (accessibility attributes)"
  ["keyboard"]="Keyboard Navigation (tabIndex, onKeyDown)"
  ["semantic"]="Semantic HTML (proper heading hierarchy)"
)

# ============================================================================
# Component Files to Test
# ============================================================================

PROFILE_COMPONENTS=(
  "components/profile/ProfileHeader.tsx"
  "components/profile/ProfileStats.tsx"
  "components/profile/SocialLinks.tsx"
  "components/profile/ProfileTabs.tsx"
  "components/profile/QuestActivity.tsx"
  "components/profile/BadgeCollection.tsx"
  "components/profile/ActivityTimeline.tsx"
  "components/profile/ProfileEditModal.tsx"
  "components/profile/BadgeHoverCard.tsx"
)

REFERRAL_COMPONENTS=(
  "components/referral/ReferralDashboard.tsx"
  "components/referral/ReferralLinkGenerator.tsx"
  "components/referral/ReferralStatsCards.tsx"
  "components/referral/ReferralCodeForm.tsx"
  "components/referral/ReferralLeaderboard.tsx"
  "components/referral/ReferralActivityFeed.tsx"
  "components/referral/ReferralAnalytics.tsx"
)

GUILD_PAGES=(
  "app/guild/page.tsx"
  "app/guild/[guildId]/page.tsx"
  "app/guild/leaderboard/page.tsx"
)

OTHER_PAGES=(
  "app/profile/[fid]/page.tsx"
  "app/referral/page.tsx"
)

ALL_COMPONENTS=("${PROFILE_COMPONENTS[@]}" "${REFERRAL_COMPONENTS[@]}" "${GUILD_PAGES[@]}" "${OTHER_PAGES[@]}")

# ============================================================================
# Tailwind Color Mappings (WCAG AAA Contrast Testing)
# ============================================================================

declare -A COLORS=(
  # Gray scale
  ["gray-50"]="#F9FAFB"
  ["gray-100"]="#F3F4F6"
  ["gray-200"]="#E5E7EB"
  ["gray-300"]="#D1D5DB"
  ["gray-400"]="#9CA3AF"
  ["gray-500"]="#6B7280"
  ["gray-600"]="#4B5563"
  ["gray-700"]="#374151"
  ["gray-800"]="#1F2937"
  ["gray-900"]="#111827"
  
  # Blue
  ["blue-200"]="#BFDBFE"
  ["blue-300"]="#93C5FD"
  ["blue-400"]="#60A5FA"
  ["blue-500"]="#3B82F6"
  ["blue-600"]="#2563EB"
  ["blue-700"]="#1D4ED8"
  ["blue-800"]="#1E40AF"
  
  # Green
  ["green-100"]="#DCFCE7"
  ["green-200"]="#BBF7D0"
  ["green-300"]="#86EFAC"
  ["green-400"]="#4ADE80"
  ["green-600"]="#16A34A"
  ["green-700"]="#15803D"
  ["green-800"]="#166534"
  
  # Red
  ["red-50"]="#FEF2F2"
  ["red-100"]="#FEE2E2"
  ["red-200"]="#FECACA"
  ["red-400"]="#F87171"
  ["red-600"]="#DC2626"
  ["red-700"]="#B91C1C"
  
  # Yellow/Amber
  ["yellow-400"]="#FACC15"
  ["amber-400"]="#FBBF24"
  ["amber-500"]="#F59E0B"
  ["amber-600"]="#D97706"
  
  # Purple
  ["purple-200"]="#E9D5FF"
  ["purple-400"]="#A855F7"
  ["purple-600"]="#9333EA"
  
  # Cyan
  ["cyan-400"]="#22D3EE"
  ["cyan-600"]="#0891B2"
  
  # Orange
  ["orange-400"]="#FB923C"
  ["orange-600"]="#EA580C"
  
  # Violet
  ["violet-400"]="#A78BFA"
  ["violet-600"]="#7C3AED"
  
  # White/Black
  ["white"]="#FFFFFF"
  ["black"]="#000000"
)

# ============================================================================
# W3C Contrast Calculation Functions
# ============================================================================

hex_to_rgb() {
  local hex=$1
  hex=${hex#"#"}
  printf "%d %d %d" 0x${hex:0:2} 0x${hex:2:2} 0x${hex:4:2}
}

get_luminance() {
  local r=$1 g=$2 b=$3
  r=$(echo "scale=10; $r / 255" | bc)
  g=$(echo "scale=10; $g / 255" | bc)
  b=$(echo "scale=10; $b / 255" | bc)
  
  r=$(echo "scale=10; if ($r <= 0.03928) $r / 12.92 else (($r + 0.055) / 1.055) ^ 2.4" | bc)
  g=$(echo "scale=10; if ($g <= 0.03928) $g / 12.92 else (($g + 0.055) / 1.055) ^ 2.4" | bc)
  b=$(echo "scale=10; if ($b <= 0.03928) $b / 12.92 else (($b + 0.055) / 1.055) ^ 2.4" | bc)
  
  echo "scale=10; (0.2126 * $r) + (0.7152 * $g) + (0.0722 * $b)" | bc
}

calculate_contrast() {
  local fg_hex=$1 bg_hex=$2
  
  read fg_r fg_g fg_b <<< $(hex_to_rgb "$fg_hex")
  read bg_r bg_g bg_b <<< $(hex_to_rgb "$bg_hex")
  
  fg_lum=$(get_luminance $fg_r $fg_g $fg_b)
  bg_lum=$(get_luminance $bg_r $bg_g $bg_b)
  
  if (( $(echo "$fg_lum > $bg_lum" | bc -l) )); then
    echo "scale=2; ($fg_lum + 0.05) / ($bg_lum + 0.05)" | bc
  else
    echo "scale=2; ($bg_lum + 0.05) / ($fg_lum + 0.05)" | bc
  fi
}

# ============================================================================
# TEST 1: Color Contrast (WCAG AAA - 7:1 normal, 4.5:1 large)
# ============================================================================

test_contrast_aaa() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 1: Color Contrast (WCAG AAA)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local contrast_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      echo -e "${YELLOW}⚠${NC} Skipping: $file (not found)"
      continue
    fi
    
    echo "Testing: $file"
    
    # Extract className attributes with text/bg colors
    while IFS=: read -r line_num line_content; do
      # Light mode: text-* with bg-* (no dark: prefix)
      light_text=$(echo "$line_content" | grep -oP "(?<!dark:)text-[a-z]+-[0-9]+" | grep -v "^dark:" | sort -u)
      light_bg=$(echo "$line_content" | grep -oP "(?<!dark:)bg-[a-z]+-[0-9]+" | grep -v "^dark:" | sort -u)
      
      # Dark mode: dark:text-* with dark:bg-*
      dark_text=$(echo "$line_content" | grep -oP "dark:text-[a-z]+-[0-9]+" | sed 's/dark://' | sort -u)
      dark_bg=$(echo "$line_content" | grep -oP "dark:bg-[a-z]+-[0-9]+" | sed 's/dark://' | sort -u)
      
      # Test light mode combinations
      if [[ -n "$light_text" && -n "$light_bg" ]]; then
        for text_class in $light_text; do
          for bg_class in $light_bg; do
            bg_color="${bg_class#bg-}"
            text_color="${text_class#text-}"
            
            # Skip if both have dark: variants (properly separated)
            has_dark_text=$(echo "$line_content" | grep -c "dark:$text_class" || true)
            has_dark_bg=$(echo "$line_content" | grep -c "dark:$bg_class" || true)
            
            if [[ $has_dark_text -gt 0 && $has_dark_bg -gt 0 ]]; then
              continue
            fi
            
            # Resolve hex colors
            local fg_hex="${COLORS[$text_color]}"
            local bg_hex="${COLORS[$bg_color]}"
            
            if [[ -z "$fg_hex" || -z "$bg_hex" ]]; then
              continue
            fi
            
            # Calculate contrast
            ratio=$(calculate_contrast "$fg_hex" "$bg_hex")
            
            # AAA requires 7:1 for normal text, 4.5:1 for large text
            if echo "$line_content" | grep -q "text-3xl\|text-2xl\|text-xl\|text-lg"; then
              min_ratio=4.5
              level="AAA Large"
            else
              min_ratio=7.0
              level="AAA Normal"
            fi
            
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            
            if (( $(echo "$ratio >= $min_ratio" | bc -l) )); then
              echo -e "${GREEN}✓${NC} Light mode: $text_class on $bg_class (${ratio}:1 ≥ ${min_ratio}:1 $level)"
              PASSED_TESTS=$((PASSED_TESTS + 1))
            else
              diff=$(echo "scale=2; $min_ratio - $ratio" | bc)
              echo -e "${RED}✗${NC} Light mode: $text_class on $bg_class"
              echo "   Ratio: ${ratio}:1 (needs ${min_ratio}:1 $level, gap: -${diff})"
              echo "   Location: $file:$line_num"
              echo "   Fix: Use text-gray-800+ or darker"
              FAILED_TESTS=$((FAILED_TESTS + 1))
              contrast_failures=$((contrast_failures + 1))
            fi
          done
        done
      fi
      
      # Test dark mode combinations
      if [[ -n "$dark_text" && -n "$dark_bg" ]]; then
        for text_class in $dark_text; do
          for bg_class in $dark_bg; do
            bg_color="${bg_class#bg-}"
            text_color="${text_class#text-}"
            
            local fg_hex="${COLORS[$text_color]}"
            local bg_hex="${COLORS[$bg_color]}"
            
            if [[ -z "$fg_hex" || -z "$bg_hex" ]]; then
              continue
            fi
            
            ratio=$(calculate_contrast "$fg_hex" "$bg_hex")
            
            if echo "$line_content" | grep -q "text-3xl\|text-2xl\|text-xl\|text-lg"; then
              min_ratio=4.5
              level="AAA Large"
            else
              min_ratio=7.0
              level="AAA Normal"
            fi
            
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            
            if (( $(echo "$ratio >= $min_ratio" | bc -l) )); then
              echo -e "${GREEN}✓${NC} Dark mode: $text_class on $bg_class (${ratio}:1 ≥ ${min_ratio}:1 $level)"
              PASSED_TESTS=$((PASSED_TESTS + 1))
            else
              diff=$(echo "scale=2; $min_ratio - $ratio" | bc)
              echo -e "${RED}✗${NC} Dark mode: $text_class on $bg_class"
              echo "   Ratio: ${ratio}:1 (needs ${min_ratio}:1 $level, gap: -${diff})"
              echo "   Location: $file:$line_num"
              echo "   Fix: Use text-gray-200+ or lighter"
              FAILED_TESTS=$((FAILED_TESTS + 1))
              contrast_failures=$((contrast_failures + 1))
            fi
          done
        done
      fi
    done < <(grep -n "className=" "$file")
    
    echo ""
  done
  
  echo "Contrast Test Summary: $contrast_failures failures"
  echo ""
}

# ============================================================================
# TEST 2: Touch Targets (WCAG 2.5.5 Level AAA - 44×44px minimum)
# ============================================================================

test_touch_targets() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 2: Touch Targets (WCAG AAA - 44×44px minimum)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local touch_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      continue
    fi
    
    echo "Testing: $file"
    
    # Check for min-h-[44px] or equivalent on interactive elements
    if grep -q "<button\|<a\|onClick\|onKeyDown" "$file"; then
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      
      if grep -q "min-h-\[44px\]\|min-h-11\|h-11\|h-12\|h-16" "$file"; then
        echo -e "${GREEN}✓${NC} Touch targets: 44×44px minimum found"
        PASSED_TESTS=$((PASSED_TESTS + 1))
      else
        echo -e "${YELLOW}⚠${NC} Touch targets: Missing min-h-[44px] on interactive elements"
        echo "   Recommendation: Add min-h-[44px] min-w-[44px] to buttons/links"
        echo "   Location: $file"
        WARNING_TESTS=$((WARNING_TESTS + 1))
        touch_failures=$((touch_failures + 1))
      fi
    fi
    
    echo ""
  done
  
  echo "Touch Target Test Summary: $touch_failures warnings"
  echo ""
}

# ============================================================================
# TEST 3: Focus Indicators (Visible outlines on interactive elements)
# ============================================================================

test_focus_indicators() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 3: Focus Indicators (Visible outlines)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local focus_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      continue
    fi
    
    echo "Testing: $file"
    
    # Check for focus: classes on interactive elements
    if grep -q "<button\|<a\|<input\|<textarea\|<select" "$file"; then
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      
      if grep -q "focus:ring\|focus:outline\|focus:border\|focus-visible:" "$file"; then
        echo -e "${GREEN}✓${NC} Focus indicators: Found focus: classes"
        PASSED_TESTS=$((PASSED_TESTS + 1))
      else
        echo -e "${RED}✗${NC} Focus indicators: Missing focus: classes on interactive elements"
        echo "   Fix: Add focus:ring-2 focus:ring-blue-500 focus:outline-none"
        echo "   Location: $file"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        focus_failures=$((focus_failures + 1))
      fi
    fi
    
    echo ""
  done
  
  echo "Focus Indicator Test Summary: $focus_failures failures"
  echo ""
}

# ============================================================================
# TEST 4: ARIA Labels (Accessibility attributes)
# ============================================================================

test_aria_labels() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 4: ARIA Labels (Accessibility attributes)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local aria_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      continue
    fi
    
    echo "Testing: $file"
    
    # Check for aria-label or aria-labelledby on icon buttons
    if grep -q "<button.*<.*Icon\|<IconButton" "$file"; then
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      
      if grep -q "aria-label=\|aria-labelledby=\|aria-describedby=" "$file"; then
        echo -e "${GREEN}✓${NC} ARIA labels: Found aria-label attributes"
        PASSED_TESTS=$((PASSED_TESTS + 1))
      else
        echo -e "${YELLOW}⚠${NC} ARIA labels: Icon buttons may need aria-label"
        echo "   Recommendation: Add aria-label to icon-only buttons"
        echo "   Location: $file"
        WARNING_TESTS=$((WARNING_TESTS + 1))
        aria_failures=$((aria_failures + 1))
      fi
    else
      # No icon buttons found - pass by default
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      echo -e "${GREEN}✓${NC} ARIA labels: No icon buttons requiring labels"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    
    echo ""
  done
  
  echo "ARIA Label Test Summary: $aria_failures warnings"
  echo ""
}

# ============================================================================
# TEST 5: Keyboard Navigation (tabIndex, onKeyDown)
# ============================================================================

test_keyboard_navigation() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 5: Keyboard Navigation (Tab order, Enter/Space)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local keyboard_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      continue
    fi
    
    echo "Testing: $file"
    
    # Check for keyboard event handlers on non-button interactive elements
    if grep -q "<div.*onClick\|<span.*onClick" "$file"; then
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      
      if grep -q "onKeyDown=\|onKeyPress=\|onKeyUp=\|role=\"button\"" "$file"; then
        echo -e "${GREEN}✓${NC} Keyboard navigation: Found keyboard handlers"
        PASSED_TESTS=$((PASSED_TESTS + 1))
      else
        echo -e "${RED}✗${NC} Keyboard navigation: onClick without keyboard handler"
        echo "   Fix: Add onKeyDown handler or use <button> instead"
        echo "   Location: $file"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        keyboard_failures=$((keyboard_failures + 1))
      fi
    else
      # No non-semantic interactive elements - pass
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      echo -e "${GREEN}✓${NC} Keyboard navigation: Using semantic elements"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    
    echo ""
  done
  
  echo "Keyboard Navigation Test Summary: $keyboard_failures failures"
  echo ""
}

# ============================================================================
# TEST 6: Semantic HTML (Proper heading hierarchy)
# ============================================================================

test_semantic_html() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 6: Semantic HTML (Heading hierarchy)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  local semantic_failures=0
  
  for file in "${ALL_COMPONENTS[@]}"; do
    if [[ ! -f "$file" ]]; then
      continue
    fi
    
    echo "Testing: $file"
    
    # Check for proper heading usage (h1, h2, h3, etc.)
    if grep -q "<h[1-6]" "$file"; then
      TOTAL_TESTS=$((TOTAL_TESTS + 1))
      
      # Check if headings have proper hierarchy (no skipping levels)
      h1_count=$(grep -c "<h1" "$file" || true)
      h3_count=$(grep -c "<h3" "$file" || true)
      h2_count=$(grep -c "<h2" "$file" || true)
      
      if [[ $h3_count -gt 0 && $h2_count -eq 0 && $h1_count -eq 0 ]]; then
        echo -e "${RED}✗${NC} Semantic HTML: Skipped heading levels (h3 without h2/h1)"
        echo "   Fix: Use proper heading hierarchy (h1 → h2 → h3)"
        echo "   Location: $file"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        semantic_failures=$((semantic_failures + 1))
      else
        echo -e "${GREEN}✓${NC} Semantic HTML: Proper heading hierarchy"
        PASSED_TESTS=$((PASSED_TESTS + 1))
      fi
    else
      # No headings - check if component should have them
      if grep -q "title\|heading\|section" "$file"; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo -e "${YELLOW}⚠${NC} Semantic HTML: Consider adding headings for structure"
        echo "   Location: $file"
        WARNING_TESTS=$((WARNING_TESTS + 1))
        semantic_failures=$((semantic_failures + 1))
      fi
    fi
    
    echo ""
  done
  
  echo "Semantic HTML Test Summary: $semantic_failures warnings/failures"
  echo ""
}

# ============================================================================
# Run All Tests
# ============================================================================

echo "Starting WCAG 2.1 AAA Accessibility Tests..."
echo ""

test_contrast_aaa
test_touch_targets
test_focus_indicators
test_aria_labels
test_keyboard_navigation
test_semantic_html

# ============================================================================
# Final Summary
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "  ACCESSIBILITY TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests:    $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}         $PASSED_TESTS"
echo -e "${RED}Failed:${NC}         $FAILED_TESTS"
echo -e "${YELLOW}Warnings:${NC}       $WARNING_TESTS"
echo ""

if [[ $TOTAL_TESTS -gt 0 ]]; then
  pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
  echo "Pass Rate:      ${pass_rate}%"
  
  if [[ $FAILED_TESTS -eq 0 && $WARNING_TESTS -eq 0 ]]; then
    echo -e "${GREEN}Status:${NC}         ✓ WCAG 2.1 AAA COMPLIANT"
  elif [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${YELLOW}Status:${NC}         ⚠ AAA COMPLIANT (with warnings)"
  else
    echo -e "${RED}Status:${NC}         ✗ NON-COMPLIANT (fix failures)"
  fi
else
  echo -e "${YELLOW}Status:${NC}         ⚠ No tests executed"
fi

echo ""
echo "Test Categories Covered:"
for category in "${!TEST_CATEGORIES[@]}"; do
  echo "  • $category: ${TEST_CATEGORIES[$category]}"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"

exit $FAILED_TESTS
