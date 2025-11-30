# Proxy-Based Contract Architecture Integration

**Date**: November 28, 2025  
**Status**: ✅ Complete  
**Architecture**: Foundry-deployed standalone contracts with proxy pattern

---

## Overview

Gmeowbased has migrated from a monolithic contract architecture to a **proxy-based standalone architecture** with improved security and modularity. This document describes the new architecture and integration changes.

## Architecture Changes

### Previous Architecture (Monolithic)
- Single contract per chain containing all functionality
- Difficult to upgrade individual features
- Less modular security boundaries
- Higher gas costs for complex operations

### New Architecture (Proxy-Based Standalone)
- **Separate contracts** for Core, Guild, NFT functionality
- **Proxy pattern** for upgradeability
- **Modular security** with isolated contract responsibilities
- **Improved testability** with smaller, focused contracts
- **Better gas optimization** per module

## Deployed Chains

The new architecture is deployed on **6 chains**:

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base | 8453 | ✅ Deployed |
| Optimism | 10 | ✅ Deployed |
| Unichain | 130 | ✅ Deployed |
| Celo | 42220 | ✅ Deployed |
| Ink | 57073 | ✅ Deployed |
| Arbitrum | 42161 | ✅ Deployed |

## Contract Addresses

### Base (8453)
```
Core:  0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
Guild: 0x967457be45facE07c22c0374dAfBeF7b2f7cd059
NFT:   0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
Proxy: 0x6A48B758ed42d7c934D387164E60aa58A92eD206
```

### Optimism (10)
```
Core:  0x1599e491FaA2F22AA053dD9304308231c0F0E15B
Guild: 0x71EA982A8E2be62191ac7e2A98277c986DEbBc58
NFT:   0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
Proxy: 0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839
```

### Unichain (130)
```
Core:  0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
Guild: 0x967457be45facE07c22c0374dAfBeF7b2f7cd059
NFT:   0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
Proxy: 0x6A48B758ed42d7c934D387164E60aa58A92eD206
```

### Celo (42220)
```
Core:  0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
Guild: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NFT:   0x059b474799f8602975E60A789105955CbB61d878
Proxy: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
```

### Ink (57073)
```
Core:  0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
Guild: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NFT:   0x059b474799f8602975E60A789105955CbB61d878
Proxy: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
```

### Arbitrum (42161)
```
Core:  0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe
Guild: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
NFT:   0x059b474799f8602975E60A789105955CbB61d878
Proxy: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
```

## Code Changes

### 1. Type System Updates

**Added Arbitrum to GMChainKey**:
```typescript
// Before
export type GMChainKey = 'base' | 'unichain' | 'celo' | 'ink' | 'op'

// After
export type GMChainKey = 'base' | 'unichain' | 'celo' | 'ink' | 'op' | 'arbitrum'
```

**Updated ChainKey** (removed 'optimism' since 'op' is now in GMChainKey):
```typescript
export type ChainKey = GMChainKey | 'optimism' | 'ethereum' | 'avax' | 'berachain' | 'bnb' | 'fraxtal' | 'katana' | 'soneium' | 'taiko' | 'hyperevm'
```

### 2. Contract Address Structure

**New STANDALONE_ADDRESSES**:
```typescript
export const STANDALONE_ADDRESSES = {
  base: { core, guild, nft, proxy },
  op: { core, guild, nft, proxy },
  unichain: { core, guild, nft, proxy },
  celo: { core, guild, nft, proxy },
  ink: { core, guild, nft, proxy },
  arbitrum: { core, guild, nft, proxy },
}
```

### 3. Helper Functions

**New Type Guard**:
```typescript
// Check if a chain has deployed GM contracts
export function isGMChain(chain: ChainKey): chain is GMChainKey {
  return chain in CHAIN_IDS
}

// Assert a value is a valid GM chain
export function assertGMChainKey(value: unknown, fallback?: GMChainKey): GMChainKey
```

**Updated Address Helpers**:
```typescript
// Get specific contract addresses
export function getCoreAddress(chain: GMChainKey): `0x${string}`
export function getGuildAddress(chain: GMChainKey): `0x${string}`
export function getNFTAddress(chain: GMChainKey): `0x${string}`
export function getProxyAddress(chain: GMChainKey): `0x${string}`
```

**Updated ABI Helpers**:
```typescript
// All chains now use standalone ABIs (no more monolithic fallback)
export function getCoreABI(chain: GMChainKey): Abi {
  return CORE_ABI
}
export function getGuildABI(chain: GMChainKey): Abi {
  return GUILD_ABI
}
export function getNFTABI(chain: GMChainKey): Abi {
  return NFT_ABI
}
```

### 4. Environment Variables

**New Environment Variables** (see `.env.contracts.example`):
```bash
# Each chain now has 4 addresses
NEXT_PUBLIC_GM_BASE_CORE=0x...
NEXT_PUBLIC_GM_BASE_GUILD=0x...
NEXT_PUBLIC_GM_BASE_NFT=0x...
NEXT_PUBLIC_GM_BASE_PROXY=0x...

# Repeat for: OP, UNICHAIN, CELO, INK, ARBITRUM
```

## Usage Examples

### Send GM on Any Chain
```typescript
import { createSendGMTx, isGMChain, CHAIN_IDS } from '@/lib/gm-utils'

const chain = 'arbitrum' // or any GMChainKey
if (!isGMChain(chain)) {
  throw new Error('Chain does not have GM contracts')
}

const tx = createSendGMTx(chain)
// Returns: { address: CoreAddress, abi: CORE_ABI, functionName: 'sendGM', args: [] }

await writeContract(tx)
```

