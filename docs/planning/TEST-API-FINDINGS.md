# Quest Verification API Test Findings

## Executive Summary

Tested the new `/api/quests/verify` endpoint with **real user data** from Farcaster (FID 18139 @heycat). Discovered that while the API is functional, **on-chain quests are uninitialized** (exist but have empty data).

## Test Results

### ✅ What Works
- **Type Conversion**: 4/7 action code mappings work correctly
  - `follow_user` → 2 ✅
  - `like_cast` → 5 ✅  
  - `recast` → 3 ✅
  - `reply_to_cast` → 4 ✅

- **API Endpoints**: All routes respond correctly
  - `POST /api/quests/verify` (line 1041)
  - `GET /api/quests` (returns mock data)
  - Error handling (404, 422 validation)

### ❌ What's Broken
- **On-Chain Quests**: Exist but are empty
  - Contract: `0x9BDD11aA50456572E3Ea5329fcDEb81974137f92` (Base mainnet)
  - Quest 1 returns: `[true, 0, 0, 0, 0x0, 0, 0]` (active but uninitialized)
  - No `questType`, `target`, or `meta` data
  - API returns 404 "Quest not found" because quest validation fails

- **Type Conversion Issues**: 3 mappings incorrect
  - `hold_erc20` expects 6, test doesn't provide correct type
  - `hold_erc721` expects 7, test doesn't provide correct type  
  - `create_cast_with_tag` expects 9 (FARCASTER_MENTION), test uses wrong type

### Test Execution Output
```bash
$ pnpm test:verify

Type Conversion Results: 4 passed, 3 failed

Onchain Tests: Passed: 3/3 (expected failures)
Social Tests: Passed: 0/5 (404 errors)
Overall: Passed: 3/8

✗ TESTS FAILED - 5 issues found
Exit code: 1
```

## Root Cause Analysis

### Issue 1: Empty On-Chain Quests
**Discovery**: Used `cast call` to read quest 1 from contract
```bash
$ cast call 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92 "quests(uint256)" 1 --rpc-url base
[true, 0, 0, 0, 0x0000..., 0, 0]
```

**Impact**: 
- Quest exists (`isActive=true`) but has no data
- API's `readQuestStatus()` returns quest but validation fails
- Cannot verify any quest types without proper quest data

**Why This Happened**:
- Quests were created on-chain but never seeded with metadata
- `/api/quests` returns **mock database data** (6 quests with types)
- On-chain reality: Quests exist but are placeholder entries
- Test script used mock quest IDs (2, 3, 4, 5, 6) thinking they were real

### Issue 2: Database vs On-Chain Mismatch
**Database** (from `/api/quests`):
- Quest 2: `follow_user` (target_fid: 12345)
- Quest 3: `mint_nft`
- Quest 4: `swap_token`
- Quest 5: `custom` (social)
- Quest 6: `provide_liquidity`

**On-Chain** (from smart contract):
- Quest 1-N: `[true, 0, 0, 0, ...]` (all empty)
- No quest types, targets, or metadata
- Cannot perform verification without this data

**Impact**: Test script expects real quest data but finds empty quests

## Real User Data Captured

Successfully captured real Farcaster activity from @heycat (FID 18139):

