# Quest On-Chain Claiming - Testing Guide

**Phase**: Quest On-Chain Claiming (December 31, 2025)
**Status**: Implementation Complete - Ready for Testing

## Overview

The quest claiming system allows users to claim their completed quest rewards on-chain. This connects the off-chain quest verification (Stage 1) with on-chain reward distribution (Stage 2).

## Architecture

### Stage 1: Quest Verification (OFF-CHAIN) ✅
- **Location**: `app/api/quests/[slug]/verify/route.ts`
- **Process**:
  1. User completes quest tasks
  2. Verification API validates completion
  3. Updates `quest_completions` in Supabase
  4. Generates oracle signature for claiming
  5. Stores signature in database
- **Database**: Supabase only (no blockchain transaction)

### Stage 2: Quest Claiming (ON-CHAIN) ✅
- **Location**: `components/quests/QuestClaimButton.tsx`
- **Process**:
  1. User clicks "Claim Rewards" button
  2. Button calls `contract.completeQuestWithSig()`
  3. Contract validates oracle signature
  4. Distributes rewards, emits `QuestCompleted` event
  5. Subsquid indexes event
  6. Updates `is_claimed` in database
- **Database**: Blockchain + Subsquid + Supabase

## Components Implemented

### 1. Oracle Signature Generation
**File**: `lib/quests/oracle-signature.ts`

**Functions**:
- `generateQuestClaimSignature()` - Creates cryptographic signature
- `getUserNonce()` - Fetches user nonce from contract
- `validateSignatureParams()` - Validates input parameters

**Signature Data**:
```typescript
{
  questId: number,
  userAddress: Address,
  fid: number,
  action: 0,  // Quest completion
  deadline: number,  // Unix timestamp (+1 hour)
  nonce: bigint,  // User nonce (anti-replay)
  signature: `0x${string}`  // Oracle signature
}
```

### 2. Quest Claim Button
**File**: `components/quests/QuestClaimButton.tsx`

**States**:
- `idle` - Ready to claim
- `claiming` - Preparing transaction
- `waiting` - Transaction submitted
- `success` - Claim successful
- `error` - Claim failed (with retry)

**Features**:
- Wallet connection check
- Signature deadline validation
- Transaction submission
- Success/error handling
- Database update on success

### 3. Database Schema Updates
**Migration**: `supabase/migrations/20251231_add_quest_claiming_tracking.sql`

**New Columns in `quest_completions`**:
- `is_claimed` (boolean) - Track claiming status
- `claim_tx_hash` (text) - Transaction hash
- `claimed_at` (timestamptz) - Claim timestamp
- `claim_signature` (jsonb) - Oracle signature data

**Indexes**:
- `idx_quest_completions_claimed` - Query by FID and claimed status
- `idx_quest_completions_tx_hash` - Lookup by transaction hash
- `idx_quest_completions_unclaimed_with_sig` - Find unclaimed quests with signatures

### 4. API Endpoints

**POST `/api/quests/[slug]/verify`**
- **Updated**: Now generates and stores oracle signature
- **Response**: Includes `claim_signature` when quest completed

**GET `/api/quests/unclaimed?fid={fid}`**
- **Purpose**: Fetch unclaimed quest completions
- **Response**: List of quests with signatures

**POST `/api/quests/mark-claimed`**
- **Purpose**: Update quest as claimed after transaction
- **Body**: `{ quest_id, user_fid, tx_hash }`

### 5. UI Integration
**File**: `components/quests/QuestCompleteClient.tsx`

**Added**:
- Import `QuestClaimButton` and `useAuthContext`
- Fetch unclaimed quest data via API
- Show claim button if signature exists
- Refresh page after successful claim

## Testing Checklist

### Pre-Testing Setup

- [ ] **Environment Variables**
  ```bash
  # Check oracle private key is set
  grep ORACLE_PRIVATE_KEY .env.local
  ```
  
- [ ] **Database Migration**
  ```bash
  # Verify columns exist
  psql -c "SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'quest_completions' 
           AND column_name IN ('is_claimed', 'claim_tx_hash', 'claimed_at', 'claim_signature');"
  ```

