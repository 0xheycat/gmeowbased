# Quick Reference: Updated ABIs

## Contract ABIs Status ✅

### GmeowCore
- **Location:** `abi/GmeowCore.abi.json`
- **Entries:** 176 total
- **Functions:** 94 (including 7 referral functions)
- **Source:** Compiled from `contract/GmeowCoreStandalone.sol`
- **Backup:** `abi/GmeowCore.abi.backup-20241206-*.json`

### GmeowGuild
- **Location:** `abi/GmeowGuild.abi.json`
- **Entries:** 143 total
- **Functions:** 64 (including createGuild, joinGuild, depositGuildPoints)
- **Source:** Compiled from `contract/GmeowGuild.sol`
- **Backup:** `abi/GmeowGuild.abi.backup-20241206-*.json`

### GmeowNFT
- **Location:** `abi/GmeowNFT.abi.json`
- **Entries:** 68 total
- **Functions:** 38 (including mint, batchMint, burn, paused)
- **Source:** Compiled from `contract/GmeowNFT.sol`
- **Backup:** `abi/GmeowNFT.abi.backup-20241206-*.json`

---

## Referral Functions (Core ABI)

All 7 referral functions confirmed in GmeowCore ABI:

1. ✅ `registerReferralCode(string code)` - Register a referral code
2. ✅ `referralCodeOf(address user)` - Get user's referral code
3. ✅ `referralOwnerOf(string code)` - Get owner of referral code
4. ✅ `referralPointReward()` - Points earned per referral
5. ✅ `referralTokenReward()` - Token reward per referral
6. ✅ `referralStats(address user)` - Get referral statistics
7. ✅ `referralTierClaimed(address user, uint256 tier)` - Check tier claim status

---

## Test Results

```
Total Tests: 12
Passed: 12
Failed: 0
Success Rate: 100.0%
```

**All critical functions working:**
- ✅ Contract deployment checks
- ✅ Read operations (paused, oracle, etc.)
- ✅ Referral functions in ABI
- ✅ Guild functions in ABI
- ✅ NFT functions in ABI
- ✅ Contract linking (Guild→Core, NFT→Core)
- ✅ Multiple RPC fallback system

---

## Usage in Code

### Import ABIs (current pattern)
```typescript
import CORE_ABI_JSON from '@/abi/GmeowCore.abi.json'
import GUILD_ABI_JSON from '@/abi/GmeowGuild.abi.json'
import NFT_ABI_JSON from '@/abi/GmeowNFT.abi.json'
```

### Get ABIs (helper functions)
```typescript
import { getCoreABI, getGuildABI, getNFTABI } from '@/lib/gmeow-utils'

const coreAbi = getCoreABI()
const guildAbi = getGuildABI()
const nftAbi = getNFTABI()
```

### Get Contract Addresses
```typescript
import { getCoreAddress, getGuildAddress, getNFTAddress, getProxyAddress } from '@/lib/gmeow-utils'

const core = getCoreAddress('base')   // 0x9BDD...7f92
const guild = getGuildAddress('base') // 0x9674...d059
const nft = getNFTAddress('base')     // 0xD99a...2c20
const proxy = getProxyAddress('base') // 0x6A48...d206
```

---

## Next Steps: Phase 2 Development

Now that ABIs are complete, you can build:

### 1. Referral System Components
- `ReferralCodeForm` - Register referral codes
- `ReferralLinkGenerator` - Generate shareable links with QR
- `ReferralStatsCards` - Display referral statistics

### 2. Referral API Endpoints
- `GET /api/referral/[fid]/stats` - Fetch referral data
- `POST /api/referral/generate-link` - Generate referral links

### 3. Transaction Builders
All transaction functions already use proxy contract:
```typescript
const tx = {
  to: getProxyAddress('base'),
  data: encodeFunctionData({
    abi: getCoreABI(),
    functionName: 'registerReferralCode',
    args: [code]
  })
}
```

---

## Commands

```bash
# Recompile contracts if needed
forge build --force

# Run contract tests
npm run contracts:test

# Check functions in ABI
cat abi/GmeowCore.abi.json | jq '.[] | select(.type=="function") | .name' | sort

# Extract ABI from compiled artifact
cat out/GmeowCoreStandalone.sol/GmeowCore.json | jq '.abi' > abi/GmeowCore.abi.json
```

---

**Status:** All ABIs updated and verified ✅  
**Ready for:** Phase 2 Referral System development  
**No blockers:** ABIs complete, tests passing, functions confirmed
