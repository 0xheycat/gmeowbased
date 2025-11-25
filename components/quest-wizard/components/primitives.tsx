import type { ReactNode } from 'react'

export type StatusTone = 'ready' | 'warn' | 'neutral'

export function StatusPill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
	const palette: Record<StatusTone, string> = {
		ready: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
		warn: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
		neutral: 'border-slate-400/40 bg-slate-100/90 dark:bg-white/5/10 text-slate-200',
	}

	return (
		<span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${palette[tone]}`}>
			{children}
		</span>
	)
}

export function MiniStat({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/40 px-4 py-3">
			<p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
			<div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
		</div>
	)
}
