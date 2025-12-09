# Remix Deployment Guide - GmeowMultichain

## ⚠️ Important Notes

**Contract Size:** The full `GmeowMultichain.sol` contract is ~39KB runtime, which exceeds the 24KB EIP-170 limit for live networks. However, you can deploy it on:
- ✅ **Remix JavaScript VM** (local testing, no size limit)
- ❌ **Real networks** (Base, Base Sepolia, etc.) - will fail with "contract code size" error

**For real network deployment**, use the standalone architecture (already deployed to Base Sepolia).

---

## Step 1: Open Remix IDE

Go to: https://remix.ethereum.org

---

## Step 2: Create File Structure

In the Remix file explorer, create this folder structure:

```
contracts/
├── GmeowMultiChainV2.sol
├── GmeowNFT.sol
├── SoulboundBadge.sol
└── modules/
    ├── BaseModule.sol
    ├── CoreModule.sol
    ├── ReferralModule.sol
    ├── GuildModule.sol
    └── NFTModule.sol
```

---

## Step 3: Copy Contract Files

Copy these files from your local workspace:

### Main Contract
- `contract/GmeowMultiChainV2.sol` → `contracts/GmeowMultiChainV2.sol`

### Dependencies
- `contract/GmeowNFT.sol` → `contracts/GmeowNFT.sol`
- `contract/SoulboundBadge.sol` → `contracts/SoulboundBadge.sol`

### Modules
- `contract/modules/BaseModule.sol` → `contracts/modules/BaseModule.sol`
- `contract/modules/CoreModule.sol` → `contracts/modules/CoreModule.sol`
- `contract/modules/ReferralModule.sol` → `contracts/modules/ReferralModule.sol`
- `contract/modules/GuildModule.sol` → `contracts/modules/GuildModule.sol`
- `contract/modules/NFTModule.sol` → `contracts/modules/NFTModule.sol`

---

## Step 4: Install OpenZeppelin Dependencies

