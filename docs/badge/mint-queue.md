# Badge Mint Queue System

**Phase 3A: Blockchain Minting Infrastructure**

Version: 2.0.0  
Last Updated: January 15, 2025

---

## Overview

The Badge Mint Queue System provides automated blockchain minting infrastructure for user badges. Badges are initially assigned off-chain in the `user_badges` table, then queued for on-chain minting via the `mint_queue` table. A background worker processes the queue and mints badges as NFTs on multiple chains.

## Architecture

### Data Flow

```
Badge Assignment:
┌─────────────────────────────────────┐
│   assignBadgeToUser(fid, badgeType) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Insert into user_badges table      │
│  (minted: false)                    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  queueBadgeMint(userBadgeId, chain) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Insert into mint_queue table       │
│  (status: pending)                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Mint Worker polls mint_queue       │
│  (every 30 seconds)                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  mintBadgeOnChain(chain, recipient) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Update mint_queue (status: minted) │
│  Update user_badges (minted: true)  │
└─────────────────────────────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Mint Utilities | `/lib/contract-mint.ts` | Blockchain interaction layer |
| Mint Worker | `/scripts/automation/mint-badge-queue.ts` | Background queue processor |
| Badge Library | `/lib/badges.ts` | Queue management functions |
| Database Migration | `/supabase/migrations/` | Mint queue schema |

---

## Database Schema

### `user_badges` Table

Stores badge assignments (off-chain).

```sql
CREATE TABLE user_badges (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  badge_id VARCHAR(100) NOT NULL,       -- Unique identifier (UUID)
  badge_type VARCHAR(100) NOT NULL,     -- Registry slug (e.g., "neon_initiate")
  tier VARCHAR(20) NOT NULL,            -- common, rare, epic, legendary, mythic
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  minted BOOLEAN DEFAULT FALSE,         -- On-chain mint status
  chain VARCHAR(20),                    -- Chain where minted (base, op, celo)
  tx_hash VARCHAR(255),                 -- Blockchain transaction hash
  token_id VARCHAR(100),                -- NFT token ID
  metadata JSONB,                       -- Badge metadata (name, image, etc.)
  UNIQUE(fid, badge_type)               -- One badge per user per type
);
```

### `mint_queue` Table

Tracks pending and completed mints.

```sql
CREATE TABLE mint_queue (
  id BIGSERIAL PRIMARY KEY,
  user_badge_id BIGINT NOT NULL REFERENCES user_badges(id) ON DELETE CASCADE,
  fid BIGINT NOT NULL,
  badge_type VARCHAR(100) NOT NULL,
  chain VARCHAR(20) NOT NULL,           -- Target chain (base, op, celo, unichain, ink)
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, minted, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  minted_at TIMESTAMPTZ,
  tx_hash VARCHAR(255),
  token_id VARCHAR(100)
);

