# ABI Migration Required - New Proxy Contracts

**Date**: November 29, 2025  
**Status**: ⚠️ CRITICAL - Code using old ABI functions

## Summary

The codebase is using **OLD ABI function names** that don't exist in the new proxy contracts. This will cause all transactions to fail in production.

## Issues Found

### 1. ❌ Daily GM Function - FIXED
**File**: `lib/base-helpers.ts`  
**Problem**: Code calls `postGM(message)` but new contract has `sendGM()`  
**Status**: ✅ FIXED - Changed to `sendGM()` with no arguments

**Old Contract** (not deployed):
```solidity
function postGM(string message) external
```

**New Contract** (proxy/GmeowCore.sol):
```solidity
function sendGM() external nonReentrant whenNotPaused
```

**Fix Applied**:
```typescript
// OLD (WRONG):
functionName: 'postGM',
args: [message],

// NEW (CORRECT):
functionName: 'sendGM',
args: [],
```

### 2. ❌ NFT Minting Function - NEEDS FIX
**File**: `lib/base-helpers.ts`  
**Problem**: Code calls `mint(userAddress, badgeId)` but new contract has `mintNFT(nftTypeId, reason)`  
**Status**: ⚠️ REQUIRES REFACTOR

**Old Expected** (not in contract):
```solidity
function mint(address to, uint256 badgeId) external
```

**New Contract** (modules/NFTModule.sol):
```solidity
function mintNFT(string calldata nftTypeId, string calldata reason) 
  external payable whenNotPaused nonReentrant 
  returns (uint256)
```

**Required Changes**:
1. Change function name from `mint` to `mintNFT`
2. Change parameters:
   - Remove: `address to` (uses msg.sender)
   - Remove: `uint256 badgeId` (uses string nftTypeId)
   - Add: `string nftTypeId` (e.g., "daily-gm", "quest-master")
   - Add: `string reason` (e.g., "Completed 7-day streak")
3. Handle payment if `config.requiresPayment` is true
4. Update all badge minting calls to use new format

### 3. ✅ Guild Functions - CORRECT
**File**: `lib/base-helpers.ts`  
**Function**: `joinGuild(guildId)`  
**Status**: ✅ Matches new contract

**Contract** (modules/GuildModule.sol):
```solidity
function joinGuild(uint256 guildId) external whenNotPaused nonReentrant
```

## ABI Files Status

### Current ABIs in `lib/abi/`:
- ✅ `gmeowcore.json` - Has `sendGM`, NOT `postGM`
- ✅ `gmeowguild.json` - Has `joinGuild`, `createGuild`, etc.
- ✅ `gmeownft.json` - Has `mintNFT`, NOT `mint`
- ❓ `GmeowCombined.abi.json` - Legacy ABI, might be outdated
- ❓ `gmeowhq.json` - Legacy ABI

### Contracts in `contract/`:
- ✅ `proxy/GmeowCore.sol` - Uses `CoreModule`
- ✅ `proxy/GmeowGuild.sol` - Uses `GuildModule`
- ✅ `proxy/GmeowNFTImpl.sol` - Uses `NFTModule`
- ✅ `modules/CoreModule.sol` - Has `sendGM()`
- ✅ `modules/NFTModule.sol` - Has `mintNFT(nftTypeId, reason)`
- ✅ `modules/GuildModule.sol` - Has guild functions

## Contract Architecture

### Proxy Pattern:
```
User → GmeowProxy → delegatecall → GmeowCore (CoreModule)
                  → delegatecall → GmeowGuild (GuildModule)
                  → delegatecall → GmeowNFTImpl (NFTModule)
```

### Module Functions:
1. **CoreModule** (`sendGM`):
   - No parameters
   - Tracks streak automatically
   - Calculates reward with bonuses
   - Emits `GMEvent` and `GMSent`

2. **NFTModule** (`mintNFT`):
   - Parameters: `nftTypeId` (string), `reason` (string)
   - Requires NFT type configuration via `configureNFTMint`
   - May require payment (`msg.value >= paymentAmount`)
   - May require allowlist
   - Mints via `GmeowNFT` contract
   - One mint per user per type

3. **GuildModule** (unchanged):
   - `joinGuild(guildId)` - works as expected
   - `createGuild(...)` - works as expected

## Action Items

### Immediate (Before Preview Deployment):
- [x] Fix `preparePostGMTransaction` to use `sendGM()` - COMPLETED
- [ ] Refactor `prepareMintBadgeTransaction` for `mintNFT(nftTypeId, reason)`
- [ ] Update all NFT minting UI/logic to use new format
- [ ] Test badge minting with NFT configurations

### Nice to Have:
- [ ] Remove/deprecate `GmeowCombined.abi.json` if not needed
- [ ] Verify all ABIs match deployed contracts
- [ ] Add ABI version tracking
- [ ] Document NFT type IDs and their configurations

## NFT Configuration Required

Before minting works, NFT types must be configured:

```solidity
configureNFTMint(
  string nftTypeId,        // "daily-gm-bronze", "quest-expert", etc.
  uint256 paymentAmount,   // 0 for free, or amount in wei
  uint256 maxSupply,       // 0 for unlimited
  bool requiresPayment,    // true/false
  bool allowlistRequired,  // true/false
  bool paused,             // false to enable
  string baseMetadataURI   // "ipfs://..." or "https://..."
)
```

**Example NFT Types Needed**:
- `"daily-gm-bronze"` - 7-day streak badge
- `"daily-gm-silver"` - 30-day streak badge
- `"daily-gm-gold"` - 100-day streak badge
- `"quest-master"` - Quest completion badge
- `"og-member"` - Early adopter badge

## Testing Checklist

Before deploying:
- [ ] Test `sendGM()` on testnet
- [ ] Configure test NFT types
- [ ] Test `mintNFT("test-badge", "Testing")` on testnet
- [ ] Verify events are emitted correctly
- [ ] Check gas costs with paymaster
- [ ] Test on all 6 chains (base, op, unichain, celo, ink, arbitrum)

## Files Modified

1. ✅ `lib/base-helpers.ts` - Fixed `sendGM()`
2. ⚠️ `lib/base-helpers.ts` - Needs `mintNFT()` refactor
3. ⚠️ `lib/contract-mint.ts` - May need updates
4. ⚠️ `lib/contract-nft-mint.ts` - May need updates
5. ⚠️ Badge minting UI components - Need updates

---

**CRITICAL**: Do NOT deploy to preview until NFT minting is refactored!  
GM posting will work, but badge minting will fail with "function not found" error.
