# Phase 15: Quest Enhancements - Implementation Plan

**Start Date:** November 28, 2025  
**Estimated Duration:** 4-5 hours  
**Status:** 🚧 IN PROGRESS  
**Priority:** HIGH (completes quest marketplace feature set)

---

## 🎯 Objectives

1. **Complete Quest Types:** Implement remaining 8 quest type verifications (5/13 → 13/13)
2. **Image Upload:** Add quest image upload from device (no URL input)
3. **Enhanced UX:** Better visual quest cards with images

---

## 📋 Requirements

### Functional
- ✅ Implement 8 remaining quest type verifications
- ✅ Add quest image upload (device file picker)
- ✅ Store images in Supabase Storage
- ✅ Display images in quest cards
- ✅ Update wizard to support all quest types
- ✅ Maintain existing functionality (no breaking changes)

### Technical
- ✅ Reuse verification patterns from Phase 13
- ✅ Use Supabase Storage for images
- ✅ Add quest_image_url to database schema
- ✅ Update API to handle image URLs
- ✅ TypeScript types for all new fields
- ✅ Zero TypeScript errors

### UX (Tailwick + Gmeowbased)
- ✅ Image upload with preview
- ✅ Quest cards with image thumbnails
- ✅ Fallback placeholder for no image
- ✅ File validation (size, type)
- ✅ Loading state during upload

---

## 🏗️ Architecture

### Database Changes
```sql
-- Add image URL column to unified_quests
ALTER TABLE unified_quests
ADD COLUMN quest_image_url TEXT;

-- Optional: Add image metadata
ALTER TABLE unified_quests
ADD COLUMN quest_image_storage_path TEXT;
```

### Storage Structure
```
supabase-storage/
  quest-images/
    {quest_id}/
      {timestamp}-{filename}.jpg
```

### Component Structure
```
ImageUpload (new component)
├── File input (hidden)
├── Upload button/area
├── Image preview
├── Remove button
└── Validation (size, type)

QuestCard (updated)
├── Quest image (new)
├── Title, description
├── Badges, rewards
└── Complete button

QuestWizard Step 2 (updated)
├── Existing form fields
├── Image upload (new)
└── 8 new quest type forms
```

---

## 🔧 Implementation Tasks

### Task 1: Database Schema Update ✅
**File:** `supabase/migrations/20251128000001_add_quest_images.sql`
- [ ] Add quest_image_url column (TEXT, nullable)
- [ ] Add quest_image_storage_path column (TEXT, nullable)
- [ ] Create storage bucket for quest-images
- [ ] Set storage policies (public read, creator write)
- [ ] Apply migration via MCP Supabase

