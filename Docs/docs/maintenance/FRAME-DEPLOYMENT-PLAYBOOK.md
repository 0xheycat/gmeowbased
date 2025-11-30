# Frame Deployment Playbook

## Pre-Deployment Checklist

### Stage 1: Code Review & Validation

- [ ] All GI-15 acceptance criteria verified
- [ ] TypeScript compilation passes (`pnpm tsc --noEmit`)
- [ ] All tests passing (minimum 94% coverage maintained)
- [ ] Frame validation functions tested (`lib/frame-validation.ts`)
- [ ] MiniApp validation functions tested (`lib/miniapp-validation.ts`)
- [ ] No client-side imports in server routes
- [ ] All button targets validated and reachable
- [ ] Rate limiting configured and tested
- [ ] Input sanitization (GI-8) enforced

### Stage 2: Local Testing

```bash
# Build and run locally
pnpm build
pnpm start

# Test frame endpoints
curl http://localhost:3000/api/frame?type=leaderboard
curl http://localhost:3000/api/frame?type=quest&questId=1&chain=base

# Verify OG images
curl -I http://localhost:3000/api/frame/og?title=Test

# Check meta tags
curl -s http://localhost:3000/api/frame?type=leaderboard | grep 'fc:frame'
```

- [ ] All frame types render HTML
- [ ] Meta tags present and valid JSON
- [ ] Images load (3:2 ratio)
- [ ] **Mini App Embed:** 1 button only (singular object)
- [ ] **Legacy Frames v1:** Max 4 buttons (if using legacy)
- [ ] Button action types valid (only `launch_frame` or `view_token` for Mini App)
- [ ] Action.name present (REQUIRED for Mini App)
- [ ] No 500 errors

### Stage 3: Playwright Test Suite

```bash
# Run full test suite
pnpm test:e2e

# Run frame-specific tests
pnpm playwright test e2e/frame-validation.spec.ts

# Generate HTML report
pnpm playwright show-report
```

- [ ] Frame HTML & meta validation passes
- [ ] Button endpoint checks pass
- [ ] OG image integrity tests pass
- [ ] Input validation tests pass
- [ ] Performance benchmarks acceptable (<1.5s response)

### Stage 4: Staging Deployment

```bash
# Deploy to staging
vercel deploy --prebuilt

# Set staging URL
export STAGING_URL="https://gmeowbased-staging.vercel.app"
```

- [ ] Staging deployment successful
- [ ] Frame endpoints accessible
- [ ] OG images loading
- [ ] No console errors
- [ ] Rate limiting active

### Stage 5: Warpcast Testing (Manual)

**Mobile (iOS/Android):**
1. Create test cast with frame URL: `${STAGING_URL}/api/frame?type=leaderboard`
2. Verify frame renders in feed
3. Tap primary button → confirms navigation
4. Check splash screen animation (if launch_frame)
5. Test on both light/dark mode

**⚠️ MCP-Verified Requirements (November 19, 2025):**
- [ ] Frame displays correctly in feed
- [ ] Image 3:2 ratio maintained
- [ ] **Mini App Embed:** 1 button (singular object)
- [ ] **Legacy Frames v1:** Max 4 buttons (if using legacy)
- [ ] Button action type is `launch_frame` or `view_token` (Mini App)
- [ ] Splash screen displays (200x200)
- [ ] Navigation works
- [ ] No broken layouts

**Desktop:**
1. Open Warpcast web
2. Find test cast with frame
3. Verify frame renders (424x695px modal)
4. Test button interactions

- [ ] Frame renders in desktop modal
- [ ] Buttons clickable
- [ ] Images load correctly

### Stage 6: Performance Testing

```bash
# Load test staging endpoint
ab -n 100 -c 10 ${STAGING_URL}/api/frame?type=leaderboard

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s ${STAGING_URL}/api/frame?type=quest&questId=1
```

**Metrics to verify:**
- [ ] Average response time <500ms
- [ ] 95th percentile <1s
- [ ] No timeouts under load
- [ ] Rate limiting triggers correctly (after 60 req/min)

### Stage 7: GI-15 Audit Report

Generate audit report:
```bash
# Create audit report
cp docs/maintenance/GI-15-AUDIT-TEMPLATE.md docs/maintenance/reports/GI-15-AUDIT-$(date +%Y%m%d).md
```

Complete sections:
- [ ] Files changed list
- [ ] Acceptance criteria verification
- [ ] Test results attached
- [ ] Performance benchmarks
- [ ] Known issues / limitations
- [ ] Rollback plan documented

### Stage 8: Approval Sign-Off

- [ ] Product owner review
- [ ] Security owner review  
- [ ] Tech lead review
- [ ] GI-15 audit report approved

### Stage 9: Production Deployment

```bash
# Deploy to production
vercel --prod

# Set production URL
export PROD_URL="https://gmeowhq.art"

# Smoke test
curl -s ${PROD_URL}/api/frame?type=leaderboard | head -20
```

- [ ] Production deployment successful
- [ ] Frame endpoints responding
- [ ] OG images loading from production CDN
- [ ] No errors in Vercel logs
- [ ] Rate limiting configured

### Stage 10: Post-Deployment Monitoring

**First 15 minutes:**
- [ ] Monitor error rates (Vercel dashboard)
- [ ] Check frame render success rate
- [ ] Verify OG image CDN hits
- [ ] Test sample frame URLs in Warpcast

**First hour:**
- [ ] No spike in 500 errors
- [ ] Response times within SLA
- [ ] Rate limiting working correctly
- [ ] No user reports of broken frames

**First 24 hours:**
- [ ] Review analytics for frame interactions
- [ ] Check for any drift in badge/tier outputs
- [ ] Verify no regression in quest completions

---

## Rollback Procedure

### Quick Rollback (< 5 minutes)

```bash
# Revert to previous Vercel deployment
vercel rollback

# Or redeploy specific commit
git checkout <previous-commit>
vercel --prod
```

### Emergency Rollback Triggers

- Error rate >5% on frame endpoints
- Response time >2s consistently
- OG images failing to generate
- Critical security issue discovered
- Frame rendering broken in Warpcast

### Post-Rollback Actions

1. Create incident report
2. Document root cause
3. Fix issues in separate branch
4. Re-run full deployment checklist
5. Get re-approval before next deployment

---

## Testing URLs (Reference)

### Frame Types
```
/api/frame?type=leaderboard
/api/frame?type=leaderboard&chain=base
/api/frame?type=leaderboard&global=1

/api/frame?type=quest&questId=1&chain=base
/api/frame?type=quest&questId=202&chain=op

/api/frame?type=badge&fid=123456

/api/frame?type=onchainstats&fid=123456&chain=base

/api/frame?type=gm&fid=123456
```

### Public Routes
```
/frame/leaderboard
/frame/leaderboard?chain=base

/frame/quest/1?chain=base
/frame/quest/202?chain=op

/frame/badge/123456
/frame/stats/123456?chain=base
```

### OG Images
```
/api/frame/og?title=Test&subtitle=Quest&chain=Base
/api/frame/og?title=Leaderboard&metric1Label=Points&metric1Value=1000
```

---

## Contact & Escalation

**Frame Issues:**
- Tech Lead: @heycat
- On-call: Check #engineering Slack channel

**Warpcast Integration Issues:**
- Farcaster Discord: discord.gg/farcaster
- MiniApp Spec: https://miniapps.farcaster.xyz/docs/specification

**Emergency Rollback:**
- DM @heycat immediately
- Post in #incidents channel
- Follow rollback procedure above

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Next Review:** Before each production deployment
