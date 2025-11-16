# Phase 4 MCP Spec Sync Report

**Report Date:** 2025-11-16  
**Report Type:** GI-7 Phase-Level MCP Spec Sync (Phase 4)  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Phase Target:** Phase 4 (Badge System Enhancement & Frame Improvements)  
**MCP Queries:** 8 total (4 previous + 4 Phase 4-specific)  
**Spec Sources:** Neynar MCP (2025 documentation)  

---

## Executive Summary

**Status:** ✅ **READY FOR PHASE 4 - NEW CAPABILITIES IDENTIFIED**

This Phase 4 MCP Spec Sync was executed per Global Instruction 7 (GI-7) to identify new Neynar and Farcaster capabilities relevant to Phase 4 development. The sync compared current codebase (Phases 0-3, v2.2.0) against latest 2025 specifications to identify:

1. **New APIs:** Badge minting, miniapp notifications, webhooks
2. **Missing Features:** Push notifications, NFT minting, analytics
3. **Opportunities:** Viral sharing patterns, financial incentives, feed integration

**Key Findings:**
- ✅ **Current Implementation:** Fully compliant with 2025 specs (see PPA Report)
- ✅ **New Badge Capabilities:** Neynar NFT minting API available (mint to FID)
- ✅ **Miniapp Notifications:** Push notification system available (user re-engagement)
- ✅ **Webhook Integration:** Real-time event subscriptions (cast.created, user.updated)
- ✅ **Frame Button Limits:** Max 4 buttons (current implementation compliant)
- ✅ **Viral Patterns:** Share-to-claim mechanics, dynamic share images

**Recommendation:** **APPROVED FOR PHASE 4** - No breaking changes detected. New capabilities available for enhancement.

---

## 1. MCP Spec Sync Methodology

### 1.1 Phase 4 Focus Areas
Per user request "phase 4 begin now", this sync targets badge system enhancement and frame improvements:

**Phase 4 Goals** (Inferred):
1. **Badge System:** Enhanced badge logic, tier progression, minting capabilities
2. **Frame Improvements:** Badge showcase frames, share mechanics, viral patterns
3. **Notifications:** User re-engagement, badge award notifications
4. **Analytics:** Badge acquisition tracking, frame interaction metrics

### 1.2 MCP Queries Executed

**Previous Queries (from PPA):**
1. Neynar API v2/v3 user profile schema fields (2025)
2. Neynar experimental user score ranking fields (2025)
3. Farcaster frames vNext metadata specification (2025)
4. Farcaster frame button action types (2025)

**Phase 4-Specific Queries:**
5. Neynar badge API NFT badge minting capabilities (2025)
6. Farcaster miniapp SDK notifications push events (2025)
7. Neynar webhooks event types user cast reaction (2025)
8. Farcaster frame metadata button count limit validation (2025)

**Total MCP Queries:** 8 (comprehensive 2025 spec coverage)

---

## 2. New Capabilities Identified

### 2.1 Neynar NFT Badge Minting ✅ NEW CAPABILITY

**MCP Query 5 Result:** Neynar Badge API NFT Badge Minting Capabilities (2025)

**Key Features:**
- **Mint to FID:** Mint NFTs directly to Farcaster users using their FID (no wallet address needed)
- **Batch Minting:** Mint to multiple users in a single API call
- **Supported Networks:** Base, Base Sepolia, other EVM chains
- **API Endpoint:** `/farcaster/nft/mint` (POST)
- **Authentication:** `x-wallet-id` header (Neynar server wallet)

**Example Usage:**
```typescript
const recipients = [
  { fid: 14206, quantity: 1 },
  { fid: 14207, quantity: 2 },
  { fid: 14208, quantity: 1 }
];

const response = await fetch('/farcaster/nft/mint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-id': 'your-server-wallet-id'
  },
  body: JSON.stringify({
    nft_contract_address: '0x8F01e875C816eC2C9d94E62E47771EbDB82d9A8B',
    network: 'base-sepolia',
    recipients,
    async: true
  })
});
```

