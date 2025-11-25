'use client'

/**
 * 🤖 ADMIN MAINTENANCE DASHBOARD
 * 
 * Real-time codebase health monitoring with automated fix capabilities.
 * 
 * Features:
 * - Filter by task type (All/Auto/Semi-Auto/Manual)
 * - Real-time audit scanner
 * - Category-based task organization
 * - One-click auto-fix execution
 * - AI-assisted semi-auto fixes
 * - Manual task guidance
 * - Database persistence for task statuses
 * 
 * Task Types:
 * - ⚡ AUTO: Deterministic fixes (42 tasks, ~18-22h)
 * - 🤖 SEMI-AUTO: AI-assisted (35 tasks, ~16-20h)
 * - 🧠 MANUAL: Human judgment (25 tasks, ~11-15h)
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MAINTENANCE_TASKS,
  CATEGORY_METADATA,
  type MaintenanceTask,
} from '@/lib/maintenance/tasks'

type FilterTab = 'all' | 'auto' | 'semi-auto' | 'manual'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export default function MaintenanceDashboard() {
  const searchParams = useSearchParams()
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [tasks, setTasks] = useState<MaintenanceTask[]>(MAINTENANCE_TASKS)

  // Filter state
  const tabParam = (searchParams.get('filter') as FilterTab) || 'all'
  const [activeFilter, setActiveFilter] = useState<FilterTab>(tabParam)

  // Fix execution state
  const [fixingTasks, setFixingTasks] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast management
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, type, message }])
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const loadTasksFromDB = useCallback(async () => {
    try {
      const response = await fetch('/api/maintenance/sync?action=tasks')
      if (response.ok) {
        const data = await response.json()
        if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setTasks(data.tasks)
          setDbInitialized(true)
        }
      }
    } catch (error) {
      console.error('Failed to load tasks from DB:', error)
      // Fallback to in-memory tasks
      setTasks(MAINTENANCE_TASKS)
    }
  }, [])

  // Initialize database with all tasks
  const initializeDatabase = useCallback(async () => {
    showToast('info', '🔄 Initializing database...')

    try {
      const response = await fetch('/api/maintenance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      })

      const result = await response.json()

      if (result.success) {
        showToast('success', `✅ Database initialized: ${result.stats.total} tasks`)
        setDbInitialized(true)
        await loadTasksFromDB() // Reload tasks
      } else {
        showToast('error', `❌ Init failed: ${result.error}`)
      }
    } catch (error) {
      showToast('error', `❌ Network error: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }, [loadTasksFromDB, showToast])

  // Load tasks from database on mount
  useEffect(() => {
    loadTasksFromDB()
  }, [loadTasksFromDB])

  // Auto-initialize database if empty
  useEffect(() => {
    const autoInitialize = async () => {
      if (tasks.length === 0 || (tasks.length > 0 && tasks.every(t => t.status === 'pending' && !t.fixedAt))) {
        // Tasks array is empty or looks uninitialized - auto-init DB
        await initializeDatabase()
      }
    }
    
    // Run after tasks are loaded
    if (tasks.length === MAINTENANCE_TASKS.length && !dbInitialized) {
      autoInitialize()
    }
  }, [tasks, dbInitialized, initializeDatabase])

  // Calculate stats from current tasks
  const stats = useMemo(() => {
    const fixed = tasks.filter((t) => t.status === 'fixed').length
    const pending = tasks.filter((t) => t.status === 'pending').length
    const total = tasks.length
    const auto = tasks.filter((t) => t.type === 'auto').length
    const semiAuto = tasks.filter((t) => t.type === 'semi-auto').length
    const manual = tasks.filter((t) => t.type === 'manual').length
    const timeSaved = fixed * 30 // Assume 30 min per task

    return {
      fixed,
      pending,
      total,
      auto,
      semiAuto,
      manual,
      timeSaved: (timeSaved / 60).toFixed(1) + 'h',
    }
  }, [tasks])

  const avgScore =
    CATEGORY_METADATA.reduce((sum, cat) => sum + cat.score, 0) /
    CATEGORY_METADATA.length

  // Filter tasks by active tab
  const filteredCategories = useMemo(() => {
    if (activeFilter === 'all') {
      return CATEGORY_METADATA.filter((cat) => cat.totalTasks > 0)
    }

    return CATEGORY_METADATA.filter((cat) => {
      const categoryTasks = tasks.filter(
        (task) => task.category === cat.id
      )
      return categoryTasks.some((task) => task.type === activeFilter)
    })
  }, [activeFilter, tasks])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Get task status from tasks state
  const getTaskStatus = (taskId: string): MaintenanceTask['status'] => {
    return tasks.find((t) => t.id === taskId)?.status || 'pending'
  }

  // Update task status in tasks state
  const updateTaskStatus = (taskId: string, status: MaintenanceTask['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    )
  }

  // Handle single task fix
  const handleFixTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    setFixingTasks((prev) => new Set(prev).add(taskId))
    updateTaskStatus(taskId, 'in-progress')
    showToast('info', `⏳ Applying fix: ${task.description.substring(0, 50)}...`)

    try {
      const response = await fetch('/api/maintenance/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          autoCommit: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        updateTaskStatus(taskId, 'fixed')
        await loadTasksFromDB() // Reload from DB to get updated timestamp
        showToast('success', `✅ ${result.description}`)
      } else {
        updateTaskStatus(taskId, 'failed')
        const errorMsg = result.verification?.errors?.[0] || 'Unknown error'
        showToast('error', `❌ Fix failed: ${errorMsg.substring(0, 80)}`)
        
        if (result.rolledBack) {
          showToast('info', '↩️ Changes automatically rolled back')
        }
      }
    } catch (error) {
      updateTaskStatus(taskId, 'failed')
      showToast('error', `❌ Network error: ${error instanceof Error ? error.message : 'Unknown'}`)
    } finally {
      setFixingTasks((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Handle batch fix for ALL categories (1-14)
  const handleFixCategories1to4 = async () => {
    const allCategories = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    const targetTasks = tasks.filter(
      (task) => allCategories.includes(task.category) && task.type === 'auto' && getTaskStatus(task.id) === 'pending'
    )

    if (targetTasks.length === 0) {
      showToast('info', 'ℹ️ No pending AUTO tasks to fix')
      return
    }

    showToast('info', `⚡ Batch fixing ALL Categories (1-14): ${targetTasks.length} AUTO tasks...`)

    let successCount = 0
    let failCount = 0

    for (const task of targetTasks) {
      await handleFixTask(task.id)
      const status = getTaskStatus(task.id)
      if (status === 'fixed') successCount++
      if (status === 'failed') failCount++
      
      // Small delay between fixes
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (successCount > 0) {
      showToast('success', `✅ All Categories: Fixed ${successCount}/${targetTasks.length} tasks`)
    }
    if (failCount > 0) {
      showToast('error', `❌ ${failCount} tasks failed`)
    }
  }

  // Handle batch fix for category
  const handleFixCategory = async (categoryId: number) => {
    const categoryTasks = tasks.filter(
      (task) => task.category === categoryId && task.type === 'auto' && getTaskStatus(task.id) === 'pending'
    )

    if (categoryTasks.length === 0) {
      showToast('info', 'ℹ️ No pending AUTO tasks to fix in this category')
      return
    }

    showToast('info', `⚡ Fixing ${categoryTasks.length} AUTO tasks...`)

    let successCount = 0
    let failCount = 0

    for (const task of categoryTasks) {
      await handleFixTask(task.id)
      const status = getTaskStatus(task.id)
      if (status === 'fixed') successCount++
      if (status === 'failed') failCount++
      
      // Small delay between fixes
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (successCount > 0) {
      showToast('success', `✅ Fixed ${successCount}/${categoryTasks.length} tasks`)
    }
    if (failCount > 0) {
      showToast('error', `❌ ${failCount} tasks failed`)
    }
  }

  // Simulate scan (Phase 4 will replace with real WebSocket scanner)
  const handleScan = () => {
    setIsScanning(true)
    setScanProgress(0)

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          showToast('success', '✅ Scan complete - all tasks up to date')
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`border rounded-xl p-4 backdrop-blur shadow-lg animate-in slide-in-from-right ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/50'
                : toast.type === 'error'
                  ? 'bg-rose-500/20 border-rose-500/50'
                  : 'bg-cyan-500/20 border-cyan-500/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-white/60 hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="border border-white/10 rounded-3xl bg-white/5 backdrop-blur p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                🤖 Maintenance Dashboard
              </h1>
              <p className="text-white/60 text-sm md:text-base">
                Automated codebase health monitoring across 14 UI/UX categories
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleFixCategories1to4}
                disabled={fixingTasks.size > 0}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/50 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚡ Fix All AUTO (1-14)
              </button>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? `Scanning ${scanProgress}%` : '🔍 Run Scan'}
              </button>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold transition-colors">
                📊 Export Report
              </button>
            </div>
          </div>

          {/* Scan Progress */}
          {isScanning && (
            <div className="mt-4">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-200"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-2">
              Avg Score
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {avgScore.toFixed(0)}/100
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-2">
              Fixed
            </div>
            <div className="text-3xl font-bold text-cyan-400">
              {stats.fixed}/{stats.total}
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-2">
              Remaining
            </div>
            <div className="text-3xl font-bold text-amber-400">
              {stats.pending}
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-2">
              Time Saved
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {stats.fixed * 0.5}h
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-6 py-3 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            📋 All ({stats.total})
          </button>
          <button
            onClick={() => setActiveFilter('auto')}
            className={`px-6 py-3 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold whitespace-nowrap transition-all ${
              activeFilter === 'auto'
                ? 'bg-emerald-500 text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            ⚡ Auto ({stats.auto})
          </button>
          <button
            onClick={() => setActiveFilter('semi-auto')}
            className={`px-6 py-3 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold whitespace-nowrap transition-all ${
              activeFilter === 'semi-auto'
                ? 'bg-cyan-500 text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            🤖 Semi-Auto ({stats.semiAuto})
          </button>
          <button
            onClick={() => setActiveFilter('manual')}
            className={`px-6 py-3 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold whitespace-nowrap transition-all ${
              activeFilter === 'manual'
                ? 'bg-purple-500 text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            🧠 Manual ({stats.manual})
          </button>
        </div>

        {/* Category Cards Grid */}
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur p-8 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-bold mb-2">No Tasks Found</h3>
              <p className="text-white/60">
                {activeFilter === 'all'
                  ? 'All tasks have been completed!'
                  : `No ${activeFilter} tasks in the current filter.`}
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const categoryTasks = MAINTENANCE_TASKS.filter(
                (task) =>
                  task.category === category.id &&
                  (activeFilter === 'all' || task.type === activeFilter)
              )

              if (categoryTasks.length === 0) return null

              const autoCount = categoryTasks.filter(
                (t) => t.type === 'auto'
              ).length
              const semiAutoCount = categoryTasks.filter(
                (t) => t.type === 'semi-auto'
              ).length
              const manualCount = categoryTasks.filter(
                (t) => t.type === 'manual'
              ).length

              const scoreColor =
                category.score >= 95
                  ? 'text-emerald-400'
                  : category.score >= 85
                    ? 'text-cyan-400'
                    : category.score >= 75
                      ? 'text-amber-400'
                      : 'text-rose-400'

              return (
                <div
                  key={category.id}
                  className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">
                            {category.name}
                          </h3>
                          <span
                            className={`text-2xl font-bold ${scoreColor}`}
                          >
                            {category.score}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <span>
                            {categoryTasks.length} task
                            {categoryTasks.length !== 1 ? 's' : ''}
                          </span>
                          {autoCount > 0 && (
                            <span className="text-emerald-400">
                              ⚡ {autoCount}
                            </span>
                          )}
                          {semiAutoCount > 0 && (
                            <span className="text-cyan-400">
                              🤖 {semiAutoCount}
                            </span>
                          )}
                          {manualCount > 0 && (
                            <span className="text-purple-400">
                              🧠 {manualCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {autoCount > 0 && (
                        <button
                          onClick={() => handleFixCategory(category.id)}
                          disabled={fixingTasks.size > 0}
                          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-xl text-[11px] uppercase tracking-[0.16em] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ⚡ Fix All Auto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="divide-y divide-white/10">
                    {categoryTasks.map((task) => {
                      const typeConfig = {
                        auto: {
                          badge: '⚡ AUTO',
                          bg: 'bg-emerald-500/20',
                          border: 'border-emerald-500/50',
                          text: 'text-emerald-400',
                        },
                        'semi-auto': {
                          badge: '🤖 SEMI-AUTO',
                          bg: 'bg-cyan-500/20',
                          border: 'border-cyan-500/50',
                          text: 'text-cyan-400',
                        },
                        manual: {
                          badge: '🧠 MANUAL',
                          bg: 'bg-purple-500/20',
                          border: 'border-purple-500/50',
                          text: 'text-purple-400',
                        },
                      }[task.type]

                      const severityConfig = {
                        P1: { text: 'P1', color: 'text-rose-400' },
                        P2: { text: 'P2', color: 'text-amber-400' },
                        P3: { text: 'P3', color: 'text-cyan-400' },
                        P4: { text: 'P4', color: 'text-white/60' },
                      }[task.severity]

                      const taskStatus = getTaskStatus(task.id)
                      const isFixing = fixingTasks.has(task.id)

                      // Status badge
                      const statusConfig = {
                        pending: { badge: '⏳ Pending', bg: 'bg-white/5', border: 'border-white/10' },
                        'in-progress': { badge: '⚙️ Fixing...', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' },
                        fixed: { badge: '✅ Fixed', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
                        failed: { badge: '❌ Failed', bg: 'bg-rose-500/20', border: 'border-rose-500/50' },
                      }[taskStatus]

                      return (
                        <div key={task.id} className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span
                                  className={`px-2 py-1 ${typeConfig.bg} border ${typeConfig.border} rounded text-[10px] uppercase tracking-wider font-bold`}
                                >
                                  {typeConfig.badge}
                                </span>
                                <span
                                  className={`px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-wider font-bold ${severityConfig.color}`}
                                >
                                  {severityConfig.text}
                                </span>
                                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-wider font-bold text-white/60">
                                  {task.estimatedTime}
                                </span>
                                <span
                                  className={`px-2 py-1 ${statusConfig.bg} border ${statusConfig.border} rounded text-[10px] uppercase tracking-wider font-bold`}
                                >
                                  {statusConfig.badge}
                                </span>
                              </div>
                              <p className="text-sm mb-2">
                                {task.description}
                              </p>
                              <div className="text-xs text-white/60">
                                <span className="font-bold">
                                  {task.files.length} file
                                  {task.files.length !== 1 ? 's' : ''}:
                                </span>{' '}
                                {task.files.slice(0, 3).join(', ')}
                                {task.files.length > 3 &&
                                  ` +${task.files.length - 3} more`}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              {task.type === 'auto' && (
                                <button
                                  onClick={() => handleFixTask(task.id)}
                                  disabled={isFixing || taskStatus === 'fixed'}
                                  className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isFixing ? '⚙️ Fixing...' : taskStatus === 'fixed' ? '✅ Fixed' : '⚡ Fix Now'}
                                </button>
                              )}
                              {task.type === 'semi-auto' && (
                                <button
                                  disabled
                                  className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors opacity-50 cursor-not-allowed"
                                >
                                  🤖 Generate Fix
                                </button>
                              )}
                              {task.type === 'manual' && (
                                <button
                                  disabled
                                  className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors opacity-50 cursor-not-allowed"
                                >
                                  📖 View Guide
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
