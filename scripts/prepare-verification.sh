#!/bin/bash

# Quick Contract Verification Script
# Professional pattern: Check oracle signer and verify all contracts

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Getting Oracle Signer from Deployed Contract${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
RPC_URL="https://mainnet.base.org"

echo -e "${YELLOW}Reading oracle signer from Core contract...${NC}"
ORACLE_SIGNER=$(cast call $CORE_ADDRESS \
  "oracleSigner()(address)" \
  --rpc-url $RPC_URL)

echo -e "${GREEN}✓ Oracle Signer: ${ORACLE_SIGNER}${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Encoding Constructor Arguments${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CORE_CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$ORACLE_SIGNER")
GUILD_CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS")
NFT_CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$CORE_ADDRESS")

echo -e "${GREEN}✓ Core Constructor Args: ${CORE_CONSTRUCTOR_ARGS}${NC}"
echo -e "${GREEN}✓ Guild Constructor Args: ${GUILD_CONSTRUCTOR_ARGS}${NC}"
echo -e "${GREEN}✓ NFT Constructor Args: ${NFT_CONSTRUCTOR_ARGS}${NC}"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Ready for Verification!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}To verify contracts, run one of:${NC}"
echo ""
echo -e "${GREEN}1. Automated (Interactive):${NC}"
echo -e "   npm run contracts:verify"
echo ""
echo -e "${GREEN}2. Manual - GmeowCore:${NC}"
echo -e "   forge verify-contract \\"
echo -e "     --chain-id 8453 \\"
echo -e "     --num-of-optimizations 200 \\"
echo -e "     --compiler-version 0.8.23 \\"
echo -e "     --etherscan-api-key \$BASESCAN_API_KEY \\"
echo -e "     --constructor-args ${CORE_CONSTRUCTOR_ARGS} \\"
echo -e "     --watch \\"
echo -e "     ${CORE_ADDRESS} \\"
echo -e "     contract/GmeowCoreStandalone.sol:GmeowCore"
echo ""
echo -e "${GREEN}3. Manual - GmeowGuild:${NC}"
echo -e "   forge verify-contract \\"
echo -e "     --chain-id 8453 \\"
echo -e "     --num-of-optimizations 200 \\"
echo -e "     --compiler-version 0.8.23 \\"
echo -e "     --etherscan-api-key \$BASESCAN_API_KEY \\"
echo -e "     --constructor-args ${GUILD_CONSTRUCTOR_ARGS} \\"
echo -e "     --watch \\"
echo -e "     0x967457be45facE07c22c0374dAfBeF7b2f7cd059 \\"
echo -e "     contract/GmeowGuildStandalone.sol:GmeowGuildStandalone"
echo ""
echo -e "${GREEN}4. Manual - GmeowNFT:${NC}"
echo -e "   forge verify-contract \\"
echo -e "     --chain-id 8453 \\"
echo -e "     --num-of-optimizations 200 \\"
echo -e "     --compiler-version 0.8.23 \\"
echo -e "     --etherscan-api-key \$BASESCAN_API_KEY \\"
echo -e "     --constructor-args ${NFT_CONSTRUCTOR_ARGS} \\"
echo -e "     --watch \\"
echo -e "     0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20 \\"
echo -e "     contract/proxy/GmeowNFTImpl.sol:GmeowNFT"
echo ""
echo -e "${BLUE}After verification, run:${NC}"
echo -e "   npm run update:abis        # Update ABIs from Basescan"
echo -e "   npm run contracts:test     # Test contract functions"
echo ""
