# FMX — Button Validation Checklist

## Overview

Frame buttons are the primary interaction mechanism in Farcaster frames. Proper validation ensures buttons work correctly, meet specification requirements, and provide a secure user experience.

---

## MCP-Verified Requirements

**Source:** https://miniapps.farcaster.xyz/docs/specification  
**Last Verified:** November 19, 2025

### Button Limits (Mini App Embed vs Legacy Frames v1)

**⚠️ CRITICAL - Two Different Standards:**

#### Mini App Embed (Modern - fc:miniapp:frame)
- **Button Count:** ONE button only (singular `button` object, not array)
- **Action Types:** ONLY `launch_frame` and `view_token` (per MCP spec)
- **Action Name:** REQUIRED field (Mini App name)
- **Invalid Types:** `link`, `post`, `mint` are NOT supported in Mini App Embed
- **Meta Tag:** `fc:miniapp:frame` (primary), `fc:frame` (backward compatibility)

#### Legacy Frames v1 (Deprecated - fc:frame)
- **Maximum Buttons:** 4 per frame (array of buttons)
- **Action Types:** `link`, `launch_frame`, `view_token`, `post`, `mint`
- **Truncation:** Excess buttons beyond 4 must be dropped
- **Use Case:** Backward compatibility only

### Button Title (Both Standards)
- **Max Length:** 32 characters
- **Min Length:** 1 character
- **Encoding:** UTF-8 (emojis allowed)
- **Sanitization:** Required (HTML entities, XSS prevention)
- **Truncation:** Auto-truncate at 32 chars with warning

### Button Actions (Both Standards)
- **Target URL:** HTTPS absolute, max 1024 chars (Mini App Embed)
- **Validation:** URL must be valid and reachable
- **Security:** No `/api/frame` exposure, use `/frame/*` routes

### Button Labels (Common Patterns)
- "🚩 Start"
- "GM ☀️"
- "Claim Badge 🏆"
- "View Leaderboard"
- "Next →"

---

## Pre-Validation Checklist

### Design Phase (Mini App Embed)
- [ ] Using 1 button only (singular object)
- [ ] Action type is `launch_frame` or `view_token` ONLY
- [ ] Action name (Mini App name) specified (REQUIRED)
- [ ] Button label clear and actionable
- [ ] Label fits within 32 chars
- [ ] Emojis render correctly

### Design Phase (Legacy Frames v1)
- [ ] Button count ≤ 4
- [ ] Button labels clear and actionable
- [ ] Button order logical (primary action first)
- [ ] Labels fit within 32 chars
- [ ] Emojis render correctly

### Code Review (Both Standards)
- [ ] Correct validation function used (`validateMiniAppEmbed` or `sanitizeButtons`)
- [ ] All button targets validated
- [ ] No hardcoded `/api/frame` URLs
- [ ] Error handling for invalid buttons
- [ ] Logging for validation failures

---

## Validation Implementation

### Using validateMiniAppEmbed (Modern Mini App Embed)

```typescript
import { validateMiniAppEmbed, buildMiniAppEmbed } from '@/lib/miniapp-validation'

// Build Mini App Embed with 1 button
const embed = buildMiniAppEmbed({
  imageUrl: 'https://example.com/image.png',
  buttonTitle: 'Open App',
  actionType: 'launch_frame',  // Only 'launch_frame' or 'view_token'
  actionName: 'My Mini App',   // REQUIRED (Mini App name)
  actionUrl: 'https://miniapp.example.com'
})

// Validate the embed
const { isValid, errors, warnings } = validateMiniAppEmbed(embed)

if (!isValid) {
  console.error('Mini App Embed validation failed:', errors)
  // errors: Array of validation errors
}

if (warnings.length > 0) {
  console.warn('Mini App Embed warnings:', warnings)
}

// embed.button is a SINGULAR object:
// {
//   title: 'Open App',
//   action: {
//     type: 'launch_frame',
//     name: 'My Mini App',
//     url: 'https://miniapp.example.com'
//   }
// }
```

### Using sanitizeButtons (Legacy Frames v1)

```typescript
import { sanitizeButtons } from '@/lib/miniapp-validation'

// Example usage for legacy frames (max 4 buttons)
const rawButtons = [
  { label: 'This is a very long button title that exceeds 32 characters', target: '...' },
  { label: 'GM ☀️', target: 'https://example.com/gm' },
  { label: 'Claim', target: 'https://example.com/claim' },
  { label: 'Info', target: 'https://example.com/info' },
  { label: 'Extra', target: 'https://example.com/extra' }, // Will be dropped (5th button)
]

const { buttons, truncated, originalCount, invalidTitles } = sanitizeButtons(rawButtons)

// buttons: Array of max 4 valid buttons with titles ≤ 32 chars
// truncated: true if originalCount > 4
// originalCount: 5
// invalidTitles: ['This is a very long button title that exceeds 32 characters']
```

