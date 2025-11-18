#!/bin/bash

# Frame Image Generation Test Script
# Tests dynamic badge image generation with live database queries

echo "🎨 Testing Frame Image Generation..."
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"

# Check if server is running
if ! curl -s "$BASE_URL" > /dev/null; then
  echo "❌ Error: Development server not running at $BASE_URL"
  echo "   Run: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test 1: Badge share image with valid FID
echo "📸 Test 1: Badge share image (dynamic data)"
TEST_FID=3
TEST_BADGE="pioneer_2024_01"
IMAGE_URL="$BASE_URL/api/frame/badgeShare/image?fid=$TEST_FID&badgeId=$TEST_BADGE"

echo "   URL: $IMAGE_URL"
HTTP_CODE=$(curl -s -o /tmp/badge-test-1.png -w "%{http_code}" "$IMAGE_URL")

if [ "$HTTP_CODE" = "200" ]; then
  FILE_SIZE=$(wc -c < /tmp/badge-test-1.png)
  if [ "$FILE_SIZE" -gt 1000 ]; then
    echo "   ✅ Generated image: ${FILE_SIZE} bytes"
    echo "   📁 Saved to: /tmp/badge-test-1.png"
  else
    echo "   ⚠️  Image too small (${FILE_SIZE} bytes) - possible error"
  fi
else
  echo "   ❌ HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Different FID (should show different data)
echo "📸 Test 2: Different user (proves dynamic query)"
TEST_FID_2=456
IMAGE_URL_2="$BASE_URL/api/frame/badgeShare/image?fid=$TEST_FID_2&badgeId=$TEST_BADGE"

echo "   URL: $IMAGE_URL_2"
HTTP_CODE_2=$(curl -s -o /tmp/badge-test-2.png -w "%{http_code}" "$IMAGE_URL_2")

if [ "$HTTP_CODE_2" = "200" ]; then
  FILE_SIZE_2=$(wc -c < /tmp/badge-test-2.png)
  echo "   ✅ Generated image: ${FILE_SIZE_2} bytes"
  echo "   📁 Saved to: /tmp/badge-test-2.png"
  
  # Compare file sizes (should be different if user data differs)
  if [ "$FILE_SIZE" != "$FILE_SIZE_2" ]; then
    echo "   ✅ Different image sizes (proves dynamic data)"
  fi
else
  echo "   ⚠️  HTTP $HTTP_CODE_2 (user may not exist)"
fi
echo ""

# Test 3: Badge not found state
echo "📸 Test 3: Badge not found (error handling)"
IMAGE_URL_3="$BASE_URL/api/frame/badgeShare/image?fid=$TEST_FID&badgeId=nonexistent&state=notfound"

echo "   URL: $IMAGE_URL_3"
HTTP_CODE_3=$(curl -s -o /tmp/badge-test-notfound.png -w "%{http_CODE}" "$IMAGE_URL_3")

if [ "$HTTP_CODE_3" = "200" ]; then
  FILE_SIZE_3=$(wc -c < /tmp/badge-test-notfound.png)
  echo "   ✅ Generated error image: ${FILE_SIZE_3} bytes"
  echo "   📁 Saved to: /tmp/badge-test-notfound.png"
else
  echo "   ❌ HTTP $HTTP_CODE_3"
fi
echo ""

# Test 4: Frame HTML generation
echo "🔤 Test 4: Frame HTML (meta tags)"
FRAME_URL="$BASE_URL/api/frame/badgeShare?fid=$TEST_FID&badgeId=$TEST_BADGE"

echo "   URL: $FRAME_URL"
HTML_RESPONSE=$(curl -s "$FRAME_URL")

if echo "$HTML_RESPONSE" | grep -q 'fc:frame'; then
  echo "   ✅ Frame meta tag found"
  
  # Check for vNext JSON format
  if echo "$HTML_RESPONSE" | grep -q '"version":"1"'; then
    echo "   ✅ Using vNext JSON format"
  else
    echo "   ⚠️  Legacy format detected (should use JSON)"
  fi
  
  # Check for image URL
  if echo "$HTML_RESPONSE" | grep -q 'imageUrl'; then
    echo "   ✅ Image URL present in JSON"
  fi
else
  echo "   ❌ No frame meta tags found"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo ""
echo "Generated images:"
echo "  - /tmp/badge-test-1.png (FID $TEST_FID)"
echo "  - /tmp/badge-test-2.png (FID $TEST_FID_2)"
echo "  - /tmp/badge-test-notfound.png (error state)"
echo ""
echo "To view images:"
echo "  open /tmp/badge-test-1.png  # macOS"
echo "  xdg-open /tmp/badge-test-1.png  # Linux"
echo ""
echo "🎯 Key Verification:"
echo "  1. Check badge-test-1.png shows user's actual badge data"
echo "  2. Check badge-test-2.png shows different user (or not found)"
echo "  3. Check if minted status indicator appears correctly"
echo "  4. Verify earned date matches database record"
echo ""
echo "✅ All tests completed!"
