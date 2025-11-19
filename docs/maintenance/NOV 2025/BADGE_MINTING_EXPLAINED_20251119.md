# Badge Minting System Explanation

**Date:** November 19, 2025  
**User:** FID 18139  
**Issue:** All badges showing "Mint Pending"

## Understanding Badge Assignment vs Minting

The badge system has **two separate stages**:

### Stage 1: Badge Assignment (INSTANT) ✅
When you earn a badge:
1. Badge is assigned to your FID in the database
2. Record created in `user_badges` table
3. Entry added to `mint_queue` table
4. **Badge shows on your profile immediately**
5. Status: `minted: false` (not yet on blockchain)

### Stage 2: Blockchain Minting (ASYNC) ⏳
Badges are minted to the blockchain in batches:
1. Worker script reads `mint_queue` table
2. Calls smart contract to mint badge NFT
3. Updates `user_badges` with transaction hash and token ID
4. Status changes to: `minted: true`
5. **Badge gets glow effect on profile**

## Why "Mint Pending"?

**This is EXPECTED behavior!** 

Badges show "Mint Pending" because:
- ✅ Badge is assigned (you own it)
- ⏳ Blockchain mint hasn't been processed yet
- 🔄 Waiting for worker to run

**This is NOT an error.** It's by design to:
1. Give instant feedback (you see badge immediately)
2. Batch blockchain transactions (save gas fees)
3. Handle blockchain delays without blocking users
4. Retry failed mints automatically

## Your Current Badges (FID 18139)

| Badge | Tier | Assigned | Minted | Status |
|-------|------|----------|--------|--------|
| signal-luminary | Epic | ✅ | ❌ | Waiting for mint worker |
| pulse-runner | Rare | ✅ | ❌ | Waiting for mint worker |
| neon-initiate | Common | ✅ | ❌ | Waiting for mint worker |

**All 3 badges are correctly assigned!** They're just waiting for the minting worker to process them.

## How Badge Minting Works

### Mint Queue Table Schema
```sql
CREATE TABLE mint_queue (
  id SERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, minting, minted, failed
  created_at TIMESTAMP DEFAULT NOW(),
  minted_at TIMESTAMP,
  tx_hash TEXT,
  chain TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);
```

### Minting Flow
```
User Earns Badge
      ↓
Badge Assignment API
      ↓
Insert into user_badges (minted: false)
      ↓
Insert into mint_queue (status: pending)
      ↓
[USER SEES BADGE WITH "MINT PENDING"]
      ↓
Worker Runs (manual or scheduled)
      ↓
Read pending mints from mint_queue
      ↓
Call blockchain contract.mint()
      ↓
Update user_badges (minted: true, tx_hash, token_id)
      ↓
Update mint_queue (status: minted)
      ↓
[USER SEES BADGE WITH GLOW EFFECT]
```

## Running the Mint Worker

### Option 1: Manual Execution
```bash
# Run all automation tasks (includes mint worker)
pnpm run automation:run

# Or run mint worker directly
pnpm tsx scripts/automation/mint-badge-queue.ts
```

### Option 2: Automated Execution (Production)
Set up a cron job or scheduled task:

```bash
# Example: Run every 5 minutes
*/5 * * * * cd /path/to/project && pnpm tsx scripts/automation/mint-badge-queue.ts >> mint-worker.log 2>&1
```

Or use Vercel Cron Jobs:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/mint-badges",
    "schedule": "*/5 * * * *"
  }]
}
```

### Environment Variables Required
```bash
# Required for minting
ORACLE_PRIVATE_KEY=0x...              # Wallet private key for minting
BADGE_CONTRACT_BASE=0x...             # Base chain contract
BADGE_CONTRACT_INK=0x...              # Ink chain contract
BADGE_CONTRACT_UNICHAIN=0x...         # Unichain contract
BADGE_CONTRACT_OPTIMISM=0x...         # Optimism contract

