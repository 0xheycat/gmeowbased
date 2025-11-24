#!/bin/bash
# Test updated manifest and new share route

echo "=== TESTING MANIFEST UPDATES ==="
echo ""

# Test 1: Manifest endpoint
echo "1. Testing manifest endpoint..."
curl -s http://localhost:3000/api/manifest | jq '{
  miniapp: {
    name: .miniapp.name,
    buttonTitle: .miniapp.buttonTitle,
    imageUrl: .miniapp.imageUrl,
    castShareUrl: .miniapp.castShareUrl,
    screenshotUrls: .miniapp.screenshotUrls
  }
}'

echo ""
echo "2. Testing .well-known/farcaster.json..."
curl -s http://localhost:3000/.well-known/farcaster.json | jq '{
  miniapp: {
    name: .miniapp.name,
    buttonTitle: .miniapp.buttonTitle,
    imageUrl: .miniapp.imageUrl,
    castShareUrl: .miniapp.castShareUrl,
    screenshotUrls: .miniapp.screenshotUrls | length
  }
}'

echo ""
echo "3. Testing personalized share route..."
curl -s http://localhost:3000/share/1568 -o test-share-fid-1568.png
ls -lh test-share-fid-1568.png | awk '{print "Share image: " $9 " (" $5 ")"}'

echo ""
echo "=== VALIDATION RESULTS ==="
echo "✓ Manifest should include:"
echo "  - buttonTitle: '👋 Say GM'"
echo "  - imageUrl: /og-image.png"
echo "  - screenshotUrls: 5 screenshots"
echo "  - castShareUrl: /share/[fid]"
echo ""
echo "✓ Share route should generate:"
echo "  - 1200x630 OG image"
echo "  - Personalized with FID"
echo "  - Gmeowbased branding"
