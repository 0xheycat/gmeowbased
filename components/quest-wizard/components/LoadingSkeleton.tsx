export function TemplateSkeletonGrid() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{[...Array(6)].map((_, i) => (
				<div
					key={i}
					className="overflow-hidden rounded-2xl border border-white dark:border-slate-700/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 animate-pulse"
				>
					{/* Icon skeleton */}
					<div className="mb-4 h-16 w-16 rounded-2xl bg-slate-800/60" />
					
					{/* Title skeleton */}
					<div className="mb-2 h-5 w-3/4 rounded bg-slate-800/60" />
					
					{/* Description skeleton */}
					<div className="mb-4 space-y-2">
						<div className="h-3 w-full rounded bg-slate-800/40" />
						<div className="h-3 w-5/6 rounded bg-slate-800/40" />
					</div>
					
					{/* Meta badges skeleton */}
					<div className="flex gap-2">
						<div className="h-6 w-16 rounded-full bg-slate-800/40" />
						<div className="h-6 w-20 rounded-full bg-slate-800/40" />
						<div className="h-6 w-16 rounded-full bg-slate-800/40" />
					</div>
				</div>
			))}
		</div>
	)
}

export function AssetListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{[...Array(count)].map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-3 rounded-xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-3 animate-pulse"
				>
					{/* Asset icon skeleton */}
					<div className="h-10 w-10 rounded-full bg-slate-800/60" />
					
					<div className="flex-1 space-y-2">
						{/* Asset name */}
						<div className="h-4 w-32 rounded bg-slate-800/60" />
						{/* Asset details */}
						<div className="h-3 w-24 rounded bg-slate-800/40" />
					</div>
					
					{/* Badge skeleton */}
					<div className="h-5 w-16 rounded-full bg-slate-800/40" />
				</div>
			))}
		</div>
	)
}

export function FormFieldSkeleton() {
	return (
		<div className="space-y-3 rounded-2xl border border-white dark:border-slate-700/10 bg-white dark:bg-slate-900/[0.04] p-4 animate-pulse">
			{/* Label skeleton */}
			<div className="h-4 w-32 rounded bg-slate-800/60" />
			
			{/* Description skeleton */}
			<div className="h-3 w-full rounded bg-slate-800/40" />
			
			{/* Input skeleton */}
			<div className="h-10 w-full rounded-lg bg-slate-800/60" />
		</div>
	)
}
