# GI-7 to GI-15 Quality Gates — Overview

## Introduction

This document provides a comprehensive overview of Quality Gates (GI-7 through GI-15) that govern frame development, MiniApp deployment, and badge/scoring logic in the Gmeowbased project. These gates ensure code quality, security, performance, and compliance with Farcaster specifications.

---

## Quality Gate Hierarchy

### GI-7: Code Review & Testing
**Purpose:** Establish baseline code quality standards

**Requirements:**
- [ ] Code reviewed by ≥2 engineers
- [ ] TypeScript compilation passes (`pnpm tsc --noEmit`)
- [ ] Test suite passing (>90% coverage maintained)
- [ ] ESLint passing (no warnings)
- [ ] No `console.log` in production code
- [ ] Documentation updated (if API changes)

**Enforcement:**
- PR approval required from 2+ reviewers
- CI pipeline blocks merge on failures
- Automated PR checks run on push

**Tools:**
- TypeScript compiler
- Vitest test runner
- ESLint static analyzer
- GitHub PR review process

---

### GI-8: Security Controls & Input Validation
**Purpose:** Prevent injection attacks, XSS, and unauthorized access

**Requirements:**
- [ ] All user inputs sanitized (FID, questId, chain, etc.)
- [ ] Validation functions used (`sanitizeFID`, `sanitizeUrl`, etc.)
- [ ] Rate limiting enforced (60 req/min per IP)
- [ ] HTTPS-only enforcement (production)
- [ ] URL length limits enforced (1024 chars general, 32 chars splash)
- [ ] Error messages safe (no sensitive data exposure)
- [ ] Environment variables never exposed to client
- [ ] CORS configured appropriately

**Enforcement:**
- Security review required for frame/API changes
- Automated security scanning (Snyk, GitHub Dependabot)
- Manual code audit for validation logic

**Tools:**
- `lib/frame-validation.ts` (sanitization functions)
- `lib/rate-limit.ts` (rate limiting)
- Snyk vulnerability scanner
- GitHub security alerts

**Example:**
```typescript
import { sanitizeFID, sanitizeUrl } from '@/lib/frame-validation'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawFid = searchParams.get('fid')
  
  // ✅ Sanitize input
  const fid = sanitizeFID(rawFid)
  if (!fid) {
    return new Response('Invalid FID', { status: 400 })
  }
  
  // ✅ Rate limiting
  const clientIp = getClientIp(req)
  const { success } = await rateLimit(clientIp, apiLimiter)
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  // ... rest of handler
}
```

---

### GI-9: Frame Metadata Validation
**Purpose:** Ensure Farcaster frame compliance

**⚠️ CRITICAL - MCP-Verified (November 19, 2025):**

**Mini App Embed Requirements (fc:miniapp:frame):**
- [ ] Frame meta tag present (`fc:miniapp:frame`)
- [ ] JSON metadata schema valid (MCP-verified)
- [ ] `version` field is string "1" (not number)
- [ ] `imageUrl` is HTTPS absolute URL (max 1024 chars)
- [ ] `button` is SINGULAR object (not array)
- [ ] `button.title` ≤ 32 characters
- [ ] `button.action.type` ONLY `launch_frame` or `view_token` (MCP spec)
- [ ] `button.action.name` REQUIRED (Mini App name)
- [ ] `button.action.url` is HTTPS absolute URL (max 1024 chars, optional)
- [ ] Optional: `splashImageUrl` max 32 chars
- [ ] Optional: `splashBackgroundColor` valid hex color

**Legacy Frames v1 Requirements (fc:frame - deprecated):**
- [ ] Frame meta tag present (`fc:frame`)
- [ ] `buttons` array with max 4 buttons
- [ ] `button.action.type` supports `link`, `launch_frame`, `view_token`, `post`, `mint`
- [ ] Backward compatibility only

**Enforcement:**
- MCP query for official spec before implementation
- Validation library (`lib/miniapp-validation.ts`)
- Playwright tests for meta tag structure
- Manual Warpcast testing

**Tools:**
- `lib/miniapp-validation.ts` (validation functions)
- Playwright E2E tests
- MCP (Model Context Protocol) for spec verification
- Warpcast mobile/desktop testing

