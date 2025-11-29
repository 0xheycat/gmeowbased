'use client'

/**
 * Quest Creation Wizard - 3-Step Modal
 * Phase 14: Complete quest creation experience
 * 
 * Steps:
 * 1. Quest Type Selection (category + specific type)
 * 2. Quest Details Form (title, description, rewards, verification data)
 * 3. Preview & Create (show preview, call API)
 */

import { useState } from 'react'
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui/tailwick-primitives'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { QuestIcon, type QuestIconType } from '@/components/ui/QuestIcon'

// Quest types
type QuestCategory = 'onchain' | 'social'
type QuestType = 
  | 'token_hold' | 'nft_own' | 'transaction_make' | 'multichain_gm' | 'contract_interact' | 'liquidity_provide' // On-chain
  | 'follow_user' | 'like_cast' | 'recast_cast' | 'reply_cast' | 'join_channel' | 'cast_mention' | 'cast_hashtag' // Social

interface QuestFormData {
  title: string
  description: string
  reward_points: number
  creation_cost: number
  creator_earnings_percent: number
  max_completions: number | null
  expires_at: string | null
  verification_data: Record<string, any>
  quest_image_url: string | null
  quest_image_storage_path: string | null
}

interface QuestWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userBalance: number
  userFid: number
}

