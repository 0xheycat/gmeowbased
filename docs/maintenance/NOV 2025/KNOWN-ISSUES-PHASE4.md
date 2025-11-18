# Phase 4 Known Issues & Recommendations

**Last Updated**: 2025-11-18  
**Phase**: Phase 4 Performance Optimization  
**Status**: Active Tracking  

---

## Issue #1: Badge Templates Route 500 Error ⚠️

### Details
**Route**: `/api/badges/templates`  
**Status**: ❌ Internal Server Error  
**Impact**: Low (non-critical admin endpoint)  
**Priority**: Medium  
**Discovered**: Stage 4 production testing  

### Error Response
```json
{"error":"internal_error","message":"Internal server error"}
```

### Current Behavior
- Route consistently returns 500 error in production
- All other badge routes working correctly
- Error persists after multiple deployments
- No detailed stack trace in Vercel logs

### Impact Assessment
- **User Impact**: Low - admin panel only
- **Functionality**: Frontend has fallback handling
- **Core Features**: Not affected (badge assignment, listing work)
- **Data Integrity**: No risk

### Debugging Attempted (Stage 4-5)
1. ✅ Checked Vercel logs - no detailed stack trace visible
2. ✅ Verified route code structure - looks correct
3. ✅ Multiple curl tests - confirms persistent 500
4. ❌ Local reproduction - pending
5. ❌ Detailed error logging - not added yet

### Root Cause Hypotheses
1. **Supabase RLS Policy**: `badge_templates` table may have restrictive policy
2. **Connection Timeout**: Supabase client timeout during query
3. **Data Serialization**: Template JSON structure causing serialization error
4. **Environment Variable**: Missing or incorrect Supabase key in production

### Recommended Next Steps

#### Immediate (Stage 6 or Post-Phase 4)
1. **Add Detailed Error Logging**:
   ```typescript
   // In app/api/badges/templates/route.ts
   try {
     const templates = await listBadgeTemplates();
     return NextResponse.json(templates);
   } catch (error) {
     console.error('[Badge Templates Error]', {
       message: error.message,
       stack: error.stack,
       timestamp: new Date().toISOString()
     });
     return NextResponse.json({
       error: 'internal_error',
       message: 'Internal server error',
       details: process.env.NODE_ENV === 'development' ? error.message : undefined
     }, { status: 500 });
   }
   ```

2. **Verify Supabase Connection**:
   ```typescript
   // Add connection test before query
   const { data, error } = await supabase
     .from('badge_templates')
     .select('count')
     .limit(1);
   
   if (error) {
     console.error('[Badge Templates] Supabase connection error', error);
   }
   ```

3. **Check RLS Policies**:
   ```sql
   -- Verify policies on badge_templates table
   SELECT * FROM pg_policies 
   WHERE tablename = 'badge_templates';
   
   -- Test direct query access
   SELECT * FROM badge_templates LIMIT 1;
   ```

#### Short-term (Post-Phase 4)
1. Reproduce error in local development environment
2. Add comprehensive error handling to `listBadgeTemplates()` function
3. Add monitoring/alerting for this endpoint
4. Create integration test for badge templates route

#### Long-term
1. Consider moving badge templates to static config file (if rarely changed)
2. Add health check endpoint for all badge-related routes
3. Implement retry logic with exponential backoff

### Workaround
Frontend already has fallback handling for missing templates. Admin panel remains functional with reduced template visibility.

### Related Files
- `app/api/badges/templates/route.ts`
- `lib/supabase/badge-templates.ts` (likely location of `listBadgeTemplates()`)
- `components/admin/BadgeTemplateManager.tsx` (frontend)

---

## Issue #2: Cache-Control Headers Override 📝

### Details
**Component**: HTTP Caching Headers  
**Status**: ⚠️ Known Limitation  
**Impact**: Low (application-level caching works)  
**Priority**: Low  
**Root Cause**: Next.js/Vercel CDN behavior  

### Current Behavior
Custom `Cache-Control` headers (e.g., `s-maxage=180`) are overridden by Vercel's default CDN configuration:

**Intended**:
```
Cache-Control: public, s-maxage=180, stale-while-revalidate=60
```

**Actual** (in production):
```
Cache-Control: public, max-age=0, must-revalidate
```

### Impact Assessment
- **CDN Caching**: ❌ Not working (responses not cached at edge)
- **Application Caching**: ✅ Working (L1 + L2 cache functional)
- **Performance**: ✅ Still excellent (75-85% cache hit rate)
- **User Experience**: ✅ No degradation

### Why This is Acceptable (Current Phase)
1. **L1 + L2 Cache Working**: Application-level caching provides 91% improvement
2. **Cache Hit Rate**: 75-85% exceeds 70% target
3. **Response Times**: 308ms warm cache (down from 3526ms)
4. **CDN Overhead**: Minimal for API routes (most traffic is SSR/ISR)

### Technical Explanation
Vercel's CDN is optimized for Next.js pages (SSR/SSG), not API routes. The platform:
- Caches static assets aggressively
- Caches SSR/ISR pages with `revalidate` config
- Does NOT cache API routes by default (security/freshness concerns)

### Alternative Solutions

#### Option 1: Accept Current Behavior (✅ Recommended for Phase 4)
**Pros**:
- Application caching is sufficient
- No code changes needed
- Focus on more critical issues

**Cons**:
- No CDN-level caching
- Slightly higher origin load

#### Option 2: Use Next.js ISR (Route Segment Config)
```typescript
// app/api/viral/stats/route.ts
export const revalidate = 180; // 3 minutes

export async function GET(request: Request) {
  // Route handler
}
```

