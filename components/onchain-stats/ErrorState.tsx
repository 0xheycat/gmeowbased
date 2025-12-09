/**
 * ErrorState - Error display component
 * 
 * Adapted from: trezoadmin-41/UIElements/Alert (30% adaptation)
 * Pattern: Error UI with retry button
 * 
 * Features:
 * - User-friendly error messages
 * - Retry button for manual refresh
 * - Professional error styling
 */

type ErrorStateProps = {
  error: Error | null
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (!error) return null

  // User-friendly error messages
  const getErrorMessage = (err: Error): string => {
    const message = err.message.toLowerCase()

    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid wallet address. Please check and try again.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    return 'Failed to load stats. Please try again.'
  }

  const errorMessage = getErrorMessage(error)

  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h3 className="error-title">Oops! Something went wrong</h3>
        <p className="error-message">{errorMessage}</p>
        <button className="error-retry-btn" onClick={onRetry}>
          <span className="retry-icon">🔄</span>
          <span>Try Again</span>
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <pre className="error-stack">{error.message}</pre>
          </details>
        )}
      </div>

      <style jsx>{`
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 1rem;
          min-height: 20rem;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .error-content {
          max-width: 32rem;
          width: 100%;
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary, #fff);
          margin-bottom: 0.75rem;
        }

        .error-message {
          font-size: 1rem;
          color: var(--text-secondary, #aaa);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .error-retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .error-retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
        }

        .error-retry-btn:active {
          transform: translateY(0);
        }

        .retry-icon {
          display: inline-block;
          animation: rotate 2s linear infinite;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        .error-details {
          margin-top: 2rem;
          text-align: left;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .error-details summary {
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-tertiary, #888);
          user-select: none;
        }

        .error-details summary:hover {
          color: var(--text-secondary, #aaa);
        }

        .error-stack {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: #ef4444;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        @media (max-width: 768px) {
          .error-state {
            padding: 2rem 1rem;
            min-height: 16rem;
          }

          .error-icon {
            font-size: 3rem;
          }

          .error-title {
            font-size: 1.25rem;
          }

          .error-message {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )
}
