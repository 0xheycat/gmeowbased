#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}❌ Error: PRIVATE_KEY not set${NC}"
  echo "Usage: PRIVATE_KEY=your_private_key ./scripts/deploy-base-mainnet.sh"
  exit 1
fi

if [ -z "$ORACLE_ADDRESS" ]; then
  echo -e "${YELLOW}⚠️  ORACLE_ADDRESS not set, extracting from private key...${NC}"
  ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY)
fi

# Network configuration
RPC_URL="https://mainnet.base.org"
CHAIN_ID=8453

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Gmeow Standalone - BASE MAINNET Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

# Show deployer info
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER --rpc-url $RPC_URL)

echo -e "\n${YELLOW}Network:${NC} Base Mainnet (Chain ID: $CHAIN_ID)"
echo -e "${YELLOW}RPC:${NC} $RPC_URL"
echo -e "${YELLOW}Deployer:${NC} $DEPLOYER"
echo -e "${YELLOW}Balance:${NC} $(cast --from-wei $BALANCE) ETH"
echo -e "${YELLOW}Oracle:${NC} $ORACLE_ADDRESS"

# Check minimum balance (0.01 ETH recommended)
MIN_BALANCE="10000000000000000" # 0.01 ETH in wei
if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
  echo -e "${RED}❌ Insufficient balance. Recommended: at least 0.01 ETH${NC}"
  echo -e "${YELLOW}Current: $(cast --from-wei $BALANCE) ETH${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Confirmation prompt
