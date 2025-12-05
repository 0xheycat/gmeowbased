#!/bin/bash
# Test Badge Collection with Various Badge Counts
# Tests: 1, 3, 6, 9, 12, 15, 18 badges to verify overflow logic

OUTPUT_DIR="screenshots/badge-overflow-test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "🎯 Testing Badge Collection Overflow Logic"
echo "📁 Output: $OUTPUT_DIR"
echo ""

# Base badges to cycle through
BADGES="neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,cyber-pioneer"

# Test 1: Single badge (70px cards with names)
echo "📸 Test 1/7: 1 badge (70px + names)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate" \
  -o "$OUTPUT_DIR/badges-01.png"
ls -lh "$OUTPUT_DIR/badges-01.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 2: 3 badges (70px cards with names)
echo "📸 Test 2/7: 3 badges (70px + names)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner,signal-luminary" \
  -o "$OUTPUT_DIR/badges-03.png"
ls -lh "$OUTPUT_DIR/badges-03.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 3: 6 badges (70px cards with names - max for large size)
echo "📸 Test 3/7: 6 badges (70px + names - max large)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=$BADGES" \
  -o "$OUTPUT_DIR/badges-06.png"
ls -lh "$OUTPUT_DIR/badges-06.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 4: 9 badges (60px cards with names - medium size)
echo "📸 Test 4/7: 9 badges (60px + names)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=$BADGES,neon-initiate,pulse-runner,signal-luminary" \
  -o "$OUTPUT_DIR/badges-09.png"
ls -lh "$OUTPUT_DIR/badges-09.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 5: 12 badges (60px cards with names - max for medium size)
echo "📸 Test 5/7: 12 badges (60px + names - max medium)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=$BADGES,$BADGES" \
  -o "$OUTPUT_DIR/badges-12.png"
ls -lh "$OUTPUT_DIR/badges-12.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 6: 15 badges (50px cards, NO names - compact mode)
echo "📸 Test 6/7: 15 badges (50px, NO names - compact)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=$BADGES,$BADGES,neon-initiate,pulse-runner,signal-luminary" \
  -o "$OUTPUT_DIR/badges-15.png"
ls -lh "$OUTPUT_DIR/badges-15.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test 7: 18 badges (50px cards, NO names - max capacity)
echo "📸 Test 7/7: 18 badges (50px, NO names - max capacity)"
curl -s "http://localhost:3000/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=$BADGES,$BADGES,$BADGES" \
  -o "$OUTPUT_DIR/badges-18.png"
ls -lh "$OUTPUT_DIR/badges-18.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

# Test badge share with tier letters (font fix verification)
echo ""
echo "📸 Bonus: Badge Share (tier letter font check)"
curl -s "http://localhost:3000/api/frame/badgeShare/image?badgeId=signal-luminary&username=testuser&fid=12345" \
  -o "$OUTPUT_DIR/badge-share-tier-font.png"
ls -lh "$OUTPUT_DIR/badge-share-tier-font.png" | awk '{print "   ✅ Saved:", $9, "("$5")"}'

echo ""
echo "================================"
echo "✅ OVERFLOW TEST COMPLETE"
echo "================================"
echo "📊 Summary:"
echo "   1 badge:  70px + names (large)"
echo "   3 badges: 70px + names (large)"
echo "   6 badges: 70px + names (large, max)"
echo "   9 badges: 60px + names (medium)"
echo "   12 badges: 60px + names (medium, max)"
echo "   15 badges: 50px, NO names (compact)"
echo "   18 badges: 50px, NO names (compact, max)"
echo ""
echo "📁 View results:"
echo "   cd $OUTPUT_DIR && ls -lh"
echo ""
echo "🖼️ Open all:"
echo "   xdg-open $OUTPUT_DIR/*.png"
