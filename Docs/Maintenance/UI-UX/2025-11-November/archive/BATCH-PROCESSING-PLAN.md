# Batch Processing Implementation Plan
**Date**: November 25, 2025  
**Status**: 📋 **PLANNED** (Optional Enhancement)

---

## 🎯 Objective

Add safe batch processing capabilities to handle multiple fixes concurrently or in a queue, with conflict detection and error recovery.

---

## 🏗️ Architecture Design

### Current State
- ✅ Single task execution: Click button → Fix → Validate → Commit/Rollback
- ✅ Category batch: Sequential execution with 500ms delay
- ⚠️ No queue system: UI blocks during execution
- ⚠️ No concurrent handling: One fix at a time
- ⚠️ No conflict detection: May fail if files modified externally

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN UI (Client)                        │
│                                                              │
│  [Fix All Auto] → POST /api/maintenance/batch               │
│  [Fix Category] → POST /api/maintenance/batch               │
│  [Fix Task] → POST /api/maintenance/auto-fix (existing)     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BATCH PROCESSING API                            │
│                                                              │
│  POST /api/maintenance/batch                                │
│  { taskIds: string[], mode: 'sequential'|'concurrent' }     │
│                                                              │
│  1. Validate all taskIds                                    │
│  2. Check for file conflicts                                │
│  3. Queue tasks in priority order                           │
│  4. Execute with safety checks                              │
│  5. Return batch results                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   TASK QUEUE ENGINE                          │
│                                                              │
│  lib/maintenance/task-queue.ts                              │
│                                                              │
│  • Priority queue (P1 > P2 > P3 > P4)                       │
│  • Conflict detection (same file)                           │
│  • Progress tracking (callbacks)                            │
│  • Error recovery (retry logic)                             │
│  • Concurrent execution (pool size: 3)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AUTO-FIX ENGINE (Existing)                      │
│                                                              │
│  lib/maintenance/auto-fix-engine.ts                         │
│  lib/maintenance/verify.ts                                  │
│                                                              │
│  • Apply fix to files                                       │
│  • Validate (TypeScript + ESLint)                           │
│  • Commit or rollback                                       │
│  • Update database                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Tasks

### Phase 1: Queue System (Core)

**File**: `lib/maintenance/task-queue.ts` (new)

**Features**:
- ✅ Priority queue based on task severity (P1 > P2 > P3 > P4)
- ✅ Conflict detection: Check if tasks modify same files
- ✅ Progress callbacks: Notify UI of status changes
- ✅ Error handling: Retry failed tasks with exponential backoff
- ✅ Concurrent execution: Configurable pool size (default: 3)

**Interface**:
```typescript
interface QueueTask {
  taskId: string
  priority: number // 1-4 based on severity
  files: string[]
  estimatedTime: number
}

interface QueueResult {
  taskId: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
  duration: number
}

class TaskQueue {
  constructor(options: {
    concurrency: number // Max concurrent tasks
    onProgress: (progress: QueueProgress) => void
    onComplete: (results: QueueResult[]) => void
  })
  
  add(tasks: QueueTask[]): void
  start(): Promise<QueueResult[]>
  pause(): void
  resume(): void
  cancel(): void
  getStatus(): QueueStatus
}
```

---

### Phase 2: Conflict Detection

**File**: `lib/maintenance/conflict-detector.ts` (new)

**Features**:
- ✅ Analyze file dependencies between tasks
- ✅ Build dependency graph
- ✅ Detect circular dependencies
- ✅ Suggest execution order
- ✅ Warn about potential conflicts

**Algorithm**:
```typescript
function detectConflicts(tasks: MaintenanceTask[]): ConflictReport {
  const fileMap = new Map<string, string[]>() // file → taskIds
  
  // Build file map
  for (const task of tasks) {
    for (const file of task.files) {
      if (!fileMap.has(file)) fileMap.set(file, [])
      fileMap.get(file)!.push(task.id)
    }
  }
  
  // Find conflicts (files modified by >1 task)
  const conflicts: Conflict[] = []
  for (const [file, taskIds] of fileMap) {
    if (taskIds.length > 1) {
      conflicts.push({ file, taskIds, severity: 'high' })
    }
  }
  
  return { conflicts, canProceed: conflicts.length === 0 }
}
```

---

### Phase 3: Batch API

**File**: `app/api/maintenance/batch/route.ts` (new)

**Endpoints**:

1. **POST /api/maintenance/batch**
   ```typescript
   // Request
   {
     taskIds: string[]
     mode: 'sequential' | 'concurrent'
     options: {
       stopOnError?: boolean // Default: false
       maxRetries?: number // Default: 2
       autoCommit?: boolean // Default: true
     }
   }
   
   // Response
   {
     success: boolean
     total: number
     succeeded: number
     failed: number
     results: Array<{
       taskId: string
       status: 'success' | 'failed' | 'skipped'
       error?: string
       duration: number
     }>
     conflicts?: ConflictReport
   }
   ```

2. **GET /api/maintenance/batch/:batchId**
   ```typescript
   // Get batch execution status (for long-running operations)
   {
     batchId: string
     status: 'pending' | 'running' | 'completed' | 'failed'
     progress: { completed: number, total: number, percentage: number }
     results: QueueResult[]
   }
   ```