Remix automatically imports from npm. Make sure these imports work:

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
```

If imports fail, Remix will show red underlines. Wait a few seconds for it to fetch from npm.

---

## Step 5: Configure Compiler

1. Click **Solidity Compiler** tab (left sidebar)
2. Set compiler version: **0.8.23**
3. Set EVM version: **shanghai**
4. Enable optimization: **Yes**
5. Optimizer runs: **200**
6. Click **Compile GmeowMultiChainV2.sol**

**Expected Result:**
- ✅ Green checkmark if compilation succeeds
- ⚠️ Warnings about "unaliased imports" are OK
- ❌ If you see errors, check that all files are copied correctly

---

## Step 6: Deploy to JavaScript VM (Local Testing)

### 6.1 Select Environment
1. Click **Deploy & Run Transactions** tab (left sidebar)
2. **Environment**: Select "Remix VM (Shanghai)" or "Remix VM (Cancun)"
3. **Account**: Any test account (they have 100 ETH each)

### 6.2 Deploy Main Contract
1. **Contract**: Select `GmeowMultichain - contracts/GmeowMultiChainV2.sol`
2. **Constructor Parameter**:
   - `_oracleSigner`: Paste your deployer address (the account shown in "ACCOUNT" dropdown)
   - Example: `0x5B38Da6a701c568545dCfcB03FcB875f56beddC4`

3. Click **Deploy** (orange button)

**Expected Result:**
- Contract deploys successfully
- Shows "GmeowMultichain at 0x..." in Deployed Contracts section

### 6.3 Deploy NFT Contract (Optional)
1. **Contract**: Select `GmeowNFT - contracts/GmeowNFT.sol`
2. **Constructor Parameters**:
   - `name`: "Gmeowbased Adventure NFT"
   - `symbol`: "GMEOW"
   - `baseURI_`: "https://api.gmeowhq.art/nft/"
   - `_gmeowContract`: Address of deployed GmeowMultichain contract
   - `initialOwner`: Your deployer address

3. Click **Deploy**

### 6.4 Link NFT Contract
1. Expand the deployed `GmeowMultichain` contract
2. Find `setNFTContract` function
3. Paste NFT contract address
4. Click **transact**

---

## Step 7: Deploy to Real Network (Will Fail Due to Size)

⚠️ **THIS WILL FAIL** - included for documentation only

### 7.1 Connect MetaMask
1. **Environment**: Select "Injected Provider - MetaMask"
2. MetaMask popup → Connect wallet
3. Switch to **Base Sepolia** network in MetaMask

### 7.2 Get Testnet Funds
- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Need: ~0.01 ETH for deployment

### 7.3 Attempt Deployment
1. Follow same steps as JavaScript VM deployment
2. MetaMask will show gas estimate
3. Click **Confirm**

**Expected Result:**
❌ **FAILS** with error:
```
Error: Transaction reverted: contract code size exceeds 24576 bytes (a limit introduced in Spurious Dragon)
```

**Solution:** Use the standalone architecture (already deployed):
- Core: `0x059b474799f8602975E60A789105955CbB61d878`
- Guild: `0xa0001886C87a19d49BAC88a5Cbf993f0866110C4`
- NFT: `0xdB6167697Dd0f696d445a35ec823C25b885Ae60c`

---

## Step 8: Verify Contract (After Successful Deployment)

If you manage to deploy to a real network (e.g., using the standalone version):

### On Basescan
1. Go to: https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
2. Click **Contract** tab → **Verify and Publish**
3. Settings:
   - Compiler: 0.8.23
   - Optimization: Yes (200 runs)
   - EVM: shanghai
4. Paste contract source code
5. Click **Verify**

---

## Step 9: Interact with Contract

### Via Remix
1. Expand deployed contract in "Deployed Contracts"
2. Functions are color-coded:
   - 🔴 Red = Payable (costs ETH)
   - 🟠 Orange = Non-payable state-changing
   - 🔵 Blue = View functions (free)

### Example: Add a Quest
1. Find `addQuest` function
2. Fill in parameters:
   ```
   questId: 1
   rewardPoints: 1000
   escrowPoints: 10000
   rewardToken: 0x0000000000000000000000000000000000000000
   rewardTokenPerUser: 0
   tokenEscrowAmount: 0
   creatorFid: 12345
   category: 0
   requiresFarcasterVerify: false
   ```
3. Click **transact**
4. MetaMask popup → Confirm transaction

### Example: Complete Quest (Requires Signature)
This requires backend oracle to sign. For testing:
1. Use `completeQuestByOwner` instead (admin function)
2. Parameters:
   ```
   questId: 1
   user: 0x... (any address)
   fid: 12345
   ```

---

## Troubleshooting

### "Compilation Failed"
- Check compiler version is 0.8.23
- Verify all module files are in correct folders
- Wait for OpenZeppelin imports to load (red underlines should disappear)

### "Out of Gas"
- Increase gas limit in Remix deployment settings
- For JavaScript VM, this shouldn't happen (unlimited gas)

### "Contract Size Exceeds Limit"
- Expected for real networks
- Use JavaScript VM for testing
- Use standalone architecture for real deployment

### "Constructor Requires Parameter"
- Make sure you paste an address in `_oracleSigner` field
- Format: `0x...` (40 hex characters)

---

## Summary

✅ **For Local Testing:**
- Use Remix with JavaScript VM
- Deploy full GmeowMultichain contract
- All features work

❌ **For Real Networks:**
- Cannot deploy monolithic version (too large)
- Use already-deployed standalone contracts
- See `deployment-standalone.json` for addresses

---

## Alternative: Import from GitHub

Instead of copying files manually:

1. In Remix, click **Load from GitHub**
2. Enter: `https://github.com/0xheycat/gmeowbased/blob/main/contract/GmeowMultiChainV2.sol`
3. Remix automatically imports all dependencies
4. Compile and deploy

---

## Contract Addresses (Already Deployed on Base Sepolia)

```json
{
  "GmeowCore": "0x059b474799f8602975E60A789105955CbB61d878",
  "GmeowGuild": "0xa0001886C87a19d49BAC88a5Cbf993f0866110C4",
  "GmeowNFT": "0xdB6167697Dd0f696d445a35ec823C25b885Ae60c"
}
```

View on Basescan:
- https://sepolia.basescan.org/address/0x059b474799f8602975E60A789105955CbB61d878
