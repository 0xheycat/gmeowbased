# Quick Reference: Proxy Contract Architecture

**Last Updated**: November 28, 2025  
**Version**: v2.0.0

---

## Contract Addresses (All Chains)

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

---

## Common Operations

### Send GM
```typescript
import { createSendGMTx } from '@/lib/gm-utils'

const tx = createSendGMTx('base')
await writeContract(tx)
```

### Check User Stats
```typescript
import { createGetUserStatsCall, getCoreAddress, getCoreABI } from '@/lib/gm-utils'
import { readContract } from 'viem'

const stats = await readContract({
  address: getCoreAddress('base'),
  abi: getCoreABI('base'),
  functionName: 'getUserStats',
  args: [userAddress],
})
```

### Create Guild
```typescript
import { createGuildTx } from '@/lib/gm-utils'

const tx = createGuildTx('My Guild', 'op')
await writeContract(tx)
```

### Mint NFT Badge
```typescript
import { createMintNFTTx } from '@/lib/gm-utils'

const tx = createMintNFTTx('BADGE_LEGENDARY', 'Achievement unlocked', 'arbitrum')
await writeContract(tx)
```

---

## Type Guards

### Check if Chain Has Contracts
```typescript
import { isGMChain } from '@/lib/gm-utils'

if (isGMChain(chain)) {
  // TypeScript knows chain is GMChainKey
  const tx = createSendGMTx(chain)
}
```

### Assert Valid GM Chain
```typescript
import { assertGMChainKey } from '@/lib/gm-utils'

// Throws if invalid, returns fallback if undefined
const chain = assertGMChainKey(userInput, 'base')
```

---

## Environment Variables

Add to `.env.local`:

```bash
# BASE
NEXT_PUBLIC_GM_BASE_CORE=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
NEXT_PUBLIC_GM_BASE_GUILD=0x967457be45facE07c22c0374dAfBeF7b2f7cd059
NEXT_PUBLIC_GM_BASE_NFT=0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
NEXT_PUBLIC_GM_BASE_PROXY=0x6A48B758ed42d7c934D387164E60aa58A92eD206

# OPTIMISM
NEXT_PUBLIC_GM_OP_CORE=0x1599e491FaA2F22AA053dD9304308231c0F0E15B
NEXT_PUBLIC_GM_OP_GUILD=0x71EA982A8E2be62191ac7e2A98277c986DEbBc58
NEXT_PUBLIC_GM_OP_NFT=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
NEXT_PUBLIC_GM_OP_PROXY=0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839

# UNICHAIN, CELO, INK, ARBITRUM (see .env.contracts.example)
```

---

## Block Explorers

| Chain | Explorer | Link |
|-------|----------|------|
| Base | Basescan | https://basescan.org |
| Optimism | Optimistic Etherscan | https://optimistic.etherscan.io |
| Arbitrum | Arbiscan | https://arbiscan.io |
| Celo | Celoscan | https://celoscan.io |
| Unichain | TBD | - |
| Ink | TBD | - |

---

## Helper Functions

```typescript
// Get contract addresses
getCoreAddress(chain: GMChainKey): `0x${string}`
getGuildAddress(chain: GMChainKey): `0x${string}`
getNFTAddress(chain: GMChainKey): `0x${string}`
getProxyAddress(chain: GMChainKey): `0x${string}`

// Get ABIs
getCoreABI(chain: GMChainKey): Abi
getGuildABI(chain: GMChainKey): Abi
getNFTABI(chain: GMChainKey): Abi

// Type guards
isGMChain(chain: ChainKey): chain is GMChainKey
assertGMChainKey(value: unknown, fallback?: GMChainKey): GMChainKey
```

---

## Testing

```bash
# TypeScript compilation check
npm run type-check

# Run Foundry tests
forge test

# Test specific chain
CHAIN=base npm run test:integration
```

---

**Full Documentation**: `Docs/Maintenance/PROXY-CONTRACT-ARCHITECTURE.md`  
**Integration Summary**: `PROXY-CONTRACT-INTEGRATION-SUMMARY.md`  
**Environment Template**: `.env.contracts.example`
