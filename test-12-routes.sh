#!/bin/bash
# Test Script for 12 Migrated Routes
# Test User: FID 18139, Address 0x8a3094e44577579d6f41F6214a86C250b7dBDC4e
# Date: December 20, 2025

set -e

FID=18139
ADDRESS="0x8a3094e44577579d6f41F6214a86C250b7dBDC4e"
BASE_URL="http://localhost:3000"

echo "========================================="
echo "Testing 12 Migrated Routes"
echo "FID: $FID"
echo "Address: $ADDRESS"
echo "========================================="
echo ""

# Function to test a route
test_route() {
    local route_name="$1"
    local url="$2"
    local method="${3:-GET}"
    
    echo "[$route_name]"
    echo "URL: $url"
    echo "Method: $method"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$url" 2>&1)
        http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
        body=$(echo "$response" | sed '/HTTP_CODE:/d')
        
        echo "Status: $http_code"
        
        if [ "$http_code" = "200" ]; then
            echo "✅ SUCCESS"
            echo "$body" | jq '.' 2>/dev/null | head -20 || echo "$body" | head -20
        else
            echo "❌ FAILED"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
    fi
    
    echo ""
    echo "---"
    echo ""
}

echo "=== 1. Guild Member Stats ===" 
test_route "Guild Member Stats" "$BASE_URL/api/guild/1/member-stats?address=$ADDRESS"

echo "=== 2. Admin Notification Stats ===" 
test_route "Admin Notification Stats" "$BASE_URL/api/admin/notification-stats"

echo "=== 3. Referral Stats ===" 
test_route "Referral Stats" "$BASE_URL/api/referral/$FID/stats"

echo "=== 4. User Quests ===" 
test_route "User Quests" "$BASE_URL/api/user/quests/$FID"

echo "=== 5. Guild Analytics ===" 
test_route "Guild Analytics" "$BASE_URL/api/guild/1/analytics"

echo "=== 6. Guild Leaderboard ===" 
test_route "Guild Leaderboard" "$BASE_URL/api/guild/leaderboard"

echo "=== 7. Guild List ===" 
test_route "Guild List" "$BASE_URL/api/guild/list"

echo "=== 8. Guild Detail ===" 
test_route "Guild Detail" "$BASE_URL/api/guild/1"

echo "=== 9. Guild Members ===" 
test_route "Guild Members" "$BASE_URL/api/guild/1/members"

echo "=== 10. Guild Treasury ===" 
test_route "Guild Treasury" "$BASE_URL/api/guild/1/treasury"

echo "=== 11. Leaderboard V2 ===" 
test_route "Leaderboard V2" "$BASE_URL/api/leaderboard-v2"

echo "=== 12. User Profile ===" 
test_route "User Profile" "$BASE_URL/api/user/profile/$FID"

echo "========================================="
echo "Test Complete"
echo "========================================="
