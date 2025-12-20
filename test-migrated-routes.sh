#!/bin/bash

# Test script for 12 migrated routes using FID 18139
# Date: December 20, 2025

BASE_URL="http://localhost:3000"
FID=18139
ADDRESS="0x8a3094e44577579d6f41F6214a86C250b7dBDC4e"
GUILD_ID=1

echo "=========================================="
echo "Testing 12 Migrated Routes with FID $FID"
echo "=========================================="
echo ""

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  
  echo "[$name]"
  echo "URL: $url"
  echo "Method: $method"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$url")
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
  else
    # For POST/PUT requests (if needed)
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url")
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
  fi
  
  echo "Status: $http_code"
  
  if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS"
    # Check if response has data
    if echo "$body" | jq -e '.data' > /dev/null 2>&1 || echo "$body" | jq -e '.success' > /dev/null 2>&1; then
      echo "✅ Valid JSON response"
    else
      echo "⚠️  Response structure:"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
  else
    echo "❌ FAILED"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  
  echo ""
  echo "------------------------------------------"
  echo ""
}

# Route 1: Guild Member Stats (requires address parameter)
test_endpoint "1. Guild Member Stats" \
  "$BASE_URL/api/guild/$GUILD_ID/member-stats?address=$ADDRESS"

# Route 2: Admin Notification Stats
echo "⏭️  Skipping admin route (requires auth)"
echo ""
echo "------------------------------------------"
echo ""

# Route 3: Referral Stats (FIXED: Uses [fid] dynamic segment)
test_endpoint "3. Referral Stats" \
  "$BASE_URL/api/referral/$FID/stats"

# Route 4: User Quests (FIXED: Uses [fid] dynamic segment)
test_endpoint "4. User Quests (by FID)" \
  "$BASE_URL/api/user/quests/$FID"

# Route 5: Guild Analytics
test_endpoint "5. Guild Analytics" \
  "$BASE_URL/api/guild/$GUILD_ID/analytics"

# Route 6: Guild Leaderboard
test_endpoint "6. Guild Leaderboard" \
  "$BASE_URL/api/guild/leaderboard"

# Route 7: Guild List
test_endpoint "7. Guild List" \
  "$BASE_URL/api/guild/list?limit=5"

# Route 8: Guild Detail
test_endpoint "8. Guild Detail" \
  "$BASE_URL/api/guild/$GUILD_ID"

# Route 9: Guild Members
test_endpoint "9. Guild Members" \
  "$BASE_URL/api/guild/$GUILD_ID/members"

# Route 10: Guild Treasury
test_endpoint "10. Guild Treasury" \
  "$BASE_URL/api/guild/$GUILD_ID/treasury"

# Route 11: Leaderboard v2
test_endpoint "11. Leaderboard v2" \
  "$BASE_URL/api/leaderboard-v2?limit=5"

# Route 12: User Profile [fid]
test_endpoint "12. User Profile [fid]" \
  "$BASE_URL/api/user/profile/$FID"

echo "=========================================="
echo "Testing Complete"
echo "=========================================="
