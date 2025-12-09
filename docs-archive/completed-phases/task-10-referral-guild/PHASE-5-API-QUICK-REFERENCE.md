# Phase 5 API Quick Reference

Quick guide for using the advanced analytics APIs.

---

## 🔍 DeFi Position Detection

**Endpoint**: `POST /api/defi-positions`

**Request**:
```bash
curl -X POST http://localhost:3000/api/defi-positions \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourWalletAddress",
    "chain": "base"
  }'
```

**Supported Chains**: base, ethereum, optimism, arbitrum, polygon, gnosis, celo, scroll, zksync

**Response**:
```json
{
  "success": true,
  "address": "0x...",
  "chain": "base",
  "totalPositions": 5,
  "protocolCount": 3,
  "totalValueUSD": 12345.67,
  "protocols": ["Aave", "Uniswap V2", "Compound"],
  "positions": [
    {
      "protocol": "Aave",
      "type": "lending",
      "token": "aUSDC",
      "value": "$5000.00"
    }
  ]
}
```

**Detected Protocols**:
- Aave (aTokens, debtTokens)
- Compound (cTokens)
- Uniswap V2 (UNI-V2 LP tokens)
- Uniswap V3 (UNI-V3 positions)
- Curve (Curve LP tokens)
- SushiSwap (SLP tokens)
- Balancer (BPT tokens)

---

## 💰 PnL Calculation

**Endpoint**: `GET /api/pnl-summary`

**Request**:
```bash
curl "http://localhost:3000/api/pnl-summary?address=0xYourAddress&chain=base"

# Optional: Filter by specific token
curl "http://localhost:3000/api/pnl-summary?address=0xYourAddress&chain=base&token=0xTokenAddress"
```

**Response**:
```json
{
  "success": true,
  "address": "0x...",
  "chain": "base",
  "totalTrades": 25,
  "completedTrades": 25,
  "totalPnL": 1234.56,
  "totalProfit": 2000.00,
  "totalLoss": -765.44,
  "winRate": 68.0,
  "profitTrades": 17,
  "lossTrades": 8,
  "bestTrade": {
    "token": "WETH",
    "pnl": "$500.25",
    "percentage": "45.23%"
  },
  "worstTrade": {
    "token": "USDC",
    "pnl": "$-150.00",
    "percentage": "-12.50%"
  },
  "topTokens": [
    {
      "symbol": "WETH",
      "pnl": "$800.50",
      "trades": 10
    }
  ],
  "trades": [...]
}
```

**Features**:
- FIFO trade matching (First-In-First-Out)
- Realized gains/losses only
- Short-term vs long-term classification (<30 days)
- Per-token performance breakdown

---

## 🤖 Transaction Pattern Analysis

**Endpoint**: `GET /api/transaction-patterns`

**Request**:
```bash
curl "http://localhost:3000/api/transaction-patterns?address=0xYourAddress&chain=base"
```

**Response**:
```json
{
  "success": true,
  "address": "0x...",
  "chain": "base",
  "totalTransactions": 150,
  "whaleTier": "whale",
  "portfolioValue": "$1500000.00",
  "behaviorType": "Human",
  "botFlags": {
    "isMevBot": false,
    "isArbitrageur": false,
    "isHighFrequency": false,
    "confidence": "15%"
  },
  "activityMetrics": {
    "dailyAvg": 5.2,
    "weeklyAvg": 36.4,
    "monthlyAvg": 156,
    "avgMinutesBetweenTxs": 280.5
  },
  "activeHours": [
    {"hour": "14:00 UTC", "count": 25},
    {"hour": "15:00 UTC", "count": 20},
    {"hour": "10:00 UTC", "count": 18}
  ],
  "activeDays": [
    {"day": "Wed", "count": 30},
    {"day": "Thu", "count": 28},
    {"day": "Mon", "count": 25}
  ]
}
```

**Whale Tiers**:
- `mega_whale`: Portfolio > $10M
- `whale`: Portfolio > $1M
- `dolphin`: Portfolio > $100K
- `shrimp`: Portfolio < $100K

**Bot Detection**:
- MEV Bot: High-frequency + 90%+ contract interactions
- Arbitrageur: Medium-frequency + 80%+ contract interactions
- High-Frequency: <5 min avg between txs + 50+ total txs

