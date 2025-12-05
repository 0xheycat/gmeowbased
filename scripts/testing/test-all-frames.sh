#!/bin/bash

# Test All Frames - Comprehensive Screenshot Generation
# Date: 2025-11-23
# Purpose: Generate screenshots of all 10 frame types with various states

BASE_URL="http://localhost:3000"
OUTPUT_DIR="screenshots/comprehensive-test-$(date +%Y%m%d-%H%M%S)"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🎯 Testing All Frames - Comprehensive Test"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Function to download and save image
save_frame() {
  local name=$1
  local url=$2
  local output="${OUTPUT_DIR}/${name}.png"
  
  echo "📸 Testing: $name"
  echo "   URL: $url"
  
  curl -s "$url" -o "$output"
  
  if [ -f "$output" ]; then
    local size=$(du -h "$output" | cut -f1)
    echo "   ✅ Saved: $output ($size)"
  else
    echo "   ❌ Failed: $output"
  fi
  echo ""
}

# 1. GM Frame Tests
echo "================================"
echo "1. GM FRAME TESTS"
echo "================================"

save_frame "gm-basic" \
  "${BASE_URL}/api/frame/image?type=gm&user=0x123&gmCount=5&streak=3&rank=42&chain=Base"

save_frame "gm-week-warrior" \
  "${BASE_URL}/api/frame/image?type=gm&user=0x123&gmCount=25&streak=14&rank=10&chain=Base"

save_frame "gm-legendary" \
  "${BASE_URL}/api/frame/image?type=gm&user=0x123&gmCount=150&streak=35&rank=1&chain=Base"

save_frame "gm-century-club" \
  "${BASE_URL}/api/frame/image?type=gm&user=0x123&gmCount=125&streak=25&rank=5&chain=Base"

# 2. Verify Frame Tests
echo "================================"
echo "2. VERIFY FRAME TESTS"
echo "================================"

save_frame "verify-success" \
  "${BASE_URL}/api/frame/image?type=verify&success=true&username=testuser&fid=12345"

save_frame "verify-already" \
  "${BASE_URL}/api/frame/image?type=verify&success=already&username=testuser&fid=12345"

save_frame "verify-error" \
  "${BASE_URL}/api/frame/image?type=verify&success=false&error=Database%20error"

# 3. Guild Frame Tests
echo "================================"
echo "3. GUILD FRAME TESTS"
echo "================================"

save_frame "guild-basic" \
  "${BASE_URL}/api/frame/image?type=guild&guildName=Test%20Guild&members=42&level=5&xp=1500&totalXp=2000"

save_frame "guild-high-level" \
  "${BASE_URL}/api/frame/image?type=guild&guildName=Elite%20Guild&members=150&level=25&xp=8500&totalXp=10000"

# 4. Quest Frame Tests
echo "================================"
echo "4. QUEST FRAME TESTS"
echo "================================"

save_frame "quest-active" \
  "${BASE_URL}/api/frame/image?type=quest&questName=Daily%20Challenge&description=Complete%205%20GMs&status=active&questId=1&progress=3&total=5"

save_frame "quest-completed" \
  "${BASE_URL}/api/frame/image?type=quest&questName=Weekly%20Warrior&description=7%20day%20streak&status=completed&questId=2&progress=7&total=7"

save_frame "quest-expired" \
  "${BASE_URL}/api/frame/image?type=quest&questName=Old%20Quest&description=Expired%20quest&status=expired&questId=3"

# 5. Badge Collection Frame Tests
echo "================================"
echo "5. BADGE COLLECTION TESTS"
echo "================================"

save_frame "badges-empty" \
  "${BASE_URL}/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges="

save_frame "badges-one" \
  "${BASE_URL}/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate"

save_frame "badges-three" \
  "${BASE_URL}/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner,signal-luminary"

save_frame "badges-six" \
  "${BASE_URL}/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate"

save_frame "badges-nine" \
  "${BASE_URL}/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator"

# 6. Badge Share Frame Tests
echo "================================"
echo "6. BADGE SHARE TESTS"
echo "================================"

