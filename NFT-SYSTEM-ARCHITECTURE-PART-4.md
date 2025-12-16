# NFT System Architecture - Part 4: Implementation Roadmap

**Document Version**: 1.1 (Updated)  
**Date**: December 16, 2025  
**Status**: In Progress - Phase 1 Complete  
**Scope**: Week-by-week tasks, template selection, quality standards  
**Prerequisites**: Read Parts 1-3, farcaster.instructions.md, TEMPLATE-SELECTION-COMPREHENSIVE.md

---

## 15. Implementation Status (December 16, 2025)

### ✅ Phase 1, Day 1: COMPLETE - Background Mint Worker
**Status**: Deployed and tested  
**Files**: See `PHASE-1-DAY-1-COMPLETE.md` for detailed report

**Completed Components**:
1. ✅ Supabase Edge Function (`supabase/functions/process-mint-queue/index.ts`) - 369 lines, deployed
2. ✅ GitHub Actions Workflow (`.github/workflows/nft-mint-worker.yml`) - runs every 5 minutes
3. ✅ API Endpoint (`app/api/cron/process-mint-queue/route.ts`) - 10-layer security implemented
4. ✅ Setup Documentation (`docs/setup/NFT_MINTER_PRIVATE_KEY_SETUP.md`) - 203 lines
5. ✅ Unit Tests (`__tests__/api/cron/mint-worker.test.ts`) - 13/13 passing
6. ✅ Test Scripts (validation and simulation scripts)

**Configuration**:
- ✅ NFT_MINTER_PRIVATE_KEY: Added to GitHub secrets (2025-12-16)
- ✅ CRON_SECRET: Configured
- ✅ Edge Function: Deployed to Supabase (project: bgnerptdanbgvcjentbt)
- ✅ TypeScript: No errors in Phase 1 files
- ✅ All tests passing

**Next**: Phase 1, Day 2-3 (Subsquid Indexer Enhancement + Ownership Tracking)

---

## 16. Implementation Overview

### 16.1 Roadmap Structure

**Total Duration**: 4 weeks (160 hours)  
**Team Size**: 1-2 developers  
**Success Criteria**: 95%+ test pass rate, 0 TypeScript errors, production-ready

**Phase Breakdown**:
- **Phase 1** (Week 1): Critical Infrastructure - 40h
- **Phase 2** (Week 2): API Layer & Security - 40h  
- **Phase 3** (Week 3): UI Components & Templates - 40h
- **Phase 4** (Week 4): Testing & Launch - 40h

### 16.2 Core Principles (From farcaster.instructions.md)

**MANDATORY Requirements**:
1. ✅ **MCP-First**: All database ops via Supabase MCP (NEVER Supabase CLI)
2. ✅ **GitHub Actions**: All cron jobs (NEVER Vercel cron)
3. ✅ **Professional Templates**: music/gmeowbased0.6/trezo (NO custom components)
4. ✅ **10-Layer Security**: Rate limiting, validation, auth, RBAC, sanitization, CSRF, privacy, audit, error masking
5. ✅ **Dialog vs Notification**: Destructive actions = Dialog, passive events = Notification
6. ✅ **Schema Verification**: MCP list_tables before ALL database work
7. ✅ **No Duplication**: Update existing docs, delete old patterns after migration
8. ✅ **Icon Usage**: 93 SVG icons from components/icons/ (NO emojis)

**Blockers to Avoid**:
- ❌ Mixing old/new component patterns
- ❌ Creating new docs instead of updating existing
- ❌ Assuming schema without MCP verification
- ❌ Using Supabase CLI/Vercel cron
- ❌ Building custom components instead of adapting templates
- ❌ Implementing learning/AI features (not in scope)

---

## 17. Phase 1: Critical Infrastructure (Week 1, 40 hours)

**Goal**: Unblock all NFT minting functionality via background worker + indexer fix + ownership tracking

### Day 1-2: Background Mint Worker (16h)

