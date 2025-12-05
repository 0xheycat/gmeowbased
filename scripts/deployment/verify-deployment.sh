#!/bin/bash
# Post-deployment verification script

echo "🔍 CSP & Frame Rendering Fixes Verification"
echo "==========================================="
echo ""

# Test 1: CSP Headers
echo "1️⃣  Testing CSP Headers..."
CSP=$(curl -sI "https://gmeowhq.art/api/frame?type=onchainstats" | grep -i "content-security-policy")

if [[ $CSP == *"script-src"* ]]; then
  echo "   ✅ script-src directive found"
else
  echo "   ❌ script-src directive MISSING"
fi

if [[ $CSP == *"connect-src"* ]]; then
  echo "   ✅ connect-src directive found"
else
  echo "   ❌ connect-src directive MISSING"
fi

if [[ $CSP == *"img-src"* ]]; then
  echo "   ✅ img-src directive found"
else
  echo "   ❌ img-src directive MISSING"
fi

if [[ $CSP == *"privy.farcaster.xyz"* ]]; then
  echo "   ✅ privy.farcaster.xyz in CSP"
else
  echo "   ❌ privy.farcaster.xyz NOT in CSP"
fi

echo ""

# Test 2: Dynamic OG Image
echo "2️⃣  Testing Dynamic OG Image Generation..."
OG_URL="https://gmeowhq.art/api/frame/og?title=Test&subtitle=Stats&chain=Base&metric1Label=Txs&metric1Value=100"
OG_STATUS=$(curl -sI "$OG_URL" | grep -i "HTTP/" | awk '{print $2}')

if [[ $OG_STATUS == "200" ]]; then
  echo "   ✅ OG image endpoint returns 200"
  CONTENT_TYPE=$(curl -sI "$OG_URL" | grep -i "content-type" | cut -d: -f2-)
  if [[ $CONTENT_TYPE == *"image/png"* ]]; then
    echo "   ✅ Returns image/png"
  else
    echo "   ⚠️  Content-Type: $CONTENT_TYPE"
  fi
else
  echo "   ❌ OG image endpoint returned: $OG_STATUS"
fi

echo ""

# Test 3: Frame Metadata
echo "3️⃣  Testing Frame Metadata..."
FRAME_HTML=$(curl -s "https://gmeowhq.art/api/frame?type=onchainstats&chain=base&user=0x7539472DAd6a371e6E152C5A203469aA32314130")
FRAME_IMAGE=$(echo "$FRAME_HTML" | grep 'fc:frame:image' | head -1 | sed -n 's/.*content="\([^"]*\)".*/\1/p')

if [[ $FRAME_IMAGE == *"/api/frame/og?"* ]]; then
  echo "   ✅ Frame uses dynamic OG image"
  echo "   📸 Image URL: ${FRAME_IMAGE:0:80}..."
else
  echo "   ❌ Frame still using static image: $FRAME_IMAGE"
fi

echo ""

# Test 4: Manifest BaseBuilder
echo "4️⃣  Testing Manifest baseBuilder..."
MANIFEST=$(curl -s "https://gmeowhq.art/api/manifest")
BASE_BUILDER=$(echo "$MANIFEST" | jq -r '.baseBuilder.ownerAddress // "null"')

if [[ $BASE_BUILDER != "null" && $BASE_BUILDER != "" ]]; then
  echo "   ✅ baseBuilder.ownerAddress found"
  echo "   📍 Address: $BASE_BUILDER"
else
  echo "   ❌ baseBuilder.ownerAddress MISSING"
  echo "   ⚠️  This may need more time to propagate (wait 2-3 min)"
fi

echo ""

# Test 5: Static Manifest
echo "5️⃣  Testing Static Manifest..."
STATIC_MANIFEST=$(curl -s "https://gmeowhq.art/.well-known/farcaster.json")
STATIC_BUILDER=$(echo "$STATIC_MANIFEST" | jq -r '.baseBuilder.ownerAddress // "null"')

if [[ $STATIC_BUILDER != "null" && $STATIC_BUILDER != "" ]]; then
  echo "   ✅ Static manifest has baseBuilder"
  echo "   📍 Address: $STATIC_BUILDER"
else
  echo "   ❌ Static manifest missing baseBuilder"
fi

echo ""
echo "==========================================="
echo "✅ Verification complete!"
echo ""
echo "Next steps:"
echo "1. Test frame in Farcaster compose: https://farcaster.xyz/~/compose"
echo "2. Check browser console for CSP errors (should be 0)"
echo "3. Verify Privy wallet loads without issues"
echo "4. Confirm Base.dev recognizes ownership"
echo ""