**Example (Mini App Embed):**
```typescript
import { validateMiniAppEmbed, buildMiniAppEmbed } from '@/lib/miniapp-validation'

const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/frame-image.png',
  buttonTitle: 'Start Quest 🚩',  // ≤ 32 chars
  actionType: 'launch_frame',  // ONLY 'launch_frame' or 'view_token'
  actionName: 'Gmeowbased Quest',  // REQUIRED (Mini App name)
  actionUrl: 'https://example.com/frame/quest'
})
    }
  }
}

const result = validateMiniAppEmbed(embed)
if (!result.valid) {
  console.error('Invalid embed:', result.errors)
}
```

---

### GI-10: Image Compliance
**Purpose:** Ensure images meet Farcaster and OG specs

**Requirements:**
- [ ] Frame images 3:2 ratio (1200x800 recommended)
- [ ] OG images 1.91:1 ratio (1200x630)
- [ ] Splash images 1:1 ratio (200x200, PNG RGB)
- [ ] Icon images 1:1 ratio (1024x1024, PNG)
- [ ] All images < 1MB (< 500KB preferred)
- [ ] HTTPS absolute URLs
- [ ] Correct MIME types (`image/png`, `image/jpeg`)
- [ ] No external font dependencies in OG generation
- [ ] Deterministic rendering (same input → same output)

**Enforcement:**
- Image verification checklist (FMX-OG-IMAGE-CHECKLIST.md)
- ImageMagick validation (`identify image.png`)
- File size checks (`ls -lh`)
- Visual inspection (manual)

**Tools:**
- ImageMagick (`identify`, `convert`)
- Vercel OG Image Generation
- next/og (ImageResponse)

**Verification:**
```bash
# Check dimensions
identify public/frame-image.png
# Expected: public/frame-image.png PNG 1200x800 ...

identify public/splash.png
# Expected: public/splash.png PNG 200x200 ...

# Check file size
ls -lh public/*.png
# All images < 1MB
```

---

### GI-11: URL Safety
**Purpose:** Prevent API exposure and ensure secure URLs

**Requirements:**
- [ ] No `/api/frame` URLs exposed to users
- [ ] Public routes use `/frame/*` pattern
- [ ] All share URLs use `buildFrameShareUrl` utility
- [ ] Query parameters sanitized
- [ ] HTTPS enforced on external links
- [ ] Button targets reachable (no 404s)
- [ ] No circular redirects

**Enforcement:**
- Code review checklist
- Grep audit: `grep -r "/api/frame" app/` (should return empty)
- Playwright tests for URL validation
- Manual testing of all button targets

**Tools:**
- `lib/share.ts` (URL generation utilities)
- Playwright E2E tests
- curl/wget for URL verification

**Example:**
```typescript
import { buildFrameShareUrl } from '@/lib/share'

// ❌ BAD: Exposes internal API
const badUrl = '/api/frame?type=quest&questId=1'

// ✅ GOOD: Uses public route
const goodUrl = buildFrameShareUrl('quest', { questId: 1, chain: 'base' })
// Returns: /frame/quest?questId=1&chain=base
```

---

### GI-12: Performance Benchmarks
**Purpose:** Ensure fast response times for user experience

**Requirements:**
- [ ] Frame endpoint responds < 1 second (p95)
- [ ] OG image generation < 500ms (p95)
- [ ] No blocking synchronous operations
- [ ] Database queries optimized (indexes, no N+1)
- [ ] Caching implemented (Redis/memory)
- [ ] CDN configured for static assets
- [ ] Serverless function cold start < 2 seconds

**Enforcement:**
- Performance testing checklist (ab, curl)
- Playwright performance tests
- DataDog/Sentry monitoring
- Manual benchmarking during deployment

**Tools:**
- Apache Bench (`ab`)
- curl with timing
- Playwright performance APIs
- DataDog APM
- Sentry performance monitoring