**Task 1.1: Supabase Edge Function Setup** (4h)
```bash
# Verify schema via MCP
activate_database_migration_tools()
mcp_supabase_list_tables({ schemas: ['public'] })
# Confirm: mint_queue (id, fid, wallet_address, badge_type, status, tx_hash, retry_count, error, created_at)

# Create Edge Function
supabase/functions/process-mint-queue/index.ts
```

**Implementation**:
```typescript
// supabase/functions/process-mint-queue/index.ts
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { NFT_ABI, NFT_CONTRACT_ADDRESS } from '@/lib/contracts/abis'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const provider = new ethers.JsonRpcProvider(Deno.env.get('BASE_RPC_URL'))
const wallet = new ethers.Wallet(Deno.env.get('NFT_MINTER_PRIVATE_KEY')!, provider)
const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, wallet)

Deno.serve(async (req) => {
  try {
    // Step 1: Fetch pending mints (limit 10 per run)
    const { data: pending, error: fetchError } = await supabase
      .from('mint_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)
    
    if (fetchError) throw fetchError
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    // Step 2: Process each mint
    const results = []
    for (const mint of pending) {
      try {
        // Update to minting status
        await supabase
          .from('mint_queue')
          .update({ status: 'minting' })
          .eq('id', mint.id)

        // Generate metadata URI (IPFS or API endpoint)
        const metadataURI = `https://api.gmeowhq.art/nft/metadata/${mint.badge_type}/${mint.fid}`

        // Call contract mint function
        const tx = await nftContract.mint(
          mint.wallet_address,
          mint.badge_type,
          metadataURI
        )
        await tx.wait()

        // Update to minted status
        await supabase
          .from('mint_queue')
          .update({
            status: 'minted',
            tx_hash: tx.hash,
            minted_at: new Date().toISOString()
          })
          .eq('id', mint.id)

        // Update user_badges table
        await supabase
          .from('user_badges')
          .update({
            minted: true,
            tx_hash: tx.hash,
            minted_at: new Date().toISOString()
          })
          .eq('fid', mint.fid)
          .eq('badge_type', mint.badge_type)

        results.push({ id: mint.id, status: 'success', tx_hash: tx.hash })
      } catch (error) {
        // Mark as failed (max 3 retries)
        const retryCount = mint.retry_count + 1
        const newStatus = retryCount >= 3 ? 'failed' : 'pending'

        await supabase
          .from('mint_queue')
          .update({
            status: newStatus,
            error: error.message,
            retry_count: retryCount
          })
          .eq('id', mint.id)

        results.push({ id: mint.id, status: 'error', error: error.message })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Mint worker error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

**Task 1.2: GitHub Actions Cron** (2h)
```yaml
# .github/workflows/nft-mint-worker.yml
name: NFT Mint Worker
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  process-mint-queue:
    runs-on: ubuntu-latest
    steps:
      - name: Call Mint Worker
        run: |
          curl -X POST "${{ secrets.NEXT_PUBLIC_BASE_URL }}/api/cron/process-mint-queue" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Task 1.3: Cron Endpoint** (2h)
```typescript
// app/api/cron/process-mint-queue/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call Supabase Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-mint-queue`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const result = await response.json()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**Task 1.4: Environment Variables** (1h)
```bash
# Verify GitHub secrets exist
gh secret list | grep -E "CRON_SECRET|NEXT_PUBLIC_BASE_URL|BASE_RPC_URL|NFT_MINTER_PRIVATE_KEY"

# Add missing secrets
gh secret set CRON_SECRET --body "$(openssl rand -hex 32)"
gh secret set NFT_MINTER_PRIVATE_KEY --body "0x..."  # From .env.local
```

**Task 1.5: Testing** (3h)
```typescript
// __tests__/mint-worker.test.ts
describe('Mint Worker', () => {
  it('should process pending mints', async () => {
    // Insert test mint
    const { data } = await supabase.from('mint_queue').insert({
      fid: 12345,
      wallet_address: '0xTestWallet',
      badge_type: 'legendary_quest',
      status: 'pending'
    }).select().single()

    // Trigger worker
    const response = await fetch('/api/cron/process-mint-queue', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    })

    expect(response.status).toBe(200)
    
    // Verify status updated
    const { data: updated } = await supabase
      .from('mint_queue')
      .select('status')
      .eq('id', data.id)
      .single()
    
    expect(updated.status).toBeOneOf(['minting', 'minted'])
  })
})
```

**Deliverables**:
- ✅ Supabase Edge Function deployed
- ✅ GitHub Actions workflow active
- ✅ Cron endpoint secured
- ✅ Environment variables configured
- ✅ Unit tests passing (95%+ coverage)

---

### Day 3-4: Subsquid Indexer Enhancement (16h)

**Task 2.1: Schema Update** (3h)
```graphql
# gmeow-indexer/schema.graphql
type NFTMint @entity {
  id: ID!
  tokenId: BigInt!
  to: String! @index
  nftType: String! @index       # NEW: From NFTMinted event
  metadataURI: String!          # NEW: From NFTMinted event
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}
```

**Task 2.2: Event Listener** (6h)
```typescript
// gmeow-indexer/src/main.ts (lines 327-372 UPDATE)
import { ethers } from 'ethers'

// Add NFT ABI interface
const nftInterface = new ethers.Interface([
  'event NFTMinted(address indexed recipient, uint256 indexed tokenId, string nftType, string metadataURI)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
])

// Process NFT events
for (const log of block.logs) {
  if (log.address.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()) continue

  try {
    // Try parsing as NFTMinted event
    if (log.topics[0] === nftInterface.getEvent('NFTMinted')?.topicHash) {
      const decoded = nftInterface.parseLog({
        topics: log.topics,
        data: log.data
      })

      const tokenId = decoded.args.tokenId
      const to = decoded.args.recipient.toLowerCase()
      const nftType = decoded.args.nftType
      const metadataURI = decoded.args.metadataURI

      nftMints.push(new NFTMint({
        id: `${log.transactionHash}-${log.logIndex}`,
        tokenId,
        to,
        nftType,
        metadataURI,
        timestamp: BigInt(block.header.timestamp),
        blockNumber: block.header.height,
        txHash: log.transactionHash
      }))
      continue
    }

    // Fallback: Try parsing as Transfer event (standard ERC721)
    if (log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
      const from = '0x' + log.topics[1]?.slice(26).toLowerCase()
      const to = '0x' + log.topics[2]?.slice(26).toLowerCase()
      const tokenId = BigInt(log.topics[3] || '0')

      // If from == 0x0, it's a mint (but missing nftType/metadataURI)
      if (from === '0x0000000000000000000000000000000000000000') {
        nftMints.push(new NFTMint({
          id: `${log.transactionHash}-${log.logIndex}`,
          tokenId,
          to,
          nftType: 'UNKNOWN',  // Fallback
          metadataURI: '',     // Fallback
          timestamp: BigInt(block.header.timestamp),
          blockNumber: block.header.height,
          txHash: log.transactionHash
        }))
      } else {
        // Transfer event
        nftTransfers.push(new NFTTransfer({
          id: `${log.transactionHash}-${log.logIndex}`,
          tokenId,
          from,
          to,
          timestamp: BigInt(block.header.timestamp),
          blockNumber: block.header.height,
          txHash: log.transactionHash
        }))
      }
    }
  } catch (error) {
    console.error('Failed to parse NFT event:', error)
  }
}
```

**Task 2.3: Rebuild & Deploy** (3h)
```bash
# Rebuild schema
cd gmeow-indexer
sqd codegen

# Test locally
sqd process:dev

# Deploy to cloud
sqd deploy
```

**Task 2.4: Testing** (4h)
```typescript
// gmeow-indexer/test/nft-events.test.ts
describe('NFT Event Indexing', () => {
  it('should index NFTMinted event with nftType', async () => {
    // Mint NFT via contract
    const tx = await nftContract.mint(
      '0xTestUser',
      'LEGENDARY_QUEST',
      'ipfs://QmXxx/1.json'
    )
    await tx.wait()

    // Wait for indexer to process
    await sleep(10000)

    // Query indexed data
    const mints = await db.nftMints.findMany({
      where: { to: '0xtestuser' }
    })

    expect(mints).toHaveLength(1)
    expect(mints[0].nftType).toBe('LEGENDARY_QUEST')
    expect(mints[0].metadataURI).toBe('ipfs://QmXxx/1.json')
  })
})
```

**Deliverables**:
- ✅ Schema updated with nftType + metadataURI
- ✅ NFTMinted event listener implemented
- ✅ Indexer redeployed to production
- ✅ Integration tests passing

---

### Day 5: Ownership Tracking System (8h)

**Task 3.1: Database Migration** (2h)
```typescript
// Via Supabase MCP
activate_database_migration_tools()

mcp_supabase_apply_migration({
  name: '20251216_nft_ownership_table',
  query: `
    -- Create ownership tracking table
    CREATE TABLE IF NOT EXISTS nft_ownership (
      token_id BIGINT PRIMARY KEY,
      current_owner TEXT NOT NULL,
      previous_owner TEXT,
      transferred_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_nft_ownership_current ON nft_ownership(current_owner);
    CREATE INDEX IF NOT EXISTS idx_nft_ownership_previous ON nft_ownership(previous_owner);
    CREATE INDEX IF NOT EXISTS idx_nft_ownership_updated ON nft_ownership(updated_at DESC);

    -- Add trigger for auto-update timestamp
    CREATE OR REPLACE FUNCTION update_nft_ownership_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER nft_ownership_updated
      BEFORE UPDATE ON nft_ownership
      FOR EACH ROW
      EXECUTE FUNCTION update_nft_ownership_timestamp();
  `
})
```

**Task 3.2: Sync Worker** (4h)
```typescript
// supabase/functions/sync-nft-ownership/index.ts
import { createClient } from '@supabase/supabase-js'

const supabaseIndexer = createClient(
  Deno.env.get('SUBSQUID_DB_URL')!,
  Deno.env.get('SUBSQUID_DB_KEY')!
)

const supabaseMain = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    // Step 1: Fetch all NFT transfers from Subsquid
    const { data: transfers } = await supabaseIndexer
      .from('nft_transfers')
      .select('token_id, from, to, timestamp')
      .order('timestamp', { ascending: true })

    // Step 2: Build ownership map (latest transfer wins)
    const ownershipMap = new Map()
    for (const transfer of transfers) {
      ownershipMap.set(transfer.token_id, {
        current_owner: transfer.to,
        previous_owner: ownershipMap.get(transfer.token_id)?.current_owner || transfer.from,
        transferred_at: new Date(Number(transfer.timestamp) * 1000).toISOString()
      })
    }

    // Step 3: Upsert into nft_ownership table
    const upserts = Array.from(ownershipMap.entries()).map(([tokenId, ownership]) => ({
      token_id: tokenId,
      ...ownership
    }))

    const { error } = await supabaseMain
      .from('nft_ownership')
      .upsert(upserts, { onConflict: 'token_id' })

    if (error) throw error

    return new Response(JSON.stringify({ synced: upserts.length }), { status: 200 })
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

**Task 3.3: GitHub Actions Cron** (1h)
```yaml
# .github/workflows/nft-ownership-sync.yml
name: NFT Ownership Sync
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  sync-ownership:
    runs-on: ubuntu-latest
    steps:
      - name: Call Sync Worker
        run: |
          curl -X POST "${{ secrets.NEXT_PUBLIC_BASE_URL }}/api/cron/sync-nft-ownership" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Task 3.4: Testing** (1h)
```typescript
// __tests__/ownership-sync.test.ts
describe('Ownership Sync', () => {
  it('should update ownership after marketplace transfer', async () => {
    // Simulate transfer: UserA → UserB
    await supabaseIndexer.from('nft_transfers').insert({
      token_id: 123,
      from: '0xUserA',
      to: '0xUserB',
      timestamp: Date.now() / 1000,
      block_number: 12345,
      tx_hash: '0xTestTx'
    })

    // Run sync
    await fetch('/api/cron/sync-nft-ownership', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    })

    // Verify ownership updated
    const { data } = await supabase
      .from('nft_ownership')
      .select('current_owner, previous_owner')
      .eq('token_id', 123)
      .single()

    expect(data.current_owner).toBe('0xuserb')
    expect(data.previous_owner).toBe('0xusera')
  })
})
```

**Deliverables**:
- ✅ nft_ownership table created
- ✅ Sync worker deployed
- ✅ GitHub Actions cron active
- ✅ Integration tests passing

---

## 18. Phase 2: API Layer & Security (Week 2, 40 hours)

**Goal**: Implement 6 NFT API endpoints with 10-layer security

### Day 1-2: Core API Endpoints (16h)

**Task 4.1: GET /api/nft/metadata/:nftTypeId** (3h)
```typescript
// app/api/nft/metadata/[nftTypeId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

const paramsSchema = z.object({
  nftTypeId: z.string().min(1).max(50)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { nftTypeId: string } }
) {
  try {
    // Layer 1: Rate Limiting
    const rateLimitResult = await rateLimit.check(request, 'nft_metadata', 100)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Layer 2: Request Validation
    const validatedParams = paramsSchema.parse(params)

    // Layer 5: Input Sanitization
    const nftTypeId = validatedParams.nftTypeId.toLowerCase().trim()

    // Query database
    const { data, error } = await supabase
      .from('nft_metadata')
      .select('*')
      .eq('nft_type_id', nftTypeId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'NFT type not found' }, { status: 404 })
    }

    // Layer 10: Error Masking (no sensitive data in response)
    return NextResponse.json({
      nftTypeId: data.nft_type_id,
      name: data.name,
      description: data.description,
      rarity: data.rarity,
      category: data.category,
      imageUrl: data.image_url,
      animationUrl: data.animation_url,
      maxSupply: data.max_supply,
      currentSupply: data.current_supply,
      mintPriceWei: data.mint_price_wei,
      attributes: data.attributes
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    })
  } catch (error) {
    console.error('Metadata API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Task 4.2: GET /api/nft/collection/:fid** (4h)
```typescript
// app/api/nft/collection/[fid]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const paramsSchema = z.object({
  fid: z.coerce.number().int().positive()
})

