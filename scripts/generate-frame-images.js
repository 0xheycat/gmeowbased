#!/usr/bin/env node

/**
 * Generate spec-compliant images for Farcaster frames
 * 
 * Official specifications:
 * - Frame image: 3:2 aspect ratio (1200x800 recommended)
 * - OG image: 1.91:1 aspect ratio (1200x630 standard)
 * - Splash screen: EXACTLY 200x200px
 * - Icon: 1024x1024px square
 * 
 * Source: https://miniapps.farcaster.xyz/docs/specification
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PUBLIC_DIR = path.join(__dirname, '../public')
const SOURCE_LOGO = path.join(PUBLIC_DIR, 'logo.png')

// Official Farcaster specification dimensions
const SPECS = {
  splash: { width: 200, height: 200, name: 'splash.png' },
  icon: { width: 1024, height: 1024, name: 'icon.png' },
  ogImage: { width: 1200, height: 630, name: 'og-image.png' },
  frameImage: { width: 1200, height: 800, name: 'frame-image.png' },
}

const BACKGROUND_COLOR = '#0B0A16' // Dark purple from brand

async function generateImage(spec, sourcePath, outputPath) {
  try {
    console.log(`\n📐 Generating ${spec.name} (${spec.width}x${spec.height})...`)
    
    const image = sharp(sourcePath)
    const metadata = await image.metadata()
    
    console.log(`   Source: ${metadata.width}x${metadata.height}`)
    
    // Calculate scaling to fit within target dimensions while maintaining aspect ratio
    const sourceRatio = metadata.width / metadata.height
    const targetRatio = spec.width / spec.height
    
    let resizeWidth, resizeHeight
    
    if (sourceRatio > targetRatio) {
      // Source is wider - fit to width
      resizeWidth = spec.width
      resizeHeight = Math.round(spec.width / sourceRatio)
    } else {
      // Source is taller - fit to height  
      resizeHeight = spec.height
      resizeWidth = Math.round(spec.height * sourceRatio)
    }
    
    await image
      .resize(resizeWidth, resizeHeight, {
        fit: 'contain',
        background: BACKGROUND_COLOR,
      })
      .flatten({ background: BACKGROUND_COLOR }) // Remove alpha channel
      .extend({
        top: Math.floor((spec.height - resizeHeight) / 2),
        bottom: Math.ceil((spec.height - resizeHeight) / 2),
        left: Math.floor((spec.width - resizeWidth) / 2),
        right: Math.ceil((spec.width - resizeWidth) / 2),
        background: BACKGROUND_COLOR,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath)
    
    // Verify output
    const outputImage = sharp(outputPath)
    const outputMeta = await outputImage.metadata()
    
    const isCorrectSize = outputMeta.width === spec.width && outputMeta.height === spec.height
    const hasNoAlpha = !outputMeta.hasAlpha
    
    if (isCorrectSize && hasNoAlpha) {
      console.log(`   ✅ SUCCESS: ${outputMeta.width}x${outputMeta.height}, no alpha`)
    } else {
      console.warn(`   ⚠️ WARNING: Size=${outputMeta.width}x${outputMeta.height}, hasAlpha=${outputMeta.hasAlpha}`)
    }
    
    return true
  } catch (error) {
    console.error(`   ❌ FAILED: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🎨 Farcaster Frame Image Generator')
  console.log('=' .repeat(60))
  console.log('Source: ' + SOURCE_LOGO)
  console.log('Output: ' + PUBLIC_DIR)
  console.log('Background: ' + BACKGROUND_COLOR)
  console.log('=' .repeat(60))
  
  // Check if source exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Source logo not found: ${SOURCE_LOGO}`)
    process.exit(1)
  }
  
  let successCount = 0
  let failCount = 0
  
  // Generate all images
  for (const spec of Object.values(SPECS)) {
    const outputPath = path.join(PUBLIC_DIR, spec.name)
    const success = await generateImage(spec, SOURCE_LOGO, outputPath)
    
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Generated: ${successCount}/${Object.keys(SPECS).length} images`)
  
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} images`)
    process.exit(1)
  }
  
  console.log('\n📋 Verification Commands:')
  console.log('   file public/splash.png      # Should show: 200 x 200')
  console.log('   file public/icon.png        # Should show: 1024 x 1024')
  console.log('   file public/og-image.png    # Should show: 1200 x 630')
  console.log('   file public/frame-image.png # Should show: 1200 x 800')
  
  console.log('\n✅ Image generation complete!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
