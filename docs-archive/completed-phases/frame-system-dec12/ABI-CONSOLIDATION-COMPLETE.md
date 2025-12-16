# ABI Import Consolidation - Complete

**Date**: December 10, 2025  
**Status**: ✅ Complete  
**Impact**: Improved code maintainability and consistency

---

## Overview

All contract ABI imports have been consolidated into a single centralized export file to improve code maintainability and ensure consistency across the codebase.

---

## Changes Made

### 1. Created Centralized ABI Export

**File**: `lib/contracts/abis.ts` (NEW)

**Exports**:
- `GM_CONTRACT_ABI` - Combined/monolithic contract ABI
- `CORE_ABI` - Core standalone contract ABI
- `GUILD_ABI` - Guild standalone contract ABI
- `NFT_ABI` - NFT standalone contract ABI
- `REFERRAL_ABI` - Referral standalone contract ABI
- `ERC721_ABI` - Standard ERC721 ABI from viem
- `GUILD_ABI_JSON` - Raw Guild ABI JSON (for wagmi hooks)
- `CORE_ABI_JSON` - Raw Core ABI JSON
- `NFT_ABI_JSON` - Raw NFT ABI JSON
- `REFERRAL_ABI_JSON` - Raw Referral ABI JSON

**Helper Functions**:
- `getCoreABI()` - Returns Core ABI
- `getGuildABI()` - Returns Guild ABI
- `getNFTABI()` - Returns NFT ABI
- `getReferralABI()` - Returns Referral ABI

---

### 2. Updated All Import Statements

**Files Updated** (13 total):

**Components**:
- ✅ `components/guild/GuildMemberList.tsx`
- ✅ `components/guild/GuildProfilePage.tsx`

**Libraries**:
- ✅ `lib/profile-data.ts`
- ✅ `lib/team.ts`

**API Routes**:
- ✅ `app/api/guild/[guildId]/analytics/route.ts`
- ✅ `app/api/guild/[guildId]/claim/route.ts`
- ✅ `app/api/guild/[guildId]/deposit/route.ts`
- ✅ `app/api/guild/[guildId]/is-member/route.ts`
- ✅ `app/api/guild/[guildId]/leave/route.ts`
- ✅ `app/api/guild/[guildId]/manage-member/route.ts`
- ✅ `app/api/guild/[guildId]/members/route.ts`
- ✅ `app/api/guild/[guildId]/treasury/route.ts`
- ✅ `app/api/guild/leaderboard/route.ts`
- ✅ `app/api/guild/list/route.ts`

**Old Import Pattern** (DEPRECATED):
```typescript
import GUILD_ABI_JSON from '@/abi/GmeowGuildStandalone.abi.json'
import { GM_CONTRACT_ABI } from '@/lib/gmeow-utils'
```

**New Import Pattern** (RECOMMENDED):
```typescript
import { GUILD_ABI_JSON, GM_CONTRACT_ABI } from '@/lib/contracts/abis'
```

---

## Benefits

### 1. **Single Source of Truth**
All ABI imports now come from one centralized file (`lib/contracts/abis.ts`), making it easy to:
- Update ABI versions
- Add new contract ABIs
- Track which contracts are in use

### 2. **Improved Maintainability**
Changing ABIs now requires updates in only 2 files:
- `lib/contracts/abis.ts` (add/update exports)
- `abi/*.json` (update actual ABI files)

### 3. **Better Developer Experience**
Developers now have:
- Clear import statements
- TypeScript autocomplete for all ABIs
- Helper functions for common use cases
- Consistent naming across the codebase

### 4. **Reduced Confusion**
Before consolidation:
- 13 files imported ABIs directly from `@/abi/` directory
- Multiple import patterns (`GM_CONTRACT_ABI` from gmeow-utils, `GUILD_ABI_JSON` from abi/)
- Unclear which ABI to use for each contract

After consolidation:
- All imports use centralized `@/lib/contracts/abis`
- Consistent naming and typing
- Clear documentation in centralized file

