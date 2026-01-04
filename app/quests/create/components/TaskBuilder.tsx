'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/forms/select'
import { Input } from '@/components/ui/forms/input'
import { Textarea } from '@/components/ui/forms/textarea'
import { ERROR_ARIA } from '@/lib/utils/accessibility'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import type { TaskConfig } from '@/lib/quests/types'

interface TaskBuilderProps {
  tasks: TaskConfig[]
  onUpdate: (tasks: TaskConfig[]) => void
  onNext: () => void
  onBack: () => void
  className?: string
}

const TASK_TYPES = [
  { value: 'social', label: 'Social (Farcaster)' },
  { value: 'onchain', label: 'Onchain (Base)' },
  { value: 'manual', label: 'Manual Verification' },
]

export function TaskBuilder({
  tasks,
  onUpdate,
  onNext,
  onBack,
  className = '',
}: TaskBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const addTask = () => {
    const newTask: TaskConfig = {
      id: `task-${Date.now()}`,
      type: 'social',
      title: '',
      description: '',
      verification_data: {
        type: 'follow_user', // DEFAULT: Set verification type for social quests
      },
      required: true,
      order: tasks.length,
    }
    onUpdate([...tasks, newTask])
    setEditingIndex(tasks.length)
  }

  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index)
    onUpdate(newTasks.map((task, i) => ({ ...task, order: i })))
  }

  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= tasks.length) return

    const newTasks = [...tasks]
    ;[newTasks[index], newTasks[newIndex]] = [newTasks[newIndex], newTasks[index]]
    
    // Update order
    newTasks.forEach((task, i) => {
      task.order = i
    })
    
    onUpdate(newTasks)
  }

  const updateTask = (index: number, updates: Partial<TaskConfig>) => {
    const newTasks = [...tasks]
    newTasks[index] = { ...newTasks[index], ...updates }
    onUpdate(newTasks)
  }

  const handleNext = () => {
    setValidationError(null)
    
    if (tasks.length === 0) {
      setValidationError('Please add at least one task before continuing')
      return
    }

    // Validate all tasks have titles
    const invalidTasks = tasks.filter((task) => !task.title)
    if (invalidTasks.length > 0) {
      setValidationError('All tasks must have a title before continuing')
      return
    }

    onNext()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quest Tasks</h2>
        <p className="text-muted-foreground">
          Add tasks that users need to complete ({tasks.length} task{tasks.length !== 1 ? 's' : ''})
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            {/* Task Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {index + 1}
                </div>
                {task.title ? (
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.type}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">New Task</p>
                )}
              </div>

              {/* Task Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveTask(index, 'up')}
                  disabled={index === 0}
                >
                  <KeyboardArrowUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveTask(index, 'down')}
                  disabled={index === tasks.length - 1}
                >
                  <KeyboardArrowDownIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm('Remove this task? This action cannot be undone.')) {
                      removeTask(index)
                    }
                  }}
                  className="text-destructive hover:bg-destructive/10"
                  aria-label="Remove task"
                >
                  <DeleteIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Task Form (Expandable) */}
            {editingIndex === index ? (
              <TaskForm
                task={task}
                onUpdate={(updates) => updateTask(index, updates)}
                onClose={() => setEditingIndex(null)}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingIndex(index)}
                className="w-full"
              >
                {task.title ? 'Edit Task' : 'Configure Task'}
              </Button>
            )}
          </div>
        ))}

        {/* Add Task Button */}
        <Button
          onClick={addTask}
          variant="outline"
          className="w-full"
        >
          <AddIcon className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-wcag-error-light/10 dark:bg-wcag-error-dark/10 border border-wcag-error-light dark:border-wcag-error-dark rounded-lg p-4">
          <p {...ERROR_ARIA} className="text-sm text-wcag-error-light dark:text-wcag-error-dark">
            {validationError}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Continue
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface TaskFormProps {
  task: TaskConfig
  onUpdate: (updates: Partial<TaskConfig>) => void
  onClose: () => void
}

