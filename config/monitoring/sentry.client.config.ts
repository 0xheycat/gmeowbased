import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration for session replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Ignore common errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors that are expected
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    // Wallet errors (user cancelled)
    'User rejected',
    'User denied',
  ],

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry event:', event, hint)
      return null
    }

    // Filter out wallet addresses from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /0x[a-fA-F0-9]{40}/g,
        '0x[REDACTED]'
      )
    }

    return event
  },

  // Performance monitoring
  beforeSendTransaction(transaction) {
    // Don't track health check routes
    if ((transaction as any).name?.includes('api/health')) {
      return null
    }

    return transaction
  },
})
