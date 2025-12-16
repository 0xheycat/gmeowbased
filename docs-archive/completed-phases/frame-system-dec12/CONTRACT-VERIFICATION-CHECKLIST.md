# 🔍 Contract Verification Checklist - Base Explorer
## Direct Verification Against Deployed Contracts

**Date**: December 11, 2025  
**Network**: Base Mainnet (Chain ID: 8453)  
**Explorer**: https://basescan.org

---

## 📋 Contract Addresses (Current in Codebase)

From `lib/gmeow-utils.ts` and `.env`:

```typescript
STANDALONE_ADDRESSES = {
  base: {
    core: '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
    guild: '0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3',
    nft: '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C',
    badge: '0x5Af50Ee323C45564d94B0869d95698D837c59aD2',
    referral: '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44',
    proxy: '0x6A48B758ed42d7c934D387164E60aa58A92eD206', // ⚠️ Should not be used anymore
  },
}
```

---

## ✅ Verification Tasks

### **Task 1: Verify Core Contract**

**Address**: `0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73`

**Explorer Link**: https://basescan.org/address/0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract name matches: `GmeowCore` or `GmeowCoreStandalone`
- [ ] Deployment date: _________________
- [ ] Deployer address: _________________
- [ ] Current ABI matches deployed contract
- [ ] Key functions exist:
  - [ ] `gm()` or `executeGM()`
  - [ ] `getUserXP(address)`
  - [ ] `getCurrentStreak(address)`
  - [ ] `isGMToday(address)`
- [ ] Events emitted:
  - [ ] `GMed(address indexed user, uint256 timestamp, uint256 xpAwarded)`
  - [ ] `XPAwarded(address indexed user, uint256 amount)`
  - [ ] `StreakUpdated(address indexed user, uint256 currentStreak)`

**Action Items**:
- [ ] Download ABI from explorer
- [ ] Compare with `abi/GmeowCore.abi.json`
- [ ] Update if differences found

---

### **Task 2: Verify Guild Contract**

**Address**: `0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3`

**Explorer Link**: https://basescan.org/address/0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract name matches: `GmeowGuildStandalone` or `GmeowGuild`
- [ ] Deployment date: _________________
- [ ] Deployer address: _________________
- [ ] Architecture: Standalone (NOT behind proxy)
- [ ] Current ABI matches deployed contract
- [ ] Key functions exist:
  - [ ] `createGuild(string name, string description)`
  - [ ] `joinGuild(uint256 guildId)`
  - [ ] `leaveGuild(uint256 guildId)`
  - [ ] `getGuildMembers(uint256 guildId)`
  - [ ] `getGuildStats(uint256 guildId)`
  - [ ] `depositToTreasury(uint256 guildId) payable`
- [ ] Events emitted:
  - [ ] `GuildCreated(uint256 indexed guildId, address indexed owner, string name)`
  - [ ] `MemberJoined(uint256 indexed guildId, address indexed member)`
  - [ ] `MemberLeft(uint256 indexed guildId, address indexed member)`
  - [ ] `TreasuryDeposit(uint256 indexed guildId, address indexed depositor, uint256 amount)`
  - [ ] `PointsAwarded(uint256 indexed guildId, address indexed member, uint256 points)`

**Action Items**:
- [ ] Download ABI from explorer
- [ ] Compare with `abi/GmeowGuildStandalone.abi.json`
- [ ] Update if differences found
- [ ] **CRITICAL**: Verify NOT using proxy pattern

---

### **Task 3: Verify NFT Contract**

**Address**: `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C`

**Explorer Link**: https://basescan.org/address/0xCE9596a992e38c5fa2d997ea916a277E0F652D5C

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract name matches: `GmeowNFT` or `GmeowNFTStandalone`
- [ ] Deployment date: _________________
- [ ] Deployer address: _________________
- [ ] Standard: ERC-721
- [ ] Current ABI matches deployed contract
- [ ] Key functions exist:
  - [ ] `mint(address to, string uri)`
  - [ ] `tokenURI(uint256 tokenId)`
  - [ ] `balanceOf(address owner)`
  - [ ] `ownerOf(uint256 tokenId)`
- [ ] Events emitted:
  - [ ] `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`
  - [ ] `Minted(address indexed to, uint256 indexed tokenId, string uri)`

**Action Items**:
- [ ] Download ABI from explorer
- [ ] Compare with `abi/GmeowNFT.abi.json`
- [ ] Update if differences found

---

### **Task 4: Verify Badge Contract**

**Address**: `0x5Af50Ee323C45564d94B0869d95698D837c59aD2`

