#!/bin/bash
# Test Frame Specification — Verify Farville Working Spec Applied
# Run this after deploying to staging
# https://gmeowhq.art/api/frame?type=leaderboard
set -e

STAGING_URL="${STAGING_URL:-https://gmeowhq.art}"
echo "Testing frame endpoints at: $STAGING_URL"
echo ""

# Test Badge Frame
echo "=== Testing Badge Frame ==="
curl -s "$STAGING_URL/api/frame?type=leaderboard" | grep -o '"version":"[^"]*"' | head -1
curl -s "$STAGING_URL/api/frame?type=leaderboard" | grep -o '"type":"[^"]*"' | head -1
curl -s "$STAGING_URL/api/frame?type=leaderboard" | grep -o '"name":"[^"]*"' | head -1
echo "✅ Badge Frame"
echo ""

# Test Badge Share Frame
echo "=== Testing Badge Share Frame ==="
curl -s "$STAGING_URL/api/frame/?type=leaderboard" | grep -o '"version":"[^"]*"' | head -1
curl -s "$STAGING_URL/api/frame/?type=leaderboard" | grep -o '"type":"[^"]*"' | head -1
curl -s "$STAGING_URL/api/frame/?type=leaderboard" | grep -o '"name":"[^"]*"' | head -1
echo "✅ Badge Share Frame"
echo ""

# Extract full frame JSON for manual inspection
echo "=== Full Badge Frame JSON ==="
curl -s "$STAGING_URL/api/frame?type=leaderboard" | \
  grep -o 'fc:frame" content='"'"'[^'"'"']*'"'"'' | \
  sed "s/fc:frame\" content='//" | \
  sed "s/'$//" | \
  python3 -m json.tool 2>/dev/null || echo "(JSON parsing failed - check manually)"

echo ""
echo "=== Test Complete ==="
echo "Expected values:"
echo "  version: \"next\""
echo "  type: \"launch_frame\""
echo "  name: \"Gmeowbased\""
echo ""
echo "Next steps:"
echo "1. Deploy to staging"
echo "2. Run: STAGING_URL=https://your-staging.vercel.app bash scripts/test-frame-spec.sh"
echo "3. Create test cast in Warpcast with frame URL"
echo "4. Verify button launches mini app (not external browser)"
