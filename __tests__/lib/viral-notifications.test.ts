/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  dispatchViralNotification,
  processPendingNotifications,
} from '@/lib/viral-notifications'

jest.mock('@/lib/neynar-server')
jest.mock('@/lib/supabase-server')

describe('viral-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('dispatchViralNotification', () => {
    it('should send tier upgrade notification successfully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ token: 'test-token-123' }],
          error: null,
        }),
        rpc: jest.fn().mockResolvedValue({ error: null }),
      }

      const mockClient = {
        publishFrameNotification: jest.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-123',
            successfulTokens: ['test-token-123'],
          },
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)
      ;(getNeynarServerClient as jest.Mock).mockReturnValue(mockClient)

      const result = await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: 12345,
        castHash: '0xtest',
        oldTier: 'engaging',
        newTier: 'popular',
        xpBonus: 100,
      })

      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notif-123')
      expect(mockClient.publishFrameNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationDetails: expect.objectContaining({
            title: expect.stringContaining('Viral Tier Upgrade'),
            body: expect.stringContaining('+100 XP'),
            tokens: ['test-token-123'],
          }),
        })
      )
    })

    it('should send achievement notification successfully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ token: 'test-token-456' }],
          error: null,
        }),
        rpc: jest.fn().mockResolvedValue({ error: null }),
      }

      const mockClient = {
        publishFrameNotification: jest.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-456',
            successfulTokens: ['test-token-456'],
          },
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)
      ;(getNeynarServerClient as jest.Mock).mockReturnValue(mockClient)

      const result = await dispatchViralNotification({
        type: 'achievement',
        fid: 12345,
        achievementType: 'first_viral',
        castHash: '0xtest',
        xpBonus: 100,
      })

      expect(result.success).toBe(true)
      expect(mockClient.publishFrameNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationDetails: expect.objectContaining({
            title: expect.stringContaining('First Viral'),
          }),
        })
      )
    })

    it('should handle rate limiting gracefully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ token: 'test-token-rate-limited' }],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      // Simulate rate limiter blocking token
      const rateLimiter = require('@/lib/viral-notifications').rateLimiter
      if (rateLimiter) {
        jest.spyOn(rateLimiter, 'canSendNotification').mockReturnValue(false)
        jest.spyOn(rateLimiter, 'getTimeUntilAvailable').mockReturnValue(25000)
      }

      const result = await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: 12345,
        castHash: '0xtest',
        oldTier: 'active',
        newTier: 'engaging',
        xpBonus: 50,
      })

      expect(result.success).toBe(false)
      expect(result.rateLimited).toBe(true)
      expect(result.error).toContain('rate limited')
    })

    it('should handle missing notification tokens', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const result = await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: 12345,
        castHash: '0xtest',
        oldTier: 'active',
        newTier: 'engaging',
        xpBonus: 50,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No notification tokens')
    })

    it('should validate FID input', async () => {
      const result = await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: -1, // Invalid FID
        castHash: '0xtest',
        oldTier: 'active',
        newTier: 'engaging',
        xpBonus: 50,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid FID')
    })
  })

  describe('processPendingNotifications', () => {
    it('should process pending notifications in batches', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [
            {
              notification_type: 'tier_upgrade',
              fid: 12345,
              cast_hash: '0xtest1',
              tier: 'popular',
              xp_bonus: 100,
            },
            {
              notification_type: 'achievement',
              fid: 67890,
              achievement_type: 'first_viral',
              cast_hash: '0xtest2',
              xp_bonus: 100,
            },
          ],
          error: null,
        }),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue({ error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockDispatch = jest.fn().mockResolvedValue({ success: true })
      jest.spyOn(require('@/lib/viral-notifications'), 'dispatchViralNotification').mockImplementation(mockDispatch)

      const successCount = await processPendingNotifications()

      expect(successCount).toBe(2)
      expect(mockDispatch).toHaveBeenCalledTimes(2)
      expect(mockSupabase.limit).toHaveBeenCalledWith(50) // GI-10: Batch limit
    })

    it('should stop processing on rate limit', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { notification_type: 'tier_upgrade', fid: 1, cast_hash: '0x1', tier: 'viral', xp_bonus: 250 },
            { notification_type: 'tier_upgrade', fid: 2, cast_hash: '0x2', tier: 'viral', xp_bonus: 250 },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)

      const mockDispatch = jest
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, rateLimited: true })

      jest.spyOn(require('@/lib/viral-notifications'), 'dispatchViralNotification').mockImplementation(mockDispatch)

      const successCount = await processPendingNotifications()

      expect(successCount).toBe(1)
      expect(mockDispatch).toHaveBeenCalledTimes(2) // Should stop after rate limit
    })
  })
})
