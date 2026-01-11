#!/usr/bin/env tsx
/**
 * Comprehensive Frame API Test Suite
 * Tests all frame endpoints and generates sample images
 * 
 * Run: npx tsx scripts/test-all-frames.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

console.log('🎨 Testing All Frame API Routes\n')

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const outputDir = join(process.cwd(), 'test-output', 'frames')

// Create output directory
try {
  mkdirSync(outputDir, { recursive: true })
  console.log(`📁 Output directory: ${outputDir}\n`)
} catch (error) {
  // Directory already exists
}

interface FrameTest {
  name: string
  endpoint: string
  params?: Record<string, string>
  expectedContentType?: string
  saveImage?: boolean
}

const frameTests: FrameTest[] = [
  // Main frame endpoint
  {
    name: 'Main Frame',
    endpoint: '/api/frame',
    expectedContentType: 'text/html',
  },

  // Image frames
  {
    name: 'Badge Frame',
    endpoint: '/api/frame/image/badge',
    params: { badgeId: '1', username: 'testuser' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Badge Collection Frame',
    endpoint: '/api/frame/image/badgecollection',
    params: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'GM Frame',
    endpoint: '/api/frame/image/gm',
    params: { username: 'testuser', streak: '5' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Guild Frame',
    endpoint: '/api/frame/image/guild',
    params: { 
      id: '1',
      name: 'Test Guild',
      members: '10',
      points: '5000',
      owner: 'testowner',
      level: '3'
    },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Leaderboard Frame',
    endpoint: '/api/frame/image/leaderboard',
    params: { season: '1' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'NFT Frame',
    endpoint: '/api/frame/image/nft',
    params: { tokenId: '1', collection: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'OnchainStats Frame',
    endpoint: '/api/frame/image/onchainstats',
    params: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Points Frame',
    endpoint: '/api/frame/image/points',
    params: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', points: '1000' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Quest Frame',
    endpoint: '/api/frame/image/quest',
    params: { questId: '1', title: 'Complete Profile' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Referral Frame',
    endpoint: '/api/frame/image/referral',
    params: { code: 'TEST123', count: '5' },
    expectedContentType: 'image',
    saveImage: true,
  },
  {
    name: 'Verify Frame',
    endpoint: '/api/frame/image/verify',
    params: { username: 'testuser', verified: 'true' },
    expectedContentType: 'image',
    saveImage: true,
  },

  // Badge share endpoints
  {
    name: 'Badge Share Frame',
    endpoint: '/api/frame/badgeShare',
    params: { badgeId: '1' },
    expectedContentType: 'text/html',
  },
  {
    name: 'Badge Share Image',
    endpoint: '/api/frame/badgeShare/image',
    params: { badgeId: '1', username: 'testuser' },
    expectedContentType: 'image',
    saveImage: true,
  },

  // Test endpoint we just created
  {
    name: 'Active Users Frame (JSON)',
    endpoint: '/api/test/active-users-frame',
    params: { guildId: '1', format: 'json' },
    expectedContentType: 'application/json',
  },
  {
    name: 'Active Users Frame (Image)',
    endpoint: '/api/test/active-users-frame',
    params: { guildId: '1', format: 'image' },
    expectedContentType: 'image',
    saveImage: true,
  },
]

interface TestResult {
  name: string
  endpoint: string
  status: number
  success: boolean
  duration: number
  contentType?: string
  error?: string
  imagePath?: string
}

const results: TestResult[] = []

async function testFrame(test: FrameTest): Promise<void> {
  const params = new URLSearchParams(test.params || {})
  const url = `${baseUrl}${test.endpoint}${params.toString() ? '?' + params.toString() : ''}`
  
  console.log(`\n🔍 Testing: ${test.name}`)
  console.log(`   URL: ${url}`)

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Frame-Tester/1.0',
      },
    })

    const duration = Date.now() - startTime
    const contentType = response.headers.get('content-type') || 'unknown'
    const status = response.status

    console.log(`   Status: ${status}`)
    console.log(`   Content-Type: ${contentType}`)
    console.log(`   Duration: ${duration}ms`)

    const success = status === 200

    const result: TestResult = {
      name: test.name,
      endpoint: test.endpoint,
      status,
      success,
      duration,
      contentType,
    }

    // Save image if requested and successful
    if (success && test.saveImage && contentType.includes('image')) {
      try {
        const buffer = await response.arrayBuffer()
        const fileName = test.name.toLowerCase().replace(/\s+/g, '-') + '.png'
        const filePath = join(outputDir, fileName)
        
        writeFileSync(filePath, Buffer.from(buffer))
        result.imagePath = filePath
        console.log(`   ✓ Image saved: ${fileName}`)
      } catch (saveError) {
        console.log(`   ⚠️  Failed to save image: ${saveError}`)
      }
    }

    // Log response preview for non-image content
    if (success && !contentType.includes('image')) {
      try {
        const text = await response.text()
        const preview = text.slice(0, 200).replace(/\n/g, ' ')
        console.log(`   Preview: ${preview}${text.length > 200 ? '...' : ''}`)
      } catch (e) {
        // Ignore preview errors
      }
    }

    if (success) {
      console.log(`   ✓ PASS`)
    } else {
      const errorText = await response.text().catch(() => 'Unable to read error')
      result.error = errorText
      console.log(`   ✗ FAIL: ${errorText.slice(0, 100)}`)
    }

    results.push(result)
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.log(`   ✗ FAIL: ${errorMessage}`)
    
    results.push({
      name: test.name,
      endpoint: test.endpoint,
      status: 0,
      success: false,
      duration,
      error: errorMessage,
    })
  }
}

async function runTests() {
  console.log('=' .repeat(70))
  console.log('🎨 FRAME API TEST SUITE')
  console.log('=' .repeat(70))

  for (const test of frameTests) {
    await testFrame(test)
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(70))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`\nTotal Tests: ${total}`)
  console.log(`✓ Passed: ${passed}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`⏱️  Total Duration: ${totalDuration}ms`)
  console.log(`📁 Images saved to: ${outputDir}`)

  // Group by status
  const byStatus: Record<number, TestResult[]> = {}
  results.forEach(r => {
    if (!byStatus[r.status]) byStatus[r.status] = []
    byStatus[r.status].push(r)
  })

  console.log('\n📈 Results by Status:')
  Object.entries(byStatus)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([status, tests]) => {
      const statusCode = Number(status)
      const symbol = statusCode === 200 ? '✓' : statusCode === 0 ? '⚠️' : '✗'
      console.log(`   ${symbol} ${status === '0' ? 'ERROR' : status}: ${tests.length} tests`)
    })

  // Failed tests detail
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`\n   ${r.name}`)
        console.log(`   Endpoint: ${r.endpoint}`)
        console.log(`   Status: ${r.status}`)
        console.log(`   Error: ${r.error?.slice(0, 150)}`)
      })
  }

  // Saved images
  const savedImages = results.filter(r => r.imagePath)
  if (savedImages.length > 0) {
    console.log('\n🖼️  Saved Images:')
    savedImages.forEach(r => {
      console.log(`   ✓ ${r.name} → ${r.imagePath}`)
    })
  }

  console.log('\n' + '='.repeat(70))

  // Write JSON report
  const reportPath = join(outputDir, 'test-report.json')
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      duration: totalDuration,
    },
    results,
  }, null, 2))
  console.log(`\n📄 JSON report saved: ${reportPath}`)

  if (failed > 0) {
    process.exit(1)
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(baseUrl, { method: 'HEAD' })
    return response.status !== 0
  } catch {
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()
  
  if (!serverRunning) {
    console.error(`❌ Server not running at ${baseUrl}`)
    console.error('   Please start the dev server first: pnpm dev')
    process.exit(1)
  }

  console.log(`✓ Server detected at ${baseUrl}\n`)
  
  await runTests()
}

main().catch(error => {
  console.error('\n💥 Test runner failed:', error)
  process.exit(1)
})
