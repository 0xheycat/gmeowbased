# Maintenance Checklist - PR Template

## PR Information

**PR Title:** _______________________________________  
**Author:** _______________________________________  
**Date:** _______________________________________  
**Type:** [ ] Feature [ ] Bugfix [ ] Refactor [ ] Docs [ ] Frame/MiniApp Change

---

## Pre-Submit Checklist

### Code Quality
- [ ] TypeScript compilation passes (`pnpm tsc --noEmit`)
- [ ] All tests passing (`pnpm test`)
- [ ] No new lint warnings
- [ ] Code reviewed by at least one team member

### Testing
- [ ] Unit tests added/updated for new code
- [ ] Integration tests passing
- [ ] Manual testing completed locally
- [ ] Edge cases considered and tested

---

## GI-7 to GI-15 Compliance (for Frame/Badge/Score changes)

### GI-7: Code Review & Testing
- [ ] Code reviewed by 2+ engineers
- [ ] Test coverage maintained (>90%)
- [ ] Manual testing documented

### GI-8: Input Validation & Sanitization
- [ ] All user inputs sanitized (FID, questId, chain, etc.)
- [ ] Validation functions used from `lib/frame-validation.ts`
- [ ] Error messages safe (no sensitive data exposure)
- [ ] Rate limiting configured

### GI-9: Frame Metadata Validation
- [ ] Frame meta tags present (`fc:frame` or `fc:miniapp:frame`)
- [ ] Image URLs absolute (HTTPS)
- [ ] Button validation enforced (max 4, max 32 chars title)
- [ ] Version field is string "1" not number

### GI-10: Image Compliance
- [ ] Frame images 3:2 ratio (1200x800 recommended)
- [ ] OG images 1.91:1 ratio (1200x630)
- [ ] Splash image 200x200 PNG RGB
- [ ] Icon image 1024x1024 PNG
- [ ] All images < 1MB

### GI-11: URL Safety
- [ ] No `/api/frame` URLs exposed to users
- [ ] Public routes use `/frame/*` pattern
- [ ] All URLs validated and sanitized
- [ ] External URLs use HTTPS

### GI-12: Performance
- [ ] Frame endpoint responds < 1s
- [ ] OG image generation < 500ms
- [ ] No blocking synchronous operations
- [ ] Database queries optimized

### GI-13: Error Handling
- [ ] Graceful fallbacks for failures
- [ ] No stack traces in production
- [ ] User-friendly error messages
- [ ] Errors logged for debugging

### GI-14: Security
- [ ] No hardcoded secrets
- [ ] Environment variables used correctly
- [ ] CORS configured appropriately
- [ ] CSP headers present

### GI-15: Deep Frame/MiniApp Coherence
- [ ] No client-only imports in server code
- [ ] Frame and MiniApp produce same outputs (badges, scores, tiers)
- [ ] Button targets verified and reachable
- [ ] Dependency graph validated
- [ ] GI-15 audit report attached (if applicable)

---

## Frame-Specific Changes

**If this PR modifies `/app/api/frame/*`, `/lib/frame-*`, `/app/api/og/*`, or `/lib/badges.ts`:**

### Required Attachments
- [ ] GI-15 audit report (docs/maintenance/reports/)
- [ ] Playwright test results
- [ ] Performance benchmarks
- [ ] Screenshot/video of frame in Warpcast

### Testing Evidence
- [ ] Local testing completed
- [ ] Staging URL tested: _______________________
- [ ] Frame rendered correctly in Warpcast
- [ ] All button interactions work
- [ ] Mobile and desktop tested

### Deployment Plan
- [ ] Rollback plan documented
- [ ] Staging deployment scheduled
- [ ] Production deployment scheduled
- [ ] Monitoring plan defined

---

## Playwright E2E Tests

**If frame changes, run E2E tests:**

```bash
pnpm playwright test
```

Results:
- [ ] Frame HTML & meta validation: ✅ / ❌
- [ ] Button endpoint validation: ✅ / ❌
- [ ] OG image integrity: ✅ / ❌
- [ ] Input validation (GI-8): ✅ / ❌
- [ ] Performance benchmarks: ✅ / ❌

**Test report URL:** _______________________

---

## Approval Sign-Off

### Required Reviewers (for frame/badge changes)
- [ ] Product Owner: _____________ (Date: ________)
- [ ] Tech Lead: _____________ (Date: ________)
- [ ] Security Owner: _____________ (Date: ________)

### Optional Reviewers
- [ ] Engineer 1: _____________ (Date: ________)
- [ ] Engineer 2: _____________ (Date: ________)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All checks above completed
- [ ] Approvals obtained
- [ ] Staging tested successfully
- [ ] Documentation updated

### Post-Deployment
- [ ] Production smoke test completed
- [ ] Monitoring dashboard checked
- [ ] No error spikes detected
- [ ] Frame endpoints responding correctly

### Rollback Plan
**If issues detected:**
1. Run: `vercel rollback`
2. Notify in #incidents channel
3. Create incident report
4. Document root cause

---

## Notes

**Additional context:**

_______________________________________
_______________________________________
_______________________________________

**Known issues / limitations:**

_______________________________________
_______________________________________
_______________________________________

**Follow-up tasks:**

_______________________________________
_______________________________________
_______________________________________

---

**PR Ready for Review:** [ ] Yes [ ] No  
**Staging URL:** _______________________  
**Documentation:** [ ] Updated [ ] Not Required  
**Breaking Changes:** [ ] Yes [ ] No

---

**Template Version:** 1.0  
**Last Updated:** November 19, 2025