**Current Implementation:**
- ✅ Badge system exists (`/lib/badges.ts`, 1002 lines)
- ✅ Badge minting tracking (`minted`, `mintedAt`, `txHash`, `tokenId` fields)
- ❌ **Missing:** Neynar NFT minting API integration (manual minting currently)

**Phase 4 Opportunity:**
- **Action:** Integrate Neynar NFT minting API for automated badge minting
- **Benefit:** Users can mint badges directly from badge inventory (no manual transaction)
- **Implementation:** Add `mintBadgeViaNeynar(fid, badgeId)` function to `/lib/badges.ts`
- **Timeline:** Phase 4 (high priority for badge enhancement)

---

### 2.2 Farcaster Miniapp Notifications ✅ NEW CAPABILITY

**MCP Query 6 Result:** Farcaster Miniapp SDK Notifications Push Events (2025)

**Key Features:**
- **Push Notifications:** Re-engage users with social triggers and achievement celebrations
- **Notification Tokens:** Managed by Neynar (no manual storage required)
- **Event Types:** `notifications_enabled`, `notifications_disabled`, `miniapp_added`, `miniapp_removed`
- **Analytics:** Track open rates, engagement metrics in Neynar Dev Portal
- **Rate Limits:** 1 notification per 30 seconds per token, 100 per day per token

**API Integration:**
```typescript
// Neynar miniapp events webhook URL
const webhookUrl = `https://api.neynar.com/f/app/<client_id>/event`;

