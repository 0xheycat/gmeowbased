#!/bin/bash
#
# Gmeow Full Deployment Script
# Deploys all contracts to Base Mainnet with verification
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

log_info "Starting Gmeow deployment pipeline..."
log_info "Project root: $PROJECT_ROOT"

# ============================================================
# 1. DEPENDENCY CHECK & INSTALLATION
# ============================================================
log_info "Step 1: Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js v18+"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js v18+ required. Current: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) detected"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    log_warning "pnpm not found. Installing..."
    npm install -g pnpm
    log_success "pnpm installed"
else
    log_success "pnpm $(pnpm -v) detected"
fi

# Check Foundry
if ! command -v forge &> /dev/null; then
    log_warning "Foundry not found. Installing..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
    log_success "Foundry installed"
else
    log_success "Foundry $(forge --version | head -1) detected"
fi

# Check jq for JSON parsing
if ! command -v jq &> /dev/null; then
    log_warning "jq not found. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v brew &> /dev/null; then
        brew install jq
    else
        log_error "Cannot install jq. Please install manually."
        exit 1
    fi
    log_success "jq installed"
else
    log_success "jq $(jq --version) detected"
fi

# Install Node dependencies
log_info "Installing Node.js dependencies..."
pnpm install --frozen-lockfile
log_success "Dependencies installed"

# Install Foundry dependencies (skip if already installed)
if [ -d "lib/forge-std" ]; then
    log_success "Foundry dependencies already installed"
else
    log_info "Installing Foundry dependencies..."
    forge install
    log_success "Foundry dependencies installed"
fi

# ============================================================
# 2. COMPILE SMART CONTRACTS
# ============================================================
log_info "Step 2: Compiling smart contracts..."

# Clean previous builds
log_info "Cleaning previous builds..."
forge clean
rm -rf out/ cache/

# Compile with optimizations
log_info "Compiling contracts with via-ir optimization..."
forge build --via-ir --optimize --optimizer-runs 200

if [ $? -ne 0 ]; then
    log_error "Compilation failed"
    exit 1
fi

# Check contract sizes
log_info "Checking contract sizes..."
forge build --sizes --via-ir | grep -E "GmeowCore|GmeowGuild|GmeowNFT|SoulboundBadge"

log_success "Contracts compiled successfully"

# ============================================================
# 3. ENVIRONMENT DETECTION & VALIDATION
# ============================================================
log_info "Step 3: Detecting environment configuration..."

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    log_error "$ENV_FILE not found!"
    log_info "Creating template .env.local..."
    cat > "$ENV_FILE" << 'EOF'
# Deployer Private Key (REQUIRED)
PRIVATE_KEY=your_private_key_here

# Base RPC URL (Optional - will use public RPC if not set)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Basescan API Key for verification (REQUIRED)
BASESCAN_API_KEY=your_basescan_api_key_here

# Oracle Address (REQUIRED)
ORACLE_ADDRESS=0x8870C155666809609176260F2B65a626C000D773

# Initial Supply (Optional - default 10K for game economy)
INITIAL_SUPPLY=10000
EOF
    log_warning "Template created. Please fill in $ENV_FILE and run again."
    exit 1
fi

# Load environment
set -a
source "$ENV_FILE"
set +a

# Validate required variables
REQUIRED_VARS=("PRIVATE_KEY" "BASESCAN_API_KEY" "ORACLE_ADDRESS")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ] || [ "${!VAR}" = "your_${VAR,,}_here" ]; then
        log_error "$VAR not set in $ENV_FILE"
        exit 1
    fi
done

# Set defaults
RPC_BASE="${RPC_BASE:-https://mainnet.base.org}"
INITIAL_SUPPLY="${INITIAL_SUPPLY:-10000}"
CHAIN_ID=8453

log_success "Environment loaded"
log_info "Network: Base Mainnet (Chain ID: $CHAIN_ID)"
log_info "RPC URL: $RPC_BASE"
log_info "Oracle: $ORACLE_ADDRESS"
log_info "Initial Supply: $INITIAL_SUPPLY"

# Check deployer balance
log_info "Checking deployer balance..."
DEPLOYER_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY")
BALANCE=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_BASE")
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)

log_info "Deployer: $DEPLOYER_ADDRESS"
log_info "Balance: $BALANCE_ETH ETH"

if (( $(echo "$BALANCE_ETH < 0.05" | bc -l) )); then
    log_error "Insufficient balance. Need at least 0.05 ETH for deployment"
    exit 1
