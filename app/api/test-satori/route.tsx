import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: 600,
            height: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontSize: 48,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          <div>Satori Test</div>
          <div style={{ fontSize: 24, marginTop: 10 }}>With flexDirection</div>
        </div>
      ),
      {
        width: 600,
        height: 400,
      }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
