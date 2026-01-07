#!/usr/bin/env node
// Browser test to catch runtime JavaScript errors
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3002';
const errors = [];
const warnings = [];

console.log(`🌐 Testing ${url} in headless browser...`);

const browser = await chromium.launch();
const page = await browser.newPage();

// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  } else if (msg.type() === 'warning') {
    warnings.push(msg.text());
  }
});

// Capture page errors
page.on('pageerror', error => {
  errors.push(`Page Error: ${error.message}`);
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  // Wait for React to hydrate and components to mount
  await page.waitForTimeout(5000);
  
  // Check for specific error patterns
  const hasUtilError = errors.some(e => 
    e.includes('util.deprecate') || 
    e.includes('The "original" argument must be of type Function')
  );
  
  const hasAppError = errors.some(e =>
    e.includes('Application error') ||
    e.includes('client-side exception')
  );
  
  console.log(`\n📊 Results:`);
  console.log(`   Total Errors: ${errors.length}`);
  console.log(`   Total Warnings: ${warnings.length}`);
  
  if (hasUtilError) {
    console.log('\n❌ CRITICAL: util.deprecate error detected!');
    console.log(errors.filter(e => e.includes('util') || e.includes('original')).join('\n'));
  }
  
  if (hasAppError) {
    console.log('\n❌ CRITICAL: Application error detected!');
  }
  
  if (errors.length > 0) {
    console.log('\n🔴 Console Errors:');
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err.substring(0, 150)}`));
  }
  
  if (errors.length === 0) {
    console.log('\n✅ No JavaScript errors detected!');
  }
  
  await browser.close();
  
  // Exit with error if critical errors found
  if (hasUtilError || hasAppError || errors.length > 5) {
    process.exit(1);
  }
  
} catch (error) {
  console.error(`❌ Browser test failed: ${error.message}`);
  await browser.close();
  process.exit(1);
}
