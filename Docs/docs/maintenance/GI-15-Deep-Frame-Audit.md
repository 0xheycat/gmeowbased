# GI-15: Deep Frame / MiniApp Coherence Audit (FULL SPEC)

## GI-15 — Deep Frame / MiniApp Coherence Audit

**Purpose:** Ensure full parity and safety between MiniApp UI + logic and any Frame/OG/Share outputs. Catch hidden dependencies (OG images, button targets, badge logic), avoid runtime failures in Warpcast, and prevent silent regressions.

### When:

- Before any release that touches frames, badges, scoring, onchain interactions, or share/embed logic.
- After PRs that change `/app/api/frame/*`, `/lib/frame-*`, `/lib/badges.ts`, `/app/api/og/*`, `/lib/neynar*`, `/lib/share.ts`, or any badge/score logic.

**Approval:** REQUIRED — GI-15 audit report must be reviewed and signed off by product owner/security owner before staging deployment.

## Audit Scope

- **Frame handlers:** `/app/api/frame/*`, `/app/api/frame/route.ts` and any split handlers (quest/guild/leaderboard/og).
- **OG image generators:** `/app/api/frame/og`, image build utilities, template assets, font loads.
- **Share & embed utilities:** `/lib/share.ts`, `/lib/frame-*.ts`, buildFrameHtml functions.
- **Badge & tier logic:** `/lib/badges.ts`, onboarding award flows, Neynar integration.
- **MiniApp components:** Layouts and components that supply titles/descriptions/buttons to frame endpoints.
- **Button targets:** Every URL the frame exposes (mint, claim, verify, referral) - ensure endpoints exist and are sanitized.
- **Dependency graph:** Transitive imports used in frame/OG generation (fonts, client-only code, CSS, assets).
- **Performance & timeouts:** OG image render time, external fetch timeouts, RPC read time.

## Acceptance Criteria (must pass all)

✅ No client-only imports (`window`, `document`, React DOM) in server frame or OG modules.

✅ OG images served as `https://` absolute URLs, correct MIME type, < 1MB, 1200×630 or 3:2 ratio.

✅ Frames return HTML with modern JSON meta (`fc:miniapp:frame` / `fc:frame` JSON pattern).

✅ **Mini App Embed:** Has ONE button only (singular `button` object per MCP spec).

✅ **Legacy Frames v1:** Max 4 buttons (backward compatibility) - `sanitizeButtons` enforced.

✅ **Action Types (Mini App):** Only `launch_frame` and `view_token` are valid.

✅ **Action Name:** REQUIRED field (Mini App name) for Mini App Embed.

✅ All frame buttons point to resolvable endpoints (HTTP 200 HTML) or valid external links.

✅ All inputs sanitized (`FID`, `questId`, `chain`, `cast`) - GI-8 checks present.

✅ No slow/generic synchronous blocking code causing >1s render in frame endpoints; OG rendering < 500ms preferred.

✅ Fonts used by OG are locally bundled and deterministic.

✅ MiniApp and Frame produce the same badge, tier, and score outputs for the same inputs (parity tests pass).

✅ Drift report (diff) generated if multiple sources disagree (e.g., `lib/badges` vs frame badge label).

✅ Test coverage: Playbook of automated tests exists (see Section B) and passes on staging.

**⚠️ MCP Verification (November 19, 2025):**
- Official Farcaster Mini App Embed spec: https://miniapps.farcaster.xyz/docs/specification
- Invalid action types (`link`, `post`, `mint`) will be rejected by Warpcast
- Legacy Frames v1 (`fc:frame`) supports max 4 buttons with different action types

## Deliverables of GI-15 Audit

- `GI-15-AUDIT-REPORT.md` (diffs, traces, failing tests if any).
- List of changed files & required fixes.
- "Quick fixes" section (e.g., replace client import with server-safe renderer).
- Risk matrix & rollback plan.
- Approval sign-off checklist.

---

## B — Playwright-MCP Test Plan (test scenarios & flows)