**Benchmarking:**
```bash
# Test frame endpoint
time curl -I https://gmeowhq.art/api/frame?type=leaderboard
# Expected: < 1s

# Test OG generation
time curl -I https://gmeowhq.art/api/og?type=quest
# Expected: < 500ms

# Load test (100 requests)
ab -n 100 -c 10 https://gmeowhq.art/api/frame?type=leaderboard
# Expected: 95th percentile < 1s
```

---

### GI-13: Error Handling & Logging
**Purpose:** Ensure graceful failures and debuggability

**Requirements:**
- [ ] Graceful fallbacks for all failures
- [ ] No stack traces exposed in production
- [ ] User-friendly error messages
- [ ] Errors logged to monitoring system (Sentry)
- [ ] Error codes standardized (e.g., ERR_INVALID_FID)
- [ ] Retry logic for transient failures
- [ ] Circuit breaker for external APIs

**Enforcement:**
- Code review checklist
- Manual error testing (invalid inputs)
- Sentry error tracking
- Log analysis

**Tools:**
- Sentry (error tracking)
- DataDog (logging)
- Custom error classes

**Example:**
```typescript
try {
  const profile = await fetchUserProfile(fid)
  if (!profile) {
    throw new Error('ERR_PROFILE_NOT_FOUND')
  }
  return profile
} catch (error) {
  console.error('Failed to fetch profile:', error)
  
  // ✅ User-friendly message (no stack trace)
  return new Response('Profile not found', { status: 404 })
}
```

---

### GI-14: Security Hardening
**Purpose:** Prevent common web vulnerabilities

**Requirements:**
- [ ] No hardcoded secrets (use environment variables)
- [ ] Environment variables validated on startup
- [ ] CORS configured appropriately
- [ ] CSP (Content Security Policy) headers present
- [ ] No SQL injection vectors (use parameterized queries)
- [ ] No XSS vectors (sanitize all user input)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization enforced

**Enforcement:**
- Security review required for all API changes
- Automated scanning (Snyk, GitHub Dependabot)
- Manual penetration testing
- Code audit for security patterns

**Tools:**
- Snyk vulnerability scanner
- GitHub security alerts
- OWASP ZAP (penetration testing)
- ESLint security plugins

**Example:**
```typescript
// ❌ BAD: Hardcoded secret
const API_KEY = 'sk_1234567890'

// ✅ GOOD: Environment variable
const API_KEY = process.env.NEYNAR_API_KEY
if (!API_KEY) {
  throw new Error('NEYNAR_API_KEY not configured')
}
```

---

### GI-15: Deep Frame / MiniApp Coherence Audit
**Purpose:** Ensure full parity and safety between MiniApp UI + logic and Frame/OG/Share outputs

**Requirements (All 10 Must Pass):**
1. [ ] No client-side imports in server routes (`window`, `document`, etc.)
2. [ ] OG images HTTPS, < 1MB, correct ratio (3:2 for frames, 1.91:1 for OG)
3. [ ] Modern JSON meta (`fc:frame` or `fc:miniapp:frame`)
4. [ ] Max 4 buttons, sanitized (≤ 32 char titles)
5. [ ] No `/api/frame` exposure (use `/frame/*` routes)
6. [ ] All inputs sanitized (GI-8 compliance)
7. [ ] Performance < 1s render (frame endpoint)
8. [ ] Fonts bundled locally (no CDN), deterministic rendering
9. [ ] MiniApp/Frame parity (same badges, scores, tiers)
10. [ ] Test coverage passes (Playwright E2E suite)

**Enforcement:**
- **REQUIRED** before staging deployment for frame/badge/scoring changes
- Full audit report generated (GI-15-AUDIT-REPORT-YYYYMMDD.md)
- Playwright test suite (8 test groups)
- Manual Warpcast testing (mobile + desktop)
- Approval sign-off from product owner + security owner

**Tools:**
- GI-15 audit specification (GI-15-Deep-Frame-Audit.md)
- Playwright E2E tests (8 test groups)
- Manual testing guide (STAGING-WARPCAST-TESTS.md)
- Deployment playbook (FRAME-DEPLOYMENT-PLAYBOOK.md)

