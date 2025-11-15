#!/usr/bin/env tsx
/**
 * JSDoc/TSDoc Extraction Script
 * 
 * Scans TypeScript/JavaScript files for JSDoc comments and generates
 * markdown documentation automatically.
 * 
 * Usage:
 *   tsx scripts/docs/extract-jsdoc.ts [--output docs/api/generated]
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, relative, basename, dirname } from 'path'
import { glob } from 'glob'

interface DocComment {
  description: string
  params: Array<{ name: string; type: string; description: string }>
  returns?: { type: string; description: string }
  examples: string[]
  deprecated?: string
  since?: string
  tags: Record<string, string>
}

interface FunctionDoc {
  name: string
  filePath: string
  lineNumber: number
  signature: string
  comment: DocComment
  isExported: boolean
}

/**
 * Parse JSDoc comment block
 */
function parseJSDocComment(commentText: string): DocComment {
  const lines = commentText.split('\n').map(line => line.trim().replace(/^\*\s?/, ''))
  
  const doc: DocComment = {
    description: '',
    params: [],
    examples: [],
    tags: {}
  }
  
  let currentSection: 'description' | 'example' | null = 'description'
  let descriptionLines: string[] = []
  let exampleLines: string[] = []
  
  for (const line of lines) {
    if (line.startsWith('@param')) {
      currentSection = null
      const match = line.match(/@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*-?\s*(.*)/)
      if (match) {
        doc.params.push({
          type: match[1] || 'any',
          name: match[2],
          description: match[3]
        })
      }
    } else if (line.startsWith('@returns') || line.startsWith('@return')) {
      currentSection = null
      const match = line.match(/@returns?\s+(?:\{([^}]+)\}\s+)?(.*)/)
      if (match) {
        doc.returns = {
          type: match[1] || 'any',
          description: match[2]
        }
      }
    } else if (line.startsWith('@example')) {
      currentSection = 'example'
      exampleLines = []
    } else if (line.startsWith('@deprecated')) {
      currentSection = null
      doc.deprecated = line.replace('@deprecated', '').trim()
    } else if (line.startsWith('@since')) {
      currentSection = null
      doc.since = line.replace('@since', '').trim()
    } else if (line.startsWith('@')) {
      currentSection = null
      const match = line.match(/@(\w+)\s+(.*)/)
      if (match) {
        doc.tags[match[1]] = match[2]
      }
    } else if (currentSection === 'description' && line) {
      descriptionLines.push(line)
    } else if (currentSection === 'example' && line) {
      exampleLines.push(line)
    } else if (currentSection === 'example' && !line && exampleLines.length > 0) {
      doc.examples.push(exampleLines.join('\n'))
      exampleLines = []
    }
  }
  
  if (exampleLines.length > 0) {
    doc.examples.push(exampleLines.join('\n'))
  }
  
  doc.description = descriptionLines.join('\n').trim()
  
  return doc
}

/**
 * Extract function signature from code
 */
