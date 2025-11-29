#!/usr/bin/env node
/**
 * Comprehensive Frame Screenshot Test
 * Tests all frame types with dynamic OG image generation
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'frames');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * All frame types to test
 */
const FRAME_TESTS = [
  // 1. Quest Frames
  {
    name: 'quest-frame',
    url: '/frame/quest/test-quest-123',
    description: 'Quest frame with dynamic OG'
  },
  {
    name: 'quest-leaderboard-frame',
    url: '/frame/quest/test-quest-123/leaderboard',
    description: 'Quest leaderboard frame'
  },
  
  // 2. Profile Frames
  {
    name: 'profile-frame',
    url: '/frame/profile/3621',
    description: 'User profile frame'
  },
  {
    name: 'profile-badges-frame',
    url: '/frame/profile/3621/badges',
    description: 'User badges frame'
  },
  
  // 3. Badge Frames
  {
    name: 'badge-frame',
    url: '/frame/badge/mythic-founder',
    description: 'Single badge frame'
  },
  {
    name: 'badge-collection-frame',
    url: '/frame/badges',
    description: 'Badge collection overview'
  },
  
  // 4. Leaderboard Frames
  {
    name: 'global-leaderboard-frame',
    url: '/frame/leaderboard',
    description: 'Global leaderboard frame'
  },
  {
    name: 'guild-leaderboard-frame',
    url: '/frame/Guild/leaderboard',
    description: 'Guild leaderboard frame'
  },
  
  // 5. Agent Frames
  {
    name: 'agent-frame',
    url: '/frame/Agent',
    description: 'AI Agent interaction frame'
  },
  
  // 6. Guild Frames
  {
    name: 'guild-frame',
    url: '/frame/Guild',
    description: 'Guild overview frame'
  },
  
  // 7. Gm Frame
  {
    name: 'gm-frame',
    url: '/frame/gm',
    description: 'GM greeting frame'
  },
  
  // 8. Dashboard Frame
  {
    name: 'dashboard-frame',
    url: '/frame/Dashboard',
    description: 'User dashboard frame'
  },
  
  // 9. Dynamic OG Images (meta tags)
  {
    name: 'og-quest-image',
    url: '/api/og/quest?questId=test-quest-123&title=Epic%20Quest&participants=42',
    description: 'Dynamic quest OG image',
    type: 'api'
  },
  {
    name: 'og-profile-image',
    url: '/api/og/profile?fid=3621&username=heycat&followers=1337',
    description: 'Dynamic profile OG image',
    type: 'api'
  },
  {
    name: 'og-badge-image',
    url: '/api/og/badge?badgeId=mythic-founder&tier=mythic&holders=100',
    description: 'Dynamic badge OG image',
    type: 'api'
  },
  {
    name: 'og-leaderboard-image',
    url: '/api/og/leaderboard?type=global&topUser=alice&topScore=9999',
    description: 'Dynamic leaderboard OG image',
    type: 'api'
  }
];

/**
 * Capture screenshot with metadata
 */
async function captureFrame(page, test) {
  const startTime = Date.now();
  const url = BASE_URL + test.url;
  
  console.log(`\n📸 Testing: ${test.name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Description: ${test.description}`);
  
  try {
    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response.ok() && test.type !== 'api') {
      console.log(`   ⚠️  HTTP ${response.status()}`);
    }
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // For API endpoints (OG images), just check response
    if (test.type === 'api') {
      const contentType = response.headers()['content-type'];
      console.log(`   Content-Type: ${contentType}`);
      
      if (contentType?.includes('image')) {
        const screenshotPath = path.join(SCREENSHOT_DIR, `${test.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });
        console.log(`   ✅ Screenshot saved: ${test.name}.png`);
      } else {
        console.log(`   ⚠️  Not an image response`);
      }
    } else {
      // For regular frames, capture screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${test.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      // Check for frame metadata
      const metaTags = await page.evaluate(() => {
        const tags = {};
        document.querySelectorAll('meta[property^="fc:"], meta[property^="og:"]').forEach(meta => {
          const property = meta.getAttribute('property');
          const content = meta.getAttribute('content');
          tags[property] = content;
        });
        return tags;
      });
      
      const frameType = metaTags['fc:frame'] || 'unknown';
      const imageUrl = metaTags['fc:frame:image'] || metaTags['og:image'];
      
      console.log(`   Frame Type: ${frameType}`);
      console.log(`   Image URL: ${imageUrl ? imageUrl.substring(0, 60) + '...' : 'none'}`);
      console.log(`   Meta Tags: ${Object.keys(metaTags).length} found`);
      console.log(`   ✅ Screenshot saved: ${test.name}.png`);
      
      // Save metadata
      const metadataPath = path.join(SCREENSHOT_DIR, `${test.name}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        name: test.name,
        url: test.url,
        description: test.description,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        metaTags,
        status: response.status()
      }, null, 2));
    }
    
    const duration = Date.now() - startTime;
    console.log(`   ⏱️  Duration: ${duration}ms`);
    
    return { success: true, duration };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🎯 COMPREHENSIVE FRAME SCREENSHOT TEST');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Screenshot Dir: ${SCREENSHOT_DIR}`);
  console.log(`Total Tests: ${FRAME_TESTS.length}`);
  console.log('=' .repeat(60));
  
  // Launch browser
  console.log('\n🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 }, // Standard OG image size
    deviceScaleFactor: 2 // High DPI
  });
  
  const page = await context.newPage();
  
  // Run tests
  const results = {
    total: FRAME_TESTS.length,
    passed: 0,
    failed: 0,
    duration: 0,
    tests: []
  };
  
  for (const test of FRAME_TESTS) {
    const result = await captureFrame(page, test);
    results.tests.push({ ...test, ...result });
    
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    results.duration += result.duration || 0;
  }
  
  // Close browser
  await browser.close();
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Total Duration: ${results.duration}ms (${(results.duration / 1000).toFixed(2)}s)`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
  
  // Save results
  const resultsPath = path.join(SCREENSHOT_DIR, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Results saved: ${resultsPath}`);
  
  // List generated files
  console.log('\n📸 Generated Screenshots:');
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  files.forEach(file => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`   • ${file} (${sizeKB} KB)`);
  });
  
  console.log('\n✨ All tests complete!');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(BASE_URL, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 404);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

// Run
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('   Please start the dev server: pnpm dev');
    process.exit(1);
  }
  
  await runTests();
})();
