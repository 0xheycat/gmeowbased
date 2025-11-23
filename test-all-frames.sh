#!/bin/bash
echo "Testing all 9 frame types..."
echo ""

# Test 1: GM Frame
echo "1. GM Frame:"
curl -s "http://localhost:3000/api/frame?type=gm&fid=18139" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 2: Points Frame
echo "2. Points Frame:"
curl -s "http://localhost:3000/api/frame?type=points&user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&chain=base" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 3: Quest Frame
echo "3. Quest Frame:"
curl -s "http://localhost:3000/api/frame?type=quest&questId=1" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 4: Badge Frame
echo "4. Badge Frame:"
curl -s "http://localhost:3000/api/frame?type=badge&fid=18139" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 5: OnchainStats Frame
echo "5. OnchainStats Frame:"
curl -s "http://localhost:3000/api/frame?type=onchainstats&user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&chain=base" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 6: Leaderboards Frame
echo "6. Leaderboards Frame:"
curl -s "http://localhost:3000/api/frame?type=leaderboards&chain=base" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 7: Guild Frame
echo "7. Guild Frame:"
curl -s "http://localhost:3000/api/frame?type=guild&id=1" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 8: Referral Frame
echo "8. Referral Frame:"
curl -s "http://localhost:3000/api/frame?type=referral" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

# Test 9: Verify Frame
echo "9. Verify Frame:"
curl -s "http://localhost:3000/api/frame?type=verify" | grep -o 'fc:frame:text" content="[^"]*"' | head -1
echo ""

echo "✅ All 9 frame types tested!"
