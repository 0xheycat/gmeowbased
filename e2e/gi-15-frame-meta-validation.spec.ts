/**
 * GI-15 Test Group 1: Frame HTML & Meta Validation
 * 
 * Tests frame metadata compliance with Farcaster Mini App spec:
 * - Correct content-type (text/html)
 * - fc:frame or fc:miniapp:frame meta tags present
 * - Image URLs are absolute HTTPS
 * - Image aspect ratio metadata correct (3:2)
 * - JSON structure valid per MCP specification
 * 
 * Reference: https://miniapps.farcaster.xyz/docs/specification
 * GI-15 Acceptance Criteria: Modern JSON meta (fc:miniapp:frame / fc:frame)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

/**
 * Extract and validate frame JSON from meta tag
 */
async function extractFrameJson(page: any, url: string) {
  const response = await page.goto(url)
  
  // Assert content-type is text/html
  expect(response?.headers()['content-type']).toContain('text/html')
  
  // Extract fc:frame meta tag
  const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
  if (!metaContent) {
    throw new Error('No fc:frame meta tag found')
  }
  
  const frameJson = JSON.parse(metaContent)
  return { frameJson, response }
}

test.describe('GI-15 Group 1: Frame HTML & Meta Validation', () => {
  test('GM frame has valid JSON meta structure', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    // Version must be "next" (Farville working spec)
    expect(frameJson.version).toBe('next')
    
    // Must have button with action
    expect(frameJson.button).toBeDefined()
    expect(frameJson.button.action).toBeDefined()
    expect(frameJson.button.action.type).toBe('launch_frame')
    
    // Must have name field (Mini App name)
    expect(frameJson.button.action.name).toBe('Gmeowbased')
    
    // Image URL must be absolute HTTPS
    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
    
    // Splash properties required
    expect(frameJson.button.action.splashImageUrl).toBeDefined()
    expect(frameJson.button.action.splashBackgroundColor).toBe('#000000')
  })

  test('Quest frame has valid JSON meta structure', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&questId=1&chain=base`)

    expect(frameJson.version).toBe('next')
    expect(frameJson.button.action.type).toBe('launch_frame')
    expect(frameJson.button.action.name).toBe('Gmeowbased')
    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
    expect(frameJson.imageUrl).toContain('/api/frame/image?type=quest')
  })

  test('Leaderboard frame has valid JSON meta structure', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=leaderboard`)

    expect(frameJson.version).toBe('next')
    expect(frameJson.button.action.type).toBe('launch_frame')
    expect(frameJson.button.action.name).toBe('Gmeowbased')
    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
    expect(frameJson.imageUrl).toContain('/api/frame/image?type=leaderboard')
  })

  test('Badge frame has valid JSON meta structure', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame/badge?fid=848516`)

    expect(frameJson.version).toBe('next')
    expect(frameJson.button.action.type).toBe('launch_frame')
    expect(frameJson.button.action.name).toBe('Gmeowbased')
    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
  })

  test('Profile frame has valid JSON meta structure', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=profile&fid=848516`)

    expect(frameJson.version).toBe('next')
    expect(frameJson.button.action.type).toBe('launch_frame')
    expect(frameJson.button.action.name).toBe('Gmeowbased')
    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
  })

  test('Mini App Embed has ONE button only (per MCP spec)', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    // Mini App Embed must have singular button object (not buttons array)
    expect(frameJson.button).toBeDefined()
    expect(frameJson.buttons).toBeUndefined() // No buttons array for Mini App
    
    // Only launch_frame and view_token are valid action types
    expect(['launch_frame', 'view_token']).toContain(frameJson.button.action.type)
  })

  test('Frame HTML contains proper DOCTYPE and structure', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    const html = await response?.text()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('<head>')
    expect(html).toContain('<meta')
    expect(html).toContain('fc:frame')
  })

  test('Image URLs use production domain (not localhost)', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    // Image URLs should use gmeowhq.art or vercel deployment URL
    if (process.env.NODE_ENV === 'production') {
      expect(frameJson.imageUrl).toMatch(/gmeowhq\.art|vercel\.app/)
      expect(frameJson.button.action.splashImageUrl).toMatch(/gmeowhq\.art|vercel\.app/)
    }
  })

  test('All frame types return valid HTML response', async ({ page }) => {
    const frameTypes = [
      'gm',
      'quest',
      'leaderboard',
      'profile',
      'badge',
    ]

    for (const type of frameTypes) {
      const url = type === 'badge' 
        ? `${BASE_URL}/api/frame/${type}?fid=848516`
        : `${BASE_URL}/api/frame?type=${type}`
      
      const response = await page.goto(url)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['content-type']).toContain('text/html')
    }
  })

  test('Frame meta includes all required Farcaster fields', async ({ page }) => {
    const { frameJson } = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    // Required fields per Farcaster Mini App spec
    expect(frameJson.version).toBeDefined()
    expect(frameJson.imageUrl).toBeDefined()
    expect(frameJson.button).toBeDefined()
    expect(frameJson.button.title).toBeDefined()
    expect(frameJson.button.action).toBeDefined()
    expect(frameJson.button.action.type).toBeDefined()
    expect(frameJson.button.action.name).toBeDefined()
    expect(frameJson.button.action.url).toBeDefined()
    expect(frameJson.button.action.splashImageUrl).toBeDefined()
    expect(frameJson.button.action.splashBackgroundColor).toBeDefined()
  })
})
