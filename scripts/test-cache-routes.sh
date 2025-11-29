#!/bin/bash

echo "🧪 Testing Phase 4 Cached Routes in Production"
echo "=============================================="
echo ""

BASE_URL="https://gmeowhq.art"

# Test function
test_route() {
  local route=$1
  local name=$2
  echo "Testing: $name"
  echo "Route: $route"
  
  # Make request and capture headers
  response=$(curl -s -I -w "\nHTTP_CODE:%{http_code}\n" "$BASE_URL$route" 2>&1)
  
  # Extract key headers
  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
  cache_control=$(echo "$response" | grep -i "cache-control:" | head -1)
  x_response_time=$(echo "$response" | grep -i "x-response-time:" | head -1)
  
  echo "  Status: $http_code"
  echo "  $cache_control"
  echo "  $x_response_time"
  echo ""
}

# Test all cached routes
test_route "/api/badges/templates" "Badge Templates (5min cache)"
test_route "/api/viral/stats?fid=3621" "Viral Stats (2min cache)"
test_route "/api/viral/leaderboard?chain=base&limit=10" "Viral Leaderboard (3min cache)"
test_route "/api/user/profile?fid=3621" "User Profile (5min cache)"
test_route "/api/dashboard/telemetry" "Dashboard Telemetry (45s cache)"
test_route "/api/seasons" "Seasons (30s cache)"

echo "✅ Cache route testing complete!"
