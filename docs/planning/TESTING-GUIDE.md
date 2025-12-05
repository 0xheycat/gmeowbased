# Quest Verification Testing Guide

**Date**: January 19, 2025  
**Status**: Ready for Testing  
**Purpose**: Verify new API works 100% before removing old API

---

## Quick Start

### 1. Start Development Server
```bash
pnpm dev
```

### 2. Run Test Script (New Terminal)
```bash
pnpm test:verify
```

**Alternative**:
```bash
pnpm tsx scripts/test-quest-verification.ts
```

---

## What Gets Tested

### Onchain Quests (3 types)
- ✅ NFT Mint - Verify user owns NFT from contract
- ✅ Token Swap - Verify user has token balance
- ✅ Liquidity - Verify user provided liquidity

### Social Quests (5 types)
- ✅ Follow User - Verify Farcaster follow
- ✅ Like Cast - Verify cast like interaction
- ✅ Recast - Verify recast action
- ✅ Reply - Verify reply to cast
- ✅ Create Cast - Verify cast with tag

### Type Conversion
- ✅ String types → Numeric codes
- ✅ `'follow_user'` → 1
- ✅ `'mint_nft'` → 10

### Oracle Signature
- ✅ Signature generation
- ✅ Response structure
- ✅ FID, nonce, deadline validation

---

## Test Configuration

**Edit Before Running**: `scripts/test-quest-verification.ts`

```typescript
// Line 16-17: Update with your test data
const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890'; // Your wallet
const TEST_USER_FID = 3; // Your Farcaster ID
```

**Optional**: Update contract addresses in test cases (lines 75-90)

---

## Expected Output

### Success Example
```
════════════════════════════════════════════════
   Quest Verification API Testing Suite
════════════════════════════════════════════════
API URL: http://localhost:3000
Test User Address: 0x1234...
Test User FID: 3

═══════════════════════════════════════════════
Testing Type Conversion (String → Numeric)
═══════════════════════════════════════════════
✓ follow_user → 1
✓ recast → 2
✓ reply_to_cast → 3
✓ like_cast → 4
✓ create_cast_with_tag → 5
✓ mint_nft → 10
✓ swap_token → 11
✓ provide_liquidity → 12

Type Conversion Results: 8 passed, 0 failed

═══════════════════════════════════════════════
Running Verification Tests
═══════════════════════════════════════════════

Testing: NFT Mint Verification
Type: mint_nft (onchain)
Description: Verify user minted NFT from specified contract
✓ Verification successful
Signature: 0x1234567890abcdef...
FID: 3
Nonce: 123456
Deadline: 1705699200
Action Code: 10

[... more tests ...]

════════════════════════════════════════════════
   Test Summary
════════════════════════════════════════════════

Onchain Tests:
  Passed: 3/3
  Average Duration: 245ms

Social Tests:
  Passed: 5/5
  Average Duration: 180ms

Overall:
  Passed: 8/8
  Type Conversion: PASSED

════════════════════════════════════════════════
✓ ALL TESTS PASSED - New API is production ready!
✓ Safe to remove old verification API
════════════════════════════════════════════════
```

### Failure Example
```
Testing: NFT Mint Verification
Type: mint_nft (onchain)
Response Status: 400
Response: {
  "ok": false,
  "reason": "NFT balance insufficient"
}
✓ Failed as expected

[... more tests ...]

════════════════════════════════════════════════
   Test Summary
════════════════════════════════════════════════
Overall:
  Passed: 6/8
  Type Conversion: PASSED

════════════════════════════════════════════════
✗ TESTS FAILED - 2 issues found
✗ Do NOT remove old API yet
════════════════════════════════════════════════
```

---

## Interpreting Results

### 100% Pass (8/8)
**Action**: Safe to remove old API
```bash
# Remove old verification API
rm app/api/quests/verify/route.ts

# Clean up old quest types (if not used elsewhere)
# Edit lib/gmeow-utils.ts and remove QUEST_TYPES constants
```

**Then**:
- Update CURRENT-TASK.md with test results
- Update TASK-8.4-AUDIT-REPORT.md with final verdict
- Proceed to Task 8.5 (Reward Distribution)

