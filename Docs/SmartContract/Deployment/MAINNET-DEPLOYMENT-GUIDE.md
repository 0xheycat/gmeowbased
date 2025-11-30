# Base Mainnet Deployment Guide - Standalone Architecture

## ⚠️ PRE-DEPLOYMENT CHECKLIST

Before deploying to mainnet, ensure you have:

- [ ] **Tested on Base Sepolia** - All contracts deployed and linked successfully ✅
- [ ] **Sufficient ETH** - Minimum 0.01 ETH on Base Mainnet (recommended: 0.02 ETH)
- [ ] **Oracle Private Key** - Secure backup of your `ORACLE_PRIVATE_KEY`
- [ ] **Contract Verification** - Etherscan API key ready (optional but recommended)
- [ ] **Frontend Ready** - Code ready to switch to mainnet addresses
- [ ] **Audit Complete** - Security review done (if handling significant value)

**Estimated Gas Costs (Base Mainnet):**
- GmeowCore deployment: ~0.003-0.005 ETH
- GmeowGuild deployment: ~0.001-0.002 ETH
- GmeowNFT deployment: ~0.002-0.003 ETH
- Linking transactions: ~0.0001 ETH each
- **Total: ~0.007-0.011 ETH**

---

## Step 1: Get Base Mainnet ETH

### Option A: Bridge from Ethereum
1. Go to https://bridge.base.org
2. Connect your wallet
3. Bridge at least 0.02 ETH to Base
4. Wait ~10 minutes for confirmation

### Option B: Buy on Exchange
1. Use Coinbase, Binance, or other CEX
2. Withdraw directly to Base network
3. Ensure you select "Base" as network (not Ethereum!)

### Option C: On-Ramp
1. Use Coinbase Wallet, Rainbow, or other wallets
2. Buy crypto directly on Base
3. Higher fees but convenient

---

## Step 2: Verify Your Setup

Check your balance on Base Mainnet:

```bash
# Get your address
PRIVATE_KEY=$(grep ORACLE_PRIVATE_KEY .env.local | cut -d= -f2)
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
echo "Deployer: $DEPLOYER"

# Check balance on Base Mainnet
cast balance $DEPLOYER --rpc-url https://mainnet.base.org --ether
```

**Expected output:**
```
Deployer: 0x8870C155666809609176260F2B65a626C000D773
0.020000000000000000
```

If balance is 0, go back to Step 1.

---

## Step 3: Final Testnet Verification

Before mainnet deployment, verify testnet contracts work:

```bash
# Check testnet deployment
cat deployment-standalone.json

# Test a function on testnet
CORE="0x059b474799f8602975E60A789105955CbB61d878"
cast call $CORE "guildContract()" --rpc-url https://sepolia.base.org

# Should return: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
```

---

## Step 4: Deploy to Base Mainnet

### Method 1: Using Deployment Script (Recommended)

```bash
# Set environment variables
PRIVATE_KEY=$(grep ORACLE_PRIVATE_KEY .env.local | cut -d= -f2)
ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY)

# Run mainnet deployment
PRIVATE_KEY=$PRIVATE_KEY \
ORACLE_ADDRESS=$ORACLE_ADDRESS \
./scripts/deploy-base-mainnet.sh
```

**What happens:**
1. Shows your balance and asks for confirmation
2. Deploys GmeowCore (Core + Referral)
3. Waits 30 seconds
4. Deploys GmeowGuild
5. Waits 30 seconds
6. Deploys GmeowNFT
7. Waits 30 seconds
8. Links Guild contract to Core
9. Links NFT contract to Core
10. Saves addresses to `deployment-base-mainnet.json`

**Interactive Prompts:**
```
⚠️  WARNING: You are about to deploy to BASE MAINNET
This will cost real ETH. Make sure you've tested on testnet first!

Estimated total cost: ~0.005-0.01 ETH
Proceed with deployment? (yes/NO)
```

Type `yes` (not just `y`) and press Enter.

---

### Method 2: Manual Step-by-Step

If you prefer manual control:

