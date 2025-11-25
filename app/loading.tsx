import Loader from '@/components/ui/loader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#060720] via-[#110c3a] to-[#1b0d4a] bg-gradient-to-br text-slate-200" aria-busy="true">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 px-4 sm:px-6 py-24 text-center" style={{ fontFamily: 'var(--site-font)' }}>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 shadow-[0_24px_80px_rgba(12,13,54,0.45)]">
          <div className="absolute inset-0 rounded-3xl border border-white dark:border-slate-700/10" />
          <Loader size="large" variant="moveUp" className="text-[#fdbb2d]" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Gmeow Systems</p>
          <h1 className="mt-3 text-2xl font-extrabold">Warming up the quest grid…</h1>
          <p className="mt-2 text-sm text-slate-400">
            Syncing live notifications and loading your cross-chain streaks.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 text-sm uppercase tracking-[0.32em] text-slate-500">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5">
            <span className="block h-full w-full animate-[progress-drip_1.6s_ease-in-out_infinite] bg-gradient-to-r from-[#6366f1] via-[#ec4899] to-[#fdbb2d]" />
          </div>
          <span>Live notifications ready</span>
        </div>
      </div>
    </div>
  )
}
