/**
 * #file: docs/setup/NFT_MINTER_PRIVATE_KEY_SETUP.md
 * 
 * CRITICAL: Missing Environment Variable Setup Guide
 * 
 * PHASE: Phase 1 - Critical Infrastructure (Week 1, Day 1)
 * DATE: December 16, 2025
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

# NFT Minter Private Key Setup

## ⚠️ CRITICAL: Security Requirements

The NFT minter requires a **dedicated wallet private key** with the following characteristics:

### Security Profile
- **Purpose**: ONLY for minting NFTs (no other operations)
- **Permissions**: Authorized minter in GmeowNFT contract (0xCE9596a992e38c5fa2d997ea916a277E0F652D5C)
- **Funding**: Should hold ~0.01 ETH for gas fees (Base network)
- **Storage**: NEVER commit to repository, use Supabase Vault or GitHub secrets

## Step 1: Create Dedicated Wallet

```bash
# Option 1: Using cast (Foundry)
cast wallet new

# Option 2: Using ethers.js (Node.js)
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

**Example Output**:
```
Address: 0x1234567890abcdef1234567890abcdef12345678
Private Key: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## Step 2: Authorize Wallet in Contract

The wallet must be authorized as a minter in the GmeowNFT contract.

```solidity
// Contract owner must call:
function updateAuthorizedMinter(address minter, bool authorized) external onlyOwner

// Authorize the new wallet:
nftContract.updateAuthorizedMinter(0x1234...5678, true)
```

**Using cast (if you have owner wallet)**:
```bash
cast send 0xCE9596a992e38c5fa2d997ea916a277E0F652D5C \
  "updateAuthorizedMinter(address,bool)" \
  0x1234567890abcdef1234567890abcdef12345678 \
  true \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Step 3: Fund Wallet with Gas

Send ~0.01 ETH to the minter wallet for gas fees:

```bash
# Using cast
cast send 0x1234567890abcdef1234567890abcdef12345678 \
  --value 0.01ether \
  --private-key $YOUR_FUNDED_WALLET_KEY \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**Estimated Gas Costs** (Base network):
- Single mint: ~250,000 gas × 0.001 gwei = $0.0003
- 100 mints: ~$0.03
- 0.01 ETH ≈ 33,000 mints

## Step 4: Add to Environment Variables

### Local Development (.env.local)
```bash
# Add to .env.local (NEVER commit this file)
NFT_MINTER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### Supabase Edge Function Secrets
```bash
# Set secret in Supabase dashboard or CLI
supabase secrets set NFT_MINTER_PRIVATE_KEY=0xabcdef...
```

### GitHub Secrets (for workflow)
```bash
# Add secret to GitHub repository
gh secret set NFT_MINTER_PRIVATE_KEY --body "0xabcdef..."
```

## Step 5: Verify Setup

Test the minter wallet can mint:

```typescript
// test-mint.ts
import { ethers } from 'ethers'
import { NFT_ABI } from './lib/contracts/abis'

const provider = new ethers.JsonRpcProvider(process.env.RPC_BASE_HTTP)
const wallet = new ethers.Wallet(process.env.NFT_MINTER_PRIVATE_KEY!, provider)
const nftContract = new ethers.Contract(
  '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C',
  NFT_ABI,
  wallet
)

// Test mint
const tx = await nftContract.mint(
  '0xYourTestAddress',
  'TEST_NFT',
  'https://gmeowhq.art/api/nft/metadata/test/123'
)
await tx.wait()
console.log('Mint successful:', tx.hash)
```

## Security Checklist

- [ ] Wallet created with high-entropy randomness
- [ ] Private key NEVER committed to repository
- [ ] Private key stored in Supabase Vault or GitHub Secrets
- [ ] Wallet authorized in GmeowNFT contract
- [ ] Wallet funded with ~0.01 ETH
- [ ] Test mint executed successfully
- [ ] Gas usage monitored (set up alerts if balance < 0.005 ETH)
- [ ] Backup recovery phrase stored securely offline

## Monitoring & Alerts

### Set up balance monitoring:
```bash
# Add to monitoring script
BALANCE=$(cast balance 0x1234...5678 --rpc-url $RPC_BASE_HTTP)
if [ "$BALANCE" -lt "5000000000000000" ]; then  # 0.005 ETH
  echo "⚠️ LOW BALANCE: Minter wallet needs refill"
  # Send alert to Slack/Discord
fi
```

### Gas usage tracking:
- Monitor transaction costs in Supabase audit logs
- Set alert if daily gas > $5
- Track failed mints (may indicate authorization issues)

## Troubleshooting

### Error: "Unauthorized minter"
- Verify wallet is authorized: `cast call 0xCE95...2D5C "authorizedMinters(address)(bool)" 0xYourWallet --rpc-url $RPC_BASE_HTTP`
- If false, run authorization transaction (Step 2)

### Error: "Insufficient funds"
- Check balance: `cast balance 0xYourWallet --rpc-url $RPC_BASE_HTTP`
- Fund wallet with 0.01 ETH (Step 3)

### Error: "Nonce too low/high"
- Reset nonce in ethers.js: `wallet.getNonce('latest')`
- Clear transaction queue in RPC provider

## Production Best Practices

1. **Key Rotation**: Rotate minter private key every 90 days
2. **Multi-Sig**: Consider using Gnosis Safe for minter authorization
3. **Gas Monitoring**: Set up real-time alerts for gas price spikes (>10 gwei)
4. **Rate Limiting**: Limit mints to 100/hour to prevent abuse
5. **Audit Logging**: Log all mint transactions to external service (Datadog, Sentry)

## Contact

For security issues or questions, contact:
- Owner FID: 18139 (@heycat)
- Email: security@gmeowhq.art
