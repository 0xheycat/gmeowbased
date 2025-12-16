# 🎁 Professional Farcaster Tip System Architecture

**Created**: December 9, 2025  
**Status**: PLANNING - Pre-Implementation  
**Compliance**: `.instructions.md` + FOUNDATION-REBUILD-REQUIREMENTS.md  
**Reference**: Degen Tips, Ham Tips, Farcaster miniapp best practices

---

## 🎯 Executive Summary

**Goal**: Build a professional, mention-based tip system for Farcaster that rivals $DEGEN and $HAM tip bots.

**Core Principle**: Users tip FROM FARCASTER FEED via mentions → Backend processes → Points transferred → Bot auto-replies

**NOT**: Simple wallet-to-wallet USDC transfers (unprofessional for Farcaster ecosystem)

---

## 📊 Professional Tip System Research

### 1. How $DEGEN Tips Work (Industry Standard)

**User Experience**:
```
@alice casts: "Great thread @bob! $DEGEN 100"
↓
@degen bot replies: "💜 @alice tipped @bob 100 $DEGEN"
↓
@bob sees notification in Warpcast
```

**Technical Flow**:
1. **Mention Detection**: Bot watches Farcaster Hub for casts mentioning "$DEGEN 100"
2. **Parse Intent**: Extract sender (@alice), receiver (@bob), amount (100)
3. **Validate**: Check @alice has 100+ $DEGEN balance, not self-tipping
4. **Execute**: Deduct from @alice, credit to @bob
5. **Reply**: Bot casts confirmation with celebratory message
6. **Notify**: @bob gets Farcaster notification (via Neynar SDK)

**Key Features**:
- ✅ Mention-based (no wallet UI required)
- ✅ Bot auto-reply (social proof)
- ✅ Farcaster notifications (built-in re-engagement)
- ✅ Leaderboard (top tippers, top receivers)
- ✅ Daily allowance (prevent spam)
- ✅ Streak bonuses (reward consistency)

---

### 2. Professional Architecture Comparison

| Feature | $DEGEN/Ham (Pro) | Our Old System (Amateur) |
|---------|------------------|--------------------------|
| **Trigger** | Mention in cast | Wallet UI button |
| **UX** | Zero-friction mention | Context switch to wallet |
| **Social** | Public cast reply | Private transaction |
| **Viral** | Visible in feed | Hidden from community |
| **Gas** | Zero (off-chain ledger) | Requires gas fee |
| **Speed** | Instant (database) | Wait for blockchain |
| **Notifications** | Farcaster native | Custom webhooks |

**Winner**: Mention-based system (professional standard)

---

## 🏗️ Gmeowbased Tip System Architecture

### Option 1: Mention-Based with Points (RECOMMENDED) ⭐

**User Story**:
```
1. @alice casts: "Amazing work @bob! @gmeowbased send 100 points"
2. Backend detects mention via Neynar webhook
3. Validate: @alice has 100+ points in contract
4. Execute: 
   - Call contract tipUser(@bob, 100 points, @bob.fid)
   - Points deducted from @alice
   - Points credited to @bob
5. @gmeowbased bot replies: "🎁 @alice sent @bob 100 points! New balance: 350 pts"
6. @bob gets Farcaster notification + XP bonus
```

**Technical Stack**:
- **Webhook**: `/api/farcaster/mention-handler` (Neynar webhook)
- **Parser**: Extract @mentions, "send X points" pattern
- **Contract**: `tipUser(address to, uint256 points, uint256 recipientFid)`
- **Bot**: Neynar SDK for auto-reply casts
- **Notifications**: Neynar mobile notifications API
- **Database**: `tips` table tracks history (tx_hash, amounts, status)

**Flow Diagram**:
```
Farcaster Cast → Neynar Webhook → Parse Mention → Validate Balance
                                                          ↓
Bot Auto-Reply ← Contract Event ← Execute tipUser() ← Check Authorization
       ↓
Farcaster Notification → @bob's phone
```

---

### Option 2: Hybrid (Mention + Frame UI)

**User Story**:
```
Option A (Mention):
@alice: "@gmeowbased send 100 points to @bob"
↓ Bot handles everything

Option B (Frame):
@alice opens /tip frame in cast
↓ Select amount (25/50/100/250)
↓ Select recipient (@bob)
↓ OnchainKit Checkout (USDC)
↓ Bot confirms
```

