export type SelectorStateVariant = 'loading' | 'error' | 'empty' | 'no-results'

export function SelectorState({ variant, message, hint }: { variant: SelectorStateVariant; message: string; hint?: string }) {
	const base = 'rounded-2xl border px-4 py-3'
	const styles =
		variant === 'error'
			? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
			: variant === 'loading'
				? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
				: variant === 'no-results'
					? 'border-amber-400/30 bg-amber-500/5 text-amber-100'
					: 'border-slate-200 dark:border-white/10/15 bg-slate-100/90 dark:bg-white/5/5 text-slate-300'
	
	const icon =
		variant === 'error'
			? '⚠️'
			: variant === 'loading'
				? '⏳'
				: variant === 'no-results'
					? '🔍'
					: '📭'
	
	return (
		<div className={`${base} ${styles}`} role="status" aria-live="polite">
			<div className="flex items-start gap-2">
				<span aria-hidden="true" className="text-base">{icon}</span>
				<div className="flex-1">
					<p className="text-xs font-medium">{message}</p>
					{hint && <p className="mt-1 text-[10px] opacity-70">{hint}</p>}
				</div>
			</div>
		</div>
	)
}
