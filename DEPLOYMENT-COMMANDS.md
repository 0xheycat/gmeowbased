# Quick Reference: Deployment Commands

## Initial Setup

```bash
# Set environment variables
export PRIVATE_KEY=0x...
export BASESCAN_API_KEY=...

# Verify you have test ETH on Sepolia
# Get from: https://sepoliafaucet.com/
```

## Deploy to Sepolia

```bash
# Deploy both contracts
./scripts/deploy-scoring-system.sh sepolia

# Check deployment
source .env.sepolia
echo "ScoringModule: $SCORING_MODULE_ADDRESS"
echo "GmeowCore: $GMEOW_CORE_ADDRESS"
```

## Test Deployed Contracts

```bash
# Test level calculation
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 300 --rpc-url https://sepolia.base.org
# Expected: 0x0000000000000000000000000000000000000000000000000000000000000002 (2)

cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url https://sepolia.base.org
# Expected: 0x0000000000000000000000000000000000000000000000000000000000000005 (5)

# Test rank tier
cast call $SCORING_MODULE_ADDRESS "getRankTier(uint256)" 1500 --rpc-url https://sepolia.base.org
# Expected: 0x0000000000000000000000000000000000000000000000000000000000000002 (tier 2 = Beacon Runner)

# Test multiplier
cast call $SCORING_MODULE_ADDRESS "getMultiplier(uint8)" 2 --rpc-url https://sepolia.base.org
# Expected: 0x000000000000000000000000000000000000000000000000000000000000044c (1100 = 1.1x)

# Test getUserStats (with a test address)
cast call $SCORING_MODULE_ADDRESS "getUserStats(address)" 0x1234567890123456789012345678901234567890 --rpc-url https://sepolia.base.org
# Returns: (level, tierIndex, totalScore, multiplier)

# Test total XP for level
cast call $SCORING_MODULE_ADDRESS "getTotalXpToReachLevel(uint256)" 10 --rpc-url https://sepolia.base.org
# Expected: 9900
```

## Add Test Points

```bash
# First, authorize yourself as an oracle
cast send $SCORING_MODULE_ADDRESS \
  "setAuthorizedOracle(address,bool)" $YOUR_ADDRESS true \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org

# Add points to a user
cast send $SCORING_MODULE_ADDRESS \
  "addPoints(address,uint256)" $TEST_USER_ADDRESS 1500 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org

# Check the user's stats
cast call $SCORING_MODULE_ADDRESS \
  "getUserStats(address)" $TEST_USER_ADDRESS \
  --rpc-url https://sepolia.base.org
```

## Deploy to Mainnet

```bash
# CAUTION: This deploys to mainnet with real ETH!
./scripts/deploy-scoring-system.sh mainnet

# Verify deployment
source .env
echo "ScoringModule: $SCORING_MODULE_ADDRESS"
echo "GmeowCore: $GMEOW_CORE_ADDRESS"
```

## Verify Contracts on BaseScan

```bash
# ScoringModule
forge verify-contract $SCORING_MODULE_ADDRESS \
  contract/modules/ScoringModule.sol:ScoringModule \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY

# GmeowCore
forge verify-contract $GMEOW_CORE_ADDRESS \
  contract/GmeowCore.sol:GmeowCore \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Generate ABIs

```bash
# Generate fresh ABIs
mkdir -p abi
forge inspect contract/modules/ScoringModule.sol:ScoringModule abi > abi/ScoringModule.json
forge inspect contract/GmeowCore.sol:GmeowCore abi > abi/GmeowCore.json

# View ABI
cat abi/ScoringModule.json | jq
```

## Run Tests

```bash
# All scoring tests
forge test --match-contract ScoringModuleTest

# Specific test
forge test --match-test testLevelCalculation_Level10 -vvv

# With gas reporting
forge test --match-contract ScoringModuleTest --gas-report

