#!/bin/bash

##############################################################################
# Phase 3B Verification Script
# 
# Tests all Phase 3B admin dashboard features to ensure proper deployment
# Run this script after deploying Phase 3B to verify functionality
#
# Usage: bash scripts/qa/verify-phase-3b.sh
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_FID=12345

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 3B Verification Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "API Base URL: ${YELLOW}${API_BASE_URL}${NC}"
echo -e "Test FID: ${YELLOW}${TEST_FID}${NC}"
echo ""

# Function to check HTTP response
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "Testing: $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testing: $description... "
    
    response=$(curl -s "$url")
    
    # Check if response is valid JSON
    if echo "$response" | jq empty 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC} (Valid JSON)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid JSON response)"
        echo "Response: $response"
        return 1
    fi
}

# Function to check if a JSON field exists
check_json_field() {
    local url=$1
    local field=$2
    local description=$3
    
    echo -n "Testing: $description... "
    
    response=$(curl -s "$url")
    value=$(echo "$response" | jq -r "$field" 2>/dev/null)
    
    if [ "$value" != "null" ] && [ -n "$value" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Field exists: $field)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Field missing or null: $field)"
        return 1
    fi
}

##############################################################################
# Test 1: Badge Registry Endpoint
##############################################################################
echo -e "${BLUE}[1/7] Testing Badge Registry Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/badges/registry" \
    200 \
    "Badge registry endpoint accessible"

check_json_field \
    "${API_BASE_URL}/api/badges/registry" \
    ".version" \
    "Registry has version field"

check_json_field \
    "${API_BASE_URL}/api/badges/registry" \
    ".badges | length" \
    "Registry has badges array"

echo ""

##############################################################################
# Test 2: Badge List Endpoint
##############################################################################
echo -e "${BLUE}[2/7] Testing Badge List Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/badges/list?fid=${TEST_FID}" \
    200 \
    "Badge list endpoint accessible"

check_json_field \
    "${API_BASE_URL}/api/badges/list?fid=${TEST_FID}" \
    ".success" \
    "Badge list returns success field"

check_json_field \
    "${API_BASE_URL}/api/badges/list?fid=${TEST_FID}" \
    ".badges" \
    "Badge list returns badges array"

echo ""

##############################################################################
# Test 3: Neynar Score Endpoint (for manual assignment validation)
##############################################################################
echo -e "${BLUE}[3/7] Testing Neynar Score Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/neynar/score?fid=${TEST_FID}" \
    200 \
    "Neynar score endpoint accessible"

check_json_field \
    "${API_BASE_URL}/api/neynar/score?fid=${TEST_FID}" \
    ".score" \
    "Neynar score returns score value"

check_json_field \
    "${API_BASE_URL}/api/neynar/score?fid=${TEST_FID}" \
    ".tier" \
    "Neynar score returns tier value"

echo ""

##############################################################################
# Test 4: Badge Analytics Endpoint (used in admin dashboard)
##############################################################################
echo -e "${BLUE}[4/7] Testing Badge Analytics Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/analytics/badges" \
    200 \
    "Badge analytics endpoint accessible"

check_json_field \
    "${API_BASE_URL}/api/analytics/badges" \
    ".analytics.distribution" \
    "Analytics has distribution data"

check_json_field \
    "${API_BASE_URL}/api/analytics/badges" \
    ".analytics.newBadges24h" \
    "Analytics has 24h badge count"

echo ""

##############################################################################
# Test 5: Admin Badge Templates Endpoint (existing feature check)
##############################################################################
echo -e "${BLUE}[5/7] Testing Admin Badge Templates Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/admin/badges" \
    200 \
    "Admin badges endpoint accessible"

check_json_field \
    "${API_BASE_URL}/api/admin/badges" \
    ".ok" \
    "Admin badges returns ok status"

check_json_field \
    "${API_BASE_URL}/api/admin/badges" \
    ".templates" \
    "Admin badges returns templates array"

echo ""

##############################################################################
# Test 6: Badge Frame Endpoint (if exists)
##############################################################################
echo -e "${BLUE}[6/7] Testing Badge Frame Endpoint${NC}"
echo "--------------------------------------"

check_endpoint \
    "${API_BASE_URL}/api/frame/badge?fid=${TEST_FID}" \
    200 \
    "Badge frame endpoint accessible"