---

### Phase 4: Admin UI Updates

**File**: `app/admin/maintenance/page.tsx` (modify)

**New Features**:

1. **Batch Progress Modal**:
   ```tsx
   {batchProgress && (
     <BatchProgressModal
       progress={batchProgress}
       onCancel={cancelBatch}
       results={batchResults}
     />
   )}
   ```

2. **Fix All Auto Button** (functional):
   ```tsx
   <button onClick={handleFixAllAuto}>
     ⚡ Fix All Auto ({stats.auto})
   </button>
   ```

3. **Category Batch Button** (improved):
   ```tsx
   <button onClick={() => handleFixCategory(cat.id, 'concurrent')}>
     ⚡ Fix All ({categoryAutoCount})
   </button>
   ```

4. **Conflict Warning**:
   ```tsx
   {conflicts.length > 0 && (
     <div className="alert alert-warning">
       ⚠️ {conflicts.length} file conflicts detected.
       Some tasks modify the same files.
       Recommend sequential execution.
     </div>
   )}
   ```

---

## 🔒 Safety Mechanisms

### 1. Pre-Flight Checks
- ✅ Validate all taskIds exist
- ✅ Check git status (no uncommitted changes)
- ✅ Verify fix implementations exist
- ✅ Detect file conflicts
- ✅ Estimate total execution time

### 2. Execution Safety
- ✅ Lock files during fix (prevent concurrent modification)
- ✅ Atomic commits per task (not batch)
- ✅ Rollback individual failures (don't affect others)
- ✅ Timeout per task (max 2 minutes)
- ✅ Progress checkpoints (resume on crash)

### 3. Error Recovery
- ✅ Retry failed tasks (max 2 attempts)
- ✅ Skip tasks with unresolved dependencies
- ✅ Continue on error (unless stopOnError=true)
- ✅ Detailed error logging
- ✅ Database persistence of batch results

---

## 📊 Performance Estimates

### Sequential Mode
| Tasks | Estimated Time | Notes |
|-------|----------------|-------|
| 5 tasks | 15-50s | 3-10s per task |
| 10 tasks | 30-100s | TypeScript validation shared |
| 42 tasks (all AUTO) | 2-7 minutes | ~10s per task avg |

### Concurrent Mode (3 workers)
| Tasks | Estimated Time | Notes |
|-------|----------------|-------|
| 5 tasks | 10-30s | 3x speedup |
| 10 tasks | 15-50s | Limited by TypeScript validation |
| 42 tasks (all AUTO) | 1-3 minutes | ~4s per task avg |

**Bottleneck**: TypeScript validation runs on full project, not parallelizable

---

## 🚧 Implementation Priority

### Must Have (P1)
- ✅ Sequential batch execution (already exists)
- ✅ Basic conflict detection
- ✅ Progress tracking in UI

### Should Have (P2)
- ⏳ Concurrent execution with worker pool
- ⏳ Retry logic for failed tasks
- ⏳ Batch API endpoint
- ⏳ Database persistence of batch results

### Nice to Have (P3)
- ⏳ Resume interrupted batches
- ⏳ Background worker (no UI blocking)
- ⏳ WebSocket progress updates
- ⏳ Estimated time remaining

---

## 🎯 Recommendation

**Current State**: ✅ **SUFFICIENT FOR NOW**

The existing system already supports:
- ✅ Category-level batch fixes (sequential)
- ✅ 500ms delay between tasks (prevents overload)
- ✅ Error handling per task (continues on failure)
- ✅ Database persistence after each fix

**When to Implement Full Batch System**:
- 📊 After testing with 10+ fixes
- 📊 If users report slow execution
- 📊 If concurrent execution becomes critical
- 📊 If running large batches (>20 tasks) frequently

**Estimated Effort**: 6-8 hours
- 2h: Task queue engine
- 2h: Conflict detection
- 2h: Batch API endpoint
- 2h: Admin UI updates + testing

---

## 📋 Testing Plan (When Implemented)

### Unit Tests
- ✅ Queue priority ordering
- ✅ Conflict detection algorithm
- ✅ Retry logic with exponential backoff
- ✅ Worker pool concurrency limits

### Integration Tests
- ✅ Batch execution (sequential)
- ✅ Batch execution (concurrent)
- ✅ Rollback on failure
- ✅ Database persistence
- ✅ Progress callbacks

### Manual Tests
- ✅ Fix 5 tasks with no conflicts
- ✅ Fix 5 tasks with file conflicts (warn user)
- ✅ Cancel batch mid-execution
- ✅ Retry failed task
- ✅ Verify database shows all results

---

## 🚀 Deployment Notes

**Phase 1** (Current): ✅ **DEPLOYED**
- Sequential batch execution via category buttons
- Basic error handling and toast notifications
- Database persistence per task

**Phase 2** (Future): ⏳ **OPTIONAL**
- Implement when user needs arise
- Test thoroughly in development
- Deploy to staging first
- Monitor performance metrics

---

**Status**: 📋 **PLANNED - NOT REQUIRED FOR LAUNCH**

The current system is **fully operational** for manual and supervised batch operations. Full batch processing with queues and concurrency is an **optional enhancement** for future iterations.
