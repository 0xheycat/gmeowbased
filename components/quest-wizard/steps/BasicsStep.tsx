'use client'

import Image from 'next/image'
import type { ChangeEvent } from 'react'
import { Field } from '@/components/quest-wizard/components/Field'
import { QuickExpiryPicker } from '@/components/quest-wizard/components/QuickExpiryPicker'
import {
	getQuestFieldConfig,
	normalizeQuestTypeKey,
	CHAIN_KEYS,
	CHAIN_LABEL,
	type ChainKey,
} from '@/lib/gm-utils'
import {
	QUEST_TYPE_DETAILS,
	QUEST_TYPE_OPTIONS,
	sanitizeUsernameInput,
	type QuestDraft,
	type StepErrors,
} from '@/components/quest-wizard/shared'

type QuestTypeGuideProps = {
	questType: string
	detail: (typeof QUEST_TYPE_DETAILS)[keyof typeof QUEST_TYPE_DETAILS]
	config: ReturnType<typeof getQuestFieldConfig>
}

function QuestTypeGuide({ questType, detail, config }: QuestTypeGuideProps) {
	const modeLabel = config.mode === 'social' ? 'Social' : 'Onchain'
	const modeTone = config.mode === 'social' ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-purple-500/40 bg-purple-500/10 text-purple-300'

	const requirementHints: string[] = []
	if (config.followHandle === 'required') requirementHints.push('Follower username is required')
	if (config.frameUrl === 'required') requirementHints.push('Frame URL is required')
	if (config.castLink === 'required') requirementHints.push('Cast link is required')
	if (config.mentionHandle === 'required') requirementHints.push('Mention handle is required')
	if (config.targetHandle === 'required') requirementHints.push('Target username is required')
	if (config.targetFid === 'required') requirementHints.push('Target FID is required')

	const tips = detail.tips ?? []
	const showPanels = requirementHints.length > 0 || tips.length > 0

	return (
		<section className="rounded-3xl border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Quest template</p>
					<h3 className="mt-1 text-xl font-semibold text-slate-100">{detail.label}</h3>
					<p className="mt-2 max-w-xl text-sm text-slate-300">{detail.description}</p>
				</div>
				<span className={`inline-flex h-fit items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${modeTone}`}>
					{modeLabel}
				</span>
			</div>
			{showPanels ? (
				<div className="mt-4 grid gap-3 lg:grid-cols-2">
					{requirementHints.length ? (
						<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 p-4">
							<p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Fields</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-200">
								{requirementHints.map((hint, index) => (
									<li key={`${questType}-hint-${index}`} className="flex items-start gap-2">
										<span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
										<span>{hint}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
					{tips.length ? (
						<div className="rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/50 p-4">
							<p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Tips</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-200">
								{tips.map((tip, index) => (
									<li key={`${questType}-tip-${index}`} className="flex items-start gap-2">
										<span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
										<span>{tip}</span>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : (
				<p className="mt-4 text-xs text-slate-400">No extra fields required – jump straight into the basics below.</p>
			)}
		</section>
	)
}

export function BasicsStep({
	draft,
	onChange,
	errors,
	showValidation,
}: {
	draft: QuestDraft
	onChange(patch: Partial<QuestDraft>): void
	errors: StepErrors
	showValidation: boolean
}) {
	const questType = normalizeQuestTypeKey(draft.questTypeKey)
	const fieldConfig = getQuestFieldConfig(questType)
	const questDetail = QUEST_TYPE_DETAILS[questType] ?? QUEST_TYPE_DETAILS.GENERIC
	const followState = fieldConfig.followHandle
	const frameState = fieldConfig.frameUrl
	const castLinkState = fieldConfig.castLink
	const castTextState = fieldConfig.castText
	const mentionState = fieldConfig.mentionHandle
	const targetHandleState = fieldConfig.targetHandle
	const targetFidState = fieldConfig.targetFid
	const showFollow = followState !== 'hidden'
	const showFrame = frameState !== 'hidden'
	const showCastLink = castLinkState !== 'hidden'
	const showCastContains = castTextState !== 'hidden'
	const showMention = mentionState !== 'hidden'
	const showTargetUsername = targetHandleState !== 'hidden'
	const showTargetFid = targetFidState !== 'hidden'
	const followRequired = followState === 'required'
	const castLinkRequired = castLinkState === 'required'
	const castContainsRequired = castTextState === 'required'
	const mentionRequired = mentionState === 'required'
	const targetUsernameRequired = targetHandleState === 'required'
	const targetFidRequired = targetFidState === 'required'
	const getError = (key: string) => (showValidation ? errors[key] : undefined)
	const nameError = getError('name')
	const descriptionError = getError('description')
	const followError = getError('followUsername')
	const frameUrlError = getError('frameUrl')
	const castLinkError = getError('castLink')
	const mentionError = getError('mentionUsername')
	const targetUsernameError = getError('targetUsername')
	const targetFidError = getError('targetFid')

	const castLinkLabel = castLinkRequired ? 'Cast or channel link' : 'Cast or channel link (optional)'
	const castLinkDescription = castLinkRequired
		? 'Paste a Warpcast URL or cast hash — verified posts surface richer metadata'
		: 'Optional anchor. Paste a Warpcast URL or cast hash to enrich preview and verification.'
	const castContainsLabel = castContainsRequired ? 'Required cast text' : 'Cast keyword (optional)'
	const castContainsDescription = castContainsRequired
		? "Claimer's cast must include this phrase (case-insensitive)"
		: 'Optional keyword filter — match hashtags, phrases, or partner names'
	const mentionLabel = mentionRequired ? 'Mention handle' : 'Mention handle (optional)'
	const targetUsernameLabel = targetUsernameRequired ? 'Target username' : 'Target username (optional)'
	const targetFidLabel = targetFidRequired ? 'Target fid' : 'Target fid (optional)'

	const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onloadend = () => {
			const result = typeof reader.result === 'string' ? reader.result : ''
			onChange({ media: result, mediaPreview: result, mediaFileName: file.name })
		}
		reader.readAsDataURL(file)
	}

	const applyQuestTypeChange = (nextType: QuestDraft['questTypeKey']) => {
		const normalizedType = normalizeQuestTypeKey(nextType)
		const nextConfig = getQuestFieldConfig(normalizedType)
		const patch: Partial<QuestDraft> = { questTypeKey: normalizedType }
		if (nextConfig.followHandle === 'hidden' && draft.followUsername) {
			patch.followUsername = ''
		}
		if (nextConfig.mentionHandle === 'hidden' && draft.mentionUsername) {
			patch.mentionUsername = ''
		}
		if (nextConfig.castLink === 'hidden' && draft.castLink) {
			patch.castLink = ''
		}
		if (nextConfig.castText === 'hidden' && draft.castContains) {
			patch.castContains = ''
		}
		if (nextConfig.frameUrl === 'hidden' && draft.frameUrl) {
			patch.frameUrl = ''
		}
		if (nextConfig.targetHandle === 'hidden' && draft.targetUsername) {
			patch.targetUsername = ''
		}
		if (nextConfig.targetFid === 'hidden' && draft.targetFid) {
			patch.targetFid = ''
		}
		if (nextConfig.targetHandle === 'hidden' && nextConfig.targetFid === 'hidden' && draft.target) {
			patch.target = ''
		}
		onChange(patch)
	}

	const handleQuestTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
		applyQuestTypeChange(event.target.value as QuestDraft['questTypeKey'])
	}

	const handleMentionChange = (value: string) => {
		onChange({ mentionUsername: sanitizeUsernameInput(value) })
	}

	const handleTargetUsernameChange = (value: string) => {
		const sanitized = sanitizeUsernameInput(value)
		onChange({ targetUsername: sanitized, target: sanitized })
	}

	const handleTargetFidChange = (value: string) => {
		const digitsOnly = value.replace(/[^0-9]/g, '')
		onChange({ targetFid: digitsOnly, target: digitsOnly || draft.targetUsername })
	}

	return (
		<div className="grid gap-6">
			<QuestTypeGuide questType={questType} detail={questDetail} config={fieldConfig} />
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Quest title" description="Headline shown on the quest card" error={nameError}>
					<input
						className="pixel-input"
						placeholder="e.g., Win 100 USDC for daily GM's or Unlock early mint allowlist"
						value={draft.name}
						onChange={(event) => onChange({ name: event.target.value })}
						aria-invalid={Boolean(nameError)}
					/>
				</Field>
				<Field label="Quest type">
					<select
						className="pixel-input"
						value={questType}
						onChange={handleQuestTypeChange}
					>
						{QUEST_TYPE_OPTIONS.map((key) => {
							const optionDetail = QUEST_TYPE_DETAILS[normalizeQuestTypeKey(key)] ?? QUEST_TYPE_DETAILS.GENERIC
							return (
								<option key={key} value={key}>
									{optionDetail.label}
								</option>
							)
						})}
					</select>
				</Field>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Chain" description="Primary chain for reward settlement and onchain checks">
					<select className="pixel-input" value={draft.chain} onChange={(event) => onChange({ chain: event.target.value as ChainKey })}>
						{CHAIN_KEYS.map((chainKey) => (
							<option key={chainKey} value={chainKey}>
								{CHAIN_LABEL[chainKey]}
							</option>
						))}
					</select>
				</Field>
				<Field label="Expiry" description="Use a preset or schedule a UTC cutoff – blank keeps the quest evergreen">
					<QuickExpiryPicker value={draft.expiresAtISO} onChange={(next) => onChange({ expiresAtISO: next })} />
				</Field>
			</div>

			<Field label="Tagline" description="Appears under the quest title across cards, frames, and notifications">
				<input
					className="pixel-input"
					placeholder="e.g. Holders unlock early mint allowlist"
					value={draft.headline}
					onChange={(event) => onChange({ headline: event.target.value })}
				/>
			</Field>

			<Field label="Quest narrative" description="Outline instructions, rewards, and partner call-outs — Markdown (**bold**, - lists) is supported" error={descriptionError}>
				<textarea
					className="pixel-input min-h-[120px]"
					placeholder="Tell claimers what to do, why it matters, and who is partnering with you."
					value={draft.description}
					onChange={(event) => onChange({ description: event.target.value })}
					aria-invalid={Boolean(descriptionError)}
				/>
			</Field>

			{showFollow ? (
				<Field label="Follower username" description="Enter the Farcaster handle (no @). We highlight verified profiles when detected." error={followError}>
					<input
						className="pixel-input"
						placeholder="@heycat"
						value={draft.followUsername}
						onChange={(event) => onChange({ followUsername: event.target.value.replace(/^@/, '') })}
						aria-invalid={Boolean(followError)}
						aria-required={followRequired}
					/>
				</Field>
			) : null}

			{showFrame ? (
				<Field label="Frame URL" description="Paste the https://warpcast.com/~/frame/... link to enable frame verification and analytics" error={frameUrlError}>
					<input
						className="pixel-input"
						placeholder="https://warpcast.com/~/frame/..."
						value={draft.frameUrl}
						onChange={(event) => onChange({ frameUrl: event.target.value.trim() })}
						aria-invalid={Boolean(frameUrlError)}
						aria-required={frameState === 'required'}
					/>
				</Field>
			) : null}

			{showCastLink ? (
				<Field label={castLinkLabel} description={castLinkDescription} error={castLinkError}>
					<input
						className="pixel-input"
						placeholder="https://warpcast.com/... or 0xcasthash"
						value={draft.castLink}
						onChange={(event) => onChange({ castLink: event.target.value.trim() })}
						aria-invalid={Boolean(castLinkError)}
						aria-required={castLinkRequired}
					/>
				</Field>
			) : null}

			{showCastContains ? (
				<Field label={castContainsLabel} description={castContainsDescription}>
					<input
						className="pixel-input"
						placeholder="e.g. #based or gm"
						value={draft.castContains}
						onChange={(event) => onChange({ castContains: event.target.value })}
					/>
				</Field>
			) : null}

			{showMention ? (
				<Field label={mentionLabel} description="Claimer must mention this Farcaster handle — we strip the @ automatically" error={mentionError}>
					<input
						className="pixel-input"
						placeholder="@gmeowbased"
						value={draft.mentionUsername}
						onChange={(event) => handleMentionChange(event.target.value)}
						aria-invalid={Boolean(mentionError)}
						aria-required={mentionRequired}
					/>
				</Field>
			) : null}

			{showTargetUsername || showTargetFid ? (
				<div className="grid gap-4 sm:grid-cols-2">
					{showTargetUsername ? (
						<Field label={targetUsernameLabel} description="Override the detected username if the target may change handles" error={targetUsernameError}>
							<input
								className="pixel-input"
								placeholder="@caster"
								value={draft.targetUsername}
								onChange={(event) => handleTargetUsernameChange(event.target.value)}
								aria-invalid={Boolean(targetUsernameError)}
								aria-required={targetUsernameRequired}
							/>
						</Field>
					) : null}
					{showTargetFid ? (
						<Field label={targetFidLabel} description="Lock to a specific FID if you expect the username to rotate" error={targetFidError}>
							<input
								className="pixel-input"
								placeholder="e.g., 3621 (dwr.eth's FID)"
								value={draft.targetFid}
								onChange={(event) => handleTargetFidChange(event.target.value)}
								aria-invalid={Boolean(targetFidError)}
								aria-required={targetFidRequired}
							/>
						</Field>
					) : null}
				</div>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Cover image" description="Upload or paste artwork (1280×720 recommended) to preview the quest card">
					<input className="pixel-input" type="file" accept="image/*" onChange={handleMediaUpload} />
					<input
						className="pixel-input"
						placeholder="https://cdn..."
						value={draft.media && draft.media.startsWith('http') ? draft.media : ''}
						onChange={(event) => onChange({ media: event.target.value, mediaPreview: event.target.value })}
					/>
				</Field>
				<div className="flex h-full items-center justify-center rounded-2xl border border-white dark:border-slate-700/10 bg-slate-950/40 p-4">
					{draft.mediaPreview ? (
						<div className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-white dark:border-slate-700/10 shadow-lg shadow-sky-500/20">
							<Image
								src={draft.mediaPreview}
								alt="Quest media preview"
								width={440}
								height={440}
								className="h-auto w-full object-cover"
								unoptimized
							/>
							{draft.mediaFileName ? (
								<div className="border-t border-white dark:border-slate-700/10 bg-slate-950/80 px-3 py-2 text-center text-[11px] text-slate-300">
									{draft.mediaFileName}
								</div>
							) : null}
						</div>
					) : (
						<span className="text-center text-xs text-slate-400">Upload an image to preview the quest card cover.</span>
					)}
				</div>
			</div>
		</div>
	)
}
