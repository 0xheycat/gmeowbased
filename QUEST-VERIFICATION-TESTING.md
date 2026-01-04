# Quest Verification Testing Guide
**Date**: December 28, 2025  
**Quest URL**: http://localhost:3000/quests/testing-quest-mjolqp3s  
**Status**: Bug #19 Fixed - Enhanced error reporting

---

## Prerequisites

1. **Server Running**: `pnpm dev` on port 3000
2. **Authenticated**: FID 18139 logged in
3. **Wallet Connected**: MetaMask/Coinbase Wallet connected
4. **Browser Console Open**: Press F12 to see debug logs

---

## Test Scenarios

### ✅ Scenario 1: Successful Verification (Onchain Quest)

**Steps**:
1. Navigate to http://localhost:3000/quests/testing-quest-mjolqp3s
2. Ensure wallet is connected (check top-right corner)
3. Click "Verify" button on quest task
4. Wait for verification (loading spinner)

**Expected Result**:
```
✓ Success message appears
✓ Rewards overlay shows (if quest completed)
✓ Console log: [QuestVerification] API response: { success: true, ... }
✓ Points/XP awarded to user
```

---

### ✅ Scenario 2: Quest Already Completed

**Steps**:
1. Complete the quest once (scenario 1)
2. Try to verify again

**Expected Result**:
```
Error message: "Quest already completed"
Console log: [QuestVerification] API response: {
  success: false,
  message: "Quest already completed",
  quest_completed: true
}
```

---

### ✅ Scenario 3: Wallet Not Connected (Onchain Quest)

**Steps**:
1. Disconnect wallet (MetaMask/Coinbase Wallet)
2. Try to verify onchain quest task

**Expected Result**:
```
Error message: "Connect your wallet to verify onchain quests"
UI shows wallet connection prompt
```

---

### ✅ Scenario 4: Missing FID (Social Quest)

**Steps**:
1. Test with social quest (if available)
2. Clear FID input field
3. Try to verify

**Expected Result**:
```
Error message: "Enter your Farcaster ID to verify social quests"
No API call made (client-side validation)
```

---

### ✅ Scenario 5: Quest Not Found

**Steps**:
1. Navigate to http://localhost:3000/quests/invalid-quest-slug
2. Try to verify

**Expected Result**:
```
HTTP 404 error: "Quest not found"
Console log shows HTTP error handling
```

---

### ✅ Scenario 6: Locked Quest (Viral XP Requirement)

**Steps**:
1. Find quest with min_viral_xp_required > 0
2. Try to verify with insufficient XP

**Expected Result**:
```
Error message: "Quest requires [X] Viral XP to unlock"
Console log: [QuestVerification] API response: {
  success: false,
  message: "Quest requires 500 Viral XP to unlock",
  quest_completed: false
}
```

---

## Debug Console Logs

### What to Look For

**Successful Verification**:
```javascript
[QuestVerification] API response: {
  success: true,
  message: "Quest completed! Rewards have been awarded.",
  quest_completed: true,
  task_completed: true,
  rewards: {
    xp_earned: 100,
    points_earned: 100
  }
}
```

**Failed Verification**:
```javascript
[QuestVerification] API response: {
  success: false,
  message: "Quest already completed",
  quest_completed: true,
  task_completed: false
}
```

**HTTP Error**:
```javascript
Error: HTTP 500: Internal Server Error
// or
Error: Quest not found
```

---

## Network Tab Inspection

Open DevTools → Network tab:

1. **Request**:
   ```
   POST /api/quests/testing-quest-mjolqp3s/verify
   Body: {
     "userFid": 18139,
     "userAddress": "0x...",
     "taskIndex": 0
   }
   ```

2. **Response** (Success):
   ```json
   {
     "success": true,
     "message": "Quest completed! Rewards have been awarded.",
     "quest_completed": true,
     "task_completed": true,
     "rewards": {
       "xp_earned": 100,
       "points_earned": 100
     }
   }
   ```

3. **Response** (Error):
   ```json
   {
     "success": false,
     "message": "Quest already completed",
     "quest_completed": true,
     "task_completed": false
   }
   ```

---

## Common Issues & Solutions

### Issue: "Invalid request data"
**Old behavior** (Bug #19 - now fixed):
- Generic error, no details

**New behavior** (after fix):
- Shows actual API error message
- Console logs full response
- Helps identify root cause

### Issue: Infinite loading spinner
**Causes**:
- API rate limit (429)
- Server error (500)
- Network timeout

**Debug**:
1. Check Network tab for HTTP status
2. Check console for error logs
3. Verify dev server is running

### Issue: Wallet connection fails
**Solutions**:
1. Refresh page
2. Reconnect wallet manually
3. Check wallet extension is installed
4. Verify correct network (Base)

---

## API Response Structure

### Success Response
```typescript
{
  success: true,
  message: string,
  quest_completed: boolean,
  task_completed: boolean,
  next_task_index?: number,
  rewards?: {
    xp_earned: number,
    points_earned: number,
    token_earned?: number,
    nft_awarded?: boolean
  },
  proof?: Record<string, any>
}
```

### Error Response
```typescript
{
  success: false,
  message: string,
  quest_completed: boolean,
  task_completed: boolean,
  details?: any  // Additional error context
}
```

---

## Bug Status

- ✅ **Bug #17**: Auth integration (FIXED)
- ✅ **Bug #18**: Analytics infinite loop (FIXED)
- ✅ **Bug #19**: Error message clarity (FIXED)
- 🎯 **Bug #20**: TBD (awaiting discovery)

**Total**: 19/20 bugs fixed (95% complete)

---

## Next Steps After Testing

1. **If verification works**: ✅ Ready for production
2. **If new error found**: Document as Bug #20
3. **If quest completes**: Check database for:
   - `quest_completions` record created
   - `user_points_balances.points_balance` increased
   - `user_points.xp` increased

---

## Database Verification

After successful quest completion:

```sql
-- Check quest completion
SELECT * FROM quest_completions 
WHERE user_fid = 18139 
AND quest_id = (SELECT id FROM unified_quests WHERE slug = 'testing-quest-mjolqp3s');

-- Check points balance
SELECT points_balance, total_score, viral_xp 
FROM user_points_balances 
WHERE fid = 18139;

-- Check XP
SELECT xp FROM user_points 
WHERE fid = 18139;
```

Expected:
- Quest completion record exists ✅
- Points balance increased by `reward_points_awarded` ✅
- XP increased by `reward_points_awarded` ✅

---

**End of Testing Guide**
