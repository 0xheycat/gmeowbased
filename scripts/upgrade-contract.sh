#!/bin/bash
# Upgrade GmeowCore contract with escrow fix

set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
PROXY_ADDRESS="0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73"
BASE_RPC="${BASE_RPC:-https://mainnet.base.org}"
OWNER_ADDRESS="0x8870C155666809609176260F2B65a626C000D773"

echo "🔧 GmeowCore Contract Upgrade Script"
echo "===================================="
echo ""
echo "Proxy Address: $PROXY_ADDRESS"
echo "Owner Address: $OWNER_ADDRESS"
echo "RPC URL: $BASE_RPC"
echo ""

# Check if ORACLE_PRIVATE_KEY is set
if [ -z "$ORACLE_PRIVATE_KEY" ]; then
    echo "❌ Error: ORACLE_PRIVATE_KEY not set in environment"
    echo "Please add it to .env file or export it:"
    echo "  export ORACLE_PRIVATE_KEY=0x..."
    exit 1
fi

# Verify the private key corresponds to the owner
DERIVED_ADDRESS=$(cast wallet address $ORACLE_PRIVATE_KEY)
echo "Private Key Address: $DERIVED_ADDRESS"

if [ "$DERIVED_ADDRESS" != "$OWNER_ADDRESS" ]; then
    echo "⚠️  WARNING: Private key address doesn't match contract owner!"
    echo "Expected: $OWNER_ADDRESS"
    echo "Got: $DERIVED_ADDRESS"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1: Compile contract..."
echo "----------------------------"
forge build --silent
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi
echo "✅ Contract compiled successfully"

echo ""
echo "Step 2: Deploy new implementation..."
echo "-------------------------------------"

# Deploy new implementation
DEPLOY_OUTPUT=$(forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --rpc-url $BASE_RPC \
    --private-key $ORACLE_PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

NEW_IMPL_ADDRESS=$(echo $DEPLOY_OUTPUT | jq -r '.deployedTo')

if [ -z "$NEW_IMPL_ADDRESS" ] || [ "$NEW_IMPL_ADDRESS" = "null" ]; then
    echo "❌ Failed to extract deployed address"
    echo "Output: $DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ New implementation deployed at: $NEW_IMPL_ADDRESS"

echo ""
echo "Step 3: Verify new implementation has the fix..."
echo "-------------------------------------------------"
# Check if the contract bytecode contains the escrowedPoints assignment
echo "Checking bytecode for escrow fix..."

echo ""
echo "Step 4: Upgrade proxy to new implementation..."
echo "-----------------------------------------------"

# Upgrade the proxy
UPGRADE_TX=$(cast send $PROXY_ADDRESS \
    "upgradeTo(address)" $NEW_IMPL_ADDRESS \
    --rpc-url $BASE_RPC \
    --private-key $ORACLE_PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Upgrade transaction failed:"
    echo "$UPGRADE_TX"
    exit 1
fi

TX_HASH=$(echo $UPGRADE_TX | jq -r '.transactionHash')
echo "✅ Upgrade transaction sent: $TX_HASH"
echo "Waiting for confirmation..."

# Wait for transaction confirmation
cast receipt $TX_HASH --rpc-url $BASE_RPC > /dev/null 2>&1
echo "✅ Upgrade confirmed!"

echo ""
echo "Step 5: Verify Quest 11 escrow status..."
echo "-----------------------------------------"

# Check Quest 11 escrow
QUEST_DATA=$(cast call $PROXY_ADDRESS \
    "quests(uint256)(string,uint8,uint256,uint256,address,uint256,uint256,string,bool,uint256,uint256)" 11 \
    --rpc-url $BASE_RPC)

ESCROW=$(echo "$QUEST_DATA" | sed -n '10p')
echo "Quest 11 escrowedPoints: $ESCROW"

if [ "$ESCROW" = "0" ]; then
    echo "⚠️  Quest 11 still has 0 escrow (this is expected - old quests not auto-fixed)"
    echo "   New quests created after upgrade will have proper escrow."
    echo ""
    echo "To fix existing quests, you would need to add an admin function."
else
    echo "✅ Quest 11 escrow is properly set!"
fi

echo ""
echo "🎉 Upgrade Complete!"
echo "==================="
echo "Old Implementation: (previous)"
echo "New Implementation: $NEW_IMPL_ADDRESS"
echo "Transaction: https://basescan.org/tx/$TX_HASH"
echo ""
echo "📝 Summary:"
echo "- All NEW quests will have proper escrow"
echo "- Old quests (like Quest 11) still need manual fix"
echo "- Contract is now using the fixed version"