# Fork testing (after deployment)
forge test --fork-url https://sepolia.base.org
```

## Monitor Deployed Contract

```bash
# Get current block
cast block-number --rpc-url https://sepolia.base.org

# Get contract balance
cast balance $SCORING_MODULE_ADDRESS --rpc-url https://sepolia.base.org

# Get contract code (verify deployment)
cast code $SCORING_MODULE_ADDRESS --rpc-url https://sepolia.base.org

# Call any view function
cast call $SCORING_MODULE_ADDRESS "owner()(address)" --rpc-url https://sepolia.base.org
```

## Estimate Gas Costs

```bash
# Estimate addPoints gas cost
cast estimate $SCORING_MODULE_ADDRESS \
  "addPoints(address,uint256)" $USER_ADDRESS 1000 \
  --rpc-url https://sepolia.base.org

# Get current gas price
cast gas-price --rpc-url https://sepolia.base.org

# Calculate cost in ETH
# gas_used * gas_price / 1e18
```

## Debug Issues

```bash
# Get transaction receipt
cast receipt $TX_HASH --rpc-url https://sepolia.base.org

# Get transaction
cast tx $TX_HASH --rpc-url https://sepolia.base.org

# Decode transaction input
cast 4byte-decode $INPUT_DATA

# Call with increased verbosity
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 \
  --rpc-url https://sepolia.base.org \
  --trace
```

## Update Frontend

```bash
# Copy deployment addresses
cat .env.sepolia

# Update frontend .env.local
echo "NEXT_PUBLIC_SCORING_MODULE_ADDRESS=$SCORING_MODULE_ADDRESS" >> .env.local
echo "NEXT_PUBLIC_GMEOW_CORE_ADDRESS=$GMEOW_CORE_ADDRESS" >> .env.local

# Generate TypeScript types (if using typechain)
pnpm typechain --target ethers-v6 --out-dir types/contracts 'abi/*.json'
```

## Troubleshooting

### "Deployment failed"
```bash
# Check you have enough ETH
cast balance $YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Check nonce
cast nonce $YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Try with explicit gas
forge create contract/modules/ScoringModule.sol:ScoringModule \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --gas-limit 3000000
```

### "Contract not verified"
```bash
# Retry verification with constructor args if needed
forge verify-contract $SCORING_MODULE_ADDRESS \
  contract/modules/ScoringModule.sol:ScoringModule \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch
```

### "Calculation mismatch"
```bash
# Test locally first
forge test --match-test testLevelCalculation -vvv

# Compare on-chain vs local
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url https://sepolia.base.org
# vs
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url http://localhost:8545
```

## Useful Links

- **Base Sepolia Faucet**: https://sepoliafaucet.com/
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Base Mainnet Explorer**: https://basescan.org
- **Base Network Status**: https://status.base.org
- **Base Bridge**: https://bridge.base.org

## Environment Variables Reference

```bash
# Required for deployment
PRIVATE_KEY=0x...                           # Deployer wallet private key
BASESCAN_API_KEY=...                        # For contract verification

# Optional (uses defaults if not set)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org

# Generated by deployment script
SCORING_MODULE_ADDRESS=0x...                # Deployed ScoringModule
GMEOW_CORE_ADDRESS=0x...                    # Deployed GmeowCore
```

## Quick Deploy & Test Flow

```bash
# 1. Deploy
export PRIVATE_KEY=0x...
export BASESCAN_API_KEY=...
./scripts/deploy-scoring-system.sh sepolia

# 2. Load addresses
source .env.sepolia

# 3. Quick test
cast call $SCORING_MODULE_ADDRESS "calculateLevel(uint256)" 2600 --rpc-url https://sepolia.base.org

# 4. View on explorer
echo "https://sepolia.basescan.org/address/$SCORING_MODULE_ADDRESS"

# 5. Run full test suite
forge test --match-contract ScoringModuleTest

# ✅ If all pass, ready for mainnet!
```
