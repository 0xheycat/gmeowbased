#!/usr/bin/env node

/**
 * Template Migration - Package.json Merger
 * Merges Tailwick dependencies with our existing dependencies
 */

const fs = require('fs')
const path = require('path')

console.log('🔄 Merging package.json files...\n')

// Read current package.json
const currentPath = path.join(process.cwd(), 'package.json')
if (!fs.existsSync(currentPath)) {
  console.error('❌ Current package.json not found')
  process.exit(1)
}
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))

// Read template package.json
const templatePath = path.join(
  process.cwd(),
  'temp-template/package.json'
)
if (!fs.existsSync(templatePath)) {
  console.error('❌ Template package.json not found at:', templatePath)
  console.log('ℹ️  Run 02-install-template.sh first')
  process.exit(1)
}
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'))

console.log('📦 Current dependencies:', Object.keys(current.dependencies || {}).length)
console.log('📦 Template dependencies:', Object.keys(template.dependencies || {}).length)
console.log('')

// Critical dependencies to preserve
const preserve = [
  // Crypto
  '@coinbase/onchainkit',
  'wagmi',
  'viem',
  '@wagmi/connectors',
  '@wagmi/core',
  'ethers',
  
  // Farcaster
  '@farcaster/core',
  '@farcaster/hub-nodejs',
  '@farcaster/miniapp-core',
  '@farcaster/miniapp-node',
  '@farcaster/miniapp-sdk',
  '@farcaster/miniapp-wagmi-connector',
  
  // Neynar
  '@neynar/nodejs-sdk',
  '@neynar/react',
  
  // Database
  '@supabase/supabase-js',
  
  // Monitoring
  '@sentry/nextjs',
  
  // State Management
  '@tanstack/react-query',
  '@tanstack/react-virtual',
  'swr',
  
  // Utilities
  '@upstash/ratelimit',
  '@upstash/redis',
  '@vercel/kv',
  '@vercel/og',
  'canvas-confetti',
  'copy-to-clipboard',
  'date-fns',
  'dotenv',
  'framer-motion',
  'jose',
  'next-themes',
  'otplib',
  'qrcode',
  'qrcode.react',
  'recharts',
  'zod',
  
  // UI (if we're keeping them)
  '@radix-ui/react-progress',
  '@radix-ui/react-slot',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'tailwind-variants',
  'tailwindcss-animate',
]

// Merge dependencies
console.log('🔀 Merging dependencies...')
const mergedDeps = { ...template.dependencies }

// Add our preserved dependencies
preserve.forEach(dep => {
  if (current.dependencies && current.dependencies[dep]) {
    mergedDeps[dep] = current.dependencies[dep]
    console.log(`✅ Preserved: ${dep}@${current.dependencies[dep]}`)
  }
})

// Use template versions for framework packages
const frameworkPackages = {
  'next': template.dependencies.next,
  'react': template.dependencies.react,
  'react-dom': template.dependencies['react-dom'],
  'tailwindcss': template.dependencies.tailwindcss,
  'postcss': template.dependencies.postcss,
}

Object.entries(frameworkPackages).forEach(([pkg, version]) => {
  if (version) {
    mergedDeps[pkg] = version
    console.log(`⬆️  Updated: ${pkg}@${version}`)
  }
})

// Merge devDependencies
console.log('\n🔀 Merging devDependencies...')
const mergedDevDeps = {
  ...current.devDependencies,
  ...template.devDependencies,
}

// Build merged package.json
const merged = {
  name: current.name,
  version: current.version,
  private: current.private,
  type: current.type || 'module',
  engines: current.engines,
  scripts: {
    ...current.scripts,
    // Add any useful Tailwick scripts
    'format': template.scripts.format || 'prettier --write .',
    'format:check': template.scripts['format:check'] || 'prettier --check .',
  },
  dependencies: Object.keys(mergedDeps)
    .sort()
    .reduce((acc, key) => {
      acc[key] = mergedDeps[key]
      return acc
    }, {}),
  devDependencies: Object.keys(mergedDevDeps)
    .sort()
    .reduce((acc, key) => {
      acc[key] = mergedDevDeps[key]
      return acc
    }, {}),
}

// Write merged file
const outputPath = path.join(process.cwd(), 'package.json.merged')
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2) + '\n')

console.log('\n✅ Merge complete!')
console.log('')
console.log('📊 Summary:')
console.log(`   Dependencies: ${Object.keys(merged.dependencies).length}`)
console.log(`   DevDependencies: ${Object.keys(merged.devDependencies).length}`)
console.log(`   Preserved: ${preserve.filter(p => current.dependencies?.[p]).length} critical packages`)
console.log('')
console.log('📁 Output: package.json.merged')
console.log('')
console.log('📋 Next Steps:')
console.log('1. Review changes: diff package.json package.json.merged')
console.log('2. Apply if looks good: mv package.json.merged package.json')
console.log('3. Clean install: rm -rf node_modules package-lock.json && npm install')
console.log('')

// Show key version changes
console.log('🔍 Key Version Changes:')
const showVersion = (pkg) => {
  const oldVer = current.dependencies?.[pkg] || current.devDependencies?.[pkg]
  const newVer = merged.dependencies?.[pkg] || merged.devDependencies?.[pkg]
  if (oldVer && newVer && oldVer !== newVer) {
    console.log(`   ${pkg}: ${oldVer} → ${newVer}`)
  }
}

['next', 'react', 'react-dom', 'tailwindcss', 'typescript'].forEach(showVersion)
console.log('')
