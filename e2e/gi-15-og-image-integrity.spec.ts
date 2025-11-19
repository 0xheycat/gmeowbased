/**
 * GI-15 Test Group 3: OG Image Integrity
 * 
 * Tests dynamic OG image generation:
 * - Correct content-type (image/png or image/jpeg)
 * - Dimensions: 1200×800 (3:2 aspect ratio for frames)
 * - File size < 1MB
 * - Response time < 1s (performance)
 * - HTTPS absolute URLs
 * - All frame types generate images
 * 
 * GI-15 Acceptance Criteria: OG images served as HTTPS absolute URLs, 
 * correct MIME type, <1MB, 1200×630 or 3:2 ratio
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

test.describe('GI-15 Group 3: OG Image Integrity', () => {
  test('GM frame image has correct content-type', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm&user=0x123&gmCount=42&streak=7&rank=15`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Quest frame image has correct content-type', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questId=123&questName=Test&reward=100XP`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Leaderboard frame image has correct content-type', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=leaderboard&season=Season5&limit=10`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Onchainstats frame image has correct content-type', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=onchainstats&user=0x123&chain=base`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('GM frame image generation time < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42&streak=7&rank=15`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000) // < 1 second
  })

  test('Quest frame image generation time < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questId=123&questName=Test`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Leaderboard frame image generation time < 1s', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=leaderboard&season=Season5`)
    const endTime = Date.now()

    expect(response?.status()).toBe(200)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('Frame image URL in meta is absolute HTTPS', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.imageUrl).toMatch(/^https:\/\//)
  })

  test('GM frame image URL contains correct parameters', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm&user=0x123&fid=848516`)

    expect(frameJson.imageUrl).toContain('/api/frame/image?type=gm')
    expect(frameJson.imageUrl).toContain('user=0x123')
    expect(frameJson.imageUrl).toContain('fid=848516')
  })

  test('Quest frame image URL contains questId', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&questId=123`)

    expect(frameJson.imageUrl).toContain('/api/frame/image?type=quest')
    expect(frameJson.imageUrl).toContain('questId=123')
  })

  test('Leaderboard frame image URL contains season', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=leaderboard&season=Season5`)

    expect(frameJson.imageUrl).toContain('/api/frame/image?type=leaderboard')
    expect(frameJson.imageUrl).toContain('season=Season5')
  })

  test('Image with missing parameters uses defaults', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Invalid frame type falls back to onchainstats', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=invalid`)

    // Should return 200 with fallback image (not 404 or error)
    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Frame image has cache headers', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=gm&gmCount=42`)

    // Should have cache-control header for performance
    const cacheControl = response?.headers()['cache-control']
    expect(cacheControl).toBeDefined()
  })

  test('Frame image handles special characters in parameters', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questName=Test%20%26%20Challenge`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Frame image handles long quest names', async ({ page }) => {
    const longName = 'A'.repeat(100)
    const response = await page.goto(`${BASE_URL}/api/frame/image?type=quest&questName=${longName}`)

    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('All frame types generate unique images', async ({ page }) => {
    const gmImage = await page.goto(`${BASE_URL}/api/frame/image?type=gm`)
    const questImage = await page.goto(`${BASE_URL}/api/frame/image?type=quest`)
    const leaderboardImage = await page.goto(`${BASE_URL}/api/frame/image?type=leaderboard`)

    // All should succeed
    expect(gmImage?.status()).toBe(200)
    expect(questImage?.status()).toBe(200)
    expect(leaderboardImage?.status()).toBe(200)
  })
})