echo -e "\n${YELLOW}⚠️  WARNING: You are about to deploy to BASE MAINNET${NC}"
echo -e "${YELLOW}This will cost real ETH. Make sure you've tested on testnet first!${NC}"
echo -e "\n${YELLOW}Contracts to deploy:${NC}"
echo -e "  1. GmeowCore (Core + Referral)"
echo -e "  2. GmeowGuildStandalone (Guild features)"
echo -e "  3. GmeowNFTStandalone (NFT features)"
echo -e "\n${YELLOW}Estimated total cost: ~0.005-0.01 ETH${NC}"
read -p "Proceed with deployment? (yes/NO) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
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
CORE_TX=$(echo "$CORE_DEPLOY" | grep "Transaction hash:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowCore deployed: $CORE_ADDRESS${NC}"
echo -e "${GREEN}   TX: $CORE_TX${NC}"

# Wait for confirmation
echo -e "${YELLOW}Waiting 30 seconds for block confirmation...${NC}"
sleep 30

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
  echo -e "${YELLOW}Core contract was deployed at: $CORE_ADDRESS${NC}"
  exit 1
fi

GUILD_ADDRESS=$(echo "$GUILD_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
GUILD_TX=$(echo "$GUILD_DEPLOY" | grep "Transaction hash:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowGuildStandalone deployed: $GUILD_ADDRESS${NC}"
echo -e "${GREEN}   TX: $GUILD_TX${NC}"

# Wait for confirmation
echo -e "${YELLOW}Waiting 30 seconds for block confirmation...${NC}"
sleep 30

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
  echo -e "${YELLOW}Deployed contracts:${NC}"
  echo -e "  Core:  $CORE_ADDRESS"
  echo -e "  Guild: $GUILD_ADDRESS"
  exit 1
fi

NFT_ADDRESS=$(echo "$NFT_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
NFT_TX=$(echo "$NFT_DEPLOY" | grep "Transaction hash:" | awk '{print $3}')
echo -e "${GREEN}✅ GmeowNFTStandalone deployed: $NFT_ADDRESS${NC}"
echo -e "${GREEN}   TX: $NFT_TX${NC}"

# Wait for confirmation
echo -e "${YELLOW}Waiting 30 seconds for block confirmation...${NC}"
sleep 30

# 4. Link contracts
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Linking Contracts${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Calling setGuildContract($GUILD_ADDRESS)...${NC}"
GUILD_LINK=$(cast send $CORE_ADDRESS \
  "setGuildContract(address)" \
  $GUILD_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to set guild contract${NC}"
  echo "$GUILD_LINK"
  exit 1
fi
GUILD_LINK_TX=$(echo "$GUILD_LINK" | grep "transactionHash" | awk '{print $2}')
echo -e "${GREEN}✅ Guild contract linked${NC}"
echo -e "${GREEN}   TX: $GUILD_LINK_TX${NC}"

echo -e "\n${YELLOW}Calling setNFTContractAddress($NFT_ADDRESS)...${NC}"
NFT_LINK=$(cast send $CORE_ADDRESS \
  "setNFTContractAddress(address)" \
  $NFT_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to set NFT contract${NC}"
  echo "$NFT_LINK"
  exit 1
fi
NFT_LINK_TX=$(echo "$NFT_LINK" | grep "transactionHash" | awk '{print $2}')
echo -e "${GREEN}✅ NFT contract linked${NC}"
echo -e "${GREEN}   TX: $NFT_LINK_TX${NC}"

# Save deployment info
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

cat > deployment-base-mainnet.json <<EOF
{
  "network": "base-mainnet",
  "chainId": $CHAIN_ID,
  "deployer": "$DEPLOYER",
  "oracle": "$ORACLE_ADDRESS",
  "contracts": {
    "GmeowCore": "$CORE_ADDRESS",
    "GmeowGuild": "$GUILD_ADDRESS",
    "GmeowNFT": "$NFT_ADDRESS"
  },
  "transactions": {
    "coreDeploy": "$CORE_TX",
    "guildDeploy": "$GUILD_TX",
    "nftDeploy": "$NFT_TX",
    "guildLink": "$GUILD_LINK_TX",
    "nftLink": "$NFT_LINK_TX"
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "architecture": "hybrid-standalone",
  "bonusValues": {
    "ogThreshold": 50000,
    "streak7Bonus": 15,
    "streak30Bonus": 30,
    "streak100Bonus": 60
  }
}
EOF

echo -e "\n${GREEN}Contract Addresses:${NC}"
echo -e "  GmeowCore:  ${YELLOW}$CORE_ADDRESS${NC}"
echo -e "  GmeowGuild: ${YELLOW}$GUILD_ADDRESS${NC}"
echo -e "  GmeowNFT:   ${YELLOW}$NFT_ADDRESS${NC}"

echo -e "\n${GREEN}✅ Deployment information saved to deployment-base-mainnet.json${NC}"

echo -e "\n${GREEN}Basescan Links:${NC}"
echo -e "  Core:  ${YELLOW}https://basescan.org/address/$CORE_ADDRESS${NC}"
echo -e "  Guild: ${YELLOW}https://basescan.org/address/$GUILD_ADDRESS${NC}"
echo -e "  NFT:   ${YELLOW}https://basescan.org/address/$NFT_ADDRESS${NC}"

echo -e "\n${GREEN}Next Steps:${NC}"
echo -e "  1. Verify contracts on Basescan:"
echo -e "     ${YELLOW}forge verify-contract $CORE_ADDRESS contract/GmeowCoreStandalone.sol:GmeowCore --chain-id $CHAIN_ID --watch${NC}"
echo -e "     ${YELLOW}forge verify-contract $GUILD_ADDRESS contract/GmeowGuildStandalone.sol:GmeowGuildStandalone --chain-id $CHAIN_ID --watch${NC}"
echo -e "     ${YELLOW}forge verify-contract $NFT_ADDRESS contract/GmeowNFTStandalone.sol:GmeowNFTStandalone --chain-id $CHAIN_ID --watch${NC}"
echo -e "\n  2. Update frontend with mainnet contract addresses"
echo -e "\n  3. Test all features on mainnet"
echo -e "\n  4. Announce launch! 🚀"

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
