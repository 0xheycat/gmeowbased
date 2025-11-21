import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
        Test
      </div>
    ),
    { width: 1200, height: 628 }
  )
}