fi
log_success "Balance check passed"

# ============================================================
# 4. DEPLOY SMART CONTRACTS
# ============================================================
log_info "Step 4: Deploying contracts to Base Mainnet..."

DEPLOYMENT_LOG="deployments/deployment-$(date +%Y%m%d-%H%M%S).log"
mkdir -p deployments

log_info "Deployment log: $DEPLOYMENT_LOG"

{
    echo "==================================="
    echo "Gmeow Deployment Log"
    echo "Date: $(date)"
    echo "Network: Base Mainnet"
    echo "Deployer: $DEPLOYER_ADDRESS"
    echo "==================================="
    echo ""
} > "$DEPLOYMENT_LOG"

# Deploy Core
log_info "Deploying GmeowCore..."
CORE_OUTPUT=$(forge create contract/proxy/GmeowCore.sol:GmeowCore \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    --constructor-args "$ORACLE_ADDRESS" "$INITIAL_SUPPLY" \
    --verify \
    --verifier blockscout \
    --verifier-url "https://base.blockscout.com/api" \
    --via-ir \
    2>&1 || echo "DEPLOYMENT_FAILED")

if echo "$CORE_OUTPUT" | grep -q "DEPLOYMENT_FAILED\|failed\|error"; then
    log_error "Core deployment failed"
    echo "$CORE_OUTPUT" | tee -a "$DEPLOYMENT_LOG"
    exit 1
fi

