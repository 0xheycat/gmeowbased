#!/usr/bin/env tsx
/**
 * API Endpoint Documentation Generator
 * 
 * Scans Next.js API routes and generates markdown documentation
 * automatically from route handlers.
 * 
 * Usage:
 *   tsx scripts/docs/generate-api-docs.ts [--output docs/api/generated]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, relative } from 'path'
import { glob } from 'glob'

interface APIRoute {
  path: string
  filePath: string
  methods: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    description?: string
    params?: Array<{ name: string; type: string; required: boolean; description?: string }>
    body?: { type: string; schema?: string }
    returns?: { type: string; description?: string }
    examples?: string[]
  }>
}

/**
 * Extract API route information from file
 */
function parseAPIRoute(filePath: string): APIRoute | null {
  const content = readFileSync(filePath, 'utf-8')
  
  // Determine route path from file path
  // app/api/frame/route.ts -> /api/frame
  // app/api/quest/[id]/route.ts -> /api/quest/[id]
  const routePath = filePath
    .replace(/^app/, '')
    .replace(/\/route\.(ts|tsx|js|jsx)$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1') // Convert Next.js params to REST style
  
  const methods: APIRoute['methods'] = []
  
  // Find exported HTTP method handlers
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
  
  for (const method of httpMethods) {
    const methodRegex = new RegExp(`export\\s+async\\s+function\\s+${method}`, 'g')
    
    if (methodRegex.test(content)) {
      // Try to extract JSDoc comment before the function
      const commentRegex = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*export\\s+async\\s+function\\s+${method}`, 'g')
      const commentMatch = commentRegex.exec(content)
      
      let description: string | undefined
      const params: typeof methods[0]['params'] = []
      const examples: string[] = []
      
      if (commentMatch) {
        const commentText = commentMatch[1]
        const lines = commentText.split('\n').map(l => l.trim().replace(/^\\*\\s?/, ''))
        
        const descLines: string[] = []
        
        for (const line of lines) {
          if (line.startsWith('@param')) {
            const paramMatch = line.match(/@param\\s+(?:\\{([^}]+)\\}\\s+)?(\\w+)\\s+(.*)/)
            if (paramMatch) {
              params.push({
                name: paramMatch[2],
                type: paramMatch[1] || 'any',
                required: !line.includes('optional'),
                description: paramMatch[3]
              })
            }
          } else if (line.startsWith('@example')) {
            // Capture example in next line
          } else if (!line.startsWith('@')) {
            descLines.push(line)
          }
        }
        
        description = descLines.join(' ').trim()
      }
      
      methods.push({
        method,
        description,
        params: params.length > 0 ? params : undefined,
        examples: examples.length > 0 ? examples : undefined
      })
    }
  }
  
  if (methods.length === 0) {
    return null
  }
  
  return {
    path: routePath,
    filePath: relative(process.cwd(), filePath),
    methods
  }
}

/**
 * Generate markdown documentation for API routes
 */
function generateMarkdown(routes: APIRoute[]): string {
  const md: string[] = []
  
  md.push(`# API Endpoints Reference\n`)
  md.push(`> Auto-generated from Next.js API routes\n`)
  md.push(`> Last updated: ${new Date().toISOString()}\n`)
  
  // Sort routes by path
  routes.sort((a, b) => a.path.localeCompare(b.path))
  
  // Generate TOC
  md.push(`\n## Table of Contents\n`)
  for (const route of routes) {
    const anchor = route.path.replace(/[/:]/g, '')
    md.push(`- [\`${route.path}\`](#${anchor})\n`)
  }
  
  md.push(`\n---\n`)
  
  // Generate endpoint documentation
  for (const route of routes) {
    md.push(`\n## \`${route.path}\`\n`)
    md.push(`[Source: \`${route.filePath}\`](../../${route.filePath})\n`)
    
    for (const method of route.methods) {
      md.push(`\n### ${method.method}\n`)
      
      if (method.description) {
        md.push(`${method.description}\n`)
      }
      
      // Parameters
      if (method.params && method.params.length > 0) {
        md.push(`\n**Parameters:**\n`)
        md.push(`| Name | Type | Required | Description |\n`)
        md.push(`|------|------|----------|-------------|\n`)
        
        for (const param of method.params) {
          md.push(`| \`${param.name}\` | \`${param.type}\` | ${param.required ? '✅' : '❌'} | ${param.description || ''} |\n`)
        }
      }
      
      // Request body
      if (method.body) {
        md.push(`\n**Request Body:** \`${method.body.type}\`\n`)
        if (method.body.schema) {
          md.push(`\`\`\`typescript\n${method.body.schema}\n\`\`\`\n`)
        }
      }
      
      // Response
      if (method.returns) {
        md.push(`\n**Response:** \`${method.returns.type}\`\n`)
        if (method.returns.description) {
          md.push(`${method.returns.description}\n`)
        }
      }
      
      // Examples
      if (method.examples && method.examples.length > 0) {
        md.push(`\n**Example:**\n`)
        for (const example of method.examples) {
          md.push(`\`\`\`bash\n${example}\n\`\`\`\n`)
        }
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
  
  console.log('🔍 Scanning API routes...\n')
  
  // Find all route files in app/api/
  const routeFiles = await glob('app/api/**/route.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**']
  })
  
  console.log(`📄 Found ${routeFiles.length} API route files\n`)
  
  const routes: APIRoute[] = []
  
  for (const file of routeFiles) {
    const route = parseAPIRoute(file)
    if (route) {
      routes.push(route)
      console.log(`✅ ${route.path} - ${route.methods.map(m => m.method).join(', ')}`)
    }
  }
  
  console.log(`\n✅ Parsed ${routes.length} API endpoints\n`)
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }
  
  // Generate markdown
  const markdown = generateMarkdown(routes)
  const outputFile = join(outputDir, 'endpoints.md')
  writeFileSync(outputFile, markdown)
  
  console.log(`📝 Generated ${outputFile}`)
  console.log(`\n✅ API documentation generation complete!`)
}

main().catch(console.error)
