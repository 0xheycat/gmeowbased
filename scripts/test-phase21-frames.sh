#!/bin/bash
# Phase 2.1 Frame Testing Script
# Tests all 10 frame types with screenshots

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCREENSHOT_DIR="screenshots/phase-2.1-test-${TIMESTAMP}"
mkdir -p "$SCREENSHOT_DIR"

echo "=========================================="
echo "Phase 2.1 Frame Testing"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo "Screenshot dir: $SCREENSHOT_DIR"
echo ""

# Test URLs (localhost)
BASE_URL="http://localhost:3003/api/frame/image"

declare -A FRAME_TESTS=(
    ["gm"]="type=gm&fid=3621&username=dwr&gmCount=150&streak=45&tier=legendary&weekWarriorBadge=true&centuryClubBadge=true"
    ["guild"]="type=guild&guildId=1&guildName=Gmeow%20Elite&memberCount=25&questCount=5&level=8&tier=legendary"
    ["verify"]="type=verify&questId=42&username=dwr&tier=legendary"
    ["quest"]="type=quest&questId=1&questName=Daily%20GM&progress=75&maxProgress=100&rewards=500&tier=epic&expires=2024-12-31"
    ["onchainstats"]="type=onchainstats&fid=3621&txCount=1250&totalValue=10.5&chain=base&tier=legendary&accountAge=365&firstTx=2023-01-01&lastTx=2024-11-22"
    ["leaderboard"]="type=leaderboards&topUsers=dwr,vitalik,balajis,naval,punk6529&topScores=9999,8888,7777,6666,5555"
    ["badge-single"]="type=badge&badgeId=neon-initiate&badgeName=Neon%20Initiate&tier=legendary&username=dwr"
    ["badge-collection"]="type=badge&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate&tier=mythic"
    ["points"]="type=points&fid=3621&availablePoints=5000&lockedPoints=2000&xp=15000&tier=legendary"
    ["referral"]="type=referral&referrerFid=3621&referrerUsername=dwr&referralCount=15&rewardAmount=1500&inviteCode=MEOW42"
)

echo "Testing ${#FRAME_TESTS[@]} frame types..."
echo ""

# Function to test a frame
test_frame() {
    local frame_name=$1
    local params=$2
    local url="${BASE_URL}?${params}"
    local output="${SCREENSHOT_DIR}/${frame_name}.png"
    
    echo "----------------------------------------"
    echo "Testing: $frame_name"
    echo "URL: $url"
    
    # Download image
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$output" "$url")
    
    if [ "$HTTP_CODE" = "200" ]; then
        FILE_SIZE=$(ls -lh "$output" | awk '{print $5}')
        echo "✅ SUCCESS - HTTP $HTTP_CODE - Size: $FILE_SIZE"
        
        # Check image dimensions
        if command -v identify &> /dev/null; then
            DIMENSIONS=$(identify -format "%wx%h" "$output" 2>/dev/null || echo "unknown")
            echo "   Dimensions: $DIMENSIONS"
        fi
    else
        echo "❌ FAILED - HTTP $HTTP_CODE"
        if [ -f "$output" ]; then
            cat "$output" | head -20
        fi
    fi
    echo ""
}

# Test all frames
for frame_name in "${!FRAME_TESTS[@]}"; do
    test_frame "$frame_name" "${FRAME_TESTS[$frame_name]}"
done

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Screenshots saved to: $SCREENSHOT_DIR"
echo ""

# Count successes
SUCCESS_COUNT=$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l)
TOTAL_COUNT=${#FRAME_TESTS[@]}

echo "Results: $SUCCESS_COUNT/$TOTAL_COUNT frames generated"
echo ""

# List all screenshots with sizes
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "Generated screenshots:"
    ls -lh "$SCREENSHOT_DIR"/*.png | awk '{printf "  %-30s %10s\n", $9, $5}'
fi

echo ""
echo "=========================================="
echo "Phase 2.1 Changes Verification"
echo "=========================================="
echo ""
echo "✅ Task 2.1.1: Badge Collection"
echo "   - Check badge-collection.png for actual badge images (not emojis)"
echo "   - Should show 6 badge PNGs with names below"
echo "   - Tier-colored borders visible"
echo ""
echo "✅ Task 2.1.2: Text Readability"
echo "   - Check all frames for improved text contrast"
echo "   - Labels, footers should be clear and readable"
echo "   - No low opacity (0.5-0.6) text except placeholders"
echo ""
echo "✅ Task 2.1.3: Text Shadows"
echo "   - Consistent shadow styling across frames"
echo "   - Display text: glow effect"
echo "   - Numbers: strong shadow"
echo "   - Secondary text: subtle shadow"
echo ""
echo "✅ Task 2.1.4: Color Palette"
echo "   - White text uses SHARED_COLORS.white"
echo "   - Gold accents use SHARED_COLORS.gold"
echo "   - Consistent brand colors"
echo ""
echo "✅ Task 2.1.5: Icon Sizes"
echo "   - Hero icons (60-80px) clear and prominent"
echo "   - Inline icons (18-20px) appropriate size"
echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo "1. Review all screenshots in $SCREENSHOT_DIR"
echo "2. Verify Phase 2.1 changes are visible"
echo "3. Test production frames after Vercel deploy"
echo "4. Compare with baseline screenshots (if available)"
echo ""
