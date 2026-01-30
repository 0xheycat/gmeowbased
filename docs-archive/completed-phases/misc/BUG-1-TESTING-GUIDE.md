# BUG #1 - Testing Guide for Guild Update Authentication

## Pre-Test Checklist

### 1. Environment Setup
- [ ] Local dev server running on `http://localhost:3000`
- [ ] Wallet connected (MetaMask/WalletConnect/Coinbase Wallet)
- [ ] Test guild exists (Guild ID #1 recommended)
- [ ] You are the guild leader (check contract)

### 2. Test Data Required
- **Guild ID:** `1` (or your test guild)
- **Guild Leader Address:** `0x...` (your wallet address)
- **Non-Leader Address:** `0x0000000000000000000000000000000000000001` (for negative tests)

---

## Test Cases

### ✅ TEST 1: Guild Leader Can Update Settings (POSITIVE)

**Prerequisites:**
- Connected wallet is the guild leader
- Guild exists in database

**Steps:**
1. Navigate to `http://localhost:3000/guild/1`
2. Click "Settings" tab
3. Change guild name: `Test Guild Updated`
4. Change description: `This is a test update`
5. Click "Save Changes"

**Expected Result:**
- ✅ Success message: "Guild settings updated successfully!"
- ✅ Page reloads after 1.5 seconds
- ✅ Updated name/description visible
- ✅ `guild_events` table has new `GUILD_UPDATED` event

**API Request (DevTools Network Tab):**
```json
PUT /api/guild/1/update
{
  "address": "0x7539472dad6a371e6e152c5a203469aa32314130",
  "name": "Test Guild Updated",
  "description": "This is a test update"
}
```

**Expected Response:**
```json
{
  "success": true,
  "guild": {
    "id": "1",
    "name": "Test Guild Updated",
    "description": "This is a test update",
    "banner": ""
  },
  "timestamp": 1234567890
}
```

---

### ❌ TEST 2: Non-Leader Cannot Update Settings (NEGATIVE)

**Prerequisites:**
- Connected wallet is NOT the guild leader
- OR manually test via curl/Postman with non-leader address

**Steps (Manual API Test):**
```bash
curl -X PUT http://localhost:3000/api/guild/1/update \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x0000000000000000000000000000000000000001",
    "name": "Malicious Update",
    "description": "Should be blocked"
  }'
```

**Expected Result:**
- ❌ HTTP 403 Forbidden
- ❌ Error message: "Only guild leader can update settings"
- ❌ No changes to guild metadata
- ❌ No `GUILD_UPDATED` event in database

**Expected Response:**
```json
{
  "success": false,
  "message": "Only guild leader can update settings"
}
```

---

### ❌ TEST 3: Missing Address Rejected (VALIDATION)

**Steps (Manual API Test):**
```bash
curl -X PUT http://localhost:3000/api/guild/1/update \
  -H "Content-Type": "application/json" \
  -d '{
    "name": "Test Update",
    "description": "Missing address field"
  }'
```

**Expected Result:**
- ❌ HTTP 400 Bad Request
- ❌ Zod validation error about missing address
- ❌ No changes to guild metadata

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["address"],
      "message": "Required"
    }
  ]
}
```

---

### ❌ TEST 4: Invalid Address Format Rejected (VALIDATION)

**Steps (Manual API Test):**
```bash
curl -X PUT http://localhost:3000/api/guild/1/update \
  -H "Content-Type: application/json" \
  -d '{
    "address": "invalid-wallet-address",
    "name": "Test Update"
  }'
```

**Expected Result:**
- ❌ HTTP 400 Bad Request
- ❌ Zod validation error: "Invalid wallet address"
- ❌ No changes to guild metadata

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": [
    {
      "validation": "regex",
      "code": "invalid_string",
      "message": "Invalid wallet address",
      "path": ["address"]
    }
  ]
}
```

---

### ✅ TEST 5: Wallet Not Connected (UI HANDLING)

**Steps:**
1. Disconnect wallet in MetaMask
2. Navigate to `http://localhost:3000/guild/1`
3. Click "Settings" tab
4. Try to change guild name
5. Click "Save Changes"

**Expected Result:**
- ❌ Error dialog appears
- ❌ Message: "Wallet not connected. Please connect your wallet to update guild settings."
- ❌ No API request sent (blocked client-side)

---

### ✅ TEST 6: Audit Logging Verification (DATABASE)

**Prerequisites:**
- Completed TEST 1 successfully

**Steps:**
1. Connect to Supabase/Postgres database
2. Query guild events:
   ```sql
   SELECT * FROM guild_events 
   WHERE guild_id = '1' 
   AND event_type = 'GUILD_UPDATED'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

**Expected Result:**
```
id: <uuid>
guild_id: "1"
event_type: "GUILD_UPDATED"
actor_address: "0x7539472dad6a371e6e152c5a203469aa32314130"
target_address: null
amount: null
metadata: {
  "guild_name": "Test Guild Updated",
  "new_name": "Test Guild Updated",
  "new_description": "This is a test update"
}
created_at: "2025-12-23T..."
```

---

## Console Logging Verification

### ✅ Successful Update
Check browser console for:
```
[guild-update] Member management request: {
  address: "0x7539...",
  guildId: "1",
  timestamp: "2025-12-23T..."
}
```

### ❌ Failed Authorization
Check server logs (terminal running `npm run dev`) for:
```
[guild-update] Authorization failed: {
  requestedBy: "0x0000...",
  guildLeader: "0x7539...",
  guildId: "1",
  timestamp: "2025-12-23T..."
}
```

---

## Post-Test Verification

### Database Integrity
- [ ] `guild_metadata` table updated correctly
- [ ] `guild_events` table has GUILD_UPDATED event
- [ ] No unauthorized updates in database
- [ ] Event metadata contains correct actor_address

### Security Checks
- [ ] Non-leader requests return 403
- [ ] Invalid addresses return 400
- [ ] Missing addresses return 400
- [ ] No SQL injection possible (Supabase parameterized)
- [ ] No XSS in updated fields (React auto-escapes)

### Performance
- [ ] Update completes in < 500ms
- [ ] No database race conditions
- [ ] Page reload works correctly
- [ ] No console errors in browser

---

## Rollback Plan

If tests fail:
1. Check server logs for errors
2. Verify wallet is connected
3. Confirm you are guild leader: `guild.leader === yourWalletAddress`
4. Check Supabase RLS policies (may block updates)
5. Revert changes if needed:
   ```bash
   git checkout HEAD -- app/api/guild/[guildId]/update/route.ts
   git checkout HEAD -- components/guild/GuildSettings.tsx
   ```

---

## Success Criteria

All tests must pass:
- ✅ TEST 1: Leader can update ✅
- ✅ TEST 2: Non-leader blocked ❌
- ✅ TEST 3: Missing address rejected ❌
- ✅ TEST 4: Invalid format rejected ❌
- ✅ TEST 5: UI handles no wallet ✅
- ✅ TEST 6: Audit log created ✅

**ONLY after all tests pass, proceed to update audit documentation.**
