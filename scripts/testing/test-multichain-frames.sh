#!/bin/bash
echo "🌐 Testing Multichain OnchainStats Frame Support"
echo "================================================"
echo ""

BASE_URL="http://localhost:3000"
FID=18139

# All 15 chains supported by OnchainStats
CHAINS=("base" "celo" "optimism" "ethereum" "arbitrum" "avax" "berachain" "bnb" "fraxtal" "katana" "soneium" "taiko" "unichain" "ink" "hyperevm")

total=0
passed=0
failed=0

for chain in "${CHAINS[@]}"; do
  total=$((total + 1))
  route="/frame/stats/$FID?chain=$chain"
  
  echo -n "Testing $chain chain... "
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" 2>/dev/null || echo "000")
  
  if [[ "$response" == "200" ]]; then
    echo "✅ PASS (HTTP $response)"
    passed=$((passed + 1))
  else
    echo "❌ FAIL (HTTP $response)"
    failed=$((failed + 1))
  fi
done

echo ""
echo "================================================"
echo "📊 Multichain Test Results:"
echo "   Total chains:  $total"
echo "   Passed: $passed ✅"
echo "   Failed: $failed ❌"
echo ""

if [[ $failed -eq 0 ]]; then
  echo "🎉 All 15 chains supported in onchainstats frames!"
  exit 0
else
  echo "⚠️  Some chains failed validation"
  exit 1
fi
