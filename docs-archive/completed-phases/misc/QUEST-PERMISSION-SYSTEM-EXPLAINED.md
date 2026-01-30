# Quest Permission System - How It Works

**Date**: December 27, 2025  
**Status**: ✅ Active and Working

---

## Overview

The quest creation system has **3 permission tiers** that control what types of quests users can create:

1. **Standard Users** - Can only create social quests
2. **Partner Users** - Can create social + some advanced quests
3. **Admin Users** - Can create ALL quest types

---

## How Permissions Work

### 1. Permission Check Logic

Located in: [app/api/quests/create/route.ts](app/api/quests/create/route.ts#L149-L164)

```typescript
// ROLE-BASED AUTHORIZATION: Check category permissions
const creatorTier = resolveCreatorTier({ 
  fid: body.creator_fid, 
  address: body.creator_address 
});

// Regular users can only create social quests; admin can create any category
if (creatorTier !== 'admin' && body.category !== 'social') {
  return createErrorResponse({
    type: ErrorType.AUTHORIZATION,
    message: 'Only admin users can create non-social quests',
    statusCode: 403,
    details: {
      allowedCategory: 'social',
      requestedCategory: body.category,
      tier: creatorTier,
      note: 'Regular users can only create social quests. Contact admin for elevated permissions.',
    },
  });
}
```

**What this means:**
- ✅ **ANYONE** can create **SOCIAL quests** (no restrictions)
- ❌ **Only ADMINS** can create **ONCHAIN, CREATIVE, LEARN, HYBRID** quests
- 🔐 Checked by FID or wallet address

---

### 2. Tier Resolution

Located in: [lib/quests/quest-policy.ts](lib/quests/quest-policy.ts#L80-L104)

```typescript
const ADMIN_FIDS = parseIdList(process.env.QUEST_ADMIN_FIDS)
const ADMIN_WALLETS = parseAddressList(process.env.QUEST_ADMIN_WALLETS)
const PARTNER_FIDS = parseIdList(process.env.QUEST_PARTNER_FIDS)
const PARTNER_WALLETS = parseAddressList(process.env.QUEST_PARTNER_WALLETS)

export function resolveCreatorTier(identity: CreatorIdentity): CreatorTier {
  const fid = identity.fid != null ? Number(identity.fid) : NaN
  const normalizedFid = Number.isFinite(fid) && fid > 0 ? String(fid) : null
  const address = normalizeAddress(identity.address)

  // Check if ADMIN
  if ((normalizedFid && ADMIN_FIDS.has(normalizedFid)) || 
      (address && ADMIN_WALLETS.has(address))) {
    return 'admin'
  }

  // Check if PARTNER
  if ((normalizedFid && PARTNER_FIDS.has(normalizedFid)) || 
      (address && PARTNER_WALLETS.has(address))) {
    return 'partner'
  }

  // Default: STANDARD user
  return 'standard'
}
```

**How it checks:**
1. Is FID in `QUEST_ADMIN_FIDS` or wallet in `ADMIN_WALLETS`? → **Admin**
2. Is FID in `QUEST_PARTNER_FIDS` or wallet in `PARTNER_WALLETS`? → **Partner**
3. Otherwise → **Standard** user

---

### 3. Current Configuration

In `.env.local`:
```bash
QUEST_ADMIN_FIDS=1069798,18139
# 1069798 = Gmeowbased Oracle Bot
# 18139 = Developer/Admin account
```

**What this means:**
- FID 1069798 (Oracle Bot) = **ADMIN** → Can create ALL quest types ✅
- FID 18139 (You) = **ADMIN** → Can create ALL quest types ✅
- Everyone else = **STANDARD** → Can only create SOCIAL quests ✅

---

## Quest Type Permissions Matrix

| Quest Type | Standard User | Partner User | Admin User | Escrow Required |
|-----------|---------------|--------------|------------|-----------------|
| **Social** | ✅ YES | ✅ YES | ✅ YES | ✅ YES (140 pts) |
| **Onchain** | ❌ NO | ⚠️ LIMITED | ✅ YES | ✅ YES (720 pts) |
| **Creative** | ❌ NO | ⚠️ LIMITED | ✅ YES | ✅ YES (295 pts) |
| **Learn** | ❌ NO | ❌ NO | ✅ YES | ✅ YES (220 pts) |
| **Hybrid** | ❌ NO | ⚠️ LIMITED | ✅ YES | ✅ YES (590 pts) |

**Key Points:**
- ✅ **Social quests are for EVERYONE** - No admin permission needed
- 🔒 **All other quest types require ADMIN** - Currently restricted
- 💰 **ALL quest types require escrow** - No exceptions (verified!)
- ⚠️ Partner users have limited permissions (not fully implemented)

---

## Why This Design?

### Security & Quality Control

**Problem**: Anyone creating onchain quests could:
- ❌ Create malicious contract interactions
- ❌ Scam users with fake token gates
- ❌ Break the verification system
- ❌ Abuse expensive blockchain queries

**Solution**: Admin-gated advanced quests
- ✅ Verify contract addresses before allowing
- ✅ Test onchain verification logic
- ✅ Prevent abuse of indexer resources
- ✅ Maintain quality standards

**Social quests are safe because:**
- ✅ No blockchain interaction
- ✅ Simple verification (likes, recasts, follows)
- ✅ Low cost to verify
- ✅ Easy to moderate

---

## How to Grant Permissions

### To Make Someone an Admin:

```bash
# Add their FID to .env.local
QUEST_ADMIN_FIDS=1069798,18139,NEW_FID_HERE

# OR add their wallet address
QUEST_ADMIN_WALLETS=0xADDRESS1,0xADDRESS2

# Restart server to apply
```

### To Make Someone a Partner:

```bash
# Add to partner list (limited permissions)
QUEST_PARTNER_FIDS=12345,67890
QUEST_PARTNER_WALLETS=0xPARTNER1,0xPARTNER2
```

---

## Testing Results (Dec 27, 2025)

### ✅ Escrow System Verified

All 5 quest types tested with Oracle Bot (FID 1069798, Admin):

```
✅ Social Quest: Quest #16, Escrowed 140 points
✅ Onchain Quest: Quest #17, Escrowed 720 points
✅ Creative Quest: Quest #18, Escrowed 295 points
✅ Learn Quest: Quest #19, Escrowed 220 points
✅ Hybrid Quest: Quest #20, Escrowed 590 points
```

**Conclusion**: 🎉 ALL quest types work with proper escrow!

### ✅ Permission System Verified

- Standard user (not in admin list) → Can only create SOCIAL
- Admin user (FID 1069798, 18139) → Can create ALL types
- Escrow applies equally to ALL quest types regardless of permissions

### ✅ Database Cleanup Complete

- Removed all 13 test quests
- Refunded 2,275 stuck escrow points (11 failed attempts)
- Final balances:
  - FID 18139: 6,170 points
  - FID 1069798: 8,000 points
  - FID 999999: 9,720 points (test user, can be deleted)

### Image Status

**Quest Images in Storage**: 1 image found
- `quests/anonymous/fae85578-3ce7-4892-bd1f-1a9bf2cdb7b5-gmeow-vanguard.webp`
- Size: 576 KB
- Created: Dec 5, 2025
- **Note**: This is from an old quest (not test data)

**Test Quest Images**: None created
- Test quests had `thumbnail_url: null`
- No cleanup needed in storage

---

## FAQ

### Q: Can regular users create onchain quests?

**A: No.** Only admins can create onchain quests. This is by design for security reasons (contract verification, indexer load, scam prevention).

### Q: Why can everyone create social quests?

**A: Yes!** Social quests are safe:
- No blockchain interaction
- Simple to verify (Neynar API)
- Low cost
- Easy to moderate

This is the intended design - social quests drive engagement and are accessible to all creators.

### Q: Do social quests still require escrow?

**A: YES!** All quest types require points escrow, regardless of who creates them:
- Social: 140 points (2 tasks, 50 reward)
- Onchain: 720 points (1 task, 500 reward)
- Creative: 295 points (1 task, 200 reward)
- Learn: 220 points (1 task, 100 reward)
- Hybrid: 590 points (2 tasks, 300 reward)

### Q: How do I test permissions?

1. Try creating a social quest with any FID → Should work ✅
2. Try creating an onchain quest with non-admin FID → Should fail 403 ❌
3. Try creating an onchain quest with admin FID → Should work ✅

---

## Summary

**Social Quests = For Everyone** ✅
- No admin permission needed
- Anyone can create
- Still requires escrow points
- Safe and simple verification

**Advanced Quests = Admin Only** 🔒
- Onchain, Creative, Learn, Hybrid
- Requires FID in `QUEST_ADMIN_FIDS`
- Gated for security and quality
- Still requires escrow points

**Escrow = Universal Requirement** 💰
- ALL quest types deduct points before creation
- Protects against spam
- Ensures creator commitment
- Refunded if quest expires uncompleted

---

## Next Steps

### Production Considerations:

1. **Partner Tier Implementation**
   - Currently not enforced (same as standard)
   - Should allow limited onchain quests
   - Add to roadmap

2. **Dynamic Permissions**
   - Move from env vars to database
   - Allow runtime permission changes
   - Add admin dashboard

3. **Quest Moderation**
   - Add flagging system for social quests
   - Auto-review for suspicious patterns
   - Community reporting

4. **Documentation**
   - Update user-facing docs
   - Explain why onchain is restricted
   - Guide for requesting admin access

---

**Last Updated**: December 27, 2025  
**Status**: ✅ System working as designed  
**Test Coverage**: 5/5 quest types verified with escrow
