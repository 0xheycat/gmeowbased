#!/usr/bin/env tsx
/**
 * Link Validation Script
 * 
 * Validates all internal links in markdown files to ensure they point
 * to existing files and anchors.
 * 
 * Usage:
 *   tsx scripts/docs/validate-links.ts [--fix]
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname, resolve, relative } from 'path'
import { glob } from 'glob'

interface LinkIssue {
  file: string
  line: number
  link: string
  target: string
  issue: 'missing-file' | 'missing-anchor' | 'external-unreachable'
  suggestion?: string
}

/**
 * Extract markdown links from content
 */
function extractLinks(content: string): Array<{ text: string; url: string; line: number }> {
  const links: Array<{ text: string; url: string; line: number }> = []
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Match [text](url) format
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match: RegExpExecArray | null
    
    while ((match = linkRegex.exec(line)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        line: i + 1
      })
    }
  }
  
  return links
}

/**
 * Extract anchors from markdown content
 */
function extractAnchors(content: string): Set<string> {
  const anchors = new Set<string>()
  const lines = content.split('\n')
  
  for (const line of lines) {
    // Match markdown headers
    const headerMatch = line.match(/^#{1,6}\s+(.+)$/)
    if (headerMatch) {
      const anchor = headerMatch[1]
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
      anchors.add(anchor)
    }
    
    // Match explicit anchor tags
    const anchorMatch = line.match(/<a\s+name=["']([^"']+)["']/g)
    if (anchorMatch) {
      anchorMatch.forEach(tag => {
        const nameMatch = tag.match(/name=["']([^"']+)["']/)
        if (nameMatch) {
          anchors.add(nameMatch[1])
        }
      })
    }
  }
  
  return anchors
}

/**
 * Check if a file path exists, with fuzzy matching
 */
function findFile(basePath: string, targetPath: string): { found: boolean; suggestion?: string } {
  const fullPath = resolve(basePath, targetPath)
  
  if (existsSync(fullPath)) {
    return { found: true }
  }
  
  // Try case-insensitive match
  const dir = dirname(fullPath)
  const filename = targetPath.split('/').pop()!
  
  if (existsSync(dir)) {
    const files = readdirSync(dir)
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase())
    if (match) {
      return { 
        found: false, 
        suggestion: join(relative(process.cwd(), dir), match)
      }
    }
  }
  
  return { found: false }
}

/**
 * Validate internal link
 */
function validateInternalLink(
  sourceFile: string,
  link: { text: string; url: string; line: number }
): LinkIssue | null {
  const [path, anchor] = link.url.split('#')
  
  // Skip external links
  if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
    return null
  }
  
  // Skip mailto and other protocols
  if (link.url.includes(':')) {
    return null
  }
  
  const sourceDir = dirname(sourceFile)
  
  // Check file exists
  if (path) {
    const result = findFile(sourceDir, path)
    
    if (!result.found) {
      return {
        file: sourceFile,
        line: link.line,
        link: link.url,
        target: path,
        issue: 'missing-file',
        suggestion: result.suggestion
      }
    }
    
    // Check anchor exists
    if (anchor) {
      const targetFile = resolve(sourceDir, path)
      const content = readFileSync(targetFile, 'utf-8')
      const anchors = extractAnchors(content)
      
      if (!anchors.has(anchor)) {
        return {
          file: sourceFile,
          line: link.line,
          link: link.url,
          target: `${path}#${anchor}`,
          issue: 'missing-anchor'
        }
      }
    }
  } else if (anchor) {
    // Anchor in same file
    const content = readFileSync(sourceFile, 'utf-8')
    const anchors = extractAnchors(content)
    
    if (!anchors.has(anchor)) {
      return {
        file: sourceFile,
        line: link.line,
        link: link.url,
        target: `#${anchor}`,
        issue: 'missing-anchor'
      }
    }
  }
  
  return null
}

/**
 * Validate all links in a markdown file
 */