**Goal:** Automated, repeatable checks that frames render and behave in Warpcast-like contexts (3:2 image, JSON meta, <4 buttons, button targets valid).

### Test Suite Overview

- **Runner:** Playwright + custom MCP harness / Microsoft Playwright-MCP strategy (headless + user agent variations)
- **Environments:** Local, staging, production (staging first)
- **Data setups:** Mock Neynar, mock RPCs, fixtures for quests/badges

### Test Groups & Scenarios (priority order)

#### 1 — Frame HTML & Meta Validation

**Scenario:** `GET /api/frame?type=quest&chain=op&questId=202`

- Assert response `content-type: text/html`
- Assert HTML contains `<meta name="fc:frame" content=...>` JSON OR `<meta name="fc:miniapp:frame">`
- Assert `fc:frame:image` or embedded image JSON points to `https://` absolute URL
- Assert `fc:frame:image:aspect_ratio` or image metadata corresponds to 3:2 (or proper meta value)

**Scenario:** `GET /api/frame?type=leaderboard`

- Same meta + 4-button limit validation
- **Failure result:** Record screenshot + HTML dump, fail test.

#### 2 — Button Validation & Endpoints

For each frame response:

- Extract up to 4 button targets (from validated `sanitizeButtons` output or DOM).
- For each button:
  - `HEAD` or `GET` to target → expect 200 and `content-type: text/html` (unless external link - validate reachable & HTTPS).
  - For mint/tx targets, validate URL contains expected params or points to a valid mint endpoint.
  - Ensure no target points back to `/api/frame` (blocked by GI-11).
- **Failure:** List offending buttons + trace.

#### 3 — OG Image Integrity

- Request OG image URL returned in frame meta.
- Validate headers: `content-type: image/png|image/jpeg`
- Validate dimensions (probe image) = 1200 × 800 or 3:2 (tool can check image bytes)
- Validate size < 1MB and response time < 1s (staging)
- **Failure:** Flag generator, revert to placeholder fallback.

#### 4 — MiniApp ↔ Frame Parity Tests

Use canonical inputs (`fid`, `address`, `questId`). For each:

- Query MiniApp API/UI rendering for badge/tier/score
- Query Frame for the same input
- Compare critical fields: tier label, badge name, points reward, quest title
- **Failure:** Generate drift diff, show source file locations.

#### 5 — Input Validation (GI-8 enforcement)

Test invalid inputs:

- `fid=0`, `fid=999999999999999999` (out of range)
- `questId=-1`, `questId=1e9`
- `chain=unknown`
- `type=invalid_type`
- Expect HTTP 400 + validated error payload (or JSON error) and trace.

#### 6 — Performance / Timeouts

- **OG generation heavy-case test** (complex title + badges):
  - Ensure image generation runs under threshold (configurable)
- **Frame heavy-case test** (multiple external fetch):
  - Baseline assert < 1.5s for overall HTML response.

#### 7 — Warpcast MiniApp Simulation

- Use headless browser with UA similar to Warpcast miniapp.
- Load embed URL (simulate cast embed)
- Confirm frame displays image + primary button visible (not only button).
- Confirm no JS console errors.

#### 8 — Regression / Negative Tests

- Remove OG resources (simulate CDN down) and ensure frame falls back to placeholder image, not blank/no-image.

### Test Data & Mocks

- Mock Neynar responses for users, scores (use snapshot fixture).
- Mock RPC client for chain `readContract` calls (viem) returning stable quest structs.
- Use deterministic seeds for OG generator.

### Reporting & CI

- Failures upload HTML dump + screenshot + stack trace to CI artifact.
- Test exit codes non-zero on failure; block PRs failing critical tests.

---

## C — Maintenance Folder Structure (docs) & File Templates

Create `/docs/maintenance` (top-level) and populate with standardized files for audit, staging, deployment:

