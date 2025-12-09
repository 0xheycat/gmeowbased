#!/usr/bin/env tsx
/**
 * Convert SVG badges to PNG using sharp
 */

import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const badgesDir = join(process.cwd(), 'public', 'badges');

async function convertSVGtoPNG() {
  if (!existsSync(badgesDir)) {
    console.error('❌ Badges directory not found. Run generate-badges.ts first.');
    process.exit(1);
  }

  const files = readdirSync(badgesDir).filter(f => f.endsWith('.svg'));
  
  if (files.length === 0) {
    console.error('❌ No SVG files found. Run generate-badges.ts first.');
    process.exit(1);
  }

  console.log('🖼️  Converting SVG badges to PNG...\n');

  for (const file of files) {
    const svgPath = join(badgesDir, file);
    const pngPath = join(badgesDir, file.replace('.svg', '.png'));

    try {
      await sharp(svgPath)
        .resize(1024, 1024)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(pngPath);
      
      console.log(`✅ Converted: ${file} → ${file.replace('.svg', '.png')}`);
    } catch (error) {
      console.error(`❌ Failed to convert ${file}:`, error);
    }
  }

  console.log('\n✨ All badges converted to PNG!');
  console.log(`📁 Output directory: ${badgesDir}`);
}

convertSVGtoPNG().catch(console.error);
