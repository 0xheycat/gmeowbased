#!/bin/bash
# API Testing Script - Testing all endpoints with real user data
# Base URL: https://gmeowhq.art
# Test User: FID 18139, Wallet 0x8a3094e44577579d6f41F6214a86C250b7dBDC4e

BASE_URL="https://gmeowhq.art"
TEST_FID="18139"
TEST_WALLET="0x8a3094e44577579d6f41F6214a86C250b7dBDC4e"

echo "=== API TESTING REPORT ==="
echo "Generated: $(date)"
echo "Base URL: $BASE_URL"
echo "Test FID: $TEST_FID"
echo "Test Wallet: $TEST_WALLET"
echo ""

# Helper function to test API
test_api() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  
  echo "----------------------------------------"
  echo "TEST: $name"
  echo "URL: $url"
  echo "Method: $method"
  echo ""
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$url")
    http_status=$(echo "$response" | grep HTTP_STATUS | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    echo "Status: $http_status"
    
    if [ "$http_status" = "200" ]; then
      echo "✅ SUCCESS"
      echo "Response (first 500 chars):"
      echo "$body" | head -c 500
      echo ""
    elif [ "$http_status" = "404" ]; then
      echo "❌ ERROR: 404 Not Found - Route doesn't exist"
    elif [ "$http_status" = "500" ]; then
      echo "❌ ERROR: 500 Internal Server Error"
      echo "Response:"
      echo "$body"
    else
      echo "⚠️ UNEXPECTED STATUS: $http_status"
      echo "Response:"
      echo "$body" | head -c 300
    fi
  fi
  
  echo ""
}

# Test 1: Health Check
test_api "Health Check" "$BASE_URL/api/health"

# Test 2: Guild List
test_api "Guild List" "$BASE_URL/api/guild/list?limit=10"

# Test 3: Leaderboard
test_api "Leaderboard V2" "$BASE_URL/api/leaderboard-v2?limit=10"

# Test 4: Quests
test_api "Quests List" "$BASE_URL/api/quests?limit=10"

# Test 5: User Profile (if route exists)
test_api "User Profile by FID" "$BASE_URL/api/user/profile/$TEST_FID"

# Test 6: User Wallet Sync  
test_api "User Wallets by FID" "$BASE_URL/api/user/wallets/$TEST_FID"

# Test 7: Notifications
test_api "User Notifications" "$BASE_URL/api/notifications?fid=$TEST_FID"

# Test 8: Guild Details (if guild ID 1 exists)
test_api "Guild Details" "$BASE_URL/api/guild/1"

# Test 9: Quest Details (if quest exists)
test_api "Quest Details" "$BASE_URL/api/quest/1"

# Test 10: Snapshot endpoint
test_api "Partner Snapshot" "$BASE_URL/api/snapshot?address=$TEST_WALLET"

echo "========================================"
echo "TEST COMPLETE"
echo "========================================"
