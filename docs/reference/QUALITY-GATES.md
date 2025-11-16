# 🚦 GMEOW Quality Gates (GI-7 → GI-13)

**Mandatory Quality Checkpoints** — Always pause and request approval after every audit or drift report.

---

## GI-7: MCP Spec Sync (Phase Initialization)

### When to Run
- ✅ Before starting any new phase (Phase 5, Phase 6, etc.)
- ✅ At the beginning of major feature work

### Actions Required
1. Run full MCP specification sync
2. Validate all server/client integrations:
   - MCP Neynar queries
   - MCP Farcaster queries
   - MCP Coinbase queries
3. Compare ALL APIs to local code
4. Generate spec-sync report

### Approval Required
⚠️ **PAUSE** — Wait for user confirmation before proceeding

### Purpose
Ensure all features (Neynar, Supabase, Coinbase) remain compatible and up-to-date

---

## GI-8: File-Level API Sync (Pre-Edit Validation)

### When to Run
Before editing **ANY** file containing:

#### API Routes
- `/app/api/*` (Next.js API endpoints)
- `/app/api/frame/*` (Farcaster frame handlers)
- `/app/api/neynar/*` (Neynar integrations)
- `/app/api/farcaster/*` (Farcaster integrations)

#### Library Utilities
- `/lib/share.ts` (Share URL generators)
- `/lib/frame-*.ts` (Frame helpers)
- `/lib/neynar.ts` (Neynar SDK client)
- `/lib/neynar-server.ts` (Neynar server client)
- `/lib/badges.ts` (Badge system logic)

#### Feature Modules
- Onboarding (`/app/api/onboard/*`)
- Badge assignment logic
- Tier calculation
- Score calculation
- User identity resolution
- Caching layers
- OG image generators

### Actions Required

#### 1. Scan All Related Files
- Primary route under `/api/*`
- All lib utilities used by route
- All share helpers
- All frame generators
- All badge logic using that API
- Onboarding score logic
- User identity logic
- Caching layers

#### 2. Cross-Check Against Latest Specs
- ✅ Latest MCP Neynar API schema
- ✅ Latest MCP Farcaster docs
- ✅ Latest MiniApp SDK
- ✅ Latest Frame vNext spec
- ✅ Latest Warpcast composer rules
- ✅ Latest Neynar score fields
- ✅ Latest Frame security recommendations

#### 3. Validate Security Gates
- ✅ Rate limiting (Neynar 500/5min, Base RPC)
- ✅ Input validation (all user inputs sanitized)
- ✅ FID sanitization (numeric, positive)
- ✅ Cast ID sanitization (hash format)
- ✅ URL sanitization (protocol validation)
- ✅ Origin resolution attack safety
- ✅ Content spoofing protection
- ✅ Frame button spoofing protection

### Approval Required
⚠️ **PAUSE** if drift detected — Show diff, wait for user confirmation

### Purpose
Prevent breaking changes from SDK version updates

---

## GI-9: Previous Phase Audit (Pre-Phase Checklist)

### When to Run
- ✅ Before starting a new phase (e.g., before Phase 5)
- ✅ After completing major feature work

### Actions Required

#### 1. Verify Previous Phase Stability
- ✅ All features working as documented
- ✅ No regressions or broken functionality
- ✅ Documentation matches implementation
- ✅ Tests passing (manual or automated)

#### 2. Validate Against API Drift
- ✅ Farcaster API drift check
- ✅ Neynar API drift check
- ✅ Deprecated fields removed
- ✅ Outdated frame patterns updated
- ✅ Stale OG image patterns refreshed
- ✅ Legacy share logic modernized

#### 3. Check for Missing Features
- ✅ Validation logic complete
- ✅ Error handling comprehensive
- ✅ Caching layers implemented
- ✅ Retry logic for external APIs
- ✅ Type definitions up-to-date
- ✅ Multi-chain support enabled

### Success Criteria
- ✅ Zero-drift Farcaster integration (always latest frame spec)
- ✅ Zero-drift Neynar integration (always latest API schema)
- ✅ Automated MCP-driven updating (no manual spec monitoring)
- ✅ Fully self-healing API routes (auto-detect + auto-patch drift)
- ✅ Automatic documentation maintenance (docs always match code)
- ✅ Locked-in production reliability (eliminates API version bugs)

### Approval Required
⚠️ **PAUSE** — Wait for user confirmation that previous phase is stable

### Purpose
Prevent technical debt accumulation

---

## GI-10: Release Readiness (11-Gate Validation)

### When to Run
- ✅ Before merging to production (`main` branch)
- ✅ Before major version releases

### 11-Gate Checklist

1. **API Compliance**
   - ✅ Neynar API up-to-date
   - ✅ Farcaster Frame spec compliant
   - ✅ OnchainKit integration validated
   - ✅ Query MCP for latest specs
   - ✅ Validate all fields match documentation
   - ✅ Confirm version compatibility
   - ✅ Compare with local code
   - ✅ Patch if different