**Explorer Link**: https://basescan.org/address/0x5Af50Ee323C45564d94B0869d95698D837c59aD2

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract name matches: `GmeowBadge` or `GmeowBadgeStandalone`
- [ ] Deployment date: _________________
- [ ] Deployer address: _________________
- [ ] Standard: ERC-1155 or ERC-721
- [ ] Current ABI matches deployed contract
- [ ] Key functions exist:
  - [ ] `mint(address to, uint256 badgeId, uint256 amount)` (if ERC-1155)
  - [ ] `mint(address to, uint256 tokenId)` (if ERC-721)
  - [ ] `balanceOf(address account, uint256 id)` or `balanceOf(address owner)`
  - [ ] `uri(uint256 tokenId)` or `tokenURI(uint256 tokenId)`
- [ ] Events emitted:
  - [ ] `TransferSingle` or `Transfer`
  - [ ] `BadgeMinted(address indexed to, uint256 indexed badgeId)`

**Action Items**:
- [ ] Download ABI from explorer
- [ ] Compare with `abi/GmeowBadge.abi.json` (if exists)
- [ ] Update if differences found
- [ ] Verify badge type system (achievement, viral, etc.)

---

### **Task 5: Verify Referral Contract**

**Address**: `0x9E7c32C1fB3a2c08e973185181512a442b90Ba44`

**Explorer Link**: https://basescan.org/address/0x9E7c32C1fB3a2c08e973185181512a442b90Ba44

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract name matches: `GmeowReferralStandalone` or `GmeowReferral`
- [ ] Deployment date: _________________
- [ ] Deployer address: _________________
- [ ] Architecture: Standalone (NOT behind proxy)
- [ ] Current ABI matches deployed contract
- [ ] Key functions exist:
  - [ ] `createReferralCode(string code)`
  - [ ] `useReferralCode(string code)`
  - [ ] `getReferralOwner(string code)`
  - [ ] `getReferralStats(address user)`
  - [ ] `getTotalReferrals(address referrer)`
- [ ] Events emitted:
  - [ ] `ReferralCodeCreated(address indexed owner, string code)`
  - [ ] `ReferralUsed(address indexed referrer, address indexed referee, string code, uint256 reward)`

**Action Items**:
- [ ] Download ABI from explorer
- [ ] Compare with `abi/GmeowReferralStandalone.abi.json`
- [ ] Update if differences found
- [ ] **CRITICAL**: Verify referral page uses standalone ABI (not proxy)
- [ ] Check function name: `getReferralOwner` vs `getReferralCodeOwner`

---

### **Task 6: Verify Proxy Contract (Legacy - Should NOT Be Used)**

**Address**: `0x6A48B758ed42d7c934D387164E60aa58A92eD206`

**Explorer Link**: https://basescan.org/address/0x6A48B758ed42d7c934D387164E60aa58A92eD206

**Checklist**:
- [ ] Contract is verified on BaseScan
- [ ] Contract type: UUPS Proxy or Transparent Proxy
- [ ] Deployment date: _________________
- [ ] **CRITICAL CHECK**: Is this still being used in codebase?
- [ ] Grep search for proxy address usage:
  ```bash
  grep -r "0x6A48B758ed42d7c934D387164E60aa58A92eD206" app/ components/ lib/
  ```
- [ ] If found, mark files for refactor to standalone contracts

**Action Items**:
- [ ] Verify NO code uses proxy address
- [ ] Confirm all routes use standalone addresses
- [ ] Update documentation to clarify proxy is deprecated

---

## 🔧 Verification Commands

### **1. Download ABIs from Explorer**

```bash
# Using curl (requires API key from BaseScan)
curl "https://api.basescan.org/api?module=contract&action=getabi&address=0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73&apikey=YOUR_API_KEY" > abi/GmeowCore.explorer.json

curl "https://api.basescan.org/api?module=contract&action=getabi&address=0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3&apikey=YOUR_API_KEY" > abi/GmeowGuildStandalone.explorer.json

curl "https://api.basescan.org/api?module=contract&action=getabi&address=0xCE9596a992e38c5fa2d997ea916a277E0F652D5C&apikey=YOUR_API_KEY" > abi/GmeowNFT.explorer.json

curl "https://api.basescan.org/api?module=contract&action=getabi&address=0x5Af50Ee323C45564d94B0869d95698D837c59aD2&apikey=YOUR_API_KEY" > abi/GmeowBadge.explorer.json

curl "https://api.basescan.org/api?module=contract&action=getabi&address=0x9E7c32C1fB3a2c08e973185181512a442b90Ba44&apikey=YOUR_API_KEY" > abi/GmeowReferralStandalone.explorer.json
```

### **2. Compare ABIs**

```bash
# Compare Core ABI
diff <(jq -S . abi/GmeowCore.abi.json) <(jq -S . abi/GmeowCore.explorer.json)

# Compare Guild ABI
diff <(jq -S . abi/GmeowGuildStandalone.abi.json) <(jq -S . abi/GmeowGuildStandalone.explorer.json)

# Compare NFT ABI
diff <(jq -S . abi/GmeowNFT.abi.json) <(jq -S . abi/GmeowNFT.explorer.json)

# Compare Badge ABI
diff <(jq -S . abi/GmeowBadge.abi.json) <(jq -S . abi/GmeowBadge.explorer.json)

# Compare Referral ABI
diff <(jq -S . abi/GmeowReferralStandalone.abi.json) <(jq -S . abi/GmeowReferralStandalone.explorer.json)
```

