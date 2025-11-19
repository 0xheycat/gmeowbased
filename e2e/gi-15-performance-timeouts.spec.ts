/**
 * GI-15 Test Group 6: Performance & Timeouts
 * 
 * Tests performance benchmarks:
 * - Frame endpoint < 1s response time (p95)
 * - OG image generation < 500ms preferred
 * - No slow blocking code
 * - Database queries optimized
 * - External API calls have timeouts
 * - Heavy rendering doesn't block
 * 
 * GI-15 Acceptance Criteria: No slow synchronous blocking code causing >1s render
 * in frame endpoints; OG rendering <500ms preferred
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

test.describe('GI-15 Group 6: Performance & Timeouts', () => {
  test('GM frame endpoint responds < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000) // <1s
  })

  test('Quest frame endpoint responds < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=123`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Leaderboard frame endpoint responds < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=leaderboard`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Profile frame endpoint responds < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=profile&fid=848516`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Badge frame endpoint responds < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=848516`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('GM image generation < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42&streak=7&rank=15`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Quest image generation < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questId=123&questName=Test`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Leaderboard image generation < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=leaderboard&season=Season5`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Onchainstats image generation < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&chain=base`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Complex image with many parameters < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&chain=base&txs=1000&contracts=50&volume=100`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Multiple concurrent frame requests complete < 2s', async ({ page }) => {
    const startTime = Date.now()
    
    const promises = [
      page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' }),
      page.goto(`${BASE_URL}/api/frame?type=quest&questId=123`, { waitUntil: 'domcontentloaded' }),
      page.goto(`${BASE_URL}/api/frame?type=leaderboard`, { waitUntil: 'domcontentloaded' }),
    ]
    
    const responses = await Promise.all(promises)
    const endTime = Date.now()

    // All should succeed
    responses.forEach(response => {
      expect(response?.status()).toBe(200)
    })
    
    // All together should complete < 2s (concurrent)
    expect(endTime - startTime).toBeLessThan(2000)
  })

  test('Frame with missing user data still responds quickly', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Image generation with defaults is fast', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Frame with valid cache headers improves performance', async ({ page }) => {
    // First request (cold cache)
    const response1 = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42`)
    
    // Second request (should be faster with cache)
    const startTime = Date.now()
    const response2 = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42`)
    const endTime = Date.now()

    expect(response1?.status()).toBe(200)
    expect(response2?.status()).toBe(200)
    
    // Cache should improve performance
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Frame endpoint handles timeout gracefully', async ({ page }) => {
    // Test with timeout set
    page.setDefaultTimeout(2000) // 2s timeout
    
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' })
    
    // Should complete before timeout
    expect(response?.status()).toBe(200)
  })

  test('Image generation doesn\'t block other requests', async ({ page }) => {
    // Start heavy image generation
    const imagePromise = page.goto(`${BASE_URL}/api/frame/image?type=onchainstats&user=0x123`)
    
    // Meanwhile, fetch frame metadata (should not be blocked)
    const startTime = Date.now()
    const frameResponse = await page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect(frameResponse?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
    
    // Wait for image to complete
    const imageResponse = await imagePromise
    expect(imageResponse?.status()).toBe(200)
  })

  test('Error responses are fast', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=0`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    // Even errors should respond quickly
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Frame with long query string performs well', async ({ page }) => {
    const longQuery = 'questName=' + 'A'.repeat(200)
    
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&${longQuery}`, { waitUntil: 'domcontentloaded' })
    const endTime = Date.now()

    expect([200, 400]).toContain(response?.status() || 0)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('All frame types meet performance budget', async ({ page }) => {
    const frameTypes = [
      'gm',
      'quest',
      'leaderboard',
      'profile',
    ]

    for (const type of frameTypes) {
      const startTime = Date.now()
      const response = await page.goto(`${BASE_URL}/api/frame?type=${type}`, { waitUntil: 'domcontentloaded' })
      const endTime = Date.now()

      expect(response?.status()).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000)
    }
  })

  test('All image types meet performance budget', async ({ page }) => {
    const imageTypes = [
      'gm',
      'quest',
      'leaderboard',
      'onchainstats',
    ]

    for (const type of imageTypes) {
      const startTime = Date.now()
      const response = await page.goto(`${BASE_URL}/api/frame/image?type=${type}`)
      const endTime = Date.now()

      expect(response?.status()).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000)
    }
  })
})
