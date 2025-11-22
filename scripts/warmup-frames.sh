#!/bin/bash
# Manual warmup script for frame functions
# Usage: ./scripts/warmup-frames.sh [base-url]

BASE_URL="${1:-https://gmeowhq.art}"

echo "🔥 Warming up frame functions..."
echo "Base URL: $BASE_URL"
echo ""

# Array of endpoints with descriptions
declare -a endpoints=(
  "gm|/api/frame?type=gm&fid=1|GM Frame Metadata"
  "quest|/api/frame?type=quest&questId=1|Quest Frame"
  "stats|/api/frame?type=onchainstats&fid=18139|Onchain Stats"
  "badge|/api/frame?type=badge&fid=1|Badge Frame"
  "leaderboard|/api/frame?type=leaderboards|Leaderboard"
  "gm-img|/api/frame/image?type=gm&fid=1|GM Image"
  "quest-img|/api/frame/image?type=quest&fid=1|Quest Image"
  "stats-img|/api/frame/image?type=onchainstats&fid=18139|Stats Image"
  "badge-img|/api/frame/image?type=badge&fid=1|Badge Image"
)

total=${#endpoints[@]}
success=0
failed=0

for endpoint in "${endpoints[@]}"; do
  IFS='|' read -r name path description <<< "$endpoint"
  url="${BASE_URL}${path}"
  
  printf "%-15s" "$description"
  
  # Make request and capture status code + timing
  response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$url" 2>&1)
  
  if [ $? -eq 0 ]; then
    status_code=$(echo $response | cut -d',' -f1)
    time_total=$(echo $response | cut -d',' -f2)
    
    if [ "$status_code" = "200" ]; then
      printf " ✅ %s (%ss)\n" "$status_code" "$time_total"
      ((success++))
    else
      printf " ⚠️  %s (%ss)\n" "$status_code" "$time_total"
      ((failed++))
    fi
  else
    printf " ❌ Failed to connect\n"
    ((failed++))
  fi
  
  # Small delay between requests
  sleep 0.3
done

echo ""
echo "📊 Warmup Summary"
echo "  Total:   $total endpoints"
echo "  Success: $success"
echo "  Failed:  $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "✅ All endpoints warmed up successfully"
  exit 0
else
  echo "⚠️  Some endpoints failed"
  exit 1
fi
