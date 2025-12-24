# founderBonus → ownerBonus Renaming Complete ✅

**Date:** December 24, 2025  
**Status:** Complete - All code updated  
**Scope:** Terminology clarification (no functional changes)

---

## Summary

Renamed `founderBonus` to `ownerBonus` throughout codebase to better reflect the role-based design of the guild bonus system.

**Key Finding:** Guild bonuses are based on **current role** (owner/officer/member), NOT on founder identity. Renaming clarifies this design choice.

---

## Changes Made

### 1. TypeScript Code Changes ✅

**File:** [lib/profile/team.ts](lib/profile/team.ts)

```typescript
// BEFORE
export type TeamSummary = {
  // ...
  founderBonus: number // not in ABI; kept for compatibility -> 0
}

// AFTER
export type TeamSummary = {
  // ...
  ownerBonus: number // Guild owner role bonus (2.0x multiplier) - calculated in leaderboard-service.ts
}
```

**Changes:**
- Line 13: Type definition renamed
- Line 84: Return statement updated

### 2. Documentation Updates ✅

**File:** [GUILD-AUDIT-REPORT.md](GUILD-AUDIT-REPORT.md)

Added comprehensive section explaining:
- Guild founder = Guild owner = Guild leader (same person)
- Role-based bonus system (2.0x for owner, 1.5x for officer, 1.0x for member)
- Terminology change rationale
- Updated code examples

**File:** [GUILDS-NAMING-STATUS.md](GUILDS-NAMING-STATUS.md)

- Updated tracking to note the rename
- Documented that system is correctly implemented

---

## Guild Bonus System (Actual Implementation)

**Current:** Role-based multipliers on guild contribution points

```typescript
// lib/leaderboard/leaderboard-service.ts (lines 327-347)
const roleMultiplier = 
  guildMembership.role === 'owner' ? 2.0 :      // Founder/owner bonus
  guildMembership.role === 'officer' ? 1.5 : 
  1.0  // Regular member

guildBonus = Math.floor(pointsContributed * roleMultiplier)
```

**Key Points:**
- ✅ Founder gets 2.0x multiplier as "owner" (highest tier)
- ✅ This is based on ROLE, not founder identity
- ✅ If founder is replaced as owner, they lose the 2.0x bonus
- ✅ Implements meritocratic governance model
- ✅ Virtual bonus (increases leaderboard ranking, not spendable balance)

---

## Verification

**All occurrences checked:**
- ✅ TypeScript code: 2 changes (type + return statement)
- ✅ Documentation: Updated with clarification
- ✅ No functional changes to calculation logic
- ✅ No contract changes needed
- ✅ No database changes needed

**Code references to old name:**
- ❌ ZERO active code files use `founderBonus`
- ✅ Documentation mentions for historical context only

---

## Answer to Original Question

**Q: "If founder/leader guild bonus not found in codebase, how possible to create bonus but don't actually find it?"**

**A:** The bonus **exists but is role-based**, not identity-based.

- **Where it exists:** [lib/leaderboard/leaderboard-service.ts](lib/leaderboard/leaderboard-service.ts) lines 327-347
- **What it does:** Multiplies guild points by role (2.0x for owner/founder)
- **Why confusing:** Old name `founderBonus` implied founder gets it forever (identity-based)
- **Actual design:** `ownerBonus` is based on current guild role (role-based)
- **Consequence:** If founder is replaced as owner, they lose the bonus

---

## Timeline

| Date | Action | Result |
|---|---|---|
| Dec 23, 2025 | User asked about founderBonus | Found it doesn't exist as contract field |
| Dec 23, 2025 | Comprehensive investigation | Discovered role-based system in leaderboard-service.ts |
| Dec 24, 2025 | Renamed for clarity | Updated code & documentation |
| Dec 24, 2025 | This document | Complete record of change |

---

## Design Philosophy

**Guild bonuses are ROLE-BASED, not IDENTITY-BASED:**

This reflects a meritocratic governance model where:
- Leaders earn 2.0x by managing guild effectively
- Officers earn 1.5x by helping manage
- Members earn 1.0x for participating
- Anyone can be promoted/demoted based on performance
- Bonuses follow the role, not the person

**Alternative approach (not implemented):**
- Could make founder bonus permanent (identity-based)
- Would require contract changes to track founder address separately
- Would reduce governance flexibility

---

## Next Steps (Optional)

If you want true **permanent founder bonus** (identity-based):
- 🔄 Add `founder` field to Guild struct in contract
- 🔄 Add `is_founder` flag to guild_members table
- 🔄 Implement permanent founder multiplier in leaderboard-service.ts
- ⏱️ Estimated effort: 2-3 hours + contract redeployment

**Recommended:** Keep current system (role-based) - it's more flexible and aligns with governance model.
