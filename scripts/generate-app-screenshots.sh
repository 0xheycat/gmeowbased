#!/bin/bash
# Generate app store screenshots from actual frame renders

echo "=== GENERATING APP STORE SCREENSHOTS ==="
echo "Creating 5 key feature screenshots for manifest"
echo ""

BASE_URL="http://localhost:3000/api/frame/image"
DEST_DIR="public/screenshots"

# Screenshot 1: GM Streak (show streak milestone)
echo "1/5: Generating GM streak screenshot..."
curl -s "${BASE_URL}?type=gm&fid=1568&username=heycat&streak=42&gmCount=150" \
  -o "$DEST_DIR/gm-streak.png"

# Screenshot 2: Leaderboard (show top rankings)
echo "2/5: Generating leaderboard screenshot..."
curl -s "${BASE_URL}?type=leaderboards&top5=fid1%3A1000%2Cfid2%3A800%2Cfid3%3A600%2Cfid4%3A400%2Cfid5%3A200" \
  -o "$DEST_DIR/leaderboard.png"

# Screenshot 3: Badge Collection (show earned badges)
echo "3/5: Generating badge collection screenshot..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard&earnedCount=5&eligibleCount=10&username=player&badgeXp=500" \
  -o "$DEST_DIR/badges.png"

# Screenshot 4: Guild (show guild stats)
echo "4/5: Generating guild screenshot..."
curl -s "${BASE_URL}?type=guild&guildName=Gmeow%20Warriors&members=25&totalGms=1500&avgStreak=12&username=leader&fid=1568" \
  -o "$DEST_DIR/guild.png"

# Screenshot 5: Quest (show active quest)
echo "5/5: Generating quest screenshot..."
curl -s "${BASE_URL}?type=quest&questName=Daily%20GM%20Ritual&description=Say%20GM%20for%207%20days%20straight&reward=100%20XP&progress=5&target=7&status=active&username=adventurer&fid=1568" \
  -o "$DEST_DIR/quest.png"

echo ""
echo "=== SCREENSHOT GENERATION COMPLETE ==="
ls -lh "$DEST_DIR"/*.png | tail -n 5 | awk '{print $9 ": " $5}'

echo ""
echo "✓ All 5 screenshots generated"
echo "✓ Location: public/screenshots/"
echo "✓ Ready for manifest.screenshotUrls"
