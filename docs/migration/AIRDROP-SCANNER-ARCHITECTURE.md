# Professional Airdrop Scanner Architecture

## Real-World Pattern (Claimable, AirdropBob, CheckMyAirdrop)

### Core Architecture: Event-Based Detection System

```
┌─────────────────────────────────────────────────────────────┐
│                   AIRDROP SCANNER PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Event Indexer (Blockscout/TheGraph)                    │
│     ├─ Monitor Transfer events (ERC20/ERC721/ERC1155)      │
│     ├─ Monitor Claim events (claiming protocols)            │
│     ├─ Monitor Mint events (NFT airdrops)                   │
│     └─ Monitor Custom events (protocol-specific)            │
│                                                              │
│  2. Protocol Registry (Centralized Database)                │
│     ├─ Known airdrop contracts (updated manually)           │
│     ├─ Eligibility criteria (snapshot blocks)               │
│     ├─ Claim windows (start/end timestamps)                 │
│     └─ Token metadata (name, symbol, value)                 │
│                                                              │
│  3. Eligibility Checker (Smart Contract Calls)             │
│     ├─ Call claimable(address) view functions               │
│     ├─ Check Merkle proof eligibility                       │
│     ├─ Query balance at snapshot block                      │
│     └─ Verify claim status (not already claimed)            │
│                                                              │
│  4. Value Estimator (Price Oracles)                        │
│     ├─ Fetch token price from DEX (Uniswap/1inch)          │
│     ├─ Calculate USD value of claimable amount             │
│     └─ Rank by potential value                              │
│                                                              │
│  5. Historical Analysis (Transaction Mining)                │
│     ├─ Scan past interactions with protocols                │
│     ├─ Check past NFT holdings (snapshot-based)             │
│     ├─ Analyze DeFi positions (historical balances)         │
│     └─ Match against known eligibility patterns             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Pattern

### 1. **Multi-Chain Event Monitoring**

Professional scanners use **indexed event logs** from blockchain explorers:

```typescript
// Real pattern from Claimable/AirdropBob
interface AirdropDetector {
  // Monitor ERC20 Transfer events TO user address
  async detectTransferAirdrops(address: string): Promise<Airdrop[]> {
    const transfers = await blockscout.getTokenTransfers({
      address,
      filter: 'to', // Only incoming transfers
      minValue: 0,   // Even dust amounts (often airdrops)
    })
    
    // Filter for airdrops: transfers from known airdrop contracts
    return transfers
      .filter(tx => isKnownAirdropContract(tx.from))
      .map(tx => ({
        token: tx.token,
        amount: tx.value,
        claimedAt: tx.timestamp,
        txHash: tx.hash,
      }))
  }
  
