import Loader from '@/components/ui/loader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 text-gray-900 dark:text-slate-200" aria-busy="true">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-8 px-4 sm:px-6 py-24 text-center font-site">
        {/* Professional Loader Container */}
        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100/10 to-slate-100/5 shadow-[0_32px_96px_rgba(99,102,241,0.15)]">
          <div className="absolute inset-0 rounded-3xl border border-slate-700/20 backdrop-blur-sm" />
          <div className="absolute inset-0 animate-skeleton-pulsate rounded-3xl border border-indigo-400/10" />
          <Loader size="large" variant="spin" color="#fdbb2d" />
        </div>

        {/* Professional Messaging */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.36em] text-slate-500 font-medium">
            Gmeow Protocol
          </p>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 bg-clip-text text-transparent">
            Initializing Your Dashboard
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 max-w-sm mx-auto">
            Syncing cross-chain quests, live notifications, and your on-chain achievements
          </p>
        </div>

        {/* Professional Progress Indicator */}
        <div className="w-full space-y-3">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-100/5">
            <span className="absolute inset-0 animate-[progress-drip_1.8s_ease-in-out_infinite] bg-gradient-to-r from-[#6366f1] via-[#ec4899] to-[#fdbb2d] shadow-[0_0_20px_rgba(253,187,45,0.3)]" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-skeleton-pulsate rounded-full bg-emerald-400" />
              System Ready
            </span>
            <span className="uppercase tracking-wider">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