function validateFile(filePath: string): LinkIssue[] {
  const content = readFileSync(filePath, 'utf-8')
  const links = extractLinks(content)
  const issues: LinkIssue[] = []
  
  for (const link of links) {
    const issue = validateInternalLink(filePath, link)
    if (issue) {
      issues.push(issue)
    }
  }
  
  return issues
}

/**
 * Format issue for display
 */
function formatIssue(issue: LinkIssue): string {
  const relPath = relative(process.cwd(), issue.file)
  let message = `${relPath}:${issue.line} - `
  
  switch (issue.issue) {
    case 'missing-file':
      message += `❌ File not found: ${issue.target}`
      if (issue.suggestion) {
        message += `\n  💡 Did you mean: ${issue.suggestion}?`
      }
      break
    case 'missing-anchor':
      message += `⚓ Anchor not found: ${issue.target}`
      break
    case 'external-unreachable':
      message += `🌐 External link unreachable: ${issue.target}`
      break
  }
  
  return message
}

/**
 * Generate report markdown
 */
function _generateReport(issues: LinkIssue[]): string {
  const md: string[] = []
  
  md.push(`# Link Validation Report\n`)
  md.push(`> Generated: ${new Date().toISOString()}\n`)
  
  if (issues.length === 0) {
    md.push(`\n✅ **All links are valid!**\n`)
    return md.join('')
  }
  
  md.push(`\n⚠️ **Found ${issues.length} issue${issues.length > 1 ? 's' : ''}**\n`)
  
  // Group by file
  const byFile = new Map<string, LinkIssue[]>()
  for (const issue of issues) {
    const file = relative(process.cwd(), issue.file)
    if (!byFile.has(file)) {
      byFile.set(file, [])
    }
    byFile.get(file)!.push(issue)
  }
  
  for (const [file, fileIssues] of byFile) {
    md.push(`\n## \`${file}\`\n`)
    
    for (const issue of fileIssues) {
      md.push(`\n### Line ${issue.line}\n`)
      md.push(`- **Link:** \`${issue.link}\`\n`)
      md.push(`- **Target:** \`${issue.target}\`\n`)
      md.push(`- **Issue:** ${issue.issue.replace('-', ' ')}\n`)
      
      if (issue.suggestion) {
        md.push(`- **Suggestion:** \`${issue.suggestion}\`\n`)
      }
    }
  }
  
  return md.join('')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  // const shouldFix = args.includes('--fix') // Reserved for future fix functionality
  
  console.log('🔗 Validating markdown links...\n')
  
  // Find all markdown files
  const markdownFiles = await glob('docs/**/*.md', {
    ignore: ['**/node_modules/**']
  })
  
  console.log(`📄 Found ${markdownFiles.length} markdown files\n`)
  
  let totalLinks = 0
  const allIssues: LinkIssue[] = []
  
  for (const file of markdownFiles) {
    const issues = validateFile(file)
    const content = readFileSync(file, 'utf-8')
    const links = extractLinks(content)
    
    totalLinks += links.length
    
    if (issues.length > 0) {
      allIssues.push(...issues)
      console.log(`⚠️  ${relative(process.cwd(), file)}: ${issues.length} issue(s)`)
      for (const issue of issues) {
        console.log(`   ${formatIssue(issue)}`)
      }
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total links checked: ${totalLinks}`)
  console.log(`   Issues found: ${allIssues.length}`)
  
  if (allIssues.length > 0) {
    console.log(`\n❌ Link validation failed!`)
    
    // Group issues by type
    const byType = new Map<string, number>()
    for (const issue of allIssues) {
      byType.set(issue.issue, (byType.get(issue.issue) || 0) + 1)
    }
    
    console.log(`\n   Issue breakdown:`)
    for (const [type, count] of byType) {
      console.log(`   - ${type}: ${count}`)
    }
    
    process.exit(1)
  } else {
    console.log(`\n✅ All links are valid!`)
  }
}

main().catch(console.error)
