/**
 * StatsCardsSkeleton - Loading state component
 * 
 * Adapted from: music/ui/loading/skeleton (20% adaptation)
 * Pattern: Pulse animation matching StatsCards layout
 * 
 * Features:
 * - Matches StatsCards grid layout
 * - Smooth pulse animation
 * - Professional skeleton UI
 */

export function StatsCardsSkeleton() {
  return (
    <div className="stats-grid-skeleton">
      {/* Hero Card Skeleton */}
      <div className="skeleton-card skeleton-card-hero">
        <div className="skeleton-header">
          <div className="skeleton-label" />
          <div className="skeleton-icon" />
        </div>
        <div className="skeleton-value skeleton-value-large" />
        <div className="skeleton-detail" />
      </div>

      {/* Regular Cards Skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-header">
            <div className="skeleton-label" />
            <div className="skeleton-icon" />
          </div>
          <div className="skeleton-value" />
          <div className="skeleton-detail" />
        </div>
      ))}

      <style jsx>{`
        .stats-grid-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          width: 100%;
        }

        .skeleton-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .skeleton-card-hero {
          grid-column: span 2;
        }

        .skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .skeleton-label {
          width: 6rem;
          height: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.25rem;
        }

        .skeleton-icon {
          width: 1.5rem;
          height: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.375rem;
        }

        .skeleton-value {
          width: 8rem;
          height: 2rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .skeleton-value-large {
          width: 12rem;
          height: 2.5rem;
        }

        .skeleton-detail {
          width: 10rem;
          height: 0.875rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 0.25rem;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .stats-grid-skeleton {
            grid-template-columns: 1fr;
          }

          .skeleton-card-hero {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  )
}
