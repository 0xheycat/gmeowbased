/**
 * 🗄️ MAINTENANCE TASK DATABASE LAYER
 * 
 * Provides persistent storage for task statuses using Supabase
 * Syncs with in-memory tasks.ts for fast reads, DB for persistence
 */

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { MAINTENANCE_TASKS, type MaintenanceTask, type TaskStatus } from './tasks'

export interface TaskUpdate {
  status: TaskStatus
  fixedAt?: Date
  fixedBy?: 'auto' | 'semi-auto' | 'manual'
  errorMessage?: string
}

/**
 * Initialize database with all tasks from tasks.ts
 * Run this once to populate the database
 */
export async function initializeTaskDatabase(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' }
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }

  try {
    // Insert all tasks (ignore duplicates)
    const tasksToInsert = MAINTENANCE_TASKS.map(task => ({
      id: task.id,
      category: `cat${task.category}`,
      title: task.description.substring(0, 100), // First 100 chars as title
      description: task.description,
      severity: task.severity === 'P1' ? 'critical' : task.severity === 'P2' ? 'high' : task.severity === 'P3' ? 'medium' : 'low',
      type: task.type,
      status: task.status,
      fix_id: task.fix || null,
      files: task.files,
      dependencies: task.dependencies,
      estimated_time: parseInt(task.estimatedTime) || 30, // Convert "30 min" to 30
      fixed_at: task.fixedAt ? new Date(task.fixedAt) : null,
      fixed_by: task.fixedBy || null,
    }))

    // Upsert in batches to avoid conflicts
    const { error } = await supabase
      .from('maintenance_tasks')
      .upsert(tasksToInsert, { onConflict: 'id' })

    if (error) {
      console.error('Database initialization error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Database initialization error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get all tasks from database
 */
export async function getAllTasksFromDB(): Promise<MaintenanceTask[]> {
  if (!isSupabaseConfigured()) {
    return MAINTENANCE_TASKS // Fallback to in-memory
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return MAINTENANCE_TASKS
  }

  try {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.error('Database read error:', error)
      return MAINTENANCE_TASKS
    }

    // Map DB format to MaintenanceTask format
    return data.map(dbTask => {
      const inMemoryTask = MAINTENANCE_TASKS.find(t => t.id === dbTask.id)
      return {
        ...inMemoryTask,
        id: dbTask.id,
        status: dbTask.status as TaskStatus,
        fixedAt: dbTask.fixed_at ? new Date(dbTask.fixed_at) : undefined,
        fixedBy: dbTask.fixed_by as 'auto' | 'semi-auto' | 'manual' | undefined,
      } as MaintenanceTask
    })
  } catch (error) {
    console.error('Database read error:', error)
    return MAINTENANCE_TASKS
  }
}

/**
 * Get single task by ID
 */
export async function getTaskFromDB(taskId: string): Promise<MaintenanceTask | null> {
  if (!isSupabaseConfigured()) {
    return MAINTENANCE_TASKS.find(t => t.id === taskId) || null
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return MAINTENANCE_TASKS.find(t => t.id === taskId) || null
  }

  try {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error || !data) {
      return MAINTENANCE_TASKS.find(t => t.id === taskId) || null
    }

    const inMemoryTask = MAINTENANCE_TASKS.find(t => t.id === taskId)
    return {
      ...inMemoryTask,
      id: data.id,
      status: data.status as TaskStatus,
      fixedAt: data.fixed_at ? new Date(data.fixed_at) : undefined,
      fixedBy: data.fixed_by as 'auto' | 'semi-auto' | 'manual' | undefined,
    } as MaintenanceTask
  } catch (error) {
    console.error('Database read error:', error)
    return MAINTENANCE_TASKS.find(t => t.id === taskId) || null
  }
}

/**
 * Update task status in database
 */
export async function updateTaskStatus(
  taskId: string,
  update: TaskUpdate
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured - changes will not persist' }
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' }
  }

  try {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        status: update.status,
        fixed_at: update.fixedAt ? update.fixedAt.toISOString() : null,
        fixed_by: update.fixedBy || null,
        error_message: update.errorMessage || null,
      })
      .eq('id', taskId)

    if (error) {
      console.error('Database update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Database update error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<{
  total: number
  fixed: number
  pending: number
  inProgress: number
  failed: number
  byType: { auto: number; semiAuto: number; manual: number }
  byCategory: Record<number, number>
}> {
  const tasks = await getAllTasksFromDB()

  const stats = {
    total: tasks.length,
    fixed: tasks.filter(t => t.status === 'fixed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    byType: {
      auto: tasks.filter(t => t.type === 'auto').length,
      semiAuto: tasks.filter(t => t.type === 'semi-auto').length,
      manual: tasks.filter(t => t.type === 'manual').length,
    },
    byCategory: {} as Record<number, number>,
  }

  // Count by category
  for (const task of tasks) {
    stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1
  }

  return stats
}

/**
 * Bulk update task statuses
 */
export async function bulkUpdateTasks(
  updates: Array<{ taskId: string; update: TaskUpdate }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []

  for (const { taskId, update } of updates) {
    const result = await updateTaskStatus(taskId, update)
    if (!result.success) {
      errors.push(`${taskId}: ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    errors,
  }
}
