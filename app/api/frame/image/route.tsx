/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/style-prop-object */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/forbid-dom-props */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const revalidate = 60

const WIDTH = 600
const HEIGHT = 400 // 3:2 aspect ratio per Farcaster spec (matches badge frames)

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

  // GM frame type - Yu-Gi-Oh! Card Structure
  if (type === 'gm') {
    const gmCount = readParam(url, 'gmCount', '0')
    const streak = readParam(url, 'streak', '0')
    const rank = readParam(url, 'rank', '—')

    const gmPalette = {
      start: '#ff9500',
      end: '#ffb84d'
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #2a1a0a 30%, #1f0f0a 60%, #0a0a0a 100%)',
          }}
        >
          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${gmPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${gmPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: 14,
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
                background: `linear-gradient(180deg, ${gmPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with GM badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                  border: `2px solid ${gmPalette.start}`,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                GM
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {chain}
              </div>
            </div>

            {/* Main content */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: 16,
              }}
            >
              {/* Left: GM emoji/icon */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                  border: `3px solid ${gmPalette.start}`,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                ☀️
              </div>

              {/* Right: GM stats */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: 10,
                }}
              >
                {/* User identifier */}
                <div
                  style={{
                    display: 'flex',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                  }}
                >
                  {user ? shortenAddress(user) : fid ? `FID ${fid}` : 'GM!'}
                </div>

                {/* Stats grid */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {/* Total GMs */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${gmPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${gmPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>TOTAL</div>
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: gmPalette.start }}>{gmCount} GMs</div>
                  </div>

                  {/* Streak */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${gmPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${gmPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>STREAK</div>
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: gmPalette.start }}>🔥 {streak}</div>
                  </div>

                  {/* Rank */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${gmPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${gmPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>RANK</div>
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: '#ffffff', opacity: 0.9 }}>#{rank}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 12,
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • {chain}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Quest frame type - Yu-Gi-Oh! Card Structure (matches badge frames)
  if (type === 'quest') {
    const questId = readParam(url, 'questId')
    const questName = readParam(url, 'questName', `Quest #${questId}`)
    const reward = readParam(url, 'reward', '15')
    const expires = readParam(url, 'expires', '—')
    const slotsLeft = readParam(url, 'slotsLeft', '—')
    const progress = readParam(url, 'progress', '0')
    
    const questPalette = {
      start: '#8e7cff',
      end: '#a78bff'
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2a 30%, #0f0f1f 60%, #0a0a0a 100%)',
          }}
        >
          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${questPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${questPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: 14,
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
                background: `linear-gradient(180deg, ${questPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with QUEST badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                  border: `2px solid ${questPalette.start}`,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                QUEST
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {chain}
              </div>
            </div>

            {/* Main content */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: 16,
              }}
            >
              {/* Left: Quest icon placeholder */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                  border: `3px solid ${questPalette.start}`,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                }}
              >
                🎯
              </div>

              {/* Right: Quest details */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: 10,
                }}
              >
                {/* Quest name */}
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                  }}
                >
                  {questName}
                </div>

                {/* Stats grid */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {/* Reward */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${questPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${questPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>REWARD</div>
                    <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: questPalette.start }}>+{reward} 🐾</div>
                  </div>

                  {/* Slots Left */}
                  {slotsLeft !== '—' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: `${questPalette.start}20`,
                        borderRadius: 8,
                        border: `2px solid ${questPalette.start}40`,
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>SLOTS</div>
                      <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: questPalette.start }}>{slotsLeft} left</div>
                    </div>
                  )}

                  {/* Expires */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${questPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${questPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>ENDS</div>
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: '#ffffff', opacity: 0.9 }}>{expires}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: Powered by */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 12,
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Quest #{questId}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // OnchainStats frame type - Yu-Gi-Oh! Card Structure
  if (type === 'onchainstats') {
    const totalTxs = readParam(url, 'totalTxs', '0')
    const balance = readParam(url, 'balance', '0.00')
    const score = readParam(url, 'score', '0')
    const address = readParam(url, 'address', user)

    const statsPalette = {
      start: '#00d4ff',
      end: '#4de4ff'
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a2a 30%, #0a1f1f 60%, #0a0a0a 100%)',
          }}
        >
          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${statsPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${statsPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: 14,
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
                background: `linear-gradient(180deg, ${statsPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with ONCHAIN badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${statsPalette.start}, ${statsPalette.end})`,
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                ONCHAIN
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {chain}
              </div>
            </div>

            {/* Main content */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: 16,
              }}
            >
              {/* Left: Stats icon */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${statsPalette.start}, ${statsPalette.end})`,
                  border: `3px solid ${statsPalette.start}`,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                📊
              </div>

              {/* Right: Stats data */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: 10,
                }}
              >
                {/* User address */}
                <div
                  style={{
                    display: 'flex',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                  }}
                >
                  {address ? shortenAddress(address) : fid ? `FID ${fid}` : 'Onchain Stats'}
                </div>

                {/* Stats grid */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {/* Transactions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${statsPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${statsPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>TXS</div>
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: statsPalette.start }}>{totalTxs}</div>
                  </div>

                  {/* Balance */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${statsPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${statsPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>BALANCE</div>
                    <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: statsPalette.start }}>{balance} ETH</div>
                  </div>

                  {/* Score */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${statsPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${statsPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>SCORE</div>
                    <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: '#ffffff', opacity: 0.9 }}>{score}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 12,
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • {chain}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Leaderboards frame type - Yu-Gi-Oh! Card Structure
  if (type === 'leaderboards') {
    const season = readParam(url, 'season', 'Current Season')
    const limit = readParam(url, 'limit', '10')

    const leaderboardPalette = {
      start: '#7c5cff',
      end: '#a78bff'
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2a 30%, #1f0f2f 60%, #0a0a0a 100%)',
          }}
        >
          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${leaderboardPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${leaderboardPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: 14,
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
                background: `linear-gradient(180deg, ${leaderboardPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with LEADERBOARD badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${leaderboardPalette.start}, ${leaderboardPalette.end})`,
                  border: `2px solid ${leaderboardPalette.start}`,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                LEADERBOARD
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {chain}
              </div>
            </div>

            {/* Main content */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: 16,
              }}
            >
              {/* Left: Trophy icon */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${leaderboardPalette.start}, ${leaderboardPalette.end})`,
                  border: `3px solid ${leaderboardPalette.start}`,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                🏆
              </div>

              {/* Right: Leaderboard info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: 10,
                }}
              >
                {/* Title */}
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                  }}
                >
                  Top Performers
                </div>

                {/* Stats info */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {/* Season */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${leaderboardPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${leaderboardPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>SEASON</div>
                    <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: leaderboardPalette.start }}>{season}</div>
                  </div>

                  {/* Top limit */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `${leaderboardPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${leaderboardPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>SHOWING</div>
                    <div style={{ display: 'flex', fontSize: 16, fontWeight: 800, color: leaderboardPalette.start }}>Top {limit}</div>
                  </div>

                  {/* Categories */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '8px 12px',
                      background: `${leaderboardPalette.start}20`,
                      borderRadius: 8,
                      border: `2px solid ${leaderboardPalette.start}40`,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>TRACKING</div>
                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 600, color: '#ffffff', opacity: 0.8 }}>
                      GM Streaks • Quests • XP • Badges
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 12,
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Multichain Rankings
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  }

  // Default: onchainstats
  // Note: fid and user already declared at top (lines 34-35)
  const txs = readParam(url, 'txs', '—')
  const volume = readParam(url, 'volume', '—')
  const balance = readParam(url, 'balance', '—')
  const builder = readParam(url, 'builder', '—')
  const age = readParam(url, 'age', '—')
  const firstTx = readParam(url, 'firstTx', '—')

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
            background: 'linear-gradient(135deg, rgba(95, 179, 255, 0.08), rgba(255, 210, 90, 0.06))',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 24, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7 }}>Onchain dossier</span>
            <span style={{ fontSize: 54, fontWeight: 700 }}>Command Deck Metrics</span>
            <div style={{ display: 'flex', fontSize: 28, opacity: 0.82 }}>
              <span>{user ? shortenAddress(user) : `FID: ${fid}`}</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
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
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              padding: '32px',
              borderRadius: 20,
              background: 'rgba(4, 8, 20, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7 }}>Total Transactions</span>
              <span style={{ fontSize: 34, fontWeight: 700 }}>{txs}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7 }}>Onchain Volume</span>
              <span style={{ fontSize: 34, fontWeight: 700 }}>{volume}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7 }}>Current Balance</span>
              <span style={{ fontSize: 34, fontWeight: 700 }}>{balance}</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              fontSize: 22,
              opacity: 0.8,
            }}
          >
            <span>Builder: {builder}</span>
            <span>•</span>
            <span>Age: {age}</span>
            <span>•</span>
            <span>First TX: {firstTx}</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 96,
            right: 96,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            opacity: 0.6,
            letterSpacing: '2px',
          }}
        >
          <span>Powered by Gmeowbased</span>
          <span>{chain} • Onchain Stats</span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  )
}