---

## ⚡ Batch Analytics

**Endpoint**: `POST /api/advanced-analytics`

**Request**:
```bash
curl -X POST http://localhost:3000/api/advanced-analytics \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0xAddress1",
      "0xAddress2",
      "0xAddress3"
    ],
    "chain": "base"
  }'
```

**Limits**: Maximum 10 addresses per batch

**Response**:
```json
{
  "success": true,
  "totalAddresses": 3,
  "succeeded": 3,
  "failed": 0,
  "chain": "base",
  "results": [
    {
      "address": "0xAddress1",
      "status": "success",
      "defiPositions": {
        "totalPositions": 5,
        "totalValueUSD": 12345.67,
        "protocolCount": 3
      },
      "pnlSummary": {
        "totalTrades": 25,
        "totalPnL": 1234.56,
        "winRate": 68.0
      },
      "transactionPatterns": {
        "totalTransactions": 150,
        "whaleTier": "whale",
        "behaviorType": "Human"
      },
      "errors": []
    }
  ]
}
```

**Use Cases**:
- Portfolio comparison across multiple addresses
- Batch user analytics for dashboards
- Research analysis on wallet cohorts

---

## 🗄️ Database Tables

All analytics data is stored in Supabase:

### `defi_positions`
```sql
SELECT * FROM defi_positions 
WHERE address = '0x...' AND chain = 'base';
```

### `token_pnl`
```sql
SELECT * FROM token_pnl 
WHERE address = '0x...' AND chain = 'base'
ORDER BY realized_pnl_usd DESC;
```

### `transaction_patterns`
```sql
SELECT * FROM transaction_patterns 
WHERE address = '0x...' AND chain = 'base';
```

---

## 📊 Example Use Cases

### 1. Portfolio Dashboard
```typescript
// Fetch all analytics for a user
const response = await fetch('/api/advanced-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses: [userAddress],
    chain: 'base'
  })
})

const data = await response.json()
// Display DeFi positions, PnL, and patterns on dashboard
```

### 2. Leaderboard System
```typescript
// Analyze top holders for whale classification
const addresses = ['0xAddr1', '0xAddr2', '0xAddr3', ...]

const response = await fetch('/api/advanced-analytics', {
  method: 'POST',
  body: JSON.stringify({ addresses, chain: 'base' })
})

// Rank by whaleTier and totalPnL
```

### 3. Bot Detection
```typescript
// Check if address exhibits bot behavior
const response = await fetch(
  `/api/transaction-patterns?address=${address}&chain=base`
)

const data = await response.json()

if (data.behaviorType === 'Bot') {
  console.log('Bot detected:', data.botFlags)
  // Take action (flag, restrict, etc.)
}
```

---

## 🔐 Security Notes

1. **Rate Limiting**: APIs use Blockscout public endpoints (rate-limited)
2. **Service Role Key**: Required in `.env.local` for database writes
3. **Input Validation**: All addresses are lowercased and validated
4. **Error Handling**: Graceful fallbacks for API failures

---

## 🚀 Performance

| Endpoint | Avg Response Time | Blockscout Calls |
|----------|-------------------|------------------|
| `/api/defi-positions` | 2-3s | 1 (token balances) |
| `/api/pnl-summary` | 2-4s | 1 (token transfers) |
| `/api/transaction-patterns` | 1-2s | 2 (transactions + address) |
| `/api/advanced-analytics` | 5-10s | 4 per address |

**Optimization Tips**:
- Cache results in frontend for repeated queries
- Use batch endpoint for multiple addresses
- Store historical data in database (reduces API calls)

---

## 📝 Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🐛 Troubleshooting

### "Failed to fetch token balances"
- Check if chain is supported
- Verify Blockscout API is accessible
- Try again (public API may be rate-limited)

### "Missing Supabase credentials"
- Ensure `.env.local` has both variables
- Restart dev server after adding env vars

### "No positions/trades detected"
- This is expected if wallet doesn't hold DeFi tokens
- Try with known DeFi user address (e.g., whale wallets)

---

**Created**: December 7, 2025  
**Phase**: 5 (Advanced Analytics)  
**Status**: Production Ready ✅
