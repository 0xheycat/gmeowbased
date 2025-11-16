#!/bin/bash
# GI-13 UI/UX Audit Test Suite
# Tests accessibility, mobile responsiveness, and ARIA compliance

set -e

echo "🎨 GI-13: UI/UX Audit Test Suite"
echo "=============================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# Test 1: Check for ARIA labels in components
echo "Test 1: ARIA labels in frame components"
if grep -r "aria-label" components/ app/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    COUNT=$(grep -r "aria-label" components/ app/ | grep -v node_modules | wc -l)
    echo -e "${GREEN}✅ PASS${NC}: Found $COUNT ARIA labels"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Few or no ARIA labels found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 2: Check for role attributes
echo "Test 2: Role attributes for accessibility"
if grep -r 'role=' components/ app/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    COUNT=$(grep -r 'role=' components/ app/ | grep -v node_modules | wc -l)
    echo -e "${GREEN}✅ PASS${NC}: Found $COUNT role attributes"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Few or no role attributes found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 3: Check for alt text on images
echo "Test 3: Alt text on images"
if grep -r '<img' app/api/frame/route.tsx | grep -v 'alt=' | wc -l | grep -q "^0$"; then
    echo -e "${GREEN}✅ PASS${NC}: All images have alt text"
    PASS=$((PASS + 1))
else
    COUNT=$(grep -r '<img' app/api/frame/route.tsx | grep -v 'alt=' | wc -l || echo "0")
    echo -e "${YELLOW}⚠️ WARN${NC}: $COUNT images without alt text"
    WARN=$((WARN + 1))
fi
echo ""

# Test 4: Check for responsive viewport meta tag
echo "Test 4: Responsive viewport configuration"
if grep -q 'viewport.*width=device-width' app/layout.tsx || grep -q 'viewport.*width=device-width' app/api/frame/route.tsx; then
    echo -e "${GREEN}✅ PASS${NC}: Viewport meta tag configured"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Missing viewport configuration"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 5: Check for mobile-friendly CSS
echo "Test 5: Mobile-responsive CSS classes"
if grep -r "sm:" app/api/frame/route.tsx components/ | wc -l | grep -q "[1-9]"; then
    COUNT=$(grep -r "sm:" app/api/frame/route.tsx components/ | wc -l)
    echo -e "${GREEN}✅ PASS${NC}: Found $COUNT mobile breakpoints"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Few responsive breakpoints found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 6: Check for keyboard navigation support
echo "Test 6: Keyboard navigation support"
if grep -r "onKeyDown\|onKeyPress\|tabIndex" components/ app/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✅ PASS${NC}: Keyboard navigation implemented"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Limited keyboard navigation support"
    WARN=$((WARN + 1))
fi
echo ""

# Test 7: Check for focus management
echo "Test 7: Focus management"
if grep -r "focus:|focus-" components/ app/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    COUNT=$(grep -r "focus:|focus-" components/ app/ | grep -v node_modules | wc -l)
    echo -e "${GREEN}✅ PASS${NC}: Found $COUNT focus styles"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Limited focus state management"
    WARN=$((WARN + 1))
fi
echo ""

# Test 8: Check for color contrast CSS variables
echo "Test 8: Color contrast variables"
if grep -r "var(--.*color.*)" app/api/frame/route.tsx | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✅ PASS${NC}: Using CSS color variables"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Few CSS color variables found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 9: Check for semantic HTML
echo "Test 9: Semantic HTML elements"
SEMANTIC_COUNT=$(grep -r "<header\|<main\|<nav\|<article\|<section\|<footer" app/layout.tsx app/page.tsx | wc -l)
if [ "$SEMANTIC_COUNT" -gt 5 ]; then
    echo -e "${GREEN}✅ PASS${NC}: Found $SEMANTIC_COUNT semantic HTML elements"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Limited semantic HTML usage"
    WARN=$((WARN + 1))
fi
echo ""

# Test 10: Check for loading states/skeleton screens
echo "Test 10: Loading states for UX"
if grep -r "loading\|skeleton\|spinner" components/ app/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    COUNT=$(grep -r "loading\|skeleton\|spinner" components/ app/ | grep -v node_modules | wc -l)
    echo -e "${GREEN}✅ PASS${NC}: Found $COUNT loading state implementations"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: No loading states found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 11: Check for error boundaries
echo "Test 11: Error boundary implementation"
if [ -f "components/ErrorBoundary.tsx" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Error boundary component exists"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: No error boundary component found"
    WARN=$((WARN + 1))
fi
echo ""

# Test 12: Check for safe-area handling (mobile notches)
echo "Test 12: Mobile safe-area handling"
if grep -r "safe-area\|env(safe-area" app/ components/ | grep -v node_modules | wc -l | grep -q "[1-9]"; then
    echo -e "${GREEN}✅ PASS${NC}: Safe-area CSS implemented"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: No safe-area handling found (may cause issues on iPhone X+)"
    WARN=$((WARN + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "Test Results Summary"
echo "=============================================="
echo -e "${GREEN}PASS: $PASS${NC}"
echo -e "${RED}FAIL: $FAIL${NC}"
echo -e "${YELLOW}WARN: $WARN${NC}"
echo ""

TOTAL=$((PASS + FAIL + WARN))
SCORE=$((PASS * 100 / TOTAL))

echo "Overall Score: $SCORE/100"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ GI-13 UI/UX AUDIT PASSED${NC}"
    echo ""
    echo "Note: Some warnings are expected for frame-only routes"
    echo "Main app pages should prioritize accessibility"
    exit 0
else
    echo -e "${RED}❌ GI-13 UI/UX AUDIT FAILED${NC}"
    echo "Critical accessibility issues found"
    exit 1
fi
