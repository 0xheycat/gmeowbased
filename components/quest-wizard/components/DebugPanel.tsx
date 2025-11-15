import type { QuestDraft, TokenOption, NftOption } from '../shared'

type DebugPanelProps = {
	draft: QuestDraft
	tokens: TokenOption[]
	nfts: NftOption[]
	assetsLoading: boolean
	assetsError: string | null
	assetWarnings: string[]
}

export function DebugPanel({
	draft,
	tokens,
	nfts,
	assetsLoading,
	assetsError,
	assetWarnings,
}: DebugPanelProps) {
	return (
		<div className="space-y-3">
			<details className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
				<summary className="cursor-pointer text-sm font-semibold text-slate-200">Debug · QuestDraft JSON</summary>
				<pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-950/80 p-3 text-[11px] text-emerald-200">
					{JSON.stringify(draft, null, 2)}
				</pre>
			</details>
			<details className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
				<summary className="cursor-pointer text-sm font-semibold text-slate-200">Debug · Catalog snapshot</summary>
				<div className="mt-3 space-y-3">
					<div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] text-slate-200">
						<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Status</strong>
						<div className="mt-1 space-y-1">
							<div>Loading: {assetsLoading ? 'yes' : 'no'}</div>
							{assetsError ? <div className="text-rose-200">Error: {assetsError}</div> : null}
							{assetWarnings.length > 0 ? (
								<ul className="space-y-0.5 text-amber-200">
									{assetWarnings.map((warning) => (
										<li key={warning}>• {warning}</li>
									))}
								</ul>
							) : null}
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-sky-200">
							<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Tokens</strong>
							{JSON.stringify(tokens, null, 2)}
						</pre>
						<pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-purple-200">
							<strong className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">NFTs</strong>
							{JSON.stringify(nfts, null, 2)}
						</pre>
					</div>
				</div>
			</details>
		</div>
	)
}
