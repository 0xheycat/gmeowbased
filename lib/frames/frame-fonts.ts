/**
 * Frame Font Loading Utility
 * Loads custom fonts for frame image generation
 * Used across all modular frame routes
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
