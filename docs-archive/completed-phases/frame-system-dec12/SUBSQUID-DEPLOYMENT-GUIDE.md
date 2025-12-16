# 🚀 Subsquid Indexer Deployment Guide
## gmeow-indexer - Production Deployment

**Date**: December 11, 2025  
**Status**: ✅ Code Complete - Ready for Deployment  
**Project**: gmeow-indexer  
**Location**: `/home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer`

---

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] All 5 contracts verified on BaseScan
- [x] ABIs copied to `abi/` directory (45KB + 46KB + 21KB + 14KB + 40KB)
- [x] GraphQL schema defined (13 entities)
- [x] TypeScript models generated via `sqd codegen`
- [x] Event handlers implemented (~400 lines)
- [x] TypeScript compilation successful (`npm run build`)
- [x] Base chain configured (gateway + RPC)
- [x] Deployment block set: 39,270,005 (Dec 10, 2025)

### 🔍 Pre-Flight Verification

```bash
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# 1. Verify build is clean
npm run build

# 2. Check schema is valid
cat schema.graphql

# 3. Verify ABIs are present
ls -lh abi/*.json

# 4. Check processor configuration
cat src/processor.ts | grep -A 5 "setBlockRange"

# Expected: from: 39270005
```

---

## 🌐 Deployment Options

### **Option 1: Subsquid Cloud (Recommended)**

**Pros**:
- ✅ Managed infrastructure (no DevOps)
- ✅ Auto-scaling
- ✅ Built-in monitoring
- ✅ Free tier available
- ✅ Global CDN for GraphQL endpoint

**Cons**:
- ⚠️ Requires Subsquid Cloud account
- ⚠️ May have rate limits on free tier

---

### **Option 2: Self-Hosted (VPS)**

**Pros**:
- ✅ Full control
- ✅ No external dependencies
- ✅ Can run alongside existing infrastructure

**Cons**:
- ⚠️ Requires Docker
- ⚠️ Manual monitoring setup
- ⚠️ Server maintenance

---

### **Option 3: Local Development (Testing Only)**

**Pros**:
- ✅ Fast iteration
- ✅ Easy debugging

**Cons**:
- ⚠️ Requires Docker (not available on current system)
- ⚠️ Not suitable for production

---

## 🚀 Option 1: Deploy to Subsquid Cloud

### **Step 1: Create Subsquid Cloud Account**

```bash
# Visit: https://app.subsquid.io
# Sign up with GitHub/Email
# Create organization: "gmeow" (or your preferred name)
```

### **Step 2: Authenticate CLI**

```bash
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# Login to Subsquid Cloud
sqd auth

# Follow prompts to authenticate
```

### **Step 3: Deploy Indexer**

```bash
# Deploy to cloud
sqd deploy

# Follow prompts:
# - Organization: gmeow (or your org name)
# - Squid name: gmeow-indexer
# - Production slot: yes
```

### **Step 4: Monitor Deployment**

```bash
# Check deployment status
sqd logs -f

# Expected output:
# ✅ Syncing from block 39,270,005
# ✅ Processing logs...
# ✅ GraphQL server started
```

### **Step 5: Get GraphQL Endpoint**

```bash
# List deployed squids
sqd ls

# Expected output:
# Name: gmeow-indexer
# Status: running
# Endpoint: https://sqd.gmeow.xyz/graphql (or similar)
```

### **Step 6: Test GraphQL Queries**

Visit the GraphQL playground at your endpoint and test:

```graphql
# Test 1: Get recent GM events
query {
  gmEvents(limit: 5, orderBy: timestamp_DESC) {
    id
    user { id totalXP }
    xpAwarded
    streakDay
    timestamp
    txHash
  }
}

# Test 2: Get top users
query {
  users(limit: 10, orderBy: totalXP_DESC) {
    id
    totalXP
    currentStreak
    lifetimeGMs
    lastGMTimestamp
  }
}

# Test 3: Get guilds
query {
  guilds(orderBy: totalMembers_DESC) {
    id
    owner
    totalMembers
    totalPoints
    createdAt
  }
}
```

---

## 🖥️ Option 2: Self-Hosted Deployment

### **Requirements**

- Ubuntu 20.04+ or similar Linux distribution
- Docker & Docker Compose installed
- 4GB RAM minimum (8GB recommended)
- 50GB disk space
- Public IP or domain (for GraphQL endpoint)

### **Step 1: Setup Server**

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### **Step 2: Copy Project to Server**

```bash
# From local machine
cd /home/heycat/Desktop/2025/Gmeowbased
tar -czf gmeow-indexer.tar.gz gmeow-indexer/
scp gmeow-indexer.tar.gz user@your-server-ip:/home/user/

# On server
ssh user@your-server-ip
tar -xzf gmeow-indexer.tar.gz
cd gmeow-indexer
```

