import { useCallback, useReducer, useState } from 'react'
import type { QuestDraft, StepKey, StepValidationResult } from '../shared'
import { draftReducer, EMPTY_DRAFT, STEPS } from '../shared'

export type WizardStateReturn = {
	draft: QuestDraft
	stepIndex: number
	headerCollapsed: boolean
	touchedSteps: Record<StepKey, boolean>
	setHeaderCollapsed: React.Dispatch<React.SetStateAction<boolean>>
	onDraftChange: (patch: Partial<QuestDraft>) => void
	onNext: (validation: Record<StepKey, StepValidationResult>) => void
	onPrev: () => void
	onStepSelect: (index: number, validation: Record<StepKey, StepValidationResult>) => void
	onReset: () => void
	markStepTouched: (key: StepKey) => void
}

export type UseWizardStateOptions = {
	pushNotification: (notification: {
		tone: 'info' | 'warning' | 'success' | 'error'
		title: string
		description: string
	}) => number
}

export function useWizardState({
	pushNotification,
}: UseWizardStateOptions): WizardStateReturn {
	const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT)
	const [stepIndex, setStepIndex] = useState(0)
	const [headerCollapsed, setHeaderCollapsed] = useState(false)
	const [touchedSteps, setTouchedSteps] = useState<Record<StepKey, boolean>>({
		basics: false,
		eligibility: false,
		rewards: false,
		preview: false,
	})

	const markStepTouched = useCallback((key: StepKey) => {
		setTouchedSteps((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
	}, [])

	const handleDraftChange = useCallback((patch: Partial<QuestDraft>) => {
		dispatch({ type: 'merge', patch })
	}, [])

	// Navigation functions accept validation as parameter to avoid circular dependency
	const handleStepSelect = useCallback(
		(index: number, validation: Record<StepKey, StepValidationResult>) => {
			if (index === stepIndex) return
			const currentStep = STEPS[stepIndex]
			const currentValidation = validation[currentStep.key]
			if (index > stepIndex && !currentValidation.valid) {
				markStepTouched(currentStep.key)
				pushNotification({
					tone: 'warning',
					title: `Complete ${currentStep.label}`,
					description: 'Fill in the highlighted fields before advancing to the next step.',
				})
				return
			}
			setStepIndex(index)
		},
		[markStepTouched, pushNotification, stepIndex],
	)

	const handleNextStep = useCallback(
		(validation: Record<StepKey, StepValidationResult>) => {
			const currentStep = STEPS[stepIndex]
			const currentValidation = validation[currentStep.key]
			if (!currentValidation.valid) {
				markStepTouched(currentStep.key)
				pushNotification({
					tone: 'warning',
					title: `Finish ${currentStep.label}`,
					description: 'Complete the required fields to continue the wizard.',
				})
				return
			}
			setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
		},
		[markStepTouched, pushNotification, stepIndex],
	)

	const handlePrevStep = useCallback(() => {
		setStepIndex((prev) => Math.max(prev - 1, 0))
	}, [])

	const handleReset = useCallback(() => {
		dispatch({ type: 'reset' })
		setTouchedSteps({ basics: false, eligibility: false, rewards: false, preview: false })
	}, [])

	return {
		draft,
		stepIndex,
		headerCollapsed,
		touchedSteps,
		setHeaderCollapsed,
		onDraftChange: handleDraftChange,
		onNext: handleNextStep,
		onPrev: handlePrevStep,
		onStepSelect: handleStepSelect,
		onReset: handleReset,
		markStepTouched,
	}
}
