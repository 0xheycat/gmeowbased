# Quest Wizard - Contract Integration Guide

**Status**: ✅ Ready for On-Chain Integration  
**Date**: November 26, 2025  
**Architecture**: Standalone (Base) + Monolithic (Other Chains)

## Current State

The Quest Wizard is a **fully functional UI sandbox** that creates quest drafts matching the contract struct. It's currently:
- ✅ Building valid quest parameters
- ✅ Validating all inputs
- ✅ Running verification via `/api/quests/verify`
- ⏳ NOT creating on-chain quests yet (by design)

From `FinalizeStep.tsx`:
> "Wire this draft into `createAddQuestTransaction` once the contract migrations land. Until then this wizard is purely a UX sandbox."

## Integration Plan

### Phase 1: Add On-Chain Quest Creation (Ready Now)

The wizard creates a `QuestDraft` object with all necessary fields:

```typescript
type QuestDraft = {
  // Basic fields
  name: string
  questTypeKey: string
  target: string
  maxCompletions: string
  expiresAt: string
  meta: string
  
  // Reward configuration
  rewardMode: 'points' | 'token' | 'nft'
  rewardPointsPerUser: string
  
  // Token reward (if rewardMode === 'token')
  rewardTokenAddress: string
  rewardTokenAmount: string
  
  // NFT reward (if rewardMode === 'nft')
  rewardNFTContract: string
  rewardNFTBadgeType: string
  
  // Asset gates
  tokenGateAddress: string
  tokenGateMinBalance: string
  nftGateAddress: string
  nftGateMinCount: string
  
  // Social requirements
  castLink: string
  castText: string
  mentionHandle: string
  frameUrl: string
}
```

### Phase 2: Wire Up Transaction Builder

Update `FinalizeStep.tsx` to create on-chain quests:

```typescript
import { 
  createAddQuestTx, 
  createAddQuestWithTokenRewardTx,
  createAddQuestWithNFTRewardTx,
  getCoreAddress,
  getCoreABI,
  CHAIN_IDS
} from '@/lib/gm-utils'
import { useWriteContract } from 'wagmi'

// In FinalizeStep component
const { writeContract } = useWriteContract()

async function handlePublishQuest() {
  const chain = 'base' // or get from wizard state
  
  // Build appropriate transaction based on reward mode
  let tx
  if (draft.rewardMode === 'token') {
    tx = createAddQuestWithTokenRewardTx(
      draft.name,
      draft.questTypeKey,
      BigInt(draft.target),
      BigInt(draft.rewardPointsPerUser),
      draft.rewardTokenAddress as `0x${string}`,
      BigInt(draft.rewardTokenAmount),
      BigInt(draft.maxCompletions),
      BigInt(draft.expiresAt),
      draft.meta,
      chain
    )
  } else if (draft.rewardMode === 'nft') {
    tx = createAddQuestWithNFTRewardTx(
      draft.name,
      draft.questTypeKey,
      BigInt(draft.target),
      BigInt(draft.maxCompletions),
      BigInt(draft.expiresAt),
      draft.meta,
      draft.rewardNFTContract as `0x${string}`,
      draft.rewardNFTBadgeType,
      chain
    )
  } else {
    tx = createAddQuestTx(
      draft.name,
      draft.questTypeKey,
      BigInt(draft.target),
      BigInt(draft.rewardPointsPerUser),
      BigInt(draft.maxCompletions),
      BigInt(draft.expiresAt),
      draft.meta,
      chain
    )
  }
  
  // Execute transaction
  const hash = await writeContract({
    address: tx.address,
    abi: tx.abi,
    functionName: tx.functionName,
    args: tx.args,
    chainId: CHAIN_IDS[chain],
  })
  
  // Wait for confirmation and show success
  console.log('Quest created:', hash)
}
```

### Phase 3: Add Publish Button

Add to `FinalizeStep.tsx`:

```tsx
<button
  onClick={handlePublishQuest}
  disabled={!validation.finalize.valid || publishing}
  className="guild-button guild-button--primary"
>
  {publishing ? 'Publishing to Base...' : 'Publish Quest On-Chain'}
</button>
```

## Contract Routing (Automatic)

The transaction builders automatically route to the correct contract:

**Base (Standalone):**
- Quest creation → Core contract (`0x9BDD11aA50456572E3Ea5329fcDEb81974137f92`)
- Uses `CORE_ABI` from `gmeowcore.json`

