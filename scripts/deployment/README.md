# 🚀 Gmeow Multi-Chain Deployment Guide

This guide covers deploying Gmeow contracts across all supported chains with proxy architecture.

## 📁 Directory Structure

```
scripts/deployment/
├── deploy-all.sh          # Master deployment script with interactive menu
├── deploy-base.sh         # Base Mainnet (Chain ID: 8453)
├── deploy-optimism.sh     # Optimism Mainnet (Chain ID: 10)
├── deploy-unichain.sh     # Unichain Mainnet (Chain ID: 1301)
├── deploy-celo.sh         # Celo Mainnet (Chain ID: 42220)
├── deploy-arbitrum.sh     # Arbitrum One (Chain ID: 42161)
├── deploy-ink.sh          # Ink Mainnet (Chain ID: 57073)
└── README.md             # This guide

deployment-records/        # Auto-generated deployment records
├── base-deployment.json
├── optimism-deployment.json
└── ... (one per chain)
```

## 🏗️ Contract Architecture

Each deployment creates 4 contracts:

1. **GmeowCore** - Main logic contract
2. **GmeowGuildStandalone** - Guild management
3. **GmeowNFTStandalone** - NFT implementation
4. **GmeowProxy** - Proxy contract routing calls to all contracts

## 🔧 Prerequisites

### 1. Environment Setup

Create `.env.local` with your Oracle private key:

```bash
# .env.local
ORACLE_PRIVATE_KEY=0x...your...private...key...here
ETHERSCAN_API_KEY=your_etherscan_api_key  # Optional for verification
```

### 2. Balance Requirements

Ensure sufficient balance on each chain:

| Chain | Native Token | Minimum Required |
|-------|-------------|------------------|
| Base | ETH | 0.01 ETH |
| Optimism | ETH | 0.01 ETH |
| Unichain | ETH | 0.01 ETH |
| Celo | CELO | 0.01 CELO |
| Arbitrum | ETH | 0.01 ETH |
| Ink | ETH | 0.01 ETH |

### 3. Tools Required

