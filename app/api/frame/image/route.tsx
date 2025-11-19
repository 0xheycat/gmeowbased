/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unknown-property */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const revalidate = 60

const WIDTH = 1200
const HEIGHT = 630

const READABLE_KEYS: Array<{ key: string; label: string }> = [
  { key: 'txs', label: 'Total Transactions' },
  { key: 'contracts', label: 'Contracts Touched' },
  { key: 'volume', label: 'Onchain Volume' },
  { key: 'balance', label: 'Current Balance' },
  { key: 'builder', label: 'Builder Score' },
  { key: 'neynar', label: 'Neynar Score' },
  { key: 'power', label: 'Power Badge' },
  { key: 'age', label: 'Account Age' },
  { key: 'firstTx', label: 'First Transaction' },
  { key: 'lastTx', label: 'Last Transaction' },
]

function readParam(url: URL, name: string, fallback = '') {
  const value = url.searchParams.get(name)
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return fallback
  return trimmed
}

function shortenAddress(addr: string) {
  if (!addr) return ''
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = readParam(url, 'type', 'onchainstats')
  const chain = readParam(url, 'chainName', readParam(url, 'chain', 'Base'))
  const user = readParam(url, 'user')
  const fid = readParam(url, 'fid')

  // GM frame type
  if (type === 'gm') {
    const gmCount = readParam(url, 'gmCount', '0')
    const streak = readParam(url, 'streak', '0')
    const rank = readParam(url, 'rank', '—')

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(circle at 30% 30%, #2d1b4e, #0a0e1a)',
            color: '#f5f7ff',
            position: 'relative',
            padding: '64px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: 'linear-gradient(135deg, rgba(255, 210, 90, 0.1), rgba(124, 92, 255, 0.08))',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, zIndex: 1 }}>
            <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: '-2px' }}>GM! 🌅</div>
            {user && (
              <div style={{ fontSize: 32, opacity: 0.85 }}>
                {shortenAddress(user)} {fid && `• FID ${fid}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: '#ffd25a' }}>{gmCount}</div>
                <div style={{ fontSize: 28, textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.7 }}>Total GMs</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: '#7c5cff' }}>{streak}</div>
                <div style={{ fontSize: 28, textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.7 }}>Streak</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: '#5fb3ff' }}>{rank}</div>
                <div style={{ fontSize: 28, textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.7 }}>Rank</div>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              fontSize: 24,
              opacity: 0.6,
              letterSpacing: '2px',
            }}
          >
            Powered by GMEOW • {chain}
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Quest frame type
  if (type === 'quest') {
    const questId = readParam(url, 'questId')
    const questName = readParam(url, 'questName', `Quest #${questId}`)
    const reward = readParam(url, 'reward', '100 XP')
    const expires = readParam(url, 'expires', '—')
    const progress = readParam(url, 'progress', '0')

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 80px',
            background: 'radial-gradient(circle at 20% 80%, #1a2f4e, #0d0f1c)',
            color: '#f5f7ff',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: 'linear-gradient(135deg, rgba(95, 179, 255, 0.12), rgba(255, 210, 90, 0.06))',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, zIndex: 1 }}>
            <div style={{ fontSize: 32, letterSpacing: '6px', textTransform: 'uppercase', opacity: 0.7 }}>Quest</div>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{questName}</div>
            <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '24px 32px',
                  borderRadius: 16,
                  background: 'rgba(4, 8, 20, 0.7)',
                  border: '1px solid rgba(255, 210, 90, 0.3)',
                }}
              >
                <div style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.7 }}>Reward</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: '#ffd25a' }}>{reward}</div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '24px 32px',
                  borderRadius: 16,
                  background: 'rgba(4, 8, 20, 0.7)',
                  border: '1px solid rgba(95, 179, 255, 0.3)',
                }}
              >
                <div style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.7 }}>Expires</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: '#5fb3ff' }}>{expires}</div>
              </div>
            </div>
            {progress !== '0' && (
              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 28, opacity: 0.8 }}>Progress: {progress}%</div>
                <div style={{ width: '100%', height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #7c5cff, #5fb3ff)' }} />
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              left: 80,
              right: 80,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 22,
              opacity: 0.6,
              letterSpacing: '2px',
            }}
          >
            <span>Powered by GMEOW</span>
            <span>{chain} • Quest #{questId}</span>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Leaderboard frame type
  if (type === 'leaderboard') {
    const season = readParam(url, 'season', 'Current Season')
    const limit = readParam(url, 'limit', '10')

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 80px',
            background: 'radial-gradient(circle at 50% 20%, #1e2d4a, #0b0d18)',
            color: '#f5f7ff',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.14), rgba(255, 210, 90, 0.08))',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 32, letterSpacing: '6px', textTransform: 'uppercase', opacity: 0.7 }}>Leaderboard</div>
                <div style={{ fontSize: 64, fontWeight: 800 }}>🏆 Top Performers</div>
              </div>
              <div
                style={{
                  padding: '16px 32px',
                  borderRadius: 999,
                  border: '1px solid rgba(124, 92, 255, 0.4)',
                  background: 'rgba(124, 92, 255, 0.15)',
                  color: '#7c5cff',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {season}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginTop: 32,
                padding: '32px',
                borderRadius: 20,
                background: 'rgba(4, 8, 20, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
                View Top {limit} Players
              </div>
              <div style={{ fontSize: 28, opacity: 0.75, lineHeight: 1.5 }}>
                🥇 GM streaks • 🎯 Quest completions<br />
                ⚡ XP leaders • 🌟 Badge collectors
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              left: 80,
              right: 80,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 22,
              opacity: 0.6,
              letterSpacing: '2px',
            }}
          >
            <span>Powered by GMEOW</span>
            <span>{chain} • Multichain Rankings</span>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Default: onchainstats (original logic)
  const metrics = READABLE_KEYS.map(({ key, label }) => ({
    key,
    label,
    value: readParam(url, key),
  })).filter((item) => item.value && item.value !== '—')

  const shownMetrics = metrics.slice(0, 6)
  const remainingMetrics = metrics.slice(6)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 96px',
          background: 'radial-gradient(circle at 20% 20%, #1d2a50, #070b18)',
          color: '#f5f7ff',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.16), rgba(95, 179, 255, 0.08))',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 24, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7 }}>Onchain dossier</span>
            <span style={{ fontSize: 54, fontWeight: 700 }}>Command Deck Metrics</span>
            <div style={{ fontSize: 28, opacity: 0.82 }}>
              {user ? `Address :: ${shortenAddress(user)}` : 'GMEOW multichain cadence'}
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 28px',
              borderRadius: 999,
              border: '1px solid rgba(255, 210, 90, 0.4)',
              background: 'rgba(255, 210, 90, 0.12)',
              color: '#ffd25a',
              fontSize: 28,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {chain}
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 24,
            marginTop: 48,
            zIndex: 1,
          }}
        >
          {shownMetrics.length > 0 ? (
            shownMetrics.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '24px 28px',
                  borderRadius: 18,
                  background: 'rgba(4, 8, 20, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: '0 18px 38px rgba(2, 6, 23, 0.45)',
                }}
              >
                <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7 }}>{item.label}</span>
                <span style={{ fontSize: 34, fontWeight: 700 }}>{item.value}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                gridColumn: 'span 3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 48px',
                borderRadius: 20,
                background: 'rgba(4, 8, 20, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: 30,
                opacity: 0.85,
              }}
            >
              Sync stats to render your onchain narrative.
            </div>
          )}
        </div>
        {remainingMetrics.length > 0 ? (
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              maxWidth: '100%',
              zIndex: 1,
              fontSize: 22,
              opacity: 0.8,
            }}
          >
            {remainingMetrics.map((item) => (
              <span key={item.key} style={{ display: 'inline-flex', gap: 12 }}>
                <span style={{ opacity: 0.6, textTransform: 'uppercase', letterSpacing: 4 }}>{item.label}:</span>
                <span>{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 96,
            right: 96,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            opacity: 0.66,
            letterSpacing: 2,
          }}
        >
          <span>Powered by GMEOW</span>
          <span>Multichain readiness • Frame friendly</span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    },
  )
}
