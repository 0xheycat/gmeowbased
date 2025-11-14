import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const revalidate = 300

const WIDTH = 1200
const HEIGHT = 630

const MAX_METRICS = 4

type Metric = {
  label: string
  value: string
}

type Badge = {
  label: string
  tone: 'violet' | 'blue' | 'emerald' | 'gold' | 'pink'
  icon?: string
}

function readParam(url: URL, key: string, fallback = '') {
  const value = url.searchParams.get(key)
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed.length) return fallback
  return trimmed
}

function readMetrics(url: URL): Metric[] {
  const metrics: Metric[] = []
  for (let index = 1; index <= MAX_METRICS; index += 1) {
    const label = readParam(url, `metric${index}Label`)
    const value = readParam(url, `metric${index}Value`)
    if (!label || !value) continue
    metrics.push({ label, value })
  }
  return metrics
}

function readBadge(url: URL): Badge | null {
  const label = readParam(url, 'badgeLabel')
  if (!label) return null
  const toneParam = readParam(url, 'badgeTone', 'violet')
  const allowedTones: Badge['tone'][] = ['violet', 'blue', 'emerald', 'gold', 'pink']
  const tone = allowedTones.includes(toneParam as Badge['tone']) ? (toneParam as Badge['tone']) : 'violet'
  const icon = readParam(url, 'badgeIcon')
  return { label, tone, icon: icon || undefined }
}

const toneBackground: Record<Badge['tone'], string> = {
  violet: '#5f4bce',
  blue: '#3b82f6',
  emerald: '#10b981',
  gold: '#f59e0b',
  pink: '#ec4899',
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const title = readParam(url, 'title', 'GMEOW Retro Deck')
  const subtitle = readParam(url, 'subtitle', 'Daily GM Logistics')
  const chain = readParam(url, 'chain', 'All Chains')
  const footer = readParam(url, 'footer', 'Warpcast • GMeow Adventure')
  const badge = readBadge(url)
  const metrics = readMetrics(url)

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 70px',
          color: '#ecf2ff',
          backgroundImage:
            'radial-gradient(120% 110% at 15% 20%, rgba(99, 132, 255, 0.43), rgba(5, 9, 20, 0.8)), radial-gradient(100% 90% at 85% 15%, rgba(61, 201, 255, 0.38), rgba(5, 9, 20, 0.95))',
          backgroundColor: '#050914',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 20, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7 }}>{chain}</span>
            <h1 style={{ fontSize: 64, lineHeight: 1.1, fontWeight: 700 }}>{title}</h1>
            <p style={{ fontSize: 26, opacity: 0.85, maxWidth: 640 }}>{subtitle}</p>
          </div>
          {badge ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                padding: '18px 24px',
                borderRadius: 999,
                backgroundColor: `${toneBackground[badge.tone]}33`,
                border: `1px solid ${toneBackground[badge.tone]}88`,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {badge.icon ? <span>{badge.icon}</span> : null}
              <span style={{ textTransform: 'uppercase', letterSpacing: 4 }}>{badge.label}</span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: metrics.length > 0 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
            gap: 24,
            marginTop: 48,
            flexGrow: 1,
          }}
        >
          {metrics.length > 0 ? (
            metrics.map((metric, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`${metric.label}-${index}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '24px 28px',
                  borderRadius: 20,
                  backgroundColor: 'rgba(9, 14, 32, 0.6)',
                  border: '1px solid rgba(99, 132, 255, 0.25)',
                  boxShadow: '0 20px 35px rgba(5, 9, 20, 0.45)',
                }}
              >
                <span style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: 6, opacity: 0.7 }}>{metric.label}</span>
                <span style={{ fontSize: 40, fontWeight: 700 }}>{metric.value}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                border: '1px dashed rgba(148, 178, 255, 0.4)',
                backgroundColor: 'rgba(9, 14, 32, 0.45)',
                fontSize: 28,
                textTransform: 'uppercase',
                letterSpacing: 6,
              }}
            >
              Sync metrics to populate this frame
            </div>
          )}
        </div>
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 42,
            fontSize: 20,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: 0.78,
          }}
        >
          <span>GMEOW Command Deck</span>
          <span>{footer}</span>
        </footer>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    },
  )
}
