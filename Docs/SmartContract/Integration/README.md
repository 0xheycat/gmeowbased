# Smart Contract Integration Documentation

This directory contains guides for integrating Gmeow smart contracts with frontend applications, Quest Wizard, and other systems.

## Documents

### [CONTRACT-INTEGRATION-COMPLETE.md](./CONTRACT-INTEGRATION-COMPLETE.md)
**Purpose**: Complete guide for integrating contracts into frontend applications

**Key Topics**:
- Frontend integration patterns
- Wagmi v2 configuration and setup
- Transaction builders and helpers
- ABI management
- Multi-chain support
- Error handling patterns
- Testing integration

**Use When**: You need to integrate contracts with React/Next.js frontend

**Target Audience**: Frontend Developers

**Key Functions**:
- `getContractAddress(chain)` - Get contract address for chain
- `getContractABI(chain)` - Get ABI for chain (standalone vs monolithic)
- `createAddQuestTx()` - Build quest creation transaction
- `createJoinGuildTx()` - Build guild join transaction

---

### [CONTRACT-MIGRATION-GUIDE.md](./CONTRACT-MIGRATION-GUIDE.md)
**Purpose**: Guide for migrating from old contract versions to new standalone architecture

**Key Topics**:
- Migration path from monolithic to standalone
- Breaking changes and compatibility
- Data migration strategies
- Frontend code updates required
- Backward compatibility layer
- Testing migration

**Use When**: You need to migrate existing deployments or update frontend code

**Target Audience**: Full-Stack Developers, DevOps

**Migration Steps**:
1. Audit existing contract calls
2. Update contract addresses
3. Update ABI imports
4. Test on testnet
5. Deploy updated frontend
6. Monitor for issues

---

### [CONTRACT-UPDATE-CHANGELOG.md](./CONTRACT-UPDATE-CHANGELOG.md)
**Purpose**: Comprehensive changelog of all contract updates and modifications

**Key Topics**:
- Version history
- Breaking changes log
- New features added
- Bug fixes
- Security patches
- Optimization improvements

**Use When**: You need to understand what changed between versions

**Target Audience**: All Developers

**Format**:
```markdown
## [v2.1.0] - 2025-11-26
### Added
- NFT reward quests
- Guild treasury management

### Changed
- Quest expiry validation improved
- Gas optimization for batch operations

### Fixed
- Reentrancy vulnerability in reward claiming
```

---

### [QUEST-WIZARD-CONTRACT-INTEGRATION.md](./QUEST-WIZARD-CONTRACT-INTEGRATION.md)
**Purpose**: Specific integration guide for Quest Wizard on-chain publishing

**Key Topics**:
- Quest Wizard architecture
- On-chain publishing flow
- Transaction building for quests
- Wallet integration (Wagmi)
- Quest type mapping
- Reward modes (points, ERC20, NFT)
- Error handling and UX

**Use When**: You need to understand or modify Quest Wizard's on-chain features

**Target Audience**: Frontend Developers working on Quest Wizard

**Components**:
- `FinalizeStep.tsx` - Main publishing component
- `useAccount` - Wallet connection
- `useWriteContract` - Transaction execution
- `useWaitForTransactionReceipt` - Confirmation handling

---

## Integration Overview

### Frontend Architecture

```
┌──────────────────────────────────────────────┐
│                                              │
│  Next.js App (app/)                          │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Wagmi Provider                        │ │
│  │  ├─ Config (chains, transports)        │ │
│  │  ├─ useAccount (wallet)                │ │
│  │  ├─ useWriteContract (tx execution)    │ │
│  │  └─ useWaitForTransactionReceipt       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Contract Utils (lib/gmeow-utils.ts)      │ │
│  │  ├─ getContractAddress(chain)          │ │
│  │  ├─ getContractABI(chain)              │ │
│  │  ├─ createAddQuestTx(params)           │ │
│  │  ├─ createJoinGuildTx(params)          │ │
│  │  └─ toQuestTypeCode(key)               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  UI Components                          │ │
│  │  ├─ Quest Wizard                       │ │
│  │  ├─ Guild Management                   │ │
│  │  ├─ Badge Collection                   │ │
│  │  └─ Leaderboard                        │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│                                              │
│  Smart Contracts (Base Mainnet)              │
│  ├─ GmeowCore                               │
│  ├─ GmeowGuildStandalone                    │
│  └─ GmeowNFTStandalone                      │
│                                              │
└──────────────────────────────────────────────┘
```

### Integration Patterns

#### 1. Read Data (Free)

```typescript
import { useReadContract } from 'wagmi'

// Get user points
const { data: points } = useReadContract({
  address: coreAddress,
  abi: coreABI,
  functionName: 'getUserPoints',
  args: [userAddress]
})
```

#### 2. Write Data (Costs Gas)

```typescript
import { useWriteContract } from 'wagmi'

// Create quest
const { writeContract } = useWriteContract()

await writeContract({
  address: coreAddress,
  abi: coreABI,
  functionName: 'addQuest',
  args: [questData],
  chainId: 8453
})
```

#### 3. Transaction Builders (Helper Pattern)

```typescript
import { createAddQuestTx } from '@/lib/gm-utils'

// Build transaction object
const tx = createAddQuestTx({
  name: 'Follow on Farcaster',
  questType: 10,
  expiry: Date.now() + 86400000,
  // ... other params
})

// Execute
await writeContract(tx)
```

### Multi-Chain Support

