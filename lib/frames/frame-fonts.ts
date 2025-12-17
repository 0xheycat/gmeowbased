/**
 * @file lib/frames/frame-fonts.ts
 * @description Font loading utility for frame image generation
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * 
 * FEATURES:
 *   - Custom font loading from filesystem
 *   - Gmeow font support
 *   - ArrayBuffer conversion for @vercel/og
 *   - Error handling with tracking
 *   - Font data type definitions
 *   - Multiple weight support (400, 700)
 * 
 * Frame Font Loading Utility
 * Loads custom fonts for frame image generation
 * Used across all modular frame routes
 * 
 * REFERENCE DOCUMENTATION:
 *   - Fonts directory: app/fonts/
 *   - Vercel OG: https://vercel.com/docs/functions/og-image-generation
 *   - Error tracking: lib/notifications/error-tracking.ts
 * 
 * REQUIREMENTS:
 *   - Fonts must exist in app/fonts/ directory
 *   - Font files must be .ttf format
 *   - Filesystem access required (Node.js)
 * 
 * TODO:
 *   - [ ] Add font fallback chain
 *   - [ ] Add font validation
 *   - [ ] Add font caching
 *   - [ ] Support multiple font formats
 *   - [ ] Add font loading performance metrics
 * 
 * CRITICAL:
 *   - Font files must be readable
 *   - Font paths must be correct
 *   - ArrayBuffer conversion must succeed
 *   - Error handling required (graceful degradation)
 * 
 * SUGGESTIONS:
 *   - Cache loaded fonts in memory
 *   - Add font preloading on startup
 *   - Support font CDN fallbacks
 *   - Add font format detection
 * 
 * AVOID:
 *   - Loading fonts synchronously
 *   - Missing error handling
 *   - Hardcoding font paths
 *   - Using fonts without license
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { trackError } from '@/lib/notifications/error-tracking'

export interface FontData {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

/**
 * Load fonts for ImageResponse
 * Returns array of font data for @vercel/og
 */
export async function loadFrameFonts(): Promise<FontData[]> {
  try {
    const gmeowPath = join(process.cwd(), 'app', 'fonts', 'gmeow2.ttf')
    const gmeowBuffer = await readFile(gmeowPath)
    
    return [
      {
        name: 'Gmeow',
        data: gmeowBuffer.buffer as ArrayBuffer,
        weight: 400,
        style: 'normal',
      },
    ]
  } catch (err) {
    trackError('frame_fonts_load_error', err, { function: 'loadFonts' })
    return []
  }
}

/**
 * Load background image as base64 data URL
 * Used for consistent background across all frames
 */
export async function loadBackgroundImage(): Promise<string | null> {
  try {
    const bgPath = join(process.cwd(), 'public', 'og-image.png')
    const buffer = await readFile(bgPath)
    const base64 = buffer.toString('base64')
    return `data:image/png;base64,${base64}`
  } catch (err) {
    trackError('frame_background_load_error', err, { function: 'loadBackgroundImage', file: 'og-image.png' })
    return null
  }
}
