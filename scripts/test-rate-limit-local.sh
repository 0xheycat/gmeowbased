#!/bin/bash

echo "🧪 Testing Rate Limiting on Local Dev Server"
echo "=============================================="
echo ""

# Wait for server to be ready
echo "⏳ Waiting for dev server to be ready..."
sleep 3

# Test with 65 requests (limit is 60/min)
echo "📊 Making 65 rapid requests to /api/leaderboard..."
echo "Expected: First 60 should succeed (200), requests 61-65 should fail (429)"
echo ""

success_count=0
rate_limit_count=0

for i in {1..65}; do
  response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3000/api/leaderboard)
  
  if [ "$response" = "200" ]; then
    success_count=$((success_count + 1))
    if [ $((i % 10)) -eq 0 ]; then
      echo "✅ Request $i: 200 OK ($success_count successful so far)"
    fi
  elif [ "$response" = "429" ]; then
    rate_limit_count=$((rate_limit_count + 1))
    echo "🚫 Request $i: 429 Too Many Requests (RATE LIMITED!)"
  else
    echo "⚠️  Request $i: $response (unexpected)"
  fi
done

echo ""
echo "=============================================="
echo "📊 RESULTS:"
echo "   Total requests: 65"
echo "   Successful (200): $success_count"
echo "   Rate limited (429): $rate_limit_count"
echo ""

if [ $rate_limit_count -gt 0 ]; then
  echo "✅ SUCCESS: Rate limiting is WORKING locally!"
  echo "   Rate limit triggered after $success_count requests"
else
  echo "❌ FAILURE: Rate limiting is NOT WORKING!"
  echo "   All 65 requests succeeded (expected 60 max)"
  echo ""
  echo "🔍 Troubleshooting:"
  echo "   1. Check .env.local has UPSTASH_REDIS_REST_URL"
  echo "   2. Check .env.local has UPSTASH_REDIS_REST_TOKEN"
  echo "   3. Verify Upstash Redis dashboard shows connections"
  echo "   4. Check lib/rate-limit.ts is being used in routes"
fi
