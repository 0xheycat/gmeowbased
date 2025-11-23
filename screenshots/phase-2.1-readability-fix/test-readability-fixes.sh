#!/bin/bash

# Test GM frame (streak badge text should be white now)
echo "1. Testing GM frame with streak..."
curl -s "https://gmeowhq.art/api/frame/image?type=gm&fid=618031&chain=8453&user=0xd502f23051883fc71d76e8d41cebacb25e6aac1f&streak=7&count=42&total=150&weekWarrior=true&centuryClub=false" -o gm-streak.png

# Test Verify frame (VERIFY badge and @username should be white)
echo "2. Testing Verify frame..."
curl -s "https://gmeowhq.art/api/frame/image?type=verify&fid=618031&chain=8453&user=0xd502f23051883fc71d76e8d41cebacb25e6aac1f&username=heycat&questId=123" -o verify.png

# Test OnchainStats frame  
echo "3. Testing OnchainStats frame..."
curl -s "https://gmeowhq.art/api/frame/image?type=onchainstats&fid=618031&user=0xd502f23051883fc71d76e8d41cebacb25e6aac1f&username=heycat&txs=1234&contracts=56&volume=1.23 ETH&balance=0.45 ETH&age=2y&builder=High&neynar=0.95&power=Yes" -o onchainstats.png

# Test Badge single (badgeShare route)
echo "4. Testing Badge single frame..."
curl -s "https://gmeowhq.art/api/frame/badgeShare/image?badgeId=signal-luminary&fid=618031" -o badge-single.png

# Test Badge collection
echo "5. Testing Badge collection frame..."
curl -s "https://gmeowhq.art/api/frame/image?type=badge&fid=618031&earnedBadges=neon-initiate,pulse-runner,signal-luminary&earnedCount=3&eligibleCount=5&username=heycat" -o badge-collection.png

echo ""
echo "Results:"
file *.png | grep -v "cannot open"
ls -lh *.png 2>/dev/null

