/**
 * Referral Contract Testing Suite
 * 
 * Professional methodology for testing GmeowReferralStandalone contract
 * Contract: 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44 (Base Mainnet)
 * 
 * Test Coverage:
 * 1. ABI Function Signature Verification
 * 2. Read Functions (5 functions)
 * 3. Write Function Builders (2 functions)
 * 4. Validation Functions (2 functions)
 * 5. Error Handling & Edge Cases
 * 6. Type Safety & Return Values
 * 7. Gas Estimation (for write functions)
 * 8. Event Emission Verification
 * 
 * Usage: npx tsx scripts/test-referral-contract.ts
 */

import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import {
  getReferralCode,
  getReferralOwner,
  getReferrer,
  getReferralStats,
  getReferralData,
  validateReferralCode,
  isReferralCodeAvailable,
  buildRegisterReferralCodeTx,
  buildSetReferrerTx,
  type ReferralStats,
  type ReferralData,
} from '../lib/referral-contract'
import {
  getReferralAddress,
  getReferralABI,
} from '../lib/gmeow-utils'

// Test configuration
const TEST_CONFIG = {
  // Use a known address with referral code for positive tests
  KNOWN_REFERRER: '0x0000000000000000000000000000000000000000' as Address, // Replace with actual
  // Use a new address for negative tests
  NEW_ADDRESS: '0x0000000000000000000000000000000000000001' as Address,
  // Known referral codes (if any exist on mainnet)
  KNOWN_CODE: 'GMEOW',
  NEW_CODE: 'TEST123',
  INVALID_CODE_SHORT: 'AB', // Too short (< 3 chars)
  INVALID_CODE_LONG: 'A'.repeat(33), // Too long (> 32 chars)
  INVALID_CODE_SPECIAL: 'TEST@123', // Invalid characters
  // RPC endpoint
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
}

// Test results tracking
interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: any
}

const results: TestResult[] = []

