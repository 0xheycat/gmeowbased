// User Rewards System for Phase 0
// Tracks first-time frame views and awards points/XP

import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { isOGUser } from '@/lib/badges/rarity-tiers'
import { trackError, trackInfo } from '@/lib/notifications/error-tracking'

export interface RewardResult {
  awarded: boolean
  isFirstView: boolean
  isOG: boolean
  points: number
  xp: number
  reason: string
}

/**
 * Check if user has viewed frames before and award rewards for new users
 * @param fid Farcaster FID
 * @param neynarScore User's Neynar score (for OG detection)
 * @returns RewardResult with awarded status and details
 */
export async function checkAndAwardNewUserRewards(
  fid: number,
  neynarScore: number | null | undefined
): Promise<RewardResult> {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    // Supabase not configured - skip rewards but don't error
    return {
      awarded: false,
      isFirstView: false,
      isOG: false,
      points: 0,
      xp: 0,
      reason: 'Supabase not configured',
    }
  }

  try {
    // Check if user profile exists (indicates prior engagement)
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('fid, onboarded_at, neynar_score')
      .eq('fid', fid)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows, which is expected for new users
      trackError('rewards_fetch_profile_error', fetchError, { function: 'trackFirstView', fid })
      return {
        awarded: false,
        isFirstView: false,
        isOG: false,
        points: 0,
        xp: 0,
        reason: `Database error: ${fetchError.message}`,
      }
    }

    const isFirstView = !existingProfile
    const isOG = isOGUser(neynarScore)

    // If user already has a profile, no rewards
    if (!isFirstView) {
      return {
        awarded: false,
        isFirstView: false,
        isOG,
        points: 0,
        xp: 0,
        reason: 'User already has profile',
      }
    }

    // New user! Award rewards based on OG status
    const points = isOG ? 1000 : 50
    const xp = isOG ? 0 : 30 // OG users get points only, new users get both

    // Create user profile with rewards
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        fid,
        neynar_score: neynarScore ?? 0,
        onboarded_at: new Date().toISOString(),
        og_nft_eligible: isOG,
      })

    if (insertError) {
      trackError('rewards_create_profile_error', insertError, { function: 'trackFirstView', fid })
      return {
        awarded: false,
        isFirstView: true,
        isOG,
        points: 0,
        xp: 0,
        reason: `Failed to create profile: ${insertError.message}`,
      }
    }

    // Log reward event (optional - for analytics)
    trackInfo(`rewards_new_user_awarded_fid_${fid}`, {
      points,
      xp,
      isOG,
      neynarScore,
    })

    return {
      awarded: true,
      isFirstView: true,
      isOG,
      points,
      xp,
      reason: isOG ? 'OG user bonus' : 'New user welcome bonus',
    }
  } catch (err) {
    trackError('rewards_unexpected_error', err, { function: 'trackFirstView', fid })
    return {
      awarded: false,
      isFirstView: false,
      isOG: false,
      points: 0,
      xp: 0,
      reason: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
    }
  }
}

/**
 * Track frame view without awarding rewards (for analytics)
 */
export async function trackFrameView(
  fid: number,
  frameType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Could create a frame_views table for analytics
    // For now, just return success
    return { success: true }
  } catch (err) {
    trackError('rewards_track_view_error', err, { function: 'trackPageView', fid })
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
