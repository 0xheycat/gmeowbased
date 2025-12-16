# Guild API Testing Guide - Oracle Address

## 🎯 Testing Configuration

**Oracle Address**: `0x8870C155666809609176260F2B65a626C000D773`  
**Guild ID**: `1`  
**Dev Server**: `http://localhost:3000`  
**Status**: All 6 APIs fixed with leader fallback ✅

---

## 🧪 Test Suite

### Test 1: Deposit API ⏳
**Endpoint**: `POST /api/guild/1/deposit`

**Request Body**:
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 10
}
```

**Expected Result**:
- ✅ Status: 200 OK
- ✅ Response contains contract call instructions
- ✅ No "You are not in any guild" error

**How to Test**:
1. Open browser DevTools Network tab
2. Navigate to guild page
3. Attempt to deposit 10 points
4. Check network request/response

**Previous Error** (now fixed):
```
POST /api/guild/1/deposit 400 in 6647ms
Error: "You are not in any guild"
contractAddress: '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73'
functionName: 'guildOf'
args: ['0x8870C155666809609176260F2B65a626C000D773']
```

---

### Test 2: Is-Member API ✅ TESTED WORKING
**Endpoint**: `GET /api/guild/1/is-member?address=0x8870C155666809609176260F2B65a626C000D773`

**Expected Result**:
- ✅ Status: 200 OK
- ✅ `isMember: true` (leader recognized as member)

**Status**: Already tested and confirmed working

---

### Test 3: Claim API ⏳
**Endpoint**: `POST /api/guild/1/claim`

**Test 3a: Member Request**
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 50,
  "note": "Testing claim request as guild leader"
}
```

**Expected Result**:
- ✅ Status: 200 OK
- ✅ Response contains contract call for claim request
- ✅ No membership error

**Test 3b: Admin Approval (if leader can approve)**
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "action": "approve",
  "targetAddress": "0xSomeMemberAddress",
  "amount": 50
}
```

**Expected Result**:
- ✅ Status: 200 OK
- ✅ Response contains contract call for approval
- ✅ Leader recognized as admin

---

### Test 4: Manage-Member API ⏳
**Endpoint**: `POST /api/guild/1/manage-member`

**Test 4a: Promote Member**
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "action": "promote",
  "targetAddress": "0xSomeMemberAddress"
}
```

**Expected Result**:
- ✅ Status: 200 OK
- ✅ Leader recognized as guild owner
- ✅ Contract call returned

**Test 4b: Demote Member**
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "action": "demote",
  "targetAddress": "0xSomeOfficerAddress"
}
```

**Test 4c: Kick Member**
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "action": "kick",
  "targetAddress": "0xSomeMemberAddress"
}
```

---

### Test 5: Leave API ⏳
**Endpoint**: `POST /api/guild/1/leave`

**Request Body**:
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773"
}
```

**Expected Result**:
- ✅ Status: 200 OK (or 403 if leader cannot leave - business logic)
- ✅ No "You are not a member" error
- ✅ Clear message about leader restrictions (if applicable)

**Note**: Check if leaders are allowed to leave guilds in contract logic

---

### Test 6: Create API ⏳
**Endpoint**: `POST /api/guild/create`

**Request Body**:
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "guildName": "Test Guild 2"
}
```

**Expected Result**:
- ✅ Status: 200 OK (if not already in guild)
- ✅ OR 400 with "Already in a guild" (if already in guild 1)
- ✅ Leader fallback check working

**Note**: This tests if the leader-as-member check properly detects existing guild membership

---

## 🔍 Edge Case Testing

### Test 7: Non-Member Attempts Deposit
**Endpoint**: `POST /api/guild/1/deposit`
```json
{
  "address": "0xNonMemberAddress",
  "amount": 10
}
```

**Expected Result**:
- ✅ Status: 403 Forbidden
- ✅ Error: "You are not a member of this guild"

---