```bash
# Step 1: Set variables
PRIVATE_KEY=$(grep ORACLE_PRIVATE_KEY .env.local | cut -d= -f2)
ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY)
RPC="https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg"

# Step 2: Deploy Core
echo "Deploying GmeowCore..."
forge create contract/GmeowCoreStandalone.sol:GmeowCore \
  --broadcast \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $ORACLE_ADDRESS

# SAVE THE ADDRESS! Example: 0x1234...
CORE_ADDRESS="0x1599e491FaA2F22AA053dD9304308231c0F0E15B" #example

# Step 3: Deploy Guild
echo "Deploying GmeowGuild..."
forge create contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --broadcast \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $CORE_ADDRESS

# SAVE THE ADDRESS!
GUILD_ADDRESS="0x71EA982A8E2be62191ac7e2A98277c986DEbBc58"

# Step 4: Deploy NFT
echo "Deploying GmeowNFT..."
forge create contract/GmeowNFTStandalone.sol:GmeowNFTStandalone \
  --broadcast \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $CORE_ADDRESS "Gmeow Adventure NFT" "GMEOW" "https://api.gmeowhq.art/nft/"

# SAVE THE ADDRESS!
NFT_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"

# Deploy proxy
echo "Deploying GmeowProxy..."
forge create contract/proxy/GmeowProxy.sol:GmeowProxy \
  --broadcast \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $CORE_ADDRESS $GUILD_ADDRESS $NFT_ADDRESS 
  # SAVE THE ADDRESS!
 PROXY_ADDRESS=0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839
# Step 5: Link Guild to Core
cast send $CORE_ADDRESS \
  "setGuildContract(address)" \
  $GUILD_ADDRESS \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

# Step 6: Link NFT to Core
cast send $CORE_ADDRESS \
  "setNFTContractAddress(address)" \
  $NFT_ADDRESS \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

  # Link to proxy 
  cast send $PROXY_ADDRESS \
  "setNFTContractAddress(address)" \
  $ORACLE_ADDRESS \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

echo "✅ Deployment complete!"
echo "Core:  $CORE_ADDRESS"
echo "Guild: $GUILD_ADDRESS"
echo "NFT:   $NFT_ADDRESS"
echo "PROXY:   $PROXY_ADDRESS"
```

---

## Step 5: Verify Contracts on Basescan

Verification makes your contract source code public and verifiable.

### Get Etherscan API Key
1. Go to https://basescan.org/myapikey
2. Sign in / Create account
3. Create new API key
4. Copy the key

### Verify Contracts

```bash
# Set API key
export ETHERSCAN_API_KEY="your_api_key_here"

# Verify Core
forge verify-contract \
  $CORE_ADDRESS \
  contract/GmeowCoreStandalone.sol:GmeowCore \
  --chain-id 8453 \
  --constructor-args $(cast abi-encode "constructor(address)" $ORACLE_ADDRESS) \
  --watch

# Verify Guild
forge verify-contract \
  $GUILD_ADDRESS \
  contract/GmeowGuildStandalone.sol:GmeowGuildStandalone \
  --chain-id 8453 \
  --constructor-args $(cast abi-encode "constructor(address)" $CORE_ADDRESS) \
  --watch

# Verify NFT
forge verify-contract \
  $NFT_ADDRESS \
  contract/GmeowNFTStandalone.sol:GmeowNFTStandalone \
  --chain-id 8453 \
  --constructor-args $(cast abi-encode "constructor(address,string,string,string)" $CORE_ADDRESS "Gmeow Adventure NFT" "GMEOW" "https://api.gmeowhq.art/nft/") \
  --watch
```

**Expected output:**
```
Start verifying contract `0x...` deployed on base

Submitting verification for [contract/GmeowCoreStandalone.sol:GmeowCore] "0x..."
Submitted contract for verification:
        Response: `OK`
        GUID: `abc123...`
        URL: https://basescan.org/address/0x.../verify#abc123

Contract verification status:
Response: `OK`
Details: `Pass - Verified`

✅ Contract successfully verified
```

---

## Step 6: Test Mainnet Contracts

Verify everything works before announcing:

```bash
# Check Guild link
cast call $CORE_ADDRESS "guildContract()" --rpc-url https://mainnet.base.org
# Should return Guild address

# Check NFT link
cast call $CORE_ADDRESS "nftContractAddress()" --rpc-url https://mainnet.base.org
# Should return NFT address

# Check oracle signer
cast call $CORE_ADDRESS "oracleSigner()" --rpc-url https://mainnet.base.org
# Should return your oracle address

# Check points balance (should be 0 for new address)
cast call $CORE_ADDRESS "pointsBalance(address)" $DEPLOYER --rpc-url https://mainnet.base.org
# Should return: 0
```

---

## Step 7: Update Frontend

Update your frontend to use mainnet addresses:

### Environment Variables (.env.production)
```bash
# Base Mainnet
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

# Contract Addresses (from deployment-base-mainnet.json)
NEXT_PUBLIC_CORE_CONTRACT=0x_YOUR_CORE_ADDRESS
NEXT_PUBLIC_GUILD_CONTRACT=0x_YOUR_GUILD_ADDRESS
NEXT_PUBLIC_NFT_CONTRACT=0x_YOUR_NFT_ADDRESS

# Oracle (backend)
ORACLE_PRIVATE_KEY=your_private_key
ORACLE_ADDRESS=0x_YOUR_ORACLE_ADDRESS
```

### React/Next.js Configuration
```typescript
// config/contracts.ts
export const CONTRACTS = {
  base: {
    chainId: 8453,
    core: '0x_YOUR_CORE_ADDRESS',
    guild: '0x_YOUR_GUILD_ADDRESS',
    nft: '0x_YOUR_NFT_ADDRESS',
  },
  baseSepolia: {
    chainId: 84532,
    core: '0x059b474799f8602975E60A789105955CbB61d878',
    guild: '0xa0001886C87a19d49BAC88a5Cbf993f0866110C4',
    nft: '0xdB6167697Dd0f696d445a35ec823C25b885Ae60c',
  },
};
```

---

## Step 8: Post-Deployment Tasks

### 1. Transfer Ownership (If Needed)
If the deployer account should not be the owner:

