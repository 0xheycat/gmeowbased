import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

interface LeaderboardRealtimeOptions {
  period: 'daily' | 'weekly' | 'all_time'
  onUpdate: () => void
  onRankChange?: (payload: RankChangePayload) => void
  enabled?: boolean
}

export interface RankChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  fid: number
  oldRank?: number
  newRank: number
  username?: string
  totalScore: number
  rankChange?: number
}

interface LeaderboardRecord {
  fid: number
  global_rank: number
  total_score: number
  username?: string
  display_name?: string
  [key: string]: any
}

/**
 * Hook for subscribing to leaderboard changes via Supabase Realtime
 * 
 * Features:
 * - Subscribes to INSERT/UPDATE/DELETE on leaderboard_calculations
 * - Filters by period (daily, weekly, all_time)
 * - Calls onUpdate() for general data refresh
 * - Calls onRankChange() for specific rank change notifications
 * - Auto cleanup on unmount
 * 
 * NO EMOJIS - Icons only from components/icons
 */
export function useLeaderboardRealtime({
  period,
  onUpdate,
  onRankChange,
  enabled = true,
}: LeaderboardRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  useEffect(() => {
    if (!enabled) return

    const supabase = supabaseRef.current

    // Create unique channel name
    const channelName = `leaderboard:${period}`

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leaderboard_calculations',
          filter: `period=eq.${period}`,
        },
        (payload: RealtimePostgresChangesPayload<LeaderboardRecord>) => {
          console.log('[Leaderboard Realtime] Change detected:', payload.eventType, payload)

          // Call general update callback
          onUpdate()

          // Handle rank change notifications
          if (onRankChange && payload.new) {
            const newRecord = payload.new as LeaderboardRecord
            const oldRecord = payload.old as LeaderboardRecord | undefined

            const rankChangePayload: RankChangePayload = {
              type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              fid: newRecord.fid,
              oldRank: oldRecord?.global_rank,
              newRank: newRecord.global_rank,
              username: newRecord.username || newRecord.display_name,
              totalScore: newRecord.total_score,
              rankChange:
                oldRecord?.global_rank
                  ? oldRecord.global_rank - newRecord.global_rank
                  : undefined,
            }

            onRankChange(rankChangePayload)
          }
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
        console.log('[Leaderboard Realtime] Subscription status:', status)
      })

    channelRef.current = channel

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log('[Leaderboard Realtime] Unsubscribing from:', channelName)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [period, enabled, onUpdate, onRankChange])

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    },
  }
}
