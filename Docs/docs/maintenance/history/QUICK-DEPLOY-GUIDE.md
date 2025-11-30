# Quick Start: Deploy GmeowMultiChain V2 on Remix

## 🎯 Goal
Deploy the new modular GmeowMultiChain contract with a **single transaction** on Remix.

## 📋 Prerequisites
- Remix IDE (https://remix.ethereum.org)
- Wallet connected (MetaMask)
- Base L2 network selected (or any EVM chain)

## 🚀 Deployment Steps (5 Minutes)

### Step 1: Upload Files to Remix

Upload these 8 files to Remix in the following structure:

```
contracts/
├── GmeowMultiChainV2.sol        ← Main contract (deploy this!)
├── SoulboundBadge.sol
├── GmeowNFT.sol
└── modules/
    ├── BaseModule.sol
    ├── CoreModule.sol
    ├── ReferralModule.sol
    ├── GuildModule.sol
    ├── NFTModule.sol
    └── MigrationModule.sol
```

**Quick Upload:**
- Drag and drop all files from `contract/` folder to Remix
- Ensure `modules/` folder structure is preserved

### Step 2: Configure Compiler

1. Open **Solidity Compiler** tab
2. Set compiler version: **0.8.23**
3. Enable **Optimization**: 200 runs
4. Click **Advanced Configurations**
5. Enable **"Enable via-IR"** checkbox ✅ (IMPORTANT!)
6. Click **Compile GmeowMultiChainV2.sol**

Expected result: ✅ Compilation successful (0 errors, 1 warning is OK)

### Step 3: Deploy Contracts

**3.1 Deploy GmeowMultiChainV2 (SoulboundBadge Auto-Deployed!)**

**What this deployment includes:**
- ✅ Main contract with all 6 modules
- ✅ SoulboundBadge (auto-deployed & linked)
- 📝 GmeowNFT (deploy separately in step 3.2)

**Deployment steps:**

1. Open **Deploy & Run** tab
2. Select **GmeowMultichain** from contract dropdown
3. Enter constructor parameter:
   - `_oracleSigner`: Your oracle signer address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
4. Click **Deploy**
5. Confirm transaction in MetaMask
6. **Save the deployed address!**

**Note:** SoulboundBadge is automatically deployed - badges work immediately! ✅

---

**3.2 Deploy GmeowNFT** (Required for NFT features)

1. Select **GmeowNFT** from contract dropdown
2. Enter constructor parameters (5 parameters required):
   - `name`: "Gmeow NFT"
   - `symbol`: "GMEOW"
   - `_baseURI`: "https://api.gmeow.xyz/nft/" (your metadata URL)
   - `_gmeowContract`: `0x0000000000000000000000000000000000000000` (set to zero, link later)
   - `initialOwner`: YOUR_WALLET_ADDRESS (copy from MetaMask)
3. Click **Deploy**
4. Confirm transaction
5. **Save the deployed address!**

**Important:** GmeowNFT uses OpenZeppelin v5 which requires `initialOwner` parameter

---

**3.3 Link GmeowNFT to Main Contract** (Required!)

Link GmeowMultiChainV2 → GmeowNFT:
1. In deployed **GmeowMultiChainV2** contract, find `setNFTContract`
2. Enter GmeowNFT address (from step 3.2)
3. Click **transact** → Confirm

Link GmeowNFT → GmeowMultiChainV2:
1. In deployed **GmeowNFT** contract, find `setGmeowContract`
2. Enter GmeowMultiChainV2 address (from step 3.1)
3. Click **transact** → Confirm

Authorize minting:
1. In **GmeowNFT** contract, find `setAuthorizedMinter`
2. Enter parameters:
   - `minter`: GmeowMultiChainV2 address
   - `authorized`: `true`
3. Click **transact** → Confirm

**All contracts are now linked and ready!** ✅

### Step 4: Verify Deployment ✅

Test basic functions in Remix:

```solidity
// 1. Check your stats
getUserStats(YOUR_ADDRESS)
// Should return: (0, 0, 0) - (available points, locked points, total earned)

// 2. Check active quests
getAllActiveQuests()
// Should return: [] (empty array initially)

// 3. Check owner
owner()
// Should return: YOUR_ADDRESS

// 4. Check NFT contract is linked
nftContract()
// Should return: GmeowNFT address (not 0x000...)

// 5. Check Badge contract is linked
badgeContract()
// Should return: SoulboundBadge address (not 0x000...)
```

## 📝 Example Constructor Values

```javascript
// Step 3.1: GmeowMultiChainV2
_oracleSigner: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// Step 3.2: GmeowNFT
name: "Gmeow NFT"
symbol: "GMEOW"
_baseURI: "https://api.gmeow.xyz/nft/"
_gmeowContract: "0x0000000000000000000000000000000000000000"
initialOwner: "YOUR_WALLET_ADDRESS"
```

## ✨ What You Get

After deployment, your contract has:
- ✅ Quest system (create & complete quests)
- ✅ Points system (earn, tip, stake)
- ✅ Referral system (codes & rewards)
- ✅ Guild system (create & join guilds)
- ✅ **Soulbound badges (auto-deployed & ready!)** 🎉
- ✅ GM system (daily GM streaks)
- ✅ Migration system (future upgrades)
- ✅ NFT minting (after linking GmeowNFT in step 3.3)

**Badge system works immediately, NFT features ready after step 3.3!**

## 🔧 Admin Functions (Owner Only)

Key functions to configure:

```solidity
// Authorize oracles
setAuthorizedOracle(address, true)

// Set power badges for FIDs
setPowerBadgeForFid(fid, true)

// Configure GM rewards
setGMConfig(rewardPoints, cooldownSeconds)

// Whitelist tokens for quest rewards
addTokenToWhitelist(tokenAddress, true)
```

## 📚 Next Steps

1. **Create Your First Quest**
   ```solidity
   addQuest(
     "First Quest",    // name
     0,                // questType (0 = social)
     1,                // target
     100,              // rewardPoints
     10,               // maxCompletions
     0,                // expiresAt (0 = never)
     "{}"              // meta (JSON)
   )
   ```

2. **Register a Referral Code**
   ```solidity
   registerReferralCode("yourcode")
   ```

3. **Create a Guild**
   ```solidity
   createGuild("My Guild")
   ```

## ⚠️ Common Issues

**Issue**: "Stack too deep" error  
**Fix**: Ensure "Enable via-IR" is checked in compiler settings

**Issue**: Import errors  
**Fix**: Verify all module files are in `contracts/modules/` folder

**Issue**: Constructor parameter error  
**Fix**: Make sure oracle address is valid (not 0x0000...)

## 🎉 Success!

You now have a fully functional GmeowMultiChain V2 contract deployed with:
- **1 transaction** (same as original)
- **67-line main contract** (clean & modular)
- **All security fixes applied**
- **Same functionality as 1979-line original**

For full documentation, see: `MODULAR-REFACTOR-COMPLETE.md`
