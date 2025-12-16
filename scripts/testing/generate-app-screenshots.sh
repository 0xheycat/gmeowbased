#!/bin/bash
# Generate app store screenshots from actual frame renders
# Updated for December 2025 modular architecture

echo "=== GENERATING APP STORE SCREENSHOTS ==="
echo "Creating 5 key feature screenshots for manifest"
echo ""

# Auto-detect port
PORT=""
for p in 3002 3001 3000 3003; do
  if curl -s "http://localhost:$p" > /dev/null 2>&1; then
    PORT=$p
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "❌ No dev server found. Please run: pnpm dev"
  exit 1
fi

echo "✓ Using dev server on port $PORT"
echo ""

BASE_URL="http://localhost:$PORT/api/frame/image"
DEST_DIR="public/screenshots"
mkdir -p "$DEST_DIR"

# Screenshot 1: GM Streak (NEW modular params)
echo "1/5: Generating GM streak screenshot..."
curl -s "${BASE_URL}/gm?streak=42&lifetimeGMs=150&xp=500&username=heycat" \
  -o "$DEST_DIR/gm-streak.png"

# Screenshot 2: Points (NEW modular endpoint)
echo "2/5: Generating points screenshot..."
curl -s "${BASE_URL}/points?totalXP=1250&rank=42&streakBonus=20&username=heycat" \
  -o "$DEST_DIR/points.png"

# Screenshot 3: Badge (NEW single badge showcase)
echo "3/5: Generating badge screenshot..."
curl -s "${BASE_URL}/badge?id=gm-master&name=GM%20Master&username=heycat&earnedDate=2024-12-01" \
  -o "$DEST_DIR/badge.png"

# Screenshot 4: Leaderboard (modular endpoint)
echo "4/5: Generating leaderboard screenshot..."
curl -s "${BASE_URL}/leaderboards?type=gm&top5=heycat:1000,pilot2:800,user3:600" \
  -o "$DEST_DIR/leaderboard.png"

# Screenshot 5: OnChain Stats (modular endpoint)
echo "5/5: Generating onchain stats screenshot..."
curl -s "${BASE_URL}/onchainstats?totalTx=42&totalValue=1.5&lastActivity=2024-12-12&username=heycat" \
  -o "$DEST_DIR/onchainstats.png"

echo ""
echo "=== SCREENSHOT GENERATION COMPLETE ==="
ls -lh "$DEST_DIR"/*.png | tail -n 5 | awk '{print $9 ": " $5}'

echo ""
echo "✓ All 5 screenshots generated"
echo "✓ Location: public/screenshots/"
echo "✓ Ready for manifest.screenshotUrls"
