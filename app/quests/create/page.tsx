/**
 * Quest Create Page
 * Route: /quests/create
 * 
 * Dialog Usage:
 * - ErrorDialog: Displays template fetch errors with retry option
 * - useDialog: State management for error dialog
 * - QuestDraftRecoveryPrompt: Contains useConfirmDialog for discard confirmation (via child component)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/lib/contexts/AuthContext'
import { WizardStepper, type WizardStep } from './components/WizardStepper'
import { TemplateSelector } from './components/TemplateSelector'
import { QuestBasicsForm } from './components/QuestBasicsForm'
import { TaskBuilder } from './components/TaskBuilder'
import { RewardsForm } from './components/RewardsForm'
import { QuestPreview } from './components/QuestPreview'
import { PointsCostBadge } from './components/PointsCostBadge'
import { calculateQuestCost } from '@/lib/quests/cost-calculator'
import { fetchQuestTemplates } from '@/app/actions/quest-templates'
import { 
  useQuestDraftAutoSave,
  type QuestDraftMetadata 
} from '@/lib/hooks/use-quest-draft-autosave'
import { QuestDraftSaveIndicator } from '@/components/quests/QuestDraftSaveIndicator'
import { QuestDraftRecoveryPrompt } from '@/components/quests/QuestDraftRecoveryPrompt'
import { useDialog } from '@/components/dialogs'
import { ErrorDialog } from '@/components/dialogs'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import type { QuestDraft, QuestTemplate, TaskConfig } from '@/lib/quests/types'

// Mock templates for development (fallback if database fetch fails)
const MOCK_TEMPLATES: QuestTemplate[] = [
  {
    id: '1',
    name: 'Social Amplifier',
    description: 'Grow Farcaster presence with follows and engagement',
    category: 'social',
    difficulty: 'beginner',
    cost_points: 50,
    usage_count: 245,
    template_data: {
      title: '',
      description: '',
      category: 'social',
      difficulty: 'beginner',
      estimated_time: '15min',
      ends_at: '',
      tasks: [],
      reward_points_awarded: 50,
    },
    created_by: 'system',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Base Explorer',
    description: 'Onchain verification with token swaps and NFT mints',
    category: 'onchain',
    difficulty: 'intermediate',
    cost_points: 200,
    usage_count: 189,
    template_data: {
      title: '',
      description: '',
      category: 'onchain',
      difficulty: 'intermediate',
      estimated_time: '30min',
      ends_at: '',
      tasks: [],
      reward_points_awarded: 100,
    },
    created_by: 'system',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Hybrid Champion',
    description: 'Combine social and onchain tasks for maximum engagement',
    category: 'social',
    difficulty: 'advanced',
    cost_points: 250,
    usage_count: 127,
    template_data: {
      title: '',
      description: '',
      category: 'social',
      difficulty: 'advanced',
      estimated_time: '1hr',
      ends_at: '',
      tasks: [],
      reward_points_awarded: 150,
    },
    created_by: 'system',
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export default function QuestCreatePage() {
  const router = useRouter()
  const { fid, address } = useAuthContext()
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('template')
  const [questDraft, setQuestDraft] = useState<Partial<QuestDraft>>({
    tasks: [],
    reward_points_awarded: 10,
  })
  const [isPublishing, setIsPublishing] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationPayload, setCelebrationPayload] = useState<XpEventPayload | null>(null)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [recoveryMetadata, setRecoveryMetadata] = useState<QuestDraftMetadata | null>(null)
  
  // Templates state (Phase 3: Database integration)
  const [templates, setTemplates] = useState<QuestTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  
  // Error dialog
  const errorDialog = useDialog()
  const [errorDialogConfig, setErrorDialogConfig] = useState<{
    title: string
    message: string
    onRetry?: () => void
  }>({ title: '', message: '' })
  
  // NEW Auto-save system (built from scratch)
  const {
    save: saveDraft,
    clearDraft,
    loadDraft,
    getMetadata,
    saveCount,
  } = useQuestDraftAutoSave(questDraft, true)
  
  // Check for saved draft on mount
  useEffect(() => {
    const metadata = getMetadata()
    if (metadata) {
      setRecoveryMetadata(metadata)
      setShowRecoveryPrompt(true)
    }
  }, [getMetadata])
  
  // Load templates from database (Phase 3)
  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true)
      const result = await fetchQuestTemplates({ limit: 10 })
      
      if (result.success && result.templates) {
        setTemplates(result.templates)
      } else {
        // Fallback to mock templates if database fetch fails
        setTemplates(MOCK_TEMPLATES)
      }
      
      setLoadingTemplates(false)
    }
    
    loadTemplates()
  }, [])
  
  // Handle draft recovery
  const handleRestoreDraft = () => {
    const draft = loadDraft()
    if (draft) {
      setQuestDraft(draft)
      setCurrentStep('basics') // Start from basics step
    }
    setShowRecoveryPrompt(false)
  }
  
  const handleDiscardDraft = () => {
    clearDraft()
    setShowRecoveryPrompt(false)
  }

  // Calculate cost in real-time
  const estimatedCost = calculateQuestCost({
    category: (questDraft.category || 'social') as any,
    taskCount: questDraft.tasks?.length || 0,
    rewardXp: 0, // XP removed - calculated at completion based on quest type
    hasNewBadge: questDraft.create_new_badge,
    rewardPoints: questDraft.reward_points_awarded || 0,
    maxParticipants: questDraft.max_participants, // Include max participants for accurate escrow calculation
  })

  const handleTemplateSelect = (template: QuestTemplate) => {
    setQuestDraft({
      ...template.template_data,
      template_id: template.id,
    })
    setCurrentStep('basics')
  }

  const handleUpdateBasics = (data: Partial<QuestDraft>) => {
    setQuestDraft((prev) => ({ ...prev, ...data }))
  }

  const handleUpdateTasks = (tasks: TaskConfig[]) => {
    setQuestDraft((prev) => ({ ...prev, tasks }))
  }

  const handleUpdateRewards = (data: Partial<QuestDraft>) => {
    setQuestDraft((prev) => ({ ...prev, ...data }))
  }

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      // Ensure creator info is included
      if (!fid) {
        throw new Error('Please connect your wallet to create a quest')
      }

      // Phase 3: API call to /api/quests/create
      const response = await fetch('/api/quests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...questDraft,
          creator_fid: fid,
          creator_address: address,
          // Remove undefined cover_image_url if not set
          cover_image_url: questDraft.cover_image_url || undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to create quest')
      }

      // Clear auto-save after successful publish
      clearDraft()

      // Show celebration overlay
      // Award XP for quest creation (separate from points escrow)
      const questXP = result.data.rewards?.xp_earned || questDraft.reward_points_awarded || 100
      const questCost = result.data.cost?.total || questDraft.reward_points_awarded || 0
      setCelebrationPayload({
        event: 'quest-create',
        chainKey: 'base',
        xpEarned: questXP, // Award XP for creating a quest
        totalPoints: result.data.escrow?.points_remaining || 0,
        headline: 'Quest ready to launch',
        shareLabel: 'Announce quest frame',
        visitUrl: `/quests/${result.data.quest.slug}`,
        visitLabel: 'View quest',
        tierTagline: `+${questXP} XP earned • ${questCost} points escrowed`,
      })
      setShowCelebration(true)

      // Redirect after celebration (30s to match ANIMATION_TIMINGS.modalAutoDismiss)
      setTimeout(() => {
        router.push(`/quests/${result.data.quest.slug}`)
      }, 30000)
    } catch (error) {
      console.error('Failed to publish quest:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialogConfig({
        title: 'Failed to Publish Quest',
        message: `Unable to publish quest. Please check your connection and try again. ${errorMessage}`,
        onRetry: handlePublish
      })
      errorDialog.open()
    } finally {
      setIsPublishing(false)
    }
  }
  
  // Handle save draft
  const handleSaveDraft = () => {
    try {
      saveDraft(questDraft)
      // Draft auto-saves, no need for manual success message
    } catch (error) {
      console.error('Failed to save draft:', error)
      setErrorDialogConfig({
        title: 'Failed to Save Draft',
        message: 'Unable to save quest draft to local storage.',
      })
      errorDialog.open()
    }
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Auto-save Recovery Prompt */}
      {showRecoveryPrompt && recoveryMetadata && (
        <QuestDraftRecoveryPrompt
          metadata={recoveryMetadata}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      
      {/* Wizard Stepper */}
      <WizardStepper 
        currentStep={currentStep}
        onStepClick={(step) => {
          // Allow navigation to previous steps
          const steps: WizardStep[] = ['template', 'basics', 'tasks', 'rewards', 'preview']
          const currentIndex = steps.indexOf(currentStep)
          const targetIndex = steps.indexOf(step)
          if (targetIndex <= currentIndex) {
            setCurrentStep(step)
          }
        }}
        className="mb-8"
      />

      {/* Real-time Cost Display + Auto-save Indicator */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 mb-8 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create Quest</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Step {['template', 'basics', 'tasks', 'rewards', 'preview'].indexOf(currentStep) + 1} of 5
              </p>
              {saveCount > 0 && (
                <QuestDraftSaveIndicator lastSaved={Date.now()} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Save Draft Button */}
            {currentStep !== 'template' && (
              <button
                onClick={handleSaveDraft}
                className="text-sm px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                Save Draft
              </button>
            )}
            {/* Cost Display with PointsCostBadge */}
            <PointsCostBadge cost={estimatedCost} />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[600px]">
      {currentStep === 'template' && (
        <TemplateSelector
          templates={loadingTemplates ? [] : templates}
          onSelect={handleTemplateSelect}
        />
      )}        {currentStep === 'basics' && (
          <QuestBasicsForm
            draft={questDraft}
            onUpdate={handleUpdateBasics}
            onNext={() => setCurrentStep('tasks')}
            onBack={() => setCurrentStep('template')}
          />
        )}

        {currentStep === 'tasks' && (
          <TaskBuilder
            tasks={questDraft.tasks || []}
            onUpdate={handleUpdateTasks}
            onNext={() => setCurrentStep('rewards')}
            onBack={() => setCurrentStep('basics')}
          />
        )}

        {currentStep === 'rewards' && (
          <RewardsForm
            draft={questDraft}
            estimatedCost={estimatedCost.total}
            onUpdate={handleUpdateRewards}
            onNext={() => setCurrentStep('preview')}
            onBack={() => setCurrentStep('tasks')}
          />
        )}

        {currentStep === 'preview' && (
          <QuestPreview
            draft={questDraft as QuestDraft}
            estimatedCost={estimatedCost.total}
            onPublish={handlePublish}
            onBack={() => setCurrentStep('rewards')}
            isPublishing={isPublishing}
          />
        )}
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={errorDialog.close}
        title={errorDialogConfig.title}
        error={errorDialogConfig.message}
        onRetry={errorDialogConfig.onRetry}
      />

      {/* Success Celebration Overlay */}
      <XPEventOverlay
        open={showCelebration}
        payload={celebrationPayload}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  )
}