### Validation Rules

**Mini App Embed Validation (lib/miniapp-validation.ts):**

```typescript
// Validates single button with strict MCP requirements
export function validateMiniAppEmbed(embed: MiniAppEmbed): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate button object (singular)
  if (!embed.button || typeof embed.button !== 'object') {
    errors.push('button object is REQUIRED')
  }

  // Validate button title
  if (!embed.button.title || embed.button.title.length > 32) {
    errors.push('button.title must be 1-32 characters')
  }

  // Validate action type (ONLY 2 valid types)
  const validTypes = ['launch_frame', 'view_token']
  if (!validTypes.includes(embed.button.action.type)) {
    errors.push(`button.action.type must be one of: ${validTypes.join(', ')} ` +
                '(MCP spec does not support "link", "post", or "mint")')
  }

  // Validate action name (REQUIRED)
  if (!embed.button.action.name || typeof embed.button.action.name !== 'string') {
    errors.push('button.action.name is REQUIRED (Mini App name)')
  }

  // Validate URL if provided (optional)
  if (embed.button.action.url != null) {
    if (typeof embed.button.action.url !== 'string') {
      errors.push('button.action.url must be a string')
    }
    if (embed.button.action.url.length > 1024) {
      errors.push('button.action.url must be ≤ 1024 characters')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
```

**Legacy Frames v1 Validation (lib/miniapp-validation.ts):**

```typescript
// lib/miniapp-validation.ts (sanitizeButtons for legacy frames)
export function sanitizeButtons(buttons: any): {
  buttons: Array<{ label: string; target: string }>
  truncated: boolean
  originalCount: number
  invalidTitles: string[]
} {
  if (!Array.isArray(buttons)) {
    return { buttons: [], truncated: false, originalCount: 0, invalidTitles: [] }
  }

  const MAX_BUTTONS = 4
  const MAX_TITLE_LENGTH = 32
  const invalidTitles: string[] = []

  const sanitized = buttons
    .slice(0, MAX_BUTTONS) // Enforce max 4 buttons
    .map(btn => {
      if (!btn || typeof btn !== 'object') return null
      
      let label = String(btn.label || '').trim()
      if (label.length > MAX_TITLE_LENGTH) {
        invalidTitles.push(label)
        label = label.substring(0, MAX_TITLE_LENGTH) // Truncate
        console.warn(`Button title truncated to ${MAX_TITLE_LENGTH} chars`)
      }
      
      const target = sanitizeUrl(btn.target)
      if (!target) return null
      
      return { label, target }
    })
    .filter((btn): btn is { label: string; target: string } => btn !== null)

  return {
    buttons: sanitized,
    truncated: buttons.length > MAX_BUTTONS,
    originalCount: buttons.length,
    invalidTitles
  }
}
```

---

## Testing Checklist

### Unit Tests (Mini App Embed)

```typescript
// __tests__/lib/miniapp-validation.test.ts
import { validateMiniAppEmbed, buildMiniAppEmbed } from '@/lib/miniapp-validation'

describe('validateMiniAppEmbed', () => {
  test('validates single button (not array)', () => {
    const embed = buildMiniAppEmbed({
      imageUrl: 'https://example.com/image.png',
      buttonTitle: 'Open App',
      actionType: 'launch_frame',
      actionName: 'My Mini App',
      actionUrl: 'https://miniapp.example.com'
    })
    
    const result = validateMiniAppEmbed(embed)
    expect(result.isValid).toBe(true)
    expect(result.errors.length).toBe(0)
  })
  
  test('rejects invalid action type', () => {
    const embed = {
      version: '1',
      imageUrl: 'https://example.com/image.png',
      button: {
        title: 'Click',
        action: {
          type: 'link',  // Invalid for Mini App Embed
          name: 'App',
          url: 'https://example.com'
        }
      }
    }
    
    const result = validateMiniAppEmbed(embed)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(expect.stringContaining('launch_frame'))
  })
  
  test('requires action name', () => {
    const embed = {
      version: '1',
      imageUrl: 'https://example.com/image.png',
      button: {
        title: 'Click',
        action: {
          type: 'launch_frame',
          // Missing required 'name' field
          url: 'https://example.com'
        }
      }
    }
    
    const result = validateMiniAppEmbed(embed)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(expect.stringContaining('name is REQUIRED'))
  })
  
  test('truncates long titles to 32 chars', () => {
    const longTitle = 'This is a very long button title that exceeds 32 characters'
    const embed = buildMiniAppEmbed({
      imageUrl: 'https://example.com/image.png',
      buttonTitle: longTitle,
      actionType: 'launch_frame',
      actionName: 'App'
    })
    
    expect(embed.button.title.length).toBeLessThanOrEqual(32)
  })
})
```