function extractFunctionSignature(code: string, startIndex: number): string {
  let braceCount = 0
  let parenCount = 0
  let signature = ''
  let inSignature = false
  
  for (let i = startIndex; i < code.length; i++) {
    const char = code[i]
    
    if (char === '(') {
      parenCount++
      inSignature = true
    } else if (char === ')') {
      parenCount--
    } else if (char === '{' && parenCount === 0) {
      braceCount++
      if (braceCount === 1) {
        signature += char
        break
      }
    }
    
    if (inSignature || char.match(/[a-zA-Z]/)) {
      signature += char
    }
    
    if (parenCount === 0 && inSignature && (char === '=>' || braceCount > 0)) {
      break
    }
  }
  
  return signature.trim().replace(/\{$/, '').trim()
}

/**
 * Scan file for documented functions
 */
function scanFile(filePath: string): FunctionDoc[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const docs: FunctionDoc[] = []
  
  // Find JSDoc comment blocks
  const commentRegex = /\/\*\*([\s\S]*?)\*\//g
  let match: RegExpExecArray | null
  
  while ((match = commentRegex.exec(content)) !== null) {
    const commentText = match[1]
    const commentEnd = match.index + match[0].length
    
    // Find the next function/const/export after the comment
    const afterComment = content.slice(commentEnd)
    const functionMatch = afterComment.match(/^\s*(export\s+)?(async\s+)?(function|const)\s+(\w+)/)
    
    if (functionMatch) {
      const isExported = !!functionMatch[1]
      const functionName = functionMatch[4]
      const lineNumber = content.slice(0, commentEnd).split('\n').length
      
      const signature = extractFunctionSignature(content, commentEnd)
      const parsedComment = parseJSDocComment(commentText)
      
      docs.push({
        name: functionName,
        filePath: relative(process.cwd(), filePath),
        lineNumber,
        signature,
        comment: parsedComment,
        isExported
      })
    }
  }
  
  return docs
}

/**
 * Generate markdown documentation from function docs
 */
function generateMarkdown(docs: FunctionDoc[], category: string): string {
  const md: string[] = []
  
  md.push(`# ${category} API Reference\n`)
  md.push(`> Auto-generated from JSDoc comments\n`)
  md.push(`> Last updated: ${new Date().toISOString()}\n`)
  
  // Group by file
  const byFile = new Map<string, FunctionDoc[]>()
  for (const doc of docs) {
    const file = doc.filePath
    if (!byFile.has(file)) {
      byFile.set(file, [])
    }
    byFile.get(file)!.push(doc)
  }
  
  // Generate TOC
  md.push(`## Table of Contents\n`)
  for (const [file, fileDocs] of byFile) {
    md.push(`### [\`${file}\`](#${file.replace(/[\/\.]/g, '')})\n`)
    for (const doc of fileDocs) {
      if (doc.isExported) {
        md.push(`- [\`${doc.name}\`](#${doc.name.toLowerCase()})\n`)
      }
    }
  }
  
  md.push(`\n---\n`)
  
  // Generate documentation
  for (const [file, fileDocs] of byFile) {
    md.push(`\n## \`${file}\`\n`)
    md.push(`[View source](../../${file})\n`)
    
    for (const doc of fileDocs) {
      if (!doc.isExported) continue
      
      md.push(`\n### \`${doc.name}\`\n`)
      
      if (doc.comment.deprecated) {
        md.push(`> ⚠️ **Deprecated**: ${doc.comment.deprecated}\n`)
      }
      
      if (doc.comment.description) {
        md.push(`${doc.comment.description}\n`)
      }
      
      // Signature
      md.push(`\n**Signature:**\n`)
      md.push(`\`\`\`typescript\n${doc.signature}\n\`\`\`\n`)
      
      // Parameters
      if (doc.comment.params.length > 0) {
        md.push(`\n**Parameters:**\n`)
        for (const param of doc.comment.params) {
          md.push(`- \`${param.name}\` (\`${param.type}\`)${param.description ? `: ${param.description}` : ''}\n`)
        }
      }
      
      // Returns
      if (doc.comment.returns) {
        md.push(`\n**Returns:** \`${doc.comment.returns.type}\``)
        if (doc.comment.returns.description) {
          md.push(` - ${doc.comment.returns.description}`)
        }
        md.push(`\n`)
      }
      
      // Examples
      if (doc.comment.examples.length > 0) {
        md.push(`\n**Examples:**\n`)
        for (const example of doc.comment.examples) {
          md.push(`\`\`\`typescript\n${example}\n\`\`\`\n`)
        }
      }
      
      // Additional tags
      if (doc.comment.since) {
        md.push(`\n*Since: ${doc.comment.since}*\n`)
      }
      
      md.push(`\n---\n`)
    }
  }
  
  return md.join('')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const outputDir = args.find(arg => arg.startsWith('--output'))?.split('=')[1] || 'docs/api/generated'
  
  console.log('🔍 Scanning for JSDoc comments...\n')
  
  // Scan lib/ directory
  const libFiles = await glob('lib/**/*.{ts,tsx,js,jsx}', { 
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'] 
  })
  
  const libDocs = libFiles.flatMap(file => scanFile(file))
  
  // Scan components/ directory
  const componentFiles = await glob('components/**/*.{ts,tsx}', {
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  })
  
  const componentDocs = componentFiles.flatMap(file => scanFile(file))
  
  console.log(`✅ Found ${libDocs.length} functions in lib/`)
  console.log(`✅ Found ${componentDocs.length} functions in components/\n`)
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }
  
  // Generate markdown files
  if (libDocs.length > 0) {
    const libMd = generateMarkdown(libDocs, 'Library Functions')
    writeFileSync(join(outputDir, 'lib-reference.md'), libMd)
    console.log(`📝 Generated ${outputDir}/lib-reference.md`)
  }
  
  if (componentDocs.length > 0) {
    const componentMd = generateMarkdown(componentDocs, 'Component APIs')
    writeFileSync(join(outputDir, 'component-reference.md'), componentMd)
    console.log(`📝 Generated ${outputDir}/component-reference.md`)
  }
  
  // Generate index
  const indexMd = [
    `# Generated API Documentation\n`,
    `> Auto-generated from JSDoc/TSDoc comments in the codebase\n`,
    `> Last updated: ${new Date().toISOString()}\n`,
    `## Available References\n`,
    libDocs.length > 0 ? `- [Library Functions](./lib-reference.md) - ${libDocs.length} documented functions\n` : '',
    componentDocs.length > 0 ? `- [Component APIs](./component-reference.md) - ${componentDocs.length} documented components\n` : '',
    `\n## How to Update\n`,
    `Run the documentation extraction script:\n`,
    `\`\`\`bash\n`,
    `pnpm run docs:extract\n`,
    `\`\`\`\n`,
    `\n---\n`,
    `*This documentation is automatically generated. Do not edit manually.*\n`
  ].filter(Boolean).join('')
  
  writeFileSync(join(outputDir, 'README.md'), indexMd)
  console.log(`📝 Generated ${outputDir}/README.md\n`)
  
  console.log('✅ Documentation extraction complete!')
}

main().catch(console.error)
