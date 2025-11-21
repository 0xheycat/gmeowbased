import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)',
          color: 'white',
          fontSize: 60,
          fontWeight: 'bold',
        }}
      >
        Outside Frame Path
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
