# 🧪 Device Testing Package - Quick Reference

## 🚀 Quick Start

```bash
# Run quick smoke test (2 minutes)
pnpm test:devices:quick

# Test mobile onboarding fix specifically
pnpm test:mobile-onboarding

# Test all mobile devices
pnpm test:devices:mobile

# Interactive debugging mode
pnpm test:e2e:ui
```

## 📱 What's Tested

### Mobile Onboarding Fix ✅
- Bottom navigation no longer overlaid by onboarding modal
- Fixed positioning with z-index: 100
- 80px padding-bottom clearance
- Scrollable content on mobile
- Safe-area-inset support for notched devices

### Device Coverage
- **Desktop**: Chrome, Firefox, Safari (3 browsers)
- **Tablets**: iPad Pro, Galaxy Tab S4 (portrait + landscape)
- **iOS Mobile**: iPhone 12, SE, 14 Pro Max (3 devices)
- **Android Mobile**: Pixel 5, Galaxy S9+ (2 devices)
- **Small Screens**: 375px, 320px viewports (2 sizes)

**Total**: 11 device configurations

### Test Categories
- ✅ Responsive layout (desktop → tablet → mobile)
- ✅ Touch interactions (44x44px targets)
- ✅ Orientation changes (portrait ↔ landscape)
- ✅ Accessibility (WCAG 2.5.5 compliance)
- ✅ Performance (load time <3s, CLS <0.25)
- ✅ Dark mode compatibility
- ✅ Safe-area-inset for notched devices

## 📋 Available Commands

| Command | Purpose | Time |
|---------|---------|------|
| `pnpm test:devices:quick` | Smoke test (Chrome + iPhone) | ~2 min |
| `pnpm test:devices:mobile` | All mobile devices | ~5 min |
| `pnpm test:devices:desktop` | Desktop browsers | ~3 min |
| `pnpm test:devices:ios` | iOS devices only | ~4 min |
| `pnpm test:devices:android` | Android devices | ~3 min |
| `pnpm test:devices:tablet` | Tablet devices | ~3 min |
| `pnpm test:devices` | **Full suite (11 devices)** | ~10 min |
| `pnpm test:e2e:ui` | Interactive UI mode | Manual |
| `pnpm test:e2e:report` | View HTML report | Instant |

## 🎯 Test Files

### 1. Mobile Onboarding Tests
**File**: `e2e/mobile-onboarding.spec.ts`  
**Tests**: 8 tests in 3 suites  
**Focus**: Mobile navigation overlay fix (commit 638f504)

**Key Tests**:
- ✅ Navigation not overlaid during onboarding
- ✅ Fixed positioning with correct z-index
- ✅ Proper spacing (80px padding-bottom)
- ✅ Navigation remains clickable
- ✅ Safe-area-inset support
- ✅ Touch targets (44x44px minimum)

### 2. Device Compatibility Tests
**File**: `e2e/device-compatibility.spec.ts`  
**Tests**: 30+ tests across 8 suites  
**Focus**: Cross-device responsive design

**Suites**:
- Desktop Compatibility (2 tests)
- Tablet Compatibility (7 tests)
- Mobile Orientation Changes (2 tests)
- Small Screen Devices (6 tests)
- High DPI Displays (1 test)
- Accessibility on Devices (3 tests)
- Dark Mode Compatibility (2 tests)

## 🔍 Running Tests

### For Development
```bash
# Interactive mode with time-travel debugging
pnpm test:e2e:ui

# Run with visible browser
./scripts/test-devices.sh mobile --headed
```

### For CI/CD
```bash
# Quick validation
pnpm test:devices:quick

# Full device suite
pnpm test:devices
```

### Debugging Failures
```bash
# View HTML report with screenshots
pnpm test:e2e:report

# Run specific test file
pnpm exec playwright test mobile-onboarding --headed

# Run single test
pnpm exec playwright test -g "should not overlay bottom navigation"
```

## 📊 Quality Standards

### Performance Benchmarks
- ✅ Desktop load time: < 2s
- ✅ Mobile load time: < 3s
- ✅ Cumulative Layout Shift: < 0.25
- ✅ No horizontal overflow on any device

### Accessibility (WCAG 2.5.5)
- ✅ Touch targets: 44x44px minimum (Level AAA)
- ✅ Keyboard navigation support
- ✅ Focus indicators visible
- ✅ Screen reader compatibility

### Mobile Standards
- ✅ Safe-area-inset for notched devices
- ✅ Touch-friendly interactions
- ✅ No text scaling in landscape
- ✅ Smooth orientation transitions

## 🐛 Troubleshooting

### Tests Failing?

1. **Validate setup first**:
   ```bash
   node scripts/validate-device-tests.mjs
   ```

2. **Check browser installation**:
   ```bash
   pnpm exec playwright install chromium
   ```

3. **Run with debug mode**:
   ```bash
   PWDEBUG=1 pnpm test:e2e mobile-onboarding
   ```

4. **Check for flaky tests**:
   - Add retries in test file: `test.describe.configure({ retries: 2 })`
   - Use explicit waits: `await page.waitForSelector(...)`
   - Check for animation race conditions

### Common Issues

**"Browser not found"**
```bash
pnpm exec playwright install
```

**"Test timeout"**
- Increase timeout in test: `test.setTimeout(60000)`
- Check network conditions
- Verify dev server is running

**"Element not visible"**
- Add wait: `await expect(element).toBeVisible({ timeout: 5000 })`
- Check z-index stacking
- Verify viewport size

## 📚 Documentation

- **Full Guide**: `docs/DEVICE_TESTING.md`
- **Playwright Docs**: https://playwright.dev/docs/intro
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

## 🔗 Related Files

- `playwright.config.ts` - Device configurations
- `package.json` - Test scripts
- `scripts/test-devices.sh` - Test runner
- `app/styles/mobile-miniapp.css` - Mobile nav CSS
- `app/styles/onboarding-mobile.css` - Onboarding CSS

## 📈 Test Results

After running tests, results are in:
- `playwright-report/` - HTML report
- `test-results/` - Screenshots & traces

View report:
```bash
pnpm test:e2e:report
```

## ✅ Pre-commit Checklist

Before committing new features:
- [ ] Run `pnpm test:devices:quick`
- [ ] Test on at least 2 devices (desktop + mobile)
- [ ] Verify touch targets ≥ 44x44px
- [ ] Check dark mode compatibility
- [ ] No horizontal overflow
- [ ] Load time < 3s on mobile

## 🎉 Success Criteria

All tests passing means:
- ✅ Mobile onboarding fix working correctly
- ✅ Responsive design across all devices
- ✅ No layout regressions
- ✅ Accessibility standards met
- ✅ Performance targets achieved

---

**Version**: 1.0.0  
**Last Updated**: November 16, 2025  
**Commit**: f19b9ea  
**Related**: 638f504 (mobile fix), 5f9c647 (Phase 5.9+5.10)