### **3. Verify Contract Deployment Blocks**

```bash
# Using cast (Foundry)
cast block-number --rpc-url https://mainnet.base.org

# Get first transaction for each contract
cast tx <DEPLOYMENT_TX_HASH> --rpc-url https://mainnet.base.org
```

### **4. Test Contract Reads**

```bash
# Test Core contract
cast call 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
  "getUserXP(address)(uint256)" \
  "0xYOUR_TEST_ADDRESS" \
  --rpc-url https://mainnet.base.org

# Test Guild contract
cast call 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3 \
  "getGuildStats(uint256)(uint256,uint256,uint256)" \
  "1" \
  --rpc-url https://mainnet.base.org

# Test Referral contract
cast call 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44 \
  "getReferralOwner(string)(address)" \
  "TESTCODE" \
  --rpc-url https://mainnet.base.org
```

---

## 🚨 Critical Issues to Check

### **Issue 1: Referral Page Using Proxy**

**File to check**: `app/referral/*`, `app/api/referral/*`

**Command**:
```bash
grep -r "PROXY\|proxy\|0x6A48B758ed42d7c934D387164E60aa58A92eD206" app/referral/ app/api/referral/
```

**Expected**: Should use `STANDALONE_ADDRESSES.base.referral` only

**If found**: Refactor to use standalone contract

---

### **Issue 2: getReferralCodeOwner vs getReferralOwner**

**Error**: `getReferralCodeOwner` does not exist (TypeScript error found)

**Files to check**:
```bash
grep -r "getReferralCodeOwner" app/ lib/
```

**Expected**: Function name should be `getReferralOwner` (verify in explorer)

**Fix**: Update all calls to correct function name

---

### **Issue 3: Missing ABIs**

**Files to check**:
```bash
ls -lh abi/*.json
ls -lh lib/contracts/abis/*.json
```

**Required ABIs**:
- [x] GmeowCore.abi.json
- [x] GmeowGuildStandalone.abi.json
- [x] GmeowNFT.abi.json
- [ ] GmeowBadge.abi.json (might be missing)
- [x] GmeowReferralStandalone.abi.json
- [ ] GmeowCombined.abi.json (legacy?)

**Action**: Download missing ABIs from explorer

---

### **Issue 4: Proxy References in Code**

**Command**:
```bash
# Find all proxy usage
grep -rn "proxy\|PROXY\|0x6A48B758" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# Find implementation pattern (UUPS)
grep -rn "implementation\|upgradeTo" app/ lib/ --include="*.ts"
```

**Expected**: Zero references (standalone architecture)

**If found**: Refactor to standalone contracts

---

## 📝 Verification Report Template

After completing all tasks, fill out:

### **Contract Verification Summary**

**Date Verified**: _________________  
**Verified By**: _________________

| Contract | Address | Verified | ABI Match | Deployment Block | Notes |
|----------|---------|----------|-----------|------------------|-------|
| Core | 0x9EB9...D73 | ✅/❌ | ✅/❌ | _______ | _____________ |
| Guild | 0x6754...C8A3 | ✅/❌ | ✅/❌ | _______ | _____________ |
| NFT | 0xCE95...2D5C | ✅/❌ | ✅/❌ | _______ | _____________ |
| Badge | 0x5Af5...9aD2 | ✅/❌ | ✅/❌ | _______ | _____________ |
| Referral | 0x9E7c...Ba44 | ✅/❌ | ✅/❌ | _______ | _____________ |
| Proxy (deprecated) | 0x6A48...D206 | ✅/❌ | N/A | _______ | Should not be used |

### **Issues Found**

1. _____________________________________________________________________
2. _____________________________________________________________________
3. _____________________________________________________________________

### **Action Items**

- [ ] Update ABIs in `abi/` directory
- [ ] Update `lib/contracts/abis.ts` if addresses changed
- [ ] Refactor referral page to use standalone contract
- [ ] Fix `getReferralCodeOwner` → `getReferralOwner`
- [ ] Remove all proxy references
- [ ] Test all contract interactions
- [ ] Update `.env` if addresses changed

### **Subsquid Migration Blockers**

- [ ] All contracts verified
- [ ] All ABIs accurate
- [ ] All deployment blocks known
- [ ] All events documented
- [ ] Ready for indexer development

---

**Next Steps**: After verification complete, proceed with Subsquid setup (Phase 2 of migration plan)

---

**Document Created**: December 11, 2025  
**Status**: 🔴 Awaiting Verification  
**Owner**: DevOps / Smart Contract Team