**Test Groups:**
1. Frame HTML & meta validation
2. Button validation & endpoints
3. OG image integrity
4. MiniApp ↔ Frame parity
5. Input validation (GI-8 enforcement)
6. Performance / timeouts
7. Warpcast MiniApp simulation
8. Regression / negative tests

**Audit Report Template:**
```markdown
# GI-15 Audit Report — [Date]

## Acceptance Criteria Status
1. Client-side imports: ✅ / ❌
2. OG image compliance: ✅ / ❌
3. Modern JSON meta: ✅ / ❌
4. Button validation: ✅ / ❌
5. URL safety: ✅ / ❌
6. Input sanitization: ✅ / ❌
7. Performance: ✅ / ❌
8. Font/rendering: ✅ / ❌
9. MiniApp/Frame parity: ✅ / ❌
10. Test coverage: ✅ / ❌

## Test Results
- Playwright: X/Y passing
- Manual Warpcast: X/Y scenarios passing
- Performance benchmarks: X ms (p95)

## Approval Sign-Off
- [ ] Product Owner: _______ (Date: ______)
- [ ] Tech Lead: _______ (Date: ______)
- [ ] Security Owner: _______ (Date: ______)

## Deployment Approval
⬜ APPROVED for production
⬜ BLOCKED (issues listed below)

## Issues
(List any blocking issues)
```

---

## Quality Gate Enforcement

### PR Requirements

**For all PRs:**
- [ ] GI-7 (Code Review & Testing) passes
- [ ] GI-8 (Security Controls) passes
- [ ] CI pipeline green (TypeScript, tests, lint)

**For frame/badge/scoring PRs:**
- [ ] GI-9 (Frame Metadata) passes
- [ ] GI-10 (Image Compliance) passes
- [ ] GI-11 (URL Safety) passes
- [ ] GI-12 (Performance) passes
- [ ] GI-13 (Error Handling) passes
- [ ] GI-14 (Security Hardening) passes
- [ ] **GI-15 (Deep Audit)** passes ← **CRITICAL**

**PR Checklist:** See MAINTENANCE-CHECKLIST-PR-TEMPLATE.md

---

### CI Integration

**Automated Checks (GitHub Actions):**
```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on: [push, pull_request]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # GI-7: Code Quality
      - name: TypeScript Check
        run: pnpm tsc --noEmit
      
      - name: Lint
        run: pnpm lint
      
      - name: Tests
        run: pnpm test
      
      # GI-8: Security
      - name: Security Audit
        run: pnpm audit --production
      
      # GI-15: Playwright (if frame changes detected)
      - name: Playwright Tests
        if: contains(github.event.head_commit.message, 'frame') || contains(github.event.head_commit.message, 'badge')
        run: pnpm playwright test
```

**Manual Checks (Before Staging):**
- GI-9: Frame metadata validation
- GI-10: Image compliance verification
- GI-11: URL safety audit
- GI-12: Performance benchmarks
- GI-13: Error handling tests
- GI-14: Security review
- GI-15: Full deep audit (manual + automated)

---

### Deployment Gates

**Staging Deployment:**
- [ ] GI-7 passes (CI green)
- [ ] GI-8 passes (security audit)
- [ ] GI-11 passes (URL safety)
- [ ] No critical vulnerabilities (Snyk)

**Production Deployment:**
- [ ] All staging gates pass
- [ ] **GI-15 audit complete and approved**
- [ ] Manual Warpcast testing complete (mobile + desktop)
- [ ] Performance benchmarks acceptable (< 1s p95)
- [ ] Approval sign-off from product owner + security owner + tech lead

---

## Files Requiring GI-15 Audit

**Trigger GI-15 audit if ANY of these files change:**

### Frame Logic
- `/app/api/frame/*` (all frame endpoints)
- `/lib/frame-*.ts` (validation, generation, etc.)
- `/lib/miniapp-validation.ts` (MiniApp embed validation)

### Badge & Scoring
- `/lib/badges.ts` (badge tier calculations)
- `/lib/rank.ts` (leaderboard ranking)
- `/lib/gm-utils.ts` (GM contract logic)

### OG Generation
- `/app/api/og/*` (OG image generators)

