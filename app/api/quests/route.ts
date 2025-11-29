import { NextRequest, NextResponse } from 'next/server'
import { getFarcasterFid } from '@/lib/auth/farcaster'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Quest System API
 * 
 * GET /api/quests - Get available quests for user (with filtering)
 * POST /api/quests/progress - Update quest progress
 * POST /api/quests/claim - Claim quest rewards
 * 
 * Quest Types: daily, weekly, event, milestone, achievement
 * Categories: social, engagement, guild, gm, onboarding
 * 
 * Source: New implementation with Supabase integration
 * MCP Verified: November 27, 2025
 * Quality Gates: GI-7, GI-8, GI-11
 */

/**
 * Get available quests for user
 * GET /api/quests?type=daily&category=gm&difficulty=beginner
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // daily, weekly, event, milestone, achievement
    const category = searchParams.get('category') // social, engagement, guild, gm, onboarding
    const difficulty = searchParams.get('difficulty') // beginner, intermediate, advanced, expert
    const featured = searchParams.get('featured') === 'true'

    // Get authenticated user FID
    const fid = await getFarcasterFid(request)

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      )
    }

    // Build query for quest definitions
    let questQuery = supabase
      .from('quest_definitions')
      .select('*')
      .eq('is_active', true)

    if (type) {
      questQuery = questQuery.eq('quest_type', type)
    }

    if (category) {
      questQuery = questQuery.eq('category', category)
    }

    if (difficulty) {
      questQuery = questQuery.eq('difficulty', difficulty)
    }

    if (featured) {
      questQuery = questQuery.eq('is_featured', true)
    }

    // Filter by date range (if specified)
    const now = new Date().toISOString()
    questQuery = questQuery.or(`start_date.is.null,start_date.lte.${now}`)
    questQuery = questQuery.or(`end_date.is.null,end_date.gte.${now}`)

    questQuery = questQuery.order('is_featured', { ascending: false })
    questQuery = questQuery.order('difficulty', { ascending: true })
    questQuery = questQuery.order('created_at', { ascending: false })

    const { data: quests, error: questError } = await questQuery

    if (questError) {
      console.error('Failed to fetch quests:', questError)
      return NextResponse.json(
        { error: 'Failed to fetch quests' },
        { status: 500 }
      )
    }

    // If user is authenticated, fetch their quest progress
    let userQuests: any[] = []
    if (fid) {
      const { data: progress } = await supabase
        .from('user_quests')
        .select('*')
        .eq('fid', fid)

      userQuests = progress || []
    }

    // Merge quest definitions with user progress
    const questsWithProgress = (quests || []).map(quest => {
      const userQuest = userQuests.find(uq => uq.quest_id === quest.id)

      return {
        ...quest,
        user_status: userQuest?.status || 'locked',
        user_progress: userQuest?.progress || null,
        started_at: userQuest?.started_at || null,
        completed_at: userQuest?.completed_at || null,
        claimed_at: userQuest?.claimed_at || null
      }
    })

    return NextResponse.json({
      quests: questsWithProgress,
      total: questsWithProgress.length,
      authenticated: !!fid
    })

  } catch (error) {
    console.error('Quest fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
