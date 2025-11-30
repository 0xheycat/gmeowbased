# GmeowMultichain Modular Architecture

## Overview
Split the 36,889 byte monolithic contract into 5 modular contracts, each under 24KB.

## Module Breakdown

### 1. **GmeowCore.sol** (~18KB estimated)
**Primary Functions:**
- Quest creation and management (addQuest, addQuestWithERC20)
- Quest completion with signatures (completeQuestWithSig)
- Quest lifecycle (closeQuest, batchRefundQuests, cleanupExpiredQuests)
- Points management (pointsBalance, pointsLocked, userTotalEarned)
- User profiles (Farcaster FID, power badges)
- GM system (sendGM, gmHistory, GM bonuses)
- Badge minting from points (mintBadgeFromPoints, stakeForBadge)
- Admin functions (oracle management, token whitelist)

**State Variables:**
- `quests` mapping
- `pointsBalance`, `pointsLocked`, `userTotalEarned`
- `farcasterFidOf`, `powerBadge`
- `userProfiles`, `userNonce`
- `gmPointReward`, `gmCooldown`, GM streak data
- `badgeContract`, `nftContract`
- `authorizedOracles`, `tokenWhitelist`

**Size Reduction:** Remove referrals, guilds, NFT minting, migration

---

### 2. **GmeowReferrals.sol** (~8KB estimated)
**Primary Functions:**
- `registerReferralCode()` - Register custom code
- `setReferrer()` - Set who referred you
- Badge auto-minting for referral milestones (Bronze/Silver/Gold Recruiter)
- Referral reward distribution

**State Variables:**
- `referralCodeOf` - user -> code
- `referralOwnerOf` - code -> user
- `referrerOf` - user -> referrer
- `referralStats` - referrer stats
- `referralTierClaimed` - badge tier tracking
- `referralPointReward`, `referralTokenReward`

**External Calls:**
- `GmeowCore.addPoints()` - Add points to referrer
- `SoulboundBadge.mint()` - Mint recruiter badges

---

### 3. **GmeowGuilds.sol** (~10KB estimated)
**Primary Functions:**
- `createGuild()` - Create new guild
- `joinGuild()` / `leaveGuild()` - Membership
- `depositGuildPoints()` - Contribute points to guild
- `claimGuildReward()` - Claim from guild treasury
- `setGuildOfficer()` - Manage officers
- `createGuildQuest()` / `completeGuildQuest()` - Guild quests
- `getGuildMembers()`, `getGuildInfo()` - View functions

**State Variables:**
- `guilds` mapping (Guild struct)
- `guildOf` - user -> guild ID
- `guildMembers` - guild -> members array
- `guildOfficers` - guild -> officers
- `guildTreasuryPoints` - guild treasury
- `guildQuests` - guild quest system

**External Calls:**
- `GmeowCore.removePoints()` / `addPoints()`
- `SoulboundBadge.mint()` - Guild Leader badge

---

### 4. **GmeowNFTManager.sol** (~9KB estimated)
**Primary Functions:**
- `configureNFTMint()` - Configure NFT types
- `mintNFT()` - Mint with payment/allowlist
- `batchMintNFT()` - Batch airdrops
- `canMintNFT()` - Eligibility check
- `addToNFTMintAllowlist()` - Manage allowlist
- `withdrawMintPayments()` - Withdraw ETH
- Onchain quest verification (ERC20 balance, NFT ownership, badge ownership)

**State Variables:**
- `nftMintConfigs` - NFT type configurations
- `hasMinedNFT` - minting tracker
- `nftMintAllowlist` - allowlist per type
- `onchainQuests` - onchain verification quests

**External Calls:**
- `GmeowNFT.mint()` / `batchMint()`
- `IERC20.balanceOf()`, `IERC721.balanceOf()` - Verification
- `GmeowCore.addPoints()` - Reward points

---

### 5. **GmeowMigration.sol** (~5KB estimated)
**Primary Functions:**
- `setMigrationTarget()` - Set new contract (with timelock)
- `enableMigration()` - Enable after timelock
- `migrateToNewContract()` - User migration
- `canMigrate()` - Check eligibility

**State Variables:**
- `migrationTarget`
- `migrationEnabled`
- `migrationScheduledAt`
- `migrationTimelock`
- `hasMigrated` - user -> bool

**External Calls:**
- `IMigrationReceiver.receiveMigration()` - New contract
- `GmeowCore.pointsBalance()`, `pointsLocked()` - Read balances

---

## Inter-Contract Communication

### Access Control Pattern
```solidity
// Each module can call Core's point management functions
modifier onlyAuthorizedModule() {
    require(
        msg.sender == referralsContract ||
        msg.sender == guildsContract ||
        msg.sender == nftManagerContract ||
        msg.sender == owner(),
        "Not authorized"
    );
    _;
}
```

