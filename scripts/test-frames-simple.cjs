#!/usr/bin/env node

/**
 * Simple Frame Testing Script
 * Tests all frame endpoints and downloads images
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const OUTPUT_DIR = path.join(__dirname, 'screenshots', `frames-${Date.now()}`)

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Frame tests
const FRAME_TESTS = [
  { name: 'badge-frame', url: '/frame/badge/3' },
  { name: 'stats-frame', url: '/frame/stats/3' },
  { name: 'quest-frame', url: '/frame/quest/1' },
  { name: 'leaderboard-frame', url: '/frame/leaderboard' },
  { name: 'gm-basic', url: '/api/frame/image?type=gm&user=0x123&gmCount=5&streak=3&rank=42&chain=Base' },
  { name: 'gm-legendary', url: '/api/frame/image?type=gm&user=0x123&gmCount=150&streak=35&rank=1&chain=Base' },
  { name: 'verify-success', url: '/api/frame/image?type=verify&success=true&username=testuser&fid=12345' },
  { name: 'guild-frame', url: '/api/frame/image?type=guild&guildName=Test%20Guild&members=42&level=5' },
  { name: 'badges-collection', url: '/api/frame/image?type=badgeCollection&username=testuser&fid=12345&earnedBadges=neon-initiate,pulse-runner' },
  { name: 'onchainstats', url: '/api/frame/image?type=onchainstats&user=0x123&txs=50&contracts=10&volume=1.5%20ETH' },
  { name: 'leaderboard-image', url: '/api/frame/image?type=leaderboard&season=1&entries=1.%20Alice%20-%2050&total=150' },
  { name: 'profile-frame', url: '/api/frame/image?type=profile&username=testuser&fid=12345&gmCount=25' }
]

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
    client.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filepath)
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(true)
        })
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject)
      } else {
        reject(new Error(`HTTP ${response.statusCode}`))
      }
    }).on('error', reject)
  })
}

async function testFrame(test) {
  const url = `${BASE_URL}${test.url}`
  const outputPath = path.join(OUTPUT_DIR, `${test.name}.html`)
  
  console.log(`📸 Testing: ${test.name}`)
  console.log(`   URL: ${url}`)
  
  try {
    await downloadFile(url, outputPath)
    const stats = fs.statSync(outputPath)
    console.log(`   ✅ Saved: ${outputPath} (${stats.size} bytes)`)
    return true
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🎯 Frame Testing - All Types')
  console.log('='.repeat(50))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('')
  
  let successCount = 0
  let failCount = 0
  
  for (const test of FRAME_TESTS) {
    const success = await testFrame(test)
    if (success) successCount++
    else failCount++
    console.log('')
  }
  
  console.log('='.repeat(50))
  console.log('📊 Summary')
  console.log('='.repeat(50))
  console.log(`✅ Success: ${successCount}/${FRAME_TESTS.length}`)
  console.log(`❌ Failed: ${failCount}/${FRAME_TESTS.length}`)
  console.log(`📁 Output: ${OUTPUT_DIR}`)
  console.log('')
  console.log('🎉 Testing complete!')
  console.log('')
  console.log('💡 To view results:')
  console.log(`   cd ${OUTPUT_DIR}`)
  console.log(`   ls -lh`)
}

main().catch(console.error)
