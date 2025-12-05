/**
 * Frame Screenshot Testing Script
 * Uses Playwright to capture all frame types
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUTPUT_DIR = join(process.cwd(), 'screenshots', `frames-${Date.now()}`)

// Frame test configurations
const FRAME_TESTS = [
  // Badge frames
  {
    name: 'badge-frame-basic',
    url: '/frame/badge/3',
    description: 'Basic badge collection frame'
  },
  {
    name: 'badge-share-epic',
    url: '/api/frame/badgeShare/image?badgeId=signal-luminary&username=testuser&fid=3',
    description: 'Epic badge share'
  },
  
  // Stats frames
  {
    name: 'stats-frame-user',
    url: '/frame/stats/3',
    description: 'User onchain stats frame'
  },
  
  // Quest frames
  {
    name: 'quest-frame-active',
    url: '/frame/quest/1',
    description: 'Active quest frame'
  },
  
  // Leaderboard frame
  {
    name: 'leaderboard-frame',
    url: '/frame/leaderboard',
    description: 'Global leaderboard frame'
  },
  
  // API image endpoints
  {
    name: 'gm-frame-basic',
    url: '/api/frame/image?type=gm&user=0x123&gmCount=5&streak=3&rank=42&chain=Base',
    description: 'GM frame basic'
  },
  {
    name: 'gm-frame-legendary',
    url: '/api/frame/image?type=gm&user=0x123&gmCount=150&streak=35&rank=1&chain=Base',
    description: 'GM frame legendary status'
  },
  {
    name: 'verify-success',
    url: '/api/frame/image?type=verify&success=true&username=testuser&fid=12345',
    description: 'Verify success frame'
  },
  {
    name: 'guild-frame',
    url: '/api/frame/image?type=guild&guildName=Test%20Guild&members=42&level=5&xp=1500&totalXp=2000',
    description: 'Guild information frame'
  },
  {
    name: 'quest-active-image',
    url: '/api/frame/image?type=quest&questName=Daily%20Challenge&description=Complete%205%20GMs&status=active&questId=1&progress=3&total=5',
    description: 'Quest active status'
  },
  {
    name: 'badges-collection',
    url: '/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner,signal-luminary',
    description: 'Badge collection display'
  },
  {
    name: 'onchainstats-basic',
    url: '/api/frame/image?type=onchainstats&user=0x123&txs=50&contracts=10&volume=1.5%20ETH&balance=0.5%20ETH&age=6%20months&firstTx=Jan%202024&lastTx=Nov%202024&builder=75&neynar=850',
    description: 'Onchain stats summary'
  },
  {
    name: 'leaderboard-top10',
    url: '/api/frame/image?type=leaderboard&season=1&entries=1.%20Alice%20-%2050%20GMs%7C2.%20Bob%20-%2048%20GMs%7C3.%20Charlie%20-%2045%20GMs&total=150',
    description: 'Leaderboard top 10'
  },
  {
    name: 'profile-basic',
    url: '/api/frame/image?type=profile&username=testuser&fid=12345&bio=Web3%20enthusiast&gmCount=25&streak=7&badges=5&rank=42',
    description: 'User profile frame'
  }
]

async function captureFrameScreenshot(
  page: any,
  test: typeof FRAME_TESTS[0]
): Promise<boolean> {
  try {
    const url = `${BASE_URL}${test.url}`
    console.log(`📸 Capturing: ${test.name}`)
    console.log(`   URL: ${url}`)
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })
    
    const outputPath = join(OUTPUT_DIR, `${test.name}.png`)
    
    // Check if this is an image endpoint or HTML page
    const contentType = await page.evaluate(() => document.contentType)
    
    if (contentType?.includes('image')) {
      // For direct image endpoints, screenshot the whole viewport
      await page.screenshot({ 
        path: outputPath,
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1200,
          height: 630
        }
      })
    } else {
      // For HTML pages, take full page screenshot
      await page.screenshot({ 
        path: outputPath,
        fullPage: true
      })
    }
    
    console.log(`   ✅ Saved: ${outputPath}`)
    return true
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🎯 Frame Screenshot Testing')
  console.log('=' .repeat(50))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('')
  
  // Create output directory
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create output directory:', err)
    process.exit(1)
  }
  
  // Launch browser
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2 // Retina display
  })
  const page = await context.newPage()
  
  let successCount = 0
  let failCount = 0
  
  // Test each frame
  for (const test of FRAME_TESTS) {
    const success = await captureFrameScreenshot(page, test)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    console.log('')
  }
  
  // Cleanup
  await browser.close()
  
  // Summary
  console.log('=' .repeat(50))
  console.log('📊 Test Summary')
  console.log('=' .repeat(50))
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📁 Output: ${OUTPUT_DIR}`)
  console.log('')
  console.log('🎉 Testing complete!')
  
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
