# Quick Start: Running GI-15 Tests

## Prerequisites

```bash
# 1. Install Playwright browsers (first time only)
pnpm exec playwright install

# 2. Start development server
pnpm dev
```

## Run All Tests

```bash
# Run all 150 GI-15 tests
pnpm test:gi-15
```

Expected output:
```
✓ 150 passed (2-3 minutes)
```

## Run Individual Test Groups

```bash
# Group 1: Frame HTML & Meta Validation (10 tests, ~15s)
pnpm test:gi-15:group1

# Group 2: Button Validation & Endpoints (15 tests, ~20s)
pnpm test:gi-15:group2

# Group 3: OG Image Integrity (17 tests, ~25s)
pnpm test:gi-15:group3

# Group 4: MiniApp ↔ Frame Parity (14 tests, ~20s)
pnpm test:gi-15:group4

# Group 5: Input Validation GI-8 (24 tests, ~30s)
pnpm test:gi-15:group5

# Group 6: Performance & Timeouts (21 tests, ~30s)
pnpm test:gi-15:group6

# Group 7: Warpcast Simulation (20 tests, ~30s)
pnpm test:gi-15:group7

# Group 8: Regression & Negative Tests (29 tests, ~40s)
pnpm test:gi-15:group8
```

## Interactive UI Mode

```bash
# Run tests with Playwright UI
pnpm test:gi-15:ui
```

Benefits:
- Watch tests execute in real-time
- Time-travel debugging
- Pick and choose specific tests
- See screenshots/traces on failure

## Generate HTML Report

```bash
# Run tests and generate report
pnpm test:gi-15:report

# View report
pnpm test:e2e:report
```

## Debugging Failed Tests

### 1. Run with headed browser
```bash
# See browser window during tests
playwright test gi-15-frame-meta-validation.spec.ts --headed
```

### 2. Run specific test
```bash
# Run single test by name
playwright test -g "GM frame has valid JSON meta"
```

### 3. Enable debug mode
```bash
# Step through test with debugger
PWDEBUG=1 playwright test gi-15-frame-meta-validation.spec.ts
```

### 4. View screenshots
Failed tests automatically save screenshots to:
```
playwright-report/
└── test-results/
    └── [test-name]/
        ├── error-context.md
        └── test-failed-1.png
```

## Expected Results

### All Passing ✅
```
Running 150 tests using 3 workers

  ✓ gi-15-frame-meta-validation.spec.ts (10/10 passed)
  ✓ gi-15-button-validation.spec.ts (15/15 passed)
  ✓ gi-15-og-image-integrity.spec.ts (17/17 passed)
  ✓ gi-15-miniapp-frame-parity.spec.ts (14/14 passed)
  ✓ gi-15-input-validation.spec.ts (24/24 passed)
  ✓ gi-15-performance-timeouts.spec.ts (21/21 passed)
  ✓ gi-15-warpcast-simulation.spec.ts (20/20 passed)
  ✓ gi-15-regression-tests.spec.ts (29/29 passed)

  150 passed (2.3m)
```

### With Failures ❌
```
  1) gi-15-frame-meta-validation.spec.ts:42:5 › GM frame has valid JSON meta
     
     Error: expect(received).toBe(expected)
     
     Expected: "next"
     Received: "1"
```

Action: Fix the failing code, then re-run tests.

## Common Issues

### Issue: Tests timeout
**Solution:** 
- Make sure dev server is running (`pnpm dev`)
- Check if port 3000 is available
- Increase timeout in playwright.config.ts if needed

### Issue: Image generation too slow
**Solution:**
- Performance tests expect <1s generation time
- Check server performance
- Optimize image generation code

### Issue: Invalid FID tests fail
**Solution:**
- Verify GI-8 input validation is working
- Check lib/frame-validation.ts sanitization functions

### Issue: Button target returns 404
**Solution:**
- Verify button targets point to valid routes
- Check /frame/* routes exist (not /api/frame)

## CI Integration

### GitHub Actions
Add to `.github/workflows/test.yml`:

```yaml
- name: Install Playwright Browsers
  run: pnpm exec playwright install --with-deps

- name: Run GI-15 Tests
  run: pnpm test:gi-15 --reporter=github

- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: gi-15-test-report
    path: playwright-report/
```

## Next Steps

Once all tests pass:

1. ✅ All 150 tests passing locally
2. ⏳ Run tests in staging environment
3. ⏳ Manual Warpcast testing (12 scenarios)
4. ⏳ Generate GI-15 audit report
5. ⏳ Production deployment

See `STAGE_5.9_GI-15_PLAYWRIGHT_COMPLETE.md` for full documentation.

---

**Quick Commands:**
```bash
pnpm dev                  # Start server
pnpm test:gi-15          # Run all tests
pnpm test:gi-15:ui       # Interactive mode
pnpm test:gi-15:report   # Generate report
```

**Need Help?**
- Full docs: `docs/maintenance/NOV 2025/STAGE_5.9_GI-15_PLAYWRIGHT_COMPLETE.md`
- GI-15 spec: `docs/maintenance/GI-15-Deep-Frame-Audit.md`
- Deployment: `docs/maintenance/FRAME-DEPLOYMENT-PLAYBOOK.md`