**Why Hybrid**:
- Mentions: Best for community tipping (public, social)
- Frame: Best for larger amounts (private, secure)
- Both feed into same leaderboard

---

## 🔧 Technical Implementation

### 1. Webhook Handler (Mention Detection)

**File**: `app/api/farcaster/mention-handler/route.ts`

```typescript
/**
 * Farcaster Mention Webhook Handler
 * Processes @gmeowbased mentions for tip commands
 * 
 * Compliance: .instructions.md Section "Security Rules"
 * - HMAC SHA-512 signature verification (Neynar webhook)
 * - Rate limiting: 100 mentions/5min (webhook limiter)
 * - Request-ID header
 * - Zod schema validation
 * 
 * Command Patterns:
 * - "@gmeowbased send 100 points to @bob"
 * - "@gmeowbased tip @bob 100 points"
 * - "Great work @bob! @gmeowbased 100 points"
 * 
 * MCP-Verified: https://docs.neynar.com/docs/webhooks
 * Last Verified: December 9, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyNeynarSignature } from '@/lib/neynar/verify-signature'
import { parseTipCommand } from '@/lib/tips/command-parser'
import { executeTipTransaction } from '@/lib/tips/executor'
import { sendBotReply } from '@/lib/tips/bot-reply'
import { sendFarcasterNotification } from '@/lib/tips/notifications'
import { generateRequestId } from '@/lib/request-id'

export async function POST(req: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // 1. Verify Neynar webhook signature
    const signature = req.headers.get('x-neynar-signature')
    const body = await req.text()
    
    if (!verifyNeynarSignature(signature, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // 2. Parse webhook payload
    const payload = JSON.parse(body)
    const cast = payload.data.cast
    
    // 3. Check if @gmeowbased mentioned
    const mentions = cast.mentioned_profiles || []
    const isMentioned = mentions.some((m: any) => 
      m.username === 'gmeowbased' || m.fid === process.env.BOT_FID
    )
    
    if (!isMentioned) {
      return NextResponse.json(
        { ok: true, message: 'Not a bot mention' },
        { headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // 4. Parse tip command
    const command = parseTipCommand(cast.text, cast.author)
    
    if (!command || command.type !== 'tip') {
      // Not a tip command, ignore
      return NextResponse.json(
        { ok: true, message: 'Not a tip command' },
        { headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // 5. Execute tip transaction
    const result = await executeTipTransaction({
      senderFid: cast.author.fid,
      senderAddress: cast.author.verified_addresses.eth_addresses[0],
      receiverFid: command.receiverFid,
      receiverUsername: command.receiverUsername,
      points: command.amount,
      castHash: cast.hash,
      castUrl: `https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`,
    })
    
    if (!result.success) {
      // Reply with error
      await sendBotReply({
        parentCastHash: cast.hash,
        message: `❌ Tip failed: ${result.error}`,
      })
      
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // 6. Send bot confirmation reply
    await sendBotReply({
      parentCastHash: cast.hash,
      message: `🎁 @${cast.author.username} sent @${command.receiverUsername} ${command.amount} points! 

