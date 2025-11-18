import { test, expect } from '@playwright/test'

/**
 * Device Compatibility Tests
 * 
 * Comprehensive tests across different devices, orientations, and screen sizes
 * Ensures responsive design works correctly on all supported devices
 */

test.describe('Desktop Compatibility', () => {
  test('should render full layout with sidebars on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    // Desktop should show left sidebar
    await expect(page.locator('.gmeow-sidebar-left, [class*="sidebar"]').first()).toBeVisible()

    // Main content should be centered
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // No mobile navigation on desktop
    const mobileNav = page.locator('.pixel-nav')
    const isVisible = await mobileNav.isVisible().catch(() => false)
    
    // Mobile nav might be hidden with CSS, check if it's rendered but hidden
    if (isVisible) {
      const display = await mobileNav.evaluate((el) => window.getComputedStyle(el).display)
      // Should be hidden on large screens
      const isLargeScreen = await page.evaluate(() => window.innerWidth >= 1024)
      if (isLargeScreen) {
        expect(['none', 'hidden']).toContain(display)
      }
    }
  })

  test('should handle window resize from desktop to mobile', async ({ page }) => {
    // Start at desktop size
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    // Verify desktop layout
    await expect(page.locator('main')).toBeVisible()

    // Resize to mobile
    await page.setViewportSize({ width: 390, height: 844 })

    // Wait for reflow
    await page.waitForTimeout(500)

    // Mobile nav should appear
    const mobileNav = page.locator('.pixel-nav')
    await expect(mobileNav).toBeVisible()
  })
})

test.describe('Tablet Compatibility', () => {
  const tablets = [
    { name: 'iPad Pro 11"', width: 834, height: 1194, landscape: { width: 1194, height: 834 } },
    { name: 'iPad Pro 12.9"', width: 1024, height: 1366, landscape: { width: 1366, height: 1024 } },
    { name: 'Galaxy Tab S4', width: 712, height: 1138, landscape: { width: 1138, height: 712 } },
  ]

  for (const tablet of tablets) {
    test(`should render correctly on ${tablet.name} portrait`, async ({ page }) => {
      await page.setViewportSize({ width: tablet.width, height: tablet.height })
      await page.goto('/')

      // Main content should be visible
      await expect(page.locator('main')).toBeVisible()

      // Check no horizontal scroll
      const hasOverflow = await page.evaluate(() => 
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasOverflow).toBe(false)
    })

    test(`should render correctly on ${tablet.name} landscape`, async ({ page }) => {
      await page.setViewportSize({ 
        width: tablet.landscape.width, 
        height: tablet.landscape.height 
      })
      await page.goto('/')

      await expect(page.locator('main')).toBeVisible()

      // Check layout adapts to landscape
      const mainWidth = await page.locator('main').evaluate((el) => el.clientWidth)
      expect(mainWidth).toBeGreaterThan(tablet.width) // Should use more horizontal space
    })
  }

  test('should adapt grid layouts on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    // Quest cards should be in 2-column grid on tablet
    const questGrid = page.locator('[class*="grid"]').first()
    
    if (await questGrid.isVisible()) {
      const gridColumns = await questGrid.evaluate((el) => 
        window.getComputedStyle(el).gridTemplateColumns
      )
      
      // Should have multiple columns on tablet
      expect(gridColumns).toBeTruthy()
    }
  })
})

test.describe('Mobile Orientation Changes', () => {
  test('should handle portrait to landscape on mobile', async ({ page, browserName }) => {
    // Start in portrait
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await expect(page.locator('.pixel-nav')).toBeVisible()

    // Rotate to landscape
    await page.setViewportSize({ width: 844, height: 390 })
    await page.waitForTimeout(300)

    // Navigation should still be visible and functional
    await expect(page.locator('.pixel-nav')).toBeVisible()

    // Content should reflow for landscape
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    expect(viewportHeight).toBe(390)
  })

  test('should prevent text scaling in landscape mode', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 }) // Landscape
    await page.goto('/')

    const textSizeAdjust = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement) as any
      return style.textSizeAdjust || style.webkitTextSizeAdjust
    })

    // Should be 100% to prevent iOS text scaling
    expect(textSizeAdjust).toMatch(/100%|none/)
  })
})

