/**
 * Dashboard Hero Banner
 * Professional gradient background (NO emojis!)
 */

export function DashboardHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900 dark:bg-gray-800 p-8 mb-6">
      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-white mb-2">
          Discover Trending on Base
        </h1>
        <p className="text-gray-300 dark:text-gray-400 text-lg">
          Real-time tokens, top casters, trending channels & more
        </p>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 bg-grid-white/10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  )
}
