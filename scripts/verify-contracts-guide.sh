#!/bin/bash
# Verify Gmeowbased Contracts on Basescan
# 
# This script guides you through verifying contracts on Basescan
# Once verified, ABIs can be fetched automatically from Basescan API
#
# Prerequisites:
# 1. Contract source code (contract/ directory)
# 2. Basescan API key (already in .env.local)
# 3. Deployment transaction hashes
#
# Run: bash scripts/verify-contracts-guide.sh

echo "🔍 Gmeowbased Contract Verification Guide"
echo "=========================================="
echo ""

# Contract addresses
CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
GUILD_ADDRESS="0x967457be45facE07c22c0374dAfBeF7b2f7cd059"
NFT_ADDRESS="0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"
PROXY_ADDRESS="0x6A48B758ed42d7c934D387164E60aa58A92eD206"

echo "📍 Contract Addresses (Base Mainnet):"
echo "  Core:  $CORE_ADDRESS"
echo "  Guild: $GUILD_ADDRESS"
echo "  NFT:   $NFT_ADDRESS"
echo "  Proxy: $PROXY_ADDRESS"
echo ""

echo "🔧 Verification Methods:"
echo ""
echo "METHOD 1: Basescan Web UI (Easiest)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Visit: https://basescan.org/verifyContract"
echo "2. Select 'Solidity (Single file)' or 'Solidity (Standard-JSON-Input)'"
echo "3. Enter contract address (e.g., $CORE_ADDRESS)"
echo "4. Select compiler version: 0.8.23"
echo "5. Select optimization: Yes (200 runs recommended)"
echo "6. Upload contract source:"
echo "   - Core: contract/GmeowCoreStandalone.sol + modules/"
echo "   - Guild: contract/GmeowGuildStandalone.sol + modules/"
echo "   - NFT: contract/GmeowNFTStandalone.sol"
echo "7. Enter constructor arguments (if any)"
echo "8. Click 'Verify and Publish'"
echo ""

echo "METHOD 2: Foundry (Command Line)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Prerequisites: Install Foundry"
echo "  curl -L https://foundry.paradigm.xyz | bash"
echo "  foundryup"
echo ""
echo "Verify commands:"
echo ""
echo "# Core Contract"
echo "forge verify-contract \\"
echo "  --chain-id 8453 \\"
echo "  --num-of-optimizations 200 \\"
echo "  --compiler-version 0.8.23 \\"
echo "  --etherscan-api-key \$ETHERSCAN_API_KEY \\"
echo "  $CORE_ADDRESS \\"
echo "  contract/GmeowCoreStandalone.sol:GmeowCore"
echo ""
echo "# Guild Contract"
echo "forge verify-contract \\"
echo "  --chain-id 8453 \\"
echo "  --num-of-optimizations 200 \\"
echo "  --compiler-version 0.8.23 \\"
echo "  --etherscan-api-key \$ETHERSCAN_API_KEY \\"
echo "  $GUILD_ADDRESS \\"
echo "  contract/GmeowGuildStandalone.sol:GmeowGuild"
echo ""
echo "# NFT Contract"
echo "forge verify-contract \\"
echo "  --chain-id 8453 \\"
echo "  --num-of-optimizations 200 \\"
echo "  --compiler-version 0.8.23 \\"
echo "  --etherscan-api-key \$ETHERSCAN_API_KEY \\"
echo "  $NFT_ADDRESS \\"
echo "  contract/GmeowNFTStandalone.sol:GmeowNFT"
echo ""

echo "METHOD 3: Hardhat (If using Hardhat)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "npx hardhat verify --network base $CORE_ADDRESS [constructor-args]"
echo ""

echo "📝 After Verification:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Check verification status on Basescan"
echo "2. Run ABI update script:"
echo "   npx tsx scripts/update-abis-from-basescan.ts"
echo "3. Verify referral functions in ABI:"
echo "   cat abi/GmeowCore.abi.json | jq '.[] | select(.name | contains(\"referral\")) | .name'"
echo "4. Re-run contract tests:"
echo "   npx tsx scripts/test-referral-guild-contracts.ts"
echo ""

echo "🔗 Useful Links:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Basescan Verify: https://basescan.org/verifyContract"
echo "Core Contract:   https://basescan.org/address/$CORE_ADDRESS"
echo "Guild Contract:  https://basescan.org/address/$GUILD_ADDRESS"
echo "NFT Contract:    https://basescan.org/address/$NFT_ADDRESS"
echo "Proxy Contract:  https://basescan.org/address/$PROXY_ADDRESS"
echo ""

echo "⚠️  Important Notes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "- Flattened source may be needed for complex contracts"
echo "- Include all imported files (modules/, libraries/)"
echo "- Match exact compiler settings used during deployment"
echo "- Constructor arguments must match deployment"
echo "- Verification can take 1-2 minutes"
echo ""

read -p "Would you like to check verification status? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Checking Core contract verification..."
    curl -s "https://api.basescan.org/api?module=contract&action=getabi&address=$CORE_ADDRESS&apikey=$ETHERSCAN_API_KEY" | jq -r '.message'
    
    echo "Checking Guild contract verification..."
    curl -s "https://api.basescan.org/api?module=contract&action=getabi&address=$GUILD_ADDRESS&apikey=$ETHERSCAN_API_KEY" | jq -r '.message'
fi

echo ""
echo "✅ Once verified, run: npx tsx scripts/update-abis-from-basescan.ts"
