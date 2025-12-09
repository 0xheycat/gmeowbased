# Gmeow Deployment Guide

## Quick Start

```bash
# 1. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your keys

# 2. Run full deployment
./scripts/deploy-full.sh
```

## Prerequisites

The script **auto-installs** missing dependencies:
- ✅ Node.js v18+ (checks and warns if missing)
- ✅ pnpm (auto-installs if missing)
- ✅ Foundry (auto-installs if missing)
- ✅ jq (auto-installs if missing)

## Configuration

### Required Environment Variables

Create `.env.local`:

```bash
# Deployer Private Key (REQUIRED)
PRIVATE_KEY=your_private_key_here

# Basescan API Key for verification (REQUIRED)
BASESCAN_API_KEY=your_basescan_api_key_here

# Oracle Address (REQUIRED)
ORACLE_ADDRESS=0x8870C155666809609176260F2B65a626C000D773

# Optional: Custom RPC (uses public RPC if not set)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional: Initial Supply (default: 1 trillion)
INITIAL_SUPPLY=1000000000000
```

### Get API Keys

**Basescan API Key** (for verification):
1. Go to https://basescan.org/myapikey
2. Sign up/login
3. Create new API key
4. Copy to `BASESCAN_API_KEY`

**Alchemy RPC** (optional, for better performance):
1. Go to https://dashboard.alchemy.com
2. Create new app → Base Mainnet
3. Copy HTTPS URL to `RPC_BASE`

## What the Script Does

### 1. Dependency Check ✅
- Checks Node.js version (requires v18+)
- Installs pnpm if missing
- Installs Foundry if missing
- Installs jq for JSON parsing
- Installs Node.js dependencies
- Installs Foundry dependencies

### 2. Compilation 🔨
- Cleans previous builds
- Compiles with `--via-ir` optimization
- Displays contract sizes
- Verifies contracts under 24KB limit

### 3. Environment Detection 🔍
- Loads `.env.local`
- Validates required variables
- Sets defaults for optional variables
- Checks deployer balance (requires 0.05 ETH minimum)

### 4. Deployment 🚀
- Deploys **GmeowCore** (17.4KB)
  - Constructor: `(oracleAddress, initialSupply)`
  - Verifies on Basescan
- Deploys **GmeowGuild** (9.3KB)
  - Constructor: `(coreAddress)`
  - Verifies on Basescan
- Deploys **GmeowNFT** (10.9KB)
  - Constructor: `(coreAddress)`
  - Verifies on Basescan
- Deploys **SoulboundBadge** (6.2KB)
  - Constructor: `("GmeowBadge", "GMEOWB")`
  - Verifies on Basescan

### 5. Configuration ⚙️
- Sets Guild contract in Core
- Sets NFT contract in Core
- Sets Badge contract in Guild
- Authorizes Guild to mint Badges

### 6. Verification & Testing ✅
- Checks Oracle balance equals initial supply
- Verifies Guild linked to Core
- Verifies NFT linked to Core
- Verifies Guild authorized to mint badges

### 7. Save Results 💾
- Updates `lib/gmeow-utils.ts` with new addresses
- Extracts ABIs to `abi/` directory
- Saves deployment log to `deployments/`
- Creates `deployments/latest.json` with addresses

## Output Files

### Deployment Log
```
deployments/deployment-20241208-123456.log
```

Contains:
- Deployment timestamps
- Transaction hashes
- Gas costs
- Contract addresses
- Verification links
- Next steps

### Latest Deployment JSON
```json
{
  "network": "base",
  "chainId": 8453,
  "timestamp": "2024-12-08T12:34:56Z",
  "deployer": "0x...",
  "contracts": {
    "core": {
      "address": "0x...",
      "explorer": "https://basescan.org/address/0x..."
    },
    "guild": { "address": "0x...", "explorer": "..." },
    "nft": { "address": "0x...", "explorer": "..." },
    "badge": { "address": "0x...", "explorer": "..." }
  }
}
```