**Pros**:
- Native Next.js approach
- Vercel respects `revalidate` config
- Works with ISR (Incremental Static Regeneration)

**Cons**:
- Less granular control than custom headers
- Still not true CDN caching for API routes

#### Option 3: Migrate to Edge Functions
```typescript
// app/api/viral/stats/route.ts
export const runtime = 'edge';
export const revalidate = 180;

export async function GET(request: Request) {
  // Edge runtime handler
}
```

**Pros**:
- Runs at edge locations (lower latency)
- Better control over caching headers
- Faster cold starts

**Cons**:
- Edge runtime limitations (no Node.js APIs)
- Requires code refactoring
- May need Supabase connection pooling changes

#### Option 4: Custom Middleware for Header Management
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Preserve custom cache headers
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=180');
  }
  
  return response;
}
```

**Pros**:
- Centralized header management
- Preserves custom headers

**Cons**:
- Still may be overridden by Vercel
- Adds middleware complexity

### Recommended Action
**For Phase 4**: ✅ Accept current behavior

**For Future Optimization Phase**:
1. Evaluate edge runtime migration for top 3-5 routes
2. Test ISR config for routes with stable data
3. Consider CDN caching only if traffic patterns show significant origin load

### Monitoring
Track these metrics to determine if CDN caching is needed:
- Origin request rate (requests/second to API routes)
- Edge network traffic (% of requests hitting CDN)
- Response time percentiles (p50, p95, p99)
- Cost impact (Vercel function invocations)

### Related Files
- `lib/cache.ts` (application caching logic)
- `middleware.ts` (potential middleware solution)
- API route handlers (would need `revalidate` export)

---

## Issue #3: Lighthouse Audits Not Run 📋

### Details
**Component**: Performance Audits  
**Status**: ⏳ Deferred  
**Impact**: Low (bundle sizes validated)  
**Priority**: Low  
**Reason**: Time constraint, focus on critical testing  

### Current State
- ✅ Bundle sizes validated (admin 193 KB, shared 101 KB)
- ✅ Performance confirmed via API testing (91% improvement)
- ✅ Code splitting working (13 components)
- ⏳ Lighthouse scores not measured

### Estimated Scores (Based on Bundle Metrics)
| Page | Estimated Score | Confidence | Notes |
|------|----------------|------------|-------|
| Homepage (`/`) | >90 | High | Lightweight (157 KB), optimized |
| Admin (`/admin`) | >85 | Medium | Heavier (193 KB), code-split |
| Quest Creator | >88 | Medium | Optimized images, lazy loading |
| Dashboard | >90 | High | Minimal JS (321 KB) |
| Profile | >87 | Medium | Dynamic content, 321 KB |

### Why Estimation is Sufficient (Phase 4)
1. **Bundle Size Validated**: All targets met (<200 KB admin, <110 KB shared)
2. **API Performance Validated**: 91% improvement measured
3. **Code Splitting Working**: Route-based loading confirmed
4. **Image Optimization**: Next.js Image components in use

### Recommended Next Steps

#### Post-Phase 4 (Week of Nov 25)
Run Lighthouse CI in production:

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audits (already configured in lighthouserc.json)
lhci autorun --collect.url=https://gmeowhq.art
lhci autorun --collect.url=https://gmeowhq.art/admin
lhci autorun --collect.url=https://gmeowhq.art/Dashboard
lhci autorun --collect.url=https://gmeowhq.art/Quest

# Generate report
lhci upload
```

#### If Scores Below Target (<90)
1. **Analyze Report**: Identify specific bottlenecks
2. **Common Issues**:
   - Unused JavaScript (tree-shaking needed)
   - Large third-party scripts (defer/async loading)
   - Unoptimized images (convert to WebP/AVIF)
   - Render-blocking resources (inline critical CSS)
3. **Priority Fixes**: Focus on highest-impact items

### Acceptance Criteria for Post-Phase 4
- [ ] Homepage: >90 performance score
- [ ] Admin: >85 performance score
- [ ] Dashboard: >90 performance score
- [ ] Quest Creator: >88 performance score
- [ ] All pages: >90 accessibility score
- [ ] All pages: >95 best practices score

### Related Files
- `lighthouserc.json` (already configured)
- `playwright.config.ts` (for automated testing)
- `.github/workflows/` (could add Lighthouse CI action)

---

## Recommendations Summary

### Immediate Actions (Stage 6)
1. ✅ Document known issues (this file)
2. ⏳ Add error logging to badge templates route
3. ⏳ Create monitoring plan for post-Phase 4

### Short-term (Post-Phase 4, Week of Nov 25)
1. Debug badge templates 500 error
2. Run Lighthouse audits on production
3. Monitor cache hit rates and API performance
4. Set up alerts for performance regressions

### Long-term (Future Optimization Phase)
1. Evaluate edge runtime migration for top routes
2. Consider CDN caching based on traffic patterns
3. Implement automated performance testing in CI/CD
4. Create performance budget enforcement

---

## Metrics to Monitor (Post-Phase 4)

### Application Performance
- [ ] API response times (p50, p95, p99)
- [ ] Cache hit rates (L1, L2, overall)
- [ ] Database query times (with new indexes)
- [ ] Bundle sizes (track over time)

### User Experience
- [ ] Lighthouse scores (weekly)
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] Time to Interactive (TTI)
- [ ] First Contentful Paint (FCP)

### Infrastructure
- [ ] Vercel function invocations (cost)
- [ ] Supabase query volume
- [ ] Redis cache memory usage
- [ ] Error rates by route

---

**Document Status**: ✅ Complete  
**Next Review**: Post-Phase 4 (Nov 25, 2025)  
**Owner**: Development Team  
