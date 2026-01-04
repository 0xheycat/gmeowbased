#!/bin/bash
# Simple upgrade script - just paste your private key when prompted

set -e

PROXY_ADDRESS="0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73"
BASE_RPC="https://mainnet.base.org"

echo "🔧 GmeowCore Contract Upgrade"
echo "=============================="
echo ""

# Prompt for private key
echo "Enter the ORACLE_PRIVATE_KEY (starts with 0x):"
read -s PRIVATE_KEY
echo ""

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ No private key provided"
    exit 1
fi

# Verify address
DERIVED_ADDRESS=$(cast wallet address $PRIVATE_KEY)
echo "Using address: $DERIVED_ADDRESS"
echo ""

echo "Step 1: Compiling contract..."
forge build

echo ""
echo "Step 2: Deploying new implementation..."
forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --rpc-url $BASE_RPC \
    --private-key $PRIVATE_KEY

echo ""
echo "Copy the 'Deployed to:' address above, then run:"
echo ""
echo "cast send $PROXY_ADDRESS \\"
echo '  "upgradeTo(address)" <DEPLOYED_ADDRESS> \\'
echo "  --rpc-url $BASE_RPC \\"
echo '  --private-key $PRIVATE_KEY'
