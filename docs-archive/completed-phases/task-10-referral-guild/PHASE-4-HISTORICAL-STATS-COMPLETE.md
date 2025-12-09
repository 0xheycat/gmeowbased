# Phase 4: Historical On-Chain Stats - Complete Implementation Guide

## 📊 Overview

Phase 4 adds **historical tracking** to the on-chain stats system, enabling:
- **Daily snapshots** of portfolio value, gas spending, and token holdings
- **Time-series charts** showing portfolio changes over time
- **Percentage change** calculations (7d, 30d, 90d, 1y)
- **Trend analysis** for professional investors

**Data Source:** 100% FREE - uses only Blockscout MCP (no external APIs required)

---

## 🗄️ Database Schema

### Table: `onchain_stats_snapshots`

Stores daily snapshots of wallet statistics.

```sql
CREATE TABLE onchain_stats_snapshots (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  
  -- Portfolio metrics
  portfolio_value_usd NUMERIC(20, 2),
  token_count INTEGER,
  top_tokens JSONB,
  
  -- Gas analytics
  gas_spent_eth NUMERIC(20, 8),
  gas_spent_usd NUMERIC(20, 2),
  gas_consumed_units BIGINT,
  avg_gas_price_gwei NUMERIC(20, 2),
  
  -- NFT analytics
  nft_collection_count INTEGER,
  nft_portfolio_value_usd NUMERIC(20, 2),
  top_nft_collections JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(address, chain, snapshot_date)
);
```

**Indexes:**
- `idx_snapshots_address_chain` - Fast lookups by wallet
- `idx_snapshots_date` - Time-series queries
- `idx_snapshots_address_chain_date` - Combined queries

---

## 🔄 Automated Daily Snapshots

### pg_cron Job

Runs **every day at 00:00 UTC**:

```sql
SELECT cron.schedule(
  'daily-onchain-stats-snapshots',
  '0 0 * * *',
  $$SELECT capture_daily_snapshots()$$
);
```

### Process Flow

1. **00:00 UTC**: pg_cron triggers `capture_daily_snapshots()`
2. **Function queries** all tracked addresses from `profiles` table
3. **Creates placeholder rows** in `onchain_stats_snapshots`
4. **External cron service** (GitHub Actions, Vercel Cron, etc.) calls `/api/onchain-stats/snapshot/batch`
5. **API fetches** current stats from Blockscout MCP
6. **Updates snapshot rows** with real data

---

## 🚀 API Endpoints

### 1. Create Single Snapshot

**Endpoint:** `POST /api/onchain-stats/snapshot`

**Request:**
```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chain": "base"
}
```

**Response:**
```json
{
  "success": true,
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "chain": "base",
  "snapshot_date": "2025-12-06",
  "data": {
    "portfolioValueUSD": "95244.64",
    "tokenCount": 50,
    "gasSpentETH": "0.00957",
    "nftCollectionCount": 50
  },
  "storedAt": "2025-12-06T00:05:32.123Z"
}
```

### 2. Batch Snapshot Creation

**Endpoint:** `PUT /api/onchain-stats/snapshot`

**Request:**
```json
{
  "addresses": [
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  ],
  "chain": "base"
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "results": {
    "success": [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    ],
    "failed": []
  },
  "completedAt": "2025-12-06T00:10:15.456Z"
}
```

**Limits:** Maximum 100 addresses per batch

### 3. Get Historical Stats

**Endpoint:** `GET /api/onchain-stats/history`

**Query Parameters:**
- `address` (required): Wallet address
- `chain` (optional): Chain identifier (default: `base`)
- `period` (optional): Time period - `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`)

**Example:**
```bash
GET /api/onchain-stats/history?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&period=30d
```

