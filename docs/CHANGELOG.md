# Changelog

All notable changes to the Gmeowbased project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Phase 4 (v2.3.0-alpha) - 2025-11-16

**Badge System Enhancement - NFT Minting, Notifications, Viral Sharing**

#### Added
- **Neynar NFT Minting Integration** (`/lib/badges.ts`)
  - `mintBadgeViaNeynar()` - 1-click badge minting via Neynar API (no wallet transaction from user)
  - `batchMintBadgesViaNeynar()` - Batch minting to multiple users
  - Support for Base, Base Sepolia, Optimism, Celo networks
  - Full error handling with error codes (INVALID_FID, MISSING_WALLET_ID, API_ERROR, etc.)
  - Transaction hash tracking for minted badges

- **Badge Award Push Notifications** (`/lib/badges.ts`)
  - `sendBadgeAwardNotification()` - Send push notification when user earns badge
  - `batchSendBadgeNotifications()` - Batch notifications with rate limit protection
  - Tier-specific emoji mapping (🌟 mythic, 👑 legendary, 💎 epic, ✨ rare, 🎖️ common)
  - Deep link target URLs to badge inventory
  - Rate limit compliance (1 notification per 30s per token, 100 per day)

- **Viral Share Mechanics** (`/lib/frame-badge.ts`)
  - Enhanced `buildBadgeShareText()` - Best friends tagging support (up to 3 tags)
  - `fetchBestFriendsForSharing()` - Fetch relevant followers via Neynar API
  - Tier-specific emojis in share text for visual appeal
  - Smart tag limiting for optimal viral spread
  - Automatic `@` prefix handling

- **Documentation**
  - Previous Phase Audit (GI-9) report: `/docs/phase/previous-phase-audit-2025-11-16.md`
  - Phase 4 Spec Sync (GI-7) report: `/docs/phase/spec-sync-phase-4-2025-11-16.md`
  - Phase 4 features guide: `/docs/badge/phase-4-features.md`

#### Changed
- `buildBadgeShareText()` signature now accepts optional `bestFriendUsernames` parameter

#### Environment Variables
- **Required for NFT Minting:** `NEYNAR_SERVER_WALLET_ID`
- **Required for Notifications + Best Friends:** `NEYNAR_API_KEY`

#### Compliance
- ✅ GI-7: Phase-level MCP spec sync (8 queries, zero breaking changes)
- ✅ GI-8: File-level API drift validation (all edits validated)
- ✅ GI-9: Previous phase audit (100% compliant, zero violations)
- ✅ GI-11: Frame URL compliance (no new direct frame URLs)
- ✅ GI-12: Frame button compliance (no frame metadata changes)
- ✅ Zero-drift architecture maintained

#### Git
- Commit: `33259d1` - Phase 4 implementation
- Branch: `staging`
- Type: `feat` (new badge capabilities)

---

## [v2.2.0] - Phase 3 Complete - 2025-11-15

**Previous Phase (v2.2.0) - Badge System Foundation**

### Added
- Badge registry system (`/lib/badges.ts`)
- Tier system (mythic, legendary, epic, rare, common)
- Badge templates (Supabase `badge_templates` table)
- User badge inventory (`user_badges` table)
- Badge showcase frame (`/app/api/frame/badge/route.ts`)
- Badge share frame (`/app/api/frame/badgeShare/route.ts`)
- Badge assignment logic (auto-assign by Neynar score)
- Manual minting tracking (`minted`, `mintedAt`, `txHash`, `tokenId`)
- Multi-chain support (Base, OP, Celo, Unichain, Ink)

### Git
- Commit: `75d1c7c` - Phase 3 finalization
- Branch: `staging`

---

## [v2.1.0] - Phase 2 Complete - 2025-11-14

**Previous Phase (v2.1.0) - Frame System Foundation**

### Added
- Main frame route (`/app/api/frame/route.tsx`)
- Frame metadata validation (vNext spec)
- Frame button compliance (GI-12)
- Frame URL compliance (GI-11)
- OG image fallbacks for non-frame clients

---

## [v2.0.0] - Phase 1 Complete - 2025-11-13

**Previous Phase (v2.0.0) - Neynar API Integration**

### Added
- Neynar API client (`/lib/neynar.ts`)
- User profile fetching (`fetchUserByFid`, `fetchUsersByAddresses`)
- FID resolution (`fetchFidByAddress`)
- Score field support (`experimental.neynar_user_score`)
- Proper API authentication (`x-api-key` header)

---

## Version History

| Version | Phase | Date | Status | Commit |
|---------|-------|------|--------|--------|
| v2.3.0-alpha | Phase 4 | 2025-11-16 | In Development | `33259d1` |
| v2.2.0 | Phase 3 | 2025-11-15 | Stable | `75d1c7c` |
| v2.1.0 | Phase 2 | 2025-11-14 | Stable | N/A |
| v2.0.0 | Phase 1 | 2025-11-13 | Stable | N/A |
| v1.0.0 | Phase 0 | 2025-11-12 | Stable | N/A |

---

## Semantic Versioning

- **Major (X.0.0):** Breaking changes, protocol updates
- **Minor (X.Y.0):** New features, backward-compatible
- **Patch (X.Y.Z):** Bug fixes, backward-compatible

**Current Version:** `v2.3.0-alpha` (Phase 4, In Development)

---

## Changelog Maintenance

This changelog is updated per Global Instruction 1 (GI-1):
- All phase completions documented
- All feature additions documented
- All breaking changes documented
- All environment variable changes documented
- All compliance checks documented

**Maintainer:** Team Gmeowbased (@0xheycat)  
**Last Updated:** 2025-11-17