  // Monitor Claim events from known protocols
  async detectPendingClaims(address: string): Promise<Claim[]> {
    const knownProtocols = await getAirdropRegistry()
    
    const claims = await Promise.all(
      knownProtocols.map(protocol => 
        checkEligibility(protocol.contract, address)
      )
    )
    
    return claims.filter(claim => claim.eligible && !claim.claimed)
  }
}
```

---

### 2. **Airdrop Registry (Centralized Database)**

The secret sauce: **manually curated database** of known airdrops.

```sql
-- Airdrop registry table (what Claimable maintains)
CREATE TABLE airdrop_campaigns (
  id SERIAL PRIMARY KEY,
  protocol_name TEXT NOT NULL,           -- "Optimism", "Arbitrum", "Starknet"
  contract_address TEXT NOT NULL,        -- Claim contract
  chain TEXT NOT NULL,                   -- "ethereum", "base", "arbitrum"
  
  -- Timing
  announcement_date TIMESTAMPTZ,
  snapshot_block BIGINT,                 -- Block for eligibility snapshot
  claim_start_date TIMESTAMPTZ,
  claim_end_date TIMESTAMPTZ,
  
  -- Eligibility
  eligibility_type TEXT,                 -- "merkle", "snapshot", "activity"
  eligibility_criteria JSONB,            -- Criteria details
  merkle_root TEXT,                      -- For merkle-based claims
  
  -- Token
  token_address TEXT,
  token_symbol TEXT,
  total_supply NUMERIC,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  total_claimers INTEGER DEFAULT 0,
  
  -- Metadata
  website_url TEXT,
  announcement_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Known airdrop contracts index
CREATE INDEX idx_airdrop_contracts ON airdrop_campaigns(contract_address, chain);
CREATE INDEX idx_active_airdrops ON airdrop_campaigns(is_active) WHERE is_active = true;
```

**How they maintain this:**
- Manual research team monitors Twitter/Discord/governance forums
- Automated scrapers watch blockchain explorers for new claim contracts
- Community submissions + verification process
- API integrations with major protocols (Optimism, Arbitrum, etc.)

---

### 3. **Eligibility Checking System**

Two methods:

#### Method A: Direct Smart Contract Calls
```typescript
// Call view functions on claim contracts
async function checkClaimEligibility(
  contractAddress: string,
  userAddress: string,
  chain: string
): Promise<EligibilityResult> {
  const contract = getContract(contractAddress, CLAIM_ABI, chain)
  
  try {
    // Most claim contracts have this function
    const claimable = await contract.claimable(userAddress)
    
    if (claimable > 0) {
      return {
        eligible: true,
        amount: claimable,
        claimed: false,
      }
    }
  } catch (error) {
    // Try alternative function names
    const alternatives = ['getClaimableAmount', 'getUserAllocation', 'balanceOf']
    for (const fn of alternatives) {
      try {
        const amount = await contract[fn](userAddress)
        if (amount > 0) return { eligible: true, amount, claimed: false }
      } catch {}
    }
  }
  
  return { eligible: false, amount: 0 }
}
```

#### Method B: Historical Snapshot Analysis
```typescript
// Check if user met criteria at snapshot block
async function checkSnapshotEligibility(
  airdrop: AirdropCampaign,
  userAddress: string
): Promise<boolean> {
  const { snapshot_block, eligibility_criteria } = airdrop
  
  // Example: Check if user held NFT at snapshot
  if (criteria.type === 'nft_holder') {
    const nftBalance = await getNFTBalanceAtBlock(
      criteria.nft_contract,
      userAddress,
      snapshot_block
    )
    return nftBalance > 0
  }
  
  // Example: Check if user had DeFi position
  if (criteria.type === 'defi_user') {
    const txCount = await getTransactionCountAtBlock(
      criteria.protocol_contract,
      userAddress,
      snapshot_block
    )
    return txCount >= criteria.min_transactions
  }
  
  return false
}
```

---

### 4. **Value Estimation Engine**

Calculate USD value of unclaimed airdrops:

```typescript
async function estimateAirdropValue(
  tokenAddress: string,
  amount: bigint,
  chain: string
): Promise<number> {
  // 1. Try DEX price (Uniswap, SushiSwap, etc.)
  const dexPrice = await getDEXPrice(tokenAddress, chain)
  if (dexPrice > 0) {
    return Number(amount) * dexPrice
  }
  
  // 2. Fallback: Use CoinGecko/CoinMarketCap
  const marketPrice = await getCoinGeckoPrice(tokenAddress)
  if (marketPrice > 0) {
    return Number(amount) * marketPrice
  }
  
  // 3. Estimate from similar tokens
  return estimateFromComparables(tokenAddress, amount)
}
```

---

### 5. **Historical Activity Mining**

Scan past interactions to find forgotten airdrops:

```typescript
async function scanHistoricalAirdrops(
  address: string,
  startDate: Date
): Promise<HistoricalAirdrop[]> {
  const allTransfers = await blockscout.getTokenTransfers({
    address,
    fromDate: startDate,
    toDate: new Date(),
  })
  
  // Pattern 1: Transfers from 0x000...000 (mints/airdrops)
  const mints = allTransfers.filter(tx => 
    tx.from === '0x0000000000000000000000000000000000000000'
  )
  
  // Pattern 2: Transfers from known airdrop distributors
  const airdrops = allTransfers.filter(tx =>
    KNOWN_AIRDROP_ADDRESSES.includes(tx.from.toLowerCase())
  )
  
  // Pattern 3: Small random amounts (often test airdrops)
  const suspiciousAmounts = allTransfers.filter(tx =>
    tx.value < 1000 && tx.value > 0 && isRoundNumber(tx.value)
  )
  
  return [...mints, ...airdrops, ...suspiciousAmounts].map(tx => ({
    token: tx.token,
    amount: tx.value,
    receivedAt: tx.timestamp,
    source: 'historical_scan',
  }))
}
```

---

## Real Implementation for Gmeowbased

### Phase 1: Build Airdrop Registry

```typescript
// lib/airdrop-scanner/registry.ts
export interface AirdropCampaign {
  id: string
  protocol: string
  contract: string
  chain: string
  snapshotBlock?: number
  claimWindow: { start: Date; end: Date }
  eligibilityCriteria: {
    type: 'merkle' | 'snapshot' | 'activity'
    details: Record<string, any>
  }
  token: {
    address: string
    symbol: string
    decimals: number
  }
}

// Start with major known airdrops
export const KNOWN_AIRDROPS: AirdropCampaign[] = [
  {
    id: 'optimism-airdrop-4',
    protocol: 'Optimism',
    contract: '0x...', // Optimism claim contract
    chain: 'optimism',
    snapshotBlock: 121000000,
    claimWindow: {
      start: new Date('2024-09-01'),
      end: new Date('2025-03-01'),
    },
    eligibilityCriteria: {
      type: 'activity',
      details: {
        minTransactions: 5,
        minGasSpent: '0.01', // ETH
      },
    },
    token: {
      address: '0x4200000000000000000000000000000000000042',
      symbol: 'OP',
      decimals: 18,
    },
  },
  // Add more campaigns...
]
```

### Phase 2: Build Eligibility Checker

```typescript
// lib/airdrop-scanner/checker.ts
export async function checkAllEligibility(
  address: string
): Promise<EligibleAirdrop[]> {
  const results = await Promise.all(
    KNOWN_AIRDROPS
      .filter(campaign => campaign.claimWindow.end > new Date())
      .map(campaign => checkCampaignEligibility(campaign, address))
  )
  
  return results.filter(r => r.eligible)
}

async function checkCampaignEligibility(
  campaign: AirdropCampaign,
  address: string
): Promise<EligibleAirdrop> {
  // Call contract's claimable() function
  const contract = getContract(campaign.contract, CLAIM_ABI, campaign.chain)
  
  try {
    const amount = await contract.claimable(address)
    
    if (amount > 0n) {
      const value = await estimateValue(campaign.token.address, amount, campaign.chain)
      
      return {
        eligible: true,
        campaign: campaign.protocol,
        amount: formatUnits(amount, campaign.token.decimals),
        valueUSD: value,
        claimUrl: `https://app.optimism.io/airdrop`, // Protocol-specific
        expiresAt: campaign.claimWindow.end,
      }
    }
  } catch (error) {
    console.error(`Failed to check ${campaign.protocol}:`, error)
  }
  
  return { eligible: false }
}
```

### Phase 3: API Endpoint

```typescript
// app/api/airdrop-scanner/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAllEligibility } from '@/lib/airdrop-scanner/checker'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  
  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }
  
  const airdrops = await checkAllEligibility(address)
  
  const totalValue = airdrops.reduce((sum, a) => sum + a.valueUSD, 0)
  
  return NextResponse.json({
    address,
    totalClaimable: airdrops.length,
    totalValueUSD: totalValue,
    airdrops: airdrops.map(a => ({
      protocol: a.campaign,
      amount: a.amount,
      valueUSD: a.valueUSD,
      claimUrl: a.claimUrl,
      expiresIn: Math.floor((a.expiresAt.getTime() - Date.now()) / 86400000), // days
    })),
    scannedAt: new Date().toISOString(),
  })
}
```

---

## Key Differences from Basic Scanners

| Feature | Basic Scanner | Professional Scanner |
|---------|--------------|---------------------|
| **Data Source** | Single chain RPC | Multi-chain event indexers (Blockscout/TheGraph) |
| **Airdrop Discovery** | User-reported | Centralized registry + automated monitoring |
| **Eligibility Check** | Manual lookup | Automated contract calls + historical analysis |
| **Coverage** | 5-10 protocols | 100+ protocols across 20+ chains |
| **Value Estimation** | None | Real-time DEX prices + oracles |
| **Update Frequency** | Weekly | Real-time event monitoring |
| **Historical Scan** | No | Yes - scans past 2 years of activity |

---

## Cost Structure

Professional scanners monetize through:

1. **Premium Features** ($5-20/month)
   - Multi-wallet scanning
   - Real-time notifications
   - Historical deep scans (5+ years)
   - Bulk export

2. **Affiliate Links**
   - Claim link tracking (10-20% of successful claims)
   - Protocol partnerships

3. **Data API** ($500-5000/month)
   - B2B airdrop data feed
   - White-label solutions

---

## Implementation Timeline for Gmeowbased

### Week 1: Core Infrastructure
- [ ] Create airdrop registry table in Supabase
- [ ] Add 20 major active airdrop campaigns
- [ ] Build eligibility checker (contract calls)

### Week 2: Scanner API
- [ ] Build `/api/airdrop-scanner` endpoint
- [ ] Integrate with existing Blockscout MCP
- [ ] Add value estimation (DEX price lookups)

### Week 3: UI Components
- [ ] AirdropScanner component (list view)
- [ ] AirdropCard component (claim CTAs)
- [ ] Add to Dashboard as "Claimable Airdrops" section

### Week 4: Historical Mining
- [ ] Scan past token transfers for forgotten airdrops
- [ ] Build "Missed Opportunities" report
- [ ] Add email notifications for new eligibility

---

## Technical Stack (Professional Grade)

```
Frontend:
- React + Next.js 15
- Real-time updates via polling (30s intervals)
- Toast notifications for new claims

