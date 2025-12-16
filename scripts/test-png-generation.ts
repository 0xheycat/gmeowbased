#!/usr/bin/env tsx
/**
 * Simple Frame PNG Generation Test
 * Directly generates a GM frame PNG to verify image generation works
 */

import { ImageResponse } from 'next/og'
import fs from 'fs'

async function generateTestPNG() {
  console.log('🖼️  Generating test frame PNG...')
  
  try {
    const response = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'system-ui',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 40,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 20,
              color: 'white',
            }}
          >
            <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>
              GM ☀️
            </div>
            <div style={{ fontSize: 32, opacity: 0.9 }}>
              Streak: 5 days
            </div>
            <div style={{ fontSize: 24, opacity: 0.7, marginTop: 10 }}>
              Total GMs: 100
            </div>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
      }
    )
    
    const buffer = await response.arrayBuffer()
    const outputPath = '/tmp/test-frame.png'
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    
    const fileSizeKB = (buffer.byteLength / 1024).toFixed(2)
    console.log(`✅ PNG generated: ${outputPath}`)
    console.log(`📊 File size: ${fileSizeKB} KB`)
    console.log(`🎨 Dimensions: 600x400`)
    
    // Verify file exists
    const stats = fs.statSync(outputPath)
    if (stats.size > 0) {
      console.log('✅ Frame image generation working!')
      return true
    } else {
      console.error('❌ Generated file is empty')
      return false
    }
  } catch (error) {
    console.error('❌ Error generating PNG:', error)
    return false
  }
}

generateTestPNG().then(success => {
  process.exit(success ? 0 : 1)
})
