# Migration Guide: Referral + Guild System Rebuild

**Date**: December 6, 2025  
**Phase**: Phase 1 - Contract Integration  
**Status**: ⚠️ ABI UPDATE REQUIRED

---

## 🚨 Critical Issue: Missing Referral Functions in ABI

### Problem

The **GmeowCore.abi.json** file is missing referral functions despite the deployed contract (GmeowCoreStandalone.sol) inheriting from ReferralModule.

**Contract Source** (`contract/GmeowCoreStandalone.sol`):
```solidity
contract GmeowCore is CoreModule, ReferralModule {
  // Inherits ALL referral functions
}
```

**Missing Functions** (from `contract/modules/ReferralModule.sol`):
- `registerReferralCode(string code)`
- `setReferrer(string code)`
- `referralCodeOf(address user) view returns (string)`
- `referralOwnerOf(string code) view returns (address)`
- `referrerOf(address user) view returns (address)`
- `referralStats(address user) view returns (ReferralStats)`
- `referralTierClaimed(address user) view returns (uint8)`

**Current ABI State**:
- `abi/GmeowCore.abi.json`: 158 entries, **NO referral functions** ❌
- `abi/GmeowGuild.abi.json`: Contains all guild functions ✅
- `abi/GmeowCombined.abi.json`: Legacy, no referral functions ❌

---

## ✅ Solution: Regenerate Core ABI

### Option 1: Extract from Deployed Contract (Recommended)

Use Basescan API to get the verified contract ABI:

```bash
# Get contract ABI from Basescan
curl "https://api.basescan.org/api?module=contract&action=getabi&address=0x9BDD11aA50456572E3Ea5329fcDEb81974137f92&apikey=YOUR_API_KEY"
```

Save response to `abi/GmeowCore.abi.json` (replace existing)

### Option 2: Compile from Source

```bash
# Install Foundry if not already installed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
cd contract
forge build

# Extract ABI
forge inspect GmeowCoreStandalone abi > ../abi/GmeowCore.abi.json
```

### Option 3: Manual Extraction

1. Open `contract/GmeowCoreStandalone.sol`
2. Open `contract/modules/ReferralModule.sol`
3. Extract function signatures manually
4. Add to `abi/GmeowCore.abi.json`

---

## 🔍 Verification Steps

After updating ABI, verify all functions are present:

```bash
# Check for referral functions
cat abi/GmeowCore.abi.json | jq '.[] | select(.type == "function") | .name' | grep -i referral

# Expected output:
# "registerReferralCode"
# "setReferrer"
# "referralCodeOf"
# "referralOwnerOf"
# "referrerOf"
# "referralStats"
# "referralTierClaimed"
```

Test contract functions:
```bash
npx tsx scripts/test-referral-guild-contracts.ts
```

Expected: All tests pass ✅

---

## 📦 Breaking Changes from Old Architecture

### OLD: GmeowMultiChain.sol (DEPRECATED ❌)

**Status**: Contract doesn't exist anymore (migrated to proxy)

**OLD Contract Functions** (components currently reference these):
```solidity
// OLD monolithic contract
function registerReferralCode(string code) // Same signature ✅
function setReferrer(string code)         // Same signature ✅
function createGuild(string name)         // Now in separate Guild contract ⚠️
function joinGuild(uint256 guildId)       // Now in separate Guild contract ⚠️
```

**OLD Contract Addresses** (OBSOLETE):
- Base: 0x... (OLD address - DO NOT USE)
- Optimism: 0x... (OLD address - DO NOT USE)
- Multi-chain support: YES (deprecated)

### NEW: Proxy Architecture (CURRENT ✅)

**Status**: Deployed November 28, 2025

**NEW Contract Structure**:
```
GmeowProxy (0x6A48B758ed42d7c934D387164E60aa58A92eD206)
  ├─> GmeowCore (0x9BDD11aA50456572E3Ea5329fcDEb81974137f92)
  │     └─> ReferralModule (referral functions)
  ├─> GmeowGuild (0x967457be45facE07c22c0374dAfBeF7b2f7cd059)
  │     └─> GuildModule (guild functions)
  └─> GmeowNFT (0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20)
        └─> NFTModule (badge minting)
```

**NEW Contract Addresses** (Base-only):
- Core: `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92`
- Guild: `0x967457be45facE07c22c0374dAfBeF7b2f7cd059`
- NFT: `0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20`
- Proxy: `0x6A48B758ed42d7c934D387164E60aa58A92eD206`
- Chain: **Base only** (no multichain)

---

## 🔄 Component Migration Plan

### Components to DELETE

These components reference OLD GmeowMultiChain.sol contract:

1. **components/Guild/GuildTeamsPage.tsx** (1200+ lines)
   - References: OLD contract address
   - Uses: Mixed referral + guild in single component
   - Action: DELETE after new components ready

2. **components/Guild/GuildManagementPage.tsx** (500+ lines)
   - References: OLD contract patterns
   - Uses: OLD guild functions
   - Action: DELETE after new components ready

### NEW Components to Build

**Phase 2: Referral System** (7 components):
1. ReferralCodeForm - Register code with validation
2. ReferralLinkGenerator - Shareable links + QR codes
3. ReferralStatsCards - 4 stat cards (total, week, month, all-time)
4. ReferralDashboard - Main dashboard with analytics
5. ReferralLeaderboard - Top referrers with viral metrics
6. ReferralAnalytics - Charts and completion rates
7. ReferralTree - Referral chain visualization

