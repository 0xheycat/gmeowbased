import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'edge'

const RARITY_COLORS = {
  common: '#A0A0A0',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
  mythic: '#F44336',
}

const RARITY_ICONS = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟠',
  mythic: '🔴',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  const requestId = generateRequestId()

  try {
    // Parse imageId: "quest-legendary-42" or "achievement-rare-badge"
    const parts = params.imageId.split('-')
    const category = parts[0] || 'default'
    const rarity = (parts[1] || 'common') as keyof typeof RARITY_COLORS
    const identifier = parts.slice(2).join('-') || 'unknown'

    const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common
    const rarityIcon = RARITY_ICONS[rarity] || RARITY_ICONS.common

    // Category icons
    const categoryIcons: Record<string, string> = {
      quest: '⚔️',
      achievement: '🏆',
      event: '🎉',
      legendary: '👑',
      seasonal: '🌟',
      default: '🎮',
    }

    const categoryIcon = categoryIcons[category] || categoryIcons.default

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            backgroundImage: `radial-gradient(circle at 25% 25%, ${rarityColor}20 0%, transparent 50%), radial-gradient(circle at 75% 75%, ${rarityColor}20 0%, transparent 50%)`,
            padding: '40px',
          }}
        >
          {/* Border frame with rarity color */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              border: `8px solid ${rarityColor}`,
              borderRadius: '24px',
              padding: '60px',
              position: 'relative',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            }}
          >
            {/* Rarity indicator corner */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '48px',
                display: 'flex',
              }}
            >
              {rarityIcon}
            </div>

            {/* Category icon */}
            <div
              style={{
                fontSize: '200px',
                marginBottom: '40px',
                display: 'flex',
              }}
            >
              {categoryIcon}
            </div>

            {/* Category label */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                marginBottom: '20px',
                display: 'flex',
              }}
            >
              {category}
            </div>

            {/* Identifier */}
            <div
              style={{
                fontSize: '36px',
                color: '#888888',
                marginBottom: '40px',
                display: 'flex',
              }}
            >
              #{identifier}
            </div>

            {/* Rarity badge */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: rarityColor,
                backgroundColor: `${rarityColor}20`,
                padding: '16px 32px',
                borderRadius: '12px',
                border: `2px solid ${rarityColor}`,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                display: 'flex',
              }}
            >
              {rarity}
            </div>

            {/* Gmeowbased Adventure branding */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                fontSize: '24px',
                color: '#666666',
                display: 'flex',
              }}
            >
              🐱 Gmeowbased Adventure
            </div>

            {/* Base network badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                fontSize: '20px',
                color: '#0052FF',
                backgroundColor: '#0052FF20',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #0052FF',
                fontWeight: 'bold',
                display: 'flex',
              }}
            >
              BASE
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
        headers: {
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('Error generating NFT image:', error)

    // Return error image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            fontSize: '48px',
          }}
        >
          <div style={{ display: 'flex' }}>⚠️ Error</div>
          <div style={{ fontSize: '24px', marginTop: '20px', display: 'flex' }}>
            Could not generate image
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
        headers: {
          'X-Request-ID': requestId,
        },
      }
    )
  }
}
