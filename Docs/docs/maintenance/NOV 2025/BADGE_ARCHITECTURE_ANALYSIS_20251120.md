# Badge Minting Architecture Analysis

**Date:** November 20, 2025  
**Issue:** Contract revert error `0x118cdaa7` when attempting to mint badges

---

## Contract Architecture

### SoulboundBadge.sol
```solidity
contract SoulboundBadge is ERC721, Ownable {
  function mint(address to, string calldata kind) external onlyOwner returns (uint256)
}
```
- Uses **OpenZeppelin Ownable** (NOT AccessControl)
- `mint()` has `onlyOwner` modifier
- Only contract owner can mint
- Non-transferable (soulbound) ERC721 tokens

### GmeowMultichain.sol
```solidity
constructor(address _oracleSigner) Ownable(msg.sender) {
  oracleSigner = _oracleSigner;
  badgeContract = new SoulboundBadge("GmeowBadge", "GMEOWB");  // ← Deploys badge
}

function mintBadgeFromPoints(uint256 pointsToBurn, string calldata badgeType) 
  external whenNotPaused returns (uint256) 
{
  require(pointsToBurn > 0, "Points > 0");
  burnPoints(msg.sender, pointsToBurn);
  uint256 tokenId = badgeContract.mint(msg.sender, badgeType);  // ← Mints badge
  emit BadgeMinted(msg.sender, tokenId, badgeType);
  return tokenId;
}
```
- Deploys SoulboundBadge in constructor
- **Becomes the owner** of SoulboundBadge
- Has `mintBadgeFromPoints()` function to mint badges
- Burns user points and mints badge

---

## Current vs Expected Behavior

### What Worker Currently Does ❌
```typescript
// lib/contract-mint.ts line 128
const { request } = await publicClient.simulateContract({
  address: contractAddress,  // ← SoulboundBadge address
  abi: BADGE_ABI,
  functionName: 'mint',      // ← Calls SoulboundBadge.mint() directly
  args: [to, mint.badgeType],
  account,                    // ← Oracle wallet (0x8870...)
})
```

**Problem:** Oracle wallet is NOT the owner of SoulboundBadge!

### On-Chain State ✅
```
Badge Contract (BASE): 0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9
Owner: 0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F ← GmeowMultichain contract
Oracle Wallet: 0x8870C155666809609176260F2B65a626C000D773
```

---

## Solutions

### Option 1: Transfer Ownership (❌ NOT RECOMMENDED)
```solidity
// From owner wallet (GmeowMultichain deployer)
badgeContract.transferOwnership(0x8870C155666809609176260F2B65a626C000D773);
```

**Cons:**
- Breaks the system architecture
- GmeowMultichain can no longer mint badges
- Users can't mint via `mintBadgeFromPoints()`
- Loses point-burning mechanism

### Option 2: Use GmeowMultichain Contract (✅ RECOMMENDED)
Update worker to call `GmeowMultichain.mintBadgeFromPoints()`:

```typescript
// Update lib/contract-mint.ts
const { request } = await publicClient.simulateContract({
  address: gmContractAddress,  // ← Use GmeowMultichain address, not badge
  abi: GM_ABI,
  functionName: 'mintBadgeFromPoints',
  args: [pointsRequired, mint.badgeType],
  account,  // Oracle wallet
})
```

**Pros:**
- Follows intended architecture
- Maintains point system integrity
- Works with existing contract deployment
- No ownership transfer needed

**Cons:**
- Need to fund oracle wallet with points
- OR: Add `mintBadgeForUser()` function to GmeowMultichain

### Option 3: Add Oracle Minting Function (✅ BEST)
Add new function to GmeowMultichain.sol:

```solidity
// Add to GmeowMultichain.sol
function oracleMintBadge(address to, string calldata badgeType) 
  external 
  whenNotPaused 
  returns (uint256) 
{
  require(msg.sender == oracleSigner, "Only oracle");
  uint256 tokenId = badgeContract.mint(to, badgeType);
  emit BadgeMinted(to, tokenId, badgeType);
  return tokenId;
}
```

**Pros:**
- Oracle can mint without burning points
- Maintains proper access control
- No ownership transfer needed
- Clean separation of concerns

**Cons:**
- Requires contract upgrade/redeployment

---

## Recommended Approach

Since contracts are already deployed, use **Option 2** with a modification:

### Update Worker to Call GmeowMultichain

**Step 1:** Check if GmeowMultichain has oracle-permissioned mint function

**Step 2:** If not, use alternative:
- Transfer small amount of points to oracle wallet
- Oracle calls `mintBadgeFromPoints()` on behalf of user
- Points system tracks this separately

**Step 3:** For future: Deploy updated contract with `oracleMintBadge()`

---

## Contract Addresses

### Base Chain
- GmeowMultichain: `0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F`
- SoulboundBadge: `0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9`
- Oracle Wallet: `0x8870C155666809609176260F2B65a626C000D773`

### Other Chains
Need to verify if same architecture (GmeowMultichain owns badges) or different

---

## Next Steps

1. ✅ Identify contract ownership structure
2. ⏳ Check GmeowMultichain for oracle mint function
3. ⏳ Update worker code to use correct minting method
4. ⏳ Test mint on localhost
5. ⏳ Deploy to production
6. 📋 Future: Add `oracleMintBadge()` in next contract version
