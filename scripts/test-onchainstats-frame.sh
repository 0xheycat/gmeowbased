#!/bin/bash

# Test script for onchainstats frame metadata
# This verifies the frame generates correct vNext JSON format

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_ADDRESS="0xB4F2fF92E8ccbbeAb7094cef5514A15aeBbbD11F"
TEST_CHAIN="base"

echo "======================================"
echo "Testing Onchain Stats Frame Metadata"
echo "======================================"
echo ""
echo "Base URL: $BASE_URL"
echo "Test Address: $TEST_ADDRESS"
echo "Chain: $TEST_CHAIN"
echo ""

# Build frame URL with all parameters
FRAME_URL="$BASE_URL/api/frame?type=onchainstats&chain=$TEST_CHAIN&user=$TEST_ADDRESS&statsChain=$TEST_CHAIN&chainName=Base&txs=1&contracts=0&volume=0.0041+ETH&balance=0.0001+ETH&age=451d+12h&firstTx=Aug+24%2C+2024&lastTx=Aug+24%2C+2024"

echo "Test 1: Check server is running"
echo "------------------------------"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
    echo "✅ Server is running"
else
    echo "❌ Server not running at $BASE_URL"
    echo "Start server with: pnpm dev"
    exit 1
fi
echo ""

echo "Test 2: Fetch frame HTML"
echo "------------------------------"
HTML=$(curl -s "$FRAME_URL")
if [ -n "$HTML" ]; then
    echo "✅ Frame HTML fetched ($(echo "$HTML" | wc -c) bytes)"
else
    echo "❌ Failed to fetch frame HTML"
    exit 1
fi
echo ""

echo "Test 3: Check for fc:frame meta tag"
echo "------------------------------"
if echo "$HTML" | grep -q 'name="fc:frame"'; then
    echo "✅ fc:frame meta tag found"
else
    echo "❌ fc:frame meta tag NOT found"
    echo "HTML excerpt:"
    echo "$HTML" | grep -A5 -B5 "meta" | head -20
    exit 1
fi
echo ""

echo "Test 4: Extract and validate JSON"
echo "------------------------------"
# Extract the content attribute value
FRAME_JSON=$(echo "$HTML" | grep -o 'name="fc:frame" content='"'"'[^'"'"']*'"'"'' | sed "s/name=\"fc:frame\" content='//;s/'$//" | sed 's/&#39;/'"'"'/g')

if [ -n "$FRAME_JSON" ]; then
    echo "✅ Frame JSON extracted"
    echo ""
    echo "Frame JSON:"
    echo "$FRAME_JSON" | jq '.' 2>/dev/null || echo "$FRAME_JSON"
else
    echo "❌ Failed to extract frame JSON"
    exit 1
fi
echo ""

echo "Test 5: Validate JSON structure"
echo "------------------------------"
VERSION=$(echo "$FRAME_JSON" | jq -r '.version' 2>/dev/null || echo "")
IMAGE_URL=$(echo "$FRAME_JSON" | jq -r '.imageUrl' 2>/dev/null || echo "")
BUTTON_TITLE=$(echo "$FRAME_JSON" | jq -r '.button.title' 2>/dev/null || echo "")
ACTION_TYPE=$(echo "$FRAME_JSON" | jq -r '.button.action.type' 2>/dev/null || echo "")

echo "Version: $VERSION"
echo "Image URL: $IMAGE_URL"
echo "Button Title: $BUTTON_TITLE"
echo "Action Type: $ACTION_TYPE"
echo ""

# Validate version is "1"
if [ "$VERSION" = "1" ]; then
    echo "✅ Version is '1' (correct vNext format)"
else
    echo "❌ Version is '$VERSION' (should be '1')"
    exit 1
fi

# Validate imageUrl exists
if [ -n "$IMAGE_URL" ] && [ "$IMAGE_URL" != "null" ]; then
    echo "✅ imageUrl is present"
else
    echo "❌ imageUrl is missing"
    exit 1
fi

# Validate button exists
if [ -n "$BUTTON_TITLE" ] && [ "$BUTTON_TITLE" != "null" ]; then
    echo "✅ button.title is present"
else
    echo "❌ button.title is missing"
    exit 1
fi

# Validate action type
if [ "$ACTION_TYPE" = "launch_frame" ]; then
    echo "✅ action.type is 'launch_frame'"
else
    echo "❌ action.type is '$ACTION_TYPE' (should be 'launch_frame')"
    exit 1
fi
echo ""

echo "Test 6: Verify OG image metadata"
echo "------------------------------"
if echo "$HTML" | grep -q 'property="og:image"'; then
    OG_IMAGE=$(echo "$HTML" | grep -o 'property="og:image" content="[^"]*"' | sed 's/property="og:image" content="//;s/"$//')
    echo "✅ og:image meta tag found"
    echo "OG Image URL: $OG_IMAGE"
else
    echo "⚠️  og:image meta tag not found (optional but recommended)"
fi
echo ""

echo "Test 7: Test different user addresses"
echo "------------------------------"
TEST_ADDRESS_2="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
FRAME_URL_2="$BASE_URL/api/frame?type=onchainstats&chain=$TEST_CHAIN&user=$TEST_ADDRESS_2&txs=5&volume=1.5+ETH"
HTML_2=$(curl -s "$FRAME_URL_2")
FRAME_JSON_2=$(echo "$HTML_2" | grep -o 'name="fc:frame" content='"'"'[^'"'"']*'"'"'' | sed "s/name=\"fc:frame\" content='//;s/'$//" | sed 's/&#39;/'"'"'/g')
IMAGE_URL_2=$(echo "$FRAME_JSON_2" | jq -r '.imageUrl' 2>/dev/null || echo "")

if [ "$IMAGE_URL" != "$IMAGE_URL_2" ]; then
    echo "✅ Different addresses generate different images (dynamic data confirmed)"
    echo "Image 1: $IMAGE_URL"
    echo "Image 2: $IMAGE_URL_2"
else
    echo "⚠️  Same image URL for different addresses (may be using default image)"
fi
echo ""

echo "Test 8: Test Warpcast compose URL"
echo "------------------------------"
COMPOSE_URL="https://farcaster.xyz/~/compose?text=Flexing+my+Base+onchain+stats+via+GMEOW&embeds%5B%5D=$FRAME_URL"
echo "Compose URL: $COMPOSE_URL"
echo ""
echo "To test in Farcaster:"
echo "1. Open this URL in browser: $COMPOSE_URL"
echo "2. Verify image preview appears in compose window"
echo "3. Post the cast"
echo "4. Verify image displays in feed"
echo ""

echo "======================================"
echo "✅ All tests passed!"
echo "======================================"
echo ""
echo "Summary:"
echo "- Frame metadata uses correct vNext JSON format (version: '1')"
echo "- fc:frame meta tag present with valid JSON"
echo "- imageUrl, button, and action properly configured"
echo "- Frame ready for Farcaster embedding"
echo ""
echo "Next steps:"
echo "1. Deploy to production"
echo "2. Test in actual Farcaster feed"
echo "3. Verify button click opens mini app correctly"
