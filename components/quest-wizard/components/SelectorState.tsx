export type SelectorStateVariant = 'loading' | 'error' | 'empty'

export function SelectorState({ variant, message }: { variant: SelectorStateVariant; message: string }) {
	const base = 'rounded-2xl border px-4 py-3 text-xs'
	const styles =
		variant === 'error'
			? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
			: variant === 'loading'
				? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
				: 'border-white/15 bg-white/5 text-slate-300'
	return <div className={`${base} ${styles}`}>{message}</div>
}