```typescript
// Automatic chain routing
function getContractAddress(chain: GMChainKey) {
  if (chain === 'base') {
    // Standalone architecture
    return {
      core: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
      guild: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',
      nft: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20'
    }
  } else {
    // Monolithic architecture
    return {
      core: MONOLITHIC_ADDRESSES[chain]
    }
  }
}
```

## Quest Wizard Integration

### Publishing Flow

```
┌─────────────────────────────────────────────┐
│ Step 1: Quest Details                       │
│  ├─ Name, Type, Chain, Expiry               │
│  └─ Social requirements (follow, cast, etc) │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Step 2: Eligibility                         │
│  ├─ Open to all / Gated                     │
│  └─ Requirements (badges, points, etc)      │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Step 3: Rewards                             │
│  ├─ Points / ERC20 Token / NFT              │
│  └─ Amount per completion                   │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Step 4: Finalize & Publish                  │
│  ├─ Review all details                      │
│  ├─ Connect wallet                          │
│  ├─ Click "Publish Quest On-Chain"         │
│  ├─ Confirm transaction in wallet          │
│  ├─ Wait for confirmation (~2-5 seconds)   │
│  └─ See success with Basescan link         │
└─────────────────────────────────────────────┘
```

### Quest Type Mapping

```typescript
const QUEST_TYPE_MAP = {
  'FARCASTER_FOLLOW': 10,
  'FARCASTER_CAST': 11,
  'FARCASTER_RECAST': 12,
  'HOLD_ERC20': 1,
  'COMPLETE_ACTIVITY': 3,
  // ... other types
}

function toQuestTypeCode(key: string): number {
  return QUEST_TYPE_MAP[key] || 0
}
```

### Transaction Building

```typescript
// Points-only quest
const tx = createAddQuestTx({
  name: draft.name,
  questType: toQuestTypeCode(draft.questTypeKey),
  expiresAt: new Date(draft.expiresAtISO).getTime(),
  rewardPoints: draft.rewardPoints,
  maxCompletions: draft.maxCompletions,
  target: draft.target,
  metaData: JSON.stringify({
    headline: draft.headline,
    description: draft.description,
    // ... other fields
  })
})

// ERC20 token reward quest
const tx = createAddQuestWithERC20Tx({
  // ... same params ...
  tokenAddress: draft.rewardToken,
  tokenPerUser: draft.rewardTokenPerUser
})
```

## ABI Management

### Structure

```
lib/abi/
├── core-standalone.abi.json       # Base Core contract
├── guild-standalone.abi.json      # Base Guild contract
├── nft-standalone.abi.json        # Base NFT contract
└── monolithic.abi.json            # Other chains
```

### Usage

```typescript
import coreStandaloneABI from '@/lib/abi/core-standalone.abi.json'
import monolithicABI from '@/lib/abi/monolithic.abi.json'

function getABI(chain: GMChainKey) {
  return chain === 'base' ? coreStandaloneABI : monolithicABI
}
```

### Updating ABIs

```bash
# After contract changes
cd contract/
forge build

# Export ABIs
forge inspect GmeowCoreStandalone abi > ../lib/abi/core-standalone.abi.json
forge inspect GmeowGuildStandalone abi > ../lib/abi/guild-standalone.abi.json
forge inspect GmeowNFTStandalone abi > ../lib/abi/nft-standalone.abi.json
```

## Error Handling

### Common Errors

```typescript
// Wallet not connected
if (!isConnected) {
  return <ConnectWalletButton />
}

// Wrong network
if (chainId !== 8453) {
  return <SwitchNetworkButton targetChain={8453} />
}

// Insufficient gas
try {
  await writeContract(tx)
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    toast.error('Insufficient ETH for gas')
  }
}

// Transaction reverted
if (error.message.includes('execution reverted')) {
  // Parse revert reason
  const reason = parseRevertReason(error)
  toast.error(`Transaction failed: ${reason}`)
}
```

### User-Friendly Messages

```typescript
const ERROR_MESSAGES = {
  'Quest already exists': 'A quest with this name already exists',
  'Not contract owner': 'Only contract owner can create quests',
  'Invalid expiry': 'Expiry date must be in the future',
  'Insufficient allowance': 'Please approve token spending first'
}
```

## Testing Integration

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { createAddQuestTx } from '@/lib/gm-utils'

describe('createAddQuestTx', () => {
  it('creates valid transaction object', () => {
    const tx = createAddQuestTx({ /* params */ })
    expect(tx.address).toBeDefined()
    expect(tx.abi).toBeDefined()
    expect(tx.functionName).toBe('addQuest')
  })
})
```

### Integration Tests

```typescript
// Test on testnet
const { result } = await writeContract({
  address: testnetCoreAddress,
  abi: coreABI,
  functionName: 'addQuest',
  args: [testQuestData],
  chainId: 84532 // Base Sepolia
})

expect(result.status).toBe('success')
```

### Manual Testing Checklist

- [ ] Connect wallet
- [ ] Switch to Base Mainnet
- [ ] Fill Quest Wizard (all 4 steps)
- [ ] Click "Publish Quest On-Chain"
- [ ] Confirm in wallet
- [ ] Verify transaction on Basescan
- [ ] Check quest appears in quest list
- [ ] Test quest completion flow

## Related Documentation

- [← Back to Smart Contract Docs](../)
- [Architecture Documentation →](../Architecture/)
- [Deployment Guides →](../Deployment/)

## Quick Links

- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [Base Documentation](https://docs.base.org/)
- [Basescan API](https://docs.basescan.org/)

---

**Last Updated**: November 26, 2025
