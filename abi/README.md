# Smart Contract ABIs

## Overview
Your smart contracts use a **proxy pattern** to bypass Ethereum's 24KB contract size limit. The proxy delegates calls to 3 implementation contracts.

## Architecture
```
GmeowProxy (Main Entry Point)
  ├─> coreImpl: GmeowCore (Quest, Points, GM, Referral)
  ├─> guildImpl: GmeowGuild (Guild management)
  └─> nftImpl: GmeowNFT (NFT minting)
```

## ABI Files

### Individual ABIs
- **`GmeowProxy.abi.json`** (12 functions)
  - Admin functions: `upgradeImplementation()`, `setImplementation()`
  - View functions: `getImplementations()`, `owner()`
  - Use this ONLY for proxy management

- **`GmeowCore.abi.json`** (158 functions)
  - Quest system: `completeQuest()`, `getQuestProgress()`
  - Points: `addPoints()`, `getUserPoints()`
  - GM: `recordGM()`, `getGMStreak()`
  - Referral: `setReferrer()`, `getReferralRewards()`

- **`GmeowGuild.abi.json`** (143 functions)
  - Guild creation: `createGuild()`, `joinGuild()`
  - Management: `promoteToOfficer()`, `kickMember()`
  - Stats: `getGuildStats()`, `getGuildMembers()`

- **`GmeowNFT.abi.json`** (130 functions)
  - Minting: `mintAchievementNFT()`, `mintGuildNFT()`
  - NFT management: `tokenURI()`, `ownerOf()`
  - Metadata: `setBaseURI()`, `updateMetadata()`

### Combined ABI
- **`GmeowCombined.abi.json`** (195 unique functions)
  - Contains ALL functions from Core + Guild + NFT implementations
  - **Use this for your frontend!**

## Usage with Frontend

### Option 1: Use Combined ABI (Recommended)
```typescript
import GmeowABI from './abi/GmeowCombined.abi.json';

// Always use your PROXY address with the combined ABI
const GMEOW_PROXY_ADDRESS = '0x...'; // Your deployed proxy address

const contract = new ethers.Contract(
  GMEOW_PROXY_ADDRESS,
  GmeowABI,
  signer
);

// All functions from Core, Guild, and NFT are available
await contract.completeQuest(questId);
await contract.createGuild("My Guild");
await contract.mintAchievementNFT(userId, achievementId);
```

### Option 2: Use Individual ABIs (Advanced)
```typescript
import CoreABI from './abi/GmeowCore.abi.json';
import GuildABI from './abi/GmeowGuild.abi.json';
import NFTABI from './abi/GmeowNFT.abi.json';

// Still use PROXY address, but with specific implementation ABI
const questContract = new ethers.Contract(PROXY_ADDRESS, CoreABI, signer);
const guildContract = new ethers.Contract(PROXY_ADDRESS, GuildABI, signer);
const nftContract = new ethers.Contract(PROXY_ADDRESS, NFTABI, signer);
```

## Important Notes

### ✅ DO:
- **Always interact with the PROXY address** (not implementation addresses)
- Use `GmeowCombined.abi.json` for simplicity
- Verify all contracts on block explorer (proxy + 3 implementations)
- Test with small transactions first

### ❌ DON'T:
- Don't call implementation contracts directly
- Don't mix up proxy address with implementation addresses
- Don't assume all functions are on the same implementation

## How Proxy Routing Works

The proxy uses `delegatecall` to route function calls:

1. User calls function on **Proxy Address**
2. Proxy checks function selector (first 4 bytes)
3. Proxy routes to correct implementation:
   - Quest/Points/GM → `coreImpl`
   - Guild functions → `guildImpl`
   - NFT functions → `nftImpl`
4. Implementation executes using **proxy's storage**

This means:
- All state is stored in the proxy
- Implementations are stateless logic contracts
- You can upgrade implementations without losing data

## Verification on Block Explorer

To verify your contracts:

```bash
# Verify Proxy
forge verify-contract <PROXY_ADDRESS> contract/proxy/GmeowProxy.sol:GmeowProxy

# Verify Core Implementation
forge verify-contract <CORE_IMPL_ADDRESS> contract/proxy/GmeowCore.sol:GmeowCore

# Verify Guild Implementation
forge verify-contract <GUILD_IMPL_ADDRESS> contract/proxy/GmeowGuild.sol:GmeowGuild

# Verify NFT Implementation
forge verify-contract <NFT_IMPL_ADDRESS> contract/proxy/GmeowNFTImpl.sol:GmeowNFTImpl
```

## Generate TypeScript Types (Optional)

```bash
# Using wagmi
npx wagmi generate

# Or using typechain
npx typechain --target=ethers-v6 './abi/*.json' --out-dir='./types/contracts'
```

## Example: Complete Quest

```typescript
import { ethers } from 'ethers';
import GmeowABI from './abi/GmeowCombined.abi.json';

const PROXY_ADDRESS = '0x...'; // Your proxy address

async function completeQuest(questId: number) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const contract = new ethers.Contract(
    PROXY_ADDRESS,
    GmeowABI,
    signer
  );
  
  // This calls GmeowCore implementation through proxy
  const tx = await contract.completeQuest(questId);
  await tx.wait();
  
  console.log('Quest completed!');
}
```

## Storage Layout Warning

Since all 3 implementations share the same storage (via delegatecall), ensure:
- **Storage variables are in the same order** across all implementations
- **Never change storage variable positions** when upgrading
- **Only append new storage variables** at the end

## Questions?

- **Q: Which ABI should I use?**
  - A: Use `GmeowCombined.abi.json` - it has everything!

- **Q: What address should I use?**
  - A: Always use your **Proxy address**, never the implementation addresses

- **Q: Can I upgrade implementations?**
  - A: Yes! Use `upgradeImplementation()` from `GmeowProxy.abi.json`

- **Q: How do I know which implementation handles a function?**
  - A: You don't need to! The proxy handles routing automatically

- **Q: What if a function exists in multiple implementations?**
  - A: The combined ABI removes duplicates. The proxy routes by function selector priority.
