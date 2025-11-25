/**
 * 🔒 VERIFICATION LAYER
 * 
 * Safety checks for automated fixes:
 * - TypeScript compilation validation
 * - ESLint validation
 * - Git status detection
 * - Automatic rollback on failure
 * 
 * Usage:
 * ```typescript
 * const result = await verifyChanges(['path/to/file.tsx'])
 * if (!result.success) {
 *   await rollbackChanges()
 * }
 * ```
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface VerificationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  filesChecked: string[]
  timestamp: Date
}

export interface TypeScriptCheckResult {
  success: boolean
  errors: string[]
}

export interface ESLintCheckResult {
  success: boolean
  errors: string[]
  warnings: string[]
}

export interface GitStatusResult {
  hasUncommittedChanges: boolean
  modifiedFiles: string[]
}

/**
 * Run TypeScript compilation check
 * Uses: pnpm tsc --noEmit
 */
export async function checkTypeScript(): Promise<TypeScriptCheckResult> {
  try {
    const { stdout, stderr } = await execAsync('pnpm tsc --noEmit', {
      cwd: process.cwd(),
      timeout: 60000, // 60 second timeout
    })

    // TypeScript errors appear in stdout
    const output = stdout + stderr
    const hasErrors = output.includes('error TS')

    if (hasErrors) {
      // Extract error messages
      const errors = output
        .split('\n')
        .filter((line) => line.includes('error TS'))
        .slice(0, 10) // Limit to first 10 errors

      return {
        success: false,
        errors,
      }
    }

    return {
      success: true,
      errors: [],
    }
  } catch (error) {
    // exec throws if exit code !== 0
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown TypeScript error'

    // Parse TypeScript errors from error message
    const errors = errorMessage
      .split('\n')
      .filter((line) => line.includes('error TS'))
      .slice(0, 10)

    return {
      success: false,
      errors: errors.length > 0 ? errors : [errorMessage],
    }
  }
}

/**
 * Run ESLint validation
 * Uses: pnpm lint --max-warnings=0 [files...]
 */
export async function checkESLint(
  files?: string[]
): Promise<ESLintCheckResult> {
  try {
    const fileArgs = files && files.length > 0 ? files.join(' ') : ''
    const command = `pnpm lint ${fileArgs}`.trim()

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 60000, // 60 second timeout
    })

    const output = stdout + stderr

    // Check for errors (exclude command echo lines starting with >)
    const hasErrors = output.includes('✖') && output.includes('error')
    const hasWarnings = output.split('\n').some(line => 
      line.includes('warning') && !line.trim().startsWith('>')
    )

    if (hasErrors || hasWarnings) {
      const errors = output
        .split('\n')
        .filter((line) => line.includes('error') && !line.trim().startsWith('>'))
        .slice(0, 10)

      const warnings = output
        .split('\n')
        .filter((line) => line.includes('warning') && !line.trim().startsWith('>'))
        .slice(0, 10)

      return {
        success: false,
        errors,
        warnings,
      }
    }

    return {
      success: true,
      errors: [],
      warnings: [],
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown ESLint error'

    return {
      success: false,
      errors: [errorMessage],
      warnings: [],
    }
  }
}

/**
 * Check git status for uncommitted changes
 * Uses: git status --porcelain
 */
export async function checkGitStatus(): Promise<GitStatusResult> {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: process.cwd(),
      timeout: 10000, // 10 second timeout
    })

    const modifiedFiles = stdout
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.substring(3).trim()) // Remove status prefix (e.g., "M  ")

    return {
      hasUncommittedChanges: modifiedFiles.length > 0,
      modifiedFiles,
    }
  } catch (error) {
    console.error('Git status check failed:', error)
    return {
      hasUncommittedChanges: false,
      modifiedFiles: [],
    }
  }
}

/**
 * Comprehensive verification of code changes
 * Runs TypeScript + ESLint checks on specified files
 */