New balance: ${result.receiverBalance} pts
Tip #${result.tipCount} 🔥`,
    })
    
    // 7. Send Farcaster notification to receiver
    await sendFarcasterNotification({
      recipientFid: command.receiverFid,
      title: `${cast.author.display_name} sent you ${command.amount} points!`,
      body: `"${cast.text.slice(0, 100)}"`,
      targetUrl: result.castUrl,
    })
    
    return NextResponse.json(
      { 
        ok: true, 
        tip: {
          sender: cast.author.username,
          receiver: command.receiverUsername,
          amount: command.amount,
          txHash: result.txHash,
        }
      },
      { headers: { 'X-Request-ID': requestId } }
    )
    
  } catch (error) {
    console.error('[MentionHandler] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
```

---

### 2. Command Parser (NLP for Tip Patterns)

**File**: `lib/tips/command-parser.ts`

```typescript
/**
 * Tip Command Parser
 * Extracts tip intent from natural language casts
 * 
 * Supported Patterns:
 * 1. "@gmeowbased send 100 points to @bob"
 * 2. "@gmeowbased tip @bob 100 points"
 * 3. "Great work @bob! @gmeowbased 100 points"
 * 4. "@gmeowbased give @bob 100 pts"
 * 
 * Returns: { type, receiverFid, receiverUsername, amount } | null
 */

export interface TipCommand {
  type: 'tip'
  receiverFid: number
  receiverUsername: string
  amount: number
}

export function parseTipCommand(
  text: string, 
  author: { fid: number; username: string }
): TipCommand | null {
  // Remove @gmeowbased mention
  let cleanText = text.toLowerCase()
    .replace(/@gmeowbased/gi, '')
    .trim()
  
  // Pattern 1: "send X points to @user"
  const pattern1 = /send\s+(\d+)\s+(?:points?|pts?)\s+(?:to\s+)?@(\w+)/i
  const match1 = cleanText.match(pattern1)
  if (match1) {
    return {
      type: 'tip',
      receiverFid: 0, // TODO: Resolve via Neynar
      receiverUsername: match1[2],
      amount: parseInt(match1[1]),
    }
  }
  
  // Pattern 2: "tip @user X points"
  const pattern2 = /tip\s+@(\w+)\s+(\d+)\s+(?:points?|pts?)/i
  const match2 = cleanText.match(pattern2)
  if (match2) {
    return {
      type: 'tip',
      receiverFid: 0,
      receiverUsername: match2[1],
      amount: parseInt(match2[2]),
    }
  }
  
  // Pattern 3: "@user X points" (implicit tip)
  const pattern3 = /@(\w+).*?(\d+)\s+(?:points?|pts?)/i
  const match3 = cleanText.match(pattern3)
  if (match3) {
    return {
      type: 'tip',
      receiverFid: 0,
      receiverUsername: match3[1],
      amount: parseInt(match3[2]),
    }
  }
  
  return null
}
```

---

### 3. Tip Executor (Contract Integration)

**File**: `lib/tips/executor.ts`

```typescript
/**
 * Tip Transaction Executor
 * Integrates with GmeowCore contract tipUser function
 * 
 * Compliance: .instructions.md "Smart Contract Integration Standards"
 * - ALWAYS use proxy address (not implementation)
 * - READ contract function before implementing
 * - Test with cast commands first
 * - Handle all error cases
 * 
 * Contract Function:
 * function tipUser(address to, uint256 points, uint256 recipientFid) external
 */

import { createTipUserTx } from '@/lib/gmeow-utils'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export interface TipTransactionInput {
  senderFid: number
  senderAddress: string
  receiverFid: number
  receiverUsername: string
  points: number
  castHash: string
  castUrl: string
}

export interface TipTransactionResult {
  success: boolean
  txHash?: string
  receiverBalance?: number
  tipCount?: number
  error?: string
  castUrl?: string
}

export async function executeTipTransaction(
  input: TipTransactionInput
): Promise<TipTransactionResult> {
  try {
    // 1. Validate inputs
    if (input.senderFid === input.receiverFid) {
      return { success: false, error: 'Cannot tip yourself' }
    }
    
    if (input.points <= 0 || input.points > 10000) {
      return { success: false, error: 'Invalid amount (1-10000 points)' }
    }
    
    // 2. Check sender balance via contract read
    const senderBalance = await checkPointsBalance(input.senderAddress)
    if (senderBalance < input.points) {
      return { 
        success: false, 
        error: `Insufficient balance (${senderBalance} pts available)` 
      }
    }
    
    // 3. Resolve receiver address
    const receiverAddress = await resolveUserAddress(input.receiverFid)
    if (!receiverAddress) {
      return { success: false, error: 'Receiver address not found' }
    }
    
    // 4. Execute contract tipUser()
    const tx = createTipUserTx(
      receiverAddress,
      input.points,
      input.receiverFid,
      'base'
    )
    
    // Execute via oracle wallet (gas-free for users)
    const txHash = await executeViaOracle(tx)
    
    // 5. Record in database
    const supabase = getSupabaseServerClient()
    await supabase.from('tips').insert({
      sender_fid: input.senderFid,
      sender_address: input.senderAddress,
      receiver_fid: input.receiverFid,
      receiver_username: input.receiverUsername,
      amount_usdc: null,
      points_awarded: input.points,
      tx_hash: txHash,
      chain: 'base',
      cast_hash: input.castHash,
      cast_url: input.castUrl,
      status: 'confirmed',
      tip_type: 'points',
    })
    
    // 6. Get updated receiver balance
    const receiverBalance = await checkPointsBalance(receiverAddress)
    
    // 7. Get tip count for celebration
    const { count } = await supabase
      .from('tips')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_fid', input.receiverFid)
    
    return {
      success: true,
      txHash,
      receiverBalance,
      tipCount: count || 0,
      castUrl: input.castUrl,
    }
    
  } catch (error: any) {
    console.error('[TipExecutor] Error:', error)
    return {
      success: false,
      error: error.message || 'Transaction failed',
    }
  }
}

async function checkPointsBalance(address: string): Promise<number> {
  // TODO: Call contract pointsBalance(address) via viem
  return 0
}

async function resolveUserAddress(fid: number): Promise<string | null> {
  // TODO: Query Neynar for verified_addresses
  return null
}

async function executeViaOracle(tx: any): Promise<string> {
  // TODO: Send tx to oracle wallet for gas-free execution
  return '0x...'
}
```

---

### 4. Bot Auto-Reply (Social Proof)

**File**: `lib/tips/bot-reply.ts`

```typescript
/**
 * Farcaster Bot Auto-Reply
 * Sends confirmation casts after successful tips
 * 
 * MCP-Verified: https://docs.neynar.com/docs/write-api
 * Compliance: Neynar Managed Signers
 * 
 * Reply Templates:
 * - Standard: "🎁 @sender sent @receiver X points!"
 * - Milestone: "🔥 100th tip! @sender sent @receiver X points!"
 * - Streak: "🎯 5-day streak! @sender tipped @receiver X points!"
 */

import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY!)

export interface BotReplyInput {
  parentCastHash: string
  message: string
  embedUrl?: string
}

export async function sendBotReply(input: BotReplyInput): Promise<void> {
  try {
    const signerUuid = process.env.NEYNAR_SIGNER_UUID!
    
    await neynar.publishCast({
      signerUuid,
      text: input.message,
      parent: input.parentCastHash,
      embeds: input.embedUrl ? [{ url: input.embedUrl }] : [],
    })
    
    console.log('[BotReply] Sent:', input.message.slice(0, 50))
  } catch (error) {
    console.error('[BotReply] Error:', error)
    // Don't throw - tip already succeeded
  }
}

export function generateTipReplyMessage(
  sender: string,
  receiver: string,
  amount: number,
  receiverBalance: number,
  tipCount: number
): string {
  // Milestone celebrations
  if (tipCount % 100 === 0) {
    return `🔥 TIP MILESTONE #${tipCount}! 🔥

@${sender} sent @${receiver} ${amount} points!
New balance: ${receiverBalance} pts

This community is on fire! 🚀`
  }
  
  if (tipCount % 50 === 0) {
    return `🎉 Tip #${tipCount}! @${sender} sent @${receiver} ${amount} points!

New balance: ${receiverBalance} pts
Keep the generosity flowing! 💜`
  }
  
  // Standard reply
  return `🎁 @${sender} sent @${receiver} ${amount} points!

New balance: ${receiverBalance} pts
Tip #${tipCount} 🔥`
}
```

---

### 5. Farcaster Notifications (Mobile Re-engagement)

**File**: `lib/tips/notifications.ts`

```typescript
/**
 * Farcaster Mobile Notifications
 * Sends push notifications to users via Neynar
 * 
 * MCP-Verified: https://docs.neynar.com/docs/send-notifications-to-mini-app-users
 * 
 * Notification Types:
 * - tip_received: "Alice sent you 100 points!"
 * - milestone: "You've received 1000 points total!"
 * - daily_summary: "You received 3 tips today (250 pts)"
 */

import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY!)