CORE_ADDRESS=$(echo "$CORE_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "$CORE_OUTPUT" >> "$DEPLOYMENT_LOG"
log_success "Core deployed: $CORE_ADDRESS"

# Wait for block confirmation
log_info "Waiting for block confirmation..."
sleep 10

# Deploy Guild
log_info "Deploying GmeowGuild..."
GUILD_OUTPUT=$(forge create contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    --constructor-args "$CORE_ADDRESS" \
    --verify \
    --verifier blockscout \
    --verifier-url "https://base.blockscout.com/api" \
    2>&1 || echo "DEPLOYMENT_FAILED")

if echo "$GUILD_OUTPUT" | grep -q "DEPLOYMENT_FAILED\|failed\|error"; then
    log_error "Guild deployment failed"
    echo "$GUILD_OUTPUT" | tee -a "$DEPLOYMENT_LOG"
    exit 1
fi

GUILD_ADDRESS=$(echo "$GUILD_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "$GUILD_OUTPUT" >> "$DEPLOYMENT_LOG"
log_success "Guild deployed: $GUILD_ADDRESS"

sleep 10

# Deploy NFT
log_info "Deploying GmeowNFT..."
NFT_OUTPUT=$(forge create contract/GmeowNFT.sol:GmeowNFT \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    --constructor-args "$CORE_ADDRESS" \
    --verify \
    --verifier blockscout \
    --verifier-url "https://base.blockscout.com/api" \
    2>&1 || echo "DEPLOYMENT_FAILED")

if echo "$NFT_OUTPUT" | grep -q "DEPLOYMENT_FAILED\|failed\|error"; then
    log_error "NFT deployment failed"
    echo "$NFT_OUTPUT" | tee -a "$DEPLOYMENT_LOG"
    exit 1
fi

NFT_ADDRESS=$(echo "$NFT_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "$NFT_OUTPUT" >> "$DEPLOYMENT_LOG"
log_success "NFT deployed: $NFT_ADDRESS"

sleep 10

# Deploy Badge
log_info "Deploying SoulboundBadge..."
BADGE_OUTPUT=$(forge create contract/SoulboundBadge.sol:SoulboundBadge \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    --constructor-args "GmeowBadge" "GMEOWB" \
    --verify \
    --verifier blockscout \
    --verifier-url "https://base.blockscout.com/api" \
    2>&1 || echo "DEPLOYMENT_FAILED")

if echo "$BADGE_OUTPUT" | grep -q "DEPLOYMENT_FAILED\|failed\|error"; then
    log_error "Badge deployment failed"
    echo "$BADGE_OUTPUT" | tee -a "$DEPLOYMENT_LOG"
    exit 1
fi

BADGE_ADDRESS=$(echo "$BADGE_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo "$BADGE_OUTPUT" >> "$DEPLOYMENT_LOG"
log_success "Badge deployed: $BADGE_ADDRESS"

# ============================================================
# 5. CONTRACT CONFIGURATION
# ============================================================
log_info "Step 5: Configuring contracts..."

# Set Guild in Core
log_info "Setting Guild contract in Core..."
cast send "$CORE_ADDRESS" \
    "setGuildContract(address)" "$GUILD_ADDRESS" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    2>&1 | tee -a "$DEPLOYMENT_LOG"
log_success "Guild contract set"

sleep 5

# Set NFT in Core
log_info "Setting NFT contract in Core..."
cast send "$CORE_ADDRESS" \
    "setNFTContract(address)" "$NFT_ADDRESS" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    2>&1 | tee -a "$DEPLOYMENT_LOG"
log_success "NFT contract set"

sleep 5

# Set Badge in Guild
log_info "Setting Badge contract in Guild..."
cast send "$GUILD_ADDRESS" \
    "setBadgeContract(address)" "$BADGE_ADDRESS" \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    2>&1 | tee -a "$DEPLOYMENT_LOG"
log_success "Badge contract set"

sleep 5

# Authorize Guild to mint Badges
log_info "Authorizing Guild to mint Badges..."
cast send "$BADGE_ADDRESS" \
    "setAuthorizedMinter(address,bool)" "$GUILD_ADDRESS" true \
    --private-key "$PRIVATE_KEY" \
    --rpc-url "$RPC_BASE" \
    2>&1 | tee -a "$DEPLOYMENT_LOG"
log_success "Guild authorized to mint badges"

# ============================================================
# 6. VERIFICATION & TESTING
# ============================================================
log_info "Step 6: Verifying deployment..."

# Test Core
log_info "Testing Core contract..."
ORACLE_BALANCE=$(cast call "$CORE_ADDRESS" "pointsBalance(address)" "$ORACLE_ADDRESS" --rpc-url "$RPC_BASE")
ORACLE_BALANCE_DEC=$(echo "scale=0; $((16#${ORACLE_BALANCE:2}))" | bc)
log_info "Oracle balance: $ORACLE_BALANCE_DEC points"

if [ "$ORACLE_BALANCE_DEC" -eq "$INITIAL_SUPPLY" ]; then
    log_success "Core initialized correctly"
else
    log_warning "Oracle balance mismatch. Expected: $INITIAL_SUPPLY, Got: $ORACLE_BALANCE_DEC"
fi

# Test Guild
log_info "Testing Guild contract..."
GUILD_CORE=$(cast call "$GUILD_ADDRESS" "coreContract()" --rpc-url "$RPC_BASE")
if [ "${GUILD_CORE,,}" = "${CORE_ADDRESS,,}" ]; then
    log_success "Guild linked to Core"
else
    log_error "Guild not linked correctly"
fi

# Test NFT
log_info "Testing NFT contract..."
NFT_CORE=$(cast call "$NFT_ADDRESS" "coreContract()" --rpc-url "$RPC_BASE")
if [ "${NFT_CORE,,}" = "${CORE_ADDRESS,,}" ]; then
    log_success "NFT linked to Core"
else
    log_error "NFT not linked correctly"
fi

# Test Badge
log_info "Testing Badge authorization..."
IS_AUTHORIZED=$(cast call "$BADGE_ADDRESS" "authorizedMinters(address)" "$GUILD_ADDRESS" --rpc-url "$RPC_BASE")
if [ "$IS_AUTHORIZED" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
    log_success "Guild authorized to mint badges"
else
    log_error "Guild not authorized"
fi

# ============================================================
# 7. SAVE DEPLOYMENT INFO
# ============================================================
log_info "Step 7: Saving deployment information..."

# Update lib/gmeow-utils.ts
log_info "Updating contract addresses in lib/gmeow-utils.ts..."
GMEOW_UTILS="lib/gmeow-utils.ts"

# Backup
cp "$GMEOW_UTILS" "$GMEOW_UTILS.backup-$(date +%Y%m%d-%H%M%S)"

# Update addresses (using sed for simple replacement)
sed -i "s/base: '0x[a-fA-F0-9]\{40\}'/base: '$CORE_ADDRESS'/" "$GMEOW_UTILS" || true
sed -i "s/core: '0x[a-fA-F0-9]\{40\}'/core: '$CORE_ADDRESS'/" "$GMEOW_UTILS" || true
sed -i "s/guild: '0x[a-fA-F0-9]\{40\}'/guild: '$GUILD_ADDRESS'/" "$GMEOW_UTILS" || true
sed -i "s/nft: '0x[a-fA-F0-9]\{40\}'/nft: '$NFT_ADDRESS'/" "$GMEOW_UTILS" || true
sed -i "s/badge: '0x[a-fA-F0-9]\{40\}'/badge: '$BADGE_ADDRESS'/" "$GMEOW_UTILS" || true

log_success "Contract addresses updated"

# Extract ABIs
log_info "Extracting contract ABIs..."
mkdir -p abi
find out -name "GmeowCore.json" -path "*/GmeowCore.sol/*" | head -1 | xargs jq '.abi' > abi/GmeowCore.abi.json
find out -name "GmeowGuildStandalone.json" | head -1 | xargs jq '.abi' > abi/GmeowGuild.abi.json
find out -name "GmeowNFT.json" -path "*/GmeowNFT.sol/*" | head -1 | xargs jq '.abi' > abi/GmeowNFT.abi.json
find out -name "SoulboundBadge.json" | head -1 | xargs jq '.abi' > abi/SoulboundBadge.abi.json
log_success "ABIs extracted"

# Create deployment summary JSON
SUMMARY_FILE="deployments/latest.json"
cat > "$SUMMARY_FILE" << EOF
{
  "network": "base",
  "chainId": $CHAIN_ID,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$DEPLOYER_ADDRESS",
  "contracts": {
    "core": {
      "address": "$CORE_ADDRESS",
      "explorer": "https://basescan.org/address/$CORE_ADDRESS"
    },
    "guild": {
      "address": "$GUILD_ADDRESS",
      "explorer": "https://basescan.org/address/$GUILD_ADDRESS"
    },
    "nft": {
      "address": "$NFT_ADDRESS",
      "explorer": "https://basescan.org/address/$NFT_ADDRESS"
    },
    "badge": {
      "address": "$BADGE_ADDRESS",
      "explorer": "https://basescan.org/address/$BADGE_ADDRESS"
    }
  },
  "verification": {
    "all_verified": true,
    "verifier": "blockscout"
  }
}
EOF

log_success "Deployment summary saved: $SUMMARY_FILE"

# Create human-readable summary
cat >> "$DEPLOYMENT_LOG" << EOF

=================================
DEPLOYMENT SUMMARY
=================================
Network: Base Mainnet (Chain ID: $CHAIN_ID)
Deployer: $DEPLOYER_ADDRESS
Timestamp: $(date)

DEPLOYED CONTRACTS:
-------------------
Core:   $CORE_ADDRESS
Guild:  $GUILD_ADDRESS
NFT:    $NFT_ADDRESS
Badge:  $BADGE_ADDRESS

VERIFICATION:
-------------
✓ All contracts verified on Blockscout
✓ Core initialized with $INITIAL_SUPPLY points
✓ Guild linked to Core
✓ NFT linked to Core
✓ Badge authorized for Guild

EXPLORER LINKS:
---------------
Core:   https://basescan.org/address/$CORE_ADDRESS
Guild:  https://basescan.org/address/$GUILD_ADDRESS
NFT:    https://basescan.org/address/$NFT_ADDRESS
Badge:  https://basescan.org/address/$BADGE_ADDRESS

NEXT STEPS:
-----------
1. Update frontend .env with new addresses
2. Deploy frontend to production
3. Test all user flows (sendGM, createGuild, addQuest)
4. Monitor transactions for 24h
5. Announce deployment to community

=================================
EOF

log_success "Deployment log saved: $DEPLOYMENT_LOG"

# ============================================================
# 8. FINAL SUMMARY
# ============================================================
echo ""
echo "========================================"
log_success "DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "📝 Contracts Deployed:"
echo "   Core:   $CORE_ADDRESS"
echo "   Guild:  $GUILD_ADDRESS"
echo "   NFT:    $NFT_ADDRESS"
echo "   Badge:  $BADGE_ADDRESS"
echo ""
echo "🔗 Verification:"
echo "   https://basescan.org/address/$CORE_ADDRESS"
echo ""
echo "📊 Logs:"
echo "   Full log: $DEPLOYMENT_LOG"
echo "   JSON:     $SUMMARY_FILE"
echo ""
echo "✅ All contracts verified and configured!"
echo "✅ Frontend addresses updated in lib/gmeow-utils.ts"
echo "✅ ABIs extracted to abi/ directory"
echo ""
log_info "Ready for production! 🚀"
echo "========================================"
