'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/forms/select'
import { Input } from '@/components/ui/forms/input'
import { Textarea } from '@/components/ui/forms/textarea'
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

  const addTask = () => {
    const newTask: TaskConfig = {
      id: `task-${Date.now()}`,
      type: 'social',
      title: '',
      description: '',
      verification_data: {},
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
    if (tasks.length === 0) {
      alert('Please add at least one task')
      return
    }

    // Validate all tasks have titles
    const invalidTasks = tasks.filter((task) => !task.title)
    if (invalidTasks.length > 0) {
      alert('All tasks must have a title')
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
                  onClick={() => removeTask(index)}
                  className="text-destructive hover:bg-destructive/10"
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
    setFormData((prev) => ({ ...prev, [field]: value }))
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
          <Input
            label="Target FID (Optional)"
            type="number"
            value={formData.verification_data.target_fid || ''}
            onChange={(e) => handleVerificationChange('target_fid', parseInt(e.target.value))}
            placeholder="User FID to follow"
          />
          <Input
            label="Channel ID (Optional)"
            value={formData.verification_data.channel_id || ''}
            onChange={(e) => handleVerificationChange('channel_id', e.target.value)}
            placeholder="e.g., gmeowbased"
          />
        </div>
      )}

      {formData.type === 'onchain' && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Onchain Verification</p>
          <Input
            label="Token Address (Optional)"
            value={formData.verification_data.token_address || ''}
            onChange={(e) => handleVerificationChange('token_address', e.target.value)}
            placeholder="0x..."
          />
          <Input
            label="Minimum Amount (Optional)"
            value={formData.verification_data.min_amount || ''}
            onChange={(e) => handleVerificationChange('min_amount', e.target.value)}
            placeholder="1000000000000000000"
          />
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
