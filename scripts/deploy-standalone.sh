#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}❌ Error: PRIVATE_KEY not set${NC}"
  echo "Usage: PRIVATE_KEY=your_private_key ./scripts/deploy-standalone.sh"
  exit 1
fi

if [ -z "$ORACLE_ADDRESS" ]; then
  echo -e "${YELLOW}⚠️  ORACLE_ADDRESS not set, extracting from private key...${NC}"
  ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY)
fi

# Network configuration
RPC_URL="https://sepolia.base.org"
CHAIN_ID=84532

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Gmeow Standalone Architecture Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

# Show deployer info
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER --rpc-url $RPC_URL)

echo -e "\n${YELLOW}Network:${NC} Base Sepolia (Chain ID: $CHAIN_ID)"
echo -e "${YELLOW}Deployer:${NC} $DEPLOYER"
echo -e "${YELLOW}Balance:${NC} $(cast --from-wei $BALANCE) ETH"
echo -e "${YELLOW}Oracle:${NC} $ORACLE_ADDRESS"

if [ "$BALANCE" = "0" ]; then
  echo -e "${RED}❌ Insufficient balance. Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet${NC}"
  exit 1
fi

# Deploy contracts
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deploying Contracts${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

# 1. Deploy GmeowCore (Core + Referral)
echo -e "\n${YELLOW}[1/3] Deploying GmeowCore (Core + Referral)...${NC}"
CORE_DEPLOY=$(forge create contract/GmeowCoreStandalone.sol:GmeowCore \
  --broadcast \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $ORACLE_ADDRESS \
  2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to deploy GmeowCore${NC}"
  echo "$CORE_DEPLOY"
  exit 1
fi

CORE_ADDRESS=$(echo "$CORE_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowCore deployed: $CORE_ADDRESS${NC}"

# 2. Deploy GmeowGuild
echo -e "\n${YELLOW}[2/3] Deploying GmeowGuildStandalone...${NC}"
GUILD_DEPLOY=$(forge create contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --broadcast \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $CORE_ADDRESS \
  2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to deploy GmeowGuildStandalone${NC}"
  echo "$GUILD_DEPLOY"
  exit 1
fi

GUILD_ADDRESS=$(echo "$GUILD_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowGuildStandalone deployed: $GUILD_ADDRESS${NC}"

# 3. Deploy GmeowNFT
echo -e "\n${YELLOW}[3/3] Deploying GmeowNFTStandalone...${NC}"
NFT_DEPLOY=$(forge create contract/GmeowNFTStandalone.sol:GmeowNFTStandalone \
  --broadcast \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $CORE_ADDRESS "Gmeow Adventure NFT" "GMEOW" "https://api.gmeowhq.art/nft/" \
  2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to deploy GmeowNFTStandalone${NC}"
  echo "$NFT_DEPLOY"
  exit 1
fi

NFT_ADDRESS=$(echo "$NFT_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowNFTStandalone deployed: $NFT_ADDRESS${NC}"

# 4. Link contracts
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Linking Contracts${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Calling setGuildContract($GUILD_ADDRESS)...${NC}"
cast send $CORE_ADDRESS \
  "setGuildContract(address)" \
  $GUILD_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to set guild contract${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Guild contract linked${NC}"

echo -e "\n${YELLOW}Calling setNFTContractAddress($NFT_ADDRESS)...${NC}"
cast send $CORE_ADDRESS \
  "setNFTContractAddress(address)" \
  $NFT_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to set NFT contract${NC}"
  exit 1
fi
echo -e "${GREEN}✅ NFT contract linked${NC}"

# Save deployment info
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

cat > deployment-standalone.json <<EOF
{
  "network": "base-sepolia",
  "chainId": $CHAIN_ID,
  "deployer": "$DEPLOYER",
  "oracle": "$ORACLE_ADDRESS",
  "contracts": {
    "GmeowCore": "$CORE_ADDRESS",
    "GmeowGuild": "$GUILD_ADDRESS",
    "GmeowNFT": "$NFT_ADDRESS"
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo -e "\n${GREEN}Contract Addresses:${NC}"
echo -e "  GmeowCore:  ${YELLOW}$CORE_ADDRESS${NC}"
echo -e "  GmeowGuild: ${YELLOW}$GUILD_ADDRESS${NC}"
echo -e "  GmeowNFT:   ${YELLOW}$NFT_ADDRESS${NC}"

echo -e "\n${GREEN}✅ Deployment information saved to deployment-standalone.json${NC}"

echo -e "\n${GREEN}Next Steps:${NC}"
echo -e "  1. Verify contracts on Basescan:"
echo -e "     ${YELLOW}forge verify-contract $CORE_ADDRESS contract/GmeowCoreStandalone.sol:GmeowCore --chain-id $CHAIN_ID${NC}"
echo -e "  2. Update frontend with contract addresses"
echo -e "  3. Test all features"

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
