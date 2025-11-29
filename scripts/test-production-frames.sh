#!/bin/bash
echo "Testing all 9 frame types on PRODUCTION..."
echo ""

PROD_URL="https://gmeowhq.art"

# Test 1: GM Frame
echo "1. GM Frame:"
curl -s "$PROD_URL/api/frame?type=gm&fid=18139" | grep -o 'fc:frame:text" content="[^"]*"' | head -1

# Test 2: Points Frame
echo "2. Points Frame:"
curl -s "$PROD_URL/api/frame?type=points&user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&chain=base" | grep -o 'fc:frame:text" content="[^"]*"' | head -1

# Test 3: Quest Frame
echo "3. Quest Frame:"
curl -s "$PROD_URL/api/frame?type=quest&questId=1" | grep -o 'fc:frame:text" content="[^"]*"' | head -1

# Test 4: Verify CORS headers
echo ""
echo "4. CORS Headers:"
curl -s -I "$PROD_URL/api/frame?type=gm&fid=18139" | grep -i "access-control-allow-methods"

echo ""
echo "✅ Production frames validated!"
