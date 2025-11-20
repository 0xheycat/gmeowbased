import { NextRequest, NextResponse } from 'next/server'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fidParam = searchParams.get('fid')
  const badgeIdParam = searchParams.get('badgeId')

  try {
    if (!fidParam) {
      return NextResponse.json({ error: 'Missing fid parameter' }, { status: 400 })
    }

    const fid = parseInt(fidParam)
    
    // Fetch badges
    const badges = await getUserBadges(fid)
    
    // Load registry
    const registry = await loadBadgeRegistry()
    
    // Find the specific badge
    const targetBadge = badges.find(b => b.badgeId === badgeIdParam)
    const registryEntry = registry[badgeIdParam || '']
    
    return NextResponse.json({
      success: true,
      fid,
      badgeId: badgeIdParam,
      badgeFound: !!targetBadge,
      registryFound: !!registryEntry,
      badge: targetBadge,
      registry: registryEntry,
      totalBadges: badges.length,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      name: error.name,
    }, { status: 500 })
  }
}
