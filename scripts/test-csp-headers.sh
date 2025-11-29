#!/bin/bash
# Test CSP headers for Privy/Wallet domains

echo "🔍 Testing CSP Headers for Frame Endpoints..."
echo ""

# Test /api/frame endpoint
echo "📋 Testing /api/frame?type=onchainstats"
CSP=$(curl -sI "https://gmeowhq.art/api/frame?type=onchainstats" | grep -i "content-security-policy" | cut -d: -f2-)

if [[ $CSP == *"privy.farcaster.xyz"* ]]; then
  echo "✅ privy.farcaster.xyz found in CSP"
else
  echo "❌ privy.farcaster.xyz NOT found in CSP"
fi

if [[ $CSP == *"wallet.farcaster.xyz"* ]]; then
  echo "✅ wallet.farcaster.xyz found in CSP"
else
  echo "❌ wallet.farcaster.xyz NOT found in CSP"
fi

echo ""
echo "Full CSP Header:"
echo "$CSP"
