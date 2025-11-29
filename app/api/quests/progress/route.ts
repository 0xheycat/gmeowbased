import { NextRequest, NextResponse } from 'next/server'
import { getFarcasterFid, requireAuth } from '@/lib/auth/farcaster'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Quest Progress Update API
 * 
 * POST /api/quests/progress
 * Body: { quest_id: number, progress: object }
 * 
 * Updates user quest progress
 * Automatically marks as completed when progress meets requirements
 * 
 * Source: New implementation
 * MCP Verified: November 27, 2025
 */

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const fid = await requireAuth(request)

    const body = await request.json()
    const { quest_id, progress } = body

    if (!quest_id) {
      return NextResponse.json(
        { error: 'quest_id required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      )
    }

    // Get quest definition
    const { data: quest, error: questError } = await supabase
      .from('quest_definitions')
      .select('*')
      .eq('id', quest_id)
      .eq('is_active', true)
      .single()

    if (questError || !quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      )
    }

    // Get or create user quest record
    const { data: existingUserQuest } = await supabase
      .from('user_quests')
      .select('*')
      .eq('fid', fid)
      .eq('quest_id', quest_id)
      .single()

    // Check if quest is completed
    const isCompleted = checkQuestCompletion(quest.requirements, progress)
    const newStatus = isCompleted ? 'completed' : 'in_progress'

    if (existingUserQuest) {
      // Update existing record
      const updateData: any = {
        progress,
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (!existingUserQuest.started_at) {
        updateData.started_at = new Date().toISOString()
      }

      if (isCompleted && !existingUserQuest.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updated, error: updateError } = await supabase
        .from('user_quests')
        .update(updateData)
        .eq('fid', fid)
        .eq('quest_id', quest_id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update quest progress:', updateError)
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        quest: updated,
        completed: isCompleted
      })

    } else {
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('user_quests')
        .insert({
          fid,
          quest_id,
          status: newStatus,
          progress,
          started_at: new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create quest progress:', createError)
        return NextResponse.json(
          { error: 'Failed to create progress' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        quest: created,
        completed: isCompleted,
        new: true
      })
    }

  } catch (error: any) {
    console.error('Quest progress error:', error)
    
    if (error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Check if quest requirements are met based on progress
 */
function checkQuestCompletion(requirements: any, progress: any): boolean {
  if (!requirements || !progress) return false

  // Parse JSONB if needed
  const req = typeof requirements === 'string' ? JSON.parse(requirements) : requirements
  const prog = typeof progress === 'string' ? JSON.parse(progress) : progress

  // Simple completion check: current >= target
  if (prog.current !== undefined && prog.target !== undefined) {
    return prog.current >= prog.target
  }

  // Count-based completion
  if (req.count && prog.count) {
    return prog.count >= req.count
  }

  // Default: not completed
  return false
}
