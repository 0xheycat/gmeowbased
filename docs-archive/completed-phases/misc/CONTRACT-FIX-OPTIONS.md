# Contract Fix Options - Quest Escrow Bug

**Date**: December 31, 2025  
**Issue**: Quest escrow bug prevents ALL quests from being claimed  
**Root Cause**: CoreModule.sol line 112 missing `q.escrowedPoints = totalEscrow;`

## Current Situation

**Deployed Contract**: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 (Base Mainnet)  
**Contract Type**: GmeowCore (standalone deployment, NOT proxy)  
**Upgrade Status**: ❌ NOT UPGRADEABLE (no proxy pattern)  
**Owner**: 0x8870C155666809609176260F2B65a626C000D773 (oracle wallet)

### Affected Quests
- **Quest 11** (onchain): Escrow = 0 (should be 200)
- **All quests** created via `addQuest()`: Same bug
- **Quest 32** (database-only): Working (no onchain escrow required)

## ✅ Temporary Fix Applied

**Database-Only Quests**: Working now!
- Created new Quest 32 with same parameters as Quest 11
- URL: http://localhost:3000/quests/follow-gmeowbased-3dd16e37
- FID 18139 can complete and claim (database-only, no blockchain)
- Closed Quest 31 (broken onchain version)

## Fix Options

### Option A: Redeploy Contract (RECOMMENDED)

**Pros**:
- ✅ Permanent fix for all future quests
- ✅ Includes admin function to fix old quests: `fixQuestEscrow()`
- ✅ Both fixes already applied in code:
  - Line 112: `q.escrowedPoints = totalEscrow;` (for NEW quests)
  - New function: `fixQuestEscrow()` (for EXISTING quests)

**Cons**:
- ❌ Requires full migration (points, quests, users)
- ❌ ~1-2 hours deployment + testing
- ❌ Subsquid reindexing required
- ❌ Frontend config updates (contract address)

**Steps**:
1. Deploy new GmeowCore with fixes
2. Migrate treasury points from old contract
3. Update frontend: `CORE_CONTRACT_ADDRESS`
4. Reindex Subsquid from new contract
5. Test quest creation + claiming
6. Call `fixQuestEscrow(11)` to fix old quests

### Option B: Database-Only Quests (CURRENT WORKAROUND)

**Pros**:
- ✅ Already working (Quest 32 live)
- ✅ No contract changes needed
- ✅ Faster to implement
- ✅ Can create unlimited quests

**Cons**:
- ❌ No onchain escrow (trust-based)
- ❌ Rewards paid from oracle wallet manually
- ❌ Not truly decentralized
- ❌ Quest 11 and other onchain quests still broken

**How It Works**:
1. Create quest in database only (`onchain_quest_id = null`)
2. User completes verification
3. Mark as claimed in database
4. Oracle manually deposits points (optional)

### Option C: Deploy Proxy Wrapper (COMPLEX)

**Pros**:
- ✅ Future-proof (can upgrade later)
- ✅ Keeps current contract data

**Cons**:
- ❌ Very complex implementation
- ❌ Requires new proxy contract deployment
- ❌ Still needs migration of some data
- ❌ 3-5 hours development time

## Fixes Already Applied

### 1. Contract Fixes (Ready for Deployment)
```solidity
// File: contract/modules/CoreModule.sol

// Line 112 - ADDED FOR NEW QUESTS:
q.escrowedPoints = totalEscrow; // FIX: Set escrow for claim validation

// Lines 278-292 - ADDED ADMIN FUNCTION FOR OLD QUESTS:
function fixQuestEscrow(uint256 questId) external onlyOwner {
  Quest storage q = quests[questId];
  require(q.creator != address(0), "Quest does not exist");
  require(q.escrowedPoints == 0, "Escrow already set");
  
  uint256 totalEscrow = q.rewardPoints * q.maxCompletions;
  q.escrowedPoints = totalEscrow;
  
  emit QuestAdded(questId, q.creator, q.questType, q.rewardPoints, q.maxCompletions);
}
```

### 2. Frontend Fixes (DEPLOYED)
- ✅ Database-only quest support in QuestVerification.tsx
- ✅ Auto-detect quests without onchain_quest_id
- ✅ Show completion status without claim button
- ✅ Multi-wallet auth fix (profile redirect)

### 3. Auth Fix (DEPLOYED)
- ✅ Fixed `isAuthenticated` to require FID (not just wallet)
- ✅ Auto-authenticate when wallet connects
- ✅ Profile redirect now works correctly

## Testing Status

### ✅ Working
- Quest 32 (database-only): Complete and claim ✅
- Profile redirect: Fixed ✅
- Multi-wallet detection: Fixed ✅

### ❌ Still Broken
- Quest 11 (onchain): Cannot claim (escrow = 0)
- All onchain quests created before fix

## Recommendation

**Short term**: Use Option B (Database-Only Quests)
- Fastest solution
- Already working
- Create new quests without onchain escrow

**Long term**: Deploy Option A (Redeploy Contract)
- Schedule maintenance window
- Deploy fixed contract
- Migrate critical data
- Enable proper onchain escrow

## Next Steps

Choose one:

### If choosing Option B (Database-Only):
1. Continue creating quests with `onchain_quest_id = null`
2. Document manual reward process
3. Monitor for quest completion
4. Oracle deposits points as needed

### If choosing Option A (Redeploy):
1. Review deployment script: `script/DeployNewCore.sol`
2. Test on Base Sepolia first
3. Plan migration strategy
4. Schedule deployment window
5. Deploy to mainnet
6. Update Subsquid indexer
7. Test with small quest first

## Files Modified

- ✅ `contract/modules/CoreModule.sol` - Both fixes applied
- ✅ `components/quests/QuestVerification.tsx` - Database quest support
- ✅ `lib/contexts/AuthContext.tsx` - Auth flow fixed
- ✅ `lib/supabase/types/quest.ts` - Added onchain fields
- ⏸️ `scripts/upgrade-from-env.sh` - Upgrade script (can't use - not upgradeable)

## Contract Addresses

**Current (Broken)**:
- Proxy: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73
- Owner: 0x8870C155666809609176260F2B65a626C000D773
- Network: Base Mainnet

**New Implementation (Deployed but not used)**:
- Address: 0x41240C74f6A4C1bf9b8014Ed91f8D9Eb2fd55C3A
- Status: Fixed version deployed but proxy can't upgrade to it (no proxy pattern)
- Network: Base Mainnet

---

**Decision needed**: Choose Option A or Option B and proceed accordingly.