### **Step 3: Configure Environment**

```bash
# Edit .env file
nano .env

# Update these values:
DB_NAME=squid
DB_PORT=5432  # Change from 23798 to 5432 for production
GQL_PORT=4350
RPC_BASE_HTTP=https://mainnet.base.org

# Optional: Add your own RPC endpoint for better performance
# RPC_BASE_HTTP=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### **Step 4: Start Database**

```bash
# Start PostgreSQL
docker compose up -d db

# Wait 10 seconds for DB to initialize
sleep 10

# Verify DB is running
docker compose ps
```

### **Step 5: Generate & Apply Migrations**

```bash
# Generate migration from schema
npm run build
npx squid-typeorm-migration generate

# Apply migration
npx squid-typeorm-migration apply

# Verify tables created
docker compose exec -it db psql -U postgres -d squid -c "\dt"
```

### **Step 6: Start Indexer**

```bash
# Start the processor (indexer)
npm run start:processor

# In a new terminal/screen, start GraphQL server
npm run start:server
```

### **Step 7: Setup as Systemd Service (Production)**

Create `/etc/systemd/system/gmeow-processor.service`:

```ini
[Unit]
Description=Gmeow Subsquid Processor
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/gmeow-indexer
ExecStart=/usr/bin/npm run start:processor
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/gmeow-graphql.service`:

```ini
[Unit]
Description=Gmeow Subsquid GraphQL Server
After=gmeow-processor.service

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/gmeow-indexer
ExecStart=/usr/bin/npm run start:server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gmeow-processor gmeow-graphql
sudo systemctl start gmeow-processor gmeow-graphql