// Broadcast notification to all enabled users
await fetch('/v2/farcaster/app/notifications', {
  method: 'POST',
  headers: {
    'x-api-key': NEYNAR_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Badge Earned!',
    body: 'You just earned the Vanguard badge (Mythic tier) 🎖️',
    target_url: 'https://gmeowhq.art/profile/badges'
  })
});
```

**Current Implementation:**
- ✅ Legacy notification system (`useLegacyNotificationAdapter()`) maintained
- ❌ **Missing:** Miniapp notification integration (push notifications)
- ❌ **Missing:** Badge award notification triggers

**Phase 4 Opportunity:**
- **Action:** Integrate Neynar miniapp notifications for badge awards
- **Benefit:** Users receive push notifications when they earn new badges (re-engagement)
- **Implementation:** Add notification webhook to `/app/api/webhooks/neynar/route.ts`
- **Timeline:** Phase 4 (medium priority, enhances user retention)

---

### 2.3 Neynar Webhooks (Real-Time Events) ✅ NEW CAPABILITY

**MCP Query 7 Result:** Neynar Webhooks Event Types User Cast Reaction (2025)

**Key Features:**
- **Event Types:** `cast.created`, `user.updated`, `reaction.created`, `reaction.deleted`, `follow.created`, `follow.deleted`
- **Filters:** FID-based, channel-based, mention-based, text regex
- **Webhook Setup:** Neynar Dev Portal or programmatic API
- **Validation:** HMAC signature verification (`X-Neynar-Signature` header)
- **Use Cases:** Bot replies, analytics tracking, real-time notifications

**Example Webhook:**
```typescript
// Webhook payload (cast.created)
{
  created_at: 1708025006,
  type: "cast.created",
  data: {
    object: "cast",
    hash: "0xfe7908021a4c0d36d5f7359975f4bf6eb9fbd6f2",
    author: {
      fid: 234506,
      username: "balzgolf",
      display_name: "Balzgolf",
      pfp_url: "https://i.imgur.com/U7ce6gU.jpg",
      // ... full user object
    },
    text: "LFG",
    timestamp: "2024-02-15T19:23:22.000Z",
    // ... full cast object
  }
}
```

**Current Implementation:**
- ✅ Bot system exists (`/lib/bot-instance/`, `/lib/agent-auto-reply.ts`)
- ❌ **Missing:** Real-time webhook integration (webhooks not configured)
- ❌ **Missing:** Badge-related cast monitoring (e.g., "show me my badges" triggers)

**Phase 4 Opportunity:**
- **Action:** Set up Neynar webhooks for badge-related interactions
- **Benefit:** Auto-reply to users asking about badges, track badge share casts
- **Implementation:** Configure webhook in Neynar Dev Portal → Add handler to `/app/api/webhooks/neynar/route.ts`
- **Timeline:** Phase 4 (low priority, nice-to-have for bot enhancements)

---

### 2.4 Frame Button Count Limit ✅ VALIDATION

**MCP Query 8 Result:** Farcaster Frame Metadata Button Count Limit Validation (2025)

**Key Finding:**
- **Max Buttons:** 4 buttons per frame (enforced by Farcaster clients)
- **Current Implementation:** All frames have ≤4 buttons (compliant)
- **Validation Method:** Frame validation API (`/v2/farcaster/frame/validate`)

**Current Button Counts:**
- `/app/api/frame/badge/route.ts`: 2 buttons ✅ (View Profile, Mint/Explorer)
- `/app/api/frame/badgeShare/route.ts`: 2 buttons ✅ (View Collection, Explorer/Mint)
- `/app/api/frame/route.tsx`: Dynamic (≤4 buttons) ✅

**Compliance:** ✅ ALL FRAMES COMPLIANT (no changes needed)

---

## 3. Viral Mechanics & Best Practices

### 3.1 Share-to-Claim Patterns ✅ RECOMMENDATION

**MCP Source:** "Core Neynar Features for Viral Apps" (2025)

**Key Patterns:**
1. **Dynamic Share Pages:**
   - Every achievement generates custom share URL with user-specific embed image
   - Example: `[your_url]/share/[fid]` → Personalized badge showcase
   - Current: ✅ Badge share frames exist (`/app/api/frame/badgeShare/route.ts`)

2. **Smart Cast Composition:**
   - Pre-fill Warpcast composer with social graph data
   - Tag best friends: "Just earned X badge! @friend1 @friend2"
   - Current: ✅ Warpcast composer integration exists (`/lib/share.ts`)

3. **Financial Incentives:**
   - Mint exclusive NFTs for badge achievements
   - Bonus rewards for shares that get engagement
   - Current: ❌ **Missing:** NFT minting integration (see 2.1)

**Phase 4 Opportunity:**
- **Action:** Enhance badge share frames with viral mechanics
- **Benefit:** Increase organic badge system discovery via social sharing
- **Implementation:** Add best friends tagging to badge share composer
- **Timeline:** Phase 4 (medium priority, enhances virality)

---

## 4. API Drift Analysis

### 4.1 Breaking Changes ✅ NONE DETECTED

**Comparison:** Phases 0-3 (v2.2.0) vs. Latest 2025 Specs

| API Surface | Phase 0-3 Implementation | 2025 Spec | Status |
|-------------|--------------------------|-----------|--------|
| Neynar API Base | `https://api.neynar.com` | `https://api.neynar.com` | ✅ Match |
| Auth Header | `x-api-key` | `x-api-key` | ✅ Match |
| User Score Field | `experimental.neynar_user_score` | `experimental.neynar_user_score` | ✅ Match |
| Frame Version | `vNext` | `vNext` | ✅ Match |
| Frame Button Actions | `link` | `link, post_redirect, mint, tx` | ✅ Subset valid |
| Frame Aspect Ratio | `1.91:1` | `1.91:1` | ✅ Match |
| Max Buttons | ≤4 | 4 | ✅ Compliant |

**Conclusion:** **ZERO BREAKING CHANGES** - All current implementations remain valid per 2025 specs.

### 4.2 Deprecated APIs ✅ NONE FOUND

**Deprecated Patterns Checked:**
- ❌ Old frame button actions (`post`, `action`, `redirect`) → None found in code
- ❌ Legacy score field (`user.score` without fallback) → Dual-path implemented correctly
- ❌ Old SDK base (`sdk-api.neynar.com`) → Only used as fallback, not primary
- ❌ v1 API endpoints → None found in code