### Task 2: Image Upload Component ✅
**File:** `components/ui/ImageUpload.tsx`
- [ ] File input (accept: image/*)
- [ ] Upload button with icon
- [ ] Drag & drop area (optional)
- [ ] Image preview thumbnail
- [ ] Remove image button
- [ ] File validation:
  - Max size: 5MB
  - Types: jpg, png, gif, webp
  - Dimensions: recommended 800x600
- [ ] Upload to Supabase Storage
- [ ] Return storage URL
- [ ] Loading state (spinner)
- [ ] Error handling

**Supabase Storage Integration:**
```typescript
import { createClient } from '@supabase/supabase-js'

async function uploadQuestImage(file: File, questId: number) {
  const fileName = `${Date.now()}-${file.name}`
  const path = `quest-images/${questId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('quest-images')
    .upload(path, file)
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('quest-images')
    .getPublicUrl(path)
  
  return { publicUrl, path }
}
```

### Task 3: On-Chain Quest Verifications ✅
**File:** `app/api/quests/marketplace/verify-completion/route.ts`

#### 3.1 Transaction Make
```typescript
async function verifyTransactionMade(
  verificationData: { target_contract: string; chain: string },
  completerAddress: string
): Promise<VerificationResult> {
  const { target_contract, chain } = verificationData
  
  // Get RPC client for chain
  const client = getViemClient(chain)
  
  // Get recent transactions (last 100 blocks)
  const currentBlock = await client.getBlockNumber()
  const startBlock = currentBlock - 100n
  
  // Check transaction history
  const logs = await client.getLogs({
    address: target_contract as `0x${string}`,
    fromBlock: startBlock,
    toBlock: currentBlock
  })
  
  // Check if any transaction is from completer
  const hasTransaction = logs.some(log => 
    log.topics.includes(completerAddress.toLowerCase())
  )
  
  return {
    ok: true,
    verified: hasTransaction,
    reason: hasTransaction 
      ? 'Transaction found to target contract'
      : 'No recent transactions found',
    proof: { logs: logs.length, startBlock, currentBlock }
  }
}
```

#### 3.2 Multi-Chain GM
```typescript
async function verifyMultichainGm(
  verificationData: { chains: string[]; min_chains: number },
  completerFid: number
): Promise<VerificationResult> {
  const { chains, min_chains } = verificationData
  
  // For each chain, check if user has said GM
  const gmCounts = await Promise.all(
    chains.map(async (chain) => {
      const gmContract = getGmContractAddress(chain)
      const client = getViemClient(chain)
      
      // Check GM count from contract
      const count = await client.readContract({
        address: gmContract,
        abi: gmAbi,
        functionName: 'getUserGmCount',
        args: [completerFid]
      })
      
      return { chain, count: Number(count) }
    })
  )
  
  const chainsWithGm = gmCounts.filter(c => c.count > 0)
  const verified = chainsWithGm.length >= min_chains
  
  return {
    ok: true,
    verified,
    reason: verified
      ? `GM said on ${chainsWithGm.length}/${chains.length} chains`
      : `Need GM on ${min_chains} chains, found ${chainsWithGm.length}`,
    proof: { gmCounts }
  }
}
```

#### 3.3 Contract Interact
```typescript
async function verifyContractInteract(
  verificationData: { 
    contract_address: string
    function_name: string
    chain: string
  },
  completerAddress: string
): Promise<VerificationResult> {
  const { contract_address, function_name, chain } = verificationData
  
  const client = getViemClient(chain)
  const currentBlock = await client.getBlockNumber()
  
  // Get contract ABI (from verification data or fetch from etherscan)
  const abi = verificationData.abi || await fetchContractAbi(contract_address, chain)
  
  // Find function signature
  const functionSig = abi.find(f => f.name === function_name)
  if (!functionSig) {
    return {
      ok: true,
      verified: false,
      reason: `Function ${function_name} not found in contract ABI`,
      proof: {}
    }
  }
  
  // Get event logs for this function
  const logs = await client.getLogs({
    address: contract_address as `0x${string}`,
    fromBlock: currentBlock - 1000n,
    toBlock: currentBlock
  })
  
  // Check if completer interacted
  const hasInteraction = logs.some(log =>
    log.topics.some(t => t.includes(completerAddress.slice(2).toLowerCase()))
  )
  
  return {
    ok: true,
    verified: hasInteraction,
    reason: hasInteraction
      ? `Interaction with ${function_name} found`
      : `No interaction with ${function_name} found`,
    proof: { logs: logs.length }
  }
}
```

#### 3.4 Liquidity Provide
```typescript
async function verifyLiquidityProvide(
  verificationData: {
    pool_address: string
    min_liquidity: number
    chain: string
  },
  completerAddress: string
): Promise<VerificationResult> {
  const { pool_address, min_liquidity, chain } = verificationData
  
  const client = getViemClient(chain)
  
  // Read LP token balance
  const balance = await client.readContract({
    address: pool_address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [completerAddress as `0x${string}`]
  })
  
  const balanceNumber = Number(balance) / 1e18 // Convert from wei
  const verified = balanceNumber >= min_liquidity
  
  return {
    ok: true,
    verified,
    reason: verified
      ? `Liquidity provided: ${balanceNumber.toFixed(2)} (>= ${min_liquidity})`
      : `Insufficient liquidity: ${balanceNumber.toFixed(2)} (< ${min_liquidity})`,
    proof: { balance: balanceNumber, min_liquidity }
  }
}
```

### Task 4: Social Quest Verifications ✅
**File:** `app/api/quests/marketplace/verify-completion/route.ts`

#### 4.1 Reply Cast
```typescript
async function verifyReplyCast(
  verificationData: { parent_cast_hash: string },
  completerFid: number
): Promise<VerificationResult> {
  const { parent_cast_hash } = verificationData
  
  try {
    // Get cast conversation
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast/conversation?identifier=${parent_cast_hash}&type=hash&limit=100`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!
        }
      }
    )
    
    const data = await response.json()
    
    // Check if completer replied
    const hasReply = data.conversation?.direct_replies?.some(
      (reply: any) => reply.author?.fid === completerFid
    )
    
    return {
      ok: true,
      verified: hasReply || false,
      reason: hasReply ? 'Reply found' : 'No reply found',
      proof: { replies_count: data.conversation?.direct_replies?.length || 0 }
    }
  } catch (error) {
    return {
      ok: false,
      verified: false,
      reason: `Neynar error: ${error.message}`,
      proof: {}
    }
  }
}
```

#### 4.2 Join Channel
```typescript
async function verifyJoinChannel(
  verificationData: { channel_id: string },
  completerFid: number
): Promise<VerificationResult> {
  const { channel_id } = verificationData
  
  try {
    // Check channel membership
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/channel/member?fid=${completerFid}&channel_id=${channel_id}`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!
        }
      }
    )
    
    const data = await response.json()
    const isMember = data.is_member === true
    
    return {
      ok: true,
      verified: isMember,
      reason: isMember ? 'User is channel member' : 'User is not channel member',
      proof: { channel_id, is_member: isMember }
    }
  } catch (error) {
    return {
      ok: false,
      verified: false,
      reason: `Neynar error: ${error.message}`,
      proof: {}
    }
  }
}
```

#### 4.3 Cast Mention
```typescript
async function verifyCastMention(
  verificationData: { target_fid: number },
  completerFid: number
): Promise<VerificationResult> {
  const { target_fid } = verificationData
  
  try {
    // Get completer's recent casts
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/${completerFid}?limit=50`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!
        }
      }
    )
    
    const data = await response.json()
    
    // Check if any cast mentions target FID
    const hasMention = data.casts?.some((cast: any) =>
      cast.mentioned_profiles?.some((p: any) => p.fid === target_fid)
    )
    
    return {
      ok: true,
      verified: hasMention || false,
      reason: hasMention ? 'Mention found in recent casts' : 'No mention found',
      proof: { casts_checked: data.casts?.length || 0 }
    }
  } catch (error) {
    return {
      ok: false,
      verified: false,
      reason: `Neynar error: ${error.message}`,
      proof: {}
    }
  }
}
```

#### 4.4 Cast Hashtag
```typescript
async function verifyCastHashtag(
  verificationData: { hashtag: string },
  completerFid: number
): Promise<VerificationResult> {
  const { hashtag } = verificationData
  const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, '')
  
  try {
    // Get completer's recent casts
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/${completerFid}?limit=50`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!
        }
      }
    )
    
    const data = await response.json()
    
    // Check if any cast contains hashtag
    const hasHashtag = data.casts?.some((cast: any) => {
      const text = cast.text?.toLowerCase() || ''
      return text.includes(`#${normalizedHashtag}`)
    })
    
    return {
      ok: true,
      verified: hasHashtag || false,
      reason: hasHashtag ? `Hashtag #${hashtag} found` : `Hashtag #${hashtag} not found`,
      proof: { casts_checked: data.casts?.length || 0, hashtag: normalizedHashtag }
    }
  } catch (error) {
    return {
      ok: false,
      verified: false,
      reason: `Neynar error: ${error.message}`,
      proof: {}
    }
  }
}
```

### Task 5: Update Wizard with New Quest Types ✅
**File:** `components/features/QuestWizard.tsx`

#### 5.1 Update Quest Type Metadata
```typescript
const questTypes: Record<QuestCategory, Array<{...}>> = {
  onchain: [
    { type: 'token_hold', label: 'Token Hold', icon: '💰', description: 'Hold ERC20 tokens', status: 'active' },
    { type: 'nft_own', label: 'NFT Own', icon: '🖼️', description: 'Own specific NFT', status: 'active' },
    { type: 'transaction_make', label: 'Transaction', icon: '📤', description: 'Make a transaction', status: 'active' }, // ✅ NEW
    { type: 'multichain_gm', label: 'Multi-Chain GM', icon: '🌐', description: 'GM on multiple chains', status: 'active' }, // ✅ NEW
    { type: 'contract_interact', label: 'Contract Interact', icon: '⚙️', description: 'Interact with contract', status: 'active' }, // ✅ NEW
    { type: 'liquidity_provide', label: 'Liquidity', icon: '💧', description: 'Provide DEX liquidity', status: 'active' }, // ✅ NEW
  ],
  social: [
    { type: 'follow_user', label: 'Follow User', icon: '👤', description: 'Follow a Farcaster user', status: 'active' },
    { type: 'like_cast', label: 'Like Cast', icon: '❤️', description: 'Like a specific cast', status: 'active' },
    { type: 'recast_cast', label: 'Recast', icon: '🔁', description: 'Recast a specific cast', status: 'active' },
    { type: 'reply_cast', label: 'Reply', icon: '💬', description: 'Reply to a cast', status: 'active' }, // ✅ NEW
    { type: 'join_channel', label: 'Join Channel', icon: '📢', description: 'Join a channel', status: 'active' }, // ✅ NEW
    { type: 'cast_mention', label: 'Mention User', icon: '@', description: 'Mention user in cast', status: 'active' }, // ✅ NEW
    { type: 'cast_hashtag', label: 'Use Hashtag', icon: '#', description: 'Use specific hashtag', status: 'active' }, // ✅ NEW
  ]
}
```

#### 5.2 Add Form Fields for New Quest Types
```typescript
// Step 2 component - add cases for new quest types
{questType === 'transaction_make' && (
  <>
    <div className="space-y-2 mb-4">
      <label>Target Contract Address *</label>
      <input
        type="text"
        value={formData.verification_data.target_contract || ''}
        onChange={(e) => updateVerificationData('target_contract', e.target.value)}
        placeholder="0x..."
      />
    </div>
    <div className="space-y-2 mb-4">
      <label>Chain *</label>
      <select
        value={formData.verification_data.chain || ''}
        onChange={(e) => updateVerificationData('chain', e.target.value)}
      >
        <option value="">Select chain</option>
        <option value="base">Base</option>
        <option value="optimism">Optimism</option>
        <option value="celo">Celo</option>
      </select>
    </div>
  </>
)}

// Add similar blocks for:
// - multichain_gm (chains array, min_chains)
// - contract_interact (contract_address, function_name, chain)
// - liquidity_provide (pool_address, min_liquidity, chain)
// - reply_cast (parent_cast_hash)
// - join_channel (channel_id)
// - cast_mention (target_fid)
// - cast_hashtag (hashtag)
```

#### 5.3 Add Image Upload to Step 2
```typescript
import { ImageUpload } from '@/components/ui/ImageUpload'

// In Step 2, after description field:
<div className="space-y-2 mb-4">
  <label className="text-sm font-medium theme-text-secondary">
    Quest Image (Optional)
  </label>
  <ImageUpload
    value={formData.quest_image_url}
    onChange={(url) => updateFormData('quest_image_url', url)}
    onPathChange={(path) => updateFormData('quest_image_storage_path', path)}
  />
  <p className="text-xs theme-text-tertiary">
    Recommended: 800x600px, max 5MB (jpg, png, gif, webp)
  </p>
</div>
```

### Task 6: Update Quest Cards with Images ✅
**File:** `app/app/quest-marketplace/page.tsx`

```typescript
function QuestCard({ quest, onComplete }: QuestCardProps) {
  const categoryColor = quest.category === 'onchain' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'
  
  return (
    <Card className="theme-card-bg-primary hover:scale-105 transition-transform">
      {/* Quest Image */}
      {quest.quest_image_url ? (
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={quest.quest_image_url}
            alt={quest.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-t-lg flex items-center justify-center">
          <span className="text-6xl opacity-50">
            {quest.category === 'onchain' ? '⛓️' : '🦋'}
          </span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        {/* ... existing content ... */}
      </CardHeader>
      
      <CardBody className="space-y-3">
        {/* ... existing content ... */}
      </CardBody>
    </Card>
  )
}
```

### Task 7: Update API to Handle Images ✅
**File:** `app/api/quests/marketplace/create/route.ts`

```typescript
// In create route, add image fields to insert
const { data: quest, error: questError } = await supabase
  .from('unified_quests')
  .insert({
    // ... existing fields ...
    quest_image_url: body.quest_image_url || null,
    quest_image_storage_path: body.quest_image_storage_path || null,
  })
  .select()
  .single()
```

### Task 8: Testing & Polish ✅
- [ ] Test all 8 new verification functions
- [ ] Test image upload (device file picker)
- [ ] Test image preview in wizard
- [ ] Test image display in quest cards
- [ ] Test fallback placeholder (no image)
- [ ] Check TypeScript errors = 0
- [ ] Test mobile responsiveness
- [ ] Test file validation (size, type)
- [ ] Test Supabase storage integration

---

## 📊 Quest Type Implementation Status

### On-Chain (6 types)
| Type | Status | Verification | Form Fields |
|------|--------|-------------|-------------|
| token_hold | ✅ Phase 13 | viem balanceOf | token_address, min_amount, chain |
| nft_own | ✅ Phase 13 | viem balanceOf | nft_address, chain |
| transaction_make | 🆕 Phase 15 | viem getLogs | target_contract, chain |
| multichain_gm | 🆕 Phase 15 | Multi-chain RPC | chains[], min_chains |
| contract_interact | 🆕 Phase 15 | viem event logs | contract_address, function_name, chain |
| liquidity_provide | 🆕 Phase 15 | LP token balance | pool_address, min_liquidity, chain |

### Social (7 types)
| Type | Status | Verification | Form Fields |
|------|--------|-------------|-------------|
| follow_user | ✅ Phase 13 | Neynar interactions | target_fid |
| like_cast | ✅ Phase 13 | Neynar viewer context | cast_hash |
| recast_cast | ✅ Phase 13 | Neynar viewer context | cast_hash |
| reply_cast | 🆕 Phase 15 | Neynar conversation | parent_cast_hash |
| join_channel | 🆕 Phase 15 | Neynar membership | channel_id |
| cast_mention | 🆕 Phase 15 | Neynar feed search | target_fid |
| cast_hashtag | 🆕 Phase 15 | Neynar feed search | hashtag |

**Total:** 13/13 quest types (100%) ✅

---

## 📁 Files to Create/Modify

### New Files (3)
```
supabase/migrations/
  20251128000001_add_quest_images.sql  (schema update)

components/ui/
  ImageUpload.tsx  (image upload component)

lib/
  storage-utils.ts  (Supabase storage helpers)
```

### Modified Files (3)
```
app/api/quests/marketplace/
  verify-completion/route.ts  (+8 verification functions)
  create/route.ts  (+image fields)

components/features/
  QuestWizard.tsx  (+8 quest type forms, +image upload)

app/app/quest-marketplace/
  page.tsx  (+image display in QuestCard)
```

---

## 🎯 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Quest types functional | 13/13 | ⏳ 5/13 |
| Image upload working | Yes | ⏳ No |
| TypeScript errors | 0 | ⏳ TBD |
| Files created | 3 | ⏳ 0/3 |
| Files modified | 3 | ⏳ 0/3 |
| Database migration | Applied | ⏳ No |

---

## 🚀 Next Steps After Phase 15

### Phase 16: Advanced Features
- [ ] Token/NFT rewards (not just points)
- [ ] Quest chains (complete A to unlock B)
- [ ] Quest templates (save/reuse)
- [ ] Creator reputation system
- [ ] Quest analytics dashboard
- [ ] Quest leaderboards

---

**Let's complete the quest marketplace! 🎯**
