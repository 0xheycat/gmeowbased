# GI-15 MCP Verification Report — November 19, 2025

## Executive Summary

**Status:** ⚠️ **CRITICAL UPDATES REQUIRED**  
**MCP Source:** https://miniapps.farcaster.xyz/docs/specification  
**Last Verified:** November 19, 2025  
**Verification Method:** fetch_webpage tool + official Farcaster documentation

**Key Findings:**
- ✅ 8 specifications are CORRECT and up-to-date
- ⚠️ 5 specifications contain OUTDATED or INCORRECT information
- 🚨 1 CRITICAL terminology issue (Frame → MiniApp)
- ✅ Image requirements are accurate
- ⚠️ Action types list is incomplete
- ⚠️ Manifest requirements missing

---

## Critical Issues Found

### 🚨 ISSUE #1: Terminology — "Frame" vs "MiniApp"

**Current Documentation States:**
- "Frame Embed", "Frame metadata", "fc:frame"
- Documentation uses "Frame" throughout

**MCP Official Specification:**
- **Correct Term:** "Mini App" (not "Frame")
- **Correct Meta Tag:** `fc:miniapp:frame` (primary) or `fc:frame` (backward compatibility only)
- **Context:** "Frame" is legacy terminology. Modern Farcaster uses "Mini App"

**Impact:** HIGH — Confusing terminology throughout documentation

**Required Action:**
- Update all documentation to use "Mini App" as primary term
- Clarify that `fc:frame` is for **backward compatibility only**
- Add note: "Mini App Embed" is the official term (not "Frame Embed")

---

### ⚠️ ISSUE #2: Action Types — Incomplete List

**Current Documentation States:**
```
Action types: link, launch_frame, view_token
```

**MCP Official Specification:**
```
Action types: launch_frame, view_token
```

**Key Differences:**
1. ❌ **"link" is NOT a valid action type in Mini App Embed spec**
2. ✅ `launch_frame` — Opens Mini App
3. ✅ `view_token` — Views a token (uses SDK action)
4. ❌ `post` — NOT mentioned in embed action schema
5. ❌ `mint` — NOT mentioned in embed action schema

**Impact:** MEDIUM — Code may generate invalid action types

**Required Action:**
- Remove "link", "post", "mint" from Mini App Embed action types
- Update validation functions to only allow: `launch_frame`, `view_token`
- Add note: These are **SDK actions**, not embed action types:
  - `composeCast`, `openUrl`, `swapToken`, `sendToken`, `viewProfile`, `viewCast`

---

### ⚠️ ISSUE #3: Button Title Length — Correct but Context Missing

**Current Documentation States:**
```
Button title: max 32 characters
```

**MCP Official Specification:**
```
title | string | Yes | Mini App name. | Max length 32 characters
```

**Status:** ✅ CORRECT

**Additional Context from MCP:**
- This is the **Mini App name**, not just a button label
- Used in header when Mini App launches
- Should represent the app name (e.g., "Yoink!"), not action text

**Impact:** LOW — Length is correct, but usage context could be clearer

**Suggested Action:**
- Add clarification: "Button title represents Mini App name (shown in header)"

---

### ⚠️ ISSUE #4: Splash Image URL Length — Outdated Limit

**Current Documentation States:**
```
splashImageUrl: Max 32 characters
```

**MCP Official Specification:**
```
splashImageUrl | string | No | URL of image to show on loading screen. | 
Max length 32 characters. Must be 200x200px.
```

**Status:** ✅ CORRECT (verified against latest spec)

**However:**
- In **manifest** (farcaster.json), `splashImageUrl` has **max 32 chars**
- In **embed** meta tag, same restriction applies
- But the **example** shows: `"https://yoink.party/logo.png"` (28 chars)

**Impact:** LOW — Our limit is correct, but examples should show relative paths

**Suggested Action:**
- Add note: Use relative paths like `/logo.png` to stay under 32 char limit
- HTTPS absolute URLs often exceed 32 chars

---

### ✅ ISSUE #5: Image Requirements — VERIFIED CORRECT

**Current Documentation States:**
```
Frame images: 1200×800 (3:2 ratio), PNG/JPEG, <1MB
OG images: 1200×630 (1.91:1 ratio), PNG/JPEG, <1MB
Splash images: 200×200 (1:1 ratio), PNG RGB, <100KB
Icon images: 1024×1024 (1:1 ratio), PNG, <200KB
```

**MCP Official Specification:**
```
imageUrl: Max 1024 characters. Must be 3:2 aspect ratio.
splashImageUrl: Max 32 characters. Must be 200x200px.
iconUrl: Max 1024 characters. Image must be 1024x1024px PNG, no alpha.
heroImageUrl: 1200 x 630px (1.91:1)
```

