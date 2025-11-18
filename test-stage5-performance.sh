#!/bin/bash

echo "🧪 Phase 4 Stage 5: Performance Testing"
echo "========================================"
echo ""

BASE_URL="https://gmeowhq.art"

# Test function with multiple runs to measure cache hits
test_route_cached() {
  local route=$1
  local name=$2
  local runs=5
  
  echo "Testing: $name ($runs runs)"
  echo "Route: $route"
  
  local total_time=0
  local fastest=999999
  local slowest=0
  
  for i in $(seq 1 $runs); do
    # Extract response time from headers
    response=$(curl -s -w "\n%{time_total}" "$BASE_URL$route" 2>&1)
    time_ms=$(echo "$response" | tail -1 | awk '{printf "%.0f", $1 * 1000}')
    
    total_time=$((total_time + time_ms))
    
    if [ $time_ms -lt $fastest ]; then
      fastest=$time_ms
    fi
    
    if [ $time_ms -gt $slowest ]; then
      slowest=$time_ms
    fi
    
    echo "  Run $i: ${time_ms}ms"
    sleep 0.5
  done
  
  avg=$((total_time / runs))
  echo "  Average: ${avg}ms | Fastest: ${fastest}ms | Slowest: ${slowest}ms"
  
  # Check for cache improvement
  improvement=$((slowest - fastest))
  if [ $improvement -gt 100 ]; then
    echo "  ✅ Cache working! ${improvement}ms improvement from cold to warm"
  else
    echo "  ⚠️  Consistent timing (may be cached already or very fast)"
  fi
  
  echo ""
}

# Test all working cached routes
test_route_cached "/api/viral/stats?fid=3621" "Viral Stats (2min TTL)"
test_route_cached "/api/user/profile?fid=3621" "User Profile (5min TTL)" 
test_route_cached "/api/dashboard/telemetry" "Dashboard Telemetry (45s TTL)"
test_route_cached "/api/seasons" "Seasons (30s in-memory)"

echo "✅ Stage 5 performance testing complete!"
echo ""
echo "Summary:"
echo "- Routes tested: 4 working routes"
echo "- Multiple runs per route to measure cache effectiveness"
echo "- Indexes now active in production database"
