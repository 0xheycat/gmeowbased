/**
 * Task Config Form Component
 * Template: trezoadmin-41/form-layout-02.tsx (40% adaptation)
 * 
 * Individual task configuration form extracted from TaskBuilder
 * Uses NEW foundation patterns only
 */

'use client'

import { Input } from '@/components/ui/forms/input'
import { Textarea } from '@/components/ui/forms/textarea'
import { Select } from '@/components/ui/forms/select'
import { Button } from '@/components/ui/button'
import type { TaskConfig } from '@/lib/quests/types'

interface TaskConfigFormProps {
  task: TaskConfig
  onUpdate: (task: TaskConfig) => void
  onCancel: () => void
  onSave: () => void
}

export function TaskConfigForm({ task, onUpdate, onCancel, onSave }: TaskConfigFormProps) {
  const updateTask = (updates: Partial<TaskConfig>) => {
    onUpdate({ ...task, ...updates })
  }

  const updateVerificationData = (updates: Record<string, any>) => {
    onUpdate({
      ...task,
      verification_data: { ...task.verification_data, ...updates },
    })
  }

  return (
    <div className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
      {/* Task Title */}
      <Input
        label="Task Title"
        placeholder="e.g., Follow @gmeowbased"
        value={task.title}
        onChange={(e) => updateTask({ title: e.target.value })}
        required
      />

      {/* Task Description */}
      <Textarea
        label="Description"
        placeholder="Describe what users need to do..."
        value={task.description}
        onChange={(e) => updateTask({ description: e.target.value })}
        rows={3}
      />

      {/* Task Type */}
      <Select
        label="Verification Type"
        value={task.type}
        onChange={(e) => updateTask({ type: e.target.value as any })}
        required
      >
        <option value="social">Social (Farcaster)</option>
        <option value="onchain">Onchain (Base)</option>
        <option value="manual">Manual Verification</option>
      </Select>

      {/* Social Task Fields */}
      {task.type === 'social' && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Social Verification Config
          </div>

          <Input
            label="Target FID (optional)"
            placeholder="e.g., 123456"
            type="number"
            value={task.verification_data.target_fid || ''}
            onChange={(e) =>
              updateVerificationData({
                target_fid: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />

          <Input
            label="Channel ID (optional)"
            placeholder="e.g., gmeowbased"
            value={task.verification_data.channel_id || ''}
            onChange={(e) =>
              updateVerificationData({ channel_id: e.target.value || undefined })
            }
          />

          <Input
            label="Cast Hash (optional)"
            placeholder="0x..."
            value={task.verification_data.cast_hash || ''}
            onChange={(e) =>
              updateVerificationData({ cast_hash: e.target.value || undefined })
            }
          />

          <Input
            label="Required Text (optional)"
            placeholder="Text that must appear in cast"
            value={task.verification_data.required_text || ''}
            onChange={(e) =>
              updateVerificationData({ required_text: e.target.value || undefined })
            }
          />
        </div>
      )}

      {/* Onchain Task Fields */}
      {task.type === 'onchain' && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Onchain Verification Config
          </div>

          <Input
            label="Token Address (optional)"
            placeholder="0x..."
            value={task.verification_data.token_address || ''}
            onChange={(e) =>
              updateVerificationData({ token_address: e.target.value || undefined })
            }
          />

          <Input
            label="NFT Contract (optional)"
            placeholder="0x..."
            value={task.verification_data.nft_contract || ''}
            onChange={(e) =>
              updateVerificationData({ nft_contract: e.target.value || undefined })
            }
          />

          <Input
            label="Minimum Amount"
            placeholder="e.g., 0.001"
            value={task.verification_data.min_amount || ''}
            onChange={(e) =>
              updateVerificationData({ min_amount: e.target.value || undefined })
            }
          />

          <Input
            label="Minimum Balance (optional)"
            placeholder="e.g., 100"
            type="number"
            value={task.verification_data.min_balance || ''}
            onChange={(e) =>
              updateVerificationData({
                min_balance: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}

      {/* Manual Task Fields */}
      {task.type === 'manual' && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Manual Verification Config
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="proof-required"
              checked={task.verification_data.proof_required || false}
              onChange={(e) =>
                updateVerificationData({ proof_required: e.target.checked })
              }
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="proof-required" className="text-sm">
              Require proof upload
            </label>
          </div>

          <Input
            label="Answer (optional)"
            placeholder="Correct answer for quiz tasks"
            value={task.verification_data.answer || ''}
            onChange={(e) =>
              updateVerificationData({ answer: e.target.value || undefined })
            }
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button onClick={onSave} className="flex-1">
          Save Task
        </Button>
        <Button onClick={onCancel} variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}
