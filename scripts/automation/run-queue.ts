#!/usr/bin/env tsx

import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import process from 'process'
import yaml from 'yaml'

type TaskDefinition = {
  id: string
  description: string
  command: string
  dependsOn?: string[]
  continueOnError?: boolean
  env?: Record<string, string>
}

type Manifest = {
  tasks: TaskDefinition[]
}

type CliOptions = {
  file: string
  from?: string
  dryRun?: boolean
  logFile: string
  summaryFile?: string
  summaryHeading: string
}

type TaskResult = {
  id: string
  command: string
  description: string
  status: 'skipped' | 'success' | 'failed'
  exitCode: number | null
  startedAt: Date | null
  finishedAt: Date | null
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    file: 'scripts/automation/tasks.yaml',
    logFile: 'scripts/automation/automation.log',
    summaryFile: process.env.AUTOMATION_SUMMARY_FILE,
    summaryHeading: process.env.AUTOMATION_SUMMARY_HEADING ?? '## Summary (End of Day)',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--file':
      case '-f':
        options.file = argv[++i] ?? options.file
        break
      case '--from':
        options.from = argv[++i]
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--log':
        options.logFile = argv[++i] ?? options.logFile
        break
      case '--summary-file':
        options.summaryFile = argv[++i]
        break
      case '--summary-heading':
        options.summaryHeading = argv[++i] ?? options.summaryHeading
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        console.warn(`Unknown argument: ${arg}`)
        break
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage: tsx scripts/automation/run-queue.ts [options]\n\nOptions:\n  --file, -f <path>        Task manifest (default scripts/automation/tasks.yaml)\n  --from <id>              Resume from task id\n  --dry-run                Show tasks without executing commands\n  --log <path>             Log file path (default scripts/automation/automation.log)\n  --summary-file <path>    Append run summary bullet to markdown file\n  --summary-heading <text> Heading to target when updating summary (default "## Summary (End of Day)")\n  --help, -h               Show this help message`)
}

async function loadManifest(manifestPath: string): Promise<Manifest> {
  const raw = await fs.readFile(manifestPath, 'utf8')
  const parsed = yaml.parse(raw) as Manifest
  if (!parsed || !Array.isArray(parsed.tasks)) {
    throw new Error(`Manifest at ${manifestPath} must contain a top-level 'tasks' array`)
  }
  return parsed
}

function validateTasks(tasks: TaskDefinition[]) {
  const ids = new Set<string>()
  for (const task of tasks) {
    if (!task.id) throw new Error('Each task requires an id')
    if (ids.has(task.id)) throw new Error(`Duplicate task id detected: ${task.id}`)
    ids.add(task.id)
    if (!task.command) throw new Error(`Task ${task.id} is missing a command`)
  }

  for (const task of tasks) {
    if (!task.dependsOn) continue
    for (const dep of task.dependsOn) {
      if (!ids.has(dep)) throw new Error(`Task ${task.id} depends on unknown task ${dep}`)
    }
  }
}

function orderTasks(tasks: TaskDefinition[]): TaskDefinition[] {
  const sorted: TaskDefinition[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const taskMap = new Map(tasks.map((task) => [task.id, task]))

  function visit(task: TaskDefinition) {
    if (visited.has(task.id)) return
    if (visiting.has(task.id)) throw new Error(`Circular dependency detected at ${task.id}`)

    visiting.add(task.id)
    const deps = task.dependsOn ?? []
    for (const depId of deps) {
      const dep = taskMap.get(depId)
      if (!dep) throw new Error(`Dependency ${depId} for task ${task.id} not found`)
      visit(dep)
    }
    visiting.delete(task.id)
    visited.add(task.id)
    sorted.push(task)
  }

  for (const task of tasks) {
    visit(task)
  }

  return sorted
}

async function ensureLogFile(logPath: string) {
  const dir = path.dirname(logPath)
  await fs.mkdir(dir, { recursive: true })
  try {
    await fs.access(logPath)
  } catch {
    await fs.writeFile(logPath, '')
  }
}

async function logLine(logPath: string, message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  await fs.appendFile(logPath, line)
}

async function ensureFile(pathToFile: string) {
  await fs.mkdir(path.dirname(pathToFile), { recursive: true })
  try {
    await fs.access(pathToFile)
  } catch {
    await fs.writeFile(pathToFile, '')
  }
}

function findHeadingIndex(lines: string[], heading: string): number {
  const normalized = heading.trim()
  return lines.findIndex((line) => line.trim() === normalized)
}

async function updateSummaryFile(filePath: string, heading: string, summaryLine: string) {
  const absPath = path.resolve(filePath)
  await ensureFile(absPath)

  let content = ''
  try {
    content = await fs.readFile(absPath, 'utf8')
  } catch {
    content = ''
  }

  const lines = content.length ? content.split(/\r?\n/) : []
  const bullet = `- ${summaryLine}`
  const headingIndex = findHeadingIndex(lines, heading)

  if (headingIndex === -1) {
    if (lines.length && lines[lines.length - 1].trim() !== '') {
      lines.push('')
    }
    lines.push(heading.trim())
    lines.push('')
    lines.push(bullet)
  } else {
    let insertIndex = headingIndex + 1
    if (insertIndex >= lines.length || lines[insertIndex].trim() !== '') {
      lines.splice(insertIndex, 0, '')
      insertIndex += 1
    }

    while (insertIndex < lines.length) {
      const trimmed = lines[insertIndex].trim()
      if (!trimmed) {
        const next = lines[insertIndex + 1]?.trim()
        if (next && next.startsWith('#')) break
        insertIndex += 1
        continue
      }
      if (trimmed.startsWith('#')) break
      insertIndex += 1
    }

    lines.splice(insertIndex, 0, bullet)
  }

  const nextContent = lines.join('\n').replace(/\s+$/, '') + '\n'
  await fs.writeFile(absPath, nextContent)
}

async function runTask(task: TaskDefinition, options: CliOptions): Promise<TaskResult> {
  const result: TaskResult = {
    id: task.id,
    command: task.command,
    description: task.description,
    status: 'skipped',
    exitCode: null,
    startedAt: null,
    finishedAt: null,
  }

  const logPath = path.resolve(options.logFile)
  const header = `==> [${task.id}] ${task.description}`
  console.log(`\n${header}`)
  await logLine(logPath, header)

  if (options.dryRun) {
    await logLine(logPath, `DRY RUN: ${task.command}`)
    return result
  }

  result.startedAt = new Date()
  await logLine(logPath, `RUN ${task.command}`)

  const exitCode = await new Promise<number>((resolve) => {
    const child = spawn(task.command, {
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...(task.env ?? {}) },
    })

    child.on('exit', (code) => {
      resolve(code ?? 0)
    })
  })

  result.finishedAt = new Date()
  result.exitCode = exitCode
  result.status = exitCode === 0 ? 'success' : 'failed'

  await logLine(logPath, `EXIT ${task.id} code=${exitCode}`)

  return result
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const manifestPath = path.resolve(options.file)
  await ensureLogFile(path.resolve(options.logFile))

  const manifest = await loadManifest(manifestPath)
  validateTasks(manifest.tasks)
  const ordered = orderTasks(manifest.tasks)

  let startIndex = 0
  if (options.from) {
    const idx = ordered.findIndex((task) => task.id === options.from)
    if (idx === -1) throw new Error(`--from id '${options.from}' not found in manifest`)
    startIndex = idx
  }

  const tasksToRun = ordered.slice(startIndex)

  const summary: TaskResult[] = []
  for (const task of tasksToRun) {
    const result = await runTask(task, options)
    summary.push(result)
    if (result.status === 'failed' && !task.continueOnError) {
      console.error(`Task ${task.id} failed (exit ${result.exitCode}). Halting queue.`)
      break
    }
  }

  const succeeded = summary.filter((task) => task.status === 'success').length
  const failed = summary.filter((task) => task.status === 'failed').length
  const skipped = summary.filter((task) => task.status === 'skipped').length

  console.log('\nQueue summary:')
  console.log(`  Success: ${succeeded}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Skipped: ${skipped}`)

  await logLine(path.resolve(options.logFile), `SUMMARY success=${succeeded} failed=${failed} skipped=${skipped}`)

  if (!options.dryRun && options.summaryFile) {
    const manifestDisplay = path.relative(process.cwd(), manifestPath)
    const summaryLine = `[${new Date().toISOString()}] ${manifestDisplay} success=${succeeded} failed=${failed} skipped=${skipped}`
    try {
      await updateSummaryFile(options.summaryFile, options.summaryHeading, summaryLine)
    } catch (error) {
      console.warn('Failed to update summary file:', error)
    }
  }

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Automation runner failed:', error)
  process.exitCode = 1
})