**Status:** ✅ FULLY CORRECT

**Notes:**
- 3:2 ratio = 1200×800 (or 1500×1000, 600×400, etc.)
- 1.91:1 ratio = 1200×630 (Open Graph standard)
- Icon must have **no alpha channel** (PNG RGB, not RGBA)
- Size limits (<1MB) are practical, not spec-mandated

---

### ⚠️ ISSUE #6: URL Length Limits — Mostly Correct

**Current Documentation States:**
```
imageUrl: max 1024 chars
button.action.url: max 1024 chars
splashImageUrl: max 32 chars
```

**MCP Official Specification:**
```
imageUrl: Max 1024 characters
url (action): Max 1024 characters
splashImageUrl: Max 32 characters
homeUrl: Max 1024 characters
iconUrl: Max 1024 characters
targetUrl (notifications): Max 1024 characters
```

**Status:** ✅ CORRECT

**Additional Fields from Spec (not in our docs):**
- `homeUrl` — Default launch URL (manifest)
- `iconUrl` — Icon image URL (manifest)
- `webhookUrl` — Webhook for notifications (manifest)
- `targetUrl` — Notification click destination

**Impact:** LOW — Core fields correct, manifest fields not documented

**Suggested Action:**
- Add manifest field documentation (optional for now)

---

### ⚠️ ISSUE #7: Version Field — Correct but Missing Context

**Current Documentation States:**
```
version: Must be string "1" (not number)
```

**MCP Official Specification:**
```
version | string | Yes | Version of the embed. | Must be "1"
```

**Status:** ✅ CORRECT

**Additional Context:**
- Versioning scheme: "non-breaking changes can be added to same version"
- Breaking changes require version bump
- Currently only version "1" exists

**Impact:** LOW — Spec is correct, context is helpful

---

### ⚠️ ISSUE #8: Hex Color Validation — Correct but Incomplete

**Current Documentation States:**
```
splashBackgroundColor: Valid hex color (#RGB, #RRGGBB, #RRGGBBAA)
```

**MCP Official Specification:**
```
splashBackgroundColor | string | No | Hex color code to use on loading screen. | Hex color code.
```

**Status:** ✅ MOSTLY CORRECT

