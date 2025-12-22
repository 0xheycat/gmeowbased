# Test Addresses for Activity API

## Overview
Testing the TRUE HYBRID pattern activity API with available blockchain data.

## Available Test Addresses

### 1. Oracle Wallet (✅ Has Blockchain Data)
```
Address: 0x8870C155666809609176260F2B65a626C000D773
Private Key: 0x9abe1d6ae90d3fc0625d7a8dfc4866f4b08d606c20a5f6b4a0bbd62894c82e6b
FID: Unknown (may not have Farcaster profile)

Blockchain Data:
- Points Balance: 10,020
- Points Transactions: 1 (10,000 deposit at block 39270005)
- GM Events: 2 (10 points each, streak day 1)
- Created: 2025-12-10
```

### 2. FID 18139 (@heycat.base.eth)
```
FID: 18139
Username: heycat
Primary Wallet: 0x7539472dad6a371e6e152c5a203469aa32314130
Other Wallets: Need to check (you mentioned 3 wallets)

Blockchain Data:
- Points Balance: 0 (no transactions yet)
- Not indexed by Subsquid yet
```

### 3. Bot FID
```
FID: 1069798
Bot Name: Gmeowbased bot main
Associated Wallet: Unknown (need to check if linked to oracle)
```

### 4. Second Test Address (✅ Has Blockchain Data)
```
Address: 0x8a3094e44577579d6f41f6214a86c250b7dbdc4e

Blockchain Data:
- Points Balance: 20
- GM Events: 2 (10 points each)
```

## Testing Options

### Option 1: Test with Oracle Wallet
To test the API with oracle wallet, we need to:
1. Find or create FID mapping for oracle wallet in Supabase
2. Or create test data for a FID that maps to oracle wallet

### Option 2: Test with FID 18139
To see TRUE HYBRID pattern with FID 18139:
1. **Option A**: Link one of FID 18139's other wallets to oracle address
2. **Option B**: Create blockchain transactions for FID 18139's wallet (0x7539...4130)
3. **Option C**: Add viral_bonus_xp records to badge_casts for FID 18139

### Option 3: Create Test Data
```sql
-- Add viral bonuses for FID 18139 to test off-chain layer
INSERT INTO badge_casts (fid, cast_hash, viral_bonus_xp, tier, created_at)
VALUES 
  (18139, 'test-hash-1', 50, 'viral', NOW()),
  (18139, 'test-hash-2', 100, 'mega_viral', NOW()),
  (18139, 'test-hash-3', 25, 'popular', NOW());
```

## Current Test Results

### Subsquid GraphQL (Layer 1) ✅
```bash
curl -s "http://localhost:4350/graphql" -H "Content-Type: application/json" \
  -d '{"query": "{ users(limit: 5) { id pointsBalance } }"}'
```

### Activity API (TRUE HYBRID) ✅
```bash
curl "http://localhost:3000/api/user/activity/18139?limit=10"
```

**Status**: API works but returns empty activities because:
- FID 18139's wallet has no blockchain transactions (Layer 1)
- FID 18139 has no viral_bonus_xp records (Layer 2)

## Next Steps

Please choose one option:

1. **Link Oracle to FID**: Map oracle wallet (0x8870...D773) to a test FID
2. **Add Test Data**: Insert viral_bonus_xp for FID 18139 to test Layer 2
3. **Check FID 18139 Wallets**: Show me all 3 wallets for FID 18139
4. **Create Transactions**: Send blockchain transactions to FID 18139's wallet

Which would you like to proceed with?
