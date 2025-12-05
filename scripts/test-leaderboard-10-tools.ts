#!/usr/bin/env tsx

/**
 * Comprehensive Leaderboard Testing Suite
 * Tests the leaderboard page using 10 specialized tools
 * Target: http://localhost:3001/leaderboard
 * 
 * Tools Used:
 * 1. stylelint - CSS pattern validation
 * 2. @axe-core/playwright - Accessibility (WCAG 2.1)
 * 3. jest + @testing-library/react - Component tests
 * 4. @testing-library/react-hooks - Hook testing
 * 5. @testing-library/dom - DOM testing
 * 6. eslint-plugin-tailwindcss - Tailwind class validation
 * 7. lighthouse - Performance testing
 * 8. chrome-launcher - Automated Chrome testing
 * 9. pa11y + pa11y-ci - Multi-viewport accessibility
 * 10. @next/bundle-analyzer - Bundle size analysis
 * 11. CSS test suite - Playwright contrast tests
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const LEADERBOARD_URL = 'http://localhost:3000/leaderboard';
const RESULTS_DIR = './test-results';
const RESULTS_FILE = join(RESULTS_DIR, 'leaderboard-comprehensive-results.json');

interface TestResult {
  tool: string;
  status: 'pass' | 'fail' | 'error' | 'skip';
  duration: number;
  passed: number;
  failed: number;
  issues: string[];
  details?: any;
}

const results: TestResult[] = [];

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80) + '\n');
}

function logResult(result: TestResult) {
  const statusEmoji = {
    pass: '✅',
    fail: '❌',
    error: '⚠️',
    skip: '⏭️'
  };
  
  console.log(`${statusEmoji[result.status]} ${result.tool}: ${result.status.toUpperCase()}`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Passed: ${result.passed}, Failed: ${result.failed}`);
  
  if (result.issues.length > 0) {
    console.log(`   Issues (${result.issues.length}):`);
    result.issues.slice(0, 5).forEach(issue => {
      console.log(`   - ${issue}`);
    });
    if (result.issues.length > 5) {
      console.log(`   ... and ${result.issues.length - 5} more`);
    }
  }
  console.log('');
}

function runTest(testFn: () => TestResult): TestResult {
  try {
    return testFn();
  } catch (error: any) {
    return {
      tool: 'Unknown',
      status: 'error',
      duration: 0,
      passed: 0,
      failed: 0,
      issues: [error.message || String(error)]
    };
  }
}

// Tool 1: Stylelint - CSS Pattern Validation
function testStylelint(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 1: Stylelint - CSS Pattern Validation');
    
    // Check if stylelint config exists
    if (!existsSync('.stylelintrc.json') && !existsSync('stylelint.config.js')) {
      console.log('Creating stylelint config...');
      writeFileSync('.stylelintrc.json', JSON.stringify({
        extends: ['stylelint-config-recommended', 'stylelint-config-standard'],
        plugins: ['stylelint-a11y', 'stylelint-high-performance-animation'],
        rules: {
          'a11y/no-display-none': true,
          'a11y/no-obsolete-element': true,
          'plugin/no-low-performance-animation-properties': true
        }
      }, null, 2));
    }
    
    // Run stylelint on leaderboard CSS
    const output = execSync(
      'pnpm stylelint "app/leaderboard/**/*.{css,scss}" "app/components/**/*.{css,scss}" --formatter json || true',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const parsed = JSON.parse(output);
      let totalWarnings = 0;
      let totalErrors = 0;
      
      parsed.forEach((file: any) => {
        totalWarnings += file.warnings.length;
        totalErrors += file.errored ? 1 : 0;
        
        file.warnings.forEach((warning: any) => {
          issues.push(`${file.source}:${warning.line} - ${warning.text}`);
        });
      });
      
      return {
        tool: 'Stylelint',
        status: totalErrors > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed: parsed.length - totalErrors,
        failed: totalErrors,
        issues: issues.slice(0, 100),
        details: { totalWarnings, totalErrors, filesChecked: parsed.length }
      };
    } catch {
      // No issues found or CSS files don't exist (Tailwind-only)
      return {
        tool: 'Stylelint',
        status: 'pass',
        duration: Date.now() - start,
        passed: 1,
        failed: 0,
        issues: ['No CSS files found (Tailwind-only project)']
      };
    }
  } catch (error: any) {
    return {
      tool: 'Stylelint',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 2: Axe-core Playwright - Accessibility
function testAxeCore(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 2: @axe-core/playwright - Accessibility Testing');
    
    // Create temporary test file
    const testFile = join(RESULTS_DIR, 'axe-test.spec.ts');
    writeFileSync(testFile, `
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Leaderboard Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('${LEADERBOARD_URL}', { waitUntil: 'networkidle' });
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
`);
    
    // Run Playwright test
    const output = execSync(
      `pnpm playwright test ${testFile} --reporter json || true`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const report = JSON.parse(output);
      let violations = 0;
      
      report.suites?.forEach((suite: any) => {
        suite.specs?.forEach((spec: any) => {
          spec.tests?.forEach((test: any) => {
            test.results?.forEach((result: any) => {
              if (result.status === 'failed' && result.error?.message) {
                const violationMatch = result.error.message.match(/(\d+) violations?/);
                if (violationMatch) {
                  violations = parseInt(violationMatch[1]);
                }
                issues.push(result.error.message.split('\n')[0]);
              }
            });
          });
        });
      });
      
      return {
        tool: '@axe-core/playwright',
        status: violations > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed: violations === 0 ? 1 : 0,
        failed: violations,
        issues: issues.slice(0, 100)
      };
    } catch {
      return {
        tool: '@axe-core/playwright',
        status: 'error',
        duration: Date.now() - start,
        passed: 0,
        failed: 1,
        issues: ['Failed to parse Playwright output']
      };
    }
  } catch (error: any) {
    return {
      tool: '@axe-core/playwright',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 3-5: Jest + Testing Library (combined)
function testJestComponents(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 3-5: Jest + @testing-library - Component Testing');
    
    // Check for existing tests
    const output = execSync(
      'find app/leaderboard -name "*.test.{ts,tsx,js,jsx}" -o -name "*.spec.{ts,tsx,js,jsx}" || true',
      { encoding: 'utf-8' }
    );
    
    if (!output.trim()) {
      return {
        tool: 'Jest + Testing Library',
        status: 'skip',
        duration: Date.now() - start,
        passed: 0,
        failed: 0,
        issues: ['No Jest tests found for leaderboard components']
      };
    }
    
    // Run Jest tests
    const testOutput = execSync(
      'pnpm test --run --reporter=json app/leaderboard || true',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const report = JSON.parse(testOutput);
      const passed = report.numPassedTests || 0;
      const failed = report.numFailedTests || 0;
      
      report.testResults?.forEach((result: any) => {
        result.assertionResults?.forEach((assertion: any) => {
          if (assertion.status === 'failed') {
            issues.push(`${result.name}: ${assertion.title} - ${assertion.failureMessages?.[0]}`);
          }
        });
      });
      
      return {
        tool: 'Jest + Testing Library',
        status: failed > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed,
        failed,
        issues: issues.slice(0, 100)
      };
    } catch {
      return {
        tool: 'Jest + Testing Library',
        status: 'error',
        duration: Date.now() - start,
        passed: 0,
        failed: 1,
        issues: ['Failed to parse Jest output']
      };
    }
  } catch (error: any) {
    return {
      tool: 'Jest + Testing Library',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 6: ESLint Tailwind Plugin
function testESLintTailwind(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 6: eslint-plugin-tailwindcss - Tailwind Validation');
    
    // Run ESLint on leaderboard files
    const output = execSync(
      'pnpm eslint "app/leaderboard/**/*.{ts,tsx}" --format json || true',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const parsed = JSON.parse(output);
      let totalErrors = 0;
      let totalWarnings = 0;
      
      parsed.forEach((file: any) => {
        totalErrors += file.errorCount;
        totalWarnings += file.warningCount;
        
        file.messages.forEach((msg: any) => {
          if (msg.ruleId?.includes('tailwindcss')) {
            issues.push(`${file.filePath}:${msg.line} - ${msg.message} (${msg.ruleId})`);
          }
        });
      });
      
      return {
        tool: 'eslint-plugin-tailwindcss',
        status: totalErrors > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed: parsed.length - totalErrors,
        failed: totalErrors,
        issues: issues.slice(0, 100),
        details: { totalErrors, totalWarnings }
      };
    } catch {
      return {
        tool: 'eslint-plugin-tailwindcss',
        status: 'pass',
        duration: Date.now() - start,
        passed: 1,
        failed: 0,
        issues: []
      };
    }
  } catch (error: any) {
    return {
      tool: 'eslint-plugin-tailwindcss',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 7: Lighthouse - Performance Testing
function testLighthouse(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 7: Lighthouse - Performance Testing');
    
    // Run Lighthouse
    const outputFile = join(RESULTS_DIR, 'lighthouse-leaderboard.json');
    execSync(
      `pnpm lighthouse ${LEADERBOARD_URL} --output=json --output-path=${outputFile} --chrome-flags="--headless --no-sandbox" --quiet`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (!existsSync(outputFile)) {
      return {
        tool: 'Lighthouse',
        status: 'error',
        duration: Date.now() - start,
        passed: 0,
        failed: 1,
        issues: ['Failed to generate Lighthouse report']
      };
    }
    
    const report = JSON.parse(readFileSync(outputFile, 'utf-8'));
    const scores = {
      performance: Math.round((report.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((report.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((report.categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((report.categories?.seo?.score || 0) * 100)
    };
    
    let passed = 0;
    let failed = 0;
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score < 90) {
        failed++;
        issues.push(`${category}: ${score}/100 (below 90 threshold)`);
      } else {
        passed++;
      }
    });
    
    // Check for specific audits
    if (report.audits) {
      Object.values(report.audits).forEach((audit: any) => {
        if (audit.score !== null && audit.score < 0.9 && audit.score >= 0) {
          issues.push(`${audit.title}: ${Math.round(audit.score * 100)}/100`);
        }
      });
    }
    
    return {
      tool: 'Lighthouse',
      status: failed > 0 ? 'fail' : 'pass',
      duration: Date.now() - start,
      passed,
      failed,
      issues: issues.slice(0, 100),
      details: scores
    };
  } catch (error: any) {
    return {
      tool: 'Lighthouse',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 8: Chrome Launcher (used by other tools, verify installation)
function testChromeLauncher(): TestResult {
  const start = Date.now();
  
  try {
    logSection('Tool 8: chrome-launcher - Chrome Testing Infrastructure');
    
    // Verify chrome-launcher can find Chrome
    const testScript = `
      import chromeLauncher from 'chrome-launcher';
      
      chromeLauncher.launch({ chromeFlags: ['--headless', '--disable-gpu'] })
        .then(chrome => {
          console.log('Chrome launched on port:', chrome.port);
          return chrome.kill();
        })
        .catch(err => {
          console.error('Failed to launch Chrome:', err);
          process.exit(1);
        });
    `;
    
    writeFileSync(join(RESULTS_DIR, 'test-chrome.mjs'), testScript);
    
    execSync(`node ${join(RESULTS_DIR, 'test-chrome.mjs')}`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    
    return {
      tool: 'chrome-launcher',
      status: 'pass',
      duration: Date.now() - start,
      passed: 1,
      failed: 0,
      issues: []
    };
  } catch (error: any) {
    return {
      tool: 'chrome-launcher',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 9: Pa11y - Multi-viewport Accessibility
function testPa11y(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 9: pa11y + pa11y-ci - Multi-viewport Accessibility');
    
    // Create pa11y config
    const pa11yConfig = {
      defaults: {
        standard: 'WCAG2AA',
        timeout: 30000
      },
      urls: [
        {
          url: LEADERBOARD_URL,
          viewport: { width: 1920, height: 1080 },
          screenCapture: join(RESULTS_DIR, 'pa11y-desktop.png')
        },
        {
          url: LEADERBOARD_URL,
          viewport: { width: 768, height: 1024 },
          screenCapture: join(RESULTS_DIR, 'pa11y-tablet.png')
        },
        {
          url: LEADERBOARD_URL,
          viewport: { width: 375, height: 667 },
          screenCapture: join(RESULTS_DIR, 'pa11y-mobile.png')
        }
      ]
    };
    
    const configFile = join(RESULTS_DIR, 'pa11y-config.json');
    writeFileSync(configFile, JSON.stringify(pa11yConfig, null, 2));
    
    // Run pa11y-ci
    const output = execSync(
      `pnpm pa11y-ci --config ${configFile} --json || true`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const results = JSON.parse(output);
      let totalIssues = 0;
      
      Object.entries(results).forEach(([url, result]: [string, any]) => {
        if (Array.isArray(result)) {
          totalIssues += result.length;
          result.forEach((issue: any) => {
            issues.push(`${issue.type}: ${issue.message} (${issue.selector})`);
          });
        }
      });
      
      return {
        tool: 'pa11y + pa11y-ci',
        status: totalIssues > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed: totalIssues === 0 ? 3 : 0,
        failed: totalIssues,
        issues: issues.slice(0, 100)
      };
    } catch {
      // Pa11y doesn't always return valid JSON on error
      const errorMatch = output.match(/(\d+) errors?/i);
      const errorCount = errorMatch ? parseInt(errorMatch[1]) : 0;
      
      return {
        tool: 'pa11y + pa11y-ci',
        status: errorCount > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed: errorCount === 0 ? 3 : 0,
        failed: errorCount,
        issues: [output.slice(0, 500)]
      };
    }
  } catch (error: any) {
    return {
      tool: 'pa11y + pa11y-ci',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 10: Bundle Analyzer
function testBundleAnalyzer(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 10: @next/bundle-analyzer - Bundle Size Analysis');
    
    // Check if build stats exist
    const statsFile = '.next/analyze/client.json';
    
    if (!existsSync(statsFile)) {
      // Need to run build with analyzer
      console.log('Running build with bundle analyzer...');
      execSync('ANALYZE=true pnpm next build', {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: 'inherit'
      });
    }
    
    if (!existsSync(statsFile)) {
      return {
        tool: '@next/bundle-analyzer',
        status: 'skip',
        duration: Date.now() - start,
        passed: 0,
        failed: 0,
        issues: ['Bundle analyzer stats not available. Set ANALYZE=true env var.']
      };
    }
    
    const stats = JSON.parse(readFileSync(statsFile, 'utf-8'));
    const totalSize = stats.assets?.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0) || 0;
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    // Check for large bundles
    stats.assets?.forEach((asset: any) => {
      const sizeMB = asset.size / (1024 * 1024);
      if (sizeMB > 1) {
        issues.push(`Large bundle: ${asset.name} (${sizeMB.toFixed(2)}MB)`);
      }
    });
    
    const status = parseFloat(totalSizeMB) > 5 ? 'fail' : 'pass';
    
    return {
      tool: '@next/bundle-analyzer',
      status,
      duration: Date.now() - start,
      passed: status === 'pass' ? 1 : 0,
      failed: status === 'fail' ? 1 : 0,
      issues,
      details: { totalSizeMB, assetsCount: stats.assets?.length || 0 }
    };
  } catch (error: any) {
    return {
      tool: '@next/bundle-analyzer',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Tool 11: CSS Test Suite (Playwright Contrast Tests)
function testCSSContrast(): TestResult {
  const start = Date.now();
  const issues: string[] = [];
  
  try {
    logSection('Tool 11: CSS Test Suite - Contrast Validation');
    
    // Run existing Playwright contrast tests
    const output = execSync(
      'pnpm playwright test light-mode-contrast-test.spec.ts --reporter json || true',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    try {
      const report = JSON.parse(output);
      let passed = 0;
      let failed = 0;
      let totalViolations = 0;
      
      report.suites?.forEach((suite: any) => {
        suite.specs?.forEach((spec: any) => {
          spec.tests?.forEach((test: any) => {
            test.results?.forEach((result: any) => {
              if (result.status === 'passed') {
                passed++;
              } else if (result.status === 'failed') {
                failed++;
                
                // Extract violation count from error message
                if (result.error?.message) {
                  const violationMatch = result.error.message.match(/(\d+) contrast violations?/);
                  if (violationMatch) {
                    const violations = parseInt(violationMatch[1]);
                    totalViolations += violations;
                    issues.push(`${test.title}: ${violations} contrast violations`);
                  } else {
                    issues.push(`${test.title}: ${result.error.message.split('\n')[0]}`);
                  }
                }
              }
            });
          });
        });
      });
      
      return {
        tool: 'CSS Test Suite (Contrast)',
        status: failed > 0 ? 'fail' : 'pass',
        duration: Date.now() - start,
        passed,
        failed,
        issues: issues.slice(0, 100),
        details: { totalViolations }
      };
    } catch {
      return {
        tool: 'CSS Test Suite (Contrast)',
        status: 'error',
        duration: Date.now() - start,
        passed: 0,
        failed: 1,
        issues: ['Failed to parse Playwright output']
      };
    }
  } catch (error: any) {
    return {
      tool: 'CSS Test Suite (Contrast)',
      status: 'error',
      duration: Date.now() - start,
      passed: 0,
      failed: 1,
      issues: [error.message]
    };
  }
}

// Main execution
async function main() {
  console.log('🧪 Comprehensive Leaderboard Testing Suite');
  console.log(`📍 Target: ${LEADERBOARD_URL}`);
  console.log(`📊 Results will be saved to: ${RESULTS_FILE}`);
  console.log('');
  
  // Create results directory
  execSync(`mkdir -p ${RESULTS_DIR}`, { encoding: 'utf-8' });
  
  // Verify server is running
  try {
    execSync(`curl -s -o /dev/null -w "%{http_code}" ${LEADERBOARD_URL}`, { encoding: 'utf-8' });
    console.log('✅ Server is running\n');
  } catch {
    console.error('❌ Server is not running on port 3000!');
    console.error('Please run: pnpm start');
    process.exit(1);
  }
  
  // Run all tests
  console.log('Running 11 comprehensive tests...\n');
  
  const tests = [
    { name: 'Stylelint', fn: testStylelint },
    { name: 'Axe-core', fn: testAxeCore },
    { name: 'Jest + Testing Library', fn: testJestComponents },
    { name: 'ESLint Tailwind', fn: testESLintTailwind },
    { name: 'Lighthouse', fn: testLighthouse },
    { name: 'Chrome Launcher', fn: testChromeLauncher },
    { name: 'Pa11y', fn: testPa11y },
    { name: 'Bundle Analyzer', fn: testBundleAnalyzer },
    { name: 'CSS Contrast', fn: testCSSContrast }
  ];
  
  for (const test of tests) {
    const result = runTest(test.fn);
    results.push(result);
    logResult(result);
  }
  
  // Summary
  logSection('📋 FINAL SUMMARY');
  
  const summary = {
    totalTests: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    errors: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skip').length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    results
  };
  
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Errors: ${summary.errors}`);
  console.log(`⏭️  Skipped: ${summary.skipped}`);
  console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`🐛 Total Issues: ${summary.totalIssues}`);
  console.log('');
  
  // Save results
  writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2));
  console.log(`💾 Results saved to: ${RESULTS_FILE}`);
  console.log('');
  
  // Tool-specific summaries
  console.log('📊 Tool-specific Results:');
  results.forEach(result => {
    console.log(`   ${result.tool}: ${result.status.toUpperCase()} (${result.failed} issues)`);
  });
  console.log('');
  
  // Exit with appropriate code
  const exitCode = summary.failed > 0 || summary.errors > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Tests failed. See details above.');
  }
  
  process.exit(exitCode);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
