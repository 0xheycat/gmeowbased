#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOYING GMEOW PROXY TO BASE SEPOLIA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set!"
    echo ""
    echo "Please set your private key:"
    echo "export PRIVATE_KEY=0xyour_private_key_here"
    echo ""
    echo "Or run:"
    echo "PRIVATE_KEY=0xyour_key ./scripts/deploy-base-sepolia.sh"
    exit 1
fi

# Check if ORACLE_SIGNER is set (optional, defaults to deployer)
if [ -z "$ORACLE_SIGNER" ]; then
    echo "ℹ️  ORACLE_SIGNER not set, will use deployer address as oracle"
    echo ""
fi

# Base Sepolia RPC
RPC_URL="https://sepolia.base.org"

echo "📋 Configuration:"
echo "   Network: Base Sepolia"
echo "   Chain ID: 84532"
echo "   RPC: $RPC_URL"
echo ""

# Check balance
echo "💰 Checking balance..."
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY 2>/dev/null)
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "❌ Failed to derive address from private key"
    exit 1
fi

BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
BALANCE_ETH=$(cast --to-unit $BALANCE ether)

echo "   Deployer: $DEPLOYER_ADDRESS"
echo "   Balance: $BALANCE_ETH ETH"
echo ""

if [ "$BALANCE" = "0" ]; then
    echo "❌ No ETH in account! Get testnet ETH from:"
    echo "   https://portal.cdp.coinbase.com/products/faucet"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 DEPLOYING CONTRACTS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deploy GmeowCore
echo "1/4: Deploying GmeowCore..."
CORE_ADDRESS=$(forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --optimize \
    --optimizer-runs 1 \
    --via-ir \
    --json | jq -r '.deployedTo')

if [ -z "$CORE_ADDRESS" ] || [ "$CORE_ADDRESS" = "null" ]; then
    echo "❌ Failed to deploy GmeowCore"
    exit 1
fi
echo "✅ GmeowCore: $CORE_ADDRESS"
echo ""

# Deploy GmeowGuild
echo "2/4: Deploying GmeowGuild..."
GUILD_ADDRESS=$(forge create contract/proxy/GmeowGuild.sol:GmeowGuild \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --optimize \
    --optimizer-runs 1 \
    --via-ir \
    --json | jq -r '.deployedTo')

if [ -z "$GUILD_ADDRESS" ] || [ "$GUILD_ADDRESS" = "null" ]; then
    echo "❌ Failed to deploy GmeowGuild"
    exit 1
fi
echo "✅ GmeowGuild: $GUILD_ADDRESS"
echo ""

# Deploy GmeowNFTImpl
echo "3/4: Deploying GmeowNFTImpl..."
NFT_ADDRESS=$(forge create contract/proxy/GmeowNFTImpl.sol:GmeowNFTImpl \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --optimize \
    --optimizer-runs 1 \
    --via-ir \
    --json | jq -r '.deployedTo')

if [ -z "$NFT_ADDRESS" ] || [ "$NFT_ADDRESS" = "null" ]; then
    echo "❌ Failed to deploy GmeowNFTImpl"
    exit 1
fi
echo "✅ GmeowNFTImpl: $NFT_ADDRESS"
echo ""

# Deploy GmeowProxy
echo "4/4: Deploying GmeowProxy..."
PROXY_ADDRESS=$(forge create contract/proxy/GmeowProxy.sol:GmeowProxy \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args $CORE_ADDRESS $GUILD_ADDRESS $NFT_ADDRESS \
    --optimize \
    --optimizer-runs 1 \
    --via-ir \
    --json | jq -r '.deployedTo')

if [ -z "$PROXY_ADDRESS" ] || [ "$PROXY_ADDRESS" = "null" ]; then
    echo "❌ Failed to deploy GmeowProxy"
    exit 1
fi
echo "✅ GmeowProxy: $PROXY_ADDRESS"
echo ""

# Initialize contract
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 INITIALIZING CONTRACT..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use ORACLE_SIGNER if set, otherwise use deployer
ORACLE=${ORACLE_SIGNER:-$DEPLOYER_ADDRESS}
echo "   Oracle Signer: $ORACLE"
echo ""

# Call initialize function through proxy
cast send $PROXY_ADDRESS \
    "initialize(address)" \
    $ORACLE \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize contract"
    exit 1
fi

echo "✅ Contract initialized!"
echo ""

# Get badge contract address
BADGE_ADDRESS=$(cast call $PROXY_ADDRESS "badgeContract()(address)" --rpc-url $RPC_URL)
BADGE_ADDRESS=$(cast --to-address $BADGE_ADDRESS)

# Save deployment info
TIMESTAMP=$(date +%s)
DEPLOYMENT_FILE="deployments/base-sepolia-$TIMESTAMP.json"

mkdir -p deployments

cat > $DEPLOYMENT_FILE <<EOF
{
  "network": "base-sepolia",
  "chainId": 84532,
  "deployedAt": "$(date -Iseconds)",
  "deployer": "$DEPLOYER_ADDRESS",
  "implementations": {
    "core": "$CORE_ADDRESS",
    "guild": "$GUILD_ADDRESS",
    "nft": "$NFT_ADDRESS"
  },
  "proxy": "$PROXY_ADDRESS",
  "badgeContract": "$BADGE_ADDRESS",
  "oracleSigner": "$ORACLE"
}
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Deployed Addresses:"
echo "   GmeowCore:      $CORE_ADDRESS"
echo "   GmeowGuild:     $GUILD_ADDRESS"
echo "   GmeowNFTImpl:   $NFT_ADDRESS"
echo "   ⭐ GmeowProxy:  $PROXY_ADDRESS"
echo "   Badge Contract: $BADGE_ADDRESS"
echo "   Oracle Signer:  $ORACLE"
echo ""
echo "💾 Saved to: $DEPLOYMENT_FILE"
echo ""
echo "🔍 View on BaseScan:"
echo "   https://sepolia.basescan.org/address/$PROXY_ADDRESS"
echo ""
echo "⭐ Use this address in your frontend:"
echo "   $PROXY_ADDRESS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
