/**
 * Phase 1B: Frame State Management
 * 
 * Utilities for persisting frame interaction state across button clicks.
 * State is stored in Supabase frame_sessions table with 24-hour TTL.
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Types
export interface FrameState {
  currentStep?: number
  questProgress?: Record<string, boolean | string | number>
  gmCount?: number
  streak?: number
  lastAction?: string
  metadata?: Record<string, any>
}

export interface FrameSession {
  session_id: string
  fid: number
  state: FrameState
  created_at: string
  updated_at: string
}

// Supabase client (uses env vars)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomUUID()
}

/**
 * Save frame state to Supabase
 * @param sessionId - Unique session identifier
 * @param fid - Farcaster ID
 * @param state - Frame state object
 * @returns Success boolean
 */
export async function saveFrameState(
  sessionId: string,
  fid: number,
  state: FrameState
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('frame_sessions')
      .upsert({
        session_id: sessionId,
        fid,
        state,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[frame-state] Failed to save state:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[frame-state] Error saving state:', err)
    return false
  }
}

/**
 * Load frame state from Supabase
 * @param sessionId - Session identifier
 * @returns Frame session or null if not found/expired
 */
export async function loadFrameState(
  sessionId: string
): Promise<FrameSession | null> {
  try {
    const { data, error } = await supabase
      .from('frame_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error || !data) {
      console.log('[frame-state] Session not found:', sessionId)
      return null
    }

    // Check if session is expired (24 hours)
    const updatedAt = new Date(data.updated_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceUpdate > 24) {
      console.log('[frame-state] Session expired:', sessionId)
      await deleteFrameState(sessionId) // Cleanup
      return null
    }

    return data as FrameSession
  } catch (err) {
    console.error('[frame-state] Error loading state:', err)
    return null
  }
}

/**
 * Delete frame state from Supabase
 * @param sessionId - Session identifier
 */
export async function deleteFrameState(sessionId: string): Promise<void> {
  try {
    await supabase.from('frame_sessions').delete().eq('session_id', sessionId)
  } catch (err) {
    console.error('[frame-state] Error deleting state:', err)
  }
}

/**
 * Get all active sessions for a user
 * @param fid - Farcaster ID
 * @returns Array of active sessions
 */
export async function getUserSessions(fid: number): Promise<FrameSession[]> {
  try {
    const { data, error } = await supabase
      .from('frame_sessions')
      .select('*')
      .eq('fid', fid)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[frame-state] Error fetching user sessions:', error)
      return []
    }

    return (data as FrameSession[]) || []
  } catch (err) {
    console.error('[frame-state] Error fetching user sessions:', err)
    return []
  }
}

/**
 * Cleanup expired sessions (called via cron or manually)
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_frame_sessions')

    if (error) {
      console.error('[frame-state] Error during cleanup:', error)
      return 0
    }

    console.log(`[frame-state] Cleaned up ${data} expired sessions`)
    return data as number
  } catch (err) {
    console.error('[frame-state] Error during cleanup:', err)
    return 0
  }
}