**Conclusion:** **ZERO DEPRECATED PATTERNS** - All code uses current 2025 APIs.

---

## 5. Phase 4 Feature Gap Analysis

### 5.1 Current Badge System Capabilities ✅ STRONG FOUNDATION

**Existing Features:**
- ✅ Badge registry system (`/lib/badges.ts`, 1002 lines)
- ✅ Tier system (mythic, legendary, epic, rare, common)
- ✅ Badge templates (Supabase storage, `badge_templates` table)
- ✅ User badge inventory (`user_badges` table)
- ✅ Badge showcase frame (`/app/api/frame/badge/route.ts`)
- ✅ Badge share frame (`/app/api/frame/badgeShare/route.ts`)
- ✅ Badge assignment logic (auto-assign by Neynar score)
- ✅ Minting tracking (`minted`, `mintedAt`, `txHash`, `tokenId`)
- ✅ Multi-chain support (Base, OP, Celo, Unichain, Ink)

**Missing Features (vs. 2025 Specs):**
- ❌ **Automated NFT Minting:** Neynar minting API not integrated (manual minting only)
- ❌ **Push Notifications:** Badge award notifications not implemented
- ❌ **Webhook Integration:** Real-time badge-related event tracking missing
- ❌ **Batch Minting:** No bulk badge minting flow (could mint to multiple users at once)
- ❌ **Analytics:** No badge acquisition analytics dashboard

### 5.2 Priority Feature Gaps (Phase 4)

**HIGH PRIORITY:**
1. **Automated NFT Minting** (via Neynar API)
   - **Impact:** Users can mint badges with 1 click (no wallet transaction UX)
   - **Complexity:** Medium (API integration, wallet ID configuration)
   - **Effort:** 2-3 hours
   - **Benefit:** Significantly improves badge UX (removes friction)

**MEDIUM PRIORITY:**
2. **Push Notifications** (badge awards)
   - **Impact:** Re-engages users when they earn badges (retention boost)
   - **Complexity:** Medium (webhook setup, notification API integration)
   - **Effort:** 2-3 hours
   - **Benefit:** Increases user return rate (milestone notifications)

3. **Viral Share Mechanics** (best friends tagging)
   - **Impact:** Increases organic badge system discovery
   - **Complexity:** Low (enhance existing share composer)
   - **Effort:** 1-2 hours
   - **Benefit:** Drives viral growth (social proof)

**LOW PRIORITY:**
4. **Webhook Integration** (cast monitoring)
   - **Impact:** Bot can auto-reply to badge-related queries
   - **Complexity:** Medium (webhook handler, signature verification)
   - **Effort:** 2-3 hours
   - **Benefit:** Enhances bot capabilities (QoL improvement)

5. **Batch Minting** (admin tools)
   - **Impact:** Admins can mint badges to multiple users at once
   - **Complexity:** Low (extend existing minting logic)
   - **Effort:** 1 hour
   - **Benefit:** Operational efficiency (admin tool)

---

## 6. Phase 4 Implementation Recommendations

### 6.1 Immediate Actions (Phase 4 Priority)

**1. Integrate Neynar NFT Minting API** ✅ HIGH PRIORITY
```typescript
// Add to /lib/badges.ts
export async function mintBadgeViaNeynar(
  fid: number,
  badgeId: string,
  contractAddress: string,
  network: 'base' | 'base-sepolia' = 'base'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const walletId = process.env.NEYNAR_SERVER_WALLET_ID;
  if (!walletId) throw new Error('NEYNAR_SERVER_WALLET_ID not configured');

  const response = await fetch('https://api.neynar.com/farcaster/nft/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-id': walletId,
    },
    body: JSON.stringify({
      nft_contract_address: contractAddress,
      network,
      recipients: [{ fid, quantity: 1 }],
      async: false, // Wait for confirmation
    }),
  });

  const result = await response.json();
  return {
    success: result.transactions?.[0]?.status === 'success',
    txHash: result.transactions?.[0]?.hash,
    error: result.error,
  };
}
```

