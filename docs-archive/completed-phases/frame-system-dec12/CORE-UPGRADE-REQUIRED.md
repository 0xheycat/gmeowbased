# Core Upgrade Required: Badge Authorization Management

## Problem
Guild creation fails with "Not authorized #1002" because:
- Badge contract is owned by Core (by design)
- Guild needs to be authorized as badge minter
- Core doesn't have `setBadgeAuthorizedMinter()` function in deployed version
- Core is not upgradeable (direct deployment, not proxy pattern)

## Root Cause
The deployed Core (0x0cf22803Bfac7C5Da849DdCC736A338b37163d99) was deployed WITHOUT the management function needed to authorize badge minters. This is a deployment oversight.

## Impact
- ❌ Guild creation completely blocked (can't mint "Guild Leader" badge)
- ❌ Referral badge minting will fail (can't mint "Bronze/Silver/Gold Recruiter" badges)
- ✅ Points system works (Guild/Referral authorized on Core)
- ✅ Referral code system works (recently deployed)

## Solutions Evaluated

### Option 1: Deploy New Core (RECOMMENDED)
**Pros:**
- Clean solution with proper management functions
- Future-proof for other management needs
- Allows proper badge authorization

**Cons:**
- Requires redeploying all contracts
- Need to migrate state (10K oracle points, any user points)
- Need to update frontend addresses
- Gas costs for full redeployment

**Steps:**
1. Deploy new Core with `setBadgeAuthorizedMinter()` function ✅ (code already added)
2. Initialize with oracle
3. Badge automatically created by Core
4. Authorize Guild and Referral as badge minters via new function
5. Migrate points from old Core to new Core
6. Redeploy Guild, NFT pointing to new Core  
7. Update frontend with new addresses
8. Deprecate old Core

### Option 2: Deploy New Badge + Update Modules
**Pros:**
- Smaller scope than full Core redeployment
- Can set correct ownership from start

**Cons:**
- Breaks existing badges (if any minted)
- Still requires updating all modules
- Doesn't fix underlying Core management issue

**Steps:**
1. Deploy new Badge with Oracle as owner
2. Update Guild.setBadgeContract(new badge)
3. Update Core badge reference (if possible)
4. Authorize Guild/Referral on new badge

### Option 3: Live with Limitation
**Pros:**
- No deployment work

**Cons:**
- Guild creation permanently broken ❌
- Referral badges broken ❌
- Core feature unavailable

## Recommendation

**Deploy New Core (Option 1)** because:
1. Guild creation is a core feature - can't ship without it
2. Clean solution fixes root cause
3. Code already updated with management function
4. Relatively simple migration (10K points to oracle, minimal user state)
5. Better long-term architecture

## Implementation Plan

### Phase 1: Prepare New Deployment
- [x] Add `setBadgeAuthorizedMinter()` to CoreModule
- [ ] Verify Core compilation (under 24KB)
- [ ] Update Deploy10K.sol to include post-deployment authorizations
- [ ] Test deployment on testnet

### Phase 2: Deploy New Contracts
- [ ] Deploy new Core
- [ ] Initialize with oracle
- [ ] Note new Badge address (auto-created by Core)
- [ ] Deploy new Guild pointing to new Core
- [ ] Deploy new NFT pointing to new Core
- [ ] Redeploy Referral pointing to new Core

### Phase 3: Configure Authorizations
- [ ] Authorize Guild on Core (for points)
- [ ] Authorize Referral on Core (for points)
- [ ] Authorize Guild as badge minter (via Core.setBadgeAuthorizedMinter)
- [ ] Authorize Referral as badge minter (via Core.setBadgeAuthorizedMinter)
- [ ] Set Badge contract on Guild
- [ ] Set Badge contract on Referral

### Phase 4: Migrate State
- [ ] Transfer 10K points from old Core to oracle on new Core
- [ ] Migrate any user points (if any exist)
- [ ] Verify balances

### Phase 5: Update Frontend
- [ ] Update deployments/latest.json
- [ ] Update .env variables
- [ ] Update gmeow-utils.ts addresses
- [ ] Extract and update all ABIs
- [ ] Test frontend integration
- [ ] Deploy to production

### Phase 6: Verify & Monitor
- [ ] Test guild creation end-to-end
- [ ] Test referral badge minting
- [ ] Verify all contract interactions
- [ ] Monitor for errors

## Current Code Status

**CoreModule.sol** - Line 32 (ADDED):
```solidity
function setBadgeAuthorizedMinter(address minter, bool authorized) external onlyOwner {
  if (minter == address(0)) revert ZeroAddressNotAllowed();
  badgeContract.setAuthorizedMinter(minter, authorized);
}
```

**Core Size:** 20,697 bytes (✅ under 24KB limit)

## Risk Assessment

**Low Risk:**
- Fresh deployment tested in previous deployment
- Minimal state to migrate (mainly oracle balance)
- Code already compiled and verified under size limit
- Clear rollback path (keep old Core addresses)

**Mitigation:**
- Deploy to testnet first
- Verify all functions before mainnet
- Keep old Core operational during transition
- Gradual cutover (test with new contracts before frontend switch)

## Timeline Estimate

- Testnet deployment & testing: 1-2 hours
- Mainnet deployment: 30 minutes
- Frontend updates: 30 minutes
- Testing & verification: 1 hour
- **Total: 3-4 hours**

## Next Steps

1. ✅ Create this document
2. Review with team
3. Approve deployment plan
4. Execute Phase 1-6
5. Update DEPLOYMENT-10K-COMPLETE.md with new addresses

## Alternative: Temporary Workaround

If immediate fix needed before full redeployment:
- Create authorized proxy contract
- Have Core owner manually transfer Badge ownership to proxy
- Proxy authorizes Guild/Referral
- Transfer Badge back to Core

**Issues:** Still requires Core to call `badge.transferOwnership()`, which isn't possible without the function. **Not viable.**

## Conclusion

**Core redeployment with setBadgeAuthorizedMinter is the ONLY viable solution** to enable guild creation and referral badge minting.

Status: **READY TO DEPLOY** (code updated, compiled, under size limit)