Backend:
- Blockscout MCP for event data
- Supabase for airdrop registry
- Redis for caching eligibility checks (1h TTL)

Smart Contracts:
- Multicall3 for batched eligibility checks
- Direct RPC calls for view functions
- Archive node access for historical snapshots

Data Sources:
- Blockscout: Transaction history
- TheGraph: Protocol-specific subgraphs
- CoinGecko: Token prices
- DefiLlama: TVL data for validation
```

---

## Success Metrics

Professional scanners track:

1. **Coverage**: # of active airdrop campaigns indexed
2. **Detection Rate**: % of eligible users found
3. **Value Delivered**: Total USD claimed by users
4. **False Positive Rate**: < 5% (very important!)
5. **Latency**: Time from airdrop announcement → detection

---

## Next Steps for Gmeowbased

1. **Start small**: Add 10 most popular airdrops (OP, ARB, STRK, ZK, etc.)
2. **Use existing infrastructure**: Blockscout MCP already gives you transaction data
3. **Manual curation first**: Don't try to automate discovery yet
4. **Focus on Base ecosystem**: Start with Base-native airdrops
5. **Iterate based on user demand**: Add more chains as needed

The real competitive advantage is **data quality** (accurate registry) and **low false positives** (good eligibility checks), not technology sophistication.

---

## How to Discover Popular Airdrops (Practical Guide)

### Strategy: Manual Discovery + Automated Eligibility Check

**Professional scanners DON'T auto-discover airdrops.** They use:

1. **Human Research Team** (most important)
2. **Automated Monitoring** (secondary)
3. **Community Submissions** (bonus)

### Method 1: Manual Research Sources (90% of coverage)

#### A. Twitter Monitoring
```typescript
// Watch these accounts for airdrop announcements:
const AIRDROP_ANNOUNCEMENT_ACCOUNTS = [
  '@optimismFND',      // Optimism announcements
  '@arbitrum',         // Arbitrum announcements
  '@Starknet',         // Starknet announcements
  '@BuildOnBase',      // Base ecosystem
  '@zkSync',           // zkSync announcements
  '@0xPolygon',        // Polygon announcements
  '@layer3xyz',        // Curated airdrop lists
  '@AirdropDetective', // Community aggregator
  '@DeFi_Airdrops',    // DeFi-focused
]