const querySchema = z.object({
  includeMetadata: z.enum(['true', 'false']).optional().default('true'),
  filterRarity: z.enum(['common', 'rare', 'epic', 'legendary', 'mythic']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    // Layer 1: Rate Limiting
    const rateLimitResult = await rateLimit.check(request, 'nft_collection', 50)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Layer 2: Request Validation
    const validatedParams = paramsSchema.parse(params)
    const { searchParams } = new URL(request.url)
    const validatedQuery = querySchema.parse({
      includeMetadata: searchParams.get('includeMetadata'),
      filterRarity: searchParams.get('filterRarity')
    })

    // Layer 3: Authentication (optional for public profiles)
    const session = await getSession(request)

    // Layer 8: Privacy Controls
    const requestingFid = session?.fid
    const isOwnProfile = requestingFid === validatedParams.fid

    // Query user's NFTs via ownership table
    let query = supabase
      .from('nft_ownership')
      .select('token_id, current_owner, transferred_at')
      .eq('current_owner', validatedParams.fid.toString())

    const { data: ownership, error: ownershipError } = await query

    if (ownershipError) throw ownershipError

    // Fetch NFT details from indexer
    const tokenIds = ownership.map(o => o.token_id)
    const { data: nftDetails, error: detailsError } = await supabase
      .from('nft_mints')
      .select('token_id, nft_type, metadata_uri, timestamp')
      .in('token_id', tokenIds)

    if (detailsError) throw detailsError

    // Join with metadata if requested
    let result = nftDetails
    if (validatedQuery.includeMetadata === 'true') {
      const nftTypes = [...new Set(nftDetails.map(n => n.nft_type))]
      const { data: metadata } = await supabase
        .from('nft_metadata')
        .select('*')
        .in('nft_type_id', nftTypes)

      const metadataMap = new Map(metadata?.map(m => [m.nft_type_id, m]) || [])
      result = nftDetails.map(nft => ({
        ...nft,
        metadata: metadataMap.get(nft.nft_type)
      }))
    }

    // Filter by rarity if specified
    if (validatedQuery.filterRarity) {
      result = result.filter(nft => nft.metadata?.rarity === validatedQuery.filterRarity)
    }

    // Layer 9: Audit Logging (if accessing other's profile)
    if (!isOwnProfile && requestingFid) {
      await supabase.from('audit_logs').insert({
        actor_fid: requestingFid,
        action: 'view_nft_collection',
        target_fid: validatedParams.fid,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      fid: validatedParams.fid,
      totalNFTs: result.length,
      nfts: result
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, s-maxage=60',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('Collection API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Task 4.3: POST /api/nft/mint** (5h) - Admin only with RBAC
**Task 4.4: GET /api/nft/mint/status/:fid** (2h)
**Task 4.5: GET /api/nft/token/:tokenId** (2h)

**Deliverables**:
- ✅ 5/6 endpoints implemented
- ✅ 10-layer security on all endpoints
- ✅ Rate limiting configured
- ✅ Unit tests passing

---

### Day 3-4: Security & Testing (16h)

**Task 5.1: Rate Limiting Setup** (3h)
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export const rateLimit = {
  async check(request: NextRequest, key: string, limit: number) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      analytics: true
    })

    return await limiter.limit(`${key}:${ip}`)
  }
}
```

**Task 5.2: Input Validation** (2h) - Zod schemas for all endpoints
**Task 5.3: CSRF Protection** (2h) - SameSite cookies + Origin validation
**Task 5.4: Audit Logging** (2h) - All sensitive actions logged
**Task 5.5: API Tests** (7h) - Unit + integration tests for all endpoints

**Deliverables**:
- ✅ Rate limiting active
- ✅ CSRF protection enabled
- ✅ Audit logs verified
- ✅ 95%+ test coverage

---

## 19. Phase 3: UI Components & Templates (Week 3, 40 hours)

**Goal**: Build NFT UI with professional templates (music/gmeowbased0.6/jumbo)

### Template Selection Matrix (From TEMPLATE-SELECTION-COMPREHENSIVE.md)

| Component | Template | Files | Adaptation | Reason |
|-----------|----------|-------|------------|--------|
| NFT Card | gmeowbased0.6/nft-card | 1 | 5% | Perfect hover, gradient borders, badges |
| Collection Grid | music/datatable + jumbo featured | 3 | 40% | Professional layout, filters, empty states |
| Mint Dialog | music/dialog | 8 | 25% | 9 sizes, accessibility, animations |
| Loading States | music/skeleton | 1 | 20% | 4 variants, wave animation, GPU-optimized |
| Tabs (Filters) | music/tabs | 6 | 30% | Lazy loading, size variants, TabLine animation |
| Empty State | music/datatable/empty-state | 1 | 15% | Icon, message, CTA button |

### Day 1-2: NFT Collection Display (16h)

**Task 6.1: NFT Card Component** (4h)
```typescript
// components/nft/NFTCard.tsx
// Adapted from: gmeowbased0.6/nft-card.tsx (5% adaptation)
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

interface NFTCardProps {
  tokenId: number
  name: string
  imageUrl: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  nftType: string
  onClick?: () => void
}

const rarityColors = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-orange-500',
  mythic: 'bg-pink-500'
}

export function NFTCard({ tokenId, name, imageUrl, rarity, nftType, onClick }: NFTCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group"
      onClick={onClick}
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Rarity badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`${rarityColors[rarity]} text-white`}>
            {rarity.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{nftType}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Token ID: {tokenId}</p>
      </div>
    </motion.div>
  )
}
```

**Task 6.2: Collection Grid** (6h)
```typescript
// components/nft/NFTCollectionGrid.tsx
// Adapted from: music/datatable + jumbo-7.4/featured (40% adaptation)
import { useState } from 'react'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { NFTCard } from './NFTCard'

interface NFT {
  tokenId: number
  name: string
  imageUrl: string
  rarity: string
  nftType: string
}

interface NFTCollectionGridProps {
  fid: number
  initialNFTs?: NFT[]
}

export function NFTCollectionGrid({ fid, initialNFTs = [] }: NFTCollectionGridProps) {
  const [nfts, setNfts] = useState<NFT[]>(initialNFTs)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const rarities = ['all', 'mythic', 'legendary', 'epic', 'rare', 'common']
  const filteredNFTs = activeTab === 'all' 
    ? nfts 
    : nfts.filter(nft => nft.rarity === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">NFT Collection</h2>
        <p className="text-sm text-gray-600">{nfts.length} NFTs</p>
      </div>

      {/* Rarity Filter Tabs */}
      <Tabs selectedTab={activeTab} onChange={setActiveTab}>
        <TabList>
          {rarities.map(rarity => (
            <Tab key={rarity} value={rarity}>
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          {rarities.map(rarity => (
            <TabPanel key={rarity} value={rarity}>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} variant="rect" className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : filteredNFTs.length === 0 ? (
                <EmptyState
                  icon="nft"
                  message="No NFTs in this category"
                  action={{ label: 'Complete Quests', href: '/quests' }}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredNFTs.map(nft => (
                    <NFTCard key={nft.tokenId} {...nft} />
                  ))}
                </div>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  )
}
```

**Task 6.3: Profile Integration** (4h)
**Task 6.4: Testing** (2h)

**Deliverables**:
- ✅ NFT Card component (gmeowbased0.6 template)
- ✅ Collection Grid (music + jumbo templates)
- ✅ Profile page integration
- ✅ Component tests passing

---

### Day 3-4: Leaderboard & Frame Display (16h)

**Task 7.1: Leaderboard NFT Points** (6h)
**Task 7.2: Frame Image Generation** (6h)
**Task 7.3: Frame Handler** (4h)

**Deliverables**:
- ✅ Leaderboard NFT column active
- ✅ Frame display working
- ✅ E2E tests passing

---

## 20. Phase 4: Testing & Launch (Week 4, 40 hours)

### Day 1-3: Comprehensive Testing (24h)

**Task 8.1: Unit Tests** (8h) - All functions/components
**Task 8.2: Integration Tests** (8h) - Full data flows
**Task 8.3: E2E Tests** (8h) - Complete user journeys

### Day 4-5: Production Launch (16h)

**Task 9.1: Documentation** (4h)
**Task 9.2: Deployment** (4h)
**Task 9.3: Monitoring** (4h)
**Task 9.4: Bug Fixes** (4h)

**Deliverables**:
- ✅ 95%+ test coverage
- ✅ Production deployment
- ✅ Monitoring dashboards
- ✅ Documentation complete

---

## 21. Success Metrics

**Code Quality**:
- ✅ 0 TypeScript errors
- ✅ 95%+ test pass rate
- ✅ 100% professional templates (no custom components)
- ✅ All endpoints have 10-layer security
- ✅ All database ops via Supabase MCP
- ✅ All cron jobs via GitHub Actions

**User Experience**:
- ✅ < 2s page load time
- ✅ Smooth animations (200-300ms)
- ✅ WCAG 2.1 AAA compliance
- ✅ Mobile responsive

**Production Readiness**:
- ✅ Background worker processing mints
- ✅ Ownership tracking synced
- ✅ API endpoints secured
- ✅ Monitoring active
- ✅ Documentation complete

---

**END OF PART 4**

**Next Steps**: Begin Phase 1, Day 1 - Background Mint Worker implementation