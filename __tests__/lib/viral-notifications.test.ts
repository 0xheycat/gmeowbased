/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as viralNotifications from '@/lib/viral-notifications'
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
      } as any

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-123',
            successfulFids: [12345],
          },
        }),
      }

      const mockRateLimiter = {
        canSendNotification: vi.fn().mockReturnValue(true),
        recordNotificationSent: vi.fn(),
        getTimeUntilAvailable: vi.fn().mockReturnValue(0),
      } as any

      const result = await dispatchViralNotification(
        {
          type: 'tier_upgrade',
          fid: 12345,
          castHash: '0xtest',
          oldTier: 'engaging',
          newTier: 'popular',
          xpBonus: 100,
        },
        { supabase: mockSupabase, neynarClient: mockClient, rateLimiter: mockRateLimiter }
      )

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
      } as any

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: {
            notificationId: 'notif-456',
            successfulFids: [12345],
          },
        }),
      }

      const mockRateLimiter = {
        canSendNotification: vi.fn().mockReturnValue(true),
        recordNotificationSent: vi.fn(),
        getTimeUntilAvailable: vi.fn().mockReturnValue(0),
      } as any

      const result = await dispatchViralNotification(
        {
          type: 'achievement',
          fid: 12345,
          achievementType: 'first_viral',
          castHash: '0xtest',
          xpBonus: 100,
        },
        { supabase: mockSupabase, neynarClient: mockClient, rateLimiter: mockRateLimiter }
      )

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
      } as any

      const mockRateLimiter = {
        canSendNotification: vi.fn().mockReturnValue(false),
        getTimeUntilAvailable: vi.fn().mockReturnValue(30000),
        recordNotificationSent: vi.fn(),
      } as any

      const result = await dispatchViralNotification(
        {
          type: 'tier_upgrade',
          fid: 12345,
          castHash: '0xtest',
          oldTier: 'active',
          newTier: 'engaging',
          xpBonus: 50,
        },
        { supabase: mockSupabase, rateLimiter: mockRateLimiter }
      )

      expect(result.success).toBe(false)
      expect(result.rateLimited).toBe(true)
      expect(result.error).toContain('Rate limited')
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
      } as any

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: false,
          result: { error: 'No notification tokens' },
        }),
      }

      const mockRateLimiter = {
        canSendNotification: vi.fn().mockReturnValue(true),
        recordNotificationSent: vi.fn(),
        getTimeUntilAvailable: vi.fn().mockReturnValue(0),
      } as any

      const result = await dispatchViralNotification(
        {
          type: 'tier_upgrade',
          fid: 12345,
          castHash: '0xtest',
          oldTier: 'active',
          newTier: 'engaging',
          xpBonus: 50,
        },
        { supabase: mockSupabase, neynarClient: mockClient, rateLimiter: mockRateLimiter }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Notification failed')
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
      } as any

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: { notificationId: 'test-123', successfulFids: [12345, 67890] },
        }),
      }

      const mockRateLimiter = {
        canSendNotification: vi.fn().mockReturnValue(true),
        recordNotificationSent: vi.fn(),
        getTimeUntilAvailable: vi.fn().mockReturnValue(0),
      } as any

      const successCount = await processPendingNotifications({
        supabase: mockSupabase,
        neynarClient: mockClient,
        rateLimiter: mockRateLimiter,
      })

      expect(successCount).toBe(2)
      expect(mockClient.publishFrameNotifications).toHaveBeenCalledTimes(2)
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
      } as any

      const mockClient = {
        publishFrameNotifications: vi.fn().mockResolvedValue({
          success: true,
          result: { notificationId: 'test-456', successfulFids: [1] },
        }),
      }

      let callCount = 0
      const mockRateLimiter = {
        canSendNotification: vi.fn(() => {
          callCount++
          return callCount === 1 // First call succeeds, second is rate limited
        }),
        recordNotificationSent: vi.fn(),
        getTimeUntilAvailable: vi.fn().mockReturnValue(30000),
      } as any

      const successCount = await processPendingNotifications({
        supabase: mockSupabase,
        neynarClient: mockClient,
        rateLimiter: mockRateLimiter,
      })

      expect(successCount).toBe(1)
      expect(mockRateLimiter.canSendNotification).toHaveBeenCalledTimes(2)
    })
  })
})