// Search terms to monitor:
const SEARCH_TERMS = [
  '"airdrop" + "claim"',
  '"token distribution"',
  '"governance token"',
  '"retroactive distribution"',
  '"snapshot" + "eligibility"',
]
```

**How professionals do it:**
- Hire 2-3 people to monitor Twitter/Discord 8h/day
- Use tools like TweetDeck, Nitter to track keywords
- Set up Google Alerts for "airdrop announcement"
- Join Discord servers of major protocols

#### B. Blockchain Explorer Monitoring
```typescript
// Watch for new Merkle distributor contracts
const MERKLE_DISTRIBUTOR_PATTERNS = [
  '0x...' + 'MerkleDistributor',
  '0x...' + 'TokenDistributor', 
  '0x...' + 'Airdrop',
  '0x...' + 'Claim',
]

// Scan recent verified contracts on Blockscout
async function scanNewAirdropContracts(chain: string) {
  const recentContracts = await blockscout.mcp_blockscout_direct_api_call({
    chain_id: chain,
    endpoint_path: '/api/v2/smart-contracts',
    query_params: {
      filter: 'verified',
      sort: 'verified_at',
      order: 'desc',
    },
  })
  
  // Look for contracts with airdrop-related names
  return recentContracts
    .filter(contract => 
      contract.name.toLowerCase().includes('airdrop') ||
      contract.name.toLowerCase().includes('merkle') ||
      contract.name.toLowerCase().includes('distributor')
    )
}
```

#### C. Governance Forum Monitoring
```typescript
// Watch governance proposals for token launches
const GOVERNANCE_FORUMS = [
  'https://gov.optimism.io',
  'https://forum.arbitrum.foundation',
  'https://community.starknet.io',
  'https://snapshot.org/#/',
]

