/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  syncCastEngagement,
  fetchCastEngagement,
  batchSyncCastEngagement,
  getCastsNeedingSync,
} from '@/lib/viral-engagement-sync'

// Mock dependencies
vi.mock('@/lib/neynar-server')
vi.mock('@/lib/supabase-server')

describe('viral-engagement-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchCastEngagement', () => {
    it('should fetch engagement metrics from Neynar API', async () => {
      const mockClient = {
        lookupCastByHashOrUrl: vi.fn().mockResolvedValue({
          cast: {
            reactions: {
              likes_count: 10,
              recasts_count: 5,
            },
            replies: {
              count: 3,
            },
          },
        }),
      }

      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getNeynarServerClient as vi.Mock).mockReturnValue(mockClient)

      const metrics = await fetchCastEngagement('0xtest123')

      expect(metrics).toEqual({
        likes: 10,
        recasts: 5,
        replies: 3,
      })

      expect(mockClient.lookupCastByHashOrUrl).toHaveBeenCalledWith({
        identifier: '0xtest123',
        type: 'hash',
      })
    })

    it('should handle API errors with retry logic', async () => {
      const mockClient = {
        lookupCastByHashOrUrl: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({
            cast: {
              reactions: { likes_count: 5 },
              replies: { count: 2 },
            },
          }),
      }

      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getNeynarServerClient as vi.Mock).mockReturnValue(mockClient)

      const metrics = await fetchCastEngagement('0xtest456')

      expect(metrics.likes).toBe(5)
      expect(mockClient.lookupCastByHashOrUrl).toHaveBeenCalledTimes(3)
    })

    it('should validate input and reject invalid cast hash', async () => {
      await expect(fetchCastEngagement('')).rejects.toThrow('Invalid cast hash')
    })

    it('should enforce non-negative engagement metrics', async () => {
      const mockClient = {
        lookupCastByHashOrUrl: vi.fn().mockResolvedValue({
          cast: {
            reactions: {
              likes_count: -5, // Invalid negative value
              recasts_count: 10,
            },
            replies: { count: 2 },
          },
        }),
      }

      const { getNeynarServerClient } = await import('@/lib/neynar-server')
      ;(getNeynarServerClient as vi.Mock).mockReturnValue(mockClient)

      const metrics = await fetchCastEngagement('0xtest')

      // GI-11: Should enforce non-negative
      expect(metrics.likes).toBe(0)
      expect(metrics.recasts).toBe(10)
    })
  })

  describe('syncCastEngagement', () => {
    it('should sync engagement and detect tier upgrade', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            cast_hash: '0xtest',
            fid: 12345,
            likes_count: 5,
            recasts_count: 2,
            replies_count: 1,
            viral_score: 25,
            viral_tier: 'engaging',
            viral_bonus_xp: 50,
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      // Mock fetchCastEngagement to return higher metrics
      const mockFetch = vi.fn().mockResolvedValue({
        likes: 10,
        recasts: 5,
        replies: 3,
      })
      vi.spyOn(require('@/lib/viral-engagement-sync'), 'fetchCastEngagement').mockImplementation(mockFetch)

      const result = await syncCastEngagement('0xtest')

      expect(result.updated).toBe(true)
      expect(result.tierUpgrade).toBe(true)
      expect(result.additionalXp).toBeGreaterThan(0)
    })

    it('should skip sync if metrics have not increased', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            cast_hash: '0xtest',
            likes_count: 10,
            recasts_count: 5,
            replies_count: 3,
            viral_score: 50,
            viral_tier: 'popular',
          },
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      const mockFetch = vi.fn().mockResolvedValue({
        likes: 10,
        recasts: 5,
        replies: 3,
      })
      vi.spyOn(require('@/lib/viral-engagement-sync'), 'fetchCastEngagement').mockImplementation(mockFetch)

      const result = await syncCastEngagement('0xtest')

      expect(result.updated).toBe(false)
    })
  })

  describe('batchSyncCastEngagement', () => {
    it('should process multiple casts in parallel batches', async () => {
      const castHashes = Array.from({ length: 25 }, (_, i) => `0xtest${i}`)

      const mockSync = vi.fn().mockResolvedValue({
        updated: true,
        tierUpgrade: false,
        oldTier: 'active',
        newTier: 'engaging',
        additionalXp: 25,
      })

      vi.spyOn(require('@/lib/viral-engagement-sync'), 'syncCastEngagement').mockImplementation(mockSync)

      const results = await batchSyncCastEngagement(castHashes)

      expect(results).toHaveLength(25)
      expect(mockSync).toHaveBeenCalledTimes(25)
    })

    it('should handle individual failures gracefully', async () => {
      const castHashes = ['0xtest1', '0xtest2', '0xtest3']

      const mockSync = vi
        .fn()
        .mockResolvedValueOnce({ updated: true, tierUpgrade: false, oldTier: 'active', newTier: 'engaging', additionalXp: 25 })
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValueOnce({ updated: true, tierUpgrade: false, oldTier: 'active', newTier: 'engaging', additionalXp: 25 })

      vi.spyOn(require('@/lib/viral-engagement-sync'), 'syncCastEngagement').mockImplementation(mockSync)

      const results = await batchSyncCastEngagement(castHashes)

      expect(results).toHaveLength(3)
      expect(results[0].updated).toBe(true)
      expect(results[1].updated).toBe(false) // Failed sync
      expect(results[1].error).toBeDefined()
      expect(results[2].updated).toBe(true)
    })
  })

  describe('getCastsNeedingSync', () => {
    it('should query badge_casts for recent casts', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { cast_hash: '0xtest1' },
            { cast_hash: '0xtest2' },
          ],
          error: null,
        }),
      }

      const { getSupabaseServerClient } = await import('@/lib/supabase-server')
      ;(getSupabaseServerClient as vi.Mock).mockReturnValue(mockSupabase)

      const casts = await getCastsNeedingSync()

      expect(casts).toEqual(['0xtest1', '0xtest2'])
      expect(mockSupabase.limit).toHaveBeenCalledWith(100) // GI-10: Limit result size
    })
  })
})
