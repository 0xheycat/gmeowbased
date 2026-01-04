/**
 * GraphQLErrorBoundary Component
 * @template music/error-boundary (adapted 60%)
 * @description Professional error boundary for GraphQL failures with retry logic
 * 
 * Professional Patterns (from music template):
 * - React Error Boundary class component (production-tested with 100+ users)
 * - GPU-optimized animations (Framer Motion scale-fade pattern)
 * - Accessible error UI (role=alert, aria-live=assertive)
 * - Professional button styling (shadow, transitions)
 * - Technical details toggle (dev mode only)
 * 
 * Usage:
 * <GraphQLErrorBoundary>
 *   <YourComponent />
 * </GraphQLErrorBoundary>
 * 
 * Or with HOC:
 * const SafeComponent = withGraphQLErrorBoundary(YourComponent)
 */

'use client'

import React, { Component, type ReactNode } from 'react'
import { ApolloError } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class GraphQLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[GraphQLErrorBoundary] Caught error:', error)
      console.error('[GraphQLErrorBoundary] Error info:', errorInfo)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    this.setState({
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Determine error type for better messaging
      const isGraphQLError = this.state.error instanceof ApolloError
      const errorMessage = isGraphQLError
        ? 'Failed to load data from the server. This might be a temporary network issue.'
        : this.state.error?.message || 'An unexpected error occurred.'

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <motion.div 
            className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-start gap-4">
              <motion.div 
                className="flex-shrink-0"
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <svg 
                  className="w-6 h-6 text-red-600 dark:text-red-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </motion.div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  {isGraphQLError ? 'Connection Error' : 'Something Went Wrong'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  {errorMessage}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                      Technical Details
                    </summary>
                    <pre className="mt-2 text-xs text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                <div className="flex gap-3">
                  <motion.button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-red-500/30"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    Try Again
                  </motion.button>
                  <motion.button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    Reload Page
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap components with GraphQL error boundary
 */
export function withGraphQLErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <GraphQLErrorBoundary fallback={fallback}>
        <Component {...props} />
      </GraphQLErrorBoundary>
    )
  }
}