**2. Add Badge Award Notifications** ✅ MEDIUM PRIORITY
```typescript
// Add to /lib/badges.ts
export async function sendBadgeAwardNotification(
  fid: number,
  badgeName: string,
  badgeTier: TierType
): Promise<void> {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) return;

  await fetch('https://api.neynar.com/v2/farcaster/app/notifications', {
    method: 'POST',
    headers: {
      'x-api-key': NEYNAR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fids: [fid],
      title: 'New Badge Earned! 🎖️',
      body: `You just earned the ${badgeName} badge (${badgeTier} tier)`,
      target_url: `https://gmeowhq.art/profile/${fid}/badges`,
    }),
  });
}
```

**3. Enhance Badge Share Composer** ✅ MEDIUM PRIORITY
```typescript
// Enhance /lib/frame-badge.ts
export function buildBadgeShareText(
  badge: UserBadge,
  username?: string,
  bestFriends?: string[] // NEW: Best friends FIDs
): string {
  const badgeName = (badge.metadata as { name?: string })?.name || badge.badgeType;
  const tierLabel = badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1);

  let text = `Just earned the ${badgeName} badge (${tierLabel} tier) on @gmeowbased! 🎖️`;
  
  // NEW: Tag best friends for viral sharing
  if (bestFriends && bestFriends.length > 0) {
    const tags = bestFriends.map(fid => `@${fid}`).join(' ');
    text += ` Check it out ${tags}!`;
  }

  return text;
}
```

### 6.2 Configuration Requirements

**Environment Variables (Add to `.env`):**
```bash
# Neynar NFT Minting
NEYNAR_SERVER_WALLET_ID=your_wallet_id_from_neynar_portal

# Miniapp Notifications
NEYNAR_MINIAPP_CLIENT_ID=your_client_id_from_neynar_portal

# Webhook Integration (Optional)
NEYNAR_WEBHOOK_SECRET=your_webhook_secret_for_hmac_verification
```

**Neynar Dev Portal Setup:**
1. Navigate to dev.neynar.com/app
2. Create server wallet (for NFT minting)
3. Enable miniapp notifications
4. Configure webhook endpoint (optional): `https://gmeowhq.art/api/webhooks/neynar`

---

## 7. Compliance with Global Instructions

### GI-7 Compliance ✅ VALIDATED
**Requirement:** "Run full API audit before every phase (Phase 4, 5, 6, ...)"

**Execution:**
- ✅ 8 MCP queries executed (4 previous + 4 Phase 4-specific)
- ✅ Latest 2025 Neynar/Farcaster specs retrieved
- ✅ API drift analysis completed (zero breaking changes)
- ✅ New capabilities identified (NFT minting, notifications, webhooks)
- ✅ Feature gap analysis completed (5 missing features)
- ✅ Implementation recommendations provided (3 high/medium priority)

**Compliance:** FULLY COMPLIANT with GI-7 requirements.

### GI-8 Protection (File-Level)
**Requirement:** "Before editing ANY file, query MCP for latest API spec"

**Phase 4 Files to Edit:**
- `/lib/badges.ts` → Will trigger GI-8 (Neynar NFT minting API sync)
- `/lib/frame-badge.ts` → Will trigger GI-8 (share utilities API sync)
- `/app/api/webhooks/neynar/route.ts` → Will trigger GI-8 (webhook API sync)

**Protection:** GI-8 will auto-trigger on first file edit (validates latest API specs).

### GI-11 & GI-12 Protection (Frame Code)
**Requirement:** "Validate frame URLs and button actions on every frame edit"

**Phase 4 Frame Files:**
- `/app/api/frame/badge/route.ts` → Will trigger GI-11/GI-12 (if edited)
- `/app/api/frame/badgeShare/route.ts` → Will trigger GI-11/GI-12 (if edited)

