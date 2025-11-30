# Device Testing Guide

## Overview

Comprehensive device testing setup for Gmeowbased using Playwright. Tests mobile onboarding overlay fixes, responsive design, and cross-device compatibility.

## Quick Start

```bash
# Install dependencies (if not already installed)
pnpm install

# Run quick smoke test (Chrome + iPhone 12)
pnpm test:devices:quick

# Run all device tests
pnpm test:devices

# Run specific device category
pnpm test:devices:mobile
pnpm test:devices:desktop
pnpm test:devices:tablet
```

## Available Test Commands

### Full Test Suites

| Command | Description | Devices Covered |
|---------|-------------|-----------------|
| `pnpm test:devices` | All devices | 11 device configurations |
| `pnpm test:devices:quick` | Quick smoke test | Chrome + iPhone 12 |

### Device Categories

| Command | Description | Devices |
|---------|-------------|---------|
| `pnpm test:devices:desktop` | Desktop browsers | Chrome, Firefox, Safari |
| `pnpm test:devices:mobile` | All mobile devices | iPhone 12, iPhone SE, Pixel 5, Small Mobile |
| `pnpm test:devices:ios` | iOS devices only | iPhone 12, iPhone SE, iPhone 14 Pro Max |
| `pnpm test:devices:android` | Android devices | Pixel 5, Galaxy S9+ |
| `pnpm test:devices:tablet` | Tablet devices | iPad Pro, Galaxy Tab S4 |

### Specific Tests

| Command | Description |
|---------|-------------|
| `pnpm test:mobile-onboarding` | Mobile onboarding overlay fix tests |
| `pnpm test:e2e:ui` | Interactive UI mode |
| `pnpm test:e2e:headed` | Run with visible browser |
| `pnpm test:e2e:report` | View HTML report |

## Device Coverage

### Desktop Browsers (1920x1080)
- ✅ Chrome (Chromium)
- ✅ Firefox
- ✅ Safari (WebKit)

### Tablets
- ✅ iPad Pro (1024x1366)
- ✅ iPad Pro Landscape (1366x1024)
- ✅ Galaxy Tab S4 (1024x768)

### Mobile - iOS
- ✅ iPhone 12 (390x844)
- ✅ iPhone SE (375x667)
- ✅ iPhone 14 Pro Max (430x932)

### Mobile - Android
- ✅ Pixel 5 (393x851)
- ✅ Galaxy S9+ (412x846)

### Small Devices
- ✅ Generic Small Mobile (375x667)
- ✅ Extra Small (320x568) - iPhone 5

## Test Files

### 1. Mobile Onboarding Tests
**File**: `e2e/mobile-onboarding.spec.ts`

Tests the mobile onboarding overlay fix (commit 638f504):
- ✅ Bottom navigation visibility during onboarding
- ✅ Fixed positioning with proper z-index
- ✅ Padding-bottom spacing (80px clearance)
- ✅ Scrollable onboarding content
- ✅ Safe-area-inset support for notched devices
- ✅ Touch-friendly tap targets (44x44px minimum)
- ✅ Z-index hierarchy between modal and nav
- ✅ Navigation interaction while onboarding is open

**Run**: `pnpm test:mobile-onboarding`

### 2. Device Compatibility Tests
**File**: `e2e/device-compatibility.spec.ts`

Comprehensive cross-device compatibility:
- ✅ Desktop layout with sidebars
- ✅ Responsive breakpoint transitions
- ✅ Tablet portrait and landscape modes
- ✅ Mobile orientation changes
- ✅ Small screen devices (320px+)
- ✅ High DPI/Retina display support
- ✅ Accessibility (keyboard navigation, focus indicators)
- ✅ Dark mode compatibility
- ✅ Touch target size compliance (WCAG 2.5.5)
- ✅ No horizontal overflow on any device
- ✅ Layout shift monitoring (CLS)

### 3. Quest Wizard Tests
**File**: `e2e/quest-wizard.spec.ts`, `e2e/quest-wizard-mobile.spec.ts`

Existing quest wizard functionality tests.

## Test Scenarios

### Mobile Onboarding Fix Validation

The key test validates the fix for mobile onboarding overlay issue:

```typescript
// Before fix: Onboarding overlaid bottom navigation (z-index: 9999)
// After fix: Navigation has fixed position (z-index: 100) and proper spacing

test('should not overlay bottom navigation', async ({ page }) => {
  await page.goto('/')
  
  // Onboarding modal visible
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  
  // Bottom nav also visible
  await expect(page.locator('.pixel-nav')).toBeVisible()
  
  // Nav has correct positioning
  const navPosition = await page.locator('.pixel-nav').evaluate(el => ({
    position: getComputedStyle(el).position,
    zIndex: getComputedStyle(el).zIndex
  }))
  
  expect(navPosition.position).toBe('fixed')
  expect(parseInt(navPosition.zIndex)).toBeGreaterThanOrEqual(100)
})
```