CREATE INDEX idx_mint_queue_status ON mint_queue(status);
CREATE INDEX idx_mint_queue_user_badge ON mint_queue(user_badge_id);
```

---

## API Reference

### Badge Assignment Functions

Located in `/lib/badges.ts`:

#### `queueBadgeMint()`

Queues a badge for on-chain minting.

**Signature**:
```typescript
async function queueBadgeMint(
  userBadgeId: number,
  chain: ChainKey = 'base'
): Promise<{ success: boolean; queueId?: number }>
```

**Parameters**:
- `userBadgeId`: ID from `user_badges` table
- `chain`: Target blockchain (default: `'base'`)

**Returns**:
```typescript
{
  success: true,
  queueId: 12345  // mint_queue.id
}
```

**Example**:
```typescript
const badge = await assignBadgeToUser(67890, 'gmeow_vanguard')
const result = await queueBadgeMint(badge.id, 'base')
console.log('Queued for minting:', result.queueId)
```

#### `getPendingMints()`

Retrieves pending mint queue items.

**Signature**:
```typescript
async function getPendingMints(limit?: number): Promise<MintQueueItem[]>
```

**Returns**:
```typescript
interface MintQueueItem {
  id: number
  user_badge_id: number
  fid: number
  badge_type: string
  chain: string
  status: 'pending' | 'processing' | 'minted' | 'failed'
  retry_count: number
  max_retries: number
  error_message: string | null
  created_at: string
  updated_at: string
}
```

#### `updateMintStatus()`

Updates mint queue item status.

**Signature**:
```typescript
async function updateMintStatus(
  queueId: number,
  status: 'processing' | 'minted' | 'failed',
  txHash?: string,
  tokenId?: string,
  errorMessage?: string
): Promise<void>
```

---

## Blockchain Minting

### Contract Interaction

Located in `/lib/contract-mint.ts`:

#### `mintBadgeOnChain()`

Mints a single badge as NFT on specified chain.

**Signature**:
```typescript
async function mintBadgeOnChain(
  chain: ChainKey,
  recipientAddress: `0x${string}`,
  badgeType: string,
  metadata: BadgeMetadata
): Promise<MintResult>
```

**Parameters**:
- `chain`: Target blockchain (`'base'`, `'op'`, `'celo'`, `'unichain'`, `'ink'`)
- `recipientAddress`: Wallet address (must start with `0x`)
- `badgeType`: Badge registry slug
- `metadata`: Badge metadata (name, image, description, attributes)

**Returns**:
```typescript
interface MintResult {
  success: boolean
  txHash?: string
  tokenId?: string
  error?: string
}
```

**Example**:
```typescript
const result = await mintBadgeOnChain(
  'base',
  '0x1234567890123456789012345678901234567890',
  'gmeow_vanguard',
  {
    name: 'Gmeow Vanguard',
    image: 'https://gmeowhq.art/badges/gmeow-vanguard.png',
    description: 'Legendary tier badge',
    attributes: [
      { trait_type: 'Tier', value: 'Legendary' },
      { trait_type: 'Rarity', value: 'Mythic' }
    ]
  }
)

console.log('Minted:', result.txHash)
```

#### `batchMintBadges()`

Mints multiple badges in a single transaction.

**Signature**:
```typescript
async function batchMintBadges(
  chain: ChainKey,
  recipients: `0x${string}`[],
  badgeTypes: string[],
  metadataArray: BadgeMetadata[]
): Promise<BatchMintResult>
```

**Parameters**:
- `chain`: Target blockchain
- `recipients`: Array of wallet addresses
- `badgeTypes`: Array of badge registry slugs
- `metadataArray`: Array of badge metadata objects

**Returns**:
```typescript
interface BatchMintResult {
  success: boolean
  txHash?: string
  tokenIds?: string[]
  failedIndexes?: number[]
  error?: string
}
```

**Gas Optimization**:
- Batch size: 10 badges per transaction (configurable)
- Gas estimation: 20% safety buffer
- Gas price: Latest from RPC provider

---

## Mint Worker

### Background Processor

Located in `/scripts/automation/mint-badge-queue.ts`:

**Purpose**: Continuously polls `mint_queue` table and processes pending mints.

**Configuration**:
```typescript
const CONFIG = {
  POLL_INTERVAL: 30000,      // 30 seconds
  BATCH_SIZE: 10,            // Process 10 mints per batch
  MAX_RETRIES: 3,            // Retry failed mints 3 times
  RETRY_DELAY: 60000,        // Wait 1 minute between retries
}
```

**Worker Flow**:
1. Poll `mint_queue` for `status = 'pending'`
2. Fetch user badge data from `user_badges`
3. Resolve recipient wallet address from FID
4. Call `mintBadgeOnChain()` for each badge
5. Update `mint_queue` status:
   - Success: `status = 'minted'`, save `tx_hash` + `token_id`
   - Failure: `status = 'failed'`, increment `retry_count`, log error
6. Update `user_badges.minted = true` on success
7. Wait `POLL_INTERVAL` and repeat

**Running the Worker**:
```bash
# Development
tsx scripts/automation/mint-badge-queue.ts

# Production (with PM2)
pm2 start scripts/automation/mint-badge-queue.ts --name badge-mint-worker

# Logs
pm2 logs badge-mint-worker
```

**Environment Variables**:
```env
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Blockchain RPCs
BASE_RPC_URL=https://mainnet.base.org
OPTIMISM_RPC_URL=https://mainnet.optimism.io
CELO_RPC_URL=https://forno.celo.org

# Private key for minting (use secure vault in production)
MINTER_PRIVATE_KEY=0x...
```

**Graceful Shutdown**:
```bash
# Worker listens for SIGINT/SIGTERM
kill -SIGTERM <pid>

