'use client'

/**
 * Dashboard Error Boundary
 * Catches errors in Dashboard components and shows fallback UI with retry
 * Follows React Error Boundary pattern + Sentry best practices
 */

import { Component } from 'react'
import type { ReactNode } from 'react'
import { ErrorOutlineIcon } from '@/components/icons/error-outline-icon'
import { RefreshIcon } from '@/components/icons/refresh-icon'

interface Props {
  children: ReactNode
  componentName: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: { componentStack: string }
  attemptCount: number
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      attemptCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log to monitoring service (Sentry, LogRocket, etc.)
    console.error(`[DashboardErrorBoundary] ${this.props.componentName} error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      attemptCount: this.state.attemptCount,
    })

    // Store error info for display
    this.setState({ errorInfo })

    // TODO: Send to Sentry
    // Sentry.captureException(error, {
    //   contexts: {
    //     component: {
    //       name: this.props.componentName,
    //       attemptCount: this.state.attemptCount,
    //     },
    //   },
    // })
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      attemptCount: prevState.attemptCount + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-300 dark:border-red-700 p-6 mb-6">
          {/* Error Icon */}
          <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400">
            <ErrorOutlineIcon className="w-6 h-6" />
            <h3 className="text-lg font-semibold">
              Something went wrong
            </h3>
          </div>

          {/* Error Message */}
          <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
            We couldn't load <strong>{this.props.componentName}</strong>.
            {this.state.attemptCount > 0 && (
              <span className="text-gray-500 ml-1">
                (Attempt {this.state.attemptCount + 1})
              </span>
            )}
          </p>

          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 text-xs text-gray-600 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                Show error details (dev only)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          {/* Retry Button */}
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshIcon className="w-4 h-4" />
            Try again
          </button>

          {/* Help Text */}
          <p className="mt-4 text-xs text-gray-500">
            If this issue persists, please contact support or refresh the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
