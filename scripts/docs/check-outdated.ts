#!/usr/bin/env tsx
/**
 * Outdated Documentation Detection Script
 * 
 * Detects documentation files that may be outdated by comparing
 * modification times with related source code files.
 * 
 * Usage:
 *   tsx scripts/docs/check-outdated.ts [--threshold 30]
 */

import { statSync, readFileSync } from 'fs'
import { relative, basename } from 'path'
import { glob } from 'glob'

interface OutdatedDoc {
  docFile: string
  relatedFiles: string[]
  docAge: number
  newerFiles: Array<{ file: string; age: number }>
  severity: 'warning' | 'critical'
}

/**
 * Extract referenced files from markdown
 */
function extractReferencedFiles(content: string, docFile: string): string[] {
  const files = new Set<string>()
  const lines = content.split('\n')
  
  for (const line of lines) {
    // Match code block language hints
    const codeMatch = line.match(/```(\w+)/)
    if (codeMatch) {
      const lang = codeMatch[1]
      if (['typescript', 'javascript', 'tsx', 'jsx', 'ts', 'js'].includes(lang)) {
        // This doc likely references code
      }
    }
    
    // Match file references in text
    const fileMatches = line.matchAll(/`([a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx))`/g)
    for (const match of fileMatches) {
      files.add(match[1])
    }
    
    // Match links to source files
    const linkMatches = line.matchAll(/\[.*?\]\(\.\.\/\.\.\/([^)]+\.(ts|tsx|js|jsx))\)/g)
    for (const match of linkMatches) {
      files.add(match[1])
    }
  }
  
  // Reserved for future: infer related files based on doc name
  // and check for matching component/lib files
  
  return Array.from(files)
}

/**
 * Find source files related to a documentation file
 */
async function findRelatedFiles(docFile: string): Promise<string[]> {
  const content = readFileSync(docFile, 'utf-8')
  const explicitRefs = extractReferencedFiles(content, docFile)
  
  // Infer from directory structure
  const relPath = relative('docs', docFile)
  const parts = relPath.split('/')
  
  const searchPatterns: string[] = []
  
  // docs/features/xp-overlay.md -> components/XPEventOverlay.tsx
  if (parts[0] === 'features') {
    const feature = basename(docFile, '.md')
    searchPatterns.push(
      `components/**/*${feature}*.{ts,tsx}`,
      `lib/**/*${feature}*.{ts,tsx}`,
      `app/**/*${feature}*.{ts,tsx}`
    )
  }
  
  // docs/api/ -> app/api/
  if (parts[0] === 'api') {
    searchPatterns.push(`app/api/**/*.{ts,tsx}`)
  }
  
  // docs/architecture/ -> entire codebase
  if (parts[0] === 'architecture') {
    searchPatterns.push(
      `lib/**/*.{ts,tsx}`,
      `components/**/*.{ts,tsx}`
    )
  }
  
  const relatedFiles = new Set<string>(explicitRefs)
  
  for (const pattern of searchPatterns) {
    const matches = await glob(pattern, { ignore: ['**/node_modules/**', '**/*.test.*'] })
    matches.forEach(f => relatedFiles.add(f))
  }
  
  return Array.from(relatedFiles)
}

/**
 * Check if documentation is outdated
 */
async function checkOutdated(docFile: string, thresholdDays: number): Promise<OutdatedDoc | null> {
  const docStat = statSync(docFile)
  const docAge = (Date.now() - docStat.mtimeMs) / (1000 * 60 * 60 * 24)
  
  const relatedFiles = await findRelatedFiles(docFile)
  
  if (relatedFiles.length === 0) {
    return null
  }
  
  const newerFiles: Array<{ file: string; age: number }> = []
  
  for (const file of relatedFiles) {
    try {
      const fileStat = statSync(file)
      const fileAge = (Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)
      
      // If source file is newer than doc by threshold
      if (fileStat.mtimeMs > docStat.mtimeMs && (docAge - fileAge) > thresholdDays) {
        newerFiles.push({ file, age: fileAge })
      }
    } catch {
      // File doesn't exist, skip
    }
  }
  
  if (newerFiles.length === 0) {
    return null
  }
  
  const severity: 'warning' | 'critical' = docAge > thresholdDays * 2 ? 'critical' : 'warning'
  
  return {
    docFile,
    relatedFiles,
    docAge,
    newerFiles,
    severity
  }
}

/**
 * Format outdated doc for display
 */
function formatOutdated(doc: OutdatedDoc): string {
  const icon = doc.severity === 'critical' ? '🔴' : '⚠️'
  const relPath = relative(process.cwd(), doc.docFile)
  
  let output = `${icon} ${relPath}\n`
  output += `   Last updated: ${Math.floor(doc.docAge)} days ago\n`
  output += `   Newer source files (${doc.newerFiles.length}):\n`
  
  for (const file of doc.newerFiles.slice(0, 5)) {
    const fileRel = relative(process.cwd(), file.file)
    output += `     - ${fileRel} (${Math.floor(file.age)} days ago)\n`
  }
  
  if (doc.newerFiles.length > 5) {
    output += `     ... and ${doc.newerFiles.length - 5} more\n`
  }
  
  return output
}

/**
 * Generate report markdown
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _generateReport(outdated: OutdatedDoc[]): string {
  const md: string[] = []
  
  md.push(`# Outdated Documentation Report\n`)
  md.push(`> Generated: ${new Date().toISOString()}\n`)
  
  if (outdated.length === 0) {
    md.push(`\n✅ **All documentation is up to date!**\n`)
    return md.join('')
  }
  
  const critical = outdated.filter(d => d.severity === 'critical')
  const warnings = outdated.filter(d => d.severity === 'warning')
  
  md.push(`\n## Summary\n`)
  md.push(`- 🔴 Critical: ${critical.length}\n`)
  md.push(`- ⚠️ Warnings: ${warnings.length}\n`)
  md.push(`- **Total:** ${outdated.length}\n`)
  
  if (critical.length > 0) {
    md.push(`\n## 🔴 Critical (Needs Immediate Update)\n`)
    for (const doc of critical) {
      md.push(`\n### \`${relative(process.cwd(), doc.docFile)}\`\n`)
      md.push(`- **Last updated:** ${Math.floor(doc.docAge)} days ago\n`)
      md.push(`- **Related files changed:** ${doc.newerFiles.length}\n`)
      md.push(`\n**Recently modified files:**\n`)
      for (const file of doc.newerFiles.slice(0, 5)) {
        md.push(`- \`${relative(process.cwd(), file.file)}\` (${Math.floor(file.age)} days ago)\n`)
      }
    }
  }
  
  if (warnings.length > 0) {
    md.push(`\n## ⚠️ Warnings (Should Review)\n`)
    for (const doc of warnings) {
      md.push(`\n### \`${relative(process.cwd(), doc.docFile)}\`\n`)
      md.push(`- **Last updated:** ${Math.floor(doc.docAge)} days ago\n`)
      md.push(`- **Related files changed:** ${doc.newerFiles.length}\n`)
    }
  }
  
  md.push(`\n## Action Items\n`)
  md.push(`1. Review critical documentation files and update with recent changes\n`)
  md.push(`2. Check warning files for potential updates\n`)
  md.push(`3. Run \`pnpm run docs:extract\` to regenerate API docs\n`)
  md.push(`4. Update examples and code snippets to match current implementation\n`)
  
  return md.join('')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
  const thresholdDays = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 30
  
  console.log(`📅 Checking for outdated documentation (threshold: ${thresholdDays} days)...\n`)
  
  // Find all markdown files in docs/
  const markdownFiles = await glob('docs/**/*.md', {
    ignore: ['**/node_modules/**', '**/analysis/**', '**/SPRINT*.md']
  })
  
  console.log(`📄 Scanning ${markdownFiles.length} documentation files\n`)
  
  const outdated: OutdatedDoc[] = []
  
  for (const file of markdownFiles) {
    const result = await checkOutdated(file, thresholdDays)
    if (result) {
      outdated.push(result)
      console.log(formatOutdated(result))
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Files checked: ${markdownFiles.length}`)
  console.log(`   Outdated: ${outdated.length}`)
  
  const critical = outdated.filter(d => d.severity === 'critical').length
  const warnings = outdated.filter(d => d.severity === 'warning').length
  
  console.log(`   - Critical: ${critical}`)
  console.log(`   - Warnings: ${warnings}`)
  
  if (outdated.length > 0) {
    console.log(`\n⚠️  Some documentation may need updates!`)
    console.log(`   Run with --threshold=<days> to adjust sensitivity`)
  } else {
    console.log(`\n✅ All documentation appears up to date!`)
  }
}

main().catch(console.error)