save_frame "badge-share-common" \
  "${BASE_URL}/api/frame/badgeShare/image?badgeId=neon-initiate&username=testuser&fid=12345"

save_frame "badge-share-rare" \
  "${BASE_URL}/api/frame/badgeShare/image?badgeId=pulse-runner&username=testuser&fid=12345"

save_frame "badge-share-epic" \
  "${BASE_URL}/api/frame/badgeShare/image?badgeId=signal-luminary&username=testuser&fid=12345"

save_frame "badge-share-legendary" \
  "${BASE_URL}/api/frame/badgeShare/image?badgeId=warp-navigator&username=testuser&fid=12345"

save_frame "badge-share-mythic" \
  "${BASE_URL}/api/frame/badgeShare/image?badgeId=gmeow-vanguard&username=testuser&fid=12345"

# 7. OnchainStats Frame Tests
echo "================================"
echo "7. ONCHAINSTATS TESTS"
echo "================================"

save_frame "onchainstats-basic" \
  "${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&txs=50&contracts=10&volume=1.5%20ETH&balance=0.5%20ETH&age=6%20months&firstTx=Jan%202024&lastTx=Nov%202024&builder=75&neynar=850"

save_frame "onchainstats-whale" \
  "${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&txs=5000&contracts=250&volume=500%20ETH&balance=50%20ETH&age=3%20years&firstTx=Jan%202021&lastTx=Nov%202024&builder=95&neynar=999"

save_frame "onchainstats-minimal" \
  "${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&txs=5&contracts=2&volume=0.01%20ETH&balance=0.001%20ETH&age=1%20month&firstTx=Oct%202024&lastTx=Nov%202024&builder=10&neynar=100"

# 8. Leaderboard Frame Tests
echo "================================"
echo "8. LEADERBOARD TESTS"
echo "================================"

save_frame "leaderboard-top10" \
  "${BASE_URL}/api/frame/image?type=leaderboard&season=1&entries=1.%20Alice%20-%2050%20GMs%7C2.%20Bob%20-%2048%20GMs%7C3.%20Charlie%20-%2045%20GMs%7C4.%20Dave%20-%2042%20GMs%7C5.%20Eve%20-%2040%20GMs%7C6.%20Frank%20-%2038%20GMs%7C7.%20Grace%20-%2035%20GMs%7C8.%20Henry%20-%2032%20GMs%7C9.%20Ivy%20-%2030%20GMs%7C10.%20Jack%20-%2028%20GMs&total=150"

save_frame "leaderboard-top5" \
  "${BASE_URL}/api/frame/image?type=leaderboard&season=2&entries=1.%20User1%20-%20100%20GMs%7C2.%20User2%20-%2095%20GMs%7C3.%20User3%20-%2090%20GMs%7C4.%20User4%20-%2085%20GMs%7C5.%20User5%20-%2080%20GMs&total=500"

# 9. Agent Frame Tests
echo "================================"
echo "9. AGENT TESTS"
echo "================================"

save_frame "agent-character" \
  "${BASE_URL}/api/frame/image?type=agent&name=Gmeow%20Agent&description=Your%20AI%20companion&personality=Friendly%20and%20helpful&status=active"

# 10. Profile Frame Tests
echo "================================"
echo "10. PROFILE TESTS"
echo "================================"

save_frame "profile-basic" \
  "${BASE_URL}/api/frame/image?type=profile&username=testuser&fid=12345&bio=Web3%20enthusiast&gmCount=25&streak=7&badges=5&rank=42"

save_frame "profile-advanced" \
  "${BASE_URL}/api/frame/image?type=profile&username=cryptowizard&fid=999&bio=Building%20the%20future&gmCount=150&streak=35&badges=9&rank=1"

# Summary
echo "================================"
echo "✅ TEST COMPLETE"
echo "================================"
echo ""
echo "📊 Summary:"
echo "   Total frames tested: $(ls -1 "$OUTPUT_DIR" | wc -l)"
echo "   Output directory: $OUTPUT_DIR"
echo ""
echo "🔍 Review screenshots:"
echo "   cd $OUTPUT_DIR && ls -lh"
echo ""
echo "📸 Open all images:"
echo "   xdg-open $OUTPUT_DIR/*.png"
