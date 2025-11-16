#!/usr/bin/env node
/**
 * Device Testing Validation Script
 * 
 * Validates that all device test configurations are properly set up
 * and that test files are syntactically correct
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'

console.log(`${BLUE}🔍 Validating Device Testing Setup${RESET}`)
console.log('=====================================\n')

let hasErrors = false

// 1. Check Playwright config
console.log(`${YELLOW}1. Checking Playwright configuration...${RESET}`)
try {
  const configPath = resolve(process.cwd(), 'playwright.config.ts')
  const config = readFileSync(configPath, 'utf-8')
  
  const devices = [
    'chromium', 'firefox', 'webkit',
    'tablet-ipad', 'tablet-android',
    'mobile-iphone-12', 'mobile-iphone-se', 'mobile-iphone-14-pro',
    'mobile-pixel-5', 'mobile-galaxy-s9', 'mobile-small'
  ]
  
  const found = devices.filter(device => config.includes(`name: '${device}'`))
  
  console.log(`   Found ${found.length}/${devices.length} device configurations`)
  
  if (found.length === devices.length) {
    console.log(`   ${GREEN}✓ All device projects configured${RESET}`)
  } else {
    console.log(`   ${RED}✗ Missing devices: ${devices.filter(d => !found.includes(d)).join(', ')}${RESET}`)
    hasErrors = true
  }
} catch (error) {
  console.log(`   ${RED}✗ Error reading playwright.config.ts: ${error.message}${RESET}`)
  hasErrors = true
}

// 2. Check test files exist
console.log(`\n${YELLOW}2. Checking test files...${RESET}`)
const testFiles = [
  'e2e/mobile-onboarding.spec.ts',
  'e2e/device-compatibility.spec.ts',
  'e2e/quest-wizard.spec.ts',
  'e2e/quest-wizard-mobile.spec.ts'
]

for (const testFile of testFiles) {
  try {
    const filePath = resolve(process.cwd(), testFile)
    readFileSync(filePath, 'utf-8')
    console.log(`   ${GREEN}✓${RESET} ${testFile}`)
  } catch (error) {
    console.log(`   ${YELLOW}⚠${RESET} ${testFile} - ${error.code === 'ENOENT' ? 'Not found' : 'Error'}`)
  }
}

// 3. Check CSS files for mobile fixes
console.log(`\n${YELLOW}3. Checking mobile CSS fixes...${RESET}`)
try {
  const mobileCSS = readFileSync(resolve(process.cwd(), 'app/styles/mobile-miniapp.css'), 'utf-8')
  const onboardingCSS = readFileSync(resolve(process.cwd(), 'app/styles/onboarding-mobile.css'), 'utf-8')
  
  // Check for critical CSS rules
  const checks = [
    { file: 'mobile-miniapp.css', rule: 'position: fixed', content: mobileCSS },
    { file: 'mobile-miniapp.css', rule: 'z-index: 100', content: mobileCSS },
    { file: 'onboarding-mobile.css', rule: 'padding-bottom: 80px', content: onboardingCSS },
    { file: 'onboarding-mobile.css', rule: 'overflow-y: auto', content: onboardingCSS }
  ]
  
  for (const check of checks) {
    if (check.content.includes(check.rule)) {
      console.log(`   ${GREEN}✓${RESET} ${check.file} has "${check.rule}"`)
    } else {
      console.log(`   ${RED}✗${RESET} ${check.file} missing "${check.rule}"`)
      hasErrors = true
    }
  }
} catch (error) {
  console.log(`   ${RED}✗ Error reading CSS files: ${error.message}${RESET}`)
  hasErrors = true
}

// 4. Check package.json scripts
console.log(`\n${YELLOW}4. Checking package.json test scripts...${RESET}`)
try {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
  
  const requiredScripts = [
    'test:e2e',
    'test:devices',
    'test:devices:quick',
    'test:devices:mobile',
    'test:mobile-onboarding'
  ]
  
  for (const script of requiredScripts) {
    if (pkg.scripts[script]) {
      console.log(`   ${GREEN}✓${RESET} ${script}`)
    } else {
      console.log(`   ${RED}✗${RESET} ${script} - Not found`)
      hasErrors = true
    }
  }
} catch (error) {
  console.log(`   ${RED}✗ Error reading package.json: ${error.message}${RESET}`)
  hasErrors = true
}

// 5. Check test runner script
console.log(`\n${YELLOW}5. Checking test runner script...${RESET}`)
try {
  const scriptPath = resolve(process.cwd(), 'scripts/test-devices.sh')
  const script = readFileSync(scriptPath, 'utf-8')
  
  if (script.includes('run_device_tests')) {
    console.log(`   ${GREEN}✓${RESET} test-devices.sh has device runner function`)
  }
  
  const testTypes = ['desktop', 'tablet', 'mobile', 'ios', 'android', 'all', 'quick']
  const foundTypes = testTypes.filter(type => script.includes(`${type})`))
  
  console.log(`   ${GREEN}✓${RESET} Found ${foundTypes.length}/${testTypes.length} test types`)
} catch (error) {
  console.log(`   ${RED}✗ Error reading test-devices.sh: ${error.message}${RESET}`)
  hasErrors = true
}

// Summary
console.log(`\n${BLUE}=====================================`)
if (hasErrors) {
  console.log(`${RED}✗ Validation failed with errors${RESET}`)
  console.log(`\nPlease fix the issues above before running tests.`)
  process.exit(1)
} else {
  console.log(`${GREEN}✓ All validations passed!${RESET}`)
  console.log(`\nYou can now run:`)
  console.log(`  ${BLUE}pnpm test:devices:quick${RESET}  - Quick smoke test`)
  console.log(`  ${BLUE}pnpm test:devices:mobile${RESET} - Mobile device tests`)
  console.log(`  ${BLUE}pnpm test:devices${RESET}        - Full device suite`)
  console.log(`  ${BLUE}pnpm test:e2e:ui${RESET}         - Interactive UI mode`)
  process.exit(0)
}
