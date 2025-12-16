/**
 * Verify Frame Image Generator
 * Dynamic image showing verification status
 * Extracted from monolithic route (lines 918-1188)
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { loadFrameFonts } from '@/lib/frame-fonts'
import {
  FRAME_FONTS_V2,
  FRAME_FONT_FAMILY,
  FRAME_TYPOGRAPHY,
  FRAME_SPACING,
  FRAME_COLORS,
  SHARED_COLORS,
  buildIdentityDisplay,
  buildFooterText,
} from '@/lib/frame-design-system'

export const runtime = 'nodejs'

/**
 * Load image from filesystem and convert to base64 data URL
 */
async function loadImageAsDataUrl(relativePath: string): Promise<string | null> {
  try {
    const absolutePath = join(process.cwd(), 'public', relativePath)
    const buffer = await readFile(absolutePath)
    const base64 = buffer.toString('base64')
    const ext = relativePath.split('.').pop()
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'
    return `data:${mimeType};base64,${base64}`
  } catch (err) {
    console.error(`[Verify Frame] Failed to load ${relativePath}:`, err)
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const username = searchParams.get('username') || ''
    const displayName = searchParams.get('displayName') || ''
    const questId = searchParams.get('questId')
    const questName = searchParams.get('questName') || 'Verification'
    const status = searchParams.get('status') || 'Pending'
    const user = searchParams.get('user') || ''
    const fid = searchParams.get('fid') || ''
    const chain = searchParams.get('chain') || 'Base'

    // Load background image
    const ogImageData = await loadImageAsDataUrl('og-image.png')
    const fonts = await loadFrameFonts()

    const verifyPalette = {
      start: FRAME_COLORS.verify.primary,
      end: FRAME_COLORS.verify.secondary
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background: og-image.png or gradient fallback */}
          {ogImageData ? (
            <img
              src={ogImageData}
              alt="background"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 1.0,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0a2a0a 30%, #0a1f0a 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${verifyPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${verifyPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${verifyPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with VERIFY badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${verifyPalette.start}, ${verifyPalette.end})`,
                  border: `2px solid ${verifyPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  color: SHARED_COLORS.white,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                }}
              >
                VERIFY
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: FRAME_SPACING.section.tight,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 600,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  opacity: 0.8,
                }}
              >
                {chain}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Verify icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Verify Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${verifyPalette.start}, ${verifyPalette.end})`,
                    border: `3px solid ${verifyPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 100,
                  }}
                >
                  ✅
                </div>

                {/* User info below icon */}
                {(username || displayName || user || fid) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.tight,
                      padding: FRAME_SPACING.padding.box,
                      background: `linear-gradient(135deg, ${verifyPalette.start}30, ${verifyPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${verifyPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white, textShadow: FRAME_TYPOGRAPHY.textShadow.subtle }}>
                      {buildIdentityDisplay({ username, displayName, address: user, fid: fid ? parseInt(fid) : null })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Verification details */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Title - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(verifyPalette.start),
                    }}
                  >
                    {questName}
                  </div>

                  {/* Verification info box */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: FRAME_SPACING.section.small,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${verifyPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: FRAME_SPACING.section.inline,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.7)' }}>STATUS:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: verifyPalette.start }}>{status}</span>
                    </div>
                    {questId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Quest:</span>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.9)' }}>#{questId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: FRAME_SPACING.margin.footer,
                fontFamily: FRAME_FONT_FAMILY.body,
                fontSize: FRAME_FONTS_V2.micro,
                letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {buildFooterText('verify')}
            </div>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
        fonts,
      }
    )
  } catch (error) {
    console.error('Verify frame error:', error)
    return new Response('Error generating verify frame', { status: 500 })
  }
}
