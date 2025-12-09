#!/bin/bash
#################################################################################
# Professional Contract Verification Script
# Verifies all deployed Gmeowbased contracts on Basescan
# Uses multiple strategies: standard verification, flattened contracts, and manual
#################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Contract addresses
CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
GUILD_ADDRESS="0x967457be45facE07c22c0374dAfBeF7b2f7cd059"
NFT_ADDRESS="0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"
PROXY_ADDRESS="0x6A48B758ed42d7c934D387164E60aa58A92eD206"

# Constructor args (encoded)
CORE_CONSTRUCTOR="0x0000000000000000000000008870c155666809609176260f2b65a626c000d773"
GUILD_CONSTRUCTOR="0x0000000000000000000000009bdd11aa50456572e3ea5329fcdeb81974137f92"
NFT_CONSTRUCTOR="0x0000000000000000000000009bdd11aa50456572e3ea5329fcdeb81974137f92"

# Chain config
CHAIN_ID=8453
COMPILER_VERSION="0.8.23"
OPTIMIZATION_RUNS=200

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Professional Contract Verification Suite${NC}"
echo -e "${CYAN}  Base Mainnet (Chain ID: $CHAIN_ID)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load API key
if [ -f .env.local ]; then
    export $(grep BASESCAN_API_KEY .env.local | xargs)
fi

if [ -z "$BASESCAN_API_KEY" ]; then
    echo -e "${RED}❌ BASESCAN_API_KEY not found in .env.local${NC}"
    exit 1
fi

# Function to verify contract
verify_contract() {
    local name=$1
    local address=$2
    local contract_path=$3
    local constructor_args=$4
    
    echo -e "\n${BLUE}━━━ Verifying $name ━━━${NC}"
    echo "Address: $address"
    echo "Contract: $contract_path"
    
    # Try standard verification first
    echo -e "${YELLOW}Strategy 1: Standard verification...${NC}"
    if forge verify-contract \
        --chain-id $CHAIN_ID \
        --num-of-optimizations $OPTIMIZATION_RUNS \
        --compiler-version $COMPILER_VERSION \
        --etherscan-api-key $BASESCAN_API_KEY \
        --constructor-args "$constructor_args" \
        --watch \
        "$address" \
        "$contract_path" 2>&1 | tee /tmp/verify_output.txt; then
        
        if grep -q "already verified\|Contract successfully verified" /tmp/verify_output.txt; then
            echo -e "${GREEN}✅ $name verified successfully!${NC}"
            return 0
        fi
    fi
    
    # If failed, try flattened version
    echo -e "${YELLOW}Strategy 2: Flattened contract...${NC}"
    local contract_file=$(echo "$contract_path" | cut -d: -f1)
    local contract_name=$(echo "$contract_path" | cut -d: -f2)
    local flattened_file="/tmp/${contract_name}_flattened.sol"
    
    if forge flatten "$contract_file" > "$flattened_file" 2>/dev/null; then
        echo "Created flattened contract: $flattened_file"
        echo -e "${YELLOW}Please verify manually at:${NC}"
        echo "https://basescan.org/verifyContract"
        echo ""
        echo "Settings:"
        echo "  - Compiler: v$COMPILER_VERSION"
        echo "  - Optimization: Yes, $OPTIMIZATION_RUNS runs"
        echo "  - Constructor Args: $constructor_args"
        echo "  - Flattened source: $flattened_file"
        echo ""
    fi
    
    echo -e "${YELLOW}⚠️  $name requires manual verification${NC}"
    return 1
}

# Function to check if contract is verified
check_verification() {
    local address=$1
    local name=$2
    
    echo -e "\n${CYAN}Checking $name verification status...${NC}"
    
    # Try to get source code from Basescan
    local response=$(curl -s "https://api.basescan.org/api?module=contract&action=getsourcecode&address=$address&apikey=$BASESCAN_API_KEY")
    
    if echo "$response" | jq -e '.result[0].SourceCode' | grep -q "pragma"; then
        echo -e "${GREEN}✅ $name is already verified${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name not verified yet${NC}"
        return 1
    fi
}

# Check current verification status
echo -e "${CYAN}━━━ Current Verification Status ━━━${NC}"
check_verification "$CORE_ADDRESS" "GmeowCore" || VERIFY_CORE=1
check_verification "$GUILD_ADDRESS" "GmeowGuild" || VERIFY_GUILD=1
check_verification "$NFT_ADDRESS" "GmeowNFT" || VERIFY_NFT=1

echo ""
echo -e "${CYAN}━━━ Starting Verification Process ━━━${NC}"

# Verify GmeowCore
if [ ! -z "$VERIFY_CORE" ]; then
    verify_contract "GmeowCore" "$CORE_ADDRESS" "contract/GmeowCoreStandalone.sol:GmeowCore" "$CORE_CONSTRUCTOR"
fi

# Verify GmeowGuild
if [ ! -z "$VERIFY_GUILD" ]; then
    # Try multiple contract paths
    for path in "contract/proxy/GmeowGuild.sol:GmeowGuild" "contract/GmeowGuildStandalone.sol:GmeowGuild"; do
        echo -e "${YELLOW}Trying: $path${NC}"
        if [ -f "$(echo $path | cut -d: -f1)" ]; then
            verify_contract "GmeowGuild" "$GUILD_ADDRESS" "$path" "$GUILD_CONSTRUCTOR"
            break
        fi
    done
fi

# Verify GmeowNFT
if [ ! -z "$VERIFY_NFT" ]; then
    # Try multiple contract paths
    for path in "contract/GmeowNFT.sol:GmeowNFT" "contract/proxy/GmeowNFTImpl.sol:GmeowNFT" "contract/GmeowNFTStandalone.sol:GmeowNFTStandalone"; do
        echo -e "${YELLOW}Trying: $path${NC}"
        if [ -f "$(echo $path | cut -d: -f1)" ]; then
            verify_contract "GmeowNFT" "$NFT_ADDRESS" "$path" "$NFT_CONSTRUCTOR"
            break
        fi
    done
fi

# Final status check
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Final Verification Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_verification "$CORE_ADDRESS" "GmeowCore"
check_verification "$GUILD_ADDRESS" "GmeowGuild"
check_verification "$NFT_ADDRESS" "GmeowNFT"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Verification process completed!${NC}"
echo ""
echo "Next steps if contracts need manual verification:"
echo "1. Flattened sources in /tmp/*_flattened.sol"
echo "2. Visit: https://basescan.org/verifyContract"
echo "3. Use compiler version: $COMPILER_VERSION"
echo "4. Enable optimization: $OPTIMIZATION_RUNS runs"
echo "5. Use constructor args from above"
echo ""
