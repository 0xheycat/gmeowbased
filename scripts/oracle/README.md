# Oracle Scripts

Scripts for managing oracle deposits to ScoringModule contract.

## Overview

The oracle wallet (`0x8870C155666809609176260F2B65a626C000D773`) deposits off-chain data to the on-chain ScoringModule:
- **Viral Points**: Badge share engagement from Warpcast
- **Guild Points**: Guild membership and activity (TODO)
- **Referral Points**: Referral network performance (TODO)

## Prerequisites

1. **Oracle Wallet Authorized**: Contract owner must authorize oracle first
2. **ORACLE_PRIVATE_KEY**: Set in `.env.local` (DO NOT COMMIT)
3. **Database Access**: Supabase credentials for aggregating off-chain data

## Scripts

### 1. Verify Authorization

Check if oracle wallet is authorized:

```bash
pnpm tsx scripts/oracle/verify-authorization.ts
```

**Output**:
- ✅ AUTHORIZED - Oracle can deposit points
- ❌ NOT AUTHORIZED - Run authorization script first

### 2. Authorize Oracle (Owner Only)

Authorize oracle wallet to call scoring functions:

```bash
OWNER_PRIVATE_KEY=0x... pnpm tsx scripts/oracle/authorize-oracle.ts
```

**Requirements**:
- `OWNER_PRIVATE_KEY`: Private key of ScoringModule owner
- Gas: ~100K gas (~$0.10 on Base)

**What it does**:
- Calls `ScoringModule.setAuthorizedOracle(oracle, true)`
- Verifies authorization after transaction
- Only needs to be run once

### 3. Deposit Viral Points

Aggregate viral XP from badge casts and deposit to contract:

```bash
# Dry run (simulation only)
pnpm tsx scripts/oracle/deposit-viral-points.ts --dry-run

# Live deposit
pnpm tsx scripts/oracle/deposit-viral-points.ts
```

**Requirements**:
- `ORACLE_PRIVATE_KEY`: Oracle wallet private key
- Oracle must be authorized first
- Gas: ~200K gas per user (~$0.20 on Base)

**What it does**:
1. Queries `badge_casts` table for viral XP
2. Aggregates `SUM(viral_bonus_xp)` by FID
3. Joins `user_profiles` to get wallet addresses
4. Calls `ScoringModule.setViralPoints(wallet, totalXP)` for each user
5. Logs transaction hashes to `viral_deposits` table

**Scheduling**: Recommend daily or weekly via:
- GitHub Actions cron
- Vercel cron (if owner approves)
- Manual execution

## Database Tables

### `viral_deposits`

Tracks oracle deposits for audit trail:

```sql
CREATE TABLE viral_deposits (
  id UUID PRIMARY KEY,
  fid INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  viral_xp INTEGER NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  deposited_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### `get_viral_xp_aggregates()` RPC

Aggregates viral XP by FID:

```sql
SELECT 
  bc.fid,
  SUM(bc.viral_bonus_xp)::BIGINT as total_viral_xp,
  up.wallet_address
FROM badge_casts bc
INNER JOIN user_profiles up ON bc.fid = up.fid
WHERE bc.viral_bonus_xp > 0
  AND up.wallet_address IS NOT NULL
GROUP BY bc.fid, up.wallet_address
ORDER BY total_viral_xp DESC;
```

## Security

- **Private Keys**: Never commit private keys to version control
- **Environment Variables**: Use `.env.local` for local development
- **Production**: Store in AWS Secrets Manager or Vercel Environment Variables
- **Rate Limiting**: 100ms delay between deposits to avoid rate limits
- **Dry Run**: Always test with `--dry-run` first

## Troubleshooting

### Oracle Not Authorized

```
❌ Oracle wallet is NOT authorized!
```

**Solution**: Run authorization script with owner key:
```bash
OWNER_PRIVATE_KEY=0x... pnpm tsx scripts/oracle/authorize-oracle.ts
```

### Gas Estimation Failed

```
Error: Execution reverted
```

**Causes**:
- Oracle not authorized
- Invalid wallet address
- Contract paused
- Insufficient gas

**Solution**: Run verification script, check contract state

### No Data to Deposit

```
Found 0 users with viral XP
```

**Causes**:
- No badge shares yet
- Viral metrics cron not running
- Database sync issues

**Solution**: 
1. Check `badge_casts` table has data
2. Verify viral metrics cron running: `pnpm tsx scripts/automation/sync-viral-metrics.ts --dry-run`
3. Test badge sharing on Warpcast

## Future Scripts

- [ ] `deposit-guild-points.ts` - Guild activity bonuses
- [ ] `deposit-referral-points.ts` - Referral network rewards
- [ ] `deposit-streak-bonuses.ts` - GM streak multipliers
- [ ] `deposit-badge-prestige.ts` - Staked badge prestige

## References

- [LEADERBOARD-CATEGORY-SORTING-FIX.md](../../LEADERBOARD-CATEGORY-SORTING-FIX.md) - Implementation plan
- [ScoringModule.sol](../../contract/modules/ScoringModule.sol) - On-chain contract
- [sync-viral-metrics.ts](../automation/sync-viral-metrics.ts) - Viral XP calculation

---

**Created**: January 11, 2026  
**Author**: GitHub Copilot  
**Status**: ✅ Viral Points - Ready for Authorization
