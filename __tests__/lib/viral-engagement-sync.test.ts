/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import * as viralEngagementSync from '@/lib/viral-engagement-sync'
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

      const metrics = await fetchCastEngagement('0xtest123', {
        neynarClient: mockClient,
      })

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
              reactions: { likes_count: 5, recasts_count: 0 },
              replies: { count: 2 },
            },
          }),
      }

      const metrics = await fetchCastEngagement('0xtest456', {
        neynarClient: mockClient,
      })

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

      const metrics = await fetchCastEngagement('0xtest', {
        neynarClient: mockClient,
      })

      // GI-11: Should enforce non-negative
      expect(metrics.likes).toBe(0)
      expect(metrics.recasts).toBe(10)
    })
  })

  describe('syncCastEngagement', () => {
    it('should sync engagement and detect tier upgrade', async () => {
      let fromCallCount = 0
      const mockSupabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          // First call - select existing cast from badge_casts
          if (fromCallCount === 1 && table === 'badge_casts') {
            return {
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
            }
          }
          // Second call - update badge_casts
          if (fromCallCount === 2 && table === 'badge_casts') {
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          // Third call - insert into gmeow_rank_events
          if (table === 'gmeow_rank_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          // Fallback
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any

      const mockNeynarClient = {
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

      const result = await syncCastEngagement('0xtest', {
        supabase: mockSupabase,
        neynarClient: mockNeynarClient,
      })

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
      } as any

      const mockNeynarClient = {
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

      const result = await syncCastEngagement('0xtest', {
        supabase: mockSupabase,
        neynarClient: mockNeynarClient,
      })

      expect(result.updated).toBe(false)
    })
  })

  describe('batchSyncCastEngagement', () => {
    it('should process multiple casts in parallel batches', async () => {
      const castHashes = Array.from({ length: 25 }, (_, i) => `0xtest${i}`)

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'badge_casts') {
            // Alternate between select and update for badge_casts
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  cast_hash: '0xtest1',
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
            }
          }
          // gmeow_rank_events
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any

      const mockNeynarClient = {
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

      const results = await batchSyncCastEngagement(castHashes, {
        supabase: mockSupabase,
        neynarClient: mockNeynarClient,
      })

      expect(results).toHaveLength(25)
    })

    it('should handle individual failures gracefully', async () => {
      const castHashes = ['0xtest1', '0xtest2', '0xtest3']

      let selectCallNum = 0
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'badge_casts') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(() => {
                selectCallNum++
                // Second cast fails
                if (selectCallNum === 2) {
                  return Promise.resolve({
                    data: null,
                    error: new Error('Cast not found'),
                  })
                }
                return Promise.resolve({
                  data: {
                    cast_hash: `0xtest${selectCallNum}`,
                    fid: 12345,
                    likes_count: 5,
                    recasts_count: 2,
                    replies_count: 1,
                    viral_score: 25,
                    viral_tier: 'engaging',
                    viral_bonus_xp: 50,
                  },
                  error: null,
                })
              }),
              update: vi.fn().mockReturnThis(),
            }
          }
          // gmeow_rank_events
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any

      const mockNeynarClient = {
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

      const results = await batchSyncCastEngagement(castHashes, {
        supabase: mockSupabase,
        neynarClient: mockNeynarClient,
      })

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
      ;(getSupabaseServerClient as Mock).mockReturnValue(mockSupabase)

      const casts = await getCastsNeedingSync()

      expect(casts).toEqual(['0xtest1', '0xtest2'])
      expect(mockSupabase.limit).toHaveBeenCalledWith(100) // GI-10: Limit result size
    })
  })
})