**Response:**
```json
{
  "success": true,
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "chain": "base",
  "period": "30d",
  "snapshots": [
    {
      "date": "2025-11-06",
      "portfolioValueUSD": "87234.12",
      "gasSpentETH": "0.00123",
      "tokenCount": 45,
      "nftCollectionCount": 48
    },
    {
      "date": "2025-11-13",
      "portfolioValueUSD": "92156.45",
      "gasSpentETH": "0.00234",
      "tokenCount": 48,
      "nftCollectionCount": 49
    },
    {
      "date": "2025-12-06",
      "portfolioValueUSD": "95244.64",
      "gasSpentETH": "0.00957",
      "tokenCount": 50,
      "nftCollectionCount": 50
    }
  ],
  "summary": {
    "dataPoints": 3,
    "firstValue": "87234.12",
    "lastValue": "95244.64",
    "changePercent": 9.18,
    "firstDate": "2025-11-06",
    "lastDate": "2025-12-06"
  },
  "fetchedAt": "2025-12-06T12:34:56.789Z"
}
```

---

## 🛠️ Setup Instructions

### 1. Run Database Migrations

```bash
cd supabase
supabase migration up
```

This creates:
- `onchain_stats_snapshots` table
- `capture_daily_snapshots()` function
- `update_snapshot_data()` function
- `get_historical_stats()` function
- pg_cron job schedule

### 2. Verify Cron Job

```sql
-- Check job is scheduled
SELECT jobid, schedule, command, active
FROM cron.job
WHERE jobname = 'daily-onchain-stats-snapshots';

-- View job history
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-onchain-stats-snapshots')
ORDER BY start_time DESC
LIMIT 5;
```

### 3. Setup External Cron (Optional)

For production, set up an external cron to populate snapshots after pg_cron creates placeholder rows.

**GitHub Actions Example:**

```yaml
# .github/workflows/daily-snapshots.yml
name: Daily On-Chain Stats Snapshots

on:
  schedule:
    - cron: '5 0 * * *'  # 00:05 UTC (5 minutes after pg_cron)
  workflow_dispatch:  # Allow manual trigger

jobs:
  create-snapshots:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Tracked Addresses
        run: |
          ADDRESSES=$(curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/get_tracked_addresses" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json")
      
      - name: Create Snapshots
        run: |
          curl -X PUT "${{ secrets.APP_URL }}/api/onchain-stats/snapshot" \
            -H "Content-Type: application/json" \
            -d "{\"addresses\": $ADDRESSES, \"chain\": \"base\"}"
```

**Vercel Cron Example:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-snapshots",
      "schedule": "5 0 * * *"
    }
  ]
}
```

---

## 📈 Usage Examples

### Manual Snapshot Creation

```bash
# Create snapshot for Vitalik's wallet
curl -X POST https://your-app.vercel.app/api/onchain-stats/snapshot \
  -H "Content-Type: application/json" \
  -d '{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "base"}'
