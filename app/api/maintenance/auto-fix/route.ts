/**
 * ⚡ AUTO-FIX API ROUTE
 * 
 * POST /api/maintenance/auto-fix
 * 
 * Executes automated fixes with safety checks:
 * 1. Apply fix
 * 2. Run TypeScript + ESLint verification
 * 3. Rollback on failure
 * 4. Optional atomic commit
 * 
 * Request Body:
 * {
 *   taskId: string              // Task ID from lib/maintenance/tasks.ts
 *   dryRun?: boolean            // Preview changes without applying
 *   autoCommit?: boolean        // Automatically commit on success
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   filesModified: string[]
 *   changes: Array<{file, linesBefore, linesAfter, changeCount}>
 *   verification: {success, errors, warnings}
 *   rolledBack?: boolean
 *   committed?: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { MAINTENANCE_TASKS } from '@/lib/maintenance/tasks'
import { applyFix, hasFixFor } from '@/lib/maintenance/auto-fix-engine'
import { safeApplyFix } from '@/lib/maintenance/verify'
import { updateTaskStatus } from '@/lib/maintenance/task-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, dryRun = false, autoCommit = false } = body

    // Validate input
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid taskId' },
        { status: 400 }
      )
    }

    // Find task
    const task = MAINTENANCE_TASKS.find((t) => t.id === taskId)
    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      )
    }

    // Verify task is AUTO type
    if (task.type !== 'auto') {
      return NextResponse.json(
        { error: `Task ${taskId} is not an AUTO task (type: ${task.type})` },
        { status: 400 }
      )
    }

    // Verify fix exists
    if (!hasFixFor(task.fix)) {
      return NextResponse.json(
        { error: `Fix not implemented: ${task.fix}` },
        { status: 404 }
      )
    }

    // Log fix execution
    console.log(`⚡ Executing AUTO fix: ${taskId}`)
    console.log(`  Fix: ${task.fix}`)
    console.log(`  Files: ${task.files.join(', ')}`)
    console.log(`  Dry run: ${dryRun}`)
    console.log(`  Auto commit: ${autoCommit}`)

    // Apply fix with safety checks
    const result = await safeApplyFix({
      fixFn: async () => {
        const fixResult = await applyFix(task.fix, task.files)
        if (!fixResult.success) {
          throw new Error(
            `Fix failed: ${fixResult.errors.join(', ')}`
          )
        }
      },
      files: task.files,
      dryRun,
      autoCommit,
      commitMessage: autoCommit
        ? `fix: ${task.description} (${taskId})`
        : undefined,
    })

    // Update task status in database
    if (!dryRun) {
      if (result.success) {
        await updateTaskStatus(taskId, {
          status: 'fixed',
          fixedAt: new Date(),
          fixedBy: 'auto',
        })
      } else {
        await updateTaskStatus(taskId, {
          status: 'failed',
          errorMessage: result.errors.join('; '),
        })
      }
    }

    // Build response
    const response = {
      success: result.success,
      taskId,
      description: task.description,
      filesModified: task.files.filter((file) =>
        result.filesChecked.includes(file)
      ),
      verification: {
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
      },
      rolledBack: result.rolledBack || false,
      committed: autoCommit && result.success,
      timestamp: result.timestamp,
    }

    const statusCode = result.success ? 200 : 500

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error('❌ Auto-fix API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/maintenance/auto-fix
 * 
 * Returns list of available auto-fixes
 */
export async function GET() {
  try {
    const autoTasks = MAINTENANCE_TASKS.filter((t) => t.type === 'auto')

    const fixes = autoTasks.map((task) => ({
      id: task.id,
      category: task.category,
      severity: task.severity,
      description: task.description,
      files: task.files,
      estimatedTime: task.estimatedTime,
      fix: task.fix,
      status: task.status,
    }))

    return NextResponse.json({
      total: fixes.length,
      fixes,
    })
  } catch (error) {
    console.error('❌ Auto-fix GET error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
