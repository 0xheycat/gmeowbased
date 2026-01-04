# Quest Escrow Bug Fix - Deployment Guide

## Problem Summary
Quest ID 11 (and all quests created via `addQuest()`) have `escrowedPoints = 0`, causing claims to fail with "InsufficientEscrow" error.

## Root Cause
The `addQuest()` function in CoreModule.sol deducts points from creator but forgets to set `q.escrowedPoints = totalEscrow` (line 112 was missing).

## The Fix
Added one line to CoreModule.sol after line 107:
```solidity
q.escrowedPoints = totalEscrow; // FIX: Set escrow for claim validation
```

This matches the pattern used in `addQuestERC20Balance()` and `addQuestNFTOwnership()` which DO set escrowedPoints correctly.

## Deployment Steps

### Option 1: Upgrade the Contract (Recommended)
Since your contract uses a proxy pattern and is upgradeable:

1. **Compile the fixed contract:**
   ```bash
   forge build
   ```

2. **Deploy new implementation:**
   ```bash
   forge create --rpc-url $BASE_RPC \
     --private-key $DEPLOYER_PRIVATE_KEY \
     --etherscan-api-key $BASESCAN_API_KEY \
     --verify \
     contract/proxy/GmeowCore.sol:GmeowCore
   ```

3. **Upgrade the proxy:**
   ```bash
   # Call upgradeTo() on the proxy contract at 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73
   cast send 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
     "upgradeTo(address)" <NEW_IMPLEMENTATION_ADDRESS> \
     --rpc-url $BASE_RPC \
     --private-key $OWNER_PRIVATE_KEY
   ```

### Option 2: Add Admin Function (Temporary Workaround)
If you can't upgrade immediately, add this function to CoreModule.sol:

```solidity
// Emergency fix for quests with missing escrow
function fixQuestEscrow(uint256 questId) external onlyOwner {
    Quest storage q = quests[questId];
    require(q.isActive, "Quest not active");
    require(q.escrowedPoints == 0, "Escrow already set");
    
    uint256 totalEscrow = q.rewardPoints * q.maxCompletions;
    q.escrowedPoints = totalEscrow;
}
```

Then call it for Quest 11:
```bash
cast send 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
  "fixQuestEscrow(uint256)" 11 \
  --rpc-url $BASE_RPC \
  --private-key $OWNER_PRIVATE_KEY
```

## Verification

After upgrade, verify Quest 11 has escrow:
```bash
cast call 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
  "quests(uint256)(string,uint8,uint256,uint256,address,uint256,uint256,string,bool,uint256,uint256)" 11 \
  --rpc-url https://mainnet.base.org
```

The 10th field (escrowedPoints) should show 200 (100 points × 2 max completions).

## Affected Quests
All quests created via the basic `addQuest()` function are affected. Check other quests:
```bash
for i in {1..15}; do
  echo "Quest $i escrow:"
  cast call 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
    "quests(uint256)" $i --rpc-url https://mainnet.base.org 2>&1 | \
    grep -A 1 "true" | tail -1
done
```

## Contract Owner
Owner: `0x8870C155666809609176260F2B65a626C000D773`

Make sure you have the private key for this address to perform the upgrade.
