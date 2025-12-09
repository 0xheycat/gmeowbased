#!/bin/bash

# Foundry Contract Verification Script
# Professional pattern for verifying deployed contracts on Base

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contract addresses from CURRENT-TASK.md
GMEOW_CORE="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
GMEOW_GUILD="0x967457be45facE07c22c0374dAfBeF7b2f7cd059"
GMEOW_NFT="0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"
GMEOW_PROXY="0x6A48B758ed42d7c934D387164E60aa58A92eD206"

# Base chain configuration
CHAIN_ID="8453"
RPC_URL="https://mainnet.base.org"
EXPLORER_URL="https://basescan.org"
ETHERSCAN_API_KEY="${BASESCAN_API_KEY}"

# Compiler settings
SOLC_VERSION="0.8.23"
OPTIMIZER_RUNS="200"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Gmeowbased Contract Verification on Base            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}✗ Foundry not found. Please install: https://book.getfoundry.sh/getting-started/installation${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Foundry installed${NC}"

# Check for API key
if [ -z "$BASESCAN_API_KEY" ]; then
    echo -e "${YELLOW}⚠ BASESCAN_API_KEY not set in environment${NC}"
    echo -e "${YELLOW}  Get your API key from: https://basescan.org/myapikey${NC}"
    echo -e "${YELLOW}  Then export BASESCAN_API_KEY=your_api_key${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Basescan API key found${NC}"
echo ""

# Function to verify a contract
verify_contract() {
    local CONTRACT_NAME=$1
    local CONTRACT_ADDRESS=$2
    local CONTRACT_PATH=$3
    local CONSTRUCTOR_ARGS=$4
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Verifying: ${CONTRACT_NAME}${NC}"
    echo -e "${BLUE}Address: ${CONTRACT_ADDRESS}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Build forge verify-contract command
    CMD="forge verify-contract \
        --chain-id ${CHAIN_ID} \
        --num-of-optimizations ${OPTIMIZER_RUNS} \
        --compiler-version ${SOLC_VERSION} \
        --etherscan-api-key ${ETHERSCAN_API_KEY} \
        --watch \
        ${CONTRACT_ADDRESS} \
        ${CONTRACT_PATH}"
    
    # Add constructor args if provided
    if [ -n "$CONSTRUCTOR_ARGS" ]; then
        CMD="${CMD} --constructor-args ${CONSTRUCTOR_ARGS}"
    fi
    
    echo -e "${YELLOW}Running verification...${NC}"
    echo ""
    
    # Execute verification
    if eval $CMD; then
        echo ""
        echo -e "${GREEN}✓ ${CONTRACT_NAME} verified successfully!${NC}"
        echo -e "${GREEN}  View at: ${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ ${CONTRACT_NAME} verification failed${NC}"
        return 1
    fi
}

# Check if contracts are already verified
check_verification() {
    local CONTRACT_ADDRESS=$1
    local CONTRACT_NAME=$2
    
    echo -e "${YELLOW}Checking if ${CONTRACT_NAME} is already verified...${NC}"
    
    # Query Basescan API
    RESPONSE=$(curl -s "https://api.basescan.org/api?module=contract&action=getsourcecode&address=${CONTRACT_ADDRESS}&apikey=${BASESCAN_API_KEY}")
    
    if echo "$RESPONSE" | grep -q '"SourceCode":""'; then
        echo -e "${YELLOW}✗ Not verified${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Already verified${NC}"
        return 0
    fi
}

# Main verification workflow
main() {
    echo -e "${BLUE}Starting contract verification process...${NC}"
    echo ""
    
    # 1. Verify GmeowCore
    if check_verification "$GMEOW_CORE" "GmeowCore"; then
        echo -e "${GREEN}GmeowCore already verified, skipping...${NC}"
    else
        # Constructor requires oracle signer address
        # You need to provide the actual oracle signer used during deployment
        echo -e "${YELLOW}Please enter the oracle signer address used during deployment:${NC}"
        read -p "Oracle Signer: " ORACLE_SIGNER
        
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$ORACLE_SIGNER")
        
        verify_contract \
            "GmeowCore" \
            "$GMEOW_CORE" \
            "contract/GmeowCoreStandalone.sol:GmeowCore" \
            "$CONSTRUCTOR_ARGS"
    fi
    
    echo ""
    
    # 2. Verify GmeowGuild
    if check_verification "$GMEOW_GUILD" "GmeowGuild"; then
        echo -e "${GREEN}GmeowGuild already verified, skipping...${NC}"
    else
        echo -e "${YELLOW}Please enter the Core contract address used during GmeowGuild deployment:${NC}"
        read -p "Core Contract: " CORE_ADDRESS
        
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS")
        
        verify_contract \
            "GmeowGuild" \
            "$GMEOW_GUILD" \
            "contract/GmeowGuildStandalone.sol:GmeowGuildStandalone" \
            "$CONSTRUCTOR_ARGS"
    fi
    
    echo ""
    
    # 3. Verify GmeowNFT
    if check_verification "$GMEOW_NFT" "GmeowNFT"; then
        echo -e "${GREEN}GmeowNFT already verified, skipping...${NC}"
    else
        echo -e "${YELLOW}Please enter the Core contract address used during GmeowNFT deployment:${NC}"
        read -p "Core Contract: " CORE_ADDRESS_NFT
        
        CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS_NFT")
        
        verify_contract \
            "GmeowNFT" \
            "$GMEOW_NFT" \
            "contract/proxy/GmeowNFTImpl.sol:GmeowNFT" \
            "$CONSTRUCTOR_ARGS"
    fi
    
    echo ""
    
    # 4. Verify Proxy (if it's a standard proxy)
    echo -e "${YELLOW}Note: Proxy contracts often require special verification${NC}"
    echo -e "${YELLOW}Visit ${EXPLORER_URL}/proxyContractChecker?a=${GMEOW_PROXY}${NC}"
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Verification Complete!                               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "1. Update ABIs: ${YELLOW}npm run update:abis${NC}"
    echo -e "2. Test contracts: ${YELLOW}npx tsx scripts/test-referral-guild-contracts.ts${NC}"
    echo -e "3. Verify on Basescan UI for any failed verifications"
    echo ""
}

# Run main function
main

exit 0