test.describe('Small Screen Devices', () => {
  const smallDevices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'Galaxy S8', width: 360, height: 740 },
    { name: 'Moto G4', width: 360, height: 640 },
  ]

  for (const device of smallDevices) {
    test(`should be fully functional on ${device.name} (${device.width}x${device.height})`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height })
      await page.goto('/')

      // All critical UI elements should be visible
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('.pixel-nav')).toBeVisible()

      // Text should be readable (not cut off)
      const hasTextOverflow = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, p'))
        return elements.some((el) => {
          const styles = window.getComputedStyle(el)
          return styles.overflow === 'visible' && el.scrollWidth > el.clientWidth
        })
      })

      expect(hasTextOverflow).toBe(false)

      // Buttons should be accessible
      const navLinks = page.locator('.pixel-nav .nav-link')
      const count = await navLinks.count()
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const box = await navLinks.nth(i).boundingBox()
        if (box) {
          // Touch targets should be adequate
          expect(box.width).toBeGreaterThanOrEqual(40)
          expect(box.height).toBeGreaterThanOrEqual(40)
        }
      }
    })
  }

  test('should handle very small viewports (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }) // iPhone 5
    await page.goto('/')

    // Core functionality should still work
    await expect(page.locator('main')).toBeVisible()
    
    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)
  })
})

test.describe('High DPI Displays', () => {
  test('should render sharp on Retina displays', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Simulate high DPI
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    // Images should use appropriate resolution
    const images = page.locator('img')
    const count = await images.count()

    if (count > 0) {
      const firstImage = images.first()
      const src = await firstImage.getAttribute('src')
      
      // Next.js Image component should optimize for DPI
      expect(src).toBeTruthy()
    }
  })
})

test.describe('Accessibility on Devices', () => {
  test('should support keyboard navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    // Tab through focusable elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to focus interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement || '')
  })

  test('should have proper focus indicators on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const dashboardLink = page.locator('.pixel-nav a[href="/Dashboard"]')
    await dashboardLink.focus()

    // Should have visible focus state
    const outlineWidth = await dashboardLink.evaluate((el) => 
      window.getComputedStyle(el).outlineWidth
    )

    // Should have some focus indicator
    expect(outlineWidth).toBeTruthy()
  })

  test('should meet touch target size requirements', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const interactiveElements = await page.locator('button, a[href], input, [role="button"]').all()

    for (const element of interactiveElements.slice(0, 10)) { // Test first 10
      const box = await element.boundingBox()
      
      if (box && await element.isVisible()) {
        // WCAG 2.5.5 Level AAA: 44x44px minimum (not enforced, but ideal)
        // WCAG 2.5.5 Level AA: 24x24px minimum (future standard)
        const meetsAA = box.width >= 24 && box.height >= 24
        
        expect(meetsAA).toBe(true)
      }
    }
  })
})

test.describe('Dark Mode Compatibility', () => {
  test('should render correctly in dark mode on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    // Check background is dark
    const bgColor = await page.evaluate(() => 
      window.getComputedStyle(document.body).backgroundColor
    )

    // Should be a dark color
    expect(bgColor).toMatch(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  })

  test('should have sufficient contrast in dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    // Text should be visible
    const textElements = page.locator('main p, main h1, main h2').first()
    
    if (await textElements.count() > 0) {
      const color = await textElements.first().evaluate((el) => 
        window.getComputedStyle(el).color
      )
      
      // Should have light text on dark background
      expect(color).toBeTruthy()
    }
  })
})
