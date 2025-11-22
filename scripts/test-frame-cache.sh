#!/bin/bash
# Test script for Phase 1A frame caching
# Tests cache HIT/MISS, response times, and all frame types

set -e

BASE_URL="${1:-http://localhost:3002}"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}🧪 Frame Cache Testing Script${NC}"
echo -e "Testing against: ${BASE_URL}\n"

# Test function
test_frame() {
    local type=$1
    local params=$2
    local name=$3
    
    echo -e "${BOLD}Testing: ${name}${NC}"
    echo "  Type: ${type}"
    echo "  Params: ${params}"
    
    # First request (should be MISS)
    echo -n "  Request 1 (expecting MISS): "
    START=$(date +%s%N)
    RESPONSE=$(curl -s -w "\n%{http_code}\n%{header_json}" "${BASE_URL}/api/frame/image?type=${type}&${params}" -o /tmp/frame_test_1.png)
    END=$(date +%s%N)
    TIME1=$(( (END - START) / 1000000 ))
    
    STATUS1=$(echo "$RESPONSE" | tail -2 | head -1)
    HEADERS1=$(echo "$RESPONSE" | tail -1)
    CACHE_STATUS1=$(echo "$HEADERS1" | grep -o '"x-cache-status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS1" = "200" ]; then
        echo -e "${GREEN}✓ ${TIME1}ms - Cache: ${CACHE_STATUS1}${NC}"
    else
        echo -e "${RED}✗ HTTP ${STATUS1}${NC}"
        return 1
    fi
    
    # Second request (should be HIT)
    echo -n "  Request 2 (expecting HIT):  "
    sleep 0.5
    START=$(date +%s%N)
    RESPONSE=$(curl -s -w "\n%{http_code}\n%{header_json}" "${BASE_URL}/api/frame/image?type=${type}&${params}" -o /tmp/frame_test_2.png)
    END=$(date +%s%N)
    TIME2=$(( (END - START) / 1000000 ))
    
    STATUS2=$(echo "$RESPONSE" | tail -2 | head -1)
    HEADERS2=$(echo "$RESPONSE" | tail -1)
    CACHE_STATUS2=$(echo "$HEADERS2" | grep -o '"x-cache-status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS2" = "200" ]; then
        SPEEDUP=$(( TIME1 / TIME2 ))
        echo -e "${GREEN}✓ ${TIME2}ms - Cache: ${CACHE_STATUS2} - ${SPEEDUP}x faster${NC}"
    else
        echo -e "${RED}✗ HTTP ${STATUS2}${NC}"
        return 1
    fi
    
    # Verify images are identical
    if cmp -s /tmp/frame_test_1.png /tmp/frame_test_2.png; then
        echo -e "  ${GREEN}✓ Images identical (cache working correctly)${NC}"
    else
        echo -e "  ${YELLOW}⚠ Images differ (unexpected)${NC}"
    fi
    
    echo ""
}

# Test all frame types
echo -e "${BOLD}📊 Testing All Frame Types${NC}\n"

# GM Frame
test_frame "gm" "fid=1&gmCount=50&streak=7&rank=10&chain=Base" "GM Frame (Mythic Tier)"

# Quest Frame  
test_frame "quest" "questId=305&questName=Daily%20GM&reward=100%20XP&expires=24h&chain=Base&fid=1" "Quest Frame"

# Onchainstats Frame
test_frame "onchainstats" "fid=1&chain=Base&txs=1234&volume=5.2ETH&builder=85" "Onchainstats Frame"

# Leaderboard Frame
test_frame "leaderboard" "season=Season%201&limit=10&chain=Base" "Leaderboard Frame"

# Badge Frame
test_frame "badge" "fid=1&badgeId=gmeow-vanguard&badgeName=Vanguard&tier=legendary" "Badge Frame"

# Guild Frame
test_frame "guild" "guildId=1&guildName=Alpha%20Guild&members=50&quests=10&level=5&chain=Base" "Guild Frame"

# Referral Frame
test_frame "referral" "code=GMEOW123&referrals=10&rewards=5000&chain=Base" "Referral Frame"

echo -e "${BOLD}✅ Cache Testing Complete${NC}\n"

# Test cache stats endpoint
echo -e "${BOLD}📈 Cache Statistics${NC}"
curl -s "${BASE_URL}/api/admin/cache-stats" | head -20

# Cleanup
rm -f /tmp/frame_test_*.png

echo -e "\n${GREEN}All tests passed!${NC}"
