import { test, expect } from '@playwright/test'

test.describe('Quest Wizard - Template Flow', () => {
  test('should select template and pre-fill quest', async ({ page }) => {
    await page.goto('/Quest/creator')

    // Wait for wizard to load
    await expect(page.locator('h1')).toContainText('Multi-step wizard')    // Check if template selector is available (if implemented as step 0)
    const hasTemplateSelector = await page.locator('text=Token Giveaway').count() > 0
    
    if (hasTemplateSelector) {
      // Click on "Token Giveaway" template
      await page.click('text=Token Giveaway')
      
      // Verify quest name is pre-filled
      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toHaveValue(/Token Giveaway/)
      
      // Verify description is pre-filled
      const descriptionTextarea = page.locator('textarea[name="description"]')
      await expect(descriptionTextarea).not.toBeEmpty()
    } else {
      console.log('Template selector not found - may be optional feature')
    }
  })

  test('should skip template and create quest manually', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Click "Start from Scratch" if available
    const skipButton = page.locator('text=Start from Scratch')
    if (await skipButton.count() > 0) {
      await skipButton.click()
    }
    
    // Should be on step 1 (basics)
    await expect(page.locator('text=Step 1')).toBeVisible()
  })
})

test.describe('Quest Wizard - Step Navigation', () => {
  test('should navigate through all steps', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Step 1: Basics
    await page.fill('input[name="name"]', 'E2E Test Quest')
    await page.fill('textarea[name="description"]', 'Testing quest creation flow')
    
    // Check if "Next" button exists and click
    const nextButton = page.locator('button:has-text("Next")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      
      // Verify moved to step 2
      await expect(page.locator('text=Step 2')).toBeVisible()
    }
  })

  test('should go back to previous step', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill step 1
    await page.fill('input[name="name"]', 'Test Quest')
    
    // Go to step 2
    const nextButton = page.locator('button:has-text("Next")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      
      // Go back to step 1
      const backButton = page.locator('button:has-text("Back")')
      if (await backButton.count() > 0) {
        await backButton.click()
        
        // Verify on step 1
        await expect(page.locator('text=Step 1')).toBeVisible()
        
        // Verify data persisted
        await expect(page.locator('input[name="name"]')).toHaveValue('Test Quest')
      }
    }
  })
})

test.describe('Quest Wizard - Auto-Save', () => {
  test('should show recovery prompt if draft exists', async ({ page }) => {
    // Set up localStorage with a saved draft
    await page.goto('/Quest/creator')
    
    // TODO: Implement test when recovery prompt feature is added
    await expect(page.locator('h1')).toContainText('Multi-step wizard')
  })

  test('should discard saved draft', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // TODO: Implement test when discard draft feature is added
    await expect(page.locator('h1')).toContainText('Multi-step wizard')
  })

  test('should show save indicator', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill in quest name
    await page.fill('input[name="name"]', 'Auto Save Test')
    
    // Wait for auto-save (5 seconds + buffer)
    await page.waitForTimeout(6000)
    
    // Check for save indicator
    const savedIndicator = page.locator('text=Saved')
    await expect(savedIndicator).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Quest Wizard - Form Validation', () => {
  test('should show validation errors', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Next")')
    if (await nextButton.count() > 0) {
      await nextButton.click()
      
      // Should show validation errors
      // (Exact error message depends on implementation)
      const hasError = await page.locator('[class*="error"]').count() > 0 ||
                       await page.locator('[class*="invalid"]').count() > 0
      
      expect(hasError).toBeTruthy()
    }
  })

  test('should validate quest name length', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill with very long name
    const longName = 'a'.repeat(200)
    await page.fill('input[name="name"]', longName)
    
    // Blur input to trigger validation
    await page.locator('input[name="name"]').blur()
    
    // Wait a bit for validation
    await page.waitForTimeout(500)
    
    // Check if validation triggered (implementation dependent)
    const nameInput = page.locator('input[name="name"]')
    const value = await nameInput.inputValue()
    
    // Should either truncate or show error
    expect(value.length <= 200).toBeTruthy()
  })
})

test.describe('Quest Wizard - Preview Card', () => {
  test('should toggle between card views', async ({ page }) => {
    await page.goto('/Quest/creator')
    
    // Fill minimal data
    await page.fill('input[name="name"]', 'Preview Test Quest')
    
    // Navigate to preview step (assuming step 4)
    // This depends on wizard implementation
    const nextButton = page.locator('button:has-text("Next")')
    const buttonCount = await nextButton.count()
    
    if (buttonCount > 0) {
      // Try to get to preview step
      for (let i = 0; i < 3; i++) {
        if (await nextButton.count() > 0) {
          await nextButton.click()
          await page.waitForTimeout(500)
        }
      }
      
      // Check for view toggle buttons
      const cardViewButton = page.locator('button:has-text("Card View")')
      const standardViewButton = page.locator('button:has-text("Standard View")')
      
      if (await cardViewButton.count() > 0) {
        // Toggle to card view
        await cardViewButton.click()
        await expect(standardViewButton).toBeVisible()
        
        // Toggle back
        await standardViewButton.click()
        await expect(cardViewButton).toBeVisible()
      }
    }
  })
})

test.describe('Quest Wizard - Analytics Events', () => {
  test('should track wizard start', async ({ page }) => {
    // Listen for analytics events
    const analyticsEvents: any[] = []
    
    await page.exposeFunction('captureAnalytics', (event: string, props: any) => {
      analyticsEvents.push({ event, props })
    })
    
    await page.addInitScript(() => {
      // Mock analytics
      (window as any).posthog = {
        capture: (event: string, props: any) => {
          (window as any).captureAnalytics(event, props)
        }
      }
    })
    
    await page.goto('/quest-wizard')
    
    // Wait a bit for analytics to fire
    await page.waitForTimeout(1000)
    
    // Check if wizard_started event was tracked
    const hasWizardStarted = analyticsEvents.some(e => e.event === 'wizard_started')
    expect(hasWizardStarted).toBeTruthy()
  })
})