**Phase 5: Guild System** (8 components):
1. GuildCreationForm - Create guild with 100pt cost
2. GuildCard - Guild display card
3. GuildMemberList - Member list with officers
4. GuildTreasuryPanel - Deposit/withdraw points
5. GuildDiscoveryPage - Browse all guilds
6. GuildLeaderboard - Top guilds by points/level
7. GuildProfilePage - Individual guild profile
8. GuildAnalytics - Guild activity charts

---

## 🎯 Transaction Builder Changes

### lib/gmeow-utils.ts (ALREADY UPDATED ✅)

**Referral Builders** (lines 440-444):
```typescript
// These work correctly with NEW proxy
export const createRegisterReferralCodeTx = (code: string, chain: GMChainKey = 'base')
export const createSetReferrerTx = (code: string, chain: GMChainKey = 'base')
```

**Guild Builders** (lines 460-476):
```typescript
// These use separate GuildContract now
export const createGuildTx = (name: string, chain: GMChainKey = 'base')
export const createJoinGuildTx = (guildId: bigint, chain: GMChainKey = 'base')
export const createLeaveGuildTx = (chain: GMChainKey = 'base')
export const createDepositGuildPointsTx = (guildId: bigint, points: bigint, chain: GMChainKey = 'base')
export const createClaimGuildRewardTx = (guildId: bigint, points: bigint, chain: GMChainKey = 'base')
export const createGuildQuestTx = (guildId: bigint, name: string, rewardPoints: bigint, chain: GMChainKey = 'base')
```

**Changes**:
- ✅ Guild functions now use `buildGuildCallObject()` (separate contract)
- ✅ Base-only (GMChainKey = 'base')
- ✅ All builders ready to use

---

## 📚 NEW Contract Wrappers

### lib/referral-contract.ts (CREATED ✅)

**Read Functions**:
- `getReferralCode(address)` - Get user's code
- `getReferralCodeOwner(code)` - Get code owner
- `getReferrer(address)` - Get user's referrer
- `getReferralStats(address)` - Get stats (totalReferred, pointsEarned)
- `getReferralTier(address)` - Get badge tier (0-3)
- `getReferralData(address)` - Get complete data
- `isReferralCodeAvailable(code)` - Check availability
- `canSetReferrer(address)` - Check if can set referrer

**Write Builders**:
- `buildRegisterReferralCodeTx(code)` - Register code
- `buildSetReferrerTx(code)` - Set referrer

**Validation**:
- `validateReferralCode(code)` - Validate format

### lib/guild-contract.ts (CREATED ✅)

**Read Functions**:
- `getGuild(guildId)` - Get guild data
- `getUserGuild(address)` - Get user's guild
- `getGuildLevel(guildId)` - Get guild level (1-5)
- `isGuildOfficer(guildId, address)` - Check officer status
- `getGuildTreasury(guildId)` - Get treasury balance
- `getGuildStats(guildId)` - Get complete stats
- `isGuildLeader(guildId, address)` - Check leader status
- `getGuildCount()` - Get total guild count
- `getGuildCreationCost()` - Get creation cost (100 pts)
- `canCreateGuild(address, points)` - Check if can create
- `canJoinGuild(address, guildId)` - Check if can join

**Write Builders**:
- `buildCreateGuildTx(name)` - Create guild
- `buildJoinGuildTx(guildId)` - Join guild
- `buildLeaveGuildTx()` - Leave guild
- `buildDepositGuildPointsTx(guildId, points)` - Deposit points
- `buildClaimGuildRewardTx(guildId, points)` - Claim points
- `buildCreateGuildQuestTx(guildId, name, points)` - Create quest

**Validation**:
- `validateGuildName(name)` - Validate format
- `calculateGuildLevel(points)` - Calculate level from points

---

## 🎯 Phase 1 Checklist

### Contract Testing
- [x] Identified missing referral functions in ABI
- [x] Created test script (scripts/test-referral-guild-contracts.ts)
- [x] Verified guild functions work (✅ all present in Guild ABI)
- [ ] **BLOCKER**: Update Core ABI with referral functions
- [ ] Re-run tests after ABI update
- [ ] Verify all contract calls work

### Contract Wrappers
- [x] Created lib/referral-contract.ts (8 read, 2 write, 1 validation)
- [x] Created lib/guild-contract.ts (11 read, 6 write, 2 validation)
- [x] Documented breaking changes (MIGRATION-REFERRAL-GUILD.md)
- [ ] Test wrappers after ABI update
- [ ] Verify TypeScript types match contract

### Integration Tests
- [ ] Create __tests__/contracts/referral.test.ts
- [ ] Create __tests__/contracts/guild.test.ts
- [ ] Test registerReferralCode validation (3-32 chars)
- [ ] Test setReferrer one-time enforcement
- [ ] Test auto-rewards (+50 referrer, +25 referee)
- [ ] Test badge tier auto-minting (Bronze/Silver/Gold)
- [ ] Test createGuild cost (100 points)
- [ ] Test join/leave guild flows
- [ ] Test treasury deposit/withdraw
- [ ] Test guild level calculation (5 levels)
- [ ] Test officer management

---

## 🚀 Next Steps

1. **IMMEDIATE** (BLOCKER): Update `abi/GmeowCore.abi.json` with referral functions
2. Re-run contract tests to verify all functions work
3. Write integration tests (__tests__/contracts/)
4. Begin Phase 2: Referral System Core (components + APIs)

---

## 📝 Notes

- **Guild functions**: ✅ Working (all present in GuildModule ABI)
- **Referral functions**: ⚠️ Missing from Core ABI (BLOCKER for Phase 1)
- **Transaction builders**: ✅ Ready to use (lib/gmeow-utils.ts)
- **Contract wrappers**: ✅ Created with expected interface
- **Old components**: ❌ Must delete after rebuild (reference deprecated contract)

**Critical Path**: ABI update → Tests pass → Phase 2 begins