- [ ] **Contract Deployment**
  - Verify GmeowCombined contract is deployed on Base
  - Check contract has quest escrow funds
  - Verify oracle address is configured in contract

### Test Scenario 1: Complete Quest with Signature Generation

**Steps**:
1. Navigate to `/quests`
2. Select an active quest
3. Complete quest verification (all tasks)
4. Check console for signature generation log
5. Verify quest redirects to `/quests/[slug]/complete`

**Expected Results**:
- ✅ Console shows: `[API] Generated claim signature`
- ✅ Console shows: `[API] Stored claim signature in database`
- ✅ Database query shows signature stored:
  ```sql
  SELECT claim_signature FROM quest_completions 
  WHERE completer_fid = {your_fid} 
  ORDER BY completed_at DESC LIMIT 1;
  ```

**Verification**:
```bash
# Query for signature
curl http://localhost:3000/api/quests/unclaimed?fid={your_fid}
# Should return quest with claim_signature field
```

### Test Scenario 2: Claim Quest Rewards On-Chain

**Steps**:
1. Complete quest (from Scenario 1)
2. On quest complete page, find "Claim Rewards" button
3. Connect wallet (ensure wallet matches FID address)
4. Click "Claim Rewards On-Chain"
5. Approve transaction in wallet
6. Wait for confirmation

**Expected Results**:
- ✅ Button shows "Preparing..." → "Claiming..."
- ✅ Transaction submitted successfully
- ✅ Console shows: `[QuestClaimButton] Initiating claim`
- ✅ Toast notification: "Transaction submitted"
- ✅ Transaction confirms on Base
- ✅ Button changes to "Quest Claimed!" (disabled)
- ✅ Database updated: `is_claimed = true`

**Verification**:
```bash
# Check Subsquid for QuestCompletion entity
curl -X POST http://localhost:4350/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ questCompletions { id questId user pointsAwarded } }"}'

# Check database
psql -c "SELECT is_claimed, claim_tx_hash, claimed_at FROM quest_completions WHERE completer_fid = {your_fid} ORDER BY completed_at DESC LIMIT 1;"
```

### Test Scenario 3: Signature Expiration

**Steps**:
1. Complete quest to generate signature
2. Wait 1 hour and 1 minute (deadline expires)
3. Try to claim quest

**Expected Results**:
- ❌ Error: "Signature expired - please verify quest again"
- ✅ No transaction submitted
- ✅ Database unchanged

### Test Scenario 4: Duplicate Claim Prevention

**Steps**:
1. Claim quest successfully (Scenario 2)
2. Refresh page
3. Try to claim again

**Expected Results**:
- ✅ Claim button not shown (quest already claimed)
- ✅ API returns empty unclaimed list

### Test Scenario 5: Unclaimed Quests API

**Steps**:
1. Complete 2-3 quests without claiming
2. Call unclaimed API: `GET /api/quests/unclaimed?fid={your_fid}`

**Expected Results**:
- ✅ Returns array of unclaimed quests
- ✅ Each quest has `claim_signature` field
- ✅ Each signature has valid `deadline` (not expired)
- ✅ Quest details populated from `unified_quests` join

**Example Response**:
```json
{
  "success": true,
  "unclaimed_quests": [
    {
      "id": 123,
      "quest_id": 11,
      "completer_fid": 18139,
      "points_awarded": 100,
      "is_claimed": false,
      "claim_signature": {
        "questId": 11,
        "userAddress": "0x...",
        "fid": 18139,
        "action": 0,
        "deadline": 1735689600,
        "nonce": "0",
        "signature": "0x..."
      },
      "unified_quests": {
        "id": 11,
        "title": "Follow gmeowbased",
        "slug": "follow-gmeowbased",
        "reward_points_awarded": 100
      }
    }
  ],
  "count": 1
}
```

### Test Scenario 6: Contract Event Emission

