#!/bin/bash
# Test badge collection sizing for all scenarios

echo "=== BADGE COLLECTION LAYOUT AUDIT ==="
echo "Testing: 1-6 badges (70px), 7-12 badges (60px), 13-18 badges (50px)"
echo ""

# Create test directory
TEST_DIR="screenshots/badge-collection-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TEST_DIR"

BASE_URL="http://localhost:3000/api/frame/image"

# Test 1: Single badge (70px)
echo "Testing: 1 badge (70px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate&earnedCount=1&eligibleCount=10&username=testuser&badgeXp=100" -o "$TEST_DIR/badges-1.png"

# Test 2: 3 badges (70px)
echo "Testing: 3 badges (70px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary&earnedCount=3&eligibleCount=10&username=testuser&badgeXp=300" -o "$TEST_DIR/badges-3.png"

# Test 3: 6 badges (70px - max for this size)
echo "Testing: 6 badges (70px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate&earnedCount=6&eligibleCount=10&username=testuser&badgeXp=600" -o "$TEST_DIR/badges-6.png"

# Test 4: 7 badges (60px - size reduction trigger)
echo "Testing: 7 badges (60px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner&earnedCount=7&eligibleCount=15&username=testuser&badgeXp=700" -o "$TEST_DIR/badges-7.png"

# Test 5: 9 badges (60px)
echo "Testing: 9 badges (60px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator&earnedCount=9&eligibleCount=15&username=testuser&badgeXp=900" -o "$TEST_DIR/badges-9.png"

# Test 6: 12 badges (60px - max for this size)
echo "Testing: 12 badges (60px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner&earnedCount=12&eligibleCount=20&username=testuser&badgeXp=1200" -o "$TEST_DIR/badges-12.png"

# Test 7: 13 badges (50px - size reduction trigger, no names)
echo "Testing: 13 badges (50px, no names)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary&earnedCount=13&eligibleCount=20&username=testuser&badgeXp=1300" -o "$TEST_DIR/badges-13.png"

# Test 8: 18 badges (50px - max for this size)
echo "Testing: 18 badges (50px)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary&earnedCount=18&eligibleCount=20&username=testuser&badgeXp=1800" -o "$TEST_DIR/badges-18.png"

# Test 9: Empty state (no badges)
echo "Testing: 0 badges (empty state)..."
curl -s "${BASE_URL}?type=badgeCollection&earnedBadges=&earnedCount=0&eligibleCount=10&username=testuser&badgeXp=0" -o "$TEST_DIR/badges-empty.png"

echo ""
echo "=== FILE SIZE ANALYSIS ==="
ls -lh "$TEST_DIR" | tail -n +2 | awk '{print $9 ": " $5}'

echo ""
echo "=== AUDIT RESULTS ==="
echo "✓ Badge collection layout tests completed"
echo "✓ Screenshots saved to: $TEST_DIR"
echo ""
echo "VALIDATION CHECKLIST:"
echo "- [ ] 1-6 badges: 70px cards with names visible"
echo "- [ ] 7-12 badges: 60px cards with names visible"
echo "- [ ] 13-18 badges: 50px cards WITHOUT names (overflow prevention)"
echo "- [ ] Empty state: Placeholder emoji"
echo "- [ ] All sizes: Proper tier colors, grid layout, no overlap"
echo "- [ ] Stats section: EARNED, ELIGIBLE, XP always visible"
echo "- [ ] User info: Username/address always visible"
echo "- [ ] Footer: Branding text always visible"
