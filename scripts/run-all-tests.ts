#!/usr/bin/env tsx
/**
 * Comprehensive Test Suite Runner
 * Runs all available tests and generates a normalized report
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)

interface TestResult {
  name: string
  category: string
  passed: boolean
  duration: number
  output: string
  error?: string
}

const results: TestResult[] = []

async function runTest(
  name: string,
  category: string,
  command: string,
  timeoutMs = 120000
): Promise<TestResult> {
  const start = Date.now()
  console.log(`\n🧪 Running: ${name}`)
  console.log(`   Command: ${command}`)
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })
    const duration = Date.now() - start
    const output = stdout + (stderr || '')
    
    // Determine pass/fail based on exit code and output
    const passed = !output.toLowerCase().includes('error') || 
                   output.includes('All tests passed') ||
                   output.includes('✅') ||
                   output.includes('passed')
    
    console.log(passed ? '   ✅ PASS' : '   ❌ FAIL')
    console.log(`   Duration: ${duration}ms`)
    
    return {
      name,
      category,
      passed,
      duration,
      output: output.slice(0, 5000), // Truncate long output
    }
  } catch (error: any) {
    const duration = Date.now() - start
    console.log(`   ❌ FAIL (${error.code || 'error'})`)
    console.log(`   Duration: ${duration}ms`)
    
    return {
      name,
      category,
      passed: false,
      duration,
      output: error.stdout || '',
      error: error.message || String(error),
    }
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Test Suite')
  console.log('=====================================\n')
  
  const serverUrl = 'http://localhost:3000'
  
  // Category 1: Integration Tests
  console.log('\n📦 CATEGORY 1: Integration Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Leaderboard Integration',
    'integration',
    'pnpm exec tsx scripts/test-leaderboard-integration.ts'
  ))
  
  // Category 2: API Route Tests
  console.log('\n📦 CATEGORY 2: API Route Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'All API Routes',
    'api',
    'bash scripts/test-all-routes.sh'
  ))
  
  // Category 3: Frame Tests
  console.log('\n📦 CATEGORY 3: Frame Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Frame Images',
    'frames',
    'bash scripts/test-frame-images.sh',
    60000
  ))
  
  results.push(await runTest(
    'Frame Cache',
    'frames',
    'bash scripts/test-frame-cache.sh',
    30000
  ))
  
  // Category 4: Production Tests
  console.log('\n📦 CATEGORY 4: Production Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Production Environment',
    'production',
    'node scripts/test-production.js',
    60000
  ))
  
  // Category 5: Playwright E2E Tests
  console.log('\n📦 CATEGORY 5: Playwright E2E Tests')
  console.log('==================================')
  
  // Find all Playwright test files
  try {
    const files = await fs.readdir('e2e')
    const specFiles = files.filter(f => f.endsWith('.spec.ts'))
    
    for (const file of specFiles) {
      results.push(await runTest(
        `Playwright: ${file}`,
        'e2e',
        `pnpm exec playwright test ${file}`,
        120000
      ))
    }
  } catch (e) {
    console.log('⚠️  No e2e directory found, skipping Playwright tests')
  }
  
  // Category 6: Contract/Webhook Tests
  console.log('\n📦 CATEGORY 6: Contract/Webhook Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Webhook Functionality',
    'webhooks',
    'bash scripts/test-webhook.sh',
    30000
  ))
  
  // Category 7: Badge Tests
  console.log('\n📦 CATEGORY 7: Badge Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Badge Collection Sizes',
    'badges',
    'bash test-badge-collection-sizes.sh',
    30000
  ))
  
  // Category 8: Multi-chain Tests
  console.log('\n📦 CATEGORY 8: Multi-chain Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Multi-chain Frames',
    'multichain',
    'bash test-multichain-frames.sh',
    60000
  ))
  
  // Category 9: Device Tests
  console.log('\n📦 CATEGORY 9: Device Tests')
  console.log('==================================')
  
  results.push(await runTest(
    'Device Compatibility',
    'devices',
    'bash scripts/test-devices.sh',
    90000
  ))
  
  // Generate Report
  console.log('\n\n📊 COMPREHENSIVE TEST REPORT')
  console.log('============================\n')
  
  const categorySummary = new Map<string, { total: number; passed: number }>()
  
  results.forEach(r => {
    const stats = categorySummary.get(r.category) || { total: 0, passed: 0 }
    stats.total++
    if (r.passed) stats.passed++
    categorySummary.set(r.category, stats)
  })
  
  console.log('Summary by Category:')
  console.log('===================')
  categorySummary.forEach((stats, category) => {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1)
    const status = stats.passed === stats.total ? '✅' : '⚠️'
    console.log(`${status} ${category.padEnd(15)} ${stats.passed}/${stats.total} (${passRate}%)`)
  })
  
  const totalPassed = results.filter(r => r.passed).length
  const totalTests = results.length
  const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1)
  
  console.log('\nOverall Results:')
  console.log('===============')
  console.log(`Total Tests:    ${totalTests}`)
  console.log(`Passed:         ${totalPassed}`)
  console.log(`Failed:         ${totalTests - totalPassed}`)
  console.log(`Pass Rate:      ${overallPassRate}%`)
  console.log(`Status:         ${totalPassed === totalTests ? '✅ ALL PASS' : '⚠️ FAILURES DETECTED'}`)
  
  // Detailed Failed Tests
  const failed = results.filter(r => !r.passed)
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:')
    console.log('================')
    failed.forEach(f => {
      console.log(`\n${f.name} (${f.category})`)
      console.log(`Duration: ${f.duration}ms`)
      if (f.error) {
        console.log(`Error: ${f.error.slice(0, 200)}`)
      }
      console.log(`Output excerpt: ${f.output.slice(0, 300)}`)
    })
  }
  
  // Write detailed report to file
  const reportPath = '/tmp/comprehensive-test-report.json'
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  
  // Exit with appropriate code
  const exitCode = totalPassed === totalTests ? 0 : 1
  process.exit(exitCode)
}

main().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
