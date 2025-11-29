#!/bin/bash

# Multi-Chain Proxy Deployment Script for Gmeow
# Supports: Optimism, Unichain, Celo, Arbitrum, and Ink

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$ORACLE_PRIVATE_KEY" ]; then
  echo -e "${RED}❌ Error: ORACLE_PRIVATE_KEY not set${NC}"
  echo "Please set your Oracle private key:"
  echo "export ORACLE_PRIVATE_KEY=your_private_key_here"
  exit 1
fi

# Get Oracle address from private key
ORACLE_ADDRESS=$(cast wallet address $ORACLE_PRIVATE_KEY)

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Gmeow Multi-Chain Proxy Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Oracle Address:${NC} $ORACLE_ADDRESS"
echo ""

# Network configurations
declare -A NETWORKS=(
  ["optimism"]="https://mainnet.optimism.io:10"
  ["unichain"]="https://sepolia.unichain.org:1301" 
  ["celo"]="https://forno.celo.org:42220"
  ["arbitrum"]="https://arb1.arbitrum.io/rpc:42161"
  ["ink"]="https://rpc-gel.inkonchain.com:57073"
)

# Function to deploy to a specific chain
deploy_to_chain() {
  local CHAIN_NAME=$1
  local RPC_URL=$(echo ${NETWORKS[$CHAIN_NAME]} | cut -d':' -f1)
  local CHAIN_ID=$(echo ${NETWORKS[$CHAIN_NAME]} | cut -d':' -f2)
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}   Deploying to $CHAIN_NAME (Chain ID: $CHAIN_ID)${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Check balance
  BALANCE=$(cast balance $ORACLE_ADDRESS --rpc-url $RPC_URL)
  echo -e "${YELLOW}Balance:${NC} $(cast --from-wei $BALANCE) ETH"
  
  if [ "$BALANCE" = "0" ]; then
    echo -e "${RED}❌ Insufficient balance on $CHAIN_NAME${NC}"
    return 1
  fi
  
  # Create deployment directory
  DEPLOY_DIR="deployments/$CHAIN_NAME-$(date +%Y%m%d-%H%M%S)"
  mkdir -p $DEPLOY_DIR
  
  echo -e "\n${YELLOW}[1/4] Deploying GmeowCore implementation...${NC}"
  CORE_RESULT=$(forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --private-key $ORACLE_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json)
  
  CORE_ADDRESS=$(echo $CORE_RESULT | jq -r '.deployedTo')
  CORE_TX=$(echo $CORE_RESULT | jq -r '.transactionHash')
  
  if [ "$CORE_ADDRESS" = "null" ] || [ -z "$CORE_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to deploy GmeowCore${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ GmeowCore: $CORE_ADDRESS${NC}"
  echo -e "   Tx: $CORE_TX"
  
  echo -e "\n${YELLOW}[2/4] Deploying GmeowGuild implementation...${NC}"
  GUILD_RESULT=$(forge create contract/proxy/GmeowGuild.sol:GmeowGuild \
    --private-key $ORACLE_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json)
  
  GUILD_ADDRESS=$(echo $GUILD_RESULT | jq -r '.deployedTo')
  GUILD_TX=$(echo $GUILD_RESULT | jq -r '.transactionHash')
  
  if [ "$GUILD_ADDRESS" = "null" ] || [ -z "$GUILD_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to deploy GmeowGuild${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ GmeowGuild: $GUILD_ADDRESS${NC}"
  echo -e "   Tx: $GUILD_TX"
  
  echo -e "\n${YELLOW}[3/4] Deploying GmeowNFTImpl implementation...${NC}"
  NFT_RESULT=$(forge create contract/proxy/GmeowNFTImpl.sol:GmeowNFTImpl \
    --private-key $ORACLE_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json)
  
  NFT_ADDRESS=$(echo $NFT_RESULT | jq -r '.deployedTo')
  NFT_TX=$(echo $NFT_RESULT | jq -r '.transactionHash')
  
  if [ "$NFT_ADDRESS" = "null" ] || [ -z "$NFT_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to deploy GmeowNFTImpl${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ GmeowNFTImpl: $NFT_ADDRESS${NC}"
  echo -e "   Tx: $NFT_TX"
  
  echo -e "\n${YELLOW}[4/4] Deploying GmeowProxy...${NC}"
  PROXY_RESULT=$(forge create contract/proxy/GmeowProxy.sol:GmeowProxy \
    --constructor-args $CORE_ADDRESS $GUILD_ADDRESS $NFT_ADDRESS \
    --private-key $ORACLE_PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --json)
  
  PROXY_ADDRESS=$(echo $PROXY_RESULT | jq -r '.deployedTo')
  PROXY_TX=$(echo $PROXY_RESULT | jq -r '.transactionHash')
  
  if [ "$PROXY_ADDRESS" = "null" ] || [ -z "$PROXY_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to deploy GmeowProxy${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ GmeowProxy: $PROXY_ADDRESS${NC}"
  echo -e "   Tx: $PROXY_TX"
  
  # Initialize the proxy
  echo -e "\n${YELLOW}[5/5] Initializing contract...${NC}"
  INIT_TX=$(cast send $PROXY_ADDRESS \
    "initialize(address)" $ORACLE_ADDRESS \
    --private-key $ORACLE_PRIVATE_KEY \
    --rpc-url $RPC_URL)
  
  echo -e "${GREEN}✅ Initialized with Oracle: $ORACLE_ADDRESS${NC}"
  echo -e "   Init Tx: $INIT_TX"
  
  # Get badge contract address
  BADGE_ADDRESS=$(cast call $PROXY_ADDRESS "badgeContract()" --rpc-url $RPC_URL | cast --to-checksum-address)
  
  # Create deployment record
  cat > $DEPLOY_DIR/deployment.json << EOF
{
  "network": "$CHAIN_NAME",
  "chainId": $CHAIN_ID,
  "rpcUrl": "$RPC_URL",
  "deployedAt": "$(date -Iseconds)",
  "deployer": "$ORACLE_ADDRESS",
  "implementations": {
    "core": "$CORE_ADDRESS",
    "guild": "$GUILD_ADDRESS", 
    "nft": "$NFT_ADDRESS"
  },
  "proxy": "$PROXY_ADDRESS",
  "badgeContract": "$BADGE_ADDRESS",
  "oracleSigner": "$ORACLE_ADDRESS",
  "transactions": {
    "core": "$CORE_TX",
    "guild": "$GUILD_TX",
    "nft": "$NFT_TX",
    "proxy": "$PROXY_TX",
    "initialize": "$INIT_TX"
  }
}
EOF
  
  echo -e "\n${GREEN}✅ $CHAIN_NAME deployment complete!${NC}"
  echo -e "${GREEN}⭐ Main Contract Address: $PROXY_ADDRESS${NC}"
  echo -e "${GREEN}💾 Saved to: $DEPLOY_DIR/deployment.json${NC}"
  
  return 0
}

# Main execution
SELECTED_CHAINS=()

# Parse command line arguments or default to all chains
if [ $# -eq 0 ]; then
  echo -e "${YELLOW}No chains specified. Deploying to all chains...${NC}"
  SELECTED_CHAINS=("optimism" "unichain" "celo" "arbitrum" "ink")
else
  SELECTED_CHAINS=("$@")
fi

echo -e "${BLUE}Selected chains:${NC} ${SELECTED_CHAINS[*]}"
echo ""

# Confirm deployment
read -p "Do you want to proceed with deployment? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Deploy to each selected chain
SUCCESSFUL_DEPLOYMENTS=()
FAILED_DEPLOYMENTS=()

for CHAIN in "${SELECTED_CHAINS[@]}"; do
  if [[ -v NETWORKS[$CHAIN] ]]; then
    if deploy_to_chain $CHAIN; then
      SUCCESSFUL_DEPLOYMENTS+=($CHAIN)
    else
      FAILED_DEPLOYMENTS+=($CHAIN)
    fi
    echo ""
  else
    echo -e "${RED}❌ Unknown chain: $CHAIN${NC}"
    echo -e "Available chains: ${!NETWORKS[*]}"
    FAILED_DEPLOYMENTS+=($CHAIN)
  fi
done

# Final summary
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Summary${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

if [ ${#SUCCESSFUL_DEPLOYMENTS[@]} -gt 0 ]; then
  echo -e "${GREEN}✅ Successful deployments:${NC}"
  for chain in "${SUCCESSFUL_DEPLOYMENTS[@]}"; do
    echo -e "   • $chain"
  done
fi

if [ ${#FAILED_DEPLOYMENTS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Failed deployments:${NC}"
  for chain in "${FAILED_DEPLOYMENTS[@]}"; do
    echo -e "   • $chain"
  done
fi

echo -e "\n${YELLOW}📁 Deployment records saved in: deployments/${NC}"
echo -e "${YELLOW}🔍 Check transaction status on respective block explorers${NC}"