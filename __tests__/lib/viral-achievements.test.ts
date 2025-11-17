/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  checkAchievements,
  awardAchievement,
  checkAndAwardAchievements,
  getUserAchievements,
  getUserAchievementDetails,
  ACHIEVEMENTS,
} from '@/lib/viral-achievements'

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/viral-notifications')

describe('viral-achievements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { achievement_type: 'first_viral' },
            { achievement_type: '100_shares' },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

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
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn()
          .mockResolvedValueOnce({ count: 1 }) // 1 viral cast
          .mockResolvedValueOnce({ data: [{ recasts_count: 50 }], error: null }) // Total recasts
          .mockResolvedValueOnce({ data: [], error: null }), // No mega viral
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockGetUserAchievements = jest.fn().mockResolvedValue([])
      jest.spyOn(require('@/lib/viral-achievements'), 'getUserAchievements').mockImplementation(mockGetUserAchievements)

      const result = await checkAchievements(12345, '0xtest')

      expect(result.unlocked).toContain('first_viral')
      expect(result.unlocked).not.toContain('10_viral_casts')
    })

    it('should detect 10_viral_casts achievement', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn()
          .mockResolvedValueOnce({ count: 10 }) // 10 viral casts
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockGetUserAchievements = jest.fn().mockResolvedValue(['first_viral'])
      jest.spyOn(require('@/lib/viral-achievements'), 'getUserAchievements').mockImplementation(mockGetUserAchievements)

      const result = await checkAchievements(12345)

      expect(result.unlocked).toContain('10_viral_casts')
      expect(result.alreadyHas).toContain('first_viral')
    })

    it('should detect 100_shares achievement', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn()
          .mockResolvedValueOnce({ count: 5 })
          .mockResolvedValueOnce({
            data: [
              { recasts_count: 50 },
              { recasts_count: 30 },
              { recasts_count: 25 },
            ],
            error: null,
          }) // Total = 105
          .mockResolvedValueOnce({ data: [], error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockGetUserAchievements = jest.fn().mockResolvedValue(['first_viral'])
      jest.spyOn(require('@/lib/viral-achievements'), 'getUserAchievements').mockImplementation(mockGetUserAchievements)

      const result = await checkAchievements(12345)

      expect(result.unlocked).toContain('100_shares')
    })

    it('should detect mega_viral_master achievement', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [{ cast_hash: '0xmega' }], error: null }), // Has mega viral
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockGetUserAchievements = jest.fn().mockResolvedValue([])
      jest.spyOn(require('@/lib/viral-achievements'), 'getUserAchievements').mockImplementation(mockGetUserAchievements)

      const result = await checkAchievements(12345)

      expect(result.unlocked).toContain('mega_viral_master')
    })
  })

  describe('awardAchievement', () => {
    it('should award achievement and update XP', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'ach-123',
            fid: 12345,
            achievement_type: 'first_viral',
          },
          error: null,
        }),
        rpc: jest.fn().mockResolvedValue({ error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockDispatch = jest.fn().mockResolvedValue({ success: true })
      const { dispatchViralNotification } = await import('@/lib/viral-notifications')
      ;(dispatchViralNotification as jest.Mock).mockImplementation(mockDispatch)

      const success = await awardAchievement(12345, 'first_viral', '0xtest')

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
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505' }, // PostgreSQL unique violation
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const success = await awardAchievement(12345, 'first_viral')

      expect(success).toBe(false) // GI-7: Graceful handling
    })

    it('should validate input parameters', async () => {
      await expect(awardAchievement(0, 'first_viral')).resolves.toBe(false)
      await expect(awardAchievement(-1, 'first_viral')).resolves.toBe(false)
    })
  })

  describe('checkAndAwardAchievements', () => {
    it('should check and award multiple achievements in parallel', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        unlocked: ['first_viral', '100_shares'],
        alreadyHas: [],
      })

      const mockAward = jest.fn().mockResolvedValue(true)

      jest.spyOn(require('@/lib/viral-achievements'), 'checkAchievements').mockImplementation(mockCheck)
      jest.spyOn(require('@/lib/viral-achievements'), 'awardAchievement').mockImplementation(mockAward)

      const count = await checkAndAwardAchievements(12345, '0xtest')

      expect(count).toBe(2)
      expect(mockAward).toHaveBeenCalledTimes(2)
      expect(mockAward).toHaveBeenCalledWith(12345, 'first_viral', '0xtest')
      expect(mockAward).toHaveBeenCalledWith(12345, '100_shares', '0xtest')
    })

    it('should handle partial failures', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        unlocked: ['first_viral', '100_shares'],
        alreadyHas: [],
      })

      const mockAward = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Award failed'))

      jest.spyOn(require('@/lib/viral-achievements'), 'checkAchievements').mockImplementation(mockCheck)
      jest.spyOn(require('@/lib/viral-achievements'), 'awardAchievement').mockImplementation(mockAward)

      const count = await checkAndAwardAchievements(12345)

      expect(count).toBe(1) // Only 1 succeeded
    })
  })

  describe('getUserAchievementDetails', () => {
    it('should return full achievement details with config', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
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
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

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