**Steps**:
1. Claim quest successfully
2. Check blockchain explorer (BaseScan)
3. Verify `QuestCompleted` event emitted

**Expected Event Data**:
```solidity
QuestCompleted(
  questId: uint256,        // Matches quest.onchain_quest_id
  user: address,           // User's wallet address
  pointsAwarded: uint256,  // Matches quest.reward_points_awarded
  fid: uint256,            // User's Farcaster FID
  rewardToken: address,    // Zero address if no tokens
  tokenAmount: uint256     // Zero if no tokens
)
```

**Verification**:
1. Find transaction on BaseScan
2. Check "Logs" tab
3. Verify event parameters match expected values

### Test Scenario 7: Subsquid Indexing

**Steps**:
1. Claim quest successfully
2. Wait 15-30 seconds for indexing
3. Query Subsquid GraphQL API

**Query**:
```graphql
{
  questCompletions(
    where: { user_eq: "{your_wallet_address}" }
    orderBy: timestamp_DESC
  ) {
    id
    questId
    user
    pointsAwarded
    fid
    timestamp
  }
}
```

**Expected Results**:
- ✅ QuestCompletion entity created
- ✅ `pointsAwarded` matches quest reward
- ✅ `fid` matches your FID
- ✅ Timestamp recent

### Test Scenario 8: Error Handling - No Wallet

**Steps**:
1. Complete quest
2. Disconnect wallet
3. Try to claim quest

**Expected Results**:
- ❌ Error: "Please connect your wallet first"
- ✅ No transaction attempted
- ✅ Button remains in idle state

### Test Scenario 9: Error Handling - Wrong Wallet

**Steps**:
1. Complete quest with FID linked to Address A
2. Connect wallet with Address B (different)
3. Try to claim quest

**Expected Results**:
- ❌ Contract reverts: "Invalid signature" (address mismatch)
- ✅ Button shows error state with retry option
- ✅ Database unchanged

### Test Scenario 10: Nonce Increment

**Steps**:
1. Check user nonce: `contract.read.userNonce([userAddress])`
2. Claim quest successfully
3. Check nonce again

**Expected Results**:
- ✅ Nonce incremented by 1
- ✅ Previous signature now invalid (old nonce)
- ✅ New claims require new signature with new nonce

## Database Verification Queries

### Check Quest Completions Status
```sql
SELECT 
  qc.id,
  uq.title,
  qc.completer_fid,
  qc.points_awarded,
  qc.is_claimed,
  qc.claim_tx_hash,
  qc.completed_at,
  qc.claimed_at,
  qc.claim_signature IS NOT NULL as has_signature
FROM quest_completions qc
JOIN unified_quests uq ON qc.quest_id = uq.id
ORDER BY qc.completed_at DESC
LIMIT 10;
```

### Check Unclaimed Quests
```sql
SELECT 
  qc.completer_fid,
  COUNT(*) as unclaimed_count,
  SUM(qc.points_awarded) as total_unclaimed_points
FROM quest_completions qc
WHERE qc.is_claimed = false
  AND qc.claim_signature IS NOT NULL
GROUP BY qc.completer_fid
ORDER BY unclaimed_count DESC;
```

### Check Claiming Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_claimed = true) as claimed,
  COUNT(*) FILTER (WHERE is_claimed = false) as unclaimed,
  COUNT(*) as total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE is_claimed = true) / COUNT(*),
    2
  ) as claim_percentage