### Unit Tests (Legacy Frames v1)

```typescript
// __tests__/lib/miniapp-validation.test.ts
import { sanitizeButtons } from '@/lib/miniapp-validation'

describe('sanitizeButtons (Legacy Frames v1)', () => {
  test('enforces max 4 buttons', () => {
    const buttons = [
      { label: 'Button 1', target: 'https://example.com/1' },
      { label: 'Button 2', target: 'https://example.com/2' },
      { label: 'Button 3', target: 'https://example.com/3' },
      { label: 'Button 4', target: 'https://example.com/4' },
      { label: 'Button 5', target: 'https://example.com/5' }, // Should be dropped
    ]
    
    const result = sanitizeButtons(buttons)
    expect(result.buttons.length).toBe(4)
    expect(result.truncated).toBe(true)
    expect(result.originalCount).toBe(5)
  })
  
  test('truncates long titles to 32 chars', () => {
    const buttons = [
      { label: 'This is a very long button title that exceeds 32 characters', target: 'https://example.com' }
    ]
    
    const result = sanitizeButtons(buttons)
    expect(result.buttons[0].label.length).toBeLessThanOrEqual(32)
    expect(result.invalidTitles.length).toBe(1)
  })
  
  test('handles invalid URLs', () => {
    const buttons = [
      { label: 'Valid', target: 'https://example.com' },
      { label: 'Invalid', target: 'not-a-url' },
    ]
    
    const result = sanitizeButtons(buttons)
    expect(result.buttons.length).toBe(1)
    expect(result.buttons[0].label).toBe('Valid')
  })
})
```

### Integration Tests

```bash
# Test frame endpoint returns valid buttons
curl -s https://yourdomain.com/api/frame?type=quest | \
  grep -o '"button":{[^}]*}' | \
  grep -o '"title":"[^"]*"'

# Expected: "title":"GM ☀️" (or similar, ≤ 32 chars)
```

### E2E Tests (Playwright)

```typescript
// e2e/button-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Mini App Embed Button Validation', () => {
  test('mini app embed has 1 button only', async ({ page }) => {
    await page.goto('/api/frame?type=quest&questId=1')
    
    const meta = await page.locator('meta[name="fc:miniapp:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    // Verify singular button object (not array)
    expect(embed.button).toBeDefined()
    expect(Array.isArray(embed.button)).toBe(false)
    expect(embed.button.title.length).toBeLessThanOrEqual(32)
  })
  
  test('mini app button action type is valid', async ({ page }) => {
    await page.goto('/api/frame?type=leaderboard')
    
    const meta = await page.locator('meta[name="fc:miniapp:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    const validTypes = ['launch_frame', 'view_token']
    expect(validTypes).toContain(embed.button.action.type)
  })
  
  test('mini app button has required action name', async ({ page }) => {
    await page.goto('/api/frame?type=quest')
    
    const meta = await page.locator('meta[name="fc:miniapp:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    expect(embed.button.action.name).toBeDefined()
    expect(typeof embed.button.action.name).toBe('string')
    expect(embed.button.action.name.length).toBeGreaterThan(0)
  })
  
  test('button target is reachable', async ({ page, request }) => {
    await page.goto('/api/frame?type=leaderboard')
    
    const meta = await page.locator('meta[name="fc:miniapp:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    if (embed.button.action.url) {
      const response = await request.get(embed.button.action.url)
      expect(response.ok()).toBeTruthy()
    }
  })
  
  test('no /api/frame URLs exposed', async ({ page }) => {
    await page.goto('/api/frame?type=quest')
    
    const html = await page.content()
    expect(html).not.toContain('/api/frame')
    
    // Should use /frame/* routes or external URLs
    const meta = await page.locator('meta[name="fc:miniapp:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    if (embed.button.action.url) {
      expect(embed.button.action.url).not.toMatch(/\/api\/frame/)
    }
  })
})
```

---

## Manual Testing Checklist

### Desktop Browser
- [ ] Load frame URL in browser
- [ ] Verify button count (≤ 4)
- [ ] Check button labels (≤ 32 chars)
- [ ] Test button clicks → correct navigation
- [ ] Verify no console errors

### Warpcast Mobile
- [ ] Create cast with frame URL
- [ ] Verify buttons visible
- [ ] Tap each button → correct action
- [ ] Check button spacing/layout
- [ ] Test in light/dark mode

### Warpcast Desktop
- [ ] Open frame in modal
- [ ] Verify button layout
- [ ] Click buttons → correct action
- [ ] Check tooltip/hover states

