import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tablets
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
    {
      name: 'tablet-android',
      use: { 
        ...devices['Galaxy Tab S4'],
        viewport: { width: 1024, height: 768 },
      },
    },

    // Mobile - iOS
    {
      name: 'mobile-iphone-12',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'mobile-iphone-se',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'mobile-iphone-14-pro',
      use: { ...devices['iPhone 14 Pro Max'] },
    },

    // Mobile - Android
    {
      name: 'mobile-pixel-5',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-galaxy-s9',
      use: { ...devices['Galaxy S9+'] },
    },

    // Small mobile devices
    {
      name: 'mobile-small',
      use: {
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // webServer only needed for local testing
  // For production testing, set NEXT_PUBLIC_BASE_URL environment variable
  ...(process.env.NEXT_PUBLIC_BASE_URL ? {} : {
    webServer: {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  }),
})