FROM quest_completions
WHERE claim_signature IS NOT NULL;
```

## Known Issues & Limitations

### Issue 1: Signature Expiration
- **Problem**: Signatures expire after 1 hour
- **Impact**: Users must claim within 1 hour of completion
- **Workaround**: Re-verify quest to generate new signature
- **Fix**: Consider extending deadline to 24 hours

### Issue 2: No Batch Claiming
- **Problem**: Users must claim quests one at a time
- **Impact**: Multiple unclaimed quests require multiple transactions
- **Workaround**: None - claim individually
- **Fix**: Implement batch claiming contract function

### Issue 3: Gas Costs
- **Problem**: Claiming requires gas fee on Base
- **Impact**: Users need ETH on Base to claim
- **Workaround**: None - required for blockchain transactions
- **Fix**: Consider meta-transactions or gasless claiming

## Success Criteria

### Functional Requirements
- ✅ Quest verification generates oracle signature
- ✅ Signature stored in database
- ✅ Claim button appears on quest complete page
- ✅ Claim transaction executes successfully
- ✅ Contract emits QuestCompleted event
- ✅ Subsquid indexes event correctly
- ✅ Database updated with claim status
- ✅ Duplicate claims prevented

### Non-Functional Requirements
- ✅ Signature generation < 1 second
- ✅ Claim transaction < 5 seconds (network dependent)
- ✅ UI responsive during claiming
- ✅ Error messages clear and actionable
- ✅ No data loss on failures

## Rollback Plan

If issues arise, rollback in this order:

### Step 1: Disable Claiming UI
```typescript
// In components/quests/QuestCompleteClient.tsx
// Comment out claim button section
{/* TEMPORARILY DISABLED
  {claimSignature && numericQuestId && userFid && (
    ...
  )}
*/}
```

### Step 2: Stop Signature Generation
```typescript
// In app/api/quests/[slug]/verify/route.ts
// Comment out signature generation
/*
if (verificationResult.quest_completed && validationResult.data.userAddress) {
  ...
}
*/
```

### Step 3: Rollback Database Migration
```bash
psql < supabase/migrations/rollback_20251231_add_quest_claiming_tracking.sql
```

### Step 4: Remove New Files
```bash
rm lib/quests/oracle-signature.ts
rm components/quests/QuestClaimButton.tsx
rm app/api/quests/unclaimed/route.ts
rm app/api/quests/mark-claimed/route.ts
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Claim Rate**: Percentage of completed quests that get claimed
2. **Time to Claim**: Average time between completion and claiming
3. **Signature Expiration Rate**: How many signatures expire unused
4. **Transaction Success Rate**: Percentage of successful claim transactions
5. **Error Types**: Most common claiming errors

### Logging Points

```typescript
// Quest completion with signature
console.log('[API] Generated claim signature:', {
  questId, userFid, deadline, nonce
});

// Quest claim initiated
console.log('[QuestClaimButton] Initiating claim:', {
  questId, userAddress, fid, nonce
});

// Claim successful
console.log('[QuestClaimButton] Quest marked as claimed:', {
  questId, userFid, txHash
});
```

## Support & Debugging

### Common Issues

**Issue**: "Signature expired" error
- **Cause**: Waited > 1 hour after completion
- **Fix**: Re-verify quest to generate new signature

**Issue**: "Invalid signature" error
- **Cause**: Wrong wallet or contract address mismatch
- **Fix**: Connect wallet matching FID, verify contract address

**Issue**: Claim button not showing
- **Cause**: Quest already claimed or no signature
- **Fix**: Check database for claim status and signature

**Issue**: Transaction reverted
- **Cause**: Quest not active, no escrow, or signature invalid
- **Fix**: Check contract state, verify quest has escrow

### Debug Commands

```bash
# Check oracle private key configured
echo $ORACLE_PRIVATE_KEY

# Check claim signature in database
psql -c "SELECT claim_signature FROM quest_completions WHERE completer_fid = {fid} ORDER BY completed_at DESC LIMIT 1;"

# Check user nonce
cast call $GMEOW_CONTRACT "userNonce(address)(uint256)" $USER_ADDRESS --rpc-url $BASE_RPC

# Check quest escrow
cast call $GMEOW_CONTRACT "quests(uint256)(bool,bool,uint256,uint256,uint256)" $QUEST_ID --rpc-url $BASE_RPC
```

## Conclusion

The quest on-chain claiming system is now fully implemented and ready for testing. Follow this guide systematically to verify all functionality works as expected.

For any issues or questions, refer to the implementation files or contact the development team.

**Last Updated**: December 31, 2025
**Version**: 1.0.0
**Status**: Ready for Testing ✅
