# Guilds Section - Naming Convention Status

**Date:** December 23, 2025  
**Status:** ✅ PRODUCTION READY - No Changes Needed

---

## Summary

Guild naming convention is **CORRECT** throughout the entire system.

| Component | Field | Status | Evidence |
|-----------|-------|--------|----------|
| **Smart Contract** | `totalPoints` (in struct) | ✅ CORRECT | GuildModule.sol line 22 |
| **Frontend** | `totalPoints` | ✅ CORRECT | GuildTeamsPage.tsx, GuildManagementPage.tsx |
| **Backend** | `totalPoints` | ✅ CORRECT | lib/team.ts, contract reads |
| **Types** | `totalPoints: bigint` | ✅ CORRECT | GuildSummary, TeamSummary |
| **Supabase** | No guild tables | ✅ INTENTIONAL | Guild data stored on-chain only |
| **Subsquid** | No Guild model | ✅ INTENTIONAL | Not indexed for MVP (low priority) |

---

## Key Finding

**Guild struct is properly defined:**

```solidity
// GuildModule.sol line 20-27 ✅
struct Guild {
  string name;
  address leader;
  uint256 totalPoints;      // ← Correctly defined
  uint256 memberCount;
  bool active;
  uint8 level;
}
```

Guild uses **separate `totalPoints`** field (distinct from user `pointsBalance`):
- User: `pointsBalance` (spendable blockchain points)
- Guild: `totalPoints` (accumulated guild treasury)
- Separate: `guildTreasuryPoints[guildId]` (treasury balance mapping)

---

## No Code Changes Required

✅ All guild components use correct naming  
✅ Contract struct properly defined  
✅ All frontend displays use `totalPoints`  
✅ Backend services extract correct values  
✅ Type definitions match contract  

---

## Optional Improvements (Future)

1. **Add Supabase guild tables (Phase 4+):**
   - `guilds` table (name, leader, active, level)
   - `guild_members` table (member history)
   - `guild_treasury` table (transaction log)

2. **Index Guild in Subsquid (Phase 4+):**
   - `Guild` entity with `totalPoints`
   - `GuildMember` entity with contributions
   - `GuildTransaction` event logs

3. **Update legacy field name (December 24, 2025):**
   - `founderBonus` → `ownerBonus` in TeamSummary
   - Clarifies role-based design (not identity-permanent)
   - Updated: [lib/profile/team.ts](lib/profile/team.ts)

---

## Conclusion

**Guild naming is correctly implemented and clarified:**
- ✅ Contract: Guild struct with `totalPoints`
- ✅ Frontend: Displays `totalPoints`
- ✅ Backend: Reads and calculates `totalPoints`
- ✅ Bonus system: Role-based (owner 2.0x, officer 1.5x, member 1.0x)
- ✅ Terminology: `founderBonus` renamed to `ownerBonus` for clarity
- ✅ Types: `totalPoints: bigint` interface

**Guild naming is ready for production.**
