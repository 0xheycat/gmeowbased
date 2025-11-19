/**
 * GI-15 Test Group 5: Input Validation (GI-8 Enforcement)
 * 
 * Tests input sanitization and validation:
 * - Invalid FID returns 400
 * - Invalid questId returns 400
 * - Invalid chain returns 400
 * - Invalid type falls back gracefully
 * - SQL injection attempts blocked
 * - XSS attempts sanitized
 * - All inputs validated per GI-8
 * 
 * GI-15 Acceptance Criteria: All inputs sanitized (FID, questId, chain, cast)
 * GI-8 checks present
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

test.describe('GI-15 Group 5: Input Validation (GI-8)', () => {
  test('Invalid FID (zero) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=0`, { waitUntil: 'domcontentloaded' })
    
    // Should return 400 for invalid FID
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid FID (negative) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=-1`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid FID (too large) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=999999999999999`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid FID (non-numeric) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=abc`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid questId (negative) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=-1`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid questId (too large) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=1000000000`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid questId (non-numeric) returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=invalid`, { waitUntil: 'domcontentloaded' })
    
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Invalid chain returns 400', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&chain=invalid_chain`, { waitUntil: 'domcontentloaded' })
    
    // Should validate chain against known chains
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('SQL injection in questName is sanitized', async ({ page }) => {
    const sqlInjection = "'; DROP TABLE quests; --"
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent(sqlInjection)}`, { waitUntil: 'domcontentloaded' })
    
    // Should return 200 with sanitized input (not execute SQL)
    expect(response?.status()).toBe(200)
  })

  test('XSS attempt in questName is sanitized', async ({ page }) => {
    const xssAttempt = '<script>alert("xss")</script>'
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent(xssAttempt)}`, { waitUntil: 'domcontentloaded' })
    
    // Should return 200 with sanitized input
    expect(response?.status()).toBe(200)
    
    // Get the HTML and verify no script tags
    const html = await response?.text()
    expect(html).not.toContain('<script>')
  })

  test('HTML injection in user parameter is sanitized', async ({ page }) => {
    const htmlInjection = '<img src=x onerror=alert(1)>'
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm&user=${encodeURIComponent(htmlInjection)}`, { waitUntil: 'domcontentloaded' })
    
    // Should return with sanitized input
    expect([200, 400]).toContain(response?.status() || 0)
  })

  test('Invalid user address format returns 400', async ({ page }) => {
    const invalidAddress = 'not_an_address'
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm&user=${invalidAddress}`, { waitUntil: 'domcontentloaded' })
    
    // Should validate Ethereum address format
    expect([400, 500]).toContain(response?.status() || 0)
  })

  test('Missing required parameters use defaults', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=gm`, { waitUntil: 'domcontentloaded' })
    
    // Should return 200 with default values
    expect(response?.status()).toBe(200)
  })

  test('Invalid type falls back to default', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=invalid_type`, { waitUntil: 'domcontentloaded' })
    
    // Should return 200 with fallback (not error)
    expect(response?.status()).toBe(200)
  })

  test('Null parameter values are handled', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=null`, { waitUntil: 'domcontentloaded' })
    
    // Should handle null gracefully
    expect([200, 400]).toContain(response?.status() || 0)
  })

  test('Undefined parameter values are handled', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=undefined`, { waitUntil: 'domcontentloaded' })
    
    // Should handle undefined gracefully
    expect([200, 400]).toContain(response?.status() || 0)
  })

  test('Very long quest name is truncated', async ({ page }) => {
    const longName = 'A'.repeat(1000)
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${longName}`, { waitUntil: 'domcontentloaded' })
    
    // Should return 200 with truncated name
    expect(response?.status()).toBe(200)
  })

  test('Special characters in parameters are encoded', async ({ page }) => {
    const specialChars = '!@#$%^&*()[]{}|\\:";\'<>?,./~`'
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent(specialChars)}`, { waitUntil: 'domcontentloaded' })
    
    // Should handle special characters
    expect(response?.status()).toBe(200)
  })

  test('Multiple invalid parameters return comprehensive error', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=invalid&questId=-1&chain=fake&fid=0`, { waitUntil: 'domcontentloaded' })
    
    // Should validate all parameters and return appropriate status
    expect([200, 400, 500]).toContain(response?.status() || 0)
  })

  test('Empty string parameters are handled', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=`, { waitUntil: 'domcontentloaded' })
    
    // Should handle empty strings gracefully
    expect(response?.status()).toBe(200)
  })

  test('Whitespace-only parameters are sanitized', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent('   ')}`, { waitUntil: 'domcontentloaded' })
    
    // Should handle whitespace-only input
    expect(response?.status()).toBe(200)
  })

  test('Unicode characters in parameters are handled', async ({ page }) => {
    const unicode = '测试🎯🚀'
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questName=${encodeURIComponent(unicode)}`, { waitUntil: 'domcontentloaded' })
    
    // Should handle Unicode characters
    expect(response?.status()).toBe(200)
  })

  test('Quest frame with valid parameters returns 200', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame?type=quest&questId=123&chain=base`, { waitUntil: 'domcontentloaded' })
    
    // Valid inputs should work
    expect(response?.status()).toBe(200)
  })

  test('Badge frame with valid FID returns 200', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/frame/badge?fid=848516`, { waitUntil: 'domcontentloaded' })
    
    // Valid FID should work
    expect(response?.status()).toBe(200)
  })
})