// Many airdrops announced via governance first
// Example: Search for "Token Distribution" proposals
```

#### D. Aggregator APIs (Existing Data)
```typescript
// Some aggregators expose public data
const AIRDROP_DATA_SOURCES = [
  'https://earni.fi/api/airdrops',           // Earni.fi (unofficial)
  'https://dropsearn.com/api/active',         // DropsEarn (unofficial)
  'https://airdrop.io/api/latest',           // Airdrop.io (unofficial)
]

// Scrape their websites or use their data
async function fetchKnownAirdrops() {
  // Many sites expose JSON data in their frontend
  const response = await fetch('https://earni.fi')
  const html = await response.text()
  
  // Extract JSON from <script> tags
  const jsonMatch = html.match(/window\.__NEXT_DATA__ = ({.+?})<\/script>/)
  if (jsonMatch) {
    const data = JSON.parse(jsonMatch[1])
    return data.props.pageProps.airdrops
  }
}
```

### Method 2: Automated Contract Detection (10% of coverage)

```typescript
// lib/airdrop-scanner/discovery.ts

// Pattern 1: Monitor "Transfer" events from 0x0 (mint events)
async function detectNewTokenLaunches(chain: string) {
  // Look for new ERC20 tokens with large initial distributions
  const recentMints = await blockscout.mcp_blockscout_get_token_transfers_by_address({
    chain_id: chain,
    address: '0x0000000000000000000000000000000000000000', // Mint address
    age_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  })
  
  // Filter for tokens with suspicious distribution patterns
  const suspiciousTokens = recentMints.filter(transfer => 
    transfer.value > 1000000 && // Large amount
    transfer.token.holders_count > 100 // Many recipients
  )
  
  return suspiciousTokens
}

// Pattern 2: Monitor contract deployments with "Airdrop" in name
async function monitorContractDeployments(chain: string) {
  const newContracts = await blockscout.mcp_blockscout_direct_api_call({
    chain_id: chain,
    endpoint_path: '/api/v2/smart-contracts',
    query_params: {
      filter: 'verified',
      // Last 24 hours
    },
  })
  
  // Check contract names/source code for airdrop keywords
  const airdropContracts = newContracts.filter(contract => {
    const keywords = ['airdrop', 'merkle', 'distributor', 'claim', 'vesting']
    return keywords.some(kw => 
      contract.name.toLowerCase().includes(kw) ||
      contract.source_code?.toLowerCase().includes(kw)
    )
  })
  
  return airdropContracts
}

// Pattern 3: Monitor governance token deployments
async function detectGovernanceTokens(chain: string) {
  // Look for ERC20 tokens with "DAO", "GOV", or voting functions
  const tokens = await getRecentTokens(chain)
  
  return tokens.filter(token => 
    token.symbol.includes('GOV') ||
    token.name.includes('DAO') ||
    hasVotingFunctions(token.address)
  )
}
```

### Method 3: Community-Driven Discovery

```typescript
// Supabase table for community submissions
interface AirdropSubmission {
  id: string
  submitted_by: string // User FID
  protocol_name: string
  contract_address: string
  chain: string
  claim_url: string
  proof_url: string // Link to announcement
  status: 'pending' | 'verified' | 'rejected'
  verified_at?: Date
  verified_by?: string
}