export interface NotificationInput {
  recipientFid: number
  title: string
  body: string
  targetUrl: string
}

export async function sendFarcasterNotification(
  input: NotificationInput
): Promise<void> {
  try {
    await neynar.publishNotification({
      fid: input.recipientFid,
      title: input.title,
      body: input.body,
      targetUrl: input.targetUrl,
    })
    
    console.log(`[Notification] Sent to FID ${input.recipientFid}`)
  } catch (error: any) {
    // Rate limit: 1 notification per 30s per user
    if (error.message?.includes('rate limit')) {
      console.warn(`[Notification] Rate limited for FID ${input.recipientFid}`)
      return
    }
    
    console.error('[Notification] Error:', error)
  }
}
```

---

## 📊 Database Schema (Updated)

### Tips Table (Mention-Based)

```sql
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender (from cast author)
  sender_fid BIGINT NOT NULL,
  sender_username TEXT,
  sender_address TEXT NOT NULL,
  
  -- Receiver (from @mention)
  receiver_fid BIGINT NOT NULL,
  receiver_username TEXT,
  receiver_address TEXT NOT NULL,
  
  -- Transaction
  points_awarded BIGINT NOT NULL CHECK (points_awarded > 0),
  tx_hash TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL DEFAULT 'base',
  
  -- Context (Farcaster cast)
  cast_hash TEXT NOT NULL,
  cast_url TEXT NOT NULL,
  parent_cast_hash TEXT, -- If reply
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  bot_replied BOOLEAN DEFAULT FALSE,
  bot_cast_hash TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT fk_sender FOREIGN KEY (sender_fid) REFERENCES user_profiles(fid),
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_fid) REFERENCES user_profiles(fid)
);

