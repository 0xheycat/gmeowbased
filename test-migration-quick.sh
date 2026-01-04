#!/bin/bash

# Quick Migration API Test - Phases 1-5
# Tests all 12 migrated pages

BASE_URL="http://localhost:3000"
FID="18139"  # Your FID or bot FID

echo "🧪 Quick Migration API Test (FID: $FID)"
echo "========================================="
echo ""

# Function to test endpoint quickly
test() {
    local name="$1"
    local endpoint="$2"
    echo -n "  $name... "
    
    response=$(curl -s -w "\n%{http_code}|%{time_total}" --max-time 15 "$BASE_URL$endpoint" 2>&1)
    status=$(echo "$response" | tail -1 | cut -d'|' -f1)
    time=$(echo "$response" | tail -1 | cut -d'|' -f2)
    time_ms=$(echo "$time * 1000" | bc 2>/dev/null | cut -d'.' -f1)
    
    if [ "$status" = "200" ]; then
        echo "✅ PASS ($status, ${time_ms}ms)"
    elif [ "$status" = "401" ]; then
        echo "⚠️  AUTH ($status - needs wallet connection)"
    elif [ "$status" = "404" ]; then
        echo "⚠️  404 (data not found - expected for new FID)"
    else
        echo "❌ FAIL ($status, ${time_ms}ms)"
    fi
}

# Check server
echo "Checking server..."
if curl -s --max-time 3 "$BASE_URL" > /dev/null 2>&1; then
    echo "✅ Dev server running"
else
    echo "❌ Dev server not running - Please run: pnpm dev"
    exit 1
fi
echo ""

# Phase 1-2: Leaderboard, Dashboard, Profile
echo "📊 Phase 1-2: Leaderboard, Dashboard, Profile"
test "Leaderboard API" "/api/leaderboard-v2"
test "Leaderboard Stats" "/api/leaderboard-v2/stats"
test "Leaderboard Badges" "/api/leaderboard-v2/badges"
test "Activity Feed" "/api/dashboard/activity-feed"
test "User Profile (FID $FID)" "/api/user/profile/$FID"
test "User Activity (FID $FID)" "/api/user/activity/$FID"
test "User Badges (FID $FID)" "/api/user/badges/$FID"
echo ""

# Phase 3: Guilds
echo "🏰 Phase 3: Guild Pages"
test "Guild List" "/api/guild/list"
test "Guild Leaderboard" "/api/guild/leaderboard"
test "Guild Detail (ID 1)" "/api/guild/1"
test "Guild Members (ID 1)" "/api/guild/1/members"
test "Guild Analytics (ID 1)" "/api/guild/1/analytics"
test "Guild Treasury (ID 1)" "/api/guild/1/treasury"
echo ""

# Phase 4: Quests
echo "🎯 Phase 4: Quest Pages"
test "Quest List" "/api/quests"
test "User Quests (FID $FID)" "/api/user/quests/$FID"
test "Unclaimed Quests" "/api/quests/unclaimed"
echo ""

# Phase 5: Referrals
echo "🔗 Phase 5: Referral Pages"
test "Referral Leaderboard" "/api/referral/leaderboard"
test "Referral Stats (FID $FID)" "/api/referral/$FID/stats"
test "Referral Analytics (FID $FID)" "/api/referral/$FID/analytics"
test "Referral Activity (FID $FID)" "/api/referral/activity/$FID"
echo ""

echo "========================================="
echo "✅ Quick test complete!"
echo ""
echo "Browser Testing URLs (FID: $FID):"
echo "  http://localhost:3000/leaderboard"
echo "  http://localhost:3000/dashboard"
echo "  http://localhost:3000/profile/$FID"
echo "  http://localhost:3000/guilds"
echo "  http://localhost:3000/quests"
echo "  http://localhost:3000/referral"