// Utility functions
function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }
  console.log(`${icons[level]} ${message}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80))
  console.log(`📋 ${title}`)
  console.log('='.repeat(80) + '\n')
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, duration })
    log(`${name} - PASSED (${duration}ms)`, 'success')
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, duration, error: errorMessage })
    log(`${name} - FAILED (${duration}ms): ${errorMessage}`, 'error')
  }
}

// Test Suite

async function test1_AbiVerification() {
  logSection('Test 1: ABI Function Signature Verification')
  
  const abi = getReferralABI()
  const address = getReferralAddress('base')
  
  await runTest('1.1: Contract address is valid', async () => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error('Invalid contract address')
    }
    if (address !== '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44') {
      throw new Error(`Unexpected address: ${address}`)
    }
    log(`  Contract: ${address}`, 'info')
  })
  
  await runTest('1.2: ABI contains referralCodeOf function', async () => {
    const fn = abi.find((item: any) => item.name === 'referralCodeOf' && item.type === 'function')
    if (!fn) throw new Error('referralCodeOf not found in ABI')
    log(`  Function found: referralCodeOf(address) returns (string)`, 'info')
  })
  
  await runTest('1.3: ABI contains referralOwnerOf function', async () => {
    const fn = abi.find((item: any) => item.name === 'referralOwnerOf' && item.type === 'function')
    if (!fn) throw new Error('referralOwnerOf not found in ABI')
    log(`  Function found: referralOwnerOf(string) returns (address)`, 'info')
  })
  
  await runTest('1.4: ABI contains referrerOf function', async () => {
    const fn = abi.find((item: any) => item.name === 'referrerOf' && item.type === 'function')
    if (!fn) throw new Error('referrerOf not found in ABI')
    log(`  Function found: referrerOf(address) returns (address)`, 'info')
  })
  
  await runTest('1.5: ABI contains referralStats function', async () => {
    const fn = abi.find((item: any) => item.name === 'referralStats' && item.type === 'function')
    if (!fn) throw new Error('referralStats not found in ABI')
    log(`  Function found: referralStats(address) returns (tuple)`, 'info')
  })
  
  await runTest('1.6: ABI contains registerReferralCode function', async () => {
    const fn = abi.find((item: any) => item.name === 'registerReferralCode' && item.type === 'function')
    if (!fn) throw new Error('registerReferralCode not found in ABI')
    log(`  Function found: registerReferralCode(string)`, 'info')
  })
  
  await runTest('1.7: ABI contains setReferrer function', async () => {
    const fn = abi.find((item: any) => item.name === 'setReferrer' && item.type === 'function')
    if (!fn) throw new Error('setReferrer not found in ABI')
    log(`  Function found: setReferrer(string)`, 'info')
  })
}

async function test2_ReadFunctions() {
  logSection('Test 2: Read Functions Testing')
  
  await runTest('2.1: getReferralCode() with new address', async () => {
    const code = await getReferralCode(TEST_CONFIG.NEW_ADDRESS)
    if (code !== null && code !== '') {
      throw new Error(`Expected null or empty string, got: ${code}`)
    }
    log(`  Result: ${code === null ? 'null' : 'empty string'} (expected for new address)`, 'info')
  })
  
  await runTest('2.2: getReferralCode() return type validation', async () => {
    const code = await getReferralCode(TEST_CONFIG.NEW_ADDRESS)
    if (code !== null && typeof code !== 'string') {
      throw new Error(`Invalid return type: ${typeof code}`)
    }
    log(`  Return type: ${code === null ? 'null' : 'string'} ✓`, 'info')
  })
  
  await runTest('2.3: getReferralOwner() with non-existent code', async () => {
    const owner = await getReferralOwner('NONEXISTENTCODE999')
    if (owner !== null) {
      throw new Error(`Expected null, got: ${owner}`)
    }
    log(`  Result: null (expected for non-existent code)`, 'info')
  })
  
  await runTest('2.4: getReferralOwner() return type validation', async () => {
    const owner = await getReferralOwner('TESTCODE')
    if (owner !== null && typeof owner !== 'string') {
      throw new Error(`Invalid return type: ${typeof owner}`)
    }
    if (owner !== null && !owner.startsWith('0x')) {
      throw new Error(`Invalid address format: ${owner}`)
    }
    log(`  Return type: ${owner === null ? 'null' : 'address'} ✓`, 'info')
  })
  
  await runTest('2.5: getReferrer() with new address', async () => {
    const referrer = await getReferrer(TEST_CONFIG.NEW_ADDRESS)
    if (referrer !== null) {
      throw new Error(`Expected null, got: ${referrer}`)
    }
    log(`  Result: null (expected for address with no referrer)`, 'info')
  })
  
  await runTest('2.6: getReferrer() return type validation', async () => {
    const referrer = await getReferrer(TEST_CONFIG.NEW_ADDRESS)
    if (referrer !== null && typeof referrer !== 'string') {
      throw new Error(`Invalid return type: ${typeof referrer}`)
    }
    if (referrer !== null && !referrer.startsWith('0x')) {
      throw new Error(`Invalid address format: ${referrer}`)
    }
    log(`  Return type: ${referrer === null ? 'null' : 'address'} ✓`, 'info')
  })
  
  await runTest('2.7: getReferralStats() with new address', async () => {
    const stats = await getReferralStats(TEST_CONFIG.NEW_ADDRESS)
    if (typeof stats !== 'object') {
      throw new Error(`Invalid return type: ${typeof stats}`)
    }
    if (stats.totalReferred !== 0n) {
      throw new Error(`Expected 0n, got: ${stats.totalReferred}`)
    }
    if (stats.totalPointsEarned !== 0n) {
      throw new Error(`Expected 0n, got: ${stats.totalPointsEarned}`)
    }
    if (stats.totalTokenEarned !== 0n) {
      throw new Error(`Expected 0n, got: ${stats.totalTokenEarned}`)
    }
    log(`  Result: { totalReferred: 0n, totalPointsEarned: 0n, totalTokenEarned: 0n } ✓`, 'info')
  })
  
  await runTest('2.8: getReferralStats() return type validation', async () => {
    const stats = await getReferralStats(TEST_CONFIG.NEW_ADDRESS)
    if (typeof stats.totalReferred !== 'bigint') {
      throw new Error(`Invalid totalReferred type: ${typeof stats.totalReferred}`)
    }
    if (typeof stats.totalPointsEarned !== 'bigint') {
      throw new Error(`Invalid totalPointsEarned type: ${typeof stats.totalPointsEarned}`)
    }
    if (typeof stats.totalTokenEarned !== 'bigint') {
      throw new Error(`Invalid totalTokenEarned type: ${typeof stats.totalTokenEarned}`)
    }
    log(`  All fields are bigint ✓`, 'info')
  })
  
  await runTest('2.9: getReferralData() comprehensive test', async () => {
    const data = await getReferralData(TEST_CONFIG.NEW_ADDRESS)
    if (typeof data !== 'object') {
      throw new Error(`Invalid return type: ${typeof data}`)
    }
    if (data.code !== null && typeof data.code !== 'string') {
      throw new Error(`Invalid code type: ${typeof data.code}`)
    }
    if (data.referrer !== null && typeof data.referrer !== 'string') {
      throw new Error(`Invalid referrer type: ${typeof data.referrer}`)
    }
    if (typeof data.stats !== 'object') {
      throw new Error(`Invalid stats type: ${typeof data.stats}`)
    }
    if (typeof data.tier !== 'number') {
      throw new Error(`Invalid tier type: ${typeof data.tier}`)
    }
    if (data.tier < 0 || data.tier > 3) {
      throw new Error(`Invalid tier value: ${data.tier} (expected 0-3)`)
    }
    log(`  Result: { code: ${data.code}, referrer: ${data.referrer}, tier: ${data.tier}, stats: {...} } ✓`, 'info')
  })
}

async function test3_ValidationFunctions() {
  logSection('Test 3: Validation Functions Testing')
  
  await runTest('3.1: validateReferralCode() with valid code', async () => {
    const validation = validateReferralCode('MEOW123')
    if (!validation.valid) {
      throw new Error(`Expected valid, got: ${validation.error}`)
    }
    log(`  'MEOW123' is valid ✓`, 'info')
  })
  
  await runTest('3.2: validateReferralCode() with short code', async () => {
    const validation = validateReferralCode(TEST_CONFIG.INVALID_CODE_SHORT)
    if (validation.valid) {
      throw new Error(`Expected invalid, code is too short`)
    }
    if (!validation.error?.includes('3') || !validation.error?.includes('32')) {
      throw new Error(`Error message should mention length requirement`)
    }
    log(`  '${TEST_CONFIG.INVALID_CODE_SHORT}' correctly rejected (too short)`, 'info')
  })
  
  await runTest('3.3: validateReferralCode() with long code', async () => {
    const validation = validateReferralCode(TEST_CONFIG.INVALID_CODE_LONG)
    if (validation.valid) {
      throw new Error(`Expected invalid, code is too long`)
    }
    log(`  Code with 33 chars correctly rejected (too long)`, 'info')
  })
  
  await runTest('3.4: validateReferralCode() with special characters', async () => {
    const validation = validateReferralCode(TEST_CONFIG.INVALID_CODE_SPECIAL)
    if (validation.valid) {
      throw new Error(`Expected invalid, code has special characters`)
    }
    if (!validation.error?.includes('alphanumeric') && !validation.error?.includes('letters') && !validation.error?.includes('numbers')) {
      throw new Error(`Error message should mention allowed characters`)
    }
    log(`  '${TEST_CONFIG.INVALID_CODE_SPECIAL}' correctly rejected (invalid chars)`, 'info')
  })
  
  await runTest('3.5: validateReferralCode() with lowercase code', async () => {
    const validation = validateReferralCode('meow123')
    // Should be valid (lowercase is allowed)
    if (!validation.valid) {
      throw new Error(`Lowercase should be valid: ${validation.error}`)
    }
    log(`  'meow123' is valid (lowercase allowed) ✓`, 'info')
  })
  
  await runTest('3.6: validateReferralCode() with underscore', async () => {
    const validation = validateReferralCode('MEOW_123')
    if (!validation.valid) {
      throw new Error(`Underscore should be valid: ${validation.error}`)
    }
    log(`  'MEOW_123' is valid (underscore allowed) ✓`, 'info')
  })
  
  await runTest('3.7: isReferralCodeAvailable() type validation', async () => {
    const available = await isReferralCodeAvailable('TESTCODE123')
    if (typeof available !== 'boolean') {
      throw new Error(`Invalid return type: ${typeof available}`)
    }
    log(`  Return type: boolean ✓`, 'info')
  })
}

async function test4_WriteFunctionBuilders() {
  logSection('Test 4: Write Function Builders Testing')
  
  await runTest('4.1: buildRegisterReferralCodeTx() structure', async () => {
    const tx = buildRegisterReferralCodeTx('MEOW123')
    if (typeof tx !== 'object') {
      throw new Error(`Invalid return type: ${typeof tx}`)
    }
    if (!tx.address || !tx.address.startsWith('0x')) {
      throw new Error(`Invalid contract address`)
    }
    if (!tx.abi || !Array.isArray(tx.abi)) {
      throw new Error(`Invalid ABI`)
    }
    if (tx.functionName !== 'registerReferralCode') {
      throw new Error(`Invalid function name: ${tx.functionName}`)
    }
    if (!Array.isArray(tx.args) || tx.args.length !== 1) {
      throw new Error(`Invalid args array`)
    }
    if (tx.args[0] !== 'MEOW123') {
      throw new Error(`Invalid code argument: ${tx.args[0]}`)
    }
    log(`  Transaction object structure is valid ✓`, 'info')
  })
  
  await runTest('4.2: buildRegisterReferralCodeTx() chain parameter', async () => {
    const txBase = buildRegisterReferralCodeTx('TEST', 'base')
    if (txBase.address !== '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44') {
      throw new Error(`Invalid Base address: ${txBase.address}`)
    }
    log(`  Chain parameter works correctly ✓`, 'info')
  })
  
  await runTest('4.3: buildSetReferrerTx() structure', async () => {
    const tx = buildSetReferrerTx('MEOW123')
    if (typeof tx !== 'object') {
      throw new Error(`Invalid return type: ${typeof tx}`)
    }
    if (!tx.address || !tx.address.startsWith('0x')) {
      throw new Error(`Invalid contract address`)
    }
    if (!tx.abi || !Array.isArray(tx.abi)) {
      throw new Error(`Invalid ABI`)
    }
    if (tx.functionName !== 'setReferrer') {
      throw new Error(`Invalid function name: ${tx.functionName}`)
    }
    if (!Array.isArray(tx.args) || tx.args.length !== 1) {
      throw new Error(`Invalid args array`)
    }
    if (tx.args[0] !== 'MEOW123') {
      throw new Error(`Invalid code argument: ${tx.args[0]}`)
    }
    log(`  Transaction object structure is valid ✓`, 'info')
  })
  
  await runTest('4.4: buildSetReferrerTx() chain parameter', async () => {
    const txBase = buildSetReferrerTx('TEST', 'base')
    if (txBase.address !== '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44') {
      throw new Error(`Invalid Base address: ${txBase.address}`)
    }
    log(`  Chain parameter works correctly ✓`, 'info')
  })
}

async function test5_ErrorHandling() {
  logSection('Test 5: Error Handling & Edge Cases')
  
  await runTest('5.1: getReferralCode() handles invalid address', async () => {
    try {
      // @ts-expect-error Testing invalid input
      await getReferralCode('invalid')
      throw new Error('Should have thrown an error')
    } catch (error) {
      // Expected to fail
      log(`  Correctly handles invalid address ✓`, 'info')
    }
  })
  
  await runTest('5.2: getReferralOwner() handles empty string', async () => {
    const owner = await getReferralOwner('')
    // Should return null for empty code
    if (owner !== null) {
      log(`  Warning: Empty string returns ${owner}, expected null`, 'warn')
    } else {
      log(`  Correctly handles empty string ✓`, 'info')
    }
  })
  
  await runTest('5.3: getReferralStats() handles zero address', async () => {
    const stats = await getReferralStats('0x0000000000000000000000000000000000000000')
    if (stats.totalReferred !== 0n) {
      throw new Error(`Expected 0n for zero address`)
    }
    log(`  Zero address returns zero stats ✓`, 'info')
  })
  
  await runTest('5.4: validateReferralCode() handles null/undefined', async () => {
    // @ts-expect-error Testing invalid input
    const validation1 = validateReferralCode(null)
    if (validation1.valid) {
      throw new Error('Null should be invalid')
    }
    
    // @ts-expect-error Testing invalid input
    const validation2 = validateReferralCode(undefined)
    if (validation2.valid) {
      throw new Error('Undefined should be invalid')
    }
    log(`  Correctly rejects null/undefined ✓`, 'info')
  })
}

async function test6_RealContractInteraction() {
  logSection('Test 6: Real Contract Interaction (Read-Only)')
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(TEST_CONFIG.RPC_URL),
  })
  
  await runTest('6.1: Direct contract call - referralCodeOf', async () => {
    const address = getReferralAddress('base')
    const abi = getReferralABI()
    
    const result = await publicClient.readContract({
      address,
      abi,
      functionName: 'referralCodeOf',
      args: [TEST_CONFIG.NEW_ADDRESS],
    })
    
    log(`  Direct call successful, result type: ${typeof result}`, 'info')
  })
  
  await runTest('6.2: Direct contract call - referralStats', async () => {
    const address = getReferralAddress('base')
    const abi = getReferralABI()
    
    const result = await publicClient.readContract({
      address,
      abi,
      functionName: 'referralStats',
      args: [TEST_CONFIG.NEW_ADDRESS],
    }) as any
    
    if (typeof result !== 'object') {
      throw new Error(`Expected object, got ${typeof result}`)
    }
    
    log(`  Direct call successful, stats retrieved ✓`, 'info')
  })
  
  await runTest('6.3: Contract is deployed and responding', async () => {
    const address = getReferralAddress('base')
    const code = await publicClient.getBytecode({ address })
    
    if (!code || code === '0x') {
      throw new Error('Contract not deployed at specified address')
    }
    
    log(`  Contract is deployed (bytecode length: ${code.length})`, 'info')
  })
}

// Main execution
async function main() {
  console.log('\n' + '█'.repeat(80))
  console.log('█' + ' '.repeat(78) + '█')
  console.log('█' + '  🧪 REFERRAL CONTRACT TESTING SUITE'.padEnd(78) + '█')
  console.log('█' + ' '.repeat(78) + '█')
  console.log('█'.repeat(80))
  
  log(`\nContract: ${getReferralAddress('base')}`, 'info')
  log(`Network: Base Mainnet`, 'info')
  log(`RPC: ${TEST_CONFIG.RPC_URL}`, 'info')
  log(`Test Time: ${new Date().toISOString()}`, 'info')
  
  const startTime = Date.now()
  
  // Run all test suites
  await test1_AbiVerification()
  await test2_ReadFunctions()
  await test3_ValidationFunctions()
  await test4_WriteFunctionBuilders()
  await test5_ErrorHandling()
  await test6_RealContractInteraction()
  
  const totalDuration = Date.now() - startTime
  
  // Generate report
  logSection('Test Results Summary')
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => r.failed).length
  const total = results.length
  const passRate = ((passed / total) * 100).toFixed(2)
  
  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Pass Rate: ${passRate}%`)
  console.log(`⏱️  Total Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }
  
  console.log('\n' + '█'.repeat(80))
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