### Create Guild Quest
```typescript
import { createGuildQuestTx, getGuildAddress, getGuildABI } from '@/lib/gm-utils'

const chain: GMChainKey = 'base'
const tx = createGuildQuestTx(
  1n, // guildId
  'Complete 10 GMs',
  1000n, // reward points
  chain
)

// tx.address is automatically set to Guild contract address
// tx.abi is automatically set to GUILD_ABI
```

### Mint NFT
```typescript
import { createMintNFTTx, getNFTAddress, getNFTABI } from '@/lib/gm-utils'

const chain: GMChainKey = 'op'
const tx = createMintNFTTx(
  'BADGE_LEGENDARY',
  'Completed all quests',
  chain
)

// tx.address is automatically set to NFT contract address
// tx.abi is automatically set to NFT_ABI
```

### Type-Safe Chain Handling
```typescript
import { isGMChain, assertGMChainKey } from '@/lib/gm-utils'

// Type guard usage
function handleChain(chain: ChainKey) {
  if (isGMChain(chain)) {
    // TypeScript now knows chain is GMChainKey
    const address = CONTRACT_ADDRESSES[chain] // ✅ Type-safe
  } else {
    // Handle viewing-only chains (ethereum, avax, etc.)
    console.log(`${chain} is viewing-only`)
  }
}

// Assert with fallback
const chain = assertGMChainKey(userInput, 'base')
// Throws if invalid, returns 'base' if undefined/null
```

## Security Improvements

### 1. Modular Permissions
- Each contract (Core, Guild, NFT) has independent access control
- Admin functions are isolated per module
- Reduced attack surface per contract

### 2. Upgrade Safety
- Proxy pattern allows upgrading logic without changing addresses
- State is preserved during upgrades
- Time-locked upgrade mechanism

### 3. Circuit Breakers
- Independent pause functionality per contract
- Guild issues don't affect Core GM functionality
- NFT minting can be paused without affecting points

### 4. Foundry Security
- Comprehensive test coverage with Foundry
- Formal verification of critical paths
- Gas optimization analysis

## Migration Guide

### For Developers

**If you used `CONTRACT_ADDRESSES` directly**:
```typescript
// ❌ Old (may break for Guild/NFT operations)
const address = CONTRACT_ADDRESSES[chain]

// ✅ New (specify contract type)
const coreAddress = getCoreAddress(chain)
const guildAddress = getGuildAddress(chain)
const nftAddress = getNFTAddress(chain)
```

**If you had chain-specific logic**:
```typescript
// ❌ Old (hard-coded Base exception)
const abi = chain === 'base' ? CORE_ABI : GM_CONTRACT_ABI

// ✅ New (works for all chains)
const abi = getCoreABI(chain)
```

**If you check for valid GM chains**:
```typescript
// ❌ Old (manual check)
if (!['base', 'unichain', 'celo', 'ink', 'op'].includes(chain)) {
  throw new Error('Invalid chain')
}

// ✅ New (use type guard)
if (!isGMChain(chain)) {
  throw new Error('Chain does not have GM contracts')
}
```

### For API Routes

**Update environment variable reads**:
```typescript
// ❌ Old
const address = process.env.NEXT_PUBLIC_GM_BASE_ADDRESS

// ✅ New
const coreAddress = process.env.NEXT_PUBLIC_GM_BASE_CORE
const guildAddress = process.env.NEXT_PUBLIC_GM_BASE_GUILD
const nftAddress = process.env.NEXT_PUBLIC_GM_BASE_NFT
```

## Testing

### Foundry Tests
```bash
# Run contract tests
forge test

# Run with gas report
forge test --gas-report

# Run specific test file
forge test --match-contract GmeowCoreTest
```

### Integration Tests
```bash
# Test all chains
npm run test:integration

# Test specific chain
CHAIN=arbitrum npm run test:integration
```

## Deployment Scripts

**Deploy to new chain**:
```bash
# Using Foundry
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify

# Outputs: Core, Guild, NFT, Proxy addresses
```

**Verify contracts**:
```bash
forge verify-contract <ADDRESS> <CONTRACT_PATH> --chain-id <CHAIN_ID>
```

## Block Explorers

| Chain | Explorer | Verified |
|-------|----------|----------|
| Base | [Basescan](https://basescan.org) | ✅ |
| Optimism | [Optimistic Etherscan](https://optimistic.etherscan.io) | ✅ |
| Arbitrum | [Arbiscan](https://arbiscan.io) | ✅ |
| Celo | [Celoscan](https://celoscan.io) | ✅ |
| Unichain | TBD | ⏳ |
| Ink | TBD | ⏳ |

## Roadmap

- [ ] Deploy to remaining chains (Ethereum, Avalanche, BNB)
- [ ] Implement cross-chain bridge for points
- [ ] Add multi-sig for admin operations
- [ ] Enable on-chain governance for upgrades
- [ ] Integrate Chainlink VRF for random NFT traits

## Support

**Issues**: [GitHub Issues](https://github.com/0xheycat/gmeowbased/issues)  
**Discord**: [Join our community](https://discord.gg/gmeowbased)  
**Docs**: [Full Documentation](https://docs.gmeowbased.com)

---

**Last Updated**: November 28, 2025  
**Architecture Version**: v2.0.0  
**Security Audit**: Pending
