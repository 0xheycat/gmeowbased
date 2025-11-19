#!/bin/bash

# Test script for dynamic frame image generation (Stage 5.18)
# Tests all frame types: GM, quest, leaderboard, onchainstats

set -e

echo "🧪 Stage 5.18: Testing Dynamic Frame Images"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:3000"
TIMEOUT=5
PASS_COUNT=0
FAIL_COUNT=0

# Check if server is running
echo "📡 Checking if dev server is running..."
if ! curl -s -f -m 2 "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Dev server not running at $BASE_URL${NC}"
    echo "Please run: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_content_type="$3"
    
    echo -n "Testing $name... "
    
    # Make request and capture response
    response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{content_type}" \
        -m $TIMEOUT "$url" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}FAIL${NC} (curl error)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    # Parse response (last 3 lines are: status, time, content-type)
    body=$(echo "$response" | head -n -3)
    status=$(echo "$response" | tail -n 3 | head -n 1)
    time=$(echo "$response" | tail -n 2 | head -n 1)
    content_type=$(echo "$response" | tail -n 1)
    
    # Check HTTP status
    if [ "$status" != "200" ]; then
        echo -e "${RED}FAIL${NC} (HTTP $status)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    # Check content type
    if [[ ! "$content_type" =~ $expected_content_type ]]; then
        echo -e "${RED}FAIL${NC} (Wrong content-type: $content_type)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    # Check response time
    if (( $(echo "$time > 1.0" | bc -l) )); then
        echo -e "${YELLOW}PASS${NC} (${time}s - slow!)"
    else
        echo -e "${GREEN}PASS${NC} (${time}s)"
    fi
    
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
}

# Test GM frame images
echo "🌅 Testing GM Frame Images"
echo "-------------------------"
test_endpoint "GM basic" \
    "$BASE_URL/api/frame/image?type=gm&user=0x1234567890123456789012345678901234567890&fid=848516&gmCount=42&streak=7&rank=15&chain=base" \
    "image/png"

test_endpoint "GM high stats" \
    "$BASE_URL/api/frame/image?type=gm&user=0xabcdef1234567890abcdef1234567890abcdef12&fid=123456&gmCount=999&streak=100&rank=1&chain=op" \
    "image/png"

test_endpoint "GM minimal" \
    "$BASE_URL/api/frame/image?type=gm&gmCount=0&streak=0&rank=—" \
    "image/png"
echo ""

# Test Quest frame images
echo "🎯 Testing Quest Frame Images"
echo "---------------------------"
test_endpoint "Quest basic" \
    "$BASE_URL/api/frame/image?type=quest&questId=123&questName=Daily+GM&reward=500+XP&expires=24h&progress=60" \
    "image/png"

test_endpoint "Quest completed" \
    "$BASE_URL/api/frame/image?type=quest&questId=456&questName=Epic+Quest&reward=10000+XP&expires=expired&progress=100" \
    "image/png"

test_endpoint "Quest minimal" \
    "$BASE_URL/api/frame/image?type=quest&questId=789" \
    "image/png"
echo ""

# Test Leaderboard frame images
echo "🏆 Testing Leaderboard Frame Images"
echo "---------------------------------"
test_endpoint "Leaderboard current season" \
    "$BASE_URL/api/frame/image?type=leaderboard&season=Season+5&limit=10&chain=base" \
    "image/png"

test_endpoint "Leaderboard all chains" \
    "$BASE_URL/api/frame/image?type=leaderboard&season=Current+Season&limit=5&chain=all&global=1" \
    "image/png"

test_endpoint "Leaderboard minimal" \
    "$BASE_URL/api/frame/image?type=leaderboard" \
    "image/png"
echo ""

# Test Onchainstats frame images (default fallback)
echo "📊 Testing Onchainstats Frame Images"
echo "----------------------------------"
test_endpoint "Onchainstats full" \
    "$BASE_URL/api/frame/image?type=onchainstats&user=0x1234567890123456789012345678901234567890&chain=base&txs=1234&contracts=56&volume=10.5+ETH&balance=2.3+ETH&builder=89&neynar=750" \
    "image/png"

test_endpoint "Onchainstats minimal" \
    "$BASE_URL/api/frame/image?type=onchainstats" \
    "image/png"
echo ""

# Test frame metadata integration
echo "🔗 Testing Frame Metadata Integration"
echo "-----------------------------------"
test_endpoint "Frame metadata (quest)" \
    "$BASE_URL/api/frame?type=quest&questId=123&chain=base" \
    "text/html"

test_endpoint "Frame metadata (leaderboard)" \
    "$BASE_URL/api/frame?type=leaderboard&chain=base&limit=10" \
    "text/html"

test_endpoint "Frame metadata (GM)" \
    "$BASE_URL/api/frame?type=gm&user=0x1234567890123456789012345678901234567890&fid=848516" \
    "text/html"
echo ""

# Test chain-specific styling
echo "🎨 Testing Chain-Specific Styling"
echo "-------------------------------"
for chain in base op celo unichain ink; do
    test_endpoint "Chain: $chain" \
        "$BASE_URL/api/frame/image?type=gm&gmCount=100&chain=$chain" \
        "image/png"
done
echo ""

# Summary
echo "============================================"
echo "📊 Test Results Summary"
echo "============================================"
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "✅ Dynamic frame images are working correctly"
    echo "✅ All frame types render successfully"
    echo "✅ Response times are acceptable"
    echo ""
    echo "Next steps:"
    echo "  1. Test in Warpcast frame validator"
    echo "  2. Verify 1200x800 dimensions"
    echo "  3. Deploy to production"
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    echo ""
    echo "Please review the failures above and fix any issues."
    exit 1
fi