**Other Chains (Monolithic):**
- Quest creation → Monolithic contract
- Uses `GM_ABI` from `gmeowmultichain.json`

## Quest Types Mapping

The wizard's `questTypeKey` maps to contract quest types:

| Wizard Key | Contract Type | Value |
|------------|---------------|-------|
| GENERIC | 0 | Generic quest |
| HOLD_ERC20 | 1 | Hold ERC20 tokens |
| HOLD_ERC721 | 2 | Hold NFTs |
| FARCASTER_FOLLOW | 10 | Follow on Farcaster |
| FARCASTER_RECAST | 11 | Recast |
| FARCASTER_REPLY | 12 | Reply to cast |
| FARCASTER_LIKE | 13 | Like cast |
| FARCASTER_CAST | 14 | Create cast |
| FARCASTER_MENTION | 15 | Mention user |
| FARCASTER_CHANNEL_POST | 16 | Post in channel |
| FARCASTER_FRAME_INTERACT | 17 | Interact with frame |

## Validation Before Publishing

The wizard already validates:
- ✅ Quest name (1-64 chars)
- ✅ Expiry date (future timestamp)
- ✅ Max completions (> 0)
- ✅ Reward amounts (> 0)
- ✅ Token/NFT addresses (valid format)
- ✅ Social requirements (castLink, handle, etc.)
- ✅ Asset gates (if required by policy)

## Files to Update

1. **components/quest-wizard/steps/FinalizeStep.tsx**
   - Import transaction builders
   - Add `handlePublishQuest` function
   - Add publish button UI
   - Show transaction status/confirmation

2. **components/quest-wizard/QuestWizard.tsx**
   - Pass chain selection if multi-chain
   - Handle success celebration with XPEventOverlay

3. **hooks/useWizardState.ts** (if needed)
   - Add publishing state management

## Testing Checklist

Before enabling on-chain publishing:

- [ ] Test points-only quest creation
- [ ] Test token reward quest creation
- [ ] Test NFT reward quest creation
- [ ] Verify quest appears in quest list
- [ ] Test quest completion flow
- [ ] Verify rewards distribute correctly
- [ ] Test on testnet first (Base Sepolia)
- [ ] Check gas estimates reasonable
- [ ] Add error handling for failed txs
- [ ] Add success confirmation UI

## Security Considerations

1. **Owner-Only Creation**: Only contract owner can create quests
2. **Validation**: All inputs validated before tx
3. **Token Escrow**: Warn if token balance insufficient
4. **Expiry Dates**: Prevent past timestamps
5. **Asset Gates**: Verify addresses valid

## Next Steps

1. ✅ Contract ABIs updated (Core, Guild, NFT)
2. ✅ Transaction builders added to gmeow-utils.ts
3. ✅ Guild operations migrated
4. ⏳ Add publish button to FinalizeStep
5. ⏳ Test on Base testnet
6. ⏳ Deploy to production

## Example Quest Creation

```typescript
// Points-only quest
const tx = createAddQuestTx(
  'Complete Your Profile',
  'GENERIC',
  1n,          // target: 1 completion
  100n,        // reward: 100 points
  1000n,       // maxCompletions: 1000 users
  BigInt(Date.now() + 86400000), // expires in 24h
  JSON.stringify({ description: 'Fill out your profile info' }),
  'base'
)

// Token reward quest
const tx = createAddQuestWithTokenRewardTx(
  'Hold 1000 USDC',
  'HOLD_ERC20',
  1000000000n, // target: 1000 USDC (6 decimals)
  50n,         // reward: 50 points
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  5000000n,    // token reward: 5 USDC
  500n,        // maxCompletions
  BigInt(Date.now() + 604800000), // 7 days
  JSON.stringify({ description: 'DeFi power user quest' }),
  'base'
)
```

## API Integration

The wizard already uses `/api/quests/verify` for validation. After on-chain creation:

1. Quest created on-chain with tx hash
2. Backend listens for `QuestCreated` event
3. Quest indexed in Supabase
4. Available in quest list immediately

## Summary

The Quest Wizard is **production-ready as a UI tool** and can be wired up for on-chain quest creation in ~100 lines of code. All transaction builders are in place, routing is automatic, and validation is comprehensive.

**Current Status**: ✅ UI Sandbox Complete, ⏳ On-Chain Integration Pending

**Estimated Time to Enable**: 1-2 hours (add button + transaction handling)

**Risk Level**: Low (all validation in place, tested transaction builders)