### Updated Frontend Config
```typescript
// lib/gmeow-utils.ts
export const STANDALONE_ADDRESSES = {
  base: {
    core: '0xA3A5f38F536323d45d7445a04d26EfbC8E549962',
    guild: '0x7e1570c0D257A66Ad1457225F628A1843625c80B',
    nft: '0x677831DA7953980B04D54727FCf64A6a731bB8b1',
    badge: '0x89AAC669bA0527b8c321Bc9cF01E9dC0F052Ed58',
  }
}
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Compile
```bash
forge build --via-ir
```

### 2. Deploy Core
```bash
forge create contract/proxy/GmeowCore.sol:GmeowCore \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_BASE \
  --constructor-args $ORACLE_ADDRESS 1000000000000 \
  --verify --verifier blockscout \
  --verifier-url "https://base.blockscout.com/api"
```

### 3. Deploy Guild
```bash
forge create contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_BASE \
  --constructor-args $CORE_ADDRESS \
  --verify --verifier blockscout \
  --verifier-url "https://base.blockscout.com/api"
```

### 4. Deploy NFT
```bash
forge create contract/GmeowNFT.sol:GmeowNFT \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_BASE \
  --constructor-args $CORE_ADDRESS \
  --verify --verifier blockscout \
  --verifier-url "https://base.blockscout.com/api"
```

### 5. Deploy Badge
```bash
forge create contract/SoulboundBadge.sol:SoulboundBadge \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_BASE \
  --constructor-args "GmeowBadge" "GMEOWB" \
  --verify --verifier blockscout \
  --verifier-url "https://base.blockscout.com/api"
```

### 6. Configure Contracts
```bash
# Set Guild in Core
cast send $CORE_ADDRESS "setGuildContract(address)" $GUILD_ADDRESS \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE

# Set NFT in Core
cast send $CORE_ADDRESS "setNFTContract(address)" $NFT_ADDRESS \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE

# Set Badge in Guild
cast send $GUILD_ADDRESS "setBadgeContract(address)" $BADGE_ADDRESS \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE

# Authorize Guild to mint Badges
cast send $BADGE_ADDRESS "setAuthorizedMinter(address,bool)" $GUILD_ADDRESS true \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE
```

## Post-Deployment

### 1. Update Frontend Environment
```bash
# Add to .env.production
NEXT_PUBLIC_GM_BASE_CORE=0xA3A5...
NEXT_PUBLIC_GM_BASE_GUILD=0x7e15...
NEXT_PUBLIC_GM_BASE_NFT=0x6778...
NEXT_PUBLIC_GM_BASE_BADGE=0x89AA...
```

### 2. Deploy Frontend
```bash
pnpm build
vercel --prod
```

### 3. Test Functions
```bash
# Send GM (10 points)
cast send $CORE_ADDRESS "sendGM()" \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE

# Create Guild (100 points, mints badge)
cast send $GUILD_ADDRESS "createGuild(string)" "My Guild" \
  --private-key $PRIVATE_KEY --rpc-url $RPC_BASE

# Check points
cast call $CORE_ADDRESS "pointsBalance(address)" $YOUR_ADDRESS --rpc-url $RPC_BASE
```

## Troubleshooting

### "Insufficient balance"
- Need at least 0.05 ETH on Base mainnet
- Bridge ETH to Base: https://bridge.base.org

### "Compilation failed"
- Run `forge clean` then try again
- Check Solidity version in `foundry.toml`

### "Verification failed"
- Basescan API may be slow
- Check manually: https://basescan.org/address/YOUR_ADDRESS
- Contracts still work without verification

### "Contract size too large"
- Core: 17.4KB ✅ (under 24KB limit)
- All contracts optimized with `--via-ir`

## Gas Costs

Estimated deployment costs on Base:
- Core: ~0.008 ETH
- Guild: ~0.004 ETH
- NFT: ~0.005 ETH
- Badge: ~0.003 ETH
- Configuration: ~0.002 ETH
- **Total: ~0.022 ETH** ($50-60 at 0.001 ETH/gwei)

## Support

- Docs: https://docs.gmeowhq.art
- Issues: https://github.com/0xheycat/gmeowbased/issues
- Discord: https://discord.gg/gmeow
