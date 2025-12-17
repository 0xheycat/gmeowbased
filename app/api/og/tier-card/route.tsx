/**
 * Phase 5.6: OG Image API Route - Tier Card Generator
 * 
 * Generates dynamic 1200x628 OG images for viral badge sharing
 * Supports 5 tier templates with user avatar, username, score, and tier badge
 * 
 * Route: /api/og/tier-card?fid=xxx&badgeId=yyy
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges/badges'
import { getSupabaseServerClient } from '@/lib/supabase/edge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 1200
const HEIGHT = 628

// Tier configuration matching Phase 5.4/5.5
const TIER_CONFIG = {
  mythic: { 
    color: '#9C27FF',
    label: 'Mythic',
    emoji: '🌟',
    gradient: { start: '#9C27FF', mid: '#E91E63', end: '#FF6B9D' }
  },
  legendary: { 
    color: '#FFD966',
    label: 'Legendary',
    emoji: '👑',
    gradient: { start: '#FFC107', mid: '#FFD966', end: '#FF6F00' }
  },
  epic: { 
    color: '#61DFFF',
    label: 'Epic',
    emoji: '💎',
    gradient: { start: '#61DFFF', mid: '#00BCD4', end: '#0097A7' }
  },
  rare: { 
    color: '#A18CFF',
    label: 'Rare',
    emoji: '⚡',
    gradient: { start: '#A18CFF', mid: '#7E57C2', end: '#5E35B1' }
  },
  common: { 
    color: '#D3D7DC',
    label: 'Common',
    emoji: '✨',
    gradient: { start: '#D3D7DC', mid: '#9E9E9E', end: '#757575' }
  }
} as const

type TierType = keyof typeof TIER_CONFIG

interface TierCardProps {
  fid: string
  tier: TierType
  username: string
  avatar?: string
  score: number
  badgeName: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fidParam = searchParams.get('fid')
    const badgeId = searchParams.get('badgeId')

    // Validate required params
    if (!fidParam) {
      return new ImageResponse(
        <ErrorImage message="Missing FID parameter" />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    const fid = parseInt(fidParam, 10)
    if (isNaN(fid)) {
      return new ImageResponse(
        <ErrorImage message="Invalid FID parameter" />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    // Fetch user data from Supabase
    const supabase = getSupabaseServerClient()
    let userData: TierCardProps | null = null

    if (supabase) {
      try {
        // Get user profile from Supabase
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('fid, username, pfp_url, neynar_tier, neynar_score')
          .eq('fid', fid)
          .single()

        if (profile) {
          // Get user badges
          const badges = await getUserBadges(fid)
          const badge = badgeId 
            ? badges.find(b => b.badgeId === badgeId)
            : badges[0] // Get first badge if no badgeId specified

          const registry = await loadBadgeRegistry()
          const badgeMetadata = badge 
            ? registry.badges.find(b => b.id === badge.badgeId)
            : null

          userData = {
            fid: fidParam,
            tier: (profile.neynar_tier as TierType) || 'common',
            username: profile.username || `user${fid}`,
            avatar: profile.pfp_url || undefined,
            score: profile.neynar_score || 0,
            badgeName: badgeMetadata?.name || `${TIER_CONFIG[profile.neynar_tier as TierType || 'common']?.label} Badge`,
          }
        }
      } catch (error) {
        console.error('[OG Image] Supabase fetch error:', error)
      }
    }

    // Fallback to mock data if user not found
    if (!userData) {
      userData = {
        fid: fidParam,
        tier: 'common',
        username: `user${fid}`,
        avatar: `https://i.pravatar.cc/300?u=${fid}`,
        score: 0,
        badgeName: 'Gmeowbased Badge',
      }
    }

    return new ImageResponse(
      <TierCard {...userData} />,
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Content-Type': 'image/png',
        },
      }
    )
  } catch (error) {
    console.error('[OG Image Error]', error)
    return new ImageResponse(
      <ErrorImage message="Failed to generate image" />,
      { width: WIDTH, height: HEIGHT }
    )
  }
}

function TierCard({ fid, tier, username, avatar, score, badgeName }: TierCardProps) {
  const config = TIER_CONFIG[tier]
  
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 70% 30%, ${config.gradient.start}40, transparent 50%),
                       radial-gradient(circle at 30% 70%, ${config.gradient.mid}30, transparent 50%),
                       linear-gradient(135deg, #1a1a1a, #000000)`,
        }}
      />

      {/* Glow overlay */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${config.gradient.start}30, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Main content container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* Header: Gmeowbased branding */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              background: `linear-gradient(135deg, ${config.gradient.start}, ${config.gradient.mid})`,
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            GMEOWBASED
          </div>
        </div>

        {/* Main card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
            background: `linear-gradient(135deg, ${config.gradient.start}15, transparent)`,
            border: `3px solid ${config.color}`,
            borderRadius: 32,
            padding: '48px 64px',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Avatar */}
          {avatar && (
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                border: `4px solid ${config.color}`,
                overflow: 'hidden',
                display: 'flex',
                boxShadow: `0 0 40px ${config.color}50`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img
                src={avatar}
                alt=""
                width={160}
                height={160}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Username */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            @{username}
          </div>

          {/* Tier badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: `linear-gradient(135deg, ${config.gradient.start}, ${config.gradient.mid})`,
              padding: '16px 40px',
              borderRadius: 16,
              boxShadow: `0 8px 32px ${config.color}40`,
            }}
          >
            <div style={{ fontSize: 40 }}>{config.emoji}</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '0.05em',
              }}
            >
              {config.label.toUpperCase()}
            </div>
          </div>

          {/* Score */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: '#ffffff80',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Neynar Score
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: config.color,
              }}
            >
              {score}
            </div>
          </div>
        </div>

        {/* Footer: FID + CTA */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 60,
            right: 60,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#ffffff60',
            }}
          >
            FID: {fid}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: config.color,
            }}
          >
            gmeowhq.art 🎯
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorImage({ message }: { message: string }) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a, #000000)',
        color: '#ff4444',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: 72 }}>⚠️</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 24 }}>
        Error
      </div>
      <div style={{ fontSize: 20, color: '#ffffff80', marginTop: 12 }}>
        {message}
      </div>
    </div>
  )
}
