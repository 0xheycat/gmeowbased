# Performance Monitoring

Complete guide to performance tracking, monitoring, and optimization for the Quest Wizard.

## Overview

We monitor three key areas:
1. **Core Web Vitals** - User-centric metrics (LCP, FID, CLS)
2. **Custom Performance Metrics** - Component rendering, long tasks
3. **Automated Audits** - Lighthouse CI for regression detection

## Core Web Vitals

### Tracked Metrics

| Metric | Description | Good | Needs Improvement | Poor |
|--------|-------------|------|-------------------|------|
| **LCP** | Largest Contentful Paint | ≤2.5s | 2.5-4.0s | >4.0s |
| **FID** | First Input Delay | ≤100ms | 100-300ms | >300ms |
| **CLS** | Cumulative Layout Shift | ≤0.1 | 0.1-0.25 | >0.25 |
| **FCP** | First Contentful Paint | ≤1.8s | 1.8-3.0s | >3.0s |
| **TTFB** | Time to First Byte | ≤800ms | 800-1.8s | >1.8s |
| **INP** | Interaction to Next Paint | ≤200ms | 200-500ms | >500ms |

### Implementation

```typescript
// lib/web-vitals.ts
import { initWebVitals } from '@/lib/web-vitals'

// In app/layout.tsx
useEffect(() => {
  initWebVitals()
}, [])
```

### Data Flow

```
User Action → Web Vitals Library → sendToAnalytics()
                                   ├─> Posthog
                                   ├─> Google Analytics
                                   └─> Custom Endpoint
```

## Custom Performance Metrics

### Component Render Tracking

Track slow component renders (>16ms = below 60fps):

```typescript
import { useRenderTime } from '@/lib/performance-monitor'

function QuestWizard() {
  useRenderTime('QuestWizard')
  return <div>...</div>
}
```

### Component Mount Time

Measure how long it takes a component to become interactive:

```typescript
import { useMountTime } from '@/lib/performance-monitor'

function SwipeableStep() {
  useMountTime('SwipeableStep')
  return <div>...</div>
}
```

### Custom Measurements

Track specific operations:

```typescript
import { PerformanceMonitor } from '@/lib/performance-monitor'

// Start measurement
PerformanceMonitor.mark('quest-save-start')

// Do work...
await saveQuest(data)

// End and report
PerformanceMonitor.measure('quest-save', 'quest-save-start')
```

### Long Task Detection

Automatically detected tasks that block the main thread for >50ms:

```typescript
// In app/layout.tsx
import { initPerformanceMonitoring } from '@/lib/performance-monitor'

useEffect(() => {
  initPerformanceMonitoring()
}, [])
```

### Resource Timing

Automatically tracks slow resource loading (>1s):
- JavaScript bundles
- CSS stylesheets
- Images
- Fonts

## Lighthouse CI

### Running Lighthouse Audits

```bash
# Run full audit suite
pnpm lighthouse

# Run and open report
pnpm lighthouse:open
```

### Configuration

`lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/Quest",
        "http://localhost:3000/leaderboard"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.8}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}]
      }
    }
  }
}
```

### CI Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build app
        run: pnpm build
      
      - name: Run Lighthouse CI
        run: pnpm lighthouse
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Performance Budgets

### Current Targets

| Metric | Budget | Current |
|--------|--------|---------|
| Initial JS | <200 KB | - |
| Total JS | <500 KB | - |
| LCP | <2.5s | - |
| CLS | <0.1 | - |
| TBT | <300ms | - |

### Setting Budgets

Create `.lighthouserc.json` budgets:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "resource-summary:script:size": ["error", {"maxNumericValue": 500000}],
        "resource-summary:image:size": ["warn", {"maxNumericValue": 300000}],
        "resource-summary:stylesheet:size": ["warn", {"maxNumericValue": 50000}]
      }
    }
  }
}
```

## Optimization Techniques

### Code Splitting

```typescript
// Lazy load heavy components
const QuestCard = lazy(() => import('@/components/QuestCard'))

// Wrap in Suspense
<Suspense fallback={<Skeleton />}>
  <QuestCard />
</Suspense>
```

### Image Optimization

```tsx
import Image from 'next/image'

// Use Next.js Image component
<Image
  src="/quest-banner.png"
  alt="Quest"
  width={600}
  height={400}
  priority={false}
  loading="lazy"
/>
```

### Dynamic Imports

```typescript
// Import analytics only when needed
const analytics = await import('@/lib/analytics')
analytics.track('event')
```

### Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true pnpm build

# Opens visualization in browser
```

## Monitoring Dashboard

### Posthog Dashboard

Create a custom dashboard with:

1. **Web Vitals Trends**
   - LCP over time (line chart)
   - FID over time
   - CLS over time

2. **Performance Alerts**
   - Alert when LCP > 2.5s (95th percentile)
   - Alert when CLS > 0.1

3. **Component Performance**
   - Slow component renders by name
   - Top 10 slowest components

4. **Resource Loading**
   - Slow resource chart
   - Resource size breakdown

### Google Analytics Events

```javascript
gtag('event', 'LCP', {
  event_category: 'Web Vitals',
  value: 2100, // milliseconds
  metric_rating: 'good',
})
```

## Debugging Performance

### Chrome DevTools

1. **Performance Tab**
   - Record user flow
   - Identify long tasks
   - Check rendering performance

2. **Network Tab**
   - Check resource waterfall
   - Identify slow requests
   - Check bundle sizes

3. **Lighthouse Tab**
   - Run audits locally
   - Get specific recommendations
   - Test mobile vs desktop

### React DevTools Profiler

```tsx
import { Profiler } from 'react'

<Profiler id="QuestWizard" onRender={onRenderCallback}>
  <QuestWizard />
</Profiler>
```

### Web Vitals Extension

Install [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma) to see real-time metrics.

## Best Practices

### Do's ✅

- ✅ Measure before optimizing
- ✅ Set performance budgets
- ✅ Monitor in production
- ✅ Test on real devices
- ✅ Optimize critical rendering path
- ✅ Lazy load non-critical resources
- ✅ Use Next.js Image optimization
- ✅ Minimize layout shifts

### Don'ts ❌

- ❌ Optimize without data
- ❌ Ignore mobile performance
- ❌ Skip accessibility for speed
- ❌ Over-optimize prematurely
- ❌ Forget to test production builds
- ❌ Ignore bundle size
- ❌ Block main thread unnecessarily

## Troubleshooting

### High LCP

**Causes:**
- Large images without optimization
- Slow server response time
- Render-blocking resources

**Solutions:**
- Use Next.js Image component
- Preload critical resources
- Optimize server response
- Use CDN for static assets

### High CLS

**Causes:**
- Images without dimensions
- Fonts loading late (FOIT/FOUT)
- Dynamic content insertion

**Solutions:**
- Set width/height on images
- Use `font-display: swap`
- Reserve space for dynamic content
- Use Suspense boundaries

### High FID/INP

**Causes:**
- Long tasks blocking main thread
- Heavy JavaScript execution
- Large component trees

**Solutions:**
- Code split large bundles
- Use Web Workers for heavy computation
- Optimize component rendering
- Debounce expensive operations

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Lighthouse CI Docs](https://github.com/GoogleChrome/lighthouse-ci)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)

## Maintenance

### Regular Tasks

- **Weekly**: Review performance dashboard
- **Sprint**: Run Lighthouse audits
- **Release**: Check performance budgets
- **Monthly**: Analyze slow components
- **Quarterly**: Performance optimization sprint

### Performance Checklist

- [ ] Core Web Vitals meet targets
- [ ] No long tasks >50ms
- [ ] Bundle size within budget
- [ ] Images optimized
- [ ] Critical CSS inlined
- [ ] Lazy loading implemented
- [ ] Lighthouse score >80
- [ ] Mobile performance tested
