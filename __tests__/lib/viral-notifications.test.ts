/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  dispatchViralNotification,
  processPendingNotifications,
} from '@/lib/viral-notifications'

vi.mock('@/lib/neynar-server')
vi.mock('@/lib/supabase-server')

describe('viral-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dispatchViralNotification', () => {
    it('should send tier upgrade notification successfully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ token: 'test-token-123' }],
          error: null,
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-123',
            successfulFids: [12345],
          },
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)
      ;(getNeynarServerClient as vi.Mock).mockReturnValue(mockClient)

      const result = await dispatchViralNotification({
        type: 'tier_upgrade',
        fid: 12345,
        castHash: '0xtest',
        oldTier: 'engaging',
        newTier: 'popular',
        xpBonus: 100,
      })

      expect(result.success).toBe(true)
      expect(result.notificationId).toBeDefined()
      expect(mockClient.publishFrameNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: expect.stringContaining('Viral Tier Upgrade'),
            body: expect.stringContaining('+100 XP'),
          }),
          targetFids: [12345],
        })
      )
    })

    it('should send achievement notification successfully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ token: 'test-token-456' }],
          error: null,
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-456',
            successfulFids: [12345],
          },
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)
      ;(getNeynarServerClient as vi.Mock).mockReturnValue(mockClient)

      const result = await dispatchViralNotification({
        type: 'achievement',
        fid: 12345,
        achievementType: 'first_viral',
        castHash: '0xtest',
        xpBonus: 100,
      })

      expect(result.success).toBe(true)
      expect(mockClient.publishFrameNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: expect.stringContaining('First Viral'),
          }),
          targetFids: [12345],
        })
      )
    })

    it('should handle rate limiting gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ token: 'test-token-rate-limited' }],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      // Simulate rate limiter blocking token
      const rateLimiter = require('@/lib/viral-notifications').rateLimiter
      if (rateLimiter) {
        vi.spyOn(rateLimiter, 'canSendNotification').mockReturnValue(false)
        vi.spyOn(rateLimiter, 'getTimeUntilAvailable').mockReturnValue(25000)
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
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

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
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
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
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      const mockDispatch = vi.fn().mockResolvedValue({ success: true })
      vi.spyOn(require('@/lib/viral-notifications'), 'dispatchViralNotification').mockImplementation(mockDispatch)

      const successCount = await processPendingNotifications()

      expect(successCount).toBe(2)
      expect(mockDispatch).toHaveBeenCalledTimes(2)
      expect(mockSupabase.limit).toHaveBeenCalledWith(50) // GI-10: Batch limit
    })

    it('should stop processing on rate limit', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { notification_type: 'tier_upgrade', fid: 1, cast_hash: '0x1', tier: 'viral', xp_bonus: 250 },
            { notification_type: 'tier_upgrade', fid: 2, cast_hash: '0x2', tier: 'viral', xp_bonus: 250 },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      const mockDispatch = vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, rateLimited: true })

      vi.spyOn(require('@/lib/viral-notifications'), 'dispatchViralNotification').mockImplementation(mockDispatch)

      const successCount = await processPendingNotifications()

      expect(successCount).toBe(1)
      expect(mockDispatch).toHaveBeenCalledTimes(2) // Should stop after rate limit
    })
  })
})