**Protection:** GI-11/GI-12 will auto-trigger if frame metadata is edited.

---

## 8. Risk Assessment

### 8.1 API Stability Risk ✅ LOW
**Finding:** All current APIs stable in 2025 specs, zero deprecation notices.

**Mitigation:**
- Neynar MCP provides real-time spec updates (no manual monitoring needed)
- GI-7 + GI-8 workflow ensures continuous API validation
- Score field dual-path fallback handles API response variations

### 8.2 Feature Complexity Risk ✅ MEDIUM
**Finding:** New features (NFT minting, notifications) require external service integration.

**Mitigation:**
- Neynar APIs well-documented (MCP retrieved comprehensive guides)
- Error handling patterns established in existing codebase
- Fallback mechanisms available (manual minting if API unavailable)

### 8.3 Rate Limit Risk ✅ MEDIUM
**Finding:** Neynar notifications have rate limits (1/30s per token, 100/day per token).

**Mitigation:**
- Implement notification queue system (batch notifications)
- Add rate limit tracking to prevent rejection
- Use async minting API (non-blocking for user experience)

---

## 9. Phase 4 Success Criteria

### 9.1 Functional Requirements ✅
- [ ] **NFT Minting:** Users can mint badges with 1 click via Neynar API
- [ ] **Notifications:** Users receive push notifications on badge awards
- [ ] **Viral Sharing:** Badge share composer tags best friends
- [ ] **Error Handling:** All new APIs have proper error handling + fallbacks
- [ ] **Testing:** All new features tested in dev environment

### 9.2 Compliance Requirements ✅
- [ ] **GI-8 Protection:** All file edits trigger MCP validation
- [ ] **GI-11 Compliance:** No new user-facing direct frame URLs
- [ ] **GI-12 Compliance:** All frame buttons use valid vNext actions
- [ ] **Zero Drift:** All new code matches latest 2025 specs

### 9.3 Documentation Requirements ✅
- [ ] **API Docs:** Update `/docs/badge/` with new minting flows
- [ ] **Implementation Docs:** Update `/docs/IMPLEMENTATION.md` with notification setup
- [ ] **Changelog:** Add Phase 4 entries to `/docs/CHANGELOG.md`

---

## 10. Conclusion

**Spec Sync Verdict:** ✅ **READY FOR PHASE 4**

This Phase 4 MCP Spec Sync validated the current codebase (Phases 0-3, v2.2.0) against the latest 2025 Neynar and Farcaster specifications. The sync identified:

**Zero Breaking Changes:**
- All current implementations remain valid per 2025 specs
- No deprecated APIs detected in codebase
- Frame metadata fully compliant with vNext specification

**New Capabilities Available:**
- ✅ **Neynar NFT Minting API:** Mint badges to FID (no wallet address needed)
- ✅ **Miniapp Push Notifications:** Re-engage users with badge award alerts
- ✅ **Real-Time Webhooks:** Track cast creation, reactions, user updates
- ✅ **Viral Mechanics:** Share-to-claim patterns, dynamic share images

**Phase 4 Opportunities:**
1. **HIGH PRIORITY:** Integrate Neynar NFT minting (2-3 hours, high UX impact)
2. **MEDIUM PRIORITY:** Add badge award notifications (2-3 hours, retention boost)
3. **MEDIUM PRIORITY:** Enhance viral share mechanics (1-2 hours, growth driver)

**No blocking issues identified.** The codebase is fully compliant with 2025 specifications and ready for Phase 4 enhancement work. All new features can be implemented as additive changes (no refactoring required).

**Phase 4 is APPROVED to proceed** after user approval of combined audit reports.

---

**Report Generated:** 2025-11-16  
**Next Steps:** Present combined PPA + Spec Sync reports to user → User approval → Begin Phase 4 development

**Spec Sync Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Audit Workflow:** Per Global Instruction 7 (GI-7)  
**MCP Integration:** Neynar MCP (8 queries, 2025 documentation)
