/**
 * ⚡ AUTO-FIX ENGINE
 * 
 * Automated fix implementations for deterministic UI/UX issues.
 * 
 * Each fix is a pure function that:
 * 1. Takes file content as input
 * 2. Returns modified content as output
 * 3. Is idempotent (can be run multiple times safely)
 * 4. Preserves formatting and code structure
 * 
 * Fix Registry:
 * - Maps task IDs to fix functions
 * - Each function handles one specific type of fix
 * - Uses regex for precise code transformations
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export type FixFunction = (content: string, filePath: string) => string

export interface FixResult {
  success: boolean
  filesModified: string[]
  changes: Array<{
    file: string
    linesBefore: number
    linesAfter: number
    changeCount: number
  }>
  errors: string[]
}

/**
 * CATEGORY 2: RESPONSIVENESS - Breakpoint Migration
 */

export function fixBreakpoint375to640(content: string): string {
  // Replace 375px with Tailwind sm (640px)
  // Patterns: max-w-[375px], min-w-[375px], w-[375px], @media (max-width: 375px)
  
  let result = content
  
  // 1. Tailwind arbitrary values
  result = result.replace(/max-w-\[375px\]/g, 'max-w-sm')
  result = result.replace(/min-w-\[375px\]/g, 'min-w-[640px]')
  result = result.replace(/w-\[375px\]/g, 'w-[640px]')
  
  // 2. CSS media queries
  result = result.replace(
    /@media\s*\(max-width:\s*375px\)/g,
    '@media (max-width: 640px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*375px\)/g,
    '@media (min-width: 640px)'
  )
  
  // 3. Inline styles (less common but possible)
  result = result.replace(/maxWidth:\s*['"]375px['"]/g, "maxWidth: '640px'")
  result = result.replace(/minWidth:\s*['"]375px['"]/g, "minWidth: '640px'")
  result = result.replace(/width:\s*['"]375px['"]/g, "width: '640px'")
  
  return result
}

export function fixBreakpoint600to768(content: string): string {
  // Replace 600px with Tailwind md (768px)
  
  let result = content
  
  // Tailwind arbitrary values
  result = result.replace(/max-w-\[600px\]/g, 'max-w-md')
  result = result.replace(/min-w-\[600px\]/g, 'min-w-[768px]')
  result = result.replace(/w-\[600px\]/g, 'w-[768px]')
  
  // CSS media queries
  result = result.replace(
    /@media\s*\(max-width:\s*600px\)/g,
    '@media (max-width: 768px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*600px\)/g,
    '@media (min-width: 768px)'
  )
  
  // Inline styles
  result = result.replace(/maxWidth:\s*['"]600px['"]/g, "maxWidth: '768px'")
  result = result.replace(/minWidth:\s*['"]600px['"]/g, "minWidth: '768px'")
  result = result.replace(/width:\s*['"]600px['"]/g, "width: '768px'")
  
  // CSS properties (in template strings or CSS files)
  result = result.replace(/max-width:\s*600px/g, 'max-width: 768px')
  result = result.replace(/min-width:\s*600px/g, 'min-width: 768px')
  
  return result
}

export function fixBreakpoint680to768(content: string): string {
  // Replace 680px with Tailwind md (768px)
  
  let result = content
  
  result = result.replace(/max-w-\[680px\]/g, 'max-w-md')
  result = result.replace(/min-w-\[680px\]/g, 'min-w-[768px]')
  result = result.replace(/w-\[680px\]/g, 'w-[768px]')
  
  result = result.replace(
    /@media\s*\(max-width:\s*680px\)/g,
    '@media (max-width: 768px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*680px\)/g,
    '@media (min-width: 768px)'
  )
  
  result = result.replace(/maxWidth:\s*['"]680px['"]/g, "maxWidth: '768px'")
  result = result.replace(/minWidth:\s*['"]680px['"]/g, "minWidth: '768px'")
  result = result.replace(/width:\s*['"]680px['"]/g, "width: '768px'")
  
  return result
}

export function fixBreakpoint900to1024(content: string): string {
  // Replace 900px with Tailwind lg (1024px)
  
  let result = content
  
  result = result.replace(/max-w-\[900px\]/g, 'max-w-lg')
  result = result.replace(/min-w-\[900px\]/g, 'min-w-[1024px]')
  result = result.replace(/w-\[900px\]/g, 'w-[1024px]')
  
  result = result.replace(
    /@media\s*\(max-width:\s*900px\)/g,
    '@media (max-width: 1024px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*900px\)/g,
    '@media (min-width: 1024px)'
  )
  
  result = result.replace(/maxWidth:\s*['"]900px['"]/g, "maxWidth: '1024px'")
  result = result.replace(/minWidth:\s*['"]900px['"]/g, "minWidth: '1024px'")
  result = result.replace(/width:\s*['"]900px['"]/g, "width: '1024px'")
  
  return result
}

export function fixBreakpoint960to1024(content: string): string {
  // Replace 960px with Tailwind lg (1024px)
  
  let result = content
  
  result = result.replace(/max-w-\[960px\]/g, 'max-w-lg')
  result = result.replace(/min-w-\[960px\]/g, 'min-w-[1024px]')
  result = result.replace(/w-\[960px\]/g, 'w-[1024px]')
  
  result = result.replace(
    /@media\s*\(max-width:\s*960px\)/g,
    '@media (max-width: 1024px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*960px\)/g,
    '@media (min-width: 1024px)'
  )
  
  result = result.replace(/maxWidth:\s*['"]960px['"]/g, "maxWidth: '1024px'")
  result = result.replace(/minWidth:\s*['"]960px['"]/g, "minWidth: '1024px'")
  result = result.replace(/width:\s*['"]960px['"]/g, "width: '1024px'")
  
  return result
}

export function fixBreakpoint1100to1280(content: string): string {
  // Replace 1100px with Tailwind xl (1280px)
  
  let result = content
  
  result = result.replace(/max-w-\[1100px\]/g, 'max-w-xl')
  result = result.replace(/min-w-\[1100px\]/g, 'min-w-[1280px]')
  result = result.replace(/w-\[1100px\]/g, 'w-[1280px]')
  
  result = result.replace(
    /@media\s*\(max-width:\s*1100px\)/g,
    '@media (max-width: 1280px)'
  )
  result = result.replace(
    /@media\s*\(min-width:\s*1100px\)/g,
    '@media (min-width: 1280px)'
  )
  
  result = result.replace(/maxWidth:\s*['"]1100px['"]/g, "maxWidth: '1280px'")
  result = result.replace(/minWidth:\s*['"]1100px['"]/g, "minWidth: '1280px'")
  result = result.replace(/width:\s*['"]1100px['"]/g, "width: '1280px'")
  
  return result
}

/**
 * CATEGORY 4: TYPOGRAPHY - Font Size Migration
 */

export function fixFontSize11to14(content: string): string {
  // Replace 11px with 14px (text-sm)
  
  let result = content
  
  // Tailwind classes
  result = result.replace(/text-\[11px\]/g, 'text-sm')
  
  // CSS font-size
  result = result.replace(/font-size:\s*11px/g, 'font-size: 14px')
  
  // Inline styles
  result = result.replace(/fontSize:\s*['"]11px['"]/g, "fontSize: '14px'")
  result = result.replace(/fontSize:\s*11/g, 'fontSize: 14')
  
  return result
}

export function fixFontSize12to14(content: string): string {
  // Replace 12px with 14px (text-sm)
  
  let result = content
  
  result = result.replace(/text-\[12px\]/g, 'text-sm')
  result = result.replace(/font-size:\s*12px/g, 'font-size: 14px')
  result = result.replace(/fontSize:\s*['"]12px['"]/g, "fontSize: '14px'")
  result = result.replace(/fontSize:\s*12/g, 'fontSize: 14')
  
  return result
}

/**
 * CATEGORY 5: ICONOGRAPHY - Icon Size Standardization
 */

export function fixIconSize32to24(content: string): string {
  // Replace 32px icons with 24px
  
  let result = content
  
  // Tailwind size classes
  result = result.replace(/size-\[32px\]/g, 'size-6') // size-6 = 24px
  result = result.replace(/w-\[32px\]\s+h-\[32px\]/g, 'w-6 h-6')
  result = result.replace(/h-\[32px\]\s+w-\[32px\]/g, 'h-6 w-6')
  
  // Individual width/height
  result = result.replace(/w-\[32px\]/g, 'w-6')
  result = result.replace(/h-\[32px\]/g, 'h-6')
  
  // CSS
  result = result.replace(/width:\s*32px/g, 'width: 24px')
  result = result.replace(/height:\s*32px/g, 'height: 24px')
  
  // Inline styles
  result = result.replace(/width:\s*['"]32px['"]/g, "width: '24px'")
  result = result.replace(/height:\s*['"]32px['"]/g, "height: '24px'")
  
  return result
}

export function fixIconSize40to24(content: string): string {
  // Replace 40px icons with 24px
  
  let result = content
  
  result = result.replace(/size-\[40px\]/g, 'size-6')
  result = result.replace(/w-\[40px\]\s+h-\[40px\]/g, 'w-6 h-6')
  result = result.replace(/h-\[40px\]\s+w-\[40px\]/g, 'h-6 w-6')
  result = result.replace(/w-\[40px\]/g, 'w-6')
  result = result.replace(/h-\[40px\]/g, 'h-6')
  result = result.replace(/width:\s*40px/g, 'width: 24px')
  result = result.replace(/height:\s*40px/g, 'height: 24px')
  result = result.replace(/width:\s*['"]40px['"]/g, "width: '24px'")
  result = result.replace(/height:\s*['"]40px['"]/g, "height: '24px'")
  
  return result
}

export function fixIconSize48to24(content: string): string {
  // Replace 48px icons with 24px (and min-height for button heights)
  
  let result = content
  
  result = result.replace(/size-\[48px\]/g, 'size-6')
  result = result.replace(/w-\[48px\]\s+h-\[48px\]/g, 'w-6 h-6')
  result = result.replace(/h-\[48px\]\s+w-\[48px\]/g, 'h-6 w-6')
  result = result.replace(/w-\[48px\]/g, 'w-6')
  result = result.replace(/h-\[48px\]/g, 'h-6')
  result = result.replace(/width:\s*48px/g, 'width: 24px')
  result = result.replace(/height:\s*48px/g, 'height: 24px')
  result = result.replace(/width:\s*['"]48px['"]/g, "width: '24px'")
  result = result.replace(/height:\s*['"]48px['"]/g, "height: '24px'")
  result = result.replace(/minHeight:\s*['"]48px['"]/g, "minHeight: '3rem'") // 48px = 3rem (12 * 4px)
  
  return result
}

/**
 * CATEGORY 6: SPACING & SIZING - Gap/Padding/Margin Standardization
 */

export function fixGap1toGap2(content: string): string {
  // Replace gap-1 (4px) with gap-2 (8px)
  
  let result = content
  
  // Tailwind gap classes
  result = result.replace(/\bgap-1\b/g, 'gap-2')
  result = result.replace(/\bgap-x-1\b/g, 'gap-x-2')
  result = result.replace(/\bgap-y-1\b/g, 'gap-y-2')
  
  return result
}

export function fixGap15toGap2(content: string): string {
  // Replace gap-1.5 (6px) with gap-2 (8px)
  
  let result = content
  
  result = result.replace(/\bgap-1\.5\b/g, 'gap-2')
  result = result.replace(/\bgap-x-1\.5\b/g, 'gap-x-2')
  result = result.replace(/\bgap-y-1\.5\b/g, 'gap-y-2')
  
  return result
}

export function fixGap25toGap3(content: string): string {
  // Replace gap-2.5 (10px) with gap-3 (12px)
  
  let result = content
  
  result = result.replace(/\bgap-2\.5\b/g, 'gap-3')
  result = result.replace(/\bgap-x-2\.5\b/g, 'gap-x-3')
  result = result.replace(/\bgap-y-2\.5\b/g, 'gap-y-3')
  
  return result
}

/**
 * CATEGORY 8: MODALS/DIALOGS - Z-Index Standardization
 */

export function fixZIndex99toZModal(content: string): string {
  // Replace z-[99] with z-40 (modal layer)
  
  let result = content
  
  result = result.replace(/z-\[99\]/g, 'z-40')
  result = result.replace(/zIndex:\s*99/g, 'zIndex: 40')
  result = result.replace(/z-index:\s*99/g, 'z-index: 40')
  
  return result
}

export function fixZIndex100toZModal(content: string): string {
  // Replace z-[100] with z-40 (modal layer)
  
  let result = content
  
  result = result.replace(/z-\[100\]/g, 'z-40')
  result = result.replace(/zIndex:\s*100/g, 'zIndex: 40')
  result = result.replace(/z-index:\s*100/g, 'z-index: 40')
  
  return result
}

export function fixZIndex9999toZToast(content: string): string {
  // Replace z-[9999] with z-50 (toast/notification layer)
  
  let result = content
  
  result = result.replace(/z-\[9999\]/g, 'z-50')
  result = result.replace(/zIndex:\s*9999/g, 'zIndex: 50')
  result = result.replace(/z-index:\s*9999/g, 'z-index: 50')
  
  return result
}

/**
 * CATEGORY 12: VISUAL CONSISTENCY - Color Token Migration
 */

export function fixColorTokenMigration(content: string): string {
  // Replace hardcoded colors with design tokens
  // Handles both Tailwind classes AND inline styles
  
  let result = content
  
  // Badge tier colors mapping (inline styles in TIER_CONFIG)
  const tierColorMap: Record<string, string> = {
    '#9C27FF': '#a855f7', // mythic -> purple-500
    '#FFD966': '#fbbf24', // legendary -> amber-400
    '#61DFFF': '#06b6d4', // epic -> cyan-500
    '#A18CFF': '#8b5cf6', // rare -> violet-500
    '#D3D7DC': '#9ca3af', // common -> gray-400
  }
  
  // Common colors
  const colorMap: Record<string, string> = {
    '#10b981': '#10b981', // emerald-500
    '#06b6d4': '#06b6d4', // cyan-500
    '#8b5cf6': '#8b5cf6', // purple-500
    '#f59e0b': '#f59e0b', // amber-500
    '#f43f5e': '#f43f5e', // rose-500
    '#0a0a0a': '#09090b', // zinc-950
    ...tierColorMap,
  }
  
  Object.entries(colorMap).forEach(([oldHex, newHex]) => {
    // Inline styles: color: '#9C27FF' -> color: '#a855f7'
    result = result.replace(
      new RegExp(`(color|backgroundColor):\\s*['"]${oldHex.replace('#', '#')}['"]`, 'gi'),
      `$1: '${newHex}'`
    )
    
    // Tailwind classes
    result = result.replace(
      new RegExp(`text-\\[${oldHex}\\]`, 'gi'),
      `text-[${newHex}]`
    )
    result = result.replace(
      new RegExp(`bg-\\[${oldHex}\\]`, 'gi'),
      `bg-[${newHex}]`
    )
    result = result.replace(
      new RegExp(`border-\\[${oldHex}\\]`, 'gi'),
      `border-[${newHex}]`
    )
  })
  
  return result
}

/**
 * FIX REGISTRY
 * Maps task fix identifiers to fix functions
 */
export const FIX_REGISTRY: Record<string, FixFunction> = {
  // Category 2: Responsiveness
  'breakpoint-migration-375-to-640': fixBreakpoint375to640,
  'breakpoint-migration-600-to-768': fixBreakpoint600to768,
  'breakpoint-migration-680-to-768': fixBreakpoint680to768,
  'breakpoint-migration-900-to-1024': fixBreakpoint900to1024,
  'breakpoint-migration-960-to-1024': fixBreakpoint960to1024,
  'breakpoint-migration-1100-to-1280': fixBreakpoint1100to1280,

  // Category 4: Typography
  'font-size-minimum-11-to-14': fixFontSize11to14,
  'font-size-minimum-12-to-14': fixFontSize12to14,

  // Category 5: Iconography
  'icon-size-32-to-24': fixIconSize32to24,
  'icon-size-40-to-24': fixIconSize40to24,
  'icon-size-48-to-24': fixIconSize48to24,

  // Category 6: Spacing & Sizing
  'spacing-gap-1-to-gap-2': fixGap1toGap2,
  'spacing-gap-1-5-to-gap-2': fixGap15toGap2,
  'spacing-gap-2-5-to-gap-3': fixGap25toGap3,

  // Category 8: Modals/Dialogs
  'z-index-99-to-z-modal': fixZIndex99toZModal,
  'z-index-100-to-z-modal': fixZIndex100toZModal,
  'z-index-9999-to-z-toast': fixZIndex9999toZToast,

  // Category 12: Visual Consistency
  'color-token-migration': fixColorTokenMigration,
}

/**
 * Apply a fix to multiple files
 */
export async function applyFix(
  fixId: string,
  files: string[]
): Promise<FixResult> {
  const fixFn = FIX_REGISTRY[fixId]

  if (!fixFn) {
    return {
      success: false,
      filesModified: [],
      changes: [],
      errors: [`Fix not found: ${fixId}`],
    }
  }

  const filesModified: string[] = []
  const changes: FixResult['changes'] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      // Read file
      const fullPath = path.join(process.cwd(), file)
      const originalContent = await fs.readFile(fullPath, 'utf-8')
      const originalLines = originalContent.split('\n').length

      // Apply fix
      const modifiedContent = fixFn(originalContent, file)
      const modifiedLines = modifiedContent.split('\n').length

      // Count changes
      const changeCount = originalContent !== modifiedContent ? 1 : 0

      if (changeCount > 0) {
        // Write file
        await fs.writeFile(fullPath, modifiedContent, 'utf-8')

        filesModified.push(file)
        changes.push({
          file,
          linesBefore: originalLines,
          linesAfter: modifiedLines,
          changeCount,
        })
      }
    } catch (error) {
      errors.push(
        `Error processing ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return {
    success: errors.length === 0, // Success if no errors, even if no files modified (idempotent)
    filesModified,
    changes,
    errors,
  }
}

/**
 * Get list of all available fixes
 */
export function getAvailableFixes(): string[] {
  return Object.keys(FIX_REGISTRY)
}

/**
 * Check if a fix exists
 */
export function hasFixFor(fixId: string): boolean {
  return fixId in FIX_REGISTRY
}
