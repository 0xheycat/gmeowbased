/**
 * Error Boundary Component
 * 
 * Catches React errors and displays fallback UI
 * Reports errors to Sentry
 */

'use client'

import React, { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }

    // Report to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="text-6xl">😿</div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          							<p className="text-sm text-slate-400">
								We&apos;re working to fix this. Try refreshing the page or come back soon.
							</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="rounded-xl border border-primary bg-primary px-6 py-3 min-h-[44px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Error Boundary for Quest Wizard
 * Shows wizard-specific error UI
 */
export function QuestWizardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[600px] flex-col items-center justify-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-bold">Quest Wizard Error</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The quest wizard encountered an error. Your progress has been auto-saved. 
            Try refreshing the page to continue.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-primary bg-primary px-6 py-3 min-h-[44px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('quest-wizard-draft')
                window.location.href = '/quests'
              }}
              className="rounded-xl border px-6 py-3 min-h-[44px] text-sm font-medium transition-colors hover:bg-muted"
            >
              Go to Quests
            </button>
          </div>
        </div>
      }
      onError={(error) => {
        // Add quest wizard context
        Sentry.setContext('quest-wizard', {
          hasDraft: !!localStorage.getItem('quest-wizard-draft'),
          timestamp: Date.now(),
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error Boundary for Leaderboard
 */
export function LeaderboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="text-6xl">📊</div>
          <h2 className="text-xl font-bold">Leaderboard Unavailable</h2>
          <p className="text-sm text-muted-foreground">
            Unable to load the leaderboard. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-primary bg-primary px-6 py-3 min-h-[44px] text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
