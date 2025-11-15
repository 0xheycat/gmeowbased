import type { StepperProps } from '../shared'

export function Stepper({ activeIndex, steps, onSelect }: StepperProps) {
	return (
		<ol className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible">
			{steps.map((step, index) => {
				const isActive = step.status === 'active' || index === activeIndex
				const isDone = step.status === 'done'
				// @edit-start 2025-11-12 — Improve focus visibility on stepper controls
				return (
					<li key={step.key} className="group flex-none snap-start min-w-[220px] lg:min-w-0">
						<button
							type="button"
							onClick={() => onSelect(index)}
							className={`flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
								isActive
									? 'border-sky-400/60 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
									: isDone
										? 'border-emerald-400/40 bg-emerald-500/5'
										: 'border-white/5 hover:border-white/15 hover:bg-white/5'
							}`}
							aria-current={isActive ? 'step' : undefined}
						>
							<span className="flex items-center gap-2 text-sm font-semibold">
								<span
									className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] uppercase tracking-[0.2em] ${
										isActive
											? 'border-sky-400 bg-sky-400/10 text-sky-200'
											: isDone
												? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
												: 'border-white/10 bg-slate-900 text-slate-400'
									}`}
								>
									{index + 1}
								</span>
								{step.label}
							</span>
							<span className="text-xs text-slate-400">{step.description}</span>
						</button>
					</li>
				)
				// @edit-end
			})}
		</ol>
	)
}