// Allow users to submit new airdrops
export async function submitAirdrop(data: AirdropSubmission) {
  // Step 1: Validate contract exists
  const contract = await blockscout.mcp_blockscout_get_address_info({
    chain_id: data.chain,
    address: data.contract_address,
  })
  
  if (!contract.is_contract) {
    throw new Error('Address is not a contract')
  }
  
  // Step 2: Check if already in registry
  const existing = await supabase
    .from('airdrop_campaigns')
    .select('id')
    .eq('contract_address', data.contract_address)
    .single()
  
  if (existing) {
    throw new Error('Airdrop already registered')
  }
  
  // Step 3: Submit for manual review
  await supabase.from('airdrop_submissions').insert({
    ...data,
    status: 'pending',
    submitted_at: new Date(),
  })
  
  return { success: true, message: 'Submitted for review' }
}
```

---

## Practical Implementation: Eligibility-First Approach

**Key Insight:** You don't need to "discover" ALL airdrops. Just maintain a curated list of **active popular airdrops** and check user eligibility.

### Step 1: Build Initial Registry (Manual)

```typescript
// lib/airdrop-scanner/registry.ts
export const POPULAR_AIRDROPS: AirdropCampaign[] = [
  {
    id: 'optimism-airdrop-5',
    protocol: 'Optimism',
    contract: '0x...', // Get from official announcement
    chain: 'optimism',
    status: 'active',
    claimWindow: {
      start: new Date('2024-12-01'),
      end: new Date('2025-06-01'),
    },
    eligibilityCheck: {
      method: 'contract_call', // or 'merkle_proof' or 'snapshot'
      function: 'claimable', // Function to call
      minAmount: 0,
    },
    token: {
      address: '0x4200000000000000000000000000000000000042',
      symbol: 'OP',
      decimals: 18,
    },
    metadata: {
      announcementUrl: 'https://optimism.mirror.xyz/...',
      claimUrl: 'https://app.optimism.io/airdrop',
      estimatedValuePerUser: 500, // USD
    },
  },
  {
    id: 'base-builder-rewards',
    protocol: 'Base',
    contract: '0x...', // Base rewards contract
    chain: 'base',
    status: 'active',
    claimWindow: {
      start: new Date('2024-11-15'),
      end: new Date('2025-05-15'),
    },
    eligibilityCheck: {
      method: 'contract_call',
      function: 'getRewards',
      minAmount: 0,
    },
    token: {
      address: '0x...', // Base token
      symbol: 'BASE',
      decimals: 18,
    },
    metadata: {
      announcementUrl: 'https://base.mirror.xyz/...',
      claimUrl: 'https://base.org/rewards',
      estimatedValuePerUser: 200,
    },
  },
  // Add 10-20 more active airdrops...
]
```

### Step 2: Check User Eligibility (Automated)

```typescript
// lib/airdrop-scanner/checker.ts
export async function checkUserEligibility(
  address: string
): Promise<EligibleAirdrop[]> {
  const eligibleAirdrops: EligibleAirdrop[] = []
  
  // Only check ACTIVE airdrops
  const activeAirdrops = POPULAR_AIRDROPS.filter(
    a => a.status === 'active' && a.claimWindow.end > new Date()
  )
  
  // Check each airdrop in parallel
  const results = await Promise.allSettled(
    activeAirdrops.map(airdrop => checkSingleAirdrop(airdrop, address))
  )
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.eligible) {
      eligibleAirdrops.push(result.value)
    }
  })
  
  return eligibleAirdrops.sort((a, b) => b.valueUSD - a.valueUSD)
}