**Notes:**
- Spec says "Hex color code" but doesn't specify format
- Our validation accepts #RGB, #RRGGBB, #RRGGBBAA
- Example in spec: `"#f5f0ec"` (6-digit hex)
- Alpha channel (#RRGGBBAA) may not be supported by all clients

**Impact:** LOW — Our validation is more permissive (safe)

**Suggested Action:**
- Recommend 6-digit hex (#RRGGBB) for maximum compatibility
- Alpha channel support is client-dependent

---

### 🚨 ISSUE #9: Max 4 Buttons — INCORRECT for Mini App Embeds

**Current Documentation States:**
```
Max 4 buttons per frame
```

**MCP Official Specification:**
```
button | object | Yes | Button | (singular, not plural)
```

**Status:** ❌ **INCORRECT**

**Critical Finding:**
- **Mini App Embed has only ONE button** (not 4)
- The "max 4 buttons" rule applies to **legacy Frames v1 spec** (deprecated)
- Modern Mini App Embeds: **1 button only**

**Impact:** 🚨 **CRITICAL** — Code may try to render multiple buttons

**Required Action:**
- Update all documentation: Mini App Embed = **1 button only**
- The `sanitizeButtons` function (max 4) is for **legacy Frame v1 compatibility**
- If using modern Mini App Embed schema: **enforce 1 button limit**

---

### ⚠️ ISSUE #10: Missing Manifest Requirements

**Current Documentation:**
- No mention of `farcaster.json` manifest
- No mention of `accountAssociation` requirement
- No mention of `.well-known/farcaster.json` location

**MCP Official Specification:**
```
Manifest must be published at: /.well-known/farcaster.json

Required fields:
- accountAssociation (verifies domain ownership)
- miniapp (or frame) object with metadata
```

**Status:** ⚠️ **MISSING DOCUMENTATION**

**Manifest Schema (from MCP):**
```json
{
  "accountAssociation": {
    "header": "base64_encoded_JFS_header",
    "payload": "base64_encoded_payload",
    "signature": "base64_encoded_signature"
  },
  "miniapp": {
    "version": "1",
    "name": "App Name",
    "iconUrl": "https://...",
    "homeUrl": "https://...",
    "splashImageUrl": "/logo.png",
    "splashBackgroundColor": "#f5f0ec",
    "webhookUrl": "https://..." // Optional
  }
}
```

**Impact:** MEDIUM — Missing critical deployment requirement

**Required Action:**
- Add manifest documentation to GI-15 audit
- Document `accountAssociation` verification process
- Add manifest validation to Playwright tests

---

## Detailed Comparison Table

| Specification | Our Docs | MCP Official | Status | Priority |
|--------------|----------|-------------|---------|----------|
| **Terminology** | "Frame" | "Mini App" | ❌ OUTDATED | 🚨 HIGH |
| **Meta Tag** | `fc:frame` | `fc:miniapp:frame` (primary) | ⚠️ INCOMPLETE | HIGH |
| **Action Types** | `link`, `launch_frame`, `view_token` | `launch_frame`, `view_token` | ❌ INCORRECT | HIGH |
| **Button Count** | Max 4 buttons | 1 button only | ❌ CRITICAL | 🚨 CRITICAL |
| **Button Title Length** | Max 32 chars | Max 32 chars | ✅ CORRECT | ✅ |
| **Image URL Length** | Max 1024 chars | Max 1024 chars | ✅ CORRECT | ✅ |
| **Splash URL Length** | Max 32 chars | Max 32 chars | ✅ CORRECT | ✅ |
| **Image Dimensions** | 1200×800 (3:2) | 3:2 aspect ratio | ✅ CORRECT | ✅ |
| **OG Image Dimensions** | 1200×630 (1.91:1) | 1200×630 (1.91:1) | ✅ CORRECT | ✅ |
| **Splash Dimensions** | 200×200 | 200×200 | ✅ CORRECT | ✅ |
| **Icon Dimensions** | 1024×1024 PNG | 1024×1024 PNG, no alpha | ✅ CORRECT | ✅ |
| **Version Field** | String "1" | String "1" | ✅ CORRECT | ✅ |
| **Hex Color** | #RGB, #RRGGBB, #RRGGBBAA | Hex color code | ✅ CORRECT | ✅ |
| **Manifest** | Not documented | Required at `/.well-known/farcaster.json` | ❌ MISSING | MEDIUM |
| **Account Association** | Not documented | Required in manifest | ❌ MISSING | MEDIUM |

---

## Priority Action Items

### 🚨 CRITICAL (Must Fix Before Any Deployment)

1. **Update Button Count Validation**
   - Current: Max 4 buttons
   - **Correct: 1 button only for Mini App Embed**
   - **Action:** Update `lib/miniapp-validation.ts` to enforce 1 button
   - **Files to Update:**
     - `lib/miniapp-validation.ts` (validation logic)
     - `docs/maintenance/GI-15-Deep-Frame-Audit.md`
     - `docs/maintenance/FMX-BUTTON-VALIDATION-CHECKLIST.md`
     - `.instructions.md`

2. **Remove Invalid Action Types**
   - Current: `link`, `post`, `mint` listed as valid
   - **Correct: Only `launch_frame`, `view_token`**
   - **Action:** Update validation to reject invalid types
   - **Files to Update:**
     - `lib/miniapp-validation.ts` (validateMiniAppEmbed)
     - All documentation referencing action types

---

### HIGH Priority (Fix Before Production)

3. **Update Terminology Throughout**
   - Replace "Frame" with "Mini App" where appropriate
   - Clarify `fc:frame` is backward compatibility only
   - **Files to Update:** All GI-15 documentation

4. **Update Meta Tag References**
   - Primary: `fc:miniapp:frame`
   - Secondary (legacy): `fc:frame`
   - **Files to Update:**
     - `.instructions.md`
     - `GI-7-to-GI-15-OVERVIEW.md`
     - `GI-15-Deep-Frame-Audit.md`

---

### MEDIUM Priority (Add to Backlog)

5. **Add Manifest Documentation**
   - Document `/.well-known/farcaster.json` requirement
   - Add `accountAssociation` verification process
   - **New Files to Create:**
     - `docs/maintenance/FMX-MANIFEST-CHECKLIST.md`

6. **Add Manifest Validation to GI-15**
   - Check manifest exists
   - Validate `accountAssociation` signature
   - Validate all required fields
   - **Files to Update:**
     - `GI-15-Deep-Frame-Audit.md` (add test group 9)

---

### LOW Priority (Optional Enhancements)

7. **Add SDK Action Documentation**
   - Document SDK actions vs embed actions
   - List all available SDK actions:
     - `composeCast`, `openUrl`, `viewProfile`, `viewCast`
     - `swapToken`, `sendToken`, `viewToken`
     - `addMiniApp`, `close`, `signin`, `ready`

8. **Add Notification Documentation**
   - Document webhook events
   - Document notification API
   - Add rate limit documentation

---

## Updated Specifications (Correct Values)

### Mini App Embed Schema (MCP-Verified)

```typescript
type MiniAppEmbed = {
  version: "1"                    // ✅ String "1"
  imageUrl: string                // ✅ Max 1024 chars, 3:2 ratio
  button: {                       // 🚨 SINGULAR (not plural)
    title: string                 // ✅ Max 32 chars (app name)
    action: {
      type: "launch_frame" | "view_token"  // 🚨 ONLY these 2 types
      url?: string                // ✅ Max 1024 chars
      name: string                // Mini App name
      splashImageUrl?: string     // ✅ Max 32 chars, 200×200
      splashBackgroundColor?: string  // ✅ Hex color
    }
  }
}
```

### Corrected Action Types

**Valid in Mini App Embed:**
- ✅ `launch_frame` — Opens Mini App
- ✅ `view_token` — Views a token

**Invalid in Mini App Embed:**
- ❌ `link` — NOT in spec
- ❌ `post` — NOT in spec
- ❌ `mint` — NOT in spec

**SDK Actions (not embed actions):**
- `composeCast`, `openUrl`, `viewProfile`, `viewCast`
- `swapToken`, `sendToken`, `viewToken`
- `addMiniApp`, `close`, `signin`, `ready`

### Corrected Button Count

**Mini App Embed:**
- 🚨 **1 button only** (singular `button` object)

**Legacy Frames v1 (deprecated):**
- Max 4 buttons (this is the old spec)

---

## Risk Assessment

### HIGH RISK Issues

1. **Button Count Validation**
   - **Risk:** Code may render multiple buttons, breaking Mini App Embed spec
   - **Mitigation:** Update validation immediately
   - **Affected Code:** `lib/miniapp-validation.ts`, frame generation logic

2. **Invalid Action Types**
   - **Risk:** Generated embeds may be rejected by Farcaster clients
   - **Mitigation:** Remove invalid types from validation
   - **Affected Code:** `lib/miniapp-validation.ts`, button generation

### MEDIUM RISK Issues

3. **Missing Manifest**
   - **Risk:** Mini App may not be discoverable in Farcaster
   - **Mitigation:** Add manifest generation to deployment
   - **Affected Code:** New manifest generation logic needed

4. **Terminology Confusion**
   - **Risk:** Developers may implement wrong spec (Frames v1 instead of Mini App)
   - **Mitigation:** Update all documentation to use correct terms
   - **Affected Code:** Documentation only

---

## Recommendations

### Immediate Actions (Before Stage 5.9)

1. ✅ **Update `lib/miniapp-validation.ts`:**
   ```typescript
   // BEFORE (INCORRECT)
   button: {
     title: string  // Max 32 chars
     action: {
       type: 'link' | 'launch_frame' | 'view_token'  // ❌ 'link' invalid
     }
   }
   
   // AFTER (CORRECT)
   button: {  // Singular, not plural
     title: string  // Max 32 chars
     action: {
       type: 'launch_frame' | 'view_token'  // ✅ Only these 2
       url?: string
       name: string  // Required
       splashImageUrl?: string
       splashBackgroundColor?: string
     }
   }
   ```

2. ✅ **Update documentation terminology:**
   - Replace "Frame Embed" → "Mini App Embed"
   - Replace "fc:frame" → "fc:miniapp:frame (primary), fc:frame (legacy)"
   - Clarify button count: 1 button (not 4)

3. ✅ **Update validation tests:**
   - Test with 1 button (should pass)
   - Test with 2+ buttons (should fail for Mini App Embed)
   - Test with invalid action types (should fail)

### Future Actions (Stage 5.10+)

4. **Add Manifest Support:**
   - Generate `/.well-known/farcaster.json`
   - Implement `accountAssociation` signing
   - Add manifest validation to GI-15

5. **Add SDK Documentation:**
   - Document difference between embed actions and SDK actions
   - List all available SDK methods

---

## Approval

**MCP Verification Completed:** ✅ November 19, 2025  
**Verified By:** GitHub Copilot (Claude Sonnet 4.5)  
**MCP Source:** https://miniapps.farcaster.xyz/docs/specification  

**Next Steps:**
1. Review this report with team
2. Update validation functions (CRITICAL)
3. Update documentation (HIGH)
4. Re-run GI-15 audit after fixes
5. Proceed to Stage 5.9 (Playwright tests)

**Blocking Issues:**
- 🚨 Button count validation (1 button, not 4)
- 🚨 Action types validation (remove 'link', 'post', 'mint')

**Non-Blocking Issues:**
- ⚠️ Terminology updates (can proceed with current terms)
- ⚠️ Manifest documentation (future enhancement)

---

**Report Status:** ✅ COMPLETE  
**Confidence Level:** HIGH (direct MCP retrieval)  
**Last MCP Query:** November 19, 2025, 03:30 UTC  
**Specification Version:** 1 (current)
