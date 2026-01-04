#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Scoring System Deployment Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if network argument provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Network not specified${NC}"
    echo "Usage: ./scripts/deploy-scoring-system.sh <network>"
    echo "Examples:"
    echo "  ./scripts/deploy-scoring-system.sh sepolia"
    echo "  ./scripts/deploy-scoring-system.sh mainnet"
    exit 1
fi

NETWORK=$1

# Set network-specific variables
if [ "$NETWORK" == "sepolia" ]; then
    RPC_URL=${BASE_SEPOLIA_RPC_URL:-"https://sepolia.base.org"}
    CHAIN_ID=84532
    EXPLORER_URL="https://sepolia.basescan.org"
    ENV_FILE=".env.sepolia"
elif [ "$NETWORK" == "mainnet" ]; then
    RPC_URL=${BASE_RPC_URL:-"https://mainnet.base.org"}
    CHAIN_ID=8453
    EXPLORER_URL="https://basescan.org"
    ENV_FILE=".env"
else
    echo -e "${RED}Error: Unknown network '$NETWORK'${NC}"
    echo "Supported networks: sepolia, mainnet"
    exit 1
fi

echo -e "${YELLOW}Network: ${NC}$NETWORK"
echo -e "${YELLOW}RPC URL: ${NC}$RPC_URL"
echo -e "${YELLOW}Chain ID: ${NC}$CHAIN_ID"
echo ""

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set${NC}"
    echo "Please set your PRIVATE_KEY environment variable"
    exit 1
fi

if [ -z "$BASESCAN_API_KEY" ]; then
    echo -e "${YELLOW}Warning: BASESCAN_API_KEY not set${NC}"
    echo "Contract verification will be skipped"
fi

echo -e "${BLUE}Step 1: Running tests...${NC}"
forge test --match-contract ScoringModuleTest
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

echo -e "${BLUE}Step 2: Compiling contracts...${NC}"
forge build
echo -e "${GREEN}✓ Contracts compiled${NC}"
echo ""

echo -e "${BLUE}Step 3: Deploying ScoringModule...${NC}"
SCORING_DEPLOY=$(forge create contract/modules/ScoringModule.sol:ScoringModule \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json)

SCORING_ADDRESS=$(echo $SCORING_DEPLOY | jq -r '.deployedTo')
SCORING_TX=$(echo $SCORING_DEPLOY | jq -r '.transactionHash')

if [ "$SCORING_ADDRESS" == "null" ] || [ -z "$SCORING_ADDRESS" ]; then
    echo -e "${RED}Failed to deploy ScoringModule${NC}"
    echo $SCORING_DEPLOY
    exit 1
fi

echo -e "${GREEN}✓ ScoringModule deployed${NC}"
echo -e "  Address: ${GREEN}$SCORING_ADDRESS${NC}"
echo -e "  TX: $EXPLORER_URL/tx/$SCORING_TX"
echo ""

echo -e "${BLUE}Step 4: Deploying GmeowCore...${NC}"
CORE_DEPLOY=$(forge create contract/GmeowCore.sol:GmeowCore \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json)

CORE_ADDRESS=$(echo $CORE_DEPLOY | jq -r '.deployedTo')
CORE_TX=$(echo $CORE_DEPLOY | jq -r '.transactionHash')

if [ "$CORE_ADDRESS" == "null" ] || [ -z "$CORE_ADDRESS" ]; then
    echo -e "${RED}Failed to deploy GmeowCore${NC}"
    echo $CORE_DEPLOY
    exit 1
fi

echo -e "${GREEN}✓ GmeowCore deployed${NC}"
echo -e "  Address: ${GREEN}$CORE_ADDRESS${NC}"
echo -e "  TX: $EXPLORER_URL/tx/$CORE_TX"
echo ""

echo -e "${BLUE}Step 5: Linking ScoringModule to GmeowCore...${NC}"
LINK_TX=$(cast send $CORE_ADDRESS \
    "setScoringModule(address)" $SCORING_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json | jq -r '.transactionHash')

echo -e "${GREEN}✓ ScoringModule linked${NC}"
echo -e "  TX: $EXPLORER_URL/tx/$LINK_TX"
echo ""

echo -e "${BLUE}Step 6: Authorizing GmeowCore in ScoringModule...${NC}"
AUTH_TX=$(cast send $SCORING_ADDRESS \
    "authorizeContract(address,bool)" $CORE_ADDRESS true \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json | jq -r '.transactionHash')

echo -e "${GREEN}✓ GmeowCore authorized${NC}"
echo -e "  TX: $EXPLORER_URL/tx/$AUTH_TX"
echo ""

# Verify contracts if BaseScan API key is set
if [ -n "$BASESCAN_API_KEY" ]; then
    echo -e "${BLUE}Step 7: Verifying contracts...${NC}"
    
    echo "Verifying ScoringModule..."
    forge verify-contract $SCORING_ADDRESS \
        contract/modules/ScoringModule.sol:ScoringModule \
        --chain-id $CHAIN_ID \
        --etherscan-api-key $BASESCAN_API_KEY \
        --watch || echo -e "${YELLOW}Warning: ScoringModule verification failed${NC}"
    
    echo "Verifying GmeowCore..."
    forge verify-contract $CORE_ADDRESS \
        contract/GmeowCore.sol:GmeowCore \
        --chain-id $CHAIN_ID \
        --etherscan-api-key $BASESCAN_API_KEY \
        --watch || echo -e "${YELLOW}Warning: GmeowCore verification failed${NC}"
    
    echo -e "${GREEN}✓ Verification complete${NC}"
    echo ""
fi

echo -e "${BLUE}Step 8: Generating ABIs...${NC}"
mkdir -p abi
forge inspect contract/modules/ScoringModule.sol:ScoringModule abi > abi/ScoringModule.json
forge inspect contract/GmeowCore.sol:GmeowCore abi > abi/GmeowCore.json
echo -e "${GREEN}✓ ABIs generated${NC}"
echo ""

echo -e "${BLUE}Step 9: Saving deployment addresses...${NC}"
cat > $ENV_FILE << EOF
# Scoring System Deployment ($NETWORK)
# Deployed: $(date)

SCORING_MODULE_ADDRESS=$SCORING_ADDRESS
GMEOW_CORE_ADDRESS=$CORE_ADDRESS

# Explorer URLs
SCORING_MODULE_EXPLORER=$EXPLORER_URL/address/$SCORING_ADDRESS
GMEOW_CORE_EXPLORER=$EXPLORER_URL/address/$CORE_ADDRESS

# Deployment TXs
SCORING_MODULE_TX=$SCORING_TX
GMEOW_CORE_TX=$CORE_TX
EOF

echo -e "${GREEN}✓ Addresses saved to $ENV_FILE${NC}"
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Deployment Complete! 🎉${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Deployed Contracts:${NC}"
echo -e "  ScoringModule: ${GREEN}$SCORING_ADDRESS${NC}"
echo -e "  GmeowCore:     ${GREEN}$CORE_ADDRESS${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update lib/contracts/addresses.ts with new addresses"
echo "2. Test on-chain: forge test --fork-url $RPC_URL"
echo "3. Update frontend API routes to use on-chain data"
echo "4. Monitor gas costs: cast estimate --rpc-url $RPC_URL"
echo ""
echo -e "${YELLOW}Verification URLs:${NC}"
echo "  ScoringModule: $EXPLORER_URL/address/$SCORING_ADDRESS"
echo "  GmeowCore:     $EXPLORER_URL/address/$CORE_ADDRESS"
echo ""