### Test 8: Invalid Guild ID
**Endpoint**: `POST /api/guild/999999/deposit`
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 10
}
```

**Expected Result**:
- ✅ Status: 404 Not Found
- ✅ Error: "Guild not found"

---

### Test 9: Insufficient Points for Deposit
**Endpoint**: `POST /api/guild/1/deposit`
```json
{
  "address": "0x8870C155666809609176260F2B65a626C000D773",
  "amount": 999999999
}
```

**Expected Result**:
- ✅ Status: 400 Bad Request
- ✅ Error: "Insufficient points balance"

---

## 📋 Testing Checklist

### Pre-Testing
- [x] All 6 APIs compile with 0 TypeScript errors
- [x] Dev server running at localhost:3000
- [x] Oracle address confirmed: 0x8870C155666809609176260F2B65a626C000D773
- [x] Guild ID confirmed: 1

### API Testing
- [ ] Test 1: Deposit API (leader can deposit)
- [ ] Test 2: Is-Member API (already tested ✅)
- [ ] Test 3: Claim API (leader can request/approve)
- [ ] Test 4: Manage-Member API (leader can manage)
- [ ] Test 5: Leave API (leader leave logic)
- [ ] Test 6: Create API (membership detection)

### Edge Cases
- [ ] Test 7: Non-member rejection
- [ ] Test 8: Invalid guild ID handling
- [ ] Test 9: Insufficient points handling

### Post-Testing
- [ ] Document all test results
- [ ] Create screenshots of successful operations
- [ ] Note any remaining issues
- [ ] Update GUILD-MIGRATION-CRITICAL-BUGS.md with results

---

## 🎯 Success Criteria

**All Tests Must Pass**:
1. ✅ Guild leaders can deposit points (Test 1)
2. ✅ Guild leaders recognized as members (Test 2) 
3. ✅ Guild leaders can request/approve claims (Test 3)
4. ✅ Guild leaders can manage members (Test 4)
5. ✅ Leave API handles leader properly (Test 5)
6. ✅ Create API checks membership correctly (Test 6)
7. ✅ Non-members properly rejected (Test 7)
8. ✅ Invalid inputs handled gracefully (Tests 8-9)

**Only After All Tests Pass**:
- Update documentation to mark "TESTED AND WORKING"
- Claim completion with confidence
- Deploy to production

---

## 🚀 Quick Test Commands

### Using cURL (from terminal):

**Test Deposit**:
```bash
curl -X POST http://localhost:3000/api/guild/1/deposit \
  -H "Content-Type: application/json" \
  -d '{"address":"0x8870C155666809609176260F2B65a626C000D773","amount":10}'
```

**Test Is-Member**:
```bash
curl http://localhost:3000/api/guild/1/is-member?address=0x8870C155666809609176260F2B65a626C000D773
```

**Test Claim**:
```bash
curl -X POST http://localhost:3000/api/guild/1/claim \
  -H "Content-Type: application/json" \
  -d '{"address":"0x8870C155666809609176260F2B65a626C000D773","amount":50,"note":"Test claim"}'
```

---

## 📊 Test Results Template

```markdown
## Test Results - [Date]

**Tester**: [Name]
**Environment**: Dev (localhost:3000)
**Oracle Address**: 0x8870C155666809609176260F2B65a626C000D773

### Test 1: Deposit API
- Status: ⏳ Not Tested / ✅ Pass / ❌ Fail
- Response Code: 
- Notes: 

### Test 2: Is-Member API
- Status: ✅ Pass
- Response Code: 200
- Notes: Leader correctly recognized as member

### Test 3: Claim API
- Status: ⏳ Not Tested / ✅ Pass / ❌ Fail
- Response Code: 
- Notes: 

[Continue for all tests...]

### Summary
- Total Tests: 9
- Passed: X
- Failed: Y
- Blocked: Z

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🔧 Debugging Tips

**If Test Fails**:
1. Check terminal output for API logs
2. Look for errors in browser DevTools console
3. Check Network tab for request/response details
4. Verify oracle address is correct
5. Confirm guild ID exists
6. Check contract state on blockchain explorer

**Common Issues**:
- Rate limiting: Wait 1 hour or clear Redis cache
- Wallet not connected: Some operations require wallet signature
- Points balance: Verify address has sufficient points
- Contract state: Guild may not exist or be inactive

---

**Ready to Test**: Server running ✅ | APIs fixed ✅ | Documentation ready ✅
