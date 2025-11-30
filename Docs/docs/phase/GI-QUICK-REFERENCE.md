# GI-7 to GI-13 Quick Reference Guide

**Quick validation checklist for Phase 5 and beyond**

---

## ✅ GI-7: MCP Spec Sync (Before Phase Start)
```bash
# Query MCP servers before starting new phase
# Neynar: User scores, cast engagement, webhooks
# Supabase: RLS policies, database schema, functions
# Coinbase: Wallet integration, OnchainKit APIs
```
**Approval:** REQUIRED - Wait for user confirmation

---

## ✅ GI-8: File-Level API Sync (Before File Edit)
```bash
# Check API drift before editing files with external API calls
# Compare against: Neynar SDK docs, Supabase docs, OnchainKit docs
```
**Files to check:**
- `/api/**` routes (Next.js API endpoints)
- `/frame/**` handlers (Farcaster frames)
- Share URL generators (`lib/share.ts`, `lib/frame-badge.ts`)
- Neynar SDK calls (`lib/neynar-server.ts`, `lib/neynar.ts`)

---

## ✅ GI-9: Code Quality (Before Phase Complete)
```bash
# TypeScript validation
npx tsc --noEmit

# ESLint validation
npm run lint

# Result: 0 errors, 0 warnings
```

---

## ✅ GI-10: Performance (During Development)
**Targets:**
- Page load: < 2s
- Animations: 60fps
- API response: < 200ms

**Checks:**
- GPU-accelerated CSS (transform, opacity)
- Image lazy loading
- API response caching
- CDN for static assets

---

## ✅ GI-11: Security (Before Deployment)
```bash
# Check Supabase security advisors
# Look for: RLS disabled, missing policies, SECURITY DEFINER views
```

**Critical checks:**
- ✅ All public tables have RLS enabled
- ✅ All tables have appropriate RLS policies
- ✅ Functions have fixed search_path
- ✅ URL validation for user-provided URLs
- ✅ Auth checks on all protected routes

---

## ✅ GI-12: Frame Compliance (Frame Code Only)
**Rules:**
- Maximum 4 buttons per frame
- Correct button types: `post`, `post_redirect`, `link`, `mint`, `tx`
- Required fields: `title`, `action.type`, `action.url`
- No deprecated fields

**Example:**
```typescript
// ✅ VALID vNext button
{
  title: "View Profile",
  action: {
    type: "link",
    url: "https://gmeowhq.art/profile/123"
  }
}
```

---

## ✅ GI-13: UI/UX Audit (Optional, Ask First)
**Scores to target:**
- Accessibility: 90+ (WCAG AA)
- Mobile: 90+ (44px+ touch targets)
- macOS: 90+ (SF Pro fonts, glassmorphism)

**Checks:**
- Color contrast ratio: 4.5:1 minimum
- Keyboard navigation: Tab order, focus states
- Screen reader: ARIA labels, roles
- Touch targets: 44x44px minimum (iOS), 48x48px (Android)

---

## 🚦 When to Run Each Gate

| Gate | When | Approval |
|------|------|----------|
| GI-7 | Before starting new phase | ✅ REQUIRED |
| GI-8 | Before editing API files | ⚠️ If drift detected |
| GI-9 | Before phase completion | ✅ REQUIRED |
| GI-10 | During development | ⏳ Continuous |
| GI-11 | Before deployment | ✅ REQUIRED |
| GI-12 | When editing frame code | ✅ REQUIRED |
| GI-13 | UI/UX changes | ❓ Ask user first |

---

## 📊 Phase 5 GI Compliance

| Gate | Status | Score |
|------|--------|-------|
| GI-7 | ✅ PASS | 100/100 |
| GI-8 | ✅ PASS | 100/100 |
| GI-9 | ✅ PASS | 100/100 |
| GI-10 | ✅ PASS | 95/100 |
| GI-11 | ✅ PASS | 96/100 |
| GI-12 | ✅ PASS | 100/100 |
| GI-13 | ✅ PASS | 92/100 |

**Overall:** 96/100 ✅

---

## 🔗 Full Documentation

- **Detailed Audit:** `/docs/phase/PHASE5-GI-AUDIT.md`
- **Summary Report:** `/docs/phase/PHASE5-GI-SUMMARY.md`
- **Global Instructions:** `vscode-userdata:/home/heycat/.config/Code/User/prompts/farcaster.instructions.md`

---

**Last Updated:** November 16, 2025  
**Version:** 1.0.0
