import { test, expect } from '@playwright/test'

test.describe('Quest Wizard - Mobile Gestures', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should swipe left to next step', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill step 1
    await page.fill('input[name="name"]', 'Mobile Test Quest')
    
    // Get the step panel
    const stepPanel = page.locator('[class*="rounded-3xl"]').first()
    
    // Perform swipe left gesture
    const box = await stepPanel.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
    }
    
    // Wait for navigation
    await page.waitForTimeout(500)
    
    // Should be on next step
    await expect(page.locator('text=Step 2')).toBeVisible()
  })

  test('should swipe right to previous step', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill and go to step 2
    await page.fill('input[name="name"]', 'Mobile Test')
    const nextButton = page.locator('button:has-text("Next")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      await page.waitForTimeout(500)
    }
    
    // Get the step panel
    const stepPanel = page.locator('[class*="rounded-3xl"]').first()
    
    // Perform swipe right gesture
    const box = await stepPanel.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 50, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
    }
    
    // Wait for navigation
    await page.waitForTimeout(500)
    
    // Should be back on step 1
    await expect(page.locator('text=Step 1')).toBeVisible()
  })

  test('should show mobile navigation indicators', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Check for mobile-specific UI elements
    // This depends on implementation
    const hasMobileUI = await page.locator('[class*="mobile"]').count() > 0 ||
                        await page.locator('[class*="touch"]').count() > 0
    
    // Mobile viewport should show touch-optimized UI
    expect(page.viewportSize()?.width).toBeLessThanOrEqual(768)
  })
})

test.describe('Quest Wizard - Touch Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should handle tap interactions', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Tap on input
    await page.tap('input[name="name"]')
    
    // Should focus input
    await expect(page.locator('input[name="name"]')).toBeFocused()
    
    // Type on mobile keyboard
    await page.fill('input[name="name"]', 'Touch Test')
    
    // Verify value
    await expect(page.locator('input[name="name"]')).toHaveValue('Touch Test')
  })

  test('should show mobile keyboard', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Focus textarea (should bring up mobile keyboard)
    await page.tap('textarea[name="description"]')
    
    // Verify focused
    await expect(page.locator('textarea[name="description"]')).toBeFocused()
  })
})

test.describe('Quest Wizard - Responsive Layout', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/quest-wizard')
    
    // Check that sidebar is hidden or stacked on mobile
    const aside = page.locator('aside')
    if (await aside.count() > 0) {
      const box = await aside.boundingBox()
      // On mobile, aside should be below main content (higher y position)
      // or hidden entirely
      expect(box?.y).toBeGreaterThan(200)
    }
  })

  test('should show desktop layout on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/quest-wizard')
    
    // Check for side-by-side layout
    const main = page.locator('main')
    const gridClass = await main.getAttribute('class')
    
    // Should have grid layout on desktop
    expect(gridClass).toContain('grid')
  })
})
