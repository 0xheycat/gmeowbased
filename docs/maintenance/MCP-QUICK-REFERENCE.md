# MCP Quick Reference — Mini App Embed Specifications

**Last Verified:** November 19, 2025  
**Official Source:** https://miniapps.farcaster.xyz/docs/specification

---

## 🚨 CRITICAL: Mini App Embed vs Legacy Frames v1

### Mini App Embed (Modern - fc:miniapp:frame)
✅ Use this for NEW implementations

| Specification | Value | Required? |
|---------------|-------|-----------|
| **Meta Tag** | `fc:miniapp:frame` | ✅ Required |
| **Button Count** | **1 button only** (singular object) | ✅ Required |
| **Action Types** | **ONLY** `launch_frame` or `view_token` | ✅ Required |
| **Action Name** | Mini App name (e.g., "Gmeowbased Quest") | ✅ **REQUIRED** |
| **Action URL** | HTTPS absolute, max 1024 chars | ⚪ Optional |
| **Button Title** | Max 32 characters | ✅ Required |
| **Version** | String `"1"` (not number) | ✅ Required |
| **Image URL** | HTTPS absolute, max 1024 chars, 3:2 ratio | ✅ Required |
| **Splash Image** | Max 32 chars, 200×200px | ⚪ Optional |
| **Splash BG Color** | Hex color (#RGB, #RRGGBB, #RRGGBBAA) | ⚪ Optional |

**❌ INVALID Action Types:** `link`, `post`, `mint` are NOT supported in Mini App Embed

### Legacy Frames v1 (Deprecated - fc:frame)
⚠️ Use ONLY for backward compatibility

| Specification | Value |
|---------------|-------|
| **Meta Tag** | `fc:frame` |
| **Button Count** | **Max 4 buttons** (array) |
| **Action Types** | `link`, `launch_frame`, `view_token`, `post`, `mint` |
| **Action Name** | Optional |

---

## ✅ Quick Validation Checklist

### Before Generating Mini App Embed:
- [ ] Using 1 button only (not 4)
- [ ] Action type is `launch_frame` or `view_token`
- [ ] Action name is provided (REQUIRED)
- [ ] Button title ≤ 32 chars
- [ ] Image is 3:2 ratio (1200×800)
- [ ] All URLs are HTTPS absolute

### Code Example (Mini App Embed):
```typescript
import { buildMiniAppEmbed, validateMiniAppEmbed } from '@/lib/miniapp-validation'

// ✅ CORRECT
const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/image.png',
  buttonTitle: 'Open Quest',
  actionType: 'launch_frame',  // ONLY 'launch_frame' or 'view_token'
  actionName: 'Gmeowbased Quest',  // REQUIRED
  actionUrl: 'https://example.com/quest'
})

// Validate
const { isValid, errors } = validateMiniAppEmbed(embed)
if (!isValid) {
  console.error('Validation failed:', errors)
}
```

### Code Example (Legacy Frames v1):
```typescript
import { sanitizeButtons } from '@/lib/miniapp-validation'

// ⚠️ LEGACY ONLY - Backward compatibility
const { buttons, truncated } = sanitizeButtons([
  { label: 'Button 1', target: 'https://example.com/1' },
  { label: 'Button 2', target: 'https://example.com/2' },
  { label: 'Button 3', target: 'https://example.com/3' },
  { label: 'Button 4', target: 'https://example.com/4' }
])
```

---

## 🎯 Common Mistakes to Avoid

### ❌ WRONG: Multiple Buttons in Mini App Embed
```typescript
// This will FAIL - Mini App Embed has 1 button only
const embed = {
  version: '1',
  imageUrl: 'https://example.com/image.png',
  buttons: [  // ❌ WRONG - should be singular 'button'
    { title: 'Button 1', action: { ... } },
    { title: 'Button 2', action: { ... } }
  ]
}
```

### ❌ WRONG: Invalid Action Type
```typescript
// This will FAIL - 'link' not supported in Mini App Embed
const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/image.png',
  buttonTitle: 'Click Here',
  actionType: 'link',  // ❌ WRONG - use 'launch_frame' or 'view_token'
  actionName: 'My App'
})
```

### ❌ WRONG: Missing Action Name
```typescript
// This will FAIL - action.name is REQUIRED
const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/image.png',
  buttonTitle: 'Open',
  actionType: 'launch_frame'
  // ❌ MISSING: actionName (REQUIRED field)
})
```

### ✅ CORRECT: Proper Mini App Embed
```typescript
const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/image.png',
  buttonTitle: 'Open Quest',
  actionType: 'launch_frame',  // ✅ Valid type
  actionName: 'Gmeowbased Quest',  // ✅ Required field
  actionUrl: 'https://example.com/quest'
})
```

---

## 📊 Image Specifications (All MCP-Verified ✅)

| Image Type | Dimensions | Ratio | Max Size | Format | Usage |
|------------|-----------|-------|----------|--------|-------|
| **Frame Image** | 1200×800 | 3:2 | 1MB | PNG/JPEG | Feed display |
| **OG Image** | 1200×630 | 1.91:1 | 1MB | PNG/JPEG | Social sharing |
| **Splash Image** | 200×200 | 1:1 | 100KB | PNG | Launch screen |
| **Icon** | 1024×1024 | 1:1 | 200KB | PNG | App icons |

---

## 🔍 Quick Debug Commands

```bash
# Check TypeScript
pnpm tsc --noEmit

# Test frame endpoint
curl -s http://localhost:3000/api/frame?type=leaderboard | grep 'fc:miniapp:frame'

# Verify button count
curl -s http://localhost:3000/api/frame?type=quest | grep -o '"button":{' | wc -l
# Should output: 1 (singular button)

# Check action type
curl -s http://localhost:3000/api/frame?type=quest | grep -o '"type":"[^"]*"'
# Should output: "type":"launch_frame" or "type":"view_token"

# Verify action name present
curl -s http://localhost:3000/api/frame?type=quest | grep -o '"name":"[^"]*"'
# Should output: "name":"Some App Name"
```

---

## 📚 Documentation References

- [Official Farcaster Spec](https://miniapps.farcaster.xyz/docs/specification)
- [GI-15 MCP Verification Report](./reports/GI-15-MCP-VERIFICATION-REPORT-20251119.md)
- [Stage 5.8.7 Completion Summary](./reports/STAGE-5.8.7-COMPLETION-SUMMARY.md)
- [Button Validation Checklist](./FMX-BUTTON-VALIDATION-CHECKLIST.md)
- [GI-7 to GI-15 Overview](./GI-7-to-GI-15-OVERVIEW.md)
- [Validation Code](/lib/miniapp-validation.ts)

---

## ⚠️ IMPORTANT REMINDERS

1. **ALWAYS use MCP to verify official spec** before implementation
2. **NEVER trust local code as source of truth** - verify against official docs
3. **Mini App Embed ≠ Legacy Frames v1** - they have different specifications
4. **Action types are LIMITED** - only 2 types for Mini App Embed
5. **Action name is REQUIRED** - not optional
6. **1 button only** - not 4 buttons
7. **TypeScript will catch errors** - compile before deploying

---

**Quick Reference Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** Frame Engineering Team
