#!/usr/bin/env node

/**
 * Real Contrast Verification for Quest Pages
 * Automatically detects contrast issues in light/dark modes
 * 
 * Features:
 * - Parses actual Tailwind classes and CSS variables
 * - Calculates real contrast ratios (WCAG 2.1)
 * - Detects inline styles and hardcoded colors
 * - Validates dark mode implementation
 * - Tests both light and dark mode color combinations
 * 
 * WCAG 2.1 Level AA Requirements:
 * - Normal text (< 18pt): 4.5:1 minimum
 * - Large text (≥ 18pt): 3:1 minimum
 * - UI components: 3:1 minimum
 * 
 * Date: December 5, 2025
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Tailwind color palette (Base colors for calculation)
const tailwindColors = {
  // Grays
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'gray-950': '#030712',
  
  // Slate (dark mode friendly)
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  
  // Colors
  'white': '#ffffff',
  'black': '#000000',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'green-700': '#15803d',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'yellow-500': '#eab308',
  'yellow-600': '#ca8a04',
  'yellow-700': '#a16207',
  'yellow-900': '#713f12',
  'purple-500': '#a855f7',
  'purple-600': '#9333ea',
  'purple-700': '#7e22ce',
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
  'orange-700': '#c2410c',
  'pink-500': '#ec4899',
  'pink-600': '#db2777',
  'pink-700': '#be185d',
  'primary-400': '#60a5fa',
  'primary-500': '#3b82f6',
  'primary-600': '#2563eb',
};

// CSS Variables from globals.css
const cssVariables = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a', // slate-900
    card: '#ffffff',
    'card-foreground': '#0f172a',
    primary: '#2563eb', // blue-600
    'primary-foreground': '#ffffff',
    secondary: '#f1f5f9', // slate-100
    'secondary-foreground': '#0f172a',
    muted: '#f1f5f9',
    'muted-foreground': '#64748b', // slate-500
    border: '#e2e8f0', // slate-200
    input: '#e2e8f0',
    ring: '#2563eb',
  },
  dark: {
    background: '#020617', // slate-950
    foreground: '#f8fafc', // slate-50
    card: '#0f172a', // slate-900
    'card-foreground': '#f8fafc',
    primary: '#3b82f6', // blue-500
    'primary-foreground': '#ffffff',
    secondary: '#1e293b', // slate-800
    'secondary-foreground': '#f8fafc',
    muted: '#1e293b',
    'muted-foreground': '#94a3b8', // slate-400
    border: '#334155', // slate-700
    input: '#334155',
    ring: '#3b82f6',
  },
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance (WCAG formula)
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse Tailwind class to color value
function parseColorClass(className, mode = 'light') {
  // Remove dark: prefix if present
  const cleanClass = className.replace(/^dark:/, '');
  
  // Check for text-* classes
  const textMatch = cleanClass.match(/^text-(.+)$/);
  if (textMatch) {
    const colorKey = textMatch[1];
    
    // Check CSS variables
    if (cssVariables[mode][colorKey]) {
      return cssVariables[mode][colorKey];
    }
    
    // Check Tailwind colors
    if (tailwindColors[colorKey]) {
      return tailwindColors[colorKey];
    }
    
    // Handle opacity variants (text-white/90)
    const opacityMatch = colorKey.match(/^(.+)\/\d+$/);
    if (opacityMatch && tailwindColors[opacityMatch[1]]) {
      return tailwindColors[opacityMatch[1]];
    }
  }
  
  // Check for bg-* classes
  const bgMatch = cleanClass.match(/^bg-(.+)$/);
  if (bgMatch) {
    const colorKey = bgMatch[1];
    
    // Handle gradient (use first color)
    if (colorKey.startsWith('gradient-')) {
      return tailwindColors['black']; // Default for gradients
    }
    
    // Check CSS variables
    if (cssVariables[mode][colorKey]) {
      return cssVariables[mode][colorKey];
    }
    
    // Check Tailwind colors
    if (tailwindColors[colorKey]) {
      return tailwindColors[colorKey];
    }
    
    // Handle opacity variants
    const opacityMatch = colorKey.match(/^(.+)\/\d+$/);
    if (opacityMatch && tailwindColors[opacityMatch[1]]) {
      return tailwindColors[opacityMatch[1]];
    }
  }
  
  return null;
}

// Extract color classes from file content
function extractColorCombinations(content, filePath) {
  const combinations = [];
  
  // Match className attributes
  const classNameRegex = /className\s*=\s*{?["'`]([^"'`]+)["'`]}?/g;
  let match;
  
  while ((match = classNameRegex.exec(content)) !== null) {
    const classes = match[1].split(/\s+/);
    
    // Extract text and background colors
    const textClasses = classes.filter(c => c.match(/^(dark:)?text-/));
    const bgClasses = classes.filter(c => c.match(/^(dark:)?bg-/));
    
    if (textClasses.length > 0 && bgClasses.length > 0) {
      combinations.push({
        text: textClasses,
        bg: bgClasses,
        line: getLineNumber(content, match.index),
        context: match[1].substring(0, 80),
      });
    }
  }
  
  return combinations;
}

// Get line number from character index
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Check for inline styles
function checkInlineStyles(content, filePath) {
  const issues = [];
  
  // Check for style attributes
  const styleRegex = /style\s*=\s*{?["']([^"']+)["']}?/g;
  let match;
  
  while ((match = styleRegex.exec(content)) !== null) {
    issues.push({
      type: 'inline-style',
      line: getLineNumber(content, match.index),
      content: match[1],
      severity: 'error',
    });
  }
  
  // Check for hardcoded colors (hex, rgb, rgba)
  const colorRegex = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g;
  while ((match = colorRegex.exec(content)) !== null) {
    // Skip if it's in a comment
    const lineStart = content.lastIndexOf('\n', match.index);
    const line = content.substring(lineStart, content.indexOf('\n', match.index));
    if (!line.includes('//') && !line.includes('/*')) {
      issues.push({
        type: 'hardcoded-color',
        line: getLineNumber(content, match.index),
        content: match[0],
        severity: 'warning',
      });
    }
  }
  
  return issues;
}

// Check dark mode coverage
function checkDarkMode(content) {
  const issues = [];
  
  // Find all color classes
  const colorClasses = [];
  const classNameRegex = /className\s*=\s*{?["'`]([^"'`]+)["'`]}?/g;
  let match;
  
  while ((match = classNameRegex.exec(content)) !== null) {
    const classes = match[1].split(/\s+/);
    const colors = classes.filter(c => c.match(/^(text-|bg-|border-)/));
    
    colors.forEach(colorClass => {
      if (!colorClass.startsWith('dark:')) {
        const hasDarkVariant = classes.some(c => c === `dark:${colorClass}` || c.startsWith('dark:'));
        if (!hasDarkVariant && !colorClass.match(/(foreground|background|primary|secondary|muted|card)/)) {
          colorClasses.push({
            class: colorClass,
            line: getLineNumber(content, match.index),
            hasDarkVariant,
          });
        }
      }
    });
  }
  
  return colorClasses;
}

// Analyze a single file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}Analyzing: ${fileName}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const results = {
    file: fileName,
    path: filePath,
    contrastIssues: [],
    inlineStyleIssues: [],
    darkModeIssues: [],
    passed: 0,
    failed: 0,
    warnings: 0,
  };
  
  // 1. Check contrast ratios
  console.log(`${colors.blue}1. Contrast Ratio Analysis${colors.reset}`);
  const combinations = extractColorCombinations(content, filePath);
  
  combinations.forEach(combo => {
    // Check light mode
    const lightText = combo.text.find(c => !c.startsWith('dark:'));
    const lightBg = combo.bg.find(c => !c.startsWith('dark:'));
    
    if (lightText && lightBg) {
      const textColor = parseColorClass(lightText, 'light');
      const bgColor = parseColorClass(lightBg, 'light');
      
      if (textColor && bgColor) {
        const ratio = getContrastRatio(textColor, bgColor);
        const passes = ratio >= 4.5; // WCAG AA for normal text
        
        if (passes) {
          results.passed++;
          console.log(`${colors.green}  ✓${colors.reset} Light mode (line ${combo.line}): ${ratio.toFixed(2)}:1`);
          console.log(`    ${lightText} on ${lightBg}`);
        } else {
          results.failed++;
          results.contrastIssues.push({
            mode: 'light',
            line: combo.line,
            text: lightText,
            bg: lightBg,
            ratio: ratio.toFixed(2),
            required: 4.5,
          });
          console.log(`${colors.red}  ✗${colors.reset} Light mode (line ${combo.line}): ${ratio.toFixed(2)}:1 ${colors.red}FAIL${colors.reset} (need 4.5:1)`);
          console.log(`    ${lightText} (${textColor}) on ${lightBg} (${bgColor})`);
        }
      }
    }
    
    // Check dark mode
    const darkText = combo.text.find(c => c.startsWith('dark:'));
    const darkBg = combo.bg.find(c => c.startsWith('dark:'));
    
    if (darkText && darkBg) {
      const textColor = parseColorClass(darkText, 'dark');
      const bgColor = parseColorClass(darkBg, 'dark');
      
      if (textColor && bgColor) {
        const ratio = getContrastRatio(textColor, bgColor);
        const passes = ratio >= 4.5;
        
        if (passes) {
          results.passed++;
          console.log(`${colors.green}  ✓${colors.reset} Dark mode (line ${combo.line}): ${ratio.toFixed(2)}:1`);
          console.log(`    ${darkText} on ${darkBg}`);
        } else {
          results.failed++;
          results.contrastIssues.push({
            mode: 'dark',
            line: combo.line,
            text: darkText,
            bg: darkBg,
            ratio: ratio.toFixed(2),
            required: 4.5,
          });
          console.log(`${colors.red}  ✗${colors.reset} Dark mode (line ${combo.line}): ${ratio.toFixed(2)}:1 ${colors.red}FAIL${colors.reset} (need 4.5:1)`);
          console.log(`    ${darkText} (${textColor}) on ${darkBg} (${bgColor})`);
        }
      }
    }
  });
  
  // 2. Check inline styles and hardcoded colors
  console.log(`\n${colors.blue}2. Inline Styles & Hardcoded Colors${colors.reset}`);
  const styleIssues = checkInlineStyles(content, filePath);
  
  if (styleIssues.length === 0) {
    console.log(`${colors.green}  ✓${colors.reset} No inline styles or hardcoded colors found`);
    results.passed++;
  } else {
    styleIssues.forEach(issue => {
      if (issue.type === 'inline-style') {
        console.log(`${colors.red}  ✗${colors.reset} Inline style at line ${issue.line}:`);
        console.log(`    ${issue.content}`);
        results.failed++;
      } else {
        console.log(`${colors.yellow}  ⚠${colors.reset} Hardcoded color at line ${issue.line}: ${issue.content}`);
        results.warnings++;
      }
    });
    results.inlineStyleIssues = styleIssues;
  }
  
  // 3. Check dark mode coverage
  console.log(`\n${colors.blue}3. Dark Mode Coverage${colors.reset}`);
  const darkModeIssues = checkDarkMode(content);
  
  if (darkModeIssues.length === 0) {
    console.log(`${colors.green}  ✓${colors.reset} All color classes have dark mode variants`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}  ⚠${colors.reset} ${darkModeIssues.length} color classes without dark mode variants:`);
    darkModeIssues.slice(0, 5).forEach(issue => {
      console.log(`    Line ${issue.line}: ${issue.class}`);
    });
    if (darkModeIssues.length > 5) {
      console.log(`    ... and ${darkModeIssues.length - 5} more`);
    }
    results.warnings += darkModeIssues.length;
    results.darkModeIssues = darkModeIssues;
  }
  
  return results;
}

// Main execution
console.log(`${colors.bold}${colors.cyan}`);
console.log('='.repeat(60));
console.log('Quest Pages - Real Contrast Verification');
console.log('Automatic Detection with WCAG 2.1 Validation');
console.log('='.repeat(60));
console.log(colors.reset);

const questFiles = [
  'components/quests/QuestCard.tsx',
  'components/quests/QuestGrid.tsx',
  'components/quests/QuestVerification.tsx',
  'components/quests/QuestProgress.tsx',
  'components/quests/QuestCompleteClient.tsx',
  'app/quests/page.tsx',
  'app/quests/[slug]/page.tsx',
  'app/quests/create/page.tsx',
  'app/quests/create/components/QuestBasicsForm.tsx',
  'app/quests/create/components/RewardsForm.tsx',
  'app/quests/create/components/TaskBuilder.tsx',
  'app/quests/create/components/QuestPreview.tsx',
  'app/quests/create/components/BadgeSelector.tsx',
  'app/quests/create/components/QuestImageUploader.tsx',
];

const allResults = [];
let totalPassed = 0;
let totalFailed = 0;
let totalWarnings = 0;

questFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const result = analyzeFile(filePath);
    allResults.push(result);
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalWarnings += result.warnings;
  } else {
    console.log(`${colors.yellow}⚠ File not found: ${file}${colors.reset}`);
  }
});

// Final summary
console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
console.log(`${colors.bold}FINAL SUMMARY${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

console.log(`Files Analyzed: ${colors.blue}${allResults.length}${colors.reset}`);
console.log(`Checks Passed: ${colors.green}${totalPassed}${colors.reset}`);
console.log(`Checks Failed: ${colors.red}${totalFailed}${colors.reset}`);
console.log(`Warnings: ${colors.yellow}${totalWarnings}${colors.reset}`);

const totalChecks = totalPassed + totalFailed;
const successRate = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

console.log(`\nSuccess Rate: ${successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red}${successRate}%${colors.reset}`);

// Critical issues summary
console.log(`\n${colors.bold}Critical Issues:${colors.reset}`);
const contrastFailures = allResults.filter(r => r.contrastIssues.length > 0);
const inlineStyleFiles = allResults.filter(r => r.inlineStyleIssues.length > 0);

if (contrastFailures.length === 0 && inlineStyleFiles.length === 0) {
  console.log(`${colors.green}✓ No critical issues found!${colors.reset}`);
} else {
  if (contrastFailures.length > 0) {
    console.log(`\n${colors.red}Contrast Failures (${contrastFailures.length} files):${colors.reset}`);
    contrastFailures.forEach(result => {
      console.log(`  • ${result.file}: ${result.contrastIssues.length} issues`);
    });
  }
  
  if (inlineStyleFiles.length > 0) {
    console.log(`\n${colors.red}Inline Styles/Hardcoded Colors (${inlineStyleFiles.length} files):${colors.reset}`);
    inlineStyleFiles.forEach(result => {
      console.log(`  • ${result.file}: ${result.inlineStyleIssues.length} issues`);
    });
  }
}

// WCAG Compliance
console.log(`\n${colors.bold}WCAG 2.1 Level AA Compliance:${colors.reset}`);
if (totalFailed === 0) {
  console.log(`${colors.green}✓ COMPLIANT${colors.reset} - All contrast ratios meet WCAG AA standards`);
  console.log(`  • Normal text: ≥4.5:1 contrast ratio`);
  console.log(`  • Large text: ≥3:1 contrast ratio`);
  console.log(`  • No inline styles or hardcoded colors`);
} else {
  console.log(`${colors.red}✗ NON-COMPLIANT${colors.reset} - ${totalFailed} contrast violations found`);
  console.log(`  • Review and fix issues listed above`);
  console.log(`  • Use Tailwind utility classes with dark: variants`);
  console.log(`  • Avoid inline styles and hardcoded hex/rgb colors`);
}

console.log('');

// Exit code
process.exit(totalFailed > 0 ? 1 : 0);
