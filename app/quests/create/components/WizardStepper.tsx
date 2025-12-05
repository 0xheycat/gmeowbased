'use client'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export type WizardStep = 'template' | 'basics' | 'tasks' | 'rewards' | 'preview'

interface WizardStepperProps {
  currentStep: WizardStep
  onStepClick?: (step: WizardStep) => void
  className?: string
}

const STEPS: Array<{
  key: WizardStep
  label: string
  description: string
}> = [
  { key: 'template', label: 'Template', description: 'Choose a starting point' },
  { key: 'basics', label: 'Basics', description: 'Quest details' },
  { key: 'tasks', label: 'Tasks', description: 'Setup verification' },
  { key: 'rewards', label: 'Rewards', description: 'Configure rewards' },
  { key: 'preview', label: 'Preview', description: 'Review & publish' },
]

export function WizardStepper({
  currentStep,
  onStepClick,
  className = '',
}: WizardStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep)

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Stepper (Horizontal) */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isComplete = index < currentIndex
            const isCurrent = index === currentIndex
            const isClickable = onStepClick && (isComplete || isCurrent)

            return (
              <div key={step.key} className="flex flex-1 items-center">
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={`
                    relative flex h-12 w-12 items-center justify-center rounded-full font-semibold transition-all
                    ${isComplete ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${!isComplete && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                  `}
                >
                  {isComplete ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {/* Step Label & Description */}
                <div className="ml-4 flex-1">
                  <div
                    className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className="mx-4 h-0.5 w-full flex-1 bg-border">
                    <div
                      className={`h-full transition-all ${isComplete ? 'bg-primary' : 'bg-transparent'}`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Stepper (Vertical Compact) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {currentIndex + 1}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {STEPS[currentIndex].label}
              </div>
              <div className="text-xs text-muted-foreground">
                Step {currentIndex + 1} of {STEPS.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="text-sm font-medium text-muted-foreground">
            {Math.round(((currentIndex + 1) / STEPS.length) * 100)}%
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