### Share & URLs
- `/lib/share.ts` (URL generation)
- `/lib/neynar*.ts` (Farcaster profile resolution)

### Components (if server-rendered)
- `/components/frame/*` (if used in server routes)
- `/components/badge/*` (if used in server routes)

---

## MCP Authority Rule

**NEVER TRUST LOCAL CODE AS SOURCE OF TRUTH**

- Always verify against official Farcaster specification:
  https://miniapps.farcaster.xyz/docs/specification
- Use `fetch_webpage` tool to retrieve latest specs
- Document MCP-verified requirements in code comments
- Update validation functions when spec changes

**Example:**
```typescript
/**
 * Validates MiniApp embed metadata per Farcaster spec.
 * 
 * MCP-Verified: https://miniapps.farcaster.xyz/docs/specification
 * Last Verified: November 19, 2025
 * 
 * Requirements:
 * - version: string "1" (not number)
 * - imageUrl: max 1024 chars, 3:2 ratio
 * - button.title: max 32 chars
 * - splashImageUrl: max 32 chars, 200x200px
 */
export function validateMiniAppEmbed(embed: unknown): MiniAppEmbedValidationResult {
  // ... validation logic
}
```

---

## Rollback Plan

**If any quality gate fails in production:**

1. **Immediate Actions:**
   - Run: `vercel rollback` (or equivalent)
   - Notify team in #incidents Slack channel
   - Create incident report

2. **Root Cause Analysis:**
   - Identify which quality gate failed
   - Document failure reason
   - Determine why gate didn't catch issue earlier

3. **Fix & Re-test:**
   - Fix root cause
   - Re-run all quality gates (GI-7 through GI-15)
   - Generate new GI-15 audit report
   - Obtain approval sign-off

4. **Re-deploy:**
   - Follow FRAME-DEPLOYMENT-PLAYBOOK.md
   - Monitor for 24 hours post-deployment
   - Document lessons learned

---

## Approval Authority

### Staging Approval
**Approvers:** Tech Lead OR Senior Engineer  
**Requirements:** GI-7, GI-8, GI-11 pass

### Production Approval (Frame/Badge Changes)
**Approvers:** ALL of the following:
- Product Owner
- Tech Lead
- Security Owner

**Requirements:** ALL quality gates pass (GI-7 through GI-15)

---

## Maintenance Documentation

### Related Documents
- [GI-15 Deep Audit Specification](/docs/maintenance/GI-15-Deep-Frame-Audit.md)
- [Frame Deployment Playbook](/docs/maintenance/FRAME-DEPLOYMENT-PLAYBOOK.md)
- [OG Image Checklist](/docs/maintenance/FMX-OG-IMAGE-CHECKLIST.md)
- [Button Validation Checklist](/docs/maintenance/FMX-BUTTON-VALIDATION-CHECKLIST.md)
- [Dependency Graph](/docs/maintenance/FMX-DEPENDENCY-GRAPH.md)
- [Warpcast Testing Guide](/docs/maintenance/STAGING-WARPCAST-TESTS.md)
- [PR Template](/docs/maintenance/MAINTENANCE-CHECKLIST-PR-TEMPLATE.md)

### Maintenance Folder Structure
```
docs/
  maintenance/
    GI-15-Deep-Frame-Audit.md
    FRAME-DEPLOYMENT-PLAYBOOK.md
    FMX-OG-IMAGE-CHECKLIST.md
    FMX-BUTTON-VALIDATION-CHECKLIST.md
    FMX-DEPENDENCY-GRAPH.md
    STAGING-WARPCAST-TESTS.md
    MAINTENANCE-CHECKLIST-PR-TEMPLATE.md
    GI-7-to-GI-15-OVERVIEW.md (this file)
    reports/
      GI-15-AUDIT-REPORT-20251119.md
      GI-15-AUDIT-REPORT-20251120.md
      ...
```

---

## References

- [Farcaster MiniApp Specification](https://miniapps.farcaster.xyz/docs/specification)
- [Open Graph Protocol](https://ogp.me/)
- [OWASP Security Guidelines](https://owasp.org/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** Frame Engineering Team + Security Team