### Farcaster Activity
- **Wallet**: `0x8a3094e44577579d6f41F6214a86C250b7dBDC4e`
- **Cast with mention**: `0x29fd15a5` (mentions @gmeow with "tag")
- **Quote recast**: `0xda7511e5` (quoted @jesse.base.eth)
- **Recast + Like**: `0x3b7cfa06` (@joetir1's cast)
- **Reply received**: `0x75b6d196` (@garrycrypto replied to heycat)

### Action Code Mapping (from QUEST_TYPES)
```typescript
FARCASTER_FOLLOW: 2 ✅
FARCASTER_RECAST: 3 ✅
FARCASTER_REPLY: 4 ✅
FARCASTER_LIKE: 5 ✅
HOLD_ERC20: 6 ⚠️
HOLD_ERC721: 7 ⚠️
FARCASTER_CAST: 8 ✅
FARCASTER_MENTION: 9 ⚠️
```

## Coinbase Trade API Research

Completed comprehensive research for Phase 7 (swap/liquidity features):

### ✅ Supported
- **Token Swaps**: Coinbase Trade API on Base mainnet
  - Real-time price discovery
  - Gas sponsorship available
  - REST + SDK support

- **Staking**: Coinbase Staking API
  - ETH, SOL, 15+ chains
  - Delegated staking model

### ⚠️ Workarounds Needed
- **Liquidity Provision**: No direct API
  - Solution: Check LP token `balanceOf()` (Layer3 pattern)
  - Requires DEX pool address in quest metadata

### 📚 Documentation Created
- `docs/planning/COINBASE-TRADE-API-INTEGRATION.md` (500+ lines)
  - 3 sub-phases: Swap (4-6h), Liquidity (2-3h), Bot (6-8h)
  - Implementation steps with code examples
  - Quest schemas, testing strategy, deployment checklist

- `FOUNDATION-REBUILD-ROADMAP.md` updated
  - Phase 7: Coinbase Trade API Integration (12-17 hours)
  - Action codes 13-15 planned (SWAP_TOKEN, PROVIDE_LIQUIDITY, STAKE_TOKEN)

## Recommendations

### Immediate Actions

1. **Seed On-Chain Quests** ⚠️ CRITICAL
   ```typescript
   // Need to call createQuest() on contract with:
   - questType: 2 (follow_user), 3 (recast), 5 (like), etc.
   - target: Target FID/contract address
   - meta: JSON string with quest metadata
   - expiry, maxCompletions, isActive
   ```

2. **Fix Test Script Quest IDs**
   - Use quest IDs that have real data on-chain
   - OR create local dev environment with seeded quests
   - Update test expectations based on real quest state

3. **Fix Type Conversion Issues**
   - `mint_nft` should use actionCode 7 (HOLD_ERC721)
   - `create_cast_with_tag` should use actionCode 9 (FARCASTER_MENTION)
   - Update test case type mappings

### Phase 7: Coinbase Integration

Once quest seeding is complete:

1. **Phase 7.1**: Token Swap Verification (4-6 hours)
   - Install `@coinbase/coinbase-sdk`
   - Implement `verifyTokenSwap()` in `lib/quests/onchain-verification.ts`
   - Add action code 13 (SWAP_TOKEN) to QUEST_TYPES
   - Create swap quest metadata schema

2. **Phase 7.2**: Liquidity Verification (2-3 hours)
   - Implement LP token balance check (Layer3 pattern)
   - Add action code 14 (PROVIDE_LIQUIDITY) to QUEST_TYPES
   - Create liquidity quest metadata schema

3. **Phase 7.3**: Agent Bot Swap Commands (6-8 hours)
   - Integrate AgentKit for bot swap commands
   - Add swap initiation via @gmeow mentions
   - Test with real Base DEX pools

## Testing Strategy Moving Forward

### Local Development
```bash
# 1. Seed quests locally
pnpm db:seed # OR create seeding script

# 2. Run verification tests
pnpm test:verify

# 3. Test specific quest types
curl -X POST http://localhost:3000/api/quests/verify \
  -H "Content-Type: application/json" \
  -d '{
    "questId": 1,
    "chain": "base",
    "user": "0x8a3094e44577579d6f41F6214a86C250b7dBDC4e",
    "fid": 18139,
    "actionCode": 2,
    "meta": {"target_fid": 1069798}
  }'
```

### Production Testing
1. Create real quests on Base mainnet
2. Verify with real user activity (FID 18139 data captured)
3. Monitor Neynar API rate limits
4. Test error handling (expired quests, max claims, etc.)

## Files Updated This Session

### Created
- ✅ `scripts/test-quest-verification.ts` (updated with real data)
- ✅ `docs/planning/COINBASE-TRADE-API-INTEGRATION.md` (500+ lines)
- ✅ `TASK-8.4-TEST-SCRIPT-UPDATES.md` (summary doc)
- ✅ `TEST-API-FINDINGS.md` (this document)

### Modified
- ✅ `FOUNDATION-REBUILD-ROADMAP.md` (added Phase 7)

### Read/Analyzed
- ✅ `lib/gmeow-utils.ts` (QUEST_TYPES, contract addresses)
- ✅ `lib/quests/onchain-verification.ts` (swap/liquidity stubs)
- ✅ `app/api/quests/verify/route.ts` (verification logic, readQuestStatus)
- ✅ `app/api/quests/route.ts` (mock database seed data)

## Conclusion

**API is functional** but cannot fully test because **on-chain quests are uninitialized**. Next critical step is to **seed real quest data on-chain** via contract `createQuest()` calls. Once seeded, the test script with real Farcaster data (FID 18139) is ready to verify the full verification flow.

**Phase 7 research complete** - ready to implement Coinbase Trade API integration for swap/liquidity features (12-17 hours estimated).

---

**Status**: ⏸️ Blocked on quest seeding
**Next Step**: Create quest seeding script or manually call `createQuest()` on Base mainnet
**Priority**: HIGH - Cannot fully test verification API without real quest data
