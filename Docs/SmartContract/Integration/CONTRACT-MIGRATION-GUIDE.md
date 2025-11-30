# Contract Address Migration Guide

## Overview

Your Base mainnet contracts have been upgraded from **monolithic** to **standalone architecture**:

| Component | Old (Monolithic) | New (Standalone) |
|-----------|------------------|------------------|
| **Core Contract** | `0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F` | `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92` |
| **Guild Contract** | *(same as core)* | `0x967457be45facE07c22c0374dAfBeF7b2f7cd059` |
| **NFT Contract** | *(same as core)* | `0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20` |

## What Changed?

### Old Architecture (Monolithic)
```solidity
// Single contract with all features
contract GmeowMultichain {
  // Quest management
  // Guild management  
  // NFT minting
  // Referral system
  // All in one contract
}
```

### New Architecture (Standalone)
```solidity
// Separate specialized contracts
contract GmeowCore {
  // Quest management
  // Points system
  // GM rewards
  // Referral system
}

contract GmeowGuild {
  // Guild management only
}

contract GmeowNFT {
  // NFT minting only
}
```

## Updated Configuration Files

### ✅ Already Updated

1. **`lib/contract-config.ts`** (NEW)
   - Central configuration for all chains
   - Supports both monolithic and standalone architectures
   - Helper functions to get correct addresses

2. **`.env.vercel.production`**
   - Added new Base mainnet addresses
   - Backward compatible with old `NEXT_PUBLIC_GM_BASE_ADDRESS`

### 🔄 Files That Need Updating

#### 1. **`lib/gm-utils.ts`**

**Current:**
```typescript
export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
  base: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F', // OLD
  // ...
}
```

**Update to:**
```typescript
import { CONTRACT_ADDRESSES, getCoreAddress, getGuildAddress, getNFTAddress } from './contract-config'

// Or manually update:
export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
  base: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92', // NEW CORE
  unichain: '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  celo: '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
  ink: '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  op: '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
}
```

#### 2. **Guild-related code**

**Before (monolithic):**
```typescript
// Guild functions called on main contract
const contract = CONTRACT_ADDRESSES.base
await writeContract({
  address: contract,
  abi: GM_ABI,
  functionName: 'createGuild',
  args: [name, description]
})
```

**After (standalone):**
```typescript
import { getGuildAddress, isStandaloneChain } from './contract-config'

const chainId = 8453 // Base
const contract = getGuildAddress(chainId) // Returns guild contract if standalone

await writeContract({
  address: contract,
  abi: isStandaloneChain(chainId) ? GUILD_ABI : GM_ABI,
  functionName: 'createGuild',
  args: [name, description]
})
```

#### 3. **NFT-related code**

**Before:**
```typescript
const contract = CONTRACT_ADDRESSES.base
await writeContract({
  address: contract,
  abi: GM_ABI,
  functionName: 'mintNFT',
  args: [nftTypeId, reason]
})
```

**After:**
```typescript
import { getNFTAddress } from './contract-config'

const chainId = 8453
const contract = getNFTAddress(chainId)

await writeContract({
  address: contract,
  abi: isStandaloneChain(chainId) ? NFT_ABI : GM_ABI,
  functionName: 'mintNFT',
  args: [nftTypeId, reason]
})
```

## Step-by-Step Migration

### Step 1: Update Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_GM_BASE_CORE="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
NEXT_PUBLIC_GM_BASE_GUILD="0x967457be45facE07c22c0374dAfBeF7b2f7cd059"
NEXT_PUBLIC_GM_BASE_NFT="0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"

# Update Vercel environment variables
vercel env add NEXT_PUBLIC_GM_BASE_CORE production
vercel env add NEXT_PUBLIC_GM_BASE_GUILD production
vercel env add NEXT_PUBLIC_GM_BASE_NFT production
```

### Step 2: Update `lib/gm-utils.ts`

```typescript
// Option A: Import from contract-config (recommended)
import { CONTRACT_ADDRESSES } from './contract-config'

// Option B: Update manually
export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
  base: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
  // ... keep others the same
}
```

### Step 3: Update Contract Interactions

For **Base mainnet only**, route calls to appropriate contracts:

```typescript
// Example: Quest completion (Core)
const coreAddress = getCoreAddress(8453)
await completeQuest(coreAddress, questId, user, signature)

// Example: Guild creation (Guild)
const guildAddress = getGuildAddress(8453)
await createGuild(guildAddress, name, description)

// Example: NFT minting (NFT)
const nftAddress = getNFTAddress(8453)
await mintNFT(nftAddress, nftTypeId, reason)
```

### Step 4: Update Contract Event Listeners

```typescript
// Before: Listen to one contract
watchContractEvent({
  address: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  abi: GM_ABI,
  eventName: 'QuestCompleted',
  onLogs: handleLogs
})

// After: Listen to Core contract for quests
watchContractEvent({
  address: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
  abi: GM_ABI,
  eventName: 'QuestCompleted',
  onLogs: handleLogs
})

// Listen to Guild contract for guild events
watchContractEvent({
  address: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',
  abi: GUILD_ABI,
  eventName: 'GuildCreated',
  onLogs: handleGuildLogs
})
```

### Step 5: Test Everything

```bash
# Run tests
npm test

# Check frontend locally
npm run dev

# Test contract interactions
# - Complete a quest
# - Create a guild
# - Mint an NFT
# - Check leaderboards
```

### Step 6: Deploy

```bash
# Deploy to Vercel
vercel --prod

# Or commit and push (if auto-deploy enabled)
git add .
git commit -m "feat: upgrade to standalone contract architecture on Base"
git push origin main
```

## Backward Compatibility

The new configuration maintains backward compatibility:

```typescript
// OLD code still works (returns Core address)
const address = CONTRACT_ADDRESSES.base 
// Returns: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

// NEW code for specific contracts
const coreAddress = getCoreAddress(8453)
const guildAddress = getGuildAddress(8453)
const nftAddress = getNFTAddress(8453)
```

## Testing Checklist

- [ ] Quest creation works on Base
- [ ] Quest completion with signature works
- [ ] GM rewards distribute correctly
- [ ] Guild creation works
- [ ] Guild joining/leaving works
- [ ] NFT minting works
- [ ] Referral system works
- [ ] Leaderboards update correctly
- [ ] Badge collection displays correctly
- [ ] Frontend displays new contract addresses

## Rollback Plan

If issues occur:

1. **Revert environment variables:**
   ```bash
   NEXT_PUBLIC_GM_BASE_ADDRESS="0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F"
   ```

2. **Redeploy previous version:**
   ```bash
   vercel rollback
   ```

3. **The old contract still exists** on Base mainnet, so you can always fall back

## Benefits of New Architecture

✅ **Fits within 24KB limit** - Can deploy to all EVM chains  
✅ **Lower gas costs** - Specialized contracts are more efficient  
✅ **Easier upgrades** - Can update Guild/NFT independently  
✅ **Better organization** - Clear separation of concerns  
✅ **Updated bonuses** - OG threshold 50K FID, streak bonuses 15%/30%/60%

## Questions?

- Check `deployment-base-mainnet.json` for all addresses and transaction hashes
- Verify contracts on [Basescan](https://basescan.org/address/0x9BDD11aA50456572E3Ea5329fcDEb81974137f92)
- Test on Base Sepolia first: see `deployment-standalone.json`

## Other Chains

**No changes needed** - Unichain, Celo, Ink, and Optimism still use monolithic contracts.

Only Base mainnet has the new standalone architecture.