### Core Interface (IGmeowCore)
```solidity
interface IGmeowCore {
    function pointsBalance(address user) external view returns (uint256);
    function pointsLocked(address user) external view returns (uint256);
    function addPoints(address user, uint256 amount) external;
    function removePoints(address user, uint256 amount) external;
    function lockPoints(address user, uint256 amount) external;
    function unlockPoints(address user, uint256 amount) external;
    function badgeContract() external view returns (address);
    function nftContract() external view returns (address);
}
```

---

## Deployment Order

1. Deploy `GmeowCore.sol`
2. Deploy `SoulboundBadge.sol` (set GmeowCore as authorized minter)
3. Deploy `GmeowNFT.sol` (set GmeowCore as authorized minter)
4. Deploy `GmeowReferrals.sol` (pass GmeowCore address)
5. Deploy `GmeowGuilds.sol` (pass GmeowCore address)
6. Deploy `GmeowNFTManager.sol` (pass GmeowCore address)
7. Deploy `GmeowMigration.sol` (pass GmeowCore address)
8. Call `GmeowCore.setModuleAddresses()` to authorize modules

---

## Slither Fixes Applied

### All Contracts
✅ Initialize all local variables explicitly (`tokenRefund = 0`, `tokenPaid = 0`)
✅ Add zero-address checks in constructors
✅ Add events for admin state changes
✅ Rename shadowed variables (`quests` → `questIds` in returns)
✅ Add `nonReentrant` to NFT minting functions (defense-in-depth)

### Specific Fixes

**GmeowCore:**
```solidity
// Fix uninitialized variables
uint256 tokenRefund = 0; // Lines 1005, 1060, 1110
uint256 tokenPaid = 0;   // Line 935

// Add events
event GMConfigUpdated(uint256 pointReward, uint256 cooldown);
event GMBonusTiersUpdated(uint16 bonus7, uint16 bonus30, uint16 bonus100);

// Fix shadowing
function getActiveQuests(uint256 offset, uint256 limit) 
    external view
    returns (uint256[] memory questIds, uint256 total) // Changed from 'quests'
```

**GmeowNFT:**
```solidity
// Zero-address check in constructor
constructor(string memory name, string memory symbol, string memory _initialBaseURI, address _gmeowContract, address initialOwner) {
    require(_gmeowContract != address(0), "Zero address");
    require(initialOwner != address(0), "Zero address");
    // ...
}

// Add event
event GmeowContractUpdated(address indexed newContract);
```

**GmeowReferrals:**
```solidity
// Add nonReentrant to setReferrer (defense-in-depth)
function setReferrer(string calldata code) external whenNotPaused nonReentrant {
    // ...
}
```

**GmeowNFTManager:**
```solidity
// Add nonReentrant to NFT minting
function mintNFT(string calldata nftTypeId, string calldata reason) 
    external payable whenNotPaused nonReentrant returns (uint256) {
    // ...
}

function batchMintNFT(address[] calldata recipients, string calldata nftTypeId, string calldata reason) 
    external onlyOwner nonReentrant returns (uint256[] memory) {
    // ...
}
```

---

## Size Estimates

| Contract | Est. Size | Mainnet Limit | Status |
|----------|-----------|---------------|--------|
| GmeowCore | ~18KB | 24KB | ✅ PASS |
| GmeowReferrals | ~8KB | 24KB | ✅ PASS |
| GmeowGuilds | ~10KB | 24KB | ✅ PASS |
| GmeowNFTManager | ~9KB | 24KB | ✅ PASS |
| GmeowMigration | ~5KB | 24KB | ✅ PASS |

**Total:** ~50KB (vs 36.9KB monolithic)
**Overhead:** ~13KB for interfaces and duplicate code
**Benefit:** Each module deployable on mainnet

---

## Benefits

1. ✅ **Mainnet Compatible** - Each module under 24KB limit
2. ✅ **Modular Upgrades** - Can upgrade individual modules
3. ✅ **Reduced Gas** - Deploy only needed modules
4. ✅ **Better Testing** - Test each module independently
5. ✅ **Security** - Smaller attack surface per contract
6. ✅ **Maintainability** - Easier to audit and modify

---

## Migration Strategy

### Phase 1: Deploy New Architecture
- Deploy all 5 new modules
- Test extensively on testnet
- Run security audits on each module

### Phase 2: Data Migration (if upgrading)
- Enable migration in old contract
- Users call `migrateToNewContract()`
- Points, locked points, and profiles transfer automatically
- Quest data remains in Core (same structure)

### Phase 3: Sunset Old Contract
- Pause old contract after grace period
- Redirect all UI to new modules
- Keep old contract for historical data queries

---

## Next Steps

1. ✅ Create interface files (IGmeowCore, IGmeowReferrals, IGmeowGuilds)
2. 🔄 Implement GmeowCore.sol with all Slither fixes
3. ⏳ Implement GmeowReferrals.sol
4. ⏳ Implement GmeowGuilds.sol
5. ⏳ Implement GmeowNFTManager.sol
6. ⏳ Implement GmeowMigration.sol
7. ⏳ Update deployment scripts
8. ⏳ Update test suite
9. ⏳ Verify contract sizes
10. ⏳ Deploy to testnet and validate