### Responsive Breakpoint Testing

Tests layout adaptation across breakpoints:

```typescript
const breakpoints = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Desktop', width: 1920, height: 1080 }
]

// Each breakpoint tested for:
// - Correct layout rendering
// - No horizontal overflow
// - Proper component visibility
// - Touch target sizes
```

## Running Tests

### Interactive Mode (Recommended for Development)

```bash
# Open Playwright UI for debugging
pnpm test:e2e:ui

# Select specific device from left sidebar
# Watch tests run in real-time
# Inspect failures with time-travel debugging
```

### Headed Mode (See Browser)

```bash
# Run with visible browser windows
./scripts/test-devices.sh mobile --headed

# Or specific test file
pnpm test:e2e:headed mobile-onboarding
```

### CI/CD Mode

```bash
# Headless, parallel execution
pnpm test:devices

# Quick validation
pnpm test:devices:quick
```

## Test Reports

After running tests, view the HTML report:

```bash
pnpm test:e2e:report
```

The report includes:
- Pass/fail status for each test
- Screenshots of failures
- Execution traces
- Performance metrics
- Device-specific results

## Debugging Failed Tests

### 1. Use Playwright UI

```bash
pnpm test:e2e:ui
```

- Select failed test
- Click "Show trace"
- Step through actions
- Inspect DOM snapshots
- View network requests

### 2. Check Screenshots

Failed tests automatically capture screenshots:

```
test-results/
  mobile-onboarding-spec-ts-*/
    test-failed-1.png
```

### 3. View Traces

Traces are captured on first retry:

```bash
# In HTML report, click "Trace" link
# Or manually open:
npx playwright show-trace test-results/.../trace.zip
```

## Performance Benchmarks

### Load Time Targets

| Device Category | Target | Measured |
|----------------|--------|----------|
| Desktop | < 2s | ✅ |
| Tablet | < 2.5s | ✅ |
| Mobile | < 3s | ✅ |

### Layout Shift (CLS)

- **Target**: < 0.1 (Good)
- **Acceptable**: < 0.25
- **Monitored**: Yes ✅

### Touch Target Compliance

- **WCAG 2.5.5 Level AAA**: 44x44px minimum ✅
- **WCAG 2.5.5 Level AA**: 24x24px minimum ✅

## Continuous Integration

### GitHub Actions (Example)

```yaml
name: Device Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - run: pnpm install
      - run: pnpm test:devices:quick
      
      # Upload reports
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Failing on CI but Passing Locally

1. Check viewport size consistency
2. Verify font loading
3. Add wait conditions for animations
4. Check network conditions

### Mobile Tests Failing

1. Verify mobile CSS is loaded:
   ```typescript
   await page.waitForLoadState('networkidle')
   ```

2. Check for media query issues:
   ```typescript
   const isMobile = await page.evaluate(() => window.innerWidth < 768)
   ```

3. Validate touch events:
   ```typescript
   await element.tap() // Not .click()
   ```

### Flaky Tests

1. Add explicit waits:
   ```typescript
   await page.waitForSelector('.pixel-nav', { state: 'visible' })
   ```

2. Use retry logic:
   ```typescript
   test.describe.configure({ retries: 2 })
   ```

3. Check for race conditions in animations

## Best Practices

### 1. Use Data Attributes for Testing

```tsx
<div data-testid="mobile-nav">...</div>
```

```typescript
await page.locator('[data-testid="mobile-nav"]')
```

### 2. Wait for Stability

```typescript
// Wait for animations
await page.waitForTimeout(300)

// Or wait for network
await page.waitForLoadState('networkidle')
```

### 3. Test User Flows, Not Implementation

```typescript
// Good: User-centric
test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Dashboard')
  await expect(page).toHaveURL('/Dashboard')
})

// Avoid: Implementation-specific
test('dashboard link has correct href', async ({ page }) => {
  const href = await page.locator('.nav-link').getAttribute('href')
  expect(href).toBe('/Dashboard')
})
```

## Related Files

- `playwright.config.ts` - Test configuration
- `e2e/mobile-onboarding.spec.ts` - Mobile onboarding tests
- `e2e/device-compatibility.spec.ts` - Cross-device tests
- `scripts/test-devices.sh` - Test runner script
- `app/styles/mobile-miniapp.css` - Mobile navigation CSS
- `app/styles/onboarding-mobile.css` - Onboarding mobile styles

## Contributing

When adding new features:

1. Add device tests for new components
2. Test on at least 3 devices (desktop, tablet, mobile)
3. Verify touch targets meet WCAG standards
4. Check dark mode compatibility
5. Run `pnpm test:devices:quick` before committing

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [WCAG 2.5.5 Touch Targets](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Web Vitals](https://web.dev/vitals/)
- [Mobile Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)

---

**Last Updated**: November 16, 2025  
**Related Commits**: 638f504 (mobile onboarding fix), 5f9c647 (Phase 5.9 + 5.10 merge)
