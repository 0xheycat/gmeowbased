'use client'

import { Children, cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'

export type FieldProps = {
	label: string
	description?: string
	error?: string | null
	children: ReactNode
}

export function Field({ label, description, error, children }: FieldProps) {
	const fieldId = useId()
	const legendId = `${fieldId}-legend`
	const descriptionId = description ? `${fieldId}-description` : undefined
	const errorId = error ? `${fieldId}-error` : undefined
	const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

	const enhancedChildren = Children.map(children, (child, index) => {
		if (!isValidElement(child)) {
			return child
		}

		const childProps = child.props as Record<string, unknown>
		const existingId = childProps.id as string | undefined
		const controlId = existingId ?? `${fieldId}-control-${index}`
		const existingDescribedBy = childProps['aria-describedby'] as string | undefined
		const existingLabelledBy = childProps['aria-labelledby'] as string | undefined
		const nextDescribedBy = [existingDescribedBy, describedBy].filter(Boolean).join(' ') || undefined
		const nextLabelledBy = [existingLabelledBy, legendId].filter(Boolean).join(' ') || undefined

		// @edit-start 2025-11-11 — Ensure cloned field controls carry stable IDs
		const nextProps = {
			id: controlId,
			'aria-describedby': nextDescribedBy,
			'aria-labelledby': nextLabelledBy,
		}

		return cloneElement(child as ReactElement, nextProps as any)
		// @edit-end
	})

	return (
		<fieldset
			aria-describedby={describedBy}
			aria-invalid={Boolean(error)}
			className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
		>
			<legend id={legendId} className="text-xs font-semibold uppercase tracking-wide text-slate-100">
				{label}
			</legend>
			{description ? (
				<p id={descriptionId} className="text-xs text-slate-400">
					{description}
				</p>
			) : null}
			<div className="space-y-2">{enhancedChildren}</div>
			{error ? (
				<p id={errorId} role="alert" aria-live="polite" className="text-xs font-medium text-rose-300">
					{error}
				</p>
			) : null}
		</fieldset>
	)
}
