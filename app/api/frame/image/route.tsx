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
            background: '#2d1b4e',
            color: '#f5f7ff',
            position: 'relative',
            padding: '64px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: '-2px' }}>GM!</div>
            <div style={{ display: 'flex', fontSize: 32, opacity: 0.85, gap: 8 }}>
              <div>{user ? shortenAddress(user) : 'Anonymous'}</div>
              {fid && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span>•</span>
                  <span>FID {fid}</span>
                </div>
              )}
            </div>
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
              display: 'flex',
              gap: 8,
              fontSize: 24,
              opacity: 0.6,
              letterSpacing: '2px',
            }}
          >
            <span>Powered by Gmeowbased • {chain}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
            <span>Powered by Gmeowbased</span>
            <span>{chain} • Quest #{questId}</span>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Leaderboard frame type - MINIMAL TEST (renamed to leaderboards for routing test)
  if (type === 'leaderboards' || type === 'leaderboard') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e2d4a',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 64 }}>LEADERBOARD TEST</div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Default: onchainstats - MINIMAL TEST
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1d2a50',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 64 }}>ONCHAINSTATS TEST</div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  )
}
