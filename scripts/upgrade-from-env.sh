#!/bin/bash
# Upgrade using .env.local

set -e

# Load from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep ORACLE_PRIVATE_KEY | xargs)
fi

PROXY_ADDRESS="0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73"
BASE_RPC="https://mainnet.base.org"

if [ -z "$ORACLE_PRIVATE_KEY" ]; then
    echo "❌ ORACLE_PRIVATE_KEY not found in .env.local"
    echo ""
    echo "Please add to .env.local:"
    echo "ORACLE_PRIVATE_KEY=0x..."
    exit 1
fi

echo "🔧 Upgrading GmeowCore Contract"
echo "================================"
echo ""
echo "Proxy: $PROXY_ADDRESS"
echo "Using: $(cast wallet address $ORACLE_PRIVATE_KEY)"
echo ""

read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "📦 Building contract..."
forge build || exit 1

echo ""
echo "🚀 Deploying new implementation..."
OUTPUT=$(forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --rpc-url $BASE_RPC \
    --private-key $ORACLE_PRIVATE_KEY \
    --broadcast \
    2>&1)

echo "$OUTPUT"

# Extract deployed address
NEW_IMPL=$(echo "$OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$NEW_IMPL" ]; then
    echo "❌ Failed to deploy"
    exit 1
fi

echo ""
echo "✅ New implementation: $NEW_IMPL"
echo ""
echo "🔄 Upgrading proxy..."

cast send $PROXY_ADDRESS \
    "upgradeImplementation(string,address)" "core" $NEW_IMPL \
    --rpc-url $BASE_RPC \
    --private-key $ORACLE_PRIVATE_KEY

echo ""
echo "✅ Upgrade complete!"
echo ""
echo "Verifying Quest 11 escrow..."
cast call $PROXY_ADDRESS "quests(uint256)" 11 --rpc-url $BASE_RPC | sed -n '10p'
echo "✅ Upgrade complete!"
echo ""
echo "Verify on BaseScan:"
echo "https://basescan.org/address/$PROXY_ADDRESS#code"