```bash
# Transfer ownership to multisig or DAO
cast send $CORE_ADDRESS \
  "transferOwnership(address)" \
  0x_NEW_OWNER_ADDRESS \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

### 2. Add Additional Oracles
```bash
# Authorize additional oracle signers
cast send $CORE_ADDRESS \
  "authorizeOracle(address,bool)" \
  0x_ORACLE_ADDRESS \
  true \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

### 3. Whitelist Tokens (If Using ERC20 Rewards)
```bash
# Enable token whitelist
cast send $CORE_ADDRESS \
  "setTokenWhitelist(bool)" \
  true \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY

# Whitelist specific token (e.g., USDC on Base)
USDC_BASE="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
cast send $CORE_ADDRESS \
  "whitelistToken(address,bool)" \
  $USDC_BASE \
  true \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

### 4. Set Up Monitoring
- Add contract addresses to Tenderly for real-time monitoring
- Set up alerts for key functions (quest completions, token transfers)
- Monitor gas prices and transaction costs

---

## Troubleshooting

### "Insufficient funds for gas"
- Check balance: `cast balance $DEPLOYER --rpc-url https://mainnet.base.org --ether`
- Need at least 0.01 ETH
- Bridge more ETH from Ethereum or buy on exchange

### "Nonce too low"
- Previous transaction pending or failed
- Check pending transactions: `cast nonce $DEPLOYER --rpc-url https://mainnet.base.org`
- Wait for transactions to confirm (30-60 seconds)
- Use `--legacy` flag if issue persists

### "Contract creation code size exceeds limit"
- This should NOT happen with standalone architecture
- If it does, verify you're deploying the correct contracts:
  - `GmeowCoreStandalone.sol` (not `GmeowMultiChainV2.sol`)
  - `GmeowGuildStandalone.sol`
  - `GmeowNFTStandalone.sol`

### "Transaction underpriced"
- Base gas prices spiked
- Add `--gas-price` flag: `--gas-price 1000000000` (1 gwei)
- Or use `--legacy` for auto gas pricing

### "Verification failed"
- Check constructor arguments match exactly
- Ensure you're using same compiler version (0.8.23)
- Verify optimizer settings match foundry.toml (runs=200, via_ir=true)
- Try manual verification on Basescan website

---

## Cost Breakdown

**Base Mainnet Gas Costs (approximate):**

| Operation | Gas Units | Cost (at 0.1 gwei) | Cost (at 1 gwei) |
|-----------|-----------|-------------------|------------------|
| Deploy Core | ~3,000,000 | ~0.0003 ETH | ~0.003 ETH |
| Deploy Guild | ~1,500,000 | ~0.00015 ETH | ~0.0015 ETH |
| Deploy NFT | ~2,500,000 | ~0.00025 ETH | ~0.0025 ETH |
| Link Guild | ~50,000 | ~0.000005 ETH | ~0.00005 ETH |
| Link NFT | ~50,000 | ~0.000005 ETH | ~0.00005 ETH |
| **Total** | **~7,100,000** | **~0.00071 ETH** | **~0.0071 ETH** |

**Note:** Base has very low gas fees (usually 0.01-0.1 gwei). Total cost is typically **$2-5 USD**.

---

## Security Considerations

### Before Launch:
- [ ] Test all functions on testnet first
- [ ] Verify oracle private key is secure (hardware wallet recommended)
- [ ] Set up multisig for ownership if handling significant funds
- [ ] Enable token whitelist to prevent malicious ERC20 interactions
- [ ] Set reasonable quest reward limits
- [ ] Monitor for unusual activity post-launch

### After Launch:
- [ ] Monitor transactions daily
- [ ] Set up alerts for large withdrawals
- [ ] Keep oracle key offline when not in use
- [ ] Plan for emergency pause if needed (consider adding pause function)

---

## Checklist: Ready for Production?

Before announcing your launch:

- [ ] All contracts deployed to Base Mainnet
- [ ] All contracts verified on Basescan
- [ ] Guild and NFT contracts linked to Core
- [ ] Frontend updated with mainnet addresses
- [ ] Test quest creation works
- [ ] Test quest completion works
- [ ] Test guild creation works
- [ ] Test NFT minting works
- [ ] Oracle backend running and signing properly
- [ ] Monitoring and alerts set up
- [ ] Backup of all private keys and addresses
- [ ] Documentation updated
- [ ] Team briefed on operations

---

## Quick Deploy Command

If you've already tested and are ready:

```bash
# One-liner for mainnet deployment
PRIVATE_KEY=$(grep ORACLE_PRIVATE_KEY .env.local | cut -d= -f2) \
ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY) \
./scripts/deploy-base-mainnet.sh
```

**Then:**
1. Type `yes` when prompted
2. Wait ~5 minutes for all deployments
3. Check `deployment-base-mainnet.json` for addresses
4. Verify contracts on Basescan
5. Update frontend
6. Announce launch! 🚀

---

## Need Help?

- **Base Discord**: https://discord.gg/buildonbase
- **Foundry Book**: https://book.getfoundry.sh
- **Basescan Support**: https://basescan.org/contactus

Good luck with your mainnet launch! 🎉