---

## Security Checklist

### URL Safety
- [ ] All button targets use HTTPS
- [ ] No `/api/frame` URLs exposed
- [ ] Public routes use `/frame/*` pattern
- [ ] Query parameters sanitized
- [ ] No XSS vectors in URLs

### Input Validation
- [ ] Button labels sanitized (HTML entities)
- [ ] Button targets validated (URL parsing)
- [ ] Max length enforced (32 chars title, 1024 chars URL)
- [ ] Invalid buttons dropped gracefully
- [ ] Error messages logged (no sensitive data)

### Rate Limiting
- [ ] Button endpoints rate-limited (60 req/min)
- [ ] Target URLs don't trigger infinite loops
- [ ] No CSRF vulnerabilities
- [ ] POST handlers validate frame signatures

---

## Common Issues & Solutions

### Issue: Using Multiple Buttons in Mini App Embed
**Problem:** Trying to add 4 buttons to Mini App Embed (like legacy Frames v1)
**Solution:**
- Mini App Embed supports ONLY 1 button (singular object)
- Use `buildMiniAppEmbed` function (enforces 1 button)
- For legacy Frames v1 (max 4 buttons), use `sanitizeButtons`
- Choose the most important action for the single button

### Issue: Invalid Action Type
**Problem:** Using `link`, `post`, or `mint` action types
**Solution:**
- Mini App Embed only supports: `launch_frame` and `view_token`
- Use `launch_frame` to open a Mini App
- Use `view_token` to view a token/NFT
- For `link` actions, use legacy Frames v1 or external redirects

### Issue: Missing Action Name
**Problem:** action.name field not provided (validation error)
**Solution:**
- action.name is REQUIRED for Mini App Embed
- Provide the Mini App name (e.g., "Gmeowbased Quest")
- Use `buildMiniAppEmbed` function (enforces required fields)

### Issue: Button Title Too Long
**Solution:**
- Use shorter, more concise labels
- Auto-truncate at 32 chars with `buildMiniAppEmbed`
- Add ellipsis if needed: "Long Title Name..."
- Test with emojis (count correctly)

### Issue: Button Target 404
**Solution:**
- Verify target URL reachable (`curl -I`)
- Check HTTPS certificate valid
- Test query parameters
- Implement fallback redirects

### Issue: Button Not Clickable in Warpcast
**Solution:**
- Verify frame meta tags present (`fc:miniapp:frame`)
- Check button action type valid (`launch_frame` or `view_token`)
- Verify action.name field present (REQUIRED)
- Test frame signature valid

### Issue: /api/frame URLs Exposed
**Solution:**
- Use `buildFrameShareUrl` from `lib/share.ts`
- Route all public URLs through `/frame/*`
- Update button targets to use public routes
- Audit codebase: `grep -r "/api/frame" app/`

---

## Monitoring & Alerts

### Metrics to Track
- Button click rate per frame type (Mini App vs Legacy)
- Button validation failure rate (by type: Mini App, Legacy)
- Invalid button title frequency
- Invalid action type attempts (`link`, `post`, `mint` on Mini App)
- Missing action.name errors (Mini App)
- Target URL error rate (404, timeout)

### Alerts
- Alert if > 5% button validation failures
- Alert if button target returns non-200 status
- Alert if Mini App Embed has wrong action type (should never happen with types)
- Alert if action.name missing (should never happen with validation)
- Alert if legacy frame has > 4 buttons (should be truncated)

---

## Approval Sign-Off

**For production deployment:**

- [ ] **Engineer Approval:** _____________ (Date: ________)
- [ ] **QA Approval:** _____________ (Date: ________)
- [ ] **Product Approval:** _____________ (Date: ________)

**Test Results:** _______________________  
**Button Validation Pass Rate:** _______________________  
**Known Issues:** _______________________

---

## References

- [Farcaster MiniApp Spec (Official)](https://miniapps.farcaster.xyz/docs/specification)
- [MCP Verification Report](/docs/maintenance/reports/GI-15-MCP-VERIFICATION-REPORT-20251119.md)
- [MiniApp Validation Code](/lib/miniapp-validation.ts)
- [Share Utils Code](/lib/share.ts)
- [Button Validation Tests](/__tests__/lib/miniapp-validation.test.ts)

---

**Checklist Version:** 2.0 (MCP-Verified)  
**Last Updated:** November 19, 2025  
**Maintained By:** Frame Engineering Team

**⚠️ Breaking Changes from v1.0:**
- Mini App Embed now has 1 button only (not 4)
- Action types limited to `launch_frame` and `view_token` for Mini App
- Action name is now REQUIRED field
- Legacy Frames v1 still supports max 4 buttons (backward compatibility)