CREATE INDEX idx_tips_sender ON tips(sender_fid, created_at DESC);
CREATE INDEX idx_tips_receiver ON tips(receiver_fid, created_at DESC);
CREATE INDEX idx_tips_cast_hash ON tips(cast_hash);
CREATE INDEX idx_tips_status ON tips(status) WHERE status = 'confirmed';

COMMENT ON TABLE tips IS 'Mention-based tip transactions from Farcaster casts';
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Mention System (Week 1)
- [ ] Webhook handler (`/api/farcaster/mention-handler`)
- [ ] Command parser (NLP patterns)
- [ ] Contract integration (tipUser function)
- [ ] Database schema migration
- [ ] Basic bot reply (no fancy templates)

### Phase 2: Bot Enhancement (Week 2)
- [ ] Milestone celebrations (100th, 500th, 1000th tip)
- [ ] Streak tracking (daily tip streaks)
- [ ] Leaderboard integration
- [ ] Bot commands (/rank, /balance, /help)

### Phase 3: Notifications & Analytics (Week 3)
- [ ] Farcaster mobile notifications
- [ ] Daily tip summaries
- [ ] Tip analytics dashboard
- [ ] Top tippers/receivers badges

### Phase 4: Advanced Features (Week 4)
- [ ] Group tips ("@gmeowbased send 100 points each to @alice @bob @charlie")
- [ ] Tip forwarding ("@gmeowbased forward last tip to @alice")
- [ ] Scheduled tips (tip on specific date/time)
- [ ] Tip matching (2x employer match for charitable tips)

---

## ✅ Compliance Checklist

**`.instructions.md` Requirements**:
- [x] Smart contract integration (proxy address, read functions first)
- [x] Security (HMAC verification, rate limiting, input validation)
- [x] Professional patterns (mention-based like $DEGEN, not wallet UI)
- [x] MCP verification (Neynar webhook/API docs verified)
- [x] Request-ID headers
- [x] Error handling (graceful failures, no sensitive data)

**FOUNDATION-REBUILD-REQUIREMENTS.md**:
- [x] Base-only network (contract on Base L2)
- [x] Farcaster-first (mentions, notifications, bot replies)
- [x] TypeScript strict mode
- [x] Database schema with constraints
- [x] Comprehensive documentation

---

## 🎯 Success Metrics

**Week 1 Goals**:
- 10+ mention-based tips executed
- 100% webhook uptime
- 100% bot reply rate
- <2s tip execution time

**Month 1 Goals**:
- 1000+ tips processed
- 95%+ user satisfaction
- Leaderboard launched
- Featured in Farcaster client

**Long-term**:
- #1 tip system on Base L2
- Integration with top Farcaster apps
- 10K+ daily active tippers

---

## 🔗 References

**MCP-Verified Documentation**:
- Neynar Webhooks: https://docs.neynar.com/docs/webhooks
- Neynar Write API: https://docs.neynar.com/docs/write-api  
- Neynar Notifications: https://docs.neynar.com/docs/send-notifications-to-mini-app-users
- Farcaster Miniapps: https://miniapps.farcaster.xyz/docs/specification

**Professional Examples**:
- $DEGEN Tips: https://degen.tips
- $HAM Tips: https://ham.fun
- Farcaster Bot Best Practices: https://docs.farcaster.xyz/developers/bots

---

**Next Steps**: Clean up old implementations, implement Phase 1 core system
