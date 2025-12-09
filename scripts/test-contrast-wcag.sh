#!/bin/bash

# ============================================================================
# Professional WCAG Contrast Testing Suite
# ============================================================================
# Purpose: Automated contrast ratio verification for light/dark mode
# Standards: WCAG 2.1 Level AA (4.5:1 normal, 3:1 large text)
# Reference: Chrome DevTools, axe-core, Lighthouse accessibility audits
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "  WCAG 2.1 Contrast Ratio Testing - Phase 4"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Standards:"
echo "  • WCAG AA: 4.5:1 (normal text), 3:1 (large text/UI)"
echo "  • WCAG AAA: 7:1 (normal text), 4.5:1 (large text)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ============================================================================
# Contrast Calculation (Relative Luminance Formula)
# Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
# ============================================================================

hex_to_rgb() {
  local hex=$1
  hex=${hex#"#"}
  printf "%d %d %d" 0x${hex:0:2} 0x${hex:2:2} 0x${hex:4:2}
}

get_luminance() {
  local r=$1 g=$2 b=$3
  
  # Convert to 0-1 range
  r=$(echo "scale=10; $r / 255" | bc)
  g=$(echo "scale=10; $g / 255" | bc)
  b=$(echo "scale=10; $b / 255" | bc)
  
  # Apply gamma correction
  r=$(echo "scale=10; if ($r <= 0.03928) $r / 12.92 else (($r + 0.055) / 1.055) ^ 2.4" | bc)
  g=$(echo "scale=10; if ($g <= 0.03928) $g / 12.92 else (($g + 0.055) / 1.055) ^ 2.4" | bc)
  b=$(echo "scale=10; if ($b <= 0.03928) $b / 12.92 else (($b + 0.055) / 1.055) ^ 2.4" | bc)
  
  # Calculate luminance
  echo "scale=10; (0.2126 * $r) + (0.7152 * $g) + (0.0722 * $b)" | bc
}

calculate_contrast() {
  local fg_hex=$1 bg_hex=$2
  
  read fg_r fg_g fg_b <<< $(hex_to_rgb "$fg_hex")
  read bg_r bg_g bg_b <<< $(hex_to_rgb "$bg_hex")
  
  fg_lum=$(get_luminance $fg_r $fg_g $fg_b)
  bg_lum=$(get_luminance $bg_r $bg_g $bg_b)
  
  # Contrast ratio formula
  if (( $(echo "$fg_lum > $bg_lum" | bc -l) )); then
    echo "scale=2; ($fg_lum + 0.05) / ($bg_lum + 0.05)" | bc
  else
    echo "scale=2; ($bg_lum + 0.05) / ($fg_lum + 0.05)" | bc
  fi
}

check_contrast() {
  local label=$1
  local fg_hex=$2
  local bg_hex=$3
  local min_ratio=$4
  local level=$5  # AA or AAA
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  ratio=$(calculate_contrast "$fg_hex" "$bg_hex")
  
  # Check if ratio meets requirement
  if (( $(echo "$ratio >= $min_ratio" | bc -l) )); then
    echo -e "${GREEN}✓${NC} $label: ${ratio}:1 (≥${min_ratio}:1 $level) ${BLUE}[$fg_hex on $bg_hex]${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    # Calculate how much it's off
    diff=$(echo "scale=2; $min_ratio - $ratio" | bc)
    echo -e "${RED}✗${NC} $label: ${ratio}:1 (needs ${min_ratio}:1 $level, -${diff}) ${BLUE}[$fg_hex on $bg_hex]${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

check_contrast_warn() {
  local label=$1
  local fg_hex=$2
  local bg_hex=$3
  local min_aa=$4
  local min_aaa=$5
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  ratio=$(calculate_contrast "$fg_hex" "$bg_hex")
  
  if (( $(echo "$ratio >= $min_aaa" | bc -l) )); then
    echo -e "${GREEN}✓${NC} $label: ${ratio}:1 (AAA) ${BLUE}[$fg_hex on $bg_hex]${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  elif (( $(echo "$ratio >= $min_aa" | bc -l) )); then
    echo -e "${YELLOW}⚠${NC} $label: ${ratio}:1 (AA only, not AAA) ${BLUE}[$fg_hex on $bg_hex]${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    diff=$(echo "scale=2; $min_aa - $ratio" | bc)
    echo -e "${RED}✗${NC} $label: ${ratio}:1 (needs ${min_aa}:1, -${diff}) ${BLUE}[$fg_hex on $bg_hex]${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Light Mode - Primary Text (Normal Size)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1, AAA 7:1"
echo ""

# Primary text: text-gray-900 (#111827) on bg-white (#FFFFFF)
check_contrast_warn "Card heading (gray-900 on white)" "#111827" "#FFFFFF" 4.5 7.0

# Value text (3xl, bold): text-gray-900 on bg-white
check_contrast_warn "Metric value (gray-900 on white)" "#111827" "#FFFFFF" 4.5 7.0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Light Mode - Secondary Text"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Secondary text: text-gray-700 (#374151) on bg-white
check_contrast "Label text (gray-700 on white)" "#374151" "#FFFFFF" 4.5 "AA"

# Tertiary text: text-gray-600 (#4B5563) on bg-white
check_contrast "Axis labels (gray-600 on white)" "#4B5563" "#FFFFFF" 4.5 "AA"

# Muted text: text-gray-700 (#374151) on bg-white (FIXED)
check_contrast "Description (gray-700 on white)" "#374151" "#FFFFFF" 4.5 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Light Mode - UI Components (Large Text/Graphics)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 3:1 (UI components)"
echo ""

# Icon backgrounds: bg-gray-50 (#F9FAFB) with colored icons
check_contrast "Blue icon on gray-50" "#2563EB" "#F9FAFB" 3.0 "AA"
check_contrast "Green icon on gray-50" "#166534" "#F9FAFB" 3.0 "AA"
check_contrast "Purple icon on gray-50" "#9333EA" "#F9FAFB" 3.0 "AA"
check_contrast "Yellow icon on gray-50" "#854D0E" "#F9FAFB" 3.0 "AA"

# Borders: border-gray-200 (#E5E7EB) on bg-white
check_contrast "Card border (gray-200 on white)" "#E5E7EB" "#FFFFFF" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Light Mode - Chart Elements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 3:1 (graphics)"
echo ""

# Chart bars: bg-blue-600 (#2563EB) on bg-white (FIXED)
check_contrast "Regular bar on white" "#2563EB" "#FFFFFF" 3.0 "AA"

# Weekend bars: bg-blue-500 (#3B82F6) on bg-white (FIXED)
check_contrast "Weekend bar on white" "#3B82F6" "#FFFFFF" 3.0 "AA"

# Progress bars (FIXED)
check_contrast "Bronze tier bar (amber-800)" "#92400E" "#FFFFFF" 3.0 "AA"
check_contrast "Silver tier bar (gray-700)" "#374151" "#FFFFFF" 3.0 "AA"
check_contrast "Gold tier bar (yellow-800)" "#854D0E" "#FFFFFF" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Light Mode - Badge/Tag Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Positive badge: text-green-900 on bg-green-100 (FIXED)
check_contrast "Positive badge text" "#14532D" "#DCFCE7" 4.5 "AA"

# Negative badge: text-red-900 on bg-red-100 (FIXED)
check_contrast "Negative badge text" "#7F1D1D" "#FEE2E2" 4.5 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Dark Mode - Primary Text (Normal Size)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1, AAA 7:1"
echo ""

# Primary text: text-white (#FFFFFF) on bg-gray-800 (#1F2937)
check_contrast_warn "Card heading (white on gray-800)" "#FFFFFF" "#1F2937" 4.5 7.0

# Value text: text-white on bg-gray-800
check_contrast_warn "Metric value (white on gray-800)" "#FFFFFF" "#1F2937" 4.5 7.0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Dark Mode - Secondary Text"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Secondary text: text-gray-300 (#D1D5DB) on bg-gray-800
check_contrast "Label text (gray-300 on gray-800)" "#D1D5DB" "#1F2937" 4.5 "AA"

# Tertiary text: text-gray-400 (#9CA3AF) on bg-gray-800
check_contrast "Axis labels (gray-400 on gray-800)" "#9CA3AF" "#1F2937" 4.5 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Dark Mode - UI Components (Large Text/Graphics)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 3:1 (UI components)"
echo ""

# Icon backgrounds: bg-gray-700 (#374151) with colored icons
check_contrast "Blue icon on gray-700" "#60A5FA" "#374151" 3.0 "AA"
check_contrast "Green icon on gray-700" "#4ADE80" "#374151" 3.0 "AA"
check_contrast "Purple icon on gray-700" "#E9D5FF" "#374151" 3.0 "AA"
check_contrast "Yellow icon on gray-700" "#FACC15" "#374151" 3.0 "AA"

# Borders: border-gray-700 on bg-gray-800
check_contrast "Card border (gray-700 on gray-800)" "#374151" "#1F2937" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. Dark Mode - Chart Elements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 3:1 (graphics)"
echo ""

# Chart bars: bg-blue-500 (#3B82F6) on bg-gray-800 (FIXED)
check_contrast "Regular bar on gray-800" "#3B82F6" "#1F2937" 3.0 "AA"

# Weekend bars: bg-blue-600 (#2563EB) on bg-gray-800 (FIXED)
check_contrast "Weekend bar on gray-800" "#2563EB" "#1F2937" 3.0 "AA"

# Progress bars on dark mode
check_contrast "Bronze tier bar (amber-500)" "#F59E0B" "#1F2937" 3.0 "AA"
check_contrast "Silver tier bar (gray-500)" "#6B7280" "#1F2937" 3.0 "AA"
check_contrast "Gold tier bar (yellow-400)" "#FACC15" "#1F2937" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. Dark Mode - Badge/Tag Colors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Positive badge: text-green-200 on bg-green-900/30 (FIXED)
check_contrast "Positive badge text (dark)" "#BBF7D0" "#14532D" 4.5 "AA"

# Negative badge: text-red-200 on bg-red-900/30 (FIXED)
check_contrast "Negative badge text (dark)" "#FECACA" "#7F1D1D" 4.5 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "11. Error States - Light Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Error text: text-red-700 on bg-red-50
check_contrast "Error text (red-700 on red-50)" "#B91C1C" "#FEF2F2" 4.5 "AA"

# Error heading: text-red-900 on bg-red-50
check_contrast "Error heading (red-900 on red-50)" "#7F1D1D" "#FEF2F2" 4.5 "AA"

# Error icon: text-red-600 on bg-red-50
check_contrast "Error icon (red-600 on red-50)" "#DC2626" "#FEF2F2" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "12. Error States - Dark Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 4.5:1"
echo ""

# Error text: text-red-300 on bg-red-900/20 (approximated)
check_contrast "Error text (red-300 on red-900/20)" "#FCA5A5" "#450A0A" 4.5 "AA"

# Error heading: text-red-100 on bg-red-900/20
check_contrast "Error heading (red-100 on red-900/20)" "#FEE2E2" "#450A0A" 4.5 "AA"

# Error icon: text-red-400 on bg-red-900/20
check_contrast "Error icon (red-400 on red-900/20)" "#F87171" "#450A0A" 3.0 "AA"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "13. Interactive States"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Standard: WCAG AA 3:1 (focus indicators)"
echo ""

# Focus states should have 3:1 contrast with adjacent colors
check_contrast "Focus ring (blue-400 vs white)" "#60A5FA" "#FFFFFF" 3.0 "AA"
check_contrast "Focus ring (blue-400 vs gray-800)" "#60A5FA" "#1F2937" 3.0 "AA"

# Hover states
check_contrast "Bar hover (blue-600 on white)" "#2563EB" "#FFFFFF" 3.0 "AA"
check_contrast "Bar hover (blue-500 on gray-800)" "#3B82F6" "#1F2937" 3.0 "AA"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Contrast Test Results"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total Checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed (AA+): ${PASSED_CHECKS}${NC}"
echo -e "${YELLOW}Warnings:     ${WARNING_CHECKS}${NC} (AA compliant but not AAA)"
echo -e "${RED}Failed:       ${FAILED_CHECKS}${NC}"
echo ""

# Calculate pass percentage
PASS_PERCENT=$(echo "scale=1; ($PASSED_CHECKS * 100) / $TOTAL_CHECKS" | bc)

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CONTRAST CHECKS PASSED!${NC}"
  echo ""
  echo "WCAG 2.1 Level AA Compliance: ${PASS_PERCENT}%"
  echo ""
  echo "Summary:"
  echo "  • Light mode: All text meets AA standards"
  echo "  • Dark mode: All text meets AA standards"
  echo "  • UI components: All meet 3:1 ratio"
  echo "  • Charts/Graphics: Properly contrasted"
  echo "  • Interactive states: Visible in both modes"
  echo "  • Error states: High visibility maintained"
  echo ""
  
  if [ $WARNING_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}Note: $WARNING_CHECKS items meet AA but not AAA (acceptable)${NC}"
    echo ""
  fi
  
  exit 0
else
  echo -e "${RED}✗ SOME CONTRAST CHECKS FAILED${NC}"
  echo ""
  echo "Failed checks indicate potential accessibility issues."
  echo "Review the specific failures above and adjust colors accordingly."
  echo ""
  echo "Common fixes:"
  echo "  • Darken light text colors"
  echo "  • Lighten dark background colors"
  echo "  • Use color picker tools to verify ratios"
  echo "  • Test with Chrome DevTools > Elements > Accessibility"
  echo ""
  exit 1
fi