# Or with PM2
pm2 stop badge-mint-worker
```

---

## Multi-Chain Support

### Supported Chains

| Chain | Chain Key | RPC URL | Explorer |
|-------|-----------|---------|----------|
| Base | `base` | `https://mainnet.base.org` | `https://basescan.org` |
| Optimism | `op` | `https://mainnet.optimism.io` | `https://optimistic.etherscan.io` |
| Celo | `celo` | `https://forno.celo.org` | `https://celoscan.io` |
| Unichain | `unichain` | TBD | `https://unichain.explorer.com` |
| Ink | `ink` | TBD | `https://explorer.inkonchain.com` |

### Contract Addresses

Configured in `/lib/contract-mint.ts`:

```typescript
const BADGE_CONTRACTS: Record<ChainKey, `0x${string}`> = {
  base: '0x1234567890123456789012345678901234567890',
  op: '0x2345678901234567890123456789012345678901',
  celo: '0x3456789012345678901234567890123456789012',
  unichain: '0x4567890123456789012345678901234567890123',
  ink: '0x5678901234567890123456789012345678901234',
}
```

**Contract ABI**: Located in `/contract/GmeowMultiChain.sol`

---

## Error Handling

### Retry Logic

Failed mints are automatically retried up to 3 times:

1. **First failure**: `retry_count = 1`, wait 1 minute
2. **Second failure**: `retry_count = 2`, wait 1 minute
3. **Third failure**: `retry_count = 3`, wait 1 minute
4. **Max retries exceeded**: `status = 'failed'`, log error

**Common Errors**:
- **Insufficient gas**: Increase gas limit
- **RPC timeout**: Retry with different RPC
- **Nonce conflict**: Wait and retry
- **Wallet not found**: User hasn't connected wallet
- **Contract reverted**: Check badge eligibility

### Error Messages

Stored in `mint_queue.error_message`:

```typescript
{
  error: 'Insufficient gas',
  details: 'Estimated: 150000, Available: 100000',
  timestamp: '2025-01-15T12:00:00Z'
}
```

---

## Monitoring

### Queue Metrics

**Total pending mints**:
```sql
SELECT COUNT(*) FROM mint_queue WHERE status = 'pending';
```

**Failed mints (last 24h)**:
```sql
SELECT COUNT(*) FROM mint_queue 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours';
```

**Average mint time**:
```sql
SELECT AVG(EXTRACT(EPOCH FROM (minted_at - created_at))) 
FROM mint_queue 
WHERE status = 'minted';
```

### Alerts

Set up monitoring for:
- Pending queue size > 100
- Failed mint rate > 5%
- Worker downtime > 5 minutes
- RPC errors > 10/hour

---

## Testing

### Manual Testing

1. **Assign badge and queue mint**:
   ```typescript
   const badge = await assignBadgeToUser(12345, 'gmeow_vanguard')
   await queueBadgeMint(badge.id, 'base')
   ```

2. **Check queue**:
   ```sql
   SELECT * FROM mint_queue WHERE fid = 12345;
   ```

3. **Run worker manually**:
   ```bash
   tsx scripts/automation/mint-badge-queue.ts
   ```

4. **Verify on-chain**:
   ```bash
   curl https://basescan.org/tx/{txHash}
   ```

### Automated Testing

Run verification script:
```bash
./scripts/qa/verify-phase-3a.sh
```

---

## Security

### Private Key Management

**Development**:
```env
MINTER_PRIVATE_KEY=0x...
```

**Production** (recommended):
- Use AWS Secrets Manager
- Use Google Cloud Secret Manager
- Use HashiCorp Vault
- Use hardware wallet (Ledger/Trezor)

### Access Control

- Mint queue: Only service role can write
- Worker: Only authorized keys can mint
- Contracts: Only whitelisted minters

---

## Future Enhancements

### Phase 3A+ Features

1. **Gas Optimization**: Dynamic gas pricing
2. **Cross-Chain Minting**: Mint on multiple chains simultaneously
3. **Priority Queue**: Fast-track for premium users
4. **Batch Optimization**: Adaptive batch sizes
5. **Rollback Mechanism**: Burn NFT if assignment revoked

---

## Related Documentation

- [Badge Share Frame](./share-frame.md) - Phase 3C sharing system
- [Admin Panel](./admin-panel.md) - Phase 3B management UI
- [Badge Registry](./registry-format.md) - Metadata specification

---

**Version**: 2.0.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready
