# Error Tracking with Sentry

Complete guide to error tracking, monitoring, and debugging with Sentry.

## Overview

Sentry provides:
- **Error Tracking**: Catch and report JavaScript errors
- **Session Replay**: See what users did before an error
- **Performance Monitoring**: Track slow operations
- **Release Health**: Monitor error rates per deployment

## Setup

### 1. Install Dependencies

```bash
pnpm add @sentry/nextjs
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# Sentry DSN (get from sentry.io project settings)
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]

# Optional: Auth token for source maps upload
SENTRY_AUTH_TOKEN=your_auth_token_here
```

### 3. Configuration Files

Three config files created:
- `sentry.client.config.ts` - Browser errors
- `sentry.server.config.ts` - Server errors  
- `sentry.edge.config.ts` - Edge runtime errors

### 4. Initialize in Layout

Already configured! Sentry auto-initializes with Next.js.

## Error Boundaries

### Global Error Boundary

Wrap your app to catch all React errors:

```tsx
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### Component-Specific Boundaries

```tsx
// app/Quest/page.tsx
import { QuestWizardErrorBoundary } from '@/components/ErrorBoundary'

export default function QuestPage() {
  return (
    <QuestWizardErrorBoundary>
      <QuestWizard />
    </QuestWizardErrorBoundary>
  )
}
```

Available boundaries:
- `ErrorBoundary` - Generic error boundary
- `QuestWizardErrorBoundary` - Quest wizard specific
- `LeaderboardErrorBoundary` - Leaderboard specific

## Manual Error Reporting

### Capturing Exceptions

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  await saveQuest(data)
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'quest-wizard',
      step: 'save',
    },
    extra: {
      questData: data,
      userId: user.id,
    },
  })
  
  throw error // Re-throw if needed
}
```

### Capturing Messages

```typescript
// Log important events
Sentry.captureMessage('Quest published successfully', {
  level: 'info',
  tags: {
    feature: 'quest',
    action: 'publish',
  },
})
```

### Adding Context

```typescript
// Set user context
Sentry.setUser({
  id: user.fid,
  username: user.username,
  email: user.email,
})

// Set custom context
Sentry.setContext('quest', {
  id: quest.id,
  name: quest.name,
  status: quest.status,
})

// Set tags for filtering
Sentry.setTag('guild', user.guildId)
Sentry.setTag('platform', 'web')
```

## Session Replay

### What Gets Recorded

When an error occurs, Sentry records:
- User interactions (clicks, scrolls)
- Console logs
- Network requests
- DOM mutations
- 30 seconds before error

### Privacy Configuration

```typescript
// sentry.client.config.ts
Sentry.replayIntegration({
  maskAllText: true,        // Hide all text
  blockAllMedia: true,      // Block images/videos
  maskAllInputs: true,      // Hide form inputs
})
```

### Sensitive Data Masking

Already configured to mask:
- All text content
- Form inputs
- Media (images, videos)
- Wallet addresses (0x...)

## Performance Monitoring

### Transaction Tracking

```typescript
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({
  name: 'Quest Save',
  op: 'quest.save',
})

try {
  await saveQuest(data)
  transaction.setStatus('ok')
} catch (error) {
  transaction.setStatus('error')
  throw error
} finally {
  transaction.finish()
}
```

### Span Tracking

Track specific operations within a transaction:

```typescript
const span = transaction.startChild({
  op: 'db.query',
  description: 'Save quest to database',
})

await db.quest.create(data)
span.finish()
```

## Source Maps

### Upload Source Maps

Add to `package.json`:

```json
{
  "scripts": {
    "build": "next build && sentry-cli sourcemaps upload --org your-org --project your-project .next"
  }
}
```

### Configuration

Create `sentry.properties`:

```properties
defaults.url=https://sentry.io/
defaults.org=your-org
defaults.project=your-project
auth.token=your_auth_token
```

### Automatic Upload

Sentry Next.js plugin handles this automatically if `SENTRY_AUTH_TOKEN` is set.

## Alerting

### Alert Rules (in Sentry Dashboard)

1. **High Error Rate**
   - Trigger: >10 errors in 5 minutes
   - Action: Slack notification

2. **New Error Type**
   - Trigger: First occurrence of new error
   - Action: Email team

3. **Performance Regression**
   - Trigger: P95 latency >3s
   - Action: Create GitHub issue

4. **Release Health**
   - Trigger: Crash-free rate <95%
   - Action: Auto-rollback

### Slack Integration

1. Go to Sentry → Settings → Integrations
2. Install Slack integration
3. Configure alert routing
4. Set notification rules

## Filtering Errors

### Ignore Known Errors

```typescript
// sentry.client.config.ts
Sentry.init({
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'User rejected',
    'User denied',
    'NetworkError',
  ],
})
```

### Before Send Hook

```typescript
beforeSend(event, hint) {
  // Don't send errors from bots
  if (event.request?.headers?.['user-agent']?.includes('bot')) {
    return null
  }
  
  // Filter sensitive data
  if (event.request?.url) {
    event.request.url = event.request.url.replace(
      /0x[a-fA-F0-9]{40}/g,
      '0x[REDACTED]'
    )
  }
  
  return event
}
```

## Debugging

### Local Development

Errors are logged to console instead of Sentry:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('Sentry event:', event)
  return null // Don't send to Sentry
}
```

### Test Error Reporting

```typescript
// Add a test button
<button onClick={() => {
  throw new Error('Test Sentry error')
}}>
  Test Sentry
</button>
```

### Verify Setup

```bash
# Check if Sentry is initialized
pnpm build

# Should see:
# ✓ Sentry source maps uploaded
```

## Best Practices

### Do's ✅

- ✅ Add context before capturing errors
- ✅ Use error boundaries for React errors
- ✅ Tag errors by feature/component
- ✅ Set user context for debugging
- ✅ Filter sensitive data
- ✅ Upload source maps
- ✅ Monitor release health
- ✅ Set up alerts

### Don'ts ❌

- ❌ Send errors in development
- ❌ Log sensitive user data
- ❌ Ignore error grouping
- ❌ Set sample rate too high
- ❌ Forget to test error reporting
- ❌ Overwhelm Sentry with noise
- ❌ Skip error boundaries

## Quota Management

### Sample Rates

```typescript
// Production
tracesSampleRate: 0.1  // 10% of transactions
replaysSessionSampleRate: 0.1  // 10% of sessions
replaysOnErrorSampleRate: 1.0  // 100% of errors

// Development
tracesSampleRate: 1.0  // 100% for testing
```

### Event Filtering

Only send important errors:

```typescript
beforeSend(event) {
  // Ignore low-priority errors
  if (event.level === 'warning') {
    return null
  }
  
  return event
}
```

## Dashboard Widgets

### Recommended Widgets

1. **Error Rate** - Errors per minute
2. **Top 10 Errors** - Most frequent issues
3. **Release Adoption** - Version distribution
4. **Crash-Free Sessions** - Health metric
5. **Apdex Score** - User satisfaction
6. **Slow Transactions** - Performance issues

## Integrations

### GitHub

- Auto-create issues for new errors
- Link commits to releases
- Track resolved/regressed errors

### Slack

- Real-time error notifications
- Daily digest of issues
- Release announcements

### Jira

- Create tickets from errors
- Track error resolution
- Link to sprints

## Troubleshooting

### Errors Not Appearing

**Causes:**
- DSN not configured
- Development mode (errors filtered)
- Network blocked
- Sample rate too low

**Solutions:**
- Check `NEXT_PUBLIC_SENTRY_DSN`
- Test in production build
- Check browser network tab
- Increase sample rate temporarily

### Too Many Errors

**Causes:**
- No error filtering
- Sample rate too high
- Noisy third-party errors

**Solutions:**
- Add to `ignoreErrors`
- Reduce sample rates
- Filter in `beforeSend`

### Missing Source Maps

**Causes:**
- Auth token not set
- Build command not uploading
- Source maps not generated

**Solutions:**
- Set `SENTRY_AUTH_TOKEN`
- Add upload to build script
- Check Next.js config

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)

## Maintenance

### Regular Tasks

- **Daily**: Review new errors
- **Weekly**: Triage error backlog
- **Sprint**: Fix high-priority errors
- **Monthly**: Review quota usage
- **Quarterly**: Optimize filtering rules

### Error Triage Checklist

- [ ] Review error frequency
- [ ] Check affected users
- [ ] Identify root cause
- [ ] Assign priority
- [ ] Create fix plan
- [ ] Set up alert if needed
- [ ] Document resolution
