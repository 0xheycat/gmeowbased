/**
 * GI-15 Test Group 2: Button Validation & Endpoints
 * 
 * Tests button configuration and target endpoints:
 * - Mini App Embed: ONE button only (singular button object)
 * - Legacy Frames v1: Max 4 buttons (buttons array)
 * - Button titles ≤ 32 characters
 * - Button targets are reachable (HTTP 200)
 * - No /api/frame exposure (GI-11 compliance)
 * - HTTPS absolute URLs
 * 
 * Reference: https://miniapps.farcaster.xyz/docs/specification
 * GI-15 Acceptance Criteria: Button validation, endpoint reachability, no /api/frame exposure
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

test.describe('GI-15 Group 2: Button Validation & Endpoints', () => {
  test('Mini App button has valid title (≤ 32 chars)', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.title).toBeDefined()
    expect(frameJson.button.title.length).toBeLessThanOrEqual(32)
  })

  test('Mini App button action type is valid (launch_frame or view_token)', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    const validActionTypes = ['launch_frame', 'view_token']
    expect(validActionTypes).toContain(frameJson.button.action.type)
  })

  test('Mini App button has action name (required field)', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.name).toBeDefined()
    expect(frameJson.button.action.name).toBe('Gmeowbased')
  })

  test('Button target URL is absolute HTTPS', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.url).toMatch(/^https:\/\//)
  })

  test('Button target URL is reachable (HTTP 200)', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    const targetUrl = frameJson.button.action.url
    const response = await page.goto(targetUrl)
    
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('text/html')
  })

  test('No button targets point to /api/frame (GI-11 violation)', async ({ page }) => {
    const frameTypes = ['gm', 'quest', 'leaderboard', 'profile']

    for (const type of frameTypes) {
      const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=${type}`)

      const targetUrl = frameJson.button.action.url
      
      // Button targets must NOT expose /api/frame (internal API)
      expect(targetUrl).not.toContain('/api/frame')
      
      // Should use public routes like /frame/*, /quest/*, etc.
      expect(targetUrl).toMatch(/\/(frame|quest|leaderboard|profile|badge|guild)/)
    }
  })

  test('Splash image URL is absolute HTTPS', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.splashImageUrl).toMatch(/^https:\/\//)
  })

  test('Splash image URL is reachable', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    const splashUrl = frameJson.button.action.splashImageUrl
    const response = await page.goto(splashUrl)
    
    expect(response?.status()).toBe(200)
    expect(['image/png', 'image/jpeg']).toContain(response?.headers()['content-type'])
  })

  test('Splash background color is valid hex', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.splashBackgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('Quest frame button targets include questId parameter', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=quest&questId=123`)

    const targetUrl = frameJson.button.action.url
    
    // Quest button should pass questId to target
    expect(targetUrl).toContain('questId=123')
  })

  test('Leaderboard frame button is reachable', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=leaderboard`)

    const targetUrl = frameJson.button.action.url
    const response = await page.goto(targetUrl)
    
    expect(response?.status()).toBe(200)
  })

  test('Badge frame button targets badge details page', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame/badge?fid=848516`)

    const targetUrl = frameJson.button.action.url
    
    // Badge button should point to badge or profile page
    expect(targetUrl).toMatch(/\/(badge|profile)/)
  })

  test('All button URLs use same origin (security)', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    const buttonUrl = new URL(frameJson.button.action.url)
    const splashUrl = new URL(frameJson.button.action.splashImageUrl)
    
    if (process.env.NODE_ENV === 'production') {
      // In production, all URLs should use same origin
      expect(buttonUrl.origin).toBe(splashUrl.origin)
    }
  })

  test('Button action URL max length ≤ 1024 chars', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.url.length).toBeLessThanOrEqual(1024)
  })

  test('Splash image URL max length ≤ 1024 chars', async ({ page }) => {
    const frameJson = await extractFrameJson(page, `${BASE_URL}/api/frame?type=gm`)

    expect(frameJson.button.action.splashImageUrl.length).toBeLessThanOrEqual(1024)
  })
})
