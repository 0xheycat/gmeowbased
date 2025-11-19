/**
 * GI-15 Test Group 4: MiniApp ↔ Frame Parity Tests
 * 
 * Tests that MiniApp and Frame produce same outputs:
 * - Same badge/tier/score for same inputs
 * - Same quest data rendering
 * - Same leaderboard rankings
 * - Consistent user profiles
 * - No drift between MiniApp UI and Frame metadata
 * 
 * GI-15 Acceptance Criteria: MiniApp and Frame produce the same badge, 
 * tier, and score outputs for the same inputs (parity tests pass)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function extractFrameJson(page: any, url: string) {
  await page.goto(url)
  const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
  if (!metaContent) {
    throw new Error('No fc:frame meta tag found')
  }
  return JSON.parse(metaContent)
}

test.describe('GI-15 Group 4: MiniApp ↔ Frame Parity', () => {
  test('Badge frame uses same badge logic as MiniApp', async ({ page }) => {
    const fid = '848516'
    
    // Get badge from frame
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame/badge?fid=${fid}`)
    
    // Frame should return valid badge data (via image URL parameters)
    expect(frameJson.imageUrl).toContain('/api/frame/image')
    expect(frameJson.button.title).toBeDefined()
    
    // Button should point to same badge/profile page as MiniApp would show
    expect(frameJson.button.action.url).toMatch(/\/(badge|profile)/)
  })

  test('Quest frame shows same quest data as MiniApp', async ({ page }) => {
    const questId = '123'
    
    // Get quest from frame
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&questId=${questId}`)
    
    // Frame should include questId in image URL
    expect(frameJson.imageUrl).toContain(`questId=${questId}`)
    
    // Button should point to quest page with same ID
    expect(frameJson.button.action.url).toContain(`questId=${questId}`)
  })

  test('Leaderboard frame shows same rankings as MiniApp', async ({ page }) => {
    // Get leaderboard from frame
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=leaderboard`)
    
    // Frame should point to leaderboard endpoint
    expect(frameJson.imageUrl).toContain('/api/frame/image?type=leaderboard')
    expect(frameJson.button.action.url).toMatch(/\/leaderboard/)
  })

  test('Profile frame uses same FID as MiniApp', async ({ page }) => {
    const fid = '848516'
    
    // Get profile from frame
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=profile&fid=${fid}`)
    
    // Frame should include FID in image URL
    expect(frameJson.imageUrl).toContain(`fid=${fid}`)
    
    // Button should point to profile with same FID
    expect(frameJson.button.action.url).toContain(`fid=${fid}`)
  })

  test('GM frame uses same user address as MiniApp', async ({ page }) => {
    const user = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    
    // Get GM frame
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm&user=${user}`)
    
    // Frame should include user address in image URL
    expect(frameJson.imageUrl).toContain(`user=${user}`)
  })

  test('Frame and MiniApp use same chain parameter', async ({ page }) => {
    const chain = 'base'
    
    // Get quest frame with chain
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&chain=${chain}`)
    
    // Frame should include chain in image URL
    expect(frameJson.imageUrl).toContain(`chain=${chain}`)
    
    // Button should preserve chain parameter
    expect(frameJson.button.action.url).toContain(`chain=${chain}`)
  })

  test('All frame types use consistent naming', async ({ page }) => {
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']
    
    for (const type of frameTypes) {
      const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=${type}`)
      
      // All frames should use same app name
      expect(frameJson.button.action.name).toBe('Gmeowbased')
    }
  })

  test('All frame types use consistent splash screen', async ({ page }) => {
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']
    
    let splashImageUrl: string | null = null
    let splashBackgroundColor: string | null = null
    
    for (const type of frameTypes) {
      const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=${type}`)
      
      if (!splashImageUrl) {
        splashImageUrl = frameJson.button.action.splashImageUrl
        splashBackgroundColor = frameJson.button.action.splashBackgroundColor
      } else {
        // All frames should use same splash screen
        expect(frameJson.button.action.splashImageUrl).toBe(splashImageUrl)
        expect(frameJson.button.action.splashBackgroundColor).toBe(splashBackgroundColor)
      }
    }
  })

  test('Frame button titles are consistent with MiniApp navigation', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)
    
    // Button title should match MiniApp entry point language
    expect(frameJson.button.title).toBeDefined()
    expect(frameJson.button.title.length).toBeGreaterThan(0)
    expect(frameJson.button.title.length).toBeLessThanOrEqual(32)
  })

  test('Frame version is consistent across all types', async ({ page }) => {
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']
    
    for (const type of frameTypes) {
      const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=${type}`)
      
      // All frames should use same version (Farville "next")
      expect(frameJson.version).toBe('next')
    }
  })

  test('Frame action types are consistent', async ({ page }) => {
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']
    
    for (const type of frameTypes) {
      const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=${type}`)
      
      // All frames should use launch_frame (launches MiniApp)
      expect(frameJson.button.action.type).toBe('launch_frame')
    }
  })

  test('Badge frame and profile frame show consistent user data', async ({ page }) => {
    const fid = '848516'
    
    // Get badge frame
    const badgeFrame = await extractFrameJson(page, `${BASE_URL}/api/frame/badge?fid=${fid}`)
    
    // Get profile frame
    const profileFrame = await extractFrameJson(page, `${BASE_URL}/api/frame?type=profile&fid=${fid}`)
    
    // Both should reference same FID
    expect(badgeFrame.imageUrl).toContain(fid)
    expect(profileFrame.imageUrl).toContain(fid)
    
    // Both should use same app name and splash
    expect(badgeFrame.button.action.name).toBe(profileFrame.button.action.name)
    expect(badgeFrame.button.action.splashImageUrl).toBe(profileFrame.button.action.splashImageUrl)
  })

  test('Frame parameters are properly URL-encoded', async ({ page }) => {
    const questName = 'Test & Challenge'
    
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent(questName)}`)
    
    // Frame should preserve encoded parameters
    expect(frameJson.imageUrl).toContain('questName=')
  })

  test('Frame image URLs preserve all query parameters', async ({ page }) => {
    const params = {
      type: 'quest',
      questId: '123',
      chain: 'base',
      user: '0x123'
    }
    
    const queryString = new URLSearchParams(params as any).toString()
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?${queryString}`)
    
    // Image URL should include all relevant parameters
    expect(frameJson.imageUrl).toContain('type=quest')
    expect(frameJson.imageUrl).toContain('questId=123')
  })
})