- [Foundry](https://getfoundry.sh/) (forge, cast)
- [jq](https://jqlang.github.io/jq/) for JSON processing
- Bash shell

## 🚀 Deployment Methods

### Method 1: Interactive Master Script (Recommended)

```bash
# Make executable and run
chmod +x scripts/deployment/deploy-all.sh
./scripts/deployment/deploy-all.sh
```

**Features:**
- ✅ Interactive menu for chain selection
- ✅ Batch deployment option
- ✅ Deployment status tracking
- ✅ Automatic script validation
- ✅ Error handling and recovery

### Method 2: Individual Chain Deployment

```bash
# Make executable
chmod +x scripts/deployment/deploy-[chain].sh

# Deploy to specific chain
./scripts/deployment/deploy-base.sh
./scripts/deployment/deploy-optimism.sh
./scripts/deployment/deploy-unichain.sh
./scripts/deployment/deploy-celo.sh
./scripts/deployment/deploy-arbitrum.sh
./scripts/deployment/deploy-ink.sh
```

## 📋 Deployment Process (9 Steps)

Each deployment script follows this standardized process:

### Step 1-4: Contract Deployment
1. **Deploy Core** - Main contract with Oracle signer
2. **Deploy Guild** - Guild management linked to Core
3. **Deploy NFT** - NFT contract linked to Core  
4. **Deploy Proxy** - Proxy routing to all contracts

### Step 5-7: Contract Linking & Initialization
5. **Link Guild** - Connect Guild contract to Core
6. **Link NFT** - Connect NFT contract to Core
7. **Initialize Proxy** - Activate proxy for production use

### Step 8-9: Validation & Verification
8. **Test Deployment** - Validate all contract links
9. **Verify Contracts** - Submit to block explorers (optional)

## 🔍 Chain-Specific Details

### Base Mainnet
- **Chain ID:** 8453
- **RPC:** Alchemy Base Mainnet
- **Explorer:** [BaseScan](https://basescan.org)
- **Native Token:** ETH

### Optimism Mainnet
- **Chain ID:** 10
- **RPC:** Alchemy Optimism Mainnet
- **Explorer:** [Optimistic Etherscan](https://optimistic.etherscan.io)
- **Native Token:** ETH

### Unichain Mainnet
- **Chain ID:** 1301
- **RPC:** Alchemy Unichain Mainnet
- **Explorer:** [Unichain Explorer](https://unichain.org/explorer)
- **Native Token:** ETH

### Celo Mainnet
- **Chain ID:** 42220
- **RPC:** Alchemy Celo Mainnet
- **Explorer:** [Celoscan](https://celoscan.io)
- **Native Token:** CELO

### Arbitrum One
- **Chain ID:** 42161
- **RPC:** Alchemy Arbitrum Mainnet
- **Explorer:** [Arbiscan](https://arbiscan.io)
- **Native Token:** ETH

### Ink Mainnet
- **Chain ID:** 57073
- **RPC:** https://rpc-gel.inkonchain.com
- **Explorer:** [Ink Explorer](https://explorer.inkonchain.com)
- **Native Token:** ETH

## 📄 Deployment Records

Each successful deployment creates a JSON record:

```json
{
  "chainId": 8453,
  "chainName": "base",
  "network": "Base Mainnet",
  "deploymentDate": "2025-11-28T12:00:00Z",
  "contracts": {
    "core": "0x...",
    "guild": "0x...",
    "nft": "0x...",
    "proxy": "0x..."
  },
  "rpcUrl": "https://base-mainnet.g.alchemy.com/v2/...",
  "explorer": "https://basescan.org"
}
```

Records are saved to `deployment-records/{chain}-deployment.json`.

## 🧪 Testing Deployment

After deployment, each script automatically tests:

```bash
# Core contract validation
cast call $CORE_ADDRESS "oracleSigner()" --rpc-url $RPC
cast call $CORE_ADDRESS "guildContract()" --rpc-url $RPC
cast call $CORE_ADDRESS "nftContractAddress()" --rpc-url $RPC
cast call $CORE_ADDRESS "gmPointReward()" --rpc-url $RPC

# Proxy validation
cast call $PROXY_ADDRESS "coreContract()" --rpc-url $RPC
cast call $PROXY_ADDRESS "guildContract()" --rpc-url $RPC
cast call $PROXY_ADDRESS "nftContract()" --rpc-url $RPC
```

## 🔐 Contract Verification

With `ETHERSCAN_API_KEY` set, contracts are automatically verified on:

- **Base:** BaseScan
- **Optimism:** Optimistic Etherscan
- **Arbitrum:** Arbiscan
- **Celo:** Celoscan
- **Others:** Chain-specific explorers

## 🚨 Troubleshooting

### Common Issues:

1. **"Insufficient balance"**
   - Check balance: `cast balance $ORACLE_ADDRESS --rpc-url $RPC`
   - Fund the Oracle address on the target chain

2. **"Contract deployment failed"**
   - Check gas prices and network congestion
   - Verify RPC endpoint is responding
   - Ensure contracts compile: `forge build`

3. **"Verification failed"**
   - Check `ETHERSCAN_API_KEY` is correct
   - Verify constructor arguments match deployment
   - Some chains may have verification delays

4. **"Permission denied"**
   - Make scripts executable: `chmod +x scripts/deployment/*.sh`

### Manual Recovery:

If deployment partially fails, you can manually continue:

```bash
# Set your recovered addresses
export CORE_ADDRESS="0x..."
export GUILD_ADDRESS="0x..." 
export NFT_ADDRESS="0x..."
export PROXY_ADDRESS="0x..."

# Continue from linking step
cast send $CORE_ADDRESS "setGuildContract(address)" $GUILD_ADDRESS --rpc-url $RPC --private-key $PRIVATE_KEY
```

## 📊 Deployment Status Check

```bash
# Using the master script
./scripts/deployment/deploy-all.sh
# Choose option 8: Show Deployment Status

# Or manually check records
ls deployment-records/
cat deployment-records/base-deployment.json
```

## 🎯 Next Steps After Deployment

1. **Update Environment Variables:**
   ```bash
   # .env.local additions
   NEXT_PUBLIC_GM_BASE_ADDRESS=0x...proxy...address
   NEXT_PUBLIC_GM_OPTIMISM_ADDRESS=0x...proxy...address
   NEXT_PUBLIC_GM_UNICHAIN_ADDRESS=0x...proxy...address
   # ... etc
   ```

2. **Update gm-utils.ts Configuration:**
   ```typescript
   export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
     base: '0x...proxy...address',
     op: '0x...proxy...address',
     unichain: '0x...proxy...address',
     celo: '0x...proxy...address',
     // ... etc
   }
   ```

3. **Test Frontend Integration:**
   - Verify contract calls work through proxy
   - Test cross-chain functionality
   - Update contract addresses in frontend

## 🎉 Success Criteria

✅ All 4 contracts deployed per chain
✅ All contract links established  
✅ Proxy initialized and functional
✅ Contracts verified on block explorers
✅ Deployment records saved
✅ Frontend can interact with proxy addresses

---

**📚 Related Documentation:**
- [Smart Contract Documentation](../../Docs/SmartContract/)
- [gm-utils.ts Reference](../../lib/gm-utils.ts)
- [Foundry Documentation](https://book.getfoundry.sh/)