import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Ignore common errors
  ignoreErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry server event:', event)
      return null
    }

    // Filter out sensitive environment variables
    if (event.contexts?.runtime?.env) {
      const filtered: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(event.contexts.runtime.env)) {
        if (key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')) {
          filtered[key] = '[REDACTED]'
        } else {
          filtered[key] = value
        }
      }
      event.contexts.runtime.env = filtered
    }

    return event
  },
})