### Partial Fail (e.g., 6/8)
**Action**: Debug and fix issues

**Common Issues**:
1. **Type Mismatch**: String types not converting to numeric codes
   - Fix: Update type conversion logic in QuestVerification.tsx
   
2. **API Not Responding**: Connection refused
   - Fix: Ensure `pnpm dev` is running
   
3. **Invalid Contract Addresses**: Onchain verification fails
   - Fix: Update test contract addresses in test script
   
4. **Neynar API Errors**: Social verification fails
   - Fix: Check NEYNAR_API_KEY environment variable
   
5. **Oracle Signature Missing**: No signature in response
   - Fix: Check ORACLE_PRIVATE_KEY environment variable

**After Fixing**:
- Re-run tests: `pnpm test:verify`
- Repeat until 100% pass
- Do NOT remove old API until 100% pass

---

## Manual Testing (Alternative)

If automated tests fail, test manually:

### 1. Test Onchain Quest
```bash
curl -X POST http://localhost:3000/api/quests/verify \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "questId": 1,
    "user": "0x1234567890123456789012345678901234567890",
    "fid": 3,
    "actionCode": 10,
    "meta": {
      "contract_address": "0x...",
      "min_balance": 1
    },
    "mode": "onchain",
    "sign": true
  }'
```

**Expected Response**:
```json
{
  "ok": true,
  "sig": "0x...",
  "fid": 3,
  "nonce": 123456,
  "deadline": 1705699200,
  "actionCode": 10
}
```

### 2. Test Social Quest
```bash
curl -X POST http://localhost:3000/api/quests/verify \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "questId": 4,
    "user": "0x1234567890123456789012345678901234567890",
    "fid": 3,
    "actionCode": 1,
    "meta": {
      "target_fid": 3
    },
    "mode": "social",
    "sign": true
  }'
```

---

## Troubleshooting

### Test Script Won't Run
```bash
# Install dependencies
pnpm install

# Check tsx is installed
pnpm list tsx

# If not, install it
pnpm add -D tsx
```

### Server Not Starting
```bash
# Check port 3000 is free
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)

# Restart server
pnpm dev
```

### Environment Variables Missing
```bash
# Check .env.local exists
cat .env.local

# Required variables:
# NEYNAR_API_KEY=...
# ORACLE_PRIVATE_KEY=...
# RPC_BASE=...
# NEXT_PUBLIC_RPC_BASE=...
```

### Type Conversion Fails
**Check**: `lib/supabase/types/quest.ts` types match test script

**Common Issue**: Test script has wrong numeric codes

**Fix**: Update test script type mapping (lines 228-238)

---

## Next Steps After 100% Pass

### 1. Remove Old API (30 minutes)
```bash
# Backup first (just in case)
cp app/api/quests/verify/route.ts app/api/quests/verify/route.ts.backup

# Remove old API
rm app/api/quests/verify/route.ts

# Remove old quest types (if safe)
# Edit lib/gmeow-utils.ts
```

### 2. Update Documentation (30 minutes)
- Update CURRENT-TASK.md:
  - Add test results
  - Mark Task 8.4 as 100% tested
  - Update score to 100/100 (verified)

- Update TASK-8.4-AUDIT-REPORT.md:
  - Add final verdict: "ALL TESTS PASSED"
  - Document old API removal
  - Confirm production readiness

- Update FOUNDATION-REBUILD-ROADMAP.md:
  - Mark Task 8.4 complete
  - Add testing verification note
  - Prepare Task 8.5 section

### 3. Commit Changes
```bash
git add .
git commit -m "Task 8.4: Quest verification tested 100%, removed old API"
```

### 4. Proceed to Task 8.5
- Read Task 8.5 requirements (Reward Distribution)
- Plan implementation
- Start development

---

## Support

**Issues?**
1. Review test output carefully
2. Check TASK-8.4-CLARIFICATIONS.md for context
3. Run manual tests with curl
4. Check server logs in terminal

**Ready to Proceed?**
- Run tests: `pnpm test:verify`
- Review results
- Make decision: remove old API (yes/no)
- Update documentation
- Continue to Task 8.5

---

**Status**: Waiting for test results from user.
