import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 40, color: 'black' }}>Hello World</div>
    ),
    { width: 1200, height: 630 }
  )
}