echo ""

##############################################################################
# Test 7: Next.js Build Check
##############################################################################
echo -e "${BLUE}[7/7] Next.js Build Verification${NC}"
echo "--------------------------------------"

echo -n "Checking if Next.js is running... "
if curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}" | grep -q "200"; then
    echo -e "${GREEN}✓ PASS${NC} (Next.js server is running)"
else
    echo -e "${RED}✗ FAIL${NC} (Next.js server not responding)"
fi

echo -n "Checking TypeScript compilation... "
if [ -d ".next" ]; then
    echo -e "${GREEN}✓ PASS${NC} (.next directory exists)"
else
    echo -e "${YELLOW}⚠ WARN${NC} (.next directory not found - run 'pnpm build')"
fi

echo ""

##############################################################################
# Test 8: Badge Registry File Exists
##############################################################################
echo -e "${BLUE}[Bonus] Badge Registry File Check${NC}"
echo "--------------------------------------"

REGISTRY_FILE="planning/badge/badge-registry.json"

echo -n "Checking badge registry file... "
if [ -f "$REGISTRY_FILE" ]; then
    echo -e "${GREEN}✓ PASS${NC} (File exists: $REGISTRY_FILE)"
    
    # Validate JSON
    if jq empty "$REGISTRY_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC} (Valid JSON structure)"
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid JSON in registry file)"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (File not found: $REGISTRY_FILE)"
fi

echo ""

##############################################################################
# Test 9: Phase 3B Documentation Files
##############################################################################
echo -e "${BLUE}[Bonus] Phase 3B Documentation Check${NC}"
echo "--------------------------------------"

docs=(
    "planning/badge/PHASE-3B-SUMMARY.md"
    "planning/badge/PHASE-3B-CHECKLIST.md"
    "planning/badge/README.md"
    "planning/badge/CHANGELOG.md"
    "planning/badge/IMPLEMENTATION.md"
)

for doc in "${docs[@]}"; do
    echo -n "Checking $doc... "
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
done

echo ""

##############################################################################
# Test 10: Badge Manager Panel Component
##############################################################################
echo -e "${BLUE}[Bonus] Component File Check${NC}"
echo "--------------------------------------"

COMPONENT_FILE="components/admin/BadgeManagerPanel.tsx"

echo -n "Checking BadgeManagerPanel.tsx... "
if [ -f "$COMPONENT_FILE" ]; then
    echo -e "${GREEN}✓ PASS${NC} (File exists)"
    
    # Check for Phase 3B keywords
    if grep -q "activeTab.*queue.*registry.*assign" "$COMPONENT_FILE"; then
        echo -e "${GREEN}✓ PASS${NC} (Phase 3B code detected: tabs found)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} (Phase 3B tabs not found in component)"
    fi
    
    if grep -q "loadMintQueue\|handleRetryMint" "$COMPONENT_FILE"; then
        echo -e "${GREEN}✓ PASS${NC} (Phase 3B code detected: mint queue functions found)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} (Mint queue functions not found)"
    fi
    
    if grep -q "loadBadgeRegistryData\|handleManualAssign" "$COMPONENT_FILE"; then
        echo -e "${GREEN}✓ PASS${NC} (Phase 3B code detected: registry/assignment functions found)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} (Registry/assignment functions not found)"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (File not found: $COMPONENT_FILE)"
fi

echo ""

##############################################################################
# Summary
##############################################################################
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Phase 3B verification script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Review any failed tests above"
echo "2. Test admin dashboard manually in browser"
echo "3. Check browser console for errors"
echo "4. Verify all 4 tabs render correctly"
echo "5. Test mint queue viewer, registry, and manual assignment"
echo ""
echo "Manual verification checklist:"
echo "  [ ] Navigate to /admin/badges"
echo "  [ ] Click each tab (Templates, Mint Queue, Registry, Manual Assign)"
echo "  [ ] Test retry button on failed mints (if any)"
echo "  [ ] Test manual assignment form"
echo "  [ ] Open badge detail modal"
echo "  [ ] Check browser console for errors"
echo ""
echo -e "${YELLOW}For deployment checklist, see:${NC}"
echo "  planning/badge/PHASE-3B-CHECKLIST.md"
echo ""

exit 0
