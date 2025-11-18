/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import * as viralAchievements from '@/lib/viral-achievements'
import {
  checkAchievements,
  awardAchievement,
  checkAndAwardAchievements,
  getUserAchievements,
  getUserAchievementDetails,
  ACHIEVEMENTS,
} from '@/lib/viral-achievements'

vi.mock('@/lib/supabase-server')
vi.mock('@/lib/viral-notifications')

// Helper to create mock Supabase client with query results
function createMockSupabase(queryResults: {
  achievements?: any[]
  viralCount?: number
  recasts?: any[]
  megaViral?: any[]
}) {
  let callCount = 0
  
  return {
    from: vi.fn((table: string) => {
      if (table === 'viral_milestone_achievements') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: queryResults.achievements || [],
            error: null,
          }),
        }
      }
      
      if (table === 'badge_casts') {
        callCount++
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn((callback: any) => {
            // First badge_casts query: viral count
            if (callCount === 1) {
              return Promise.resolve(callback({ count: queryResults.viralCount || 0 }))
            }
            // Second badge_casts query: recasts sum
            if (callCount === 2) {
              return Promise.resolve(callback({ 
                data: queryResults.recasts || [], 
                error: null 
              }))
            }
            // Third badge_casts query: mega viral check
            return Promise.resolve(callback({ 
              data: queryResults.megaViral || [], 
              error: null 
            }))
          }),
        }
        return chain
      }
      
      return {}
    }),
  } as any
}