```

### Fetch 30-Day History

```bash
curl "https://your-app.vercel.app/api/onchain-stats/history?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&period=30d"
```

### Frontend Chart Integration

```typescript
// components/PortfolioChart.tsx
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function PortfolioChart({ address }: { address: string }) {
  const { data } = useQuery({
    queryKey: ['history', address, '30d'],
    queryFn: async () => {
      const res = await fetch(`/api/onchain-stats/history?address=${address}&period=30d`)
      return res.json()
    }
  })

  if (!data?.snapshots) return <div>Loading...</div>

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold mb-2">
        Portfolio Value (30 Days)
        <span className={data.summary.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
          {data.summary.changePercent >= 0 ? '+' : ''}{data.summary.changePercent}%
        </span>
      </h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.snapshots}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="portfolioValueUSD" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 🧪 Testing

### 1. Create Test Snapshot

```bash
# Create snapshot for test address
curl -X POST http://localhost:3000/api/onchain-stats/snapshot \
  -H "Content-Type: application/json" \
  -d '{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "base"}'
```

### 2. Verify in Database

```sql
SELECT * FROM onchain_stats_snapshots
WHERE address = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
ORDER BY snapshot_date DESC
LIMIT 5;
```

### 3. Test Historical Query

```bash
# Fetch 7-day history
curl "http://localhost:3000/api/onchain-stats/history?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&period=7d"
```

### 4. Test Batch Creation

```bash
curl -X PUT http://localhost:3000/api/onchain-stats/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    ],
    "chain": "base"
  }'
```

---

## 🎯 Performance Considerations

### Data Retention

Current setup: **Keep all snapshots indefinitely**

To add retention policy (optional):

```sql
-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM onchain_stats_snapshots
  WHERE snapshot_date < CURRENT_DATE - INTERVAL '2 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule monthly cleanup
SELECT cron.schedule(
  'monthly-snapshot-cleanup',
  '0 3 1 * *',  -- 03:00 UTC on 1st of month
  $$SELECT cleanup_old_snapshots()$$
);
```

### Snapshot Frequency

Current: **Daily snapshots**

For high-activity wallets, consider:
- **Hourly snapshots**: Change cron to `0 * * * *`
- **Weekly snapshots**: Change cron to `0 0 * * 0` (Sunday only)

---

## 🔒 Security

### RLS Policies

```sql
-- Anyone can read snapshots
CREATE POLICY "Public read access"
  ON onchain_stats_snapshots FOR SELECT
  USING (true);

-- Only service role can write
CREATE POLICY "Service role can insert/update"
  ON onchain_stats_snapshots FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### API Protection

For production, add API key protection:

```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  
  if (req.nextUrl.pathname.startsWith('/api/onchain-stats/snapshot')) {
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return new Response('Unauthorized', { status: 401 })
    }
  }
}
```

---

## 📝 Next Steps: Phase 5

With historical data in place, Phase 5 can now add:

1. **Profit/Loss Calculations**
   - Track token buys/sells from transaction history
   - Calculate: `realized_pnl = sell_value - cost_basis`
   - Calculate: `unrealized_pnl = current_value - cost_basis`

2. **DeFi Position Detection**
   - Detect aTokens (Aave), cTokens (Compound), LP tokens (Uniswap)
   - Calculate total DeFi position value
   - Track yield earnings over time

3. **Transaction Pattern Analysis**
   - Active hours heatmap
   - Transaction frequency trends
   - Contract interaction patterns
   - Whale detection (portfolio > $100k)

All Phase 5 features use **100% FREE Blockscout MCP data** (no external APIs required).

---

## 🆘 Troubleshooting

### Cron Job Not Running

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job WHERE jobname = 'daily-onchain-stats-snapshots';

-- Manual trigger (testing)
SELECT capture_daily_snapshots();
```

### Snapshots Not Populating

1. Check placeholder rows exist:
```sql
SELECT * FROM onchain_stats_snapshots
WHERE snapshot_date = CURRENT_DATE
AND portfolio_value_usd IS NULL;
```

2. Manually call snapshot API:
```bash
curl -X POST http://localhost:3000/api/onchain-stats/snapshot \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS", "chain": "base"}'
```

3. Check API logs:
```bash
# Vercel logs
vercel logs

# Local logs
pnpm dev  # Check console output
```

### Historical Queries Slow

Add missing indexes:

```sql
CREATE INDEX CONCURRENTLY idx_snapshots_composite
ON onchain_stats_snapshots(address, chain, snapshot_date DESC)
WHERE portfolio_value_usd IS NOT NULL;
```

---

## ✅ Phase 4 Complete Checklist

- [x] Database migration created
- [x] Snapshot table with indexes
- [x] SQL functions (capture, update, get_historical)
- [x] pg_cron job scheduled
- [x] POST `/api/onchain-stats/snapshot` (single)
- [x] PUT `/api/onchain-stats/snapshot` (batch)
- [x] GET `/api/onchain-stats/history` (time-series)
- [x] RLS policies configured
- [ ] External cron setup (optional - production)
- [ ] Frontend chart component (optional - UI)
- [ ] Retention policy (optional - cleanup)

**Status:** ✅ **Phase 4 Core Implementation COMPLETE**

All FREE - No external APIs required. Ready for production deployment!
