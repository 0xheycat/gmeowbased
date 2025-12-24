# Test Data Scripts

⚠️ **WARNING: FOR LOCAL DEVELOPMENT ONLY** ⚠️

These scripts contain mock/test data and should **NEVER** be run in production.

## Purpose

- Local development testing
- Integration test setup
- Demo data for UI development

## Files

- `seed_test_data.sql` - Test data for gmeow_rank_events (FID 18139 only)
- `seed-leaderboard-mock.sql` - Mock leaderboard data for testing

## Usage

```bash
# Run only in local development
psql -U postgres -d gmeowbased_dev -f scripts/sql/seed_test_data.sql
```

## Production Data Sources

Real production data comes from:

1. **Blockchain Events** → Subsquid indexer
2. **Farcaster Data** → Neynar API via `lib/integrations/neynar.ts`
3. **User Activity** → API endpoints writing to Supabase
4. **Multi-Wallet Sync** → `lib/integrations/neynar-wallet-sync.ts`

## Architecture Compliance

✅ **DO:**
- Use existing infrastructure (`lib/integrations/neynar.ts`)
- Auto-detect FIDs from wallet addresses (`fetchFidByAddress`)
- Use multi-wallet support (`getAllWalletsForFID`)
- Fetch profiles via `lib/profile/profile-service.ts`

❌ **DON'T:**
- Hardcode FIDs or addresses
- Use inline Neynar API calls
- Bypass existing infrastructure
- Add mock data to production migrations