```text
/docs
  /maintenance
    GI-7-to-GI-15-OVERVIEW.md
    GI-15-Deep-Frame-Audit.md            <- This file
    FMX-OG-IMAGE-CHECKLIST.md
    FMX-BUTTON-VALIDATION-CHECKLIST.md
    FMX-DEPENDENCY-GRAPH.md
    FRAME-DEPLOYMENT-PLAYBOOK.md
    STAGING-WARPCAST-TESTS.md
    MAINTENANCE-CHECKLIST-PR-TEMPLATE.md
```

### Key Doc Templates to Include

- **MAINTENANCE-CHECKLIST-PR-TEMPLATE.md** - Include tickboxes for GI-7..GI-15, tests run, staging URL, artifact links, signer.
- **FRAME-DEPLOYMENT-PLAYBOOK.md** - Step-by-step deploy to staging → run Playwright tests → manual Warpcast checks → promote to prod.
- **FMX-OG-IMAGE-CHECKLIST.md** - Exact image spec, fallback behavior.
- **STAGING-WARPCAST-TESTS.md** - Manual steps for testing frames in Warpcast mobile/desktop/miniapp.

---

## D — Agent Rules & SOP to Avoid Forgetting Updates

**Goal:** Ensure your agent (automation/assistant) never leaves docs outdated again.

### Agent Behavior Rules (enforce in CI / bot)

1. **Auto-document commit hook:** On any commit modifying `/app/api/frame/*`, `/lib/frame-*`, `/app/api/og/*`, `/lib/badges.ts` → create/update `docs/maintenance/GI-15-CHANGELOG.md` with quick summary line (who, what, why).

2. **PR template gating:** PR modifying any frame/badge/og files must include GI-15 checklist in the PR description and attach `GI-15-AUDIT-REPORT.md` if generated.

3. **Auto-run on PR:**
   - Run "Frame meta scan" to detect deprecated patterns - fail CI if found.
   - Run Playwright-MCP sanity suite (fast subset) - attach results.

4. **Post-merge job:**
   - After merge to main, bot auto-creates `docs/maintenance/DEPLOY_RECORDS.md` entry with commit, change summary, and staging/prod URLs.

5. **Weekly doc sync job:**
   - Bot runs weekly: `rg -n "fc:frame|fc:miniapp:frame|buildFrameHtml|api/frame"` and compares to `docs/maintenance/*` - if new files touched and no docs change, open a reminder PR or issue "Document change required".

6. **Explicit "Doc update required" label:**
   - Any PR touching frame files must apply `doc-required` label; merging disabled unless label removed.

7. **Approval signals:**
   - Require at least one human sign-off on `GI-15-AUDIT-REPORT.md` before staging deployment.

---

## Current Implementation Status

### Completed (Stage 5.7-5.8)

✅ Frame image validation (3:2 ratio, 1200x800)  
✅ Button sanitization (max 4 buttons, 32 char titles)  
✅ URL safety (no `/api/frame` exposure, public routes only)  
✅ Input sanitization (FID, questId, chain validation)  
✅ Rate limiting (60 req/min per IP)  
✅ MiniApp embed validation (version, imageUrl, button structure)  
✅ Splash image compliance (200x200 PNG RGB)  

### Pending (Stage 5.9-5.10)

⏳ Playwright E2E test suite implementation  
⏳ Frame HTML & meta validation tests  
⏳ Button endpoint verification tests  
⏳ OG image integrity tests  
⏳ MiniApp ↔ Frame parity tests  
⏳ Performance & timeout benchmarks  
⏳ GI-15 audit report generation  

---

## Next Steps

1. **Implement Playwright test suite** (Stage 5.9)
   - Frame HTML & meta validation
   - Button validation & endpoint checks
   - OG image integrity tests
   - Input validation (GI-8) tests

2. **Run GI-15 audit** (Stage 5.10)
   - Generate audit report
   - Document any drifts or issues
   - Get approval sign-off
   - Update maintenance docs

3. **Establish CI integration**
   - Add GI-15 checks to PR workflow
   - Auto-run Playwright suite on frame changes
   - Block merges on critical failures

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Owner:** Engineering Team  
**Approval Required:** Yes (before staging deployment)
