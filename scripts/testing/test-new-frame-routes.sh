#!/bin/bash
echo "🧪 Testing New Frame Routes"
echo "============================"
echo ""

BASE_URL="http://localhost:3000"

# Test counter
total=0
passed=0
failed=0

test_route() {
  local name="$1"
  local route="$2"
  total=$((total + 1))
  
  echo -n "Testing $name... "
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" 2>/dev/null || echo "000")
  
  if [[ "$response" == "200" ]]; then
    echo "✅ PASS (HTTP $response)"
    passed=$((passed + 1))
  else
    echo "❌ FAIL (HTTP $response)"
    failed=$((failed + 1))
  fi
}

# Test all new frame routes
echo "📍 Guild Frame Routes:"
test_route "Guild (no params)" "/frame/guild"
test_route "Guild with guildId" "/frame/guild?id=1"
test_route "Guild with fid" "/frame/guild?fid=18139"
test_route "Guild with both" "/frame/guild?id=1&fid=18139"
echo ""

echo "📍 Points Frame Routes:"
test_route "Points (no params)" "/frame/points"
test_route "Points with address" "/frame/points?user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
test_route "Points with fid" "/frame/points?fid=18139"
test_route "Points with chain" "/frame/points?fid=18139&chain=base"
test_route "Points addr+chain" "/frame/points?user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&chain=optimism"
echo ""

echo "📍 Referral Frame Routes:"
test_route "Referral (no params)" "/frame/referral"
test_route "Referral with code" "/frame/referral?code=GMEOW"
test_route "Referral code+fid" "/frame/referral?code=GMEOW&fid=18139"
test_route "Referral with user" "/frame/referral?user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
echo ""

echo "📍 Verify Frame Routes:"
test_route "Verify (no params)" "/frame/verify"
test_route "Verify with fid" "/frame/verify?fid=18139"
test_route "Verify fid+questId" "/frame/verify?fid=18139&questId=1"
test_route "Verify full params" "/frame/verify?fid=18139&questId=1&cast=0x123"
echo ""

echo "📍 Existing Frame Routes (sanity check):"
test_route "GM frame" "/frame/gm"
test_route "GM with fid" "/frame/gm?fid=18139"
test_route "Stats frame" "/frame/stats/18139"
test_route "Stats with chain" "/frame/stats/18139?chain=base"
test_route "Quest frame" "/frame/quest/1"
test_route "Badge frame" "/frame/badge/18139"
test_route "Leaderboard" "/frame/leaderboard"
echo ""

echo "============================"
echo "📊 Test Results:"
echo "   Total:  $total"
echo "   Passed: $passed ✅"
echo "   Failed: $failed ❌"
echo ""

if [[ $failed -eq 0 ]]; then
  echo "🎉 All frame routes working!"
  exit 0
else
  echo "⚠️  Some routes need attention"
  exit 1
fi
