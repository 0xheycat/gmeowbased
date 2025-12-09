# Transaction Data Bug - Optimism & Other Chains

## Issue Summary
OnchainStatsV2 showing `totalTxs: 0` and `accountAgeDays: null` for Optimism (and likely other chains) despite accounts having transaction history.

## Root Cause
**Blockscout's Etherscan-compatible API endpoints are not working for all chains.**

### Evidence
```bash
# Optimism Etherscan-style endpoint returns 301 redirect
curl "https://optimism.blockscout.com/api?module=account&action=txlist&address=0x33DD..."
# Returns: 301 Moved Permanently (nginx)
```

### Actual Data (via Blockscout MCP)
For address `0x33DD1a7389c5040B84E93031A7248AD69d387aEc` on Optimism:
- **Real transactions**: 4 txs (2 from, 2 to)
- **Real account age**: ~475 days (Oct 14, 2024 to Dec 7, 2025)
- **First tx**: Oct 14, 2024 (block 126,661,108)
- **Last tx**: Nov 9, 2024 (block 127,770,639)

### Current API Response (Broken)
```json
{
  "totalTxs": 0,           // ❌ Should be 4
  "accountAgeDays": null,  // ❌ Should be 475
  "firstTx": null,         // ❌ Should have data
  "lastTx": null,          // ❌ Should have data
  "uniqueDays": 0,         // ❌ Should be 2
  
  // ✅ Portfolio data WORKS (uses different API)
  "portfolioValueUSD": "0.05",
  "erc20TokenCount": 2,
  "topTokens": [...]
}
```

## Temporary Fix Applied
**File**: `lib/onchain-stats/blockscout-client.ts`

```typescript
async getTransactions() {
  // CRITICAL FIX: Etherscan-compatible API endpoints don't work for some chains
  console.warn(`[BlockscoutClient] getTransactions - Etherscan API may not work, returning empty array`)
  return []
}

async getTokenTransfers() {
  // Same fix applied
  return []
}
```

**Impact**:
- ✅ Portfolio data still works (tokens, balance, USD value)
- ❌ Transaction history disabled (prevents errors but loses functionality)
- ❌ Account age calculation broken
- ❌ Activity metrics (uniqueDays, contracts, etc) all zero

## Proper Solution
**Migrate to Blockscout MCP tools** instead of legacy Etherscan-compatible endpoints.

### Implementation Plan

**Step 1: Add Blockscout MCP transaction fetcher**
```typescript
// In blockscout-client.ts
import { mcp_blockscout_get_transactions_by_address } from '@/path/to/mcp'

async getTransactionsMCP(address: Address): Promise<Transaction[]> {
  const chainId = this.config.chainId
  const result = await mcp_blockscout_get_transactions_by_address({
    chain_id: chainId.toString(),
    address: address,
  })
  
  // Transform MCP format to our Transaction type
  return result.data.map(tx => ({
    hash: tx.hash,
    blockNumber: tx.block_number.toString(),
    timeStamp: new Date(tx.timestamp).getTime() / 1000,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    // ... other fields
  }))
}
```

**Step 2: Update getRichStats to use MCP**
```typescript
async getRichStats(address: Address) {
  const [normalTxs, tokenTxs, ...rest] = await Promise.all([
    this.getTransactionsMCP(address),  // ← Use MCP instead
    this.getTokenTransfersMCP(address), // ← Use MCP instead
    // ... other calls
  ])
}
```

**Step 3: Handle pagination**
Blockscout MCP returns paginated results. Need to fetch all pages:
```typescript
let allTxs = []
let cursor = null

do {
  const result = await mcp_blockscout_get_transactions_by_address({
    chain_id: chainId.toString(),
    address: address,
    cursor: cursor,
  })
  
  allTxs.push(...result.data)
  cursor = result.pagination?.next_call?.cursor || null
} while (cursor)
```

## Affected Chains
Based on testing, likely affected:
- ✅ **Optimism** (confirmed broken via curl test)
- ❓ **Arbitrum** (needs testing)
- ❓ **Polygon** (needs testing)
- ❓ **Gnosis** (needs testing)
- ❓ **Celo** (needs testing)
- ❓ **Scroll** (needs testing)
- ❓ **Base** (may work, needs confirmation)
- ❓ **Ethereum** (may work, needs confirmation)

## Testing Checklist
- [ ] Test each chain's Etherscan API endpoint manually
- [ ] Implement MCP transaction fetcher
- [ ] Add pagination handling
- [ ] Test with real addresses on all chains
- [ ] Verify account age calculations
- [ ] Verify activity metrics (uniqueDays, etc)
- [ ] Update API response time (MCP may be slower)

## References
- **Blockscout MCP Docs**: Tool `get_transactions_by_address` with pagination support
- **Current broken endpoint**: `https://optimism.blockscout.com/api?module=account&action=txlist`
- **Working alternative**: Blockscout MCP server (already available)

## Timeline
- **Short-term**: Current workaround prevents errors, but loses tx functionality
- **Long-term**: Migrate all transaction fetching to Blockscout MCP (1-2 hours work)

## Status
🟡 **Workaround Active** - Portfolio data works, transaction history disabled
🔴 **Full Fix Needed** - Migrate to Blockscout MCP for complete functionality