2. **Error Handling**
   - ✅ All async operations wrapped in try/catch
   - ✅ Graceful fallbacks for failed requests
   - ✅ User-facing error messages clear

3. **Type Safety**
   - ✅ No `any` types (use proper interfaces)
   - ✅ Proper TypeScript interfaces defined
   - ✅ All function parameters typed

4. **Rate Limiting**
   - ✅ Neynar 500 requests/5min respected
   - ✅ Base RPC rate limits handled
   - ✅ In-memory rate limit tracking

5. **Security**
   - ✅ API key validation
   - ✅ Auth checks on protected routes
   - ✅ HMAC signature verification (webhooks)
   - ✅ Input sanitization

6. **Performance**
   - ✅ Caching implemented (stats, events, registry)
   - ✅ Query optimization (Supabase indexes)
   - ✅ Edge caching for OG images

7. **Documentation**
   - ✅ README.md updated
   - ✅ Inline code comments for complex logic
   - ✅ API endpoint documentation

8. **Testing**
   - ✅ Manual validation completed
   - ✅ Automated tests passing (if applicable)
   - ✅ Edge cases covered

9. **Deployment**
   - ✅ Environment variables documented
   - ✅ Vercel configuration validated
   - ✅ Database migrations applied

10. **Rollback Plan**
    - ✅ Revert strategy documented
    - ✅ Database rollback scripts ready
    - ✅ Feature flags available (if needed)

11. **User Impact**
    - ✅ Breaking changes flagged
    - ✅ Migration guide provided
    - ✅ Changelog updated

### Approval Required
⚠️ **PAUSE** — Wait for user confirmation before production merge

### Purpose
Ensure production stability and user safety

---

## GI-11: Frame URL Safety (Warpcast Compliance)

### When to Run
- ✅ Always, for any frame-related code
- ✅ Before deploying frame handlers

### Actions Required

#### 1. Block User-Facing API Endpoints
❌ **BLOCKED** — All user-facing `/api/frame` URLs (not Warpcast-safe)
```typescript
// ❌ INVALID (user-facing API endpoint)
https://gmeowhq.art/api/frame?type=badge&fid=123
```

#### 2. Enforce Share URLs Only
✅ **ALLOWED** — Warpcast-safe share URLs
```typescript
// ✅ VALID (Warpcast-safe share URL)
https://gmeowhq.art/frame/badge/123
https://gmeowhq.art/frame/leaderboard
https://gmeowhq.art/frame/quest/456
```

#### 3. Validate Frame Responses
- ✅ All frame responses return HTML (not JSON)
- ✅ Valid resource using MCP from Neynar
- ✅ Proper meta tags (fc:frame, fc:frame:image)

### Purpose
Prevent frame embedding errors in Warpcast

---

## GI-12: Frame Button Validation (vNext Compliance)

### When to Run
- ✅ Before deploying any frame response
- ✅ Before editing frame-related code

### Pre-Edit: MCP API Sync Check

**⚠️ CRITICAL: Run GI-7 (MCP Spec Sync) BEFORE editing ANY of these files:**

#### Frame APIs
```
/app/api/frame/*
/app/api/frame/badgeShare/*
/app/api/frame/quest/*
/app/api/frame/leaderboard/*
```

#### Share Logic
```
/lib/share.ts
/lib/frame-*.ts
Badge share utilities
Composer integration logic
```

#### Neynar/Farcaster APIs
```
/app/api/neynar/*
/app/api/farcaster/*
/lib/neynar.ts
/lib/neynar-server.ts
```

#### Badge System Code (Using Neynar Score)
```
/app/api/onboard/*
/lib/badges.ts
Auto-assignment logic
Tier calculation
Score calculation
Badge eligibility
```

#### Any Feature Using FIDs, Casts, Profiles, Frames
```
User profiles
Search endpoints
Cast previews
OG image generators
User scoring
Multi-chain identity
```

**🚫 NO CODE PATCHES OR GENERATION ALLOWED until MCP sync is complete**

### Frame Button Validation Checklist

1. **Maximum Buttons**
   - ✅ Maximum 4 buttons per frame
   - ❌ Reject if > 4 buttons

2. **Button Types**
   - ✅ Valid types: `post`, `post_redirect`, `link`, `mint`, `tx`
   - ❌ Reject deprecated button types

3. **Required Fields**
   - ✅ `title` present (button label)
   - ✅ `action.type` present (button action)
   - ✅ `action.url` present (for link/post_redirect)

4. **Deprecated Fields**
   - ✅ Use `buttons[].action` format
   - ❌ Reject old `fc:frame:button` meta tags

### Valid vs Invalid Examples

#### ✅ VALID (vNext Format)
```typescript
{
  title: "View Profile",
  action: {
    type: "link",
    url: "https://gmeowhq.art/profile/123"
  }
}

{
  title: "Claim Reward",
  action: {
    type: "post",
    url: "https://gmeowhq.art/api/frame/claim"
  }
}
```