function TaskForm({ task, onUpdate, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState({
    type: task.type,
    title: task.title,
    description: task.description,
    required: task.required,
    verification_data: task.verification_data || {},
  })

  const handleChange = (field: string, value: any) => {
    // When task type changes, set default verification type
    if (field === 'type') {
      const defaultVerificationType = value === 'social' ? 'follow_user' : value === 'onchain' ? 'mint_nft' : undefined;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        verification_data: defaultVerificationType ? { type: defaultVerificationType } : {},
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleVerificationChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      verification_data: { ...prev.verification_data, [field]: value },
    }))
  }

  const handleSave = () => {
    onUpdate(formData)
    onClose()
  }

  return (
    <div className="space-y-4 rounded-lg bg-muted/50 p-4">
      {/* Task Type */}
      <Select
        label="Task Type"
        value={formData.type}
        onChange={(e) => handleChange('type', e.target.value)}
      >
        {TASK_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>

      {/* Title & Description */}
      <Input
        label="Task Title"
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="e.g., Follow @gmeowbased on Farcaster"
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Provide instructions for completing this task"
        rows={3}
      />

      {/* Verification Config (Conditional based on type) */}
      {formData.type === 'social' && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Social Verification</p>
          <Select
            label="Verification Type"
            value={formData.verification_data.type || 'follow_user'}
            onChange={(e) => handleVerificationChange('type', e.target.value)}
          >
            <option value="follow_user">Follow User</option>
            <option value="like_cast">Like Cast</option>
            <option value="recast">Recast</option>
            <option value="reply_to_cast">Reply to Cast</option>
            <option value="create_cast_with_tag">Create Cast with Tag</option>
            <option value="join_channel">Join Channel</option>
          </Select>
          
          {(formData.verification_data.type === 'follow_user') && (
            <Input
              label="Target FID"
              type="number"
              value={formData.verification_data.target_fid || ''}
              onChange={(e) => handleVerificationChange('target_fid', parseInt(e.target.value) || undefined)}
              placeholder="User FID to follow (e.g., 18139)"
              required
            />
          )}
          
          {(formData.verification_data.type === 'like_cast' || 
            formData.verification_data.type === 'recast' || 
            formData.verification_data.type === 'reply_to_cast') && (
            <Input
              label="Cast Hash"
              value={formData.verification_data.target_cast_hash || ''}
              onChange={(e) => handleVerificationChange('target_cast_hash', e.target.value)}
              placeholder="0x... (cast hash from Warpcast)"
              required
            />
          )}
          
          {formData.verification_data.type === 'create_cast_with_tag' && (
            <Input
              label="Required Tag"
              value={formData.verification_data.required_tag || ''}
              onChange={(e) => handleVerificationChange('required_tag', e.target.value)}
              placeholder="e.g., @gmeowbased or #gm"
              required
            />
          )}
          
          {formData.verification_data.type === 'join_channel' && (
            <Input
              label="Channel ID"
              value={formData.verification_data.target_channel_id || ''}
              onChange={(e) => handleVerificationChange('target_channel_id', e.target.value)}
              placeholder="e.g., gmeowbased"
              required
            />
          )}
        </div>
      )}

      {formData.type === 'onchain' && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Onchain Verification</p>
          <Select
            label="Verification Type"
            value={formData.verification_data.type || 'mint_nft'}
            onChange={(e) => handleVerificationChange('type', e.target.value)}
          >
            <option value="mint_nft">Mint NFT</option>
            <option value="swap_token">Swap Token</option>
            <option value="provide_liquidity">Provide Liquidity</option>
            <option value="bridge">Bridge</option>
            <option value="custom">Custom</option>
          </Select>
          
          {(formData.verification_data.type === 'mint_nft') && (
            <>
              <Input
                label="NFT Contract Address"
                value={formData.verification_data.nft_contract || ''}
                onChange={(e) => handleVerificationChange('nft_contract', e.target.value)}
                placeholder="0x... (Base NFT contract)"
                required
              />
              <Input
                label="Minimum Balance"
                type="number"
                value={formData.verification_data.min_balance || '1'}
                onChange={(e) => handleVerificationChange('min_balance', parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </>
          )}
          
          {(formData.verification_data.type === 'swap_token') && (
            <>
              <Input
                label="Token Address"
                value={formData.verification_data.token_address || ''}
                onChange={(e) => handleVerificationChange('token_address', e.target.value)}
                placeholder="0x... (ERC-20 token)"
                required
              />
              <Input
                label="Minimum Amount"
                value={formData.verification_data.min_amount || ''}
                onChange={(e) => handleVerificationChange('min_amount', e.target.value)}
                placeholder="1000000000000000000 (in wei)"
                required
              />
            </>
          )}
          
          {(formData.verification_data.type === 'provide_liquidity') && (
            <>
              <Input
                label="Pool Address"
                value={formData.verification_data.pool_address || ''}
                onChange={(e) => handleVerificationChange('pool_address', e.target.value)}
                placeholder="0x... (LP pool contract)"
                required
              />
              <Input
                label="Minimum LP Tokens"
                value={formData.verification_data.min_lp_tokens || ''}
                onChange={(e) => handleVerificationChange('min_lp_tokens', e.target.value)}
                placeholder="1000000000000000000 (in wei)"
                required
              />
            </>
          )}
          
          {(formData.verification_data.type === 'bridge') && (
            <Input
              label="Transaction Hash"
              value={formData.verification_data.transaction_hash || ''}
              onChange={(e) => handleVerificationChange('transaction_hash', e.target.value)}
              placeholder="0x... (bridge tx hash)"
              required
            />
          )}
          
          {(formData.verification_data.type === 'custom') && (
            <>
              <Input
                label="Contract Address"
                value={formData.verification_data.contract_address || ''}
                onChange={(e) => handleVerificationChange('contract_address', e.target.value)}
                placeholder="0x..."
                required
              />
              <Input
                label="Function Signature"
                value={formData.verification_data.function_signature || ''}
                onChange={(e) => handleVerificationChange('function_signature', e.target.value)}
                placeholder="balanceOf(address)"
                required
              />
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave}>
          Save Task
        </Button>
      </div>
    </div>
  )
}