export function QuestCreationWizard({
  isOpen,
  onClose,
  onSuccess,
  userBalance,
  userFid
}: QuestWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState<QuestCategory | null>(null)
  const [questType, setQuestType] = useState<QuestType | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<QuestFormData>({
    title: '',
    description: '',
    reward_points: 500,
    creation_cost: 200,
    creator_earnings_percent: 15,
    max_completions: null,
    expires_at: null,
    verification_data: {},
    quest_image_url: null,
    quest_image_storage_path: null
  })

  // Validation & submission state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!isOpen) return null

  // Quest type metadata
  const questTypes: Record<QuestCategory, Array<{
    type: QuestType
    label: string
    icon: QuestIconType
    description: string
    status: 'active' | 'placeholder'
  }>> = {
    onchain: [
      { type: 'token_hold', label: 'Token Hold', icon: 'token_hold', description: 'Hold ERC20 tokens', status: 'active' },
      { type: 'nft_own', label: 'NFT Own', icon: 'nft_own', description: 'Own specific NFT', status: 'active' },
      { type: 'transaction_make', label: 'Transaction', icon: 'transaction_make', description: 'Make a transaction', status: 'active' },
      { type: 'multichain_gm', label: 'Multi-Chain GM', icon: 'multichain_gm', description: 'GM on multiple chains', status: 'active' },
      { type: 'contract_interact', label: 'Contract Interact', icon: 'contract_interact', description: 'Interact with contract', status: 'active' },
      { type: 'liquidity_provide', label: 'Liquidity', icon: 'liquidity_provide', description: 'Provide DEX liquidity', status: 'active' },
    ],
    social: [
      { type: 'follow_user', label: 'Follow User', icon: 'follow_user', description: 'Follow a Farcaster user', status: 'active' },
      { type: 'like_cast', label: 'Like Cast', icon: 'like_cast', description: 'Like a specific cast', status: 'active' },
      { type: 'recast_cast', label: 'Recast', icon: 'recast_cast', description: 'Recast a specific cast', status: 'active' },
      { type: 'reply_cast', label: 'Reply', icon: 'reply_cast', description: 'Reply to a cast', status: 'active' },
      { type: 'join_channel', label: 'Join Channel', icon: 'join_channel', description: 'Join a channel', status: 'active' },
      { type: 'cast_mention', label: 'Mention User', icon: 'cast_mention', description: 'Mention user in cast', status: 'active' },
      { type: 'cast_hashtag', label: 'Use Hashtag', icon: 'cast_hashtag', description: 'Use specific hashtag', status: 'active' },
    ]
  }

  // Navigation
  const goToStep = (step: 1 | 2 | 3) => {
    setCurrentStep(step)
    setErrors({})
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!category || !questType) {
        setErrors({ step1: 'Please select quest category and type' })
        return
      }
      goToStep(2)
    } else if (currentStep === 2) {
      // Validate step 2
      const newErrors: Record<string, string> = {}
      
      if (!formData.title.trim()) newErrors.title = 'Title is required'
      if (!formData.description.trim()) newErrors.description = 'Description is required'
      if (formData.reward_points < 100) newErrors.reward_points = 'Reward must be at least 100 points'
      if (formData.creation_cost < 100 || formData.creation_cost > 500) newErrors.creation_cost = 'Cost must be 100-500 points'
      if (formData.creator_earnings_percent < 10 || formData.creator_earnings_percent > 20) {
        newErrors.creator_earnings_percent = 'Earnings must be 10-20%'
      }

      // Validate verification data based on quest type
      if (questType === 'token_hold') {
        if (!formData.verification_data.token_address) newErrors.token_address = 'Token address required'
        if (!formData.verification_data.min_amount || formData.verification_data.min_amount <= 0) {
          newErrors.min_amount = 'Min amount must be > 0'
        }
        if (!formData.verification_data.chain) newErrors.chain = 'Chain required'
      } else if (questType === 'nft_own') {
        if (!formData.verification_data.nft_address) newErrors.nft_address = 'NFT address required'
        if (!formData.verification_data.chain) newErrors.chain = 'Chain required'
      } else if (questType === 'follow_user') {
        if (!formData.verification_data.target_fid || formData.verification_data.target_fid <= 0) {
          newErrors.target_fid = 'Target FID must be > 0'
        }
      } else if (questType === 'like_cast' || questType === 'recast_cast') {
        if (!formData.verification_data.cast_hash) newErrors.cast_hash = 'Cast hash required'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      goToStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2)
      setErrors({})
    }
  }

  const handleCreate = async () => {
    if (!category || !questType) return

    // Check balance
    if (userBalance < formData.creation_cost) {
      setSubmitError(`Insufficient balance. You need ${formData.creation_cost} points but have ${userBalance}`)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/quests/marketplace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category,
          type: questType,
          reward_points: formData.reward_points,
          creation_cost: formData.creation_cost,
          creator_earnings_percent: formData.creator_earnings_percent,
          creator_fid: userFid,
          max_completions: formData.max_completions,
          expires_at: formData.expires_at,
          verification_data: formData.verification_data,
          status: 'active'
        })
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to create quest')
      }

      // Success!
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('[QuestWizard] Create error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setCurrentStep(1)
    setCategory(null)
    setQuestType(null)
    setFormData({
      title: '',
      description: '',
      reward_points: 500,
      creation_cost: 200,
      creator_earnings_percent: 15,
      max_completions: null,
      expires_at: null,
      verification_data: {},
      quest_image_url: null,
      quest_image_storage_path: null
    })
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="theme-card-bg-primary max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold theme-text-primary">Create Quest</h2>
            <p className="text-sm theme-text-secondary mt-1">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={handleClose}
            className="text-2xl theme-text-secondary hover:theme-text-primary transition-colors"
            disabled={isSubmitting}
          >
            ×
          </button>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-purple-600' : 'bg-default-200'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 1 && (
            <Step1
              category={category}
              questType={questType}
              questTypes={questTypes}
              onCategoryChange={setCategory}
              onQuestTypeChange={setQuestType}
              error={errors.step1}
            />
          )}

          {currentStep === 2 && questType && (
            <Step2
              questType={questType}
              category={category!}
              formData={formData}
              onFormDataChange={setFormData}
              errors={errors}
            />
          )}

          {currentStep === 3 && questType && (
            <Step3
              category={category!}
              questType={questType}
              formData={formData}
              userBalance={userBalance}
              submitError={submitError}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t theme-border-default">
            <Button
              variant="ghost"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={isSubmitting}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            {currentStep < 3 ? (
              <Button
                variant="primary"
                onClick={handleNext}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={isSubmitting || userBalance < formData.creation_cost}
              >
                {isSubmitting ? 'Creating...' : '🚀 Create Quest'}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// Step 1: Quest Type Selection
interface Step1Props {
  category: QuestCategory | null
  questType: QuestType | null
  questTypes: Record<QuestCategory, Array<{
    type: QuestType
    label: string
    icon: QuestIconType
    description: string
    status: 'active' | 'placeholder'
  }>>
  onCategoryChange: (category: QuestCategory) => void
  onQuestTypeChange: (type: QuestType) => void
  error?: string
}

function Step1({ category, questType, questTypes, onCategoryChange, onQuestTypeChange, error }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Choose Quest Category</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onCategoryChange('onchain')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              category === 'onchain'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-default-200 hover:border-default-300'
            }`}
          >
            <div className="mb-2">
              <QuestIcon type="onchain" size={32} />
            </div>
            <div className="font-semibold theme-text-primary">On-Chain Quests</div>
            <div className="text-sm theme-text-secondary mt-1">
              Verify token holdings, NFT ownership, transactions
            </div>
          </button>

          <button
            onClick={() => onCategoryChange('social')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              category === 'social'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-default-200 hover:border-default-300'
            }`}
          >
            <div className="mb-2">
              <QuestIcon type="social" size={32} />
            </div>
            <div className="font-semibold theme-text-primary">Social Quests</div>
            <div className="text-sm theme-text-secondary mt-1">
              Follow users, like/recast casts, join channels
            </div>
          </button>
        </div>
      </div>

      {category && (
        <div>
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Choose Quest Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {questTypes[category].map((qt) => (
              <button
                key={qt.type}
                onClick={() => qt.status === 'active' && onQuestTypeChange(qt.type)}
                disabled={qt.status === 'placeholder'}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  questType === qt.type
                    ? 'border-purple-500 bg-purple-500/10'
                    : qt.status === 'placeholder'
                    ? 'border-default-100 opacity-50 cursor-not-allowed'
                    : 'border-default-200 hover:border-default-300'
                }`}
              >
                <div className="mb-1">
                  <QuestIcon type={qt.icon} size={28} />
                </div>
                <div className="font-semibold theme-text-primary text-sm">{qt.label}</div>
                <div className="text-xs theme-text-secondary mt-1">{qt.description}</div>
                {qt.status === 'placeholder' && (
                  <Badge variant="warning" size="sm" className="mt-2">
                    Coming Soon
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

// Step 2: Quest Details Form
interface Step2Props {
  questType: QuestType
  category: QuestCategory
  formData: QuestFormData
  onFormDataChange: (data: QuestFormData) => void
  errors: Record<string, string>
}

function Step2({ questType, category, formData, onFormDataChange, errors }: Step2Props) {
  const updateFormData = (field: keyof QuestFormData, value: any) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  const updateVerificationData = (field: string, value: any) => {
    onFormDataChange({
      ...formData,
      verification_data: { ...formData.verification_data, [field]: value }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Quest Details</h3>
        
        {/* Title */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData('title', e.target.value)}
            placeholder="e.g., Hold 100 USDC on Base"
            className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Describe what users need to do..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.description && <p className="text-sm text-red-400">{errors.description}</p>}
        </div>

        {/* Quest Image Upload */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">Quest Cover Image (Optional)</label>
          <ImageUpload
            value={formData.quest_image_url}
            onChange={(url) => updateFormData('quest_image_url', url)}
            onPathChange={(path) => updateFormData('quest_image_storage_path', path)}
          />
        </div>

        {/* Reward Points Slider */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">
            Reward Points: {formData.reward_points}
          </label>
          <input
            type="range"
            min="100"
            max="10000"
            step="50"
            value={formData.reward_points}
            onChange={(e) => updateFormData('reward_points', Number(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs theme-text-tertiary">
            <span>100</span>
            <span>10,000</span>
          </div>
        </div>

        {/* Creation Cost Slider */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">
            Creation Cost: {formData.creation_cost} pts
          </label>
          <input
            type="range"
            min="100"
            max="500"
            step="10"
            value={formData.creation_cost}
            onChange={(e) => updateFormData('creation_cost', Number(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs theme-text-tertiary">
            <span>100</span>
            <span>500</span>
          </div>
        </div>

        {/* Earnings Percent Slider */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium theme-text-secondary">
            Your Earnings: {formData.creator_earnings_percent}%
          </label>
          <input
            type="range"
            min="10"
            max="20"
            step="1"
            value={formData.creator_earnings_percent}
            onChange={(e) => updateFormData('creator_earnings_percent', Number(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs theme-text-tertiary">
            <span>10%</span>
            <span>20%</span>
          </div>
        </div>
      </div>

      {/* Verification Data (Dynamic based on quest type) */}
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Verification Details</h3>
        
        {questType === 'token_hold' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Token Address *</label>
              <input
                type="text"
                value={formData.verification_data.token_address || ''}
                onChange={(e) => updateVerificationData('token_address', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.token_address && <p className="text-sm text-red-400">{errors.token_address}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Minimum Amount *</label>
              <input
                type="number"
                value={formData.verification_data.min_amount || ''}
                onChange={(e) => updateVerificationData('min_amount', Number(e.target.value))}
                placeholder="100"
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.min_amount && <p className="text-sm text-red-400">{errors.min_amount}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Chain *</label>
              <select
                value={formData.verification_data.chain || ''}
                onChange={(e) => updateVerificationData('chain', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select chain</option>
                <option value="base">Base</option>
                <option value="optimism">Optimism</option>
                <option value="celo">Celo</option>
              </select>
              {errors.chain && <p className="text-sm text-red-400">{errors.chain}</p>}
            </div>
          </>
        )}

        {questType === 'nft_own' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">NFT Contract Address *</label>
              <input
                type="text"
                value={formData.verification_data.nft_address || ''}
                onChange={(e) => updateVerificationData('nft_address', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.nft_address && <p className="text-sm text-red-400">{errors.nft_address}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Chain *</label>
              <select
                value={formData.verification_data.chain || ''}
                onChange={(e) => updateVerificationData('chain', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select chain</option>
                <option value="base">Base</option>
                <option value="optimism">Optimism</option>
                <option value="celo">Celo</option>
              </select>
              {errors.chain && <p className="text-sm text-red-400">{errors.chain}</p>}
            </div>
          </>
        )}

        {questType === 'follow_user' && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Target FID *</label>
            <input
              type="number"
              value={formData.verification_data.target_fid || ''}
              onChange={(e) => updateVerificationData('target_fid', Number(e.target.value))}
              placeholder="e.g., 12345"
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.target_fid && <p className="text-sm text-red-400">{errors.target_fid}</p>}
          </div>
        )}

        {(questType === 'like_cast' || questType === 'recast_cast') && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Cast Hash *</label>
            <input
              type="text"
              value={formData.verification_data.cast_hash || ''}
              onChange={(e) => updateVerificationData('cast_hash', e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.cast_hash && <p className="text-sm text-red-400">{errors.cast_hash}</p>}
          </div>
        )}

        {/* NEW: transaction_make */}
        {questType === 'transaction_make' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Target Contract *</label>
              <input
                type="text"
                value={formData.verification_data.target_contract || ''}
                onChange={(e) => updateVerificationData('target_contract', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.target_contract && <p className="text-sm text-red-400">{errors.target_contract}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Chain *</label>
              <select
                value={formData.verification_data.chain || ''}
                onChange={(e) => updateVerificationData('chain', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select chain</option>
                <option value="base">Base</option>
                <option value="optimism">Optimism</option>
                <option value="celo">Celo</option>
              </select>
              {errors.chain && <p className="text-sm text-red-400">{errors.chain}</p>}
            </div>
          </>
        )}

        {/* NEW: multichain_gm */}
        {questType === 'multichain_gm' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Select Chains *</label>
              <div className="space-y-2">
                {['base', 'optimism', 'celo', 'ink', 'unichain'].map((chain) => (
                  <label key={chain} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.verification_data.chains || []).includes(chain)}
                      onChange={(e) => {
                        const chains = formData.verification_data.chains || []
                        if (e.target.checked) {
                          updateVerificationData('chains', [...chains, chain])
                        } else {
                          updateVerificationData('chains', chains.filter((c: string) => c !== chain))
                        }
                      }}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <span className="text-sm theme-text-primary capitalize">{chain}</span>
                  </label>
                ))}
              </div>
              {errors.chains && <p className="text-sm text-red-400">{errors.chains}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Minimum Chains Required *</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.verification_data.min_chains || ''}
                onChange={(e) => updateVerificationData('min_chains', Number(e.target.value))}
                placeholder="e.g., 2"
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.min_chains && <p className="text-sm text-red-400">{errors.min_chains}</p>}
            </div>
          </>
        )}

        {/* NEW: contract_interact */}
        {questType === 'contract_interact' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Contract Address *</label>
              <input
                type="text"
                value={formData.verification_data.contract_address || ''}
                onChange={(e) => updateVerificationData('contract_address', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.contract_address && <p className="text-sm text-red-400">{errors.contract_address}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Function Name *</label>
              <input
                type="text"
                value={formData.verification_data.function_name || ''}
                onChange={(e) => updateVerificationData('function_name', e.target.value)}
                placeholder="e.g., swap"
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.function_name && <p className="text-sm text-red-400">{errors.function_name}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Chain *</label>
              <select
                value={formData.verification_data.chain || ''}
                onChange={(e) => updateVerificationData('chain', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select chain</option>
                <option value="base">Base</option>
                <option value="optimism">Optimism</option>
                <option value="celo">Celo</option>
              </select>
              {errors.chain && <p className="text-sm text-red-400">{errors.chain}</p>}
            </div>
          </>
        )}

        {/* NEW: liquidity_provide */}
        {questType === 'liquidity_provide' && (
          <>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Pool Address (LP Token) *</label>
              <input
                type="text"
                value={formData.verification_data.pool_address || ''}
                onChange={(e) => updateVerificationData('pool_address', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.pool_address && <p className="text-sm text-red-400">{errors.pool_address}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Minimum Liquidity Amount *</label>
              <input
                type="number"
                value={formData.verification_data.min_liquidity || ''}
                onChange={(e) => updateVerificationData('min_liquidity', Number(e.target.value))}
                placeholder="e.g., 1000000000000000000"
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.min_liquidity && <p className="text-sm text-red-400">{errors.min_liquidity}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium theme-text-secondary">Chain *</label>
              <select
                value={formData.verification_data.chain || ''}
                onChange={(e) => updateVerificationData('chain', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select chain</option>
                <option value="base">Base</option>
                <option value="optimism">Optimism</option>
                <option value="celo">Celo</option>
              </select>
              {errors.chain && <p className="text-sm text-red-400">{errors.chain}</p>}
            </div>
          </>
        )}

        {/* NEW: reply_cast */}
        {questType === 'reply_cast' && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Parent Cast Hash *</label>
            <input
              type="text"
              value={formData.verification_data.parent_cast_hash || ''}
              onChange={(e) => updateVerificationData('parent_cast_hash', e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.parent_cast_hash && <p className="text-sm text-red-400">{errors.parent_cast_hash}</p>}
          </div>
        )}

        {/* NEW: join_channel */}
        {questType === 'join_channel' && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Channel ID *</label>
            <input
              type="text"
              value={formData.verification_data.channel_id || ''}
              onChange={(e) => updateVerificationData('channel_id', e.target.value)}
              placeholder="e.g., gmeowbased"
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.channel_id && <p className="text-sm text-red-400">{errors.channel_id}</p>}
          </div>
        )}

        {/* NEW: cast_mention */}
        {questType === 'cast_mention' && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Target FID to Mention *</label>
            <input
              type="number"
              value={formData.verification_data.target_fid || ''}
              onChange={(e) => updateVerificationData('target_fid', Number(e.target.value))}
              placeholder="e.g., 12345"
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.target_fid && <p className="text-sm text-red-400">{errors.target_fid}</p>}
          </div>
        )}

        {/* NEW: cast_hashtag */}
        {questType === 'cast_hashtag' && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium theme-text-secondary">Hashtag *</label>
            <input
              type="text"
              value={formData.verification_data.hashtag || ''}
              onChange={(e) => updateVerificationData('hashtag', e.target.value)}
              placeholder="e.g., gmeowbased (# is optional)"
              className="w-full px-4 py-2 rounded-lg border theme-border-default bg-default-50 theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.hashtag && <p className="text-sm text-red-400">{errors.hashtag}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// Step 3: Preview & Create
interface Step3Props {
  category: QuestCategory
  questType: QuestType
  formData: QuestFormData
  userBalance: number
  submitError: string | null
}

function Step3({ category, questType, formData, userBalance, submitError }: Step3Props) {
  const questTypeLabels: Record<QuestType, string> = {
    token_hold: '💰 Token Hold',
    nft_own: '🖼️ NFT Own',
    transaction_make: '📤 Transaction',
    multichain_gm: '🌐 Multi-Chain GM',
    contract_interact: '⚙️ Contract Interact',
    liquidity_provide: '💧 Liquidity',
    follow_user: '👤 Follow User',
    like_cast: '❤️ Like Cast',
    recast_cast: '🔁 Recast',
    reply_cast: '💬 Reply',
    join_channel: '📢 Join Channel',
    cast_mention: '@ Mention',
    cast_hashtag: '# Hashtag',
  }

  const earningsPerCompletion = Math.floor(formData.reward_points * (formData.creator_earnings_percent / 100))
  const newBalance = userBalance - formData.creation_cost

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Quest Preview</h3>
        
        {/* Quest Card Preview */}
        <Card className="theme-card-bg-secondary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold theme-text-primary mb-1">
                  {formData.title}
                </h4>
                <p className="text-sm theme-text-secondary">
                  {formData.description}
                </p>
              </div>
              <Badge variant={category === 'onchain' ? 'primary' : 'info'} size="sm">
                {category === 'onchain' ? '⛓️' : '🦋'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs theme-text-secondary">Type:</span>
              <Badge variant="info" size="sm">
                {questTypeLabels[questType]}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-default-100">
              <span className="text-sm theme-text-secondary">Reward:</span>
              <span className="text-lg font-bold theme-text-primary">
                {formData.reward_points} pts
              </span>
            </div>

            <div className="text-xs theme-text-tertiary">
              ✅ 0 completions • 👤 Created by you
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Cost Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="theme-text-secondary">Creation Cost:</span>
            <span className="theme-text-primary font-semibold">-{formData.creation_cost} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Your Current Balance:</span>
            <span className="theme-text-primary">{userBalance} pts</span>
          </div>
          <div className="flex justify-between pt-2 border-t theme-border-default">
            <span className="theme-text-secondary">Balance After Creation:</span>
            <span className={`font-semibold ${newBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {newBalance} pts
            </span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="theme-text-secondary">You'll earn per completion:</span>
            <span className="theme-text-primary font-semibold">
              {earningsPerCompletion} pts ({formData.creator_earnings_percent}%)
            </span>
          </div>
        </div>

        {newBalance < 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              ⚠️ Insufficient balance. You need {formData.creation_cost} points but have {userBalance}.
            </p>
          </div>
        )}

        {submitError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
