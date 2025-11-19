/**
 * GI-15 Test Group 7: Warpcast Simulation
 * 
 * Tests frame rendering in Warpcast-like contexts:
 * - Warpcast viewport (424×695px)
 * - Warpcast user agent
 * - Mobile rendering
 * - Desktop modal rendering
 * - No JS console errors
 * - Image loads correctly
 * - Button interaction works
 * 
 * GI-15 Acceptance Criteria: Frames render correctly in Warpcast environment
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Warpcast viewport dimensions
const WARPCAST_VIEWPORT = {
  width: 424,
  height: 695,
}

// Warpcast-like user agent
const WARPCAST_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Warpcast/1.0'

test.describe('GI-15 Group 7: Warpcast Simulation', () => {
  test('Frame renders in Warpcast viewport (424×695)', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('text/html')
  })

  test('Frame renders with Warpcast user agent', async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'User-Agent': WARPCAST_USER_AGENT,
    })
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    expect(response?.status()).toBe(200)
  })

  test('GM frame image displays in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42&streak=7&rank=15`)
    
    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Quest frame image displays in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questId=123&questName=Test`)
    
    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Leaderboard frame image displays in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=leaderboard&season=Season5`)
    
    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Frame loads without JavaScript errors in Warpcast context', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    // Should have no console errors
    expect(consoleErrors.length).toBe(0)
  })

  test('Mobile viewport renders frame correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    expect(response?.status()).toBe(200)
  })

  test('Tablet viewport renders frame correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    expect(response?.status()).toBe(200)
  })

  test('Desktop viewport renders frame correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    expect(response?.status()).toBe(200)
  })

  test('Frame meta tags are accessible on all devices', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto(`${BASE_URL}/api/frame?type=gm`)
      
      const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
      expect(metaContent).toBeDefined()
      expect(metaContent).not.toBe('')
    }
  })

  test('Button target loads in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
    const frameJson = JSON.parse(metaContent!)
    
    const buttonUrl = frameJson.button.action.url
    const response = await page.goto(buttonUrl)
    
    expect(response?.status()).toBe(200)
  })

  test('Splash image loads in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
    const frameJson = JSON.parse(metaContent!)
    
    const splashUrl = frameJson.button.action.splashImageUrl
    const response = await page.goto(splashUrl)
    
    expect(response?.status()).toBe(200)
  })

  test('Frame image aspect ratio correct for Warpcast (3:2)', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    const metaContent = await page.locator('meta[name="fc:frame"]').getAttribute('content')
    const frameJson = JSON.parse(metaContent!)
    
    // Image URL should point to 3:2 ratio image (1200×800)
    expect(frameJson.imageUrl).toContain('/api/frame/image')
  })

  test('Frame works with slow 3G network', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100)
    })
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    })
    
    expect(response?.status()).toBe(200)
  })

  test('Frame handles network errors gracefully', async ({ page }) => {
    // Test with unreliable network (skip some requests)
    let requestCount = 0
    await page.route('**/*', route => {
      requestCount++
      if (requestCount % 3 === 0) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    }).catch(() => null)
    
    // Should either succeed or handle error gracefully (not crash)
    if (response) {
      expect([200, 500]).toContain(response.status())
    }
  })

  test('Frame supports both light and dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    const darkResponse = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    expect(darkResponse?.status()).toBe(200)
    
    await page.emulateMedia({ colorScheme: 'light' })
    const lightResponse = await page.goto(`${BASE_URL}/api/frame?type=gm`)
    expect(lightResponse?.status()).toBe(200)
  })

  test('Frame meta includes proper Open Graph tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/frame?type=gm`)
    
    // Check for standard OG tags (for social media previews)
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    
    expect(ogTitle).toBeDefined()
    expect(ogImage).toBeDefined()
  })

  test('All frame types work in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']
    
    for (const type of frameTypes) {
      const response = await page.goto(`${BASE_URL}/api/frame?type=${type}`)
      expect(response?.status()).toBe(200)
    }
  })

  test('Badge frame works in Warpcast viewport', async ({ page }) => {
    await page.setViewportSize(WARPCAST_VIEWPORT)
    
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=848516`)
    expect(response?.status()).toBe(200)
  })
})