# Check status
sudo systemctl status gmeow-processor
sudo systemctl status gmeow-graphql
```

### **Step 8: Setup Nginx Reverse Proxy (Optional)**

```nginx
# /etc/nginx/sites-available/gmeow-indexer
server {
    listen 80;
    server_name sqd.gmeow.xyz;

    location / {
        proxy_pass http://localhost:4350;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/gmeow-indexer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Verification & Testing

### **Step 1: Check Indexer Status**

```bash
# Check logs (Subsquid Cloud)
sqd logs -f

# Check logs (Self-hosted)
sudo journalctl -u gmeow-processor -f
```

**Expected Output**:
```
✅ Connected to Base mainnet
✅ Starting from block 39,270,005
✅ Syncing blocks...
✅ Processed 1000 blocks (39,270,005 → 39,271,005)
✅ Saved 15 users
✅ Saved 42 GM events
✅ Saved 3 guilds
```

### **Step 2: Test GraphQL Endpoint**

```bash
# Replace with your actual endpoint
ENDPOINT="https://sqd.gmeow.xyz/graphql"  # or http://localhost:4350/graphql

# Test query
curl -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users(limit: 1) { id totalXP } }"
  }'

# Expected response:
# {"data":{"users":[{"id":"0x...","totalXP":"1250"}]}}
```

### **Step 3: Verify Data Accuracy**

Compare indexed data with blockchain data:

```bash
# Test 1: Get user from indexer
curl -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ user(id: \"0x8870d5ec3e25e84b33619eab60a2a116ef21b382\") { totalXP currentStreak } }"
  }'

# Test 2: Compare with contract data
cast call 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 \
  "getUserXP(address)(uint256)" \
  "0x8870d5ec3e25e84b33619eab60a2a116ef21b382" \
  --rpc-url https://mainnet.base.org

# Both should return the same totalXP value
```

### **Step 4: Performance Testing**

```bash
# Test query speed
time curl -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users(limit: 100, orderBy: totalXP_DESC) { id totalXP } }"
  }'

# Target: <50ms for 100 users
# Target: <10ms for leaderboard (pre-computed)
```

---

## 📊 Monitoring & Maintenance

### **Metrics to Track**

1. **Indexer Health**
   - Current block height (should match Base chain ±10 blocks)
   - Processing rate (blocks/second)
   - Error rate (should be 0%)

2. **GraphQL Performance**
   - Query response time (p50, p95, p99)
   - Queries per second
   - Error rate

3. **Database**
   - Table sizes
   - Query performance
   - Connection pool usage

### **Subsquid Cloud Monitoring**

```bash
# View metrics
sqd stats

# View logs with errors only
sqd logs --level error
```

### **Self-Hosted Monitoring**

```bash
# Check processor health
curl http://localhost:3000/health

# Check GraphQL health
curl http://localhost:4350/graphql

# Check database size
docker compose exec -it db psql -U postgres -d squid -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### **Alerting Setup (Recommended)**

Use **Uptime Robot** or **Better Uptime** for:
- GraphQL endpoint availability (5-minute checks)
- Indexer lag detection (compare block height)
- Error rate monitoring

---

## 🔄 Updates & Redeployment

### **When to Redeploy**

- ✅ Schema changes (new entities/fields)
- ✅ Event handler logic changes
- ✅ Contract address updates
- ✅ Performance optimizations

### **How to Update**

**Subsquid Cloud**:
```bash
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# Make your changes
nano src/main.ts

# Build
npm run build

# Deploy update (zero downtime)
sqd deploy
```

**Self-Hosted**:
```bash
# Stop services
sudo systemctl stop gmeow-processor gmeow-graphql

# Pull latest code
git pull origin main  # or copy new files

# Rebuild
npm run build

# Generate new migration if schema changed
npx squid-typeorm-migration generate

# Apply migration
npx squid-typeorm-migration apply

# Restart services
sudo systemctl start gmeow-processor gmeow-graphql
```

---

## 🚨 Troubleshooting

### **Issue: Indexer Not Syncing**

**Symptoms**: Stuck at block 39,270,005, no progress

**Solution**:
```bash
# Check RPC endpoint
curl https://mainnet.base.org \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# If RPC is down, update .env with backup:
RPC_BASE_HTTP=https://base.llamarpc.com
```

### **Issue: High Memory Usage**

**Symptoms**: Processor crashes, OOM errors

**Solution**:
```bash
# Reduce batch size in src/processor.ts
# Change: .setFields({ ... })
# To: .setBlockRange({ from: 39270005, to: 40000000 })  # Process in chunks
```

### **Issue: GraphQL Queries Slow**

**Symptoms**: Queries take >500ms

**Solution**:
```bash
# Add database indexes
# Edit db/migrations/*.js
CREATE INDEX idx_user_totalxp ON "user"(total_xp DESC);
CREATE INDEX idx_gm_event_timestamp ON gm_event(timestamp DESC);
CREATE INDEX idx_guild_total_members ON guild(total_members DESC);

# Apply
npx squid-typeorm-migration apply
```

### **Issue: Missing Events**

**Symptoms**: User reports GM not tracked

**Solution**:
```bash
# Verify contract address is correct
cast code 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 --rpc-url https://mainnet.base.org

# Check if event signature matches
# In src/main.ts, verify:
const topic = coreInterface.getEvent('GMEvent')?.topicHash
console.log('GMEvent topic:', topic)
```

---

## 📞 Next Steps After Deployment

### **Immediate (Day 1)**

1. **Verify Data Accuracy**
   - [ ] Compare 10 random users: indexer vs RPC
   - [ ] Verify guild counts match contract
   - [ ] Check badge mints are accurate

2. **Performance Testing**
   - [ ] Run 100 concurrent queries
   - [ ] Measure p95 response time
   - [ ] Verify <10ms for leaderboard

3. **Update Frontend**
   - [ ] Create `lib/subsquid-client.ts` in main project
   - [ ] Update `.env` with GraphQL endpoint
   - [ ] Test queries from Next.js app

### **Week 1**

1. **Monitor & Optimize**
   - [ ] Track query patterns
   - [ ] Add missing indexes
   - [ ] Optimize slow queries

2. **Integrate with API**
   - [ ] Refactor `/api/leaderboard` to use Subsquid
   - [ ] Refactor `/api/user/[fid]` (hybrid)
   - [ ] Refactor `/api/guild/[id]` (hybrid)

3. **Supabase Migration**
   - [ ] Backup current database
   - [ ] Drop heavy tables
   - [ ] Simplify schema
   - [ ] Test hybrid queries

### **Week 2-4**

1. **Full Migration**
   - [ ] Migrate all 35 blockchain-reading routes
   - [ ] Add caching layer (Redis/Next.js cache)
   - [ ] Remove old RPC calls
   - [ ] Monitor cost savings

2. **Advanced Features**
   - [ ] Real-time WebSocket subscriptions
   - [ ] Historical analytics dashboard
   - [ ] Export API for third-party integrations

---

## 📋 Deployment Summary

| Component | Endpoint | Status |
|-----------|----------|--------|
| **Processor** | N/A (background worker) | ⏭️ Not deployed |
| **GraphQL API** | TBD (after deployment) | ⏭️ Not deployed |
| **Database** | Internal (PostgreSQL) | ⏭️ Not deployed |
| **Monitoring** | TBD | ⏭️ Not setup |

**Recommendation**: Use **Option 1: Subsquid Cloud** for fastest deployment with zero DevOps overhead.

**Time Estimate**:
- Subsquid Cloud: 15 minutes
- Self-Hosted: 1-2 hours (with monitoring)
- Local Testing: N/A (Docker not available)

---

**Document Created**: December 11, 2025  
**Last Updated**: December 11, 2025, 4:20 AM CST  
**Status**: ✅ Ready for Deployment