export async function verifyChanges(
  files?: string[]
): Promise<VerificationResult> {
  const timestamp = new Date()
  const allErrors: string[] = []
  const allWarnings: string[] = []

  console.log('🔍 Starting verification...')

  // Step 1: TypeScript check
  console.log('  ⏳ Checking TypeScript...')
  const tsResult = await checkTypeScript()
  if (!tsResult.success) {
    console.log('  ❌ TypeScript errors found')
    allErrors.push(...tsResult.errors)
  } else {
    console.log('  ✅ TypeScript passed')
  }

  // Step 2: ESLint check
  console.log('  ⏳ Checking ESLint...')
  const eslintResult = await checkESLint(files)
  if (!eslintResult.success) {
    console.log('  ❌ ESLint errors/warnings found')
    allErrors.push(...eslintResult.errors)
    allWarnings.push(...eslintResult.warnings)
  } else {
    console.log('  ✅ ESLint passed')
  }

  const success = tsResult.success && eslintResult.success

  return {
    success,
    errors: allErrors,
    warnings: allWarnings,
    filesChecked: files || [],
    timestamp,
  }
}

/**
 * Rollback changes using git
 * Reverts all uncommitted changes in specified files
 */
export async function rollbackChanges(files?: string[]): Promise<boolean> {
  try {
    console.log('🔄 Rolling back changes...')

    if (files && files.length > 0) {
      // Rollback specific files
      for (const file of files) {
        await execAsync(`git checkout -- "${file}"`, {
          cwd: process.cwd(),
          timeout: 10000,
        })
        console.log(`  ↩️  Rolled back: ${file}`)
      }
    } else {
      // Rollback all changes
      await execAsync('git checkout -- .', {
        cwd: process.cwd(),
        timeout: 10000,
      })
      console.log('  ↩️  Rolled back all changes')
    }

    console.log('✅ Rollback complete')
    return true
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    return false
  }
}

/**
 * Create a git commit for applied fixes
 */
export async function commitChanges(
  message: string,
  files?: string[]
): Promise<boolean> {
  try {
    console.log('💾 Committing changes...')

    if (files && files.length > 0) {
      // Add specific files
      for (const file of files) {
        await execAsync(`git add "${file}"`, {
          cwd: process.cwd(),
          timeout: 10000,
        })
      }
    } else {
      // Add all changes
      await execAsync('git add .', {
        cwd: process.cwd(),
        timeout: 10000,
      })
    }

    // Commit
    await execAsync(`git commit -m "${message}"`, {
      cwd: process.cwd(),
      timeout: 10000,
    })

    console.log('✅ Commit successful')
    return true
  } catch (error) {
    console.error('❌ Commit failed:', error)
    return false
  }
}

/**
 * Dry-run mode: Preview changes without applying
 * Returns the diff for specified files
 */
export async function previewChanges(files?: string[]): Promise<string> {
  try {
    const fileArgs = files && files.length > 0 ? files.join(' ') : '.'
    const { stdout } = await execAsync(`git diff ${fileArgs}`, {
      cwd: process.cwd(),
      timeout: 10000,
    })
    return stdout
  } catch (error) {
    console.error('Preview failed:', error)
    return ''
  }
}

/**
 * Complete safety workflow for applying fixes
 * 
 * @param fixFn - Function that applies the fix
 * @param files - Files to verify after fix
 * @param dryRun - If true, only preview changes without applying
 * @param autoCommit - If true, automatically commit on success
 * @param commitMessage - Commit message if autoCommit is true
 */
export async function safeApplyFix(options: {
  fixFn: () => Promise<void>
  files: string[]
  dryRun?: boolean
  autoCommit?: boolean
  commitMessage?: string
}): Promise<VerificationResult & { rolledBack?: boolean }> {
  const { fixFn, files, dryRun = false, autoCommit = false, commitMessage } = options

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be applied')
    // In dry-run, we don't actually apply the fix
    return {
      success: true,
      errors: [],
      warnings: ['DRY RUN MODE - No changes applied'],
      filesChecked: files,
      timestamp: new Date(),
    }
  }

  try {
    // Step 1: Apply the fix
    console.log('⚡ Applying fix...')
    await fixFn()
    console.log('✅ Fix applied')

    // Step 2: Verify changes
    const verification = await verifyChanges(files)

    if (!verification.success) {
      // Step 3: Rollback on failure
      console.log('❌ Verification failed, rolling back...')
      await rollbackChanges(files)
      return {
        ...verification,
        rolledBack: true,
      }
    }

    // Step 4: Optional auto-commit
    if (autoCommit && commitMessage) {
      await commitChanges(commitMessage, files)
    }

    return verification
  } catch (error) {
    console.error('❌ Fix application failed:', error)
    
    // Attempt rollback
    await rollbackChanges(files)

    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
      filesChecked: files,
      timestamp: new Date(),
      rolledBack: true,
    }
  }
}
