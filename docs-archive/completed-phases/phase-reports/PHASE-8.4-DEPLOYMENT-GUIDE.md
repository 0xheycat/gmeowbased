# Phase 8.4 Deployment Guide - ReferrerSet Event

**Date**: December 19, 2025  
**Status**: Code Ready, Needs Deployment

---

## Quick Deployment Commands

Run these commands in order:

```bash
# 1. Navigate to indexer directory
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# 2. Build processor (already done - Exit Code: 0)
npm run build

# 3. Apply database migration
npm run db:migrate

# 4. Restart processor
# Option A: If using screen session
screen -S squid-processor -X quit  # Stop existing
screen -dmS squid-processor npm run process  # Start new

# Option B: If using docker
docker-compose restart processor

# Option C: Manual restart
# Stop: Ctrl+C in processor terminal
# Start: npm run process
```

---

## Verification Steps

### 1. Check Migration Applied
```bash
psql $DB_URL -c "SELECT * FROM squid_processor.migrations ORDER BY id DESC LIMIT 3;"
```
Should show: `1766151000000` (ReferrerSet migration)

### 2. Check Table Created
```bash
psql $DB_URL -c "\d referrer_set"
```
Should show: 6 columns (id, user, referrer, timestamp, block_number, tx_hash)

### 3. Test GraphQL Endpoint
```bash
curl -X POST http://localhost:4350/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ referrerSets(limit: 5) { id user referrer timestamp } }"}'
```

### 4. Check Processor Logs
```bash
# If using screen
screen -r squid-processor

# If using docker
docker logs -f gmeow-processor --tail 50
```

---

## What Was Deployed

### Schema Changes
✅ **File**: `gmeow-indexer/schema.graphql`
```graphql
type ReferrerSet @entity {
  id: ID!
  user: String! @index
  referrer: String! @index
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}
```

### Processor Handler
✅ **File**: `gmeow-indexer/src/main.ts`
- Added ReferrerSet event handler
- Tracks when users set their referrer
- Logs: "Referrer set: {user} → {referrer}"

### Database Migration
✅ **File**: `gmeow-indexer/db/migrations/1766151000000-Data.js`
- Creates `referrer_set` table
- Creates 4 indexes for performance

### Client Functions
✅ **File**: `lib/subsquid-client.ts`
- `getReferrerChain(user)` - Get user's referrer history
- `getReferrerHistory(referrer, limit)` - Get users who set this referrer
- `getReferralNetworkStats(address)` - Aggregate statistics

---

## Troubleshooting

### Migration Not Applied
```bash
# Check if migration file exists
ls -l gmeow-indexer/db/migrations/1766151000000-Data.js

# Manually apply migration
cd gmeow-indexer
npx squid-typeorm-migration apply
```

### Processor Not Starting
```bash
# Check for errors
cd gmeow-indexer
npm run process

# Check port conflicts
lsof -i :4350

# Check database connection
psql $DB_URL -c "SELECT 1;"
```

### GraphQL Not Responding
```bash
# Check if processor is running
ps aux | grep "node.*process"

# Check logs for errors
tail -f gmeow-indexer/logs/processor.log
```

---

## Next Steps After Deployment

### Phase 8.2: Points & Treasury Events (Optional, 1-2 days)
5 events to implement:
- PointsDeposited
- PointsWithdrawn
- ERC20EscrowDeposited
- ERC20Payout
- ERC20Refund

### UI Development (Recommended Next)
Already have APIs ready:
- Quest completions with profile enrichment
- Staking dashboard APIs
- Can build UI components now

### Test Phase 8.4
```typescript
// Test in your app
import { getReferrerChain, getReferrerHistory } from '@/lib/subsquid-client'

// Get user's referrer
const chain = await getReferrerChain('0x...')
console.log('User referrer chain:', chain)

// Get referral network
const history = await getReferrerHistory('0x...', 10)
console.log('Users referred:', history.length)
```

---

## Files Modified

1. `gmeow-indexer/schema.graphql` - Added ReferrerSet entity
2. `gmeow-indexer/src/main.ts` - Added event handler + import
3. `gmeow-indexer/db/migrations/1766151000000-Data.js` - New migration
4. `lib/subsquid-client.ts` - Added 3 query functions
5. `ACTIVE-FEATURES-USAGE-ANALYSIS.md` - Updated documentation

**Total Lines**: ~130 lines of production code

---

**Estimated Time**: 5 minutes for deployment  
**Risk Level**: Low (isolated changes, no breaking changes)  
**Rollback**: Revert migration if needed

---

✨ **Ready to deploy!**