---

## Usage Examples

### Basic Import
```typescript
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'

// Use in wagmi hooks
const { data } = useReadContract({
  address: STANDALONE_ADDRESSES.base.guild,
  abi: GUILD_ABI_JSON,
  functionName: 'getGuildInfo',
  args: [guildId]
})
```

### Multiple ABIs
```typescript
import { GUILD_ABI_JSON, CORE_ABI, GM_CONTRACT_ABI } from '@/lib/contracts/abis'

// Guild contract read
const guildData = await client.readContract({
  address: STANDALONE_ADDRESSES.base.guild,
  abi: GUILD_ABI_JSON,
  functionName: 'getGuildInfo',
  args: [guildId]
})

// Core contract read
const userData = await client.readContract({
  address: STANDALONE_ADDRESSES.base.core,
  abi: CORE_ABI,
  functionName: 'getUserStats',
  args: [userAddress]
})
```

### Helper Functions
```typescript
import { getCoreABI, getGuildABI } from '@/lib/contracts/abis'

const coreAbi = getCoreABI() // Returns CORE_ABI
const guildAbi = getGuildABI() // Returns GUILD_ABI
```

---

## Contract Address Reference

All contracts are on **Base Mainnet** (Chain ID: 8453):

| Contract | Address | ABI Export |
|----------|---------|------------|
| **Core** | `0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73` | `CORE_ABI` / `CORE_ABI_JSON` |
| **Guild** | `0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3` | `GUILD_ABI` / `GUILD_ABI_JSON` |
| **NFT** | `0xCE9596a992e38c5fa2d997ea916a277E0F652D5C` | `NFT_ABI` / `NFT_ABI_JSON` |
| **Badge** | `0x5Af50Ee323C45564d94B0869d95698D837c59aD2` | *(Not yet exported, add if needed)* |
| **Referral** | `0x9E7c32C1fB3a2c08e973185181512a442b90Ba44` | `REFERRAL_ABI` / `REFERRAL_ABI_JSON` |
| **Proxy** | `0x6A48B758ed42d7c934D387164E60aa58A92eD206` | *(Not yet exported, add if needed)* |

---

## Migration Checklist

✅ **Phase 1: Create Centralized Export**
- [x] Create `lib/contracts/abis.ts`
- [x] Export all typed ABIs (`CORE_ABI`, `GUILD_ABI`, etc.)
- [x] Export raw JSON ABIs (`GUILD_ABI_JSON`, etc.)
- [x] Add helper functions (`getCoreABI()`, etc.)
- [x] Add documentation comments

✅ **Phase 2: Update All Imports**
- [x] Update components (2 files)
- [x] Update libraries (2 files)
- [x] Update API routes (9 files)
- [x] Verify no direct `@/abi/` imports remain

✅ **Phase 3: Documentation**
- [x] Create this migration document
- [x] Update code comments
- [x] Document usage patterns
- [x] Add contract address reference

---

## Next Steps

1. **Update gmeow-utils.ts** (optional):
   - Consider removing ABI exports from `lib/gmeow-utils.ts`
   - Keep only address and chain configuration
   - Point to `lib/contracts/abis.ts` in comments

2. **Add Missing ABIs** (if needed):
   - Badge contract ABI
   - Proxy contract ABI
   - Any other contracts

3. **Enforce Pattern**:
   - Update code review guidelines
   - Add linting rule to prevent direct `@/abi/` imports
   - Document in CONTRIBUTING.md

---

## Verification

All direct ABI imports have been removed:
```bash
# This should return no results (except centralized files)
grep -r "import.*from '@/abi/" --include="*.ts" --include="*.tsx" app components lib \
  | grep -v "lib/contracts/abis.ts" \
  | grep -v "lib/gmeow-utils.ts"
```

**Result**: ✅ No direct imports found

---

**Completed**: December 10, 2025  
**Tested**: All guild API routes verified working  
**Status**: Ready for production
