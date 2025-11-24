import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const WIDTH = 1200
const HEIGHT = 630

/**
 * Personalized Share Route for Viral Cast Sharing
 * Pattern: /share/[fid]
 * Generates custom OG images with user stats for social sharing
 */

async function loadFonts() {
  try {
    const pixelifySansPath = join(process.cwd(), 'public', 'fonts', 'PixelifySans-Bold.ttf')
    const gmeowPath = join(process.cwd(), 'public', 'fonts', 'gmeow2.ttf')
    
    const [pixelifySansBuffer, gmeowBuffer] = await Promise.all([
      readFile(pixelifySansPath),
      readFile(gmeowPath),
    ])
    
    return [
      {
        name: 'PixelifySans',
        data: pixelifySansBuffer.buffer as ArrayBuffer,
        weight: 700 as const,
        style: 'normal' as const,
      },
      {
        name: 'Gmeow',
        data: gmeowBuffer.buffer as ArrayBuffer,
        weight: 400 as const,
        style: 'normal' as const,
      },
    ]
  } catch {
    console.error('[Share Route] Failed to load fonts')
    return []
  }
}

async function loadImageAsDataUrl(relativePath: string): Promise<string | null> {
  try {
    const absolutePath = join(process.cwd(), 'public', relativePath)
    const buffer = await readFile(absolutePath)
    const base64 = buffer.toString('base64')
    const ext = relativePath.split('.').pop()
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'
    return `data:${mimeType};base64,${base64}`
  } catch (err) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  const fid = params.fid
  const fonts = await loadFonts()
  const bgImage = await loadImageAsDataUrl('og-background.png')

  // In production, fetch real user stats from Supabase
  // For now, generate personalized message
  const shareMessage = `Join me on Gmeowbased Adventure! 🎮`
  
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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 30%, #1f0a1f 60%, #0a0a0a 100%)',
        }}
      >
        {/* Background Image */}
        {bgImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgImage}
            alt="background"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.3,
            }}
          />
        )}

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 80,
            textAlign: 'center',
            gap: 40,
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              fontSize: 120,
              display: 'flex',
            }}
          >
            😺
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div
              style={{
                fontFamily: 'PixelifySans',
                fontSize: 72,
                fontWeight: 700,
                color: '#D4AF37',
                letterSpacing: '-0.02em',
                textShadow: '0 4px 12px rgba(212, 175, 55, 0.5)',
              }}
            >
              GMEOWBASED
            </div>
            <div
              style={{
                fontFamily: 'Gmeow',
                fontSize: 36,
                fontWeight: 400,
                color: '#C77DFF',
                letterSpacing: '0.05em',
              }}
            >
              Adventure Awaits
            </div>
          </div>

          {/* Share Message */}
          <div
            style={{
              fontFamily: 'Gmeow',
              fontSize: 28,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            {shareMessage}
          </div>

          {/* User FID Badge */}
          <div
            style={{
              display: 'flex',
              padding: '12px 32px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(199, 125, 255, 0.2))',
              border: '2px solid rgba(212, 175, 55, 0.5)',
              borderRadius: 999,
              fontFamily: 'PixelifySans',
              fontSize: 24,
              fontWeight: 700,
              color: '#D4AF37',
              letterSpacing: '0.1em',
            }}
          >
            FID {fid}
          </div>

          {/* CTA */}
          <div
            style={{
              fontFamily: 'Gmeow',
              fontSize: 20,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '0.05em',
            }}
          >
            Daily GM • Cross-Chain Quests • Guild Battles
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            fontFamily: 'Gmeow',
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          gmeowhq.art
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