async function checkSingleAirdrop(
  airdrop: AirdropCampaign,
  address: string
): Promise<EligibleAirdrop> {
  // Method 1: Direct contract call
  if (airdrop.eligibilityCheck.method === 'contract_call') {
    const amount = await callContractFunction(
      airdrop.contract,
      airdrop.chain,
      airdrop.eligibilityCheck.function,
      [address]
    )
    
    if (amount > airdrop.eligibilityCheck.minAmount) {
      return {
        eligible: true,
        campaign: airdrop.protocol,
        amount: formatUnits(amount, airdrop.token.decimals),
        valueUSD: await estimateValue(airdrop.token.address, amount, airdrop.chain),
        claimUrl: airdrop.metadata.claimUrl,
        expiresAt: airdrop.claimWindow.end,
      }
    }
  }
  
  // Method 2: Merkle proof check
  if (airdrop.eligibilityCheck.method === 'merkle_proof') {
    const proof = await fetchMerkleProof(airdrop.id, address)
    if (proof) {
      return {
        eligible: true,
        campaign: airdrop.protocol,
        amount: proof.amount,
        valueUSD: await estimateValue(airdrop.token.address, proof.amount, airdrop.chain),
        claimUrl: airdrop.metadata.claimUrl,
        expiresAt: airdrop.claimWindow.end,
        proof: proof.data, // Merkle proof for claim
      }
    }
  }
  
  return { eligible: false }
}
```

### Step 3: Weekly Registry Updates (Manual Process)

```typescript
// scripts/update-airdrop-registry.ts

/**
 * Run this script weekly to update the airdrop registry
 * 
 * Process:
 * 1. Check Twitter for new announcements
 * 2. Verify contract addresses on Blockscout
 * 3. Test eligibility check functions
 * 4. Add to registry if valid
 * 5. Mark expired airdrops as inactive
 */

async function updateRegistry() {
  console.log('🔍 Checking for new airdrops...')
  
  // Step 1: Mark expired airdrops
  const now = new Date()
  POPULAR_AIRDROPS.forEach(airdrop => {
    if (airdrop.claimWindow.end < now && airdrop.status === 'active') {
      console.log(`⏰ Marking ${airdrop.protocol} as expired`)
      airdrop.status = 'expired'
    }
  })
  
  // Step 2: Check Twitter API for new announcements (manual for now)
  console.log('📱 Check Twitter for:')
  console.log('- @optimismFND')
  console.log('- @arbitrum')
  console.log('- @BuildOnBase')
  console.log('- Search: "airdrop claim" (last 7 days)')
  
  // Step 3: Verify new contracts
  const newContracts = await scanNewAirdropContracts('base')
  console.log(`🆕 Found ${newContracts.length} potential airdrop contracts`)
  
  newContracts.forEach(contract => {
    console.log(`\nContract: ${contract.address}`)
    console.log(`Name: ${contract.name}`)
    console.log(`✅ TODO: Verify on ${contract.chain} explorer`)
    console.log(`✅ TODO: Check if has claimable() function`)
    console.log(`✅ TODO: Add to registry if valid`)
  })
  
  // Step 4: Save updated registry
  console.log('\n✅ Registry updated. Active airdrops:', 
    POPULAR_AIRDROPS.filter(a => a.status === 'active').length
  )
}

// Run weekly via cron or GitHub Actions
if (require.main === module) {
  updateRegistry()
}
```

---

## Recommended Workflow for Gmeowbased

### Week 1: Manual Setup
1. **Research 10 popular active airdrops** (Twitter + existing scanners)
2. **Verify each contract** on Blockscout
3. **Test eligibility functions** with sample addresses
4. **Add to registry** with all metadata

### Week 2: Build Checker
1. **Create eligibility checker** that calls contract functions
2. **Build API endpoint** `/api/airdrop-scanner?address=0x...`
3. **Test with real user addresses**

### Week 3: Automation
1. **Set up weekly cron job** to check for expired airdrops
2. **Create admin dashboard** to add new airdrops easily
3. **Enable community submissions** (with manual approval)

### Week 4: Scale
1. **Add 20 more airdrops** across different chains
2. **Implement caching** (Redis, 1h TTL)
3. **Add notifications** when users become eligible

---

## Reality Check: Manual vs Automated

**What professionals do:**
- ✅ Maintain curated list of 50-200 active airdrops
- ✅ Update registry weekly (2-3 hours of manual work)
- ✅ Automated eligibility checks (API calls)
- ✅ Community submissions for discovery

**What they DON'T do:**
- ❌ Auto-discover ALL new airdrops (impossible)
- ❌ Scan every contract on every chain (too expensive)
- ❌ Rely on AI to find airdrops (not reliable)

**For Gmeowbased:**
Start with **10 active airdrops** and update **weekly**. This covers 90% of valuable airdrops and is sustainable without a dedicated research team.

Focus on **Base ecosystem first**:
- Base Builder Rewards
- Base ecosystem token launches
- Projects building on Base that might airdrop

Then expand to other chains based on user demand.