describe('viral-achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ACHIEVEMENTS configuration', () => {
    it('should have all 4 achievement types defined', () => {
      expect(ACHIEVEMENTS).toHaveProperty('first_viral')
      expect(ACHIEVEMENTS).toHaveProperty('10_viral_casts')
      expect(ACHIEVEMENTS).toHaveProperty('100_shares')
      expect(ACHIEVEMENTS).toHaveProperty('mega_viral_master')
    })

    it('should have proper XP rewards for each achievement', () => {
      expect(ACHIEVEMENTS.first_viral.xpReward).toBe(100)
      expect(ACHIEVEMENTS['10_viral_casts'].xpReward).toBe(500)
      expect(ACHIEVEMENTS['100_shares'].xpReward).toBe(250)
      expect(ACHIEVEMENTS.mega_viral_master.xpReward).toBe(1000)
    })
  })

  describe('getUserAchievements', () => {
    it('should fetch user achievements from database', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { achievement_type: 'first_viral' },
            { achievement_type: '100_shares' },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as Mock).mockReturnValue(mockSupabase)

      const achievements = await getUserAchievements(12345)

      expect(achievements).toEqual(['first_viral', '100_shares'])
    })

    it('should validate FID and return empty for invalid input', async () => {
      const achievements = await getUserAchievements(-1)
      expect(achievements).toEqual([])
    })
  })

  describe('checkAchievements', () => {
    it('should detect first_viral achievement', async () => {
      const mockSupabase = createMockSupabase({
        viralCount: 1,
        recasts: [{ recasts_count: 50 }],
        megaViral: [],
      })

      const result = await checkAchievements(12345, '0xtest', { supabase: mockSupabase })

      expect(result.unlocked).toContain('first_viral')
      expect(result.unlocked).not.toContain('10_viral_casts')
    })

    it('should detect 10_viral_casts achievement', async () => {
      const mockSupabase = createMockSupabase({
        achievements: [{ achievement_type: 'first_viral' }],
        viralCount: 10,
        recasts: [],
        megaViral: [],
      })

      const result = await checkAchievements(12345, undefined, { supabase: mockSupabase })

      expect(result.unlocked).toContain('10_viral_casts')
      expect(result.alreadyHas).toContain('first_viral')
    })

    it('should detect 100_shares achievement', async () => {
      const mockSupabase = createMockSupabase({
        achievements: [{ achievement_type: 'first_viral' }],
        viralCount: 5,
        recasts: [
          { recasts_count: 50 },
          { recasts_count: 30 },
          { recasts_count: 25 },
        ],
        megaViral: [],
      })

      const result = await checkAchievements(12345, undefined, { supabase: mockSupabase })

      expect(result.unlocked).toContain('100_shares')
      expect(result.alreadyHas).toContain('first_viral')
    })

    it('should detect mega_viral_master achievement', async () => {
      const mockSupabase = createMockSupabase({
        viralCount: 1,
        recasts: [],
        megaViral: [{ cast_hash: '0xmega' }],
      })

      const result = await checkAchievements(12345, undefined, { supabase: mockSupabase })

      expect(result.unlocked).toContain('mega_viral_master')
    })
  })

  describe('awardAchievement', () => {
    it('should award achievement and update XP', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ach-123',
            fid: 12345,
            achievement_type: 'first_viral',
          },
          error: null,
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any

      const mockDispatch = vi.fn().mockResolvedValue({ success: true })

      const success = await awardAchievement(12345, 'first_viral', '0xtest', {
        supabase: mockSupabase,
        dispatchNotification: mockDispatch,
      })

      expect(success).toBe(true)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fid: 12345,
          achievement_type: 'first_viral',
          cast_hash: '0xtest',
        })
      )
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_user_xp', {
        p_fid: 12345,
        p_xp_amount: 100,
      })
    })

    it('should handle duplicate achievement gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505' }, // PostgreSQL unique violation
        }),
      } as any

      const success = await awardAchievement(12345, 'first_viral', undefined, {
        supabase: mockSupabase,
      })

      expect(success).toBe(false) // GI-7: Graceful handling
    })

    it('should validate input parameters', async () => {
      const mockSupabase = {} as any
      await expect(awardAchievement(0, 'first_viral', undefined, { supabase: mockSupabase })).resolves.toBe(false)
      await expect(awardAchievement(-1, 'first_viral', undefined, { supabase: mockSupabase })).resolves.toBe(false)
    })
  })

  describe('checkAndAwardAchievements', () => {
    it('should check and award multiple achievements in parallel', async () => {
      const baseMock = createMockSupabase({
        viralCount: 5,
        recasts: [{ recasts_count: 120 }],
        megaViral: [],
      })

      // Track table queries to differentiate check vs award phase
      const tableQueries = new Map<string, number>()
      const originalFrom = baseMock.from
      
      const mockSupabase = {
        ...baseMock,
        from: vi.fn((table: string) => {
          const count = (tableQueries.get(table) || 0) + 1
          tableQueries.set(table, count)
          
          // Award phase for viral_milestone_achievements (after initial check queries)
          if (table === 'viral_milestone_achievements' && count > 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'ach-1' },
                error: null,
              }),
            }
          }
          if (table === 'gmeow_rank_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          // Check phase - use base mock
          return originalFrom.call(baseMock, table)
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any
      
      const mockDispatch = vi.fn().mockResolvedValue({ success: true })

      const count = await checkAndAwardAchievements(12345, '0xtest', {
        supabase: mockSupabase,
        dispatchNotification: mockDispatch,
      })

      expect(count).toBe(2) // first_viral + 100_shares
    })

    it('should handle partial failures', async () => {
      const baseMock = createMockSupabase({
        viralCount: 5,
        recasts: [{ recasts_count: 120 }],
        megaViral: [],
      })

      const tableQueries = new Map<string, number>()
      const originalFrom = baseMock.from
      let awardCallCount = 0

      const mockSupabase = {
        ...baseMock,
        from: vi.fn((table: string) => {
          const count = (tableQueries.get(table) || 0) + 1
          tableQueries.set(table, count)
          
          // Award phase - first succeeds, second fails
          if (table === 'viral_milestone_achievements' && count > 1) {
            awardCallCount++
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              insert: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: awardCallCount === 1 ? { id: 'ach-1' } : null,
                error: awardCallCount === 1 ? null : new Error('Award failed'),
              }),
            }
          }
          if (table === 'gmeow_rank_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          return originalFrom.call(baseMock, table)
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any

      const mockDispatch = vi.fn().mockResolvedValue({ success: true })

      const count = await checkAndAwardAchievements(12345, undefined, {
        supabase: mockSupabase,
        dispatchNotification: mockDispatch,
      })

      expect(count).toBe(1) // Only 1 succeeded
    })
  })

  describe('getUserAchievementDetails', () => {
    it('should return full achievement details with config', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'ach-1',
              fid: 12345,
              achievement_type: 'first_viral',
              achieved_at: '2025-11-17T12:00:00Z',
              cast_hash: '0xtest',
              metadata: { xp_awarded: 100 },
            },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as Mock).mockReturnValue(mockSupabase)

      const details = await getUserAchievementDetails(12345)

      expect(details).toHaveLength(1)
      expect(details[0]).toMatchObject({
        achievementType: 'first_viral',
        name: 'First Viral',
        xpReward: 100,
        icon: '⚡',
      })
    })
  })
})