# Optional configuration
MINT_BATCH_SIZE=5                     # Mints per batch
MINT_INTERVAL_MS=30000                # 30 seconds between batches
MINT_MAX_RETRIES=3                    # Retry failed mints
```

## Worker Behavior

### Batch Processing
- Processes up to 5 mints per batch (configurable)
- Waits 30 seconds between batches
- Handles failed mints with retry logic (up to 3 attempts)

### Status Transitions
```
pending → minting → minted (success)
pending → minting → failed (error)
failed → minting → minted (retry success)
```

### Error Handling
- Transaction failures: Retry up to 3 times
- Network errors: Logged, retry on next run
- Contract errors: Marked as failed with error message
- User sees badge immediately, mint happens in background

## Testing Your Badges

### Check Badge Assignment
```bash
curl "https://gmeowhq.art/api/badges/list?fid=18139" | jq
```

Expected response:
```json
{
  "success": true,
  "badges": [
    {
      "id": "3",
      "fid": 18139,
      "badgeId": "signal-luminary",
      "tier": "epic",
      "minted": false,  // ← Will be true after mint worker runs
      "assignedAt": "2025-11-19T23:07:35.834+00:00"
    }
  ]
}
```

### Check Mint Queue
```bash
# Check pending mints (requires direct database access)
SELECT * FROM mint_queue WHERE fid = 18139 AND status = 'pending';
```

### Run Worker Locally
```bash
# Process all pending mints
cd /home/heycat/Desktop/2025/Gmeowbased
pnpm tsx scripts/automation/mint-badge-queue.ts

# Expected output:
[Worker] Processing mint 1 for FID 18139, badge neon_initiate
[Worker] Mint successful: 0x123..., tokenId: 42
[Worker] Processing mint 2 for FID 18139, badge pulse_runner
...
```

## Frame Badge Display

### What You See
- **Before Minting:** Badge card with "Mint Pending" label
- **After Minting:** Badge card with "Minted" label + glow effect

### Badge Card Features
- **Tier Badge:** Shows tier (Common, Rare, Epic, Legendary, Mythic)
- **Minted Status:** Green "Minted" badge if on-chain
- **Hover Tooltip:** Shows assignment date, mint date, transaction hash
- **Glow Effect:** Holographic effect for Mythic/Legendary when minted

### Example Badge States

#### Pending Badge
```
┌──────────────────┐
│    [Epic]        │
│                  │
│   🏆 Signal      │
│   Luminary       │
│                  │
│ Mint Pending     │ ← Shows this
└──────────────────┘
```

#### Minted Badge
```
┌──────────────────┐
│ [✨ Minted] [Epic]│ ← Shows minted badge
│                  │
│   🏆 Signal      │ ← Has glow effect
│   Luminary       │
│                  │
│ Nov 19, 2025     │
└──────────────────┘
```

## FAQ

### Q: Why aren't my badges minted yet?
**A:** The mint worker needs to be run manually or scheduled. Badges are assigned instantly, but blockchain minting is a separate async process.

### Q: How long until badges are minted?
**A:** Depends on when the worker runs. With a 5-minute cron job, badges are usually minted within 5 minutes of assignment.

### Q: Will I lose my badges if minting fails?
**A:** No! Badges are saved in the database. Failed mints will be retried automatically (up to 3 times).

### Q: Can I use my badge before it's minted?
**A:** Yes! The badge is yours immediately. It just doesn't have the blockchain NFT yet. You can still share it and show it on your profile.

### Q: What happens if I don't have a wallet?
**A:** Badge is still assigned, but it won't be added to the mint queue until you connect a wallet.

### Q: How do I know when minting succeeds?
**A:** Check your badge page - the "Mint Pending" label will change to "Minted" with a green badge and glow effect. You'll also see the transaction hash in the tooltip.

## Next Steps

### For Development
1. ✅ Badge assignment working (all 3 badges assigned)
2. ✅ Badge display working (frame badges page)
3. ⏳ Setup mint worker automation
4. ⏳ Test minting flow end-to-end
5. ⏳ Add webhook notifications when badges are minted

### For Production
1. Set up automated mint worker (cron job or Vercel Cron)
2. Configure blockchain wallet and contracts
3. Monitor mint queue for failed transactions
4. Set up alerts for mint failures
5. Document mint success rate

## Related Files

**Badge Assignment:**
- `app/api/badges/assign/route.ts` - Assigns badge and queues mint
- `lib/badges.ts` - Badge logic and database operations

**Minting:**
- `scripts/automation/mint-badge-queue.ts` - Worker script
- `lib/contract-mint.ts` - Blockchain minting logic
- `scripts/automation/tasks.yaml` - Automation task definitions

**Display:**
- `app/profile/[fid]/badges/page.tsx` - Badge collection page
- `components/badge/BadgeInventory.tsx` - Badge grid component

---

**Summary:** Your 3 badges are correctly assigned! "Mint Pending" is normal - they're waiting for the mint worker to process them onto the blockchain. Run `pnpm run automation:run` to mint them, or set up automated minting with a cron job.