#### ❌ INVALID (Deprecated Format)
```html
<meta property="fc:frame:button:1" content="Click" />
<meta property="fc:frame:button:1:action" content="post" />
```

### Purpose
Ensure frame compatibility with latest Farcaster spec

---

## GI-13: UI/UX Audit (Ask First)

### When to Run
- ✅ UI/UX changes
- ✅ Component updates
- ✅ New page creation
- ✅ Styling modifications

### ⚠️ ALWAYS ASK FIRST
Before running any UI audit, ask user:
> *"Should I run a UI/UX audit on [component/page name]?"*

**Wait for explicit YES/NO response**

### If YES: Run Full Audit

#### 1. Accessibility Checks
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Screen reader compatibility
- ✅ Focus indicators visible
- ✅ Color contrast WCAG AA+ (4.5:1 minimum)
- ✅ Motion reduction support (`prefers-reduced-motion`)

#### 2. Miniapp-Safe Layout Rules
- ✅ Farcaster MiniApp guidelines compliance
- ✅ Safe area insets respected
- ✅ Bottom nav clearance (80px)
- ✅ Header clearance (60px)
- ✅ No fixed positioning conflicts

#### 3. Mobile Breakpoints
- ✅ Mobile: 375px-768px (iPhone SE to iPad Mini)
- ✅ Tablet: 768px-1024px (iPad)
- ✅ Desktop: 1024px+ (laptop/desktop)
- ✅ Touch targets minimum 44x44px
- ✅ Text minimum 16px readable

#### 4. Documentation Requirements
- ✅ What changed (file list)
- ✅ Which APIs updated
- ✅ Which files patched
- ✅ What MCP endpoints confirmed
- ✅ New fields adopted
- ✅ Deprecated fields removed

### Safe Patching Rules (ALWAYS APPLY)

**You MUST:**
- ✅ Check file existence first (`read_file` before `replace_string_in_file`)
- ✅ Never overwrite a file unless instructed
- ✅ Patch instead of replace (use `replace_string_in_file`)
- ✅ Never edit old SQL migrations (create new migration)
- ✅ Follow code-style conventions (match existing patterns)
- ✅ Maintain all existing patterns (don't refactor unnecessarily)

### If NO: Skip Audit
- ✅ Skip audit and proceed with implementation
- ✅ Document reason for skipping in commit message

### Purpose
Avoid unnecessary audits unless user explicitly requests

---

## 📋 Implementation Workflow Example

### Starting Phase 5

```plaintext
1. GI-7: MCP Spec Sync
   Agent: "Running MCP spec sync before Phase 5..."
   → Query Neynar MCP
   → Query Farcaster MCP
   → Query Coinbase MCP
   → Generate drift report
   → PAUSE, wait for user approval
   
2. GI-9: Previous Phase Audit
   Agent: "Running Phase 4 audit before Phase 5..."
   → Validate all Phase 4 features working
   → Check for regressions
   → Verify documentation matches code
   → PAUSE, wait for user approval
   
3. Work on Phase 5 Features
   Agent: "Starting Phase 5.1: Database Migration"
   → Implement features
   → Test locally
   → Document changes
   
4. GI-8: File-Level API Sync (During Work)
   Agent: "Editing /api/badges/assign/route.ts, running API sync..."
   → Scan file for Neynar SDK calls
   → Check against latest MCP schema
   → PAUSE if drift detected, show diff
   → Wait for user approval to patch
   
5. GI-13: UI Audit (Optional)
   Agent: "Should I run a UI/UX audit on BadgeManagerPanel?"
   → Wait for YES/NO
   → If YES: Run accessibility, mobile, breakpoint checks
   → If NO: Skip and continue
   
6. GI-10: Release Readiness
   Agent: "Phase 5 complete, running 11-gate release readiness..."
   → Validate all 11 gates
   → Generate checklist report
   → PAUSE, wait for user approval before production merge
```

---

## 🎯 Quick Reference

| Gate | Trigger | Action | Approval |
|------|---------|--------|----------|
| **GI-7** | Phase start | MCP spec sync | Required |
| **GI-8** | Pre-edit | API drift check | If drift |
| **GI-9** | Phase start | Previous phase audit | Required |
| **GI-10** | Pre-merge | 11-gate checklist | Required |
| **GI-11** | Frame code | URL safety check | None |
| **GI-12** | Frame deploy | Button validation + MCP sync | If drift |
| **GI-13** | UI changes | Ask first, then audit | If yes |

---

## 🚨 Critical Rules

1. **Always pause** for user approval at required checkpoints
2. **Always run MCP sync** before editing frame/API files (GI-12)
3. **Always ask first** before running UI audits (GI-13)
4. **Always apply safe patching rules** (check existence, patch not replace)
5. **Never skip** security gates (rate limiting, sanitization, validation)
6. **Never edit** old SQL migrations (create new migration instead)
7. **Never overwrite** files without explicit instruction

---

**Last Updated**: 2025-11-16  
**Version**: 2.0  
**Status**: Production-ready
