# CRITICAL BUG: Guild Contract Cannot Access Points

## 🐛 THE PROBLEM

**Guild contract has NO way to read points from Core contract!**

### What Went Wrong:
1. `GmeowGuildStandalone` has `coreContract` address stored ✅
2. But `GuildModule.createGuild()` checks `pointsBalance[msg.sender]` ❌
3. `pointsBalance` is Guild contract's OWN storage (empty)
4. Should be reading from `coreContract.pointsBalance()` instead!

### Evidence:
```solidity
// Guild contract line 53 - WRONG!
require(pointsBalance[msg.sender] >= guildCreationCost, "E003");
//       ^^^^^^^^^^^ This is Guild contract's storage (empty)

// Should be:
require(CoreContract(coreContract).pointsBalance(msg.sender) >= guildCreationCost, "E003");
//      ^^^^^^^^^^^^^^^^^^^^^^^^^ Read from Core contract
```

### Current State:
- **Core contract**: Has all user points ✅
- **Guild contract**: Has `coreContract` reference ✅
- **Guild contract**: Doesn't USE the reference ❌
- **Result**: E003 error (Insufficient points) even though user has points

---

## ✅ THE FIX

### Option 1: Contract Update (Best Solution)

Modify `GuildModule.sol` to read from Core contract:

```solidity
// Add interface at top
interface ICoreContract {
  function pointsBalance(address) external view returns (uint256);
}

// Modify createGuild function
function createGuild(string calldata name) external whenNotPaused {
  require(bytes(name).length > 2, "E001");
  require(guildOf[msg.sender] == 0, "E002");
  
  // Read points from Core contract
  address core = GmeowGuildStandalone(address(this)).coreContract();
  uint256 userPoints = ICoreContract(core).pointsBalance(msg.sender);
  require(userPoints >= guildCreationCost, "E003");
  
  // ... rest of function
}
```

**Then redeploy Guild contract.**

### Option 2: Quick Workaround (Temporary)

Add `depositTo` function to Guild contract for owner to manually sync points:

```solidity
function depositTo(address to, uint256 amount) external onlyOwner {
  if (to == address(0)) revert ZeroAddressNotAllowed();
  if (amount == 0) revert ZeroAmountNotAllowed();
  pointsBalance[to] += amount;
  emit PointsDeposited(to, amount);
}
```

Then owner calls:
```bash
OWNER_PRIVATE_KEY=0x... npx tsx scripts/quick-deposit.ts 0x8870C155... 1000000000000
```

### Option 3: Use Core Contract Only (Simplest)

Move guild functions INTO Core contract instead of separate Guild contract.

---

## 🚀 RECOMMENDED ACTION

**RIGHT NOW:** Since Guild contract is already deployed and you need guilds working:

1. **Add `depositTo` to Guild contract** (requires contract upgrade or redeployment)
2. **Deposit points to Guild contract** for users who want to create guilds
3. **Later**: Redesign to have Guild read from Core directly

---

## 📝 CONTRACT MODIFICATION NEEDED

File: `contract/modules/GuildModule.sol`

Add this at the top with other imports:
```solidity
interface ICoreContract {
  function pointsBalance(address user) external view returns (uint256);
}
```

Replace lines 48-57 with:
```solidity
function createGuild(string calldata name) external whenNotPaused {
  require(bytes(name).length > 2, "E001");
  require(guildOf[msg.sender] == 0, "E002");
  
  // Get core contract address (only available in standalone deployment)
  address core = address(0);
  try GmeowGuildStandalone(address(this)).coreContract() returns (address _core) {
    core = _core;
  } catch {}
  
  uint256 userPoints;
  if (core != address(0)) {
    // Standalone: Read from Core contract
    userPoints = ICoreContract(core).pointsBalance(msg.sender);
  } else {
    // Module: Use local storage
    userPoints = pointsBalance[msg.sender];
  }
  
  require(userPoints >= guildCreationCost, "E003");
  
  // Note: Cannot deduct points from Core contract!
  // This requires Core contract to trust and allow Guild contract to deduct
  // For now, just track guild creation (points stay in Core)
  
  nextGuildId += 1;
  // ... rest of function unchanged
}
```

**IMPORTANT:** This still doesn't solve point deduction! You'd need to either:
- Have Core contract authorize Guild to deduct points
- OR keep points in Guild contract storage (current approach)
- OR don't deduct points for guild creation (free guilds)

---

## 🎯 IMMEDIATE ACTION REQUIRED

**You have 3 choices:**

1. **Easiest**: Make guild creation FREE (remove point cost check)
2. **Quick**: Add `depositTo` and manually deposit points for each user
3. **Best**: Redesign contracts to have proper point management integration

Which approach do you want to take?
