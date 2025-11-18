/**
 * Badge API Route Tests
 * 
 * Tests badge endpoints:
 * - GET /api/badges/list
 * - POST /api/badges/assign
 * - POST /api/badges/mint
 * 
 * Quality Gate: GI-12 (Unit Test Coverage)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/badges/list/route'
import { POST as assignPOST } from '@/app/api/badges/assign/route'
import { POST as mintPOST } from '@/app/api/badges/mint/route'

// Mock dependencies
vi.mock('@/lib/badges', () => ({
  getUserBadges: vi.fn(),
  assignBadgeToUser: vi.fn(),
  getBadgeFromRegistry: vi.fn(),
  updateBadgeMintStatus: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
  apiLimiter: {},
}))

import { getUserBadges, assignBadgeToUser, getBadgeFromRegistry, updateBadgeMintStatus } from '@/lib/badges'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

describe('/api/badges/list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(rateLimit).mockResolvedValue({ success: true })
  })

  describe('Success Cases', () => {
    it('should return user badges with valid FID', async () => {
      const mockBadges = [
        { id: 'badge-1', badgeType: 'gm-streak', tier: 'epic' },
        { id: 'badge-2', badgeType: 'early-adopter', tier: 'legendary' },
      ]
      vi.mocked(getUserBadges).mockResolvedValue(mockBadges)

      const request = new Request('http://localhost:3000/api/badges/list?fid=12345')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toMatchObject({
        success: true,
        fid: 12345,
        badges: mockBadges,
        count: 2,
      })
      expect(getUserBadges).toHaveBeenCalledWith(12345)
    })

    it('should return empty badges array when user has no badges', async () => {
      vi.mocked(getUserBadges).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/badges/list?fid=12345')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toMatchObject({
        success: true,
        fid: 12345,
        badges: [],
        count: 0,
      })
    })
  })

  describe('Validation Failures', () => {
    it('should reject request without fid parameter', async () => {
      const request = new Request('http://localhost:3000/api/badges/list')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json).toMatchObject({
        success: false,
        error: 'Missing fid parameter',
      })
    })

    it('should reject invalid FID (negative)', async () => {
      const request = new Request('http://localhost:3000/api/badges/list?fid=-1')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Invalid fid parameter')
    })

    it('should reject invalid FID (zero)', async () => {
      const request = new Request('http://localhost:3000/api/badges/list?fid=0')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Invalid fid parameter')
    })

    it('should reject invalid FID (non-numeric)', async () => {
      const request = new Request('http://localhost:3000/api/badges/list?fid=abc')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Invalid fid parameter')
    })
  })

  describe('Rate Limiting', () => {
    it('should reject when rate limit exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({ success: false })

      const request = new Request('http://localhost:3000/api/badges/list?fid=12345')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(429)
      expect(json).toMatchObject({
        error: 'Rate limit exceeded',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large FID', async () => {
      vi.mocked(getUserBadges).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/badges/list?fid=999999999')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.fid).toBe(999999999)
    })

    it('should handle FID with leading zeros', async () => {
      vi.mocked(getUserBadges).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/badges/list?fid=00012345')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.fid).toBe(12345)
    })
  })
})

describe('/api/badges/assign', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase as any)
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
  })

  describe('Success Cases', () => {
    it('should assign badge with valid input', async () => {
      const mockBadgeDef = {
        id: 'badge-gm-streak',
        badgeType: 'gm-streak',
        tier: 'epic',
      }
      const mockAssignedBadge = {
        id: 'assigned-1',
        fid: 12345,
        badgeType: 'gm-streak',
        tier: 'epic',
      }

      vi.mocked(getBadgeFromRegistry).mockReturnValue(mockBadgeDef as any)
      vi.mocked(assignBadgeToUser).mockResolvedValue(mockAssignedBadge as any)

      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: 'badge-gm-streak',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toMatchObject({
        success: true,
        badge: mockAssignedBadge,
      })
      expect(assignBadgeToUser).toHaveBeenCalledWith({
        fid: 12345,
        badgeId: 'badge-gm-streak',
        badgeType: 'gm-streak',
        tier: 'epic',
        metadata: expect.objectContaining({
          assignedBy: 'manual',
        }),
      })
    })

    it('should assign badge with custom metadata', async () => {
      const mockBadgeDef = {
        id: 'badge-special',
        badgeType: 'special',
        tier: 'legendary',
      }

      vi.mocked(getBadgeFromRegistry).mockReturnValue(mockBadgeDef as any)
      vi.mocked(assignBadgeToUser).mockResolvedValue({} as any)

      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: 'badge-special',
          metadata: { reason: 'contest winner' },
        }),
      })
      const response = await assignPOST(request)

      expect(response.status).toBe(200)
      expect(assignBadgeToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { reason: 'contest winner' },
        })
      )
    })

    it('should queue badge mint when user has wallet', async () => {
      vi.mocked(getBadgeFromRegistry).mockReturnValue({
        id: 'badge-test',
        badgeType: 'test',
        tier: 'rare',
      } as any)
      vi.mocked(assignBadgeToUser).mockResolvedValue({} as any)

      mockSupabase.single.mockResolvedValue({
        data: { wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1' },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: 'badge-test',
        }),
      })
      await assignPOST(request)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fid: 12345,
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          badge_type: 'test',
          status: 'pending',
        })
      )
    })
  })

  describe('Validation Failures', () => {
    it('should reject missing fid', async () => {
      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          badgeId: 'badge-test',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Invalid input')
    })

    it('should reject missing badgeId', async () => {
      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject empty badgeId', async () => {
      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: '',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject invalid FID', async () => {
      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: -1,
          badgeId: 'badge-test',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })
  })

  describe('Badge Registry Errors', () => {
    it('should return 404 when badge not found in registry', async () => {
      vi.mocked(getBadgeFromRegistry).mockReturnValue(null)

      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: 'nonexistent-badge',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json).toMatchObject({
        success: false,
        error: 'Badge nonexistent-badge not found in registry',
      })
    })
  })

  describe('Database Errors', () => {
    it('should return 500 when database not configured', async () => {
      vi.mocked(getSupabaseServerClient).mockReturnValue(null)

      const request = new Request('http://localhost:3000/api/badges/assign', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeId: 'badge-test',
        }),
      })
      const response = await assignPOST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json).toMatchObject({
        success: false,
        error: 'Database not configured',
      })
    })
  })
})

describe('/api/badges/mint', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase as any)
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockSupabase.in.mockResolvedValue({ data: null, error: null })
  })

  describe('Success Cases', () => {
    it('should update badge mint status with valid input', async () => {
      vi.mocked(updateBadgeMintStatus).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toMatchObject({
        success: true,
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x' + 'a'.repeat(64),
      })
      expect(updateBadgeMintStatus).toHaveBeenCalledWith({
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x' + 'a'.repeat(64),
        tokenId: undefined,
        contractAddress: undefined,
      })
    })

    it('should accept optional tokenId and contractAddress', async () => {
      vi.mocked(updateBadgeMintStatus).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
          tokenId: 42,
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.tokenId).toBe(42)
      expect(updateBadgeMintStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: 42,
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        })
      )
    })

    it('should handle already minted badge gracefully', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          minted: true,
          tx_hash: '0x' + 'b'.repeat(64),
        },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toMatchObject({
        success: true,
        note: 'Badge was already minted',
        txHash: '0x' + 'b'.repeat(64),
      })
      expect(updateBadgeMintStatus).not.toHaveBeenCalled()
    })

    it('should update mint queue status', async () => {
      vi.mocked(updateBadgeMintStatus).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      await mintPOST(request)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'minted',
          tx_hash: '0x' + 'a'.repeat(64),
        })
      )
    })
  })

  describe('Validation Failures', () => {
    it('should reject missing fid', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Invalid input')
    })

    it('should reject missing badgeType', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject missing txHash', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject invalid txHash format', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x123',
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject negative tokenId', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
          tokenId: -1,
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should reject invalid contractAddress format', async () => {
      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
          contractAddress: 'invalid-address',
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })
  })

  describe('Database Errors', () => {
    it('should return 500 when database not configured', async () => {
      vi.mocked(getSupabaseServerClient).mockReturnValue(null)

      const request = new Request('http://localhost:3000/api/badges/mint', {
        method: 'POST',
        body: JSON.stringify({
          fid: 12345,
          badgeType: 'gm-streak',
          txHash: '0x' + 'a'.repeat(64),
        }),
      })
      const response = await mintPOST(request)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json).toMatchObject({
        success: false,
        error: 'Database not configured',
      })
    })
  })
})
