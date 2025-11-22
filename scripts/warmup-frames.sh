#!/bin/bash
# Manual warmup script for frame functions
# Usage: ./scripts/warmup-frames.sh [base-url]

BASE_URL="${1:-https://gmeowhq.art}"

echo "🔥 Warming up frame functions..."
echo "Base URL: $BASE_URL"
echo ""

# Array of endpoints with descriptions
# Hybrid strategy: All 5 tiers + FID-independent frames
declare -a endpoints=(
  # GM frames: All 5 tiers
  "gm-mythic|/api/frame?type=gm&fid=1|GM Mythic (FID 1)"
  "gm-legend|/api/frame?type=gm&fid=18139|GM Legendary (FID 18139)"
  "gm-epic|/api/frame?type=gm&fid=5|GM Epic (FID 5)"
  "gm-rare|/api/frame?type=gm&fid=100|GM Rare (FID 100)"
  "gm-common|/api/frame?type=gm&fid=99999|GM Common (FID 99999)"
  # GM images: All 5 tiers
  "gm-img-mythic|/api/frame/image?type=gm&fid=1|GM Image Mythic"
  "gm-img-legend|/api/frame/image?type=gm&fid=18139|GM Image Legendary"
  "gm-img-epic|/api/frame/image?type=gm&fid=5|GM Image Epic"
  "gm-img-rare|/api/frame/image?type=gm&fid=100|GM Image Rare"
  "gm-img-common|/api/frame/image?type=gm&fid=99999|GM Image Common"
  # Onchainstats: 3 key tiers
  "stats-img-mythic|/api/frame/image?type=onchainstats&fid=1|Stats Mythic"
  "stats-img-legend|/api/frame/image?type=onchainstats&fid=18139|Stats Legendary"
  "stats-img-common|/api/frame/image?type=onchainstats&fid=99999|Stats Common"
  # Badge: 3 key tiers
  "badge-img-mythic|/api/frame/image?type=badge&fid=1|Badge Mythic"
  "badge-img-legend|/api/frame/image?type=badge&fid=18139|Badge Legendary"
  "badge-img-common|/api/frame/image?type=badge&fid=99999|Badge Common"
  # Quest
  "quest|/api/frame?type=quest&questId=1|Quest Frame"
  "quest-img|/api/frame/image?type=quest&fid=1|Quest Image"
  # FID-independent (help all users)
  "leaderboard|/api/frame?type=leaderboards|Leaderboard"
  "leaderboard-img|/api/frame/image?type=leaderboards|Leaderboard Image"
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
