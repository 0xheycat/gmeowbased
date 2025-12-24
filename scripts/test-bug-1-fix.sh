#!/bin/bash
# BUG #1 Authentication Test Script
# Tests guild update endpoint with various scenarios

API_URL="http://localhost:3000"
GUILD_ID="1"

echo "🔐 BUG #1 - Guild Update Authentication Test"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Function to run test
run_test() {
  local test_name="$1"
  local expected_status="$2"
  local request_data="$3"
  
  echo -e "${YELLOW}Testing: ${test_name}${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X PUT \
    "${API_URL}/api/guild/${GUILD_ID}/update" \
    -H "Content-Type: application/json" \
    -d "${request_data}")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code (expected $expected_status)"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC} - HTTP $http_code (expected $expected_status)"
    ((FAIL++))
  fi
  
  echo "Response: $body"
  echo ""
}

echo "⚠️  Prerequisites:"
echo "1. Dev server running: npm run dev"
echo "2. Guild #${GUILD_ID} exists in database"
echo "3. You know the guild leader address"
echo ""
read -p "Press Enter to continue..."
echo ""

# Get guild info first
echo "📋 Fetching guild info..."
guild_info=$(curl -s "${API_URL}/api/guild/${GUILD_ID}")
echo "$guild_info" | jq -r '.guild | "Guild Name: \(.name)\nLeader: \(.leader)"' 2>/dev/null || echo "$guild_info"
echo ""

read -p "Enter guild leader address (0x...): " LEADER_ADDRESS
echo ""

# TEST 1: Missing address field
run_test \
  "Missing address field (should fail)" \
  "400" \
  '{"name": "Test Update"}'

# TEST 2: Invalid address format
run_test \
  "Invalid address format (should fail)" \
  "400" \
  '{"address": "invalid-address", "name": "Test Update"}'

# TEST 3: Non-leader address
run_test \
  "Non-leader address (should fail)" \
  "403" \
  '{"address": "0x0000000000000000000000000000000000000001", "name": "Malicious Update"}'

# TEST 4: Valid leader address
run_test \
  "Valid leader address (should succeed)" \
  "200" \
  "{\"address\": \"${LEADER_ADDRESS}\", \"description\": \"Test update at $(date)\"}"

# Summary
echo "=============================================="
echo -e "${GREEN}Passed: ${PASS}${NC}"
echo -e "${RED}Failed: ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! BUG #1 fix verified.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Check guild_events table for GUILD_UPDATED event"
  echo "2. Verify guild_metadata table was updated"
  echo "3. Test UI at http://localhost:3000/guild/${GUILD_ID}"
  echo "4. Update audit documentation"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Review the output above.${NC}"
  exit 1
fi
