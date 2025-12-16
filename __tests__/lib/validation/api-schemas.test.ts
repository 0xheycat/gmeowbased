/**
 * API Validation Schema Tests
 * 
 * Tests all 11 Zod schemas in lib/validation/api-schemas.ts
 * Quality Gate: GI-12 (Unit Test Coverage)
 * 
 * Test Categories:
 * - Common schemas (FID, Address, CastHash, Chain)
 * - Badge schemas (Assign, Mint)
 * - Quest schemas (Verify, Claim)
 * - Analytics schemas
 * - Telemetry schemas
 * - Admin schemas
 * - Edge cases (empty, null, out of range)
 */

import { describe, it, expect } from 'vitest'
import {
  FIDSchema,
  AddressSchema,
  CastHashSchema,
  ChainSchema,
  BadgeAssignSchema,
  BadgeMintSchema,
  QuestVerifySchema,
  QuestClaimSchema,
  AnalyticsSummarySchema,
  TelemetryRankSchema,
  AdminBadgeCreateSchema,
  AdminBadgeUpdateSchema,
  FrameIdentifySchema,
  ViralStatsQuerySchema,
  LeaderboardQuerySchema,
  TipIngestSchema,
  FarcasterBulkSchema,
  SnapshotCreateSchema,
  CastBadgeShareSchema,
  OnboardCompleteSchema,
  BotConfigUpdateSchema,
  AdminQuerySchema,
  BadgeUploadSchema,
  FrameActionSchema,
  WebhookPayloadSchema,
  AdminLoginSchema,
  SeasonQuerySchema,
  LeaderboardSyncSchema,
} from '@/lib/validation/api-schemas'

describe('Common Schemas', () => {
  describe('FIDSchema', () => {
    it('should accept valid positive integer FID', () => {
      expect(() => FIDSchema.parse(12345)).not.toThrow()
      expect(() => FIDSchema.parse(1)).not.toThrow()
    })

    it('should reject negative FID', () => {
      expect(() => FIDSchema.parse(-1)).toThrow('FID must be a positive integer')
    })

    it('should reject zero FID', () => {
      expect(() => FIDSchema.parse(0)).toThrow('FID must be a positive integer')
    })

    it('should reject non-integer FID', () => {
      expect(() => FIDSchema.parse(12.5)).toThrow()
    })

    it('should reject string FID', () => {
      expect(() => FIDSchema.parse('12345')).toThrow()
    })
  })

  describe('AddressSchema', () => {
    it('should accept valid Ethereum address', () => {
      expect(() => AddressSchema.parse('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1')).not.toThrow()
      expect(() => AddressSchema.parse('0x0000000000000000000000000000000000000000')).not.toThrow()
    })

    it('should reject address without 0x prefix', () => {
      expect(() => AddressSchema.parse('742d35Cc6634C0532925a3b844Bc9e7595f0bEb1')).toThrow(
        'Invalid Ethereum address format'
      )
    })

    it('should reject address with wrong length', () => {
      expect(() => AddressSchema.parse('0x742d35Cc')).toThrow('Invalid Ethereum address format')
    })

    it('should reject address with invalid characters', () => {
      expect(() => AddressSchema.parse('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbZ')).toThrow(
        'Invalid Ethereum address format'
      )
    })
  })

  describe('CastHashSchema', () => {
    it('should accept valid cast hash', () => {
      expect(() => CastHashSchema.parse('0x742d35cc6634c0532925a3b844bc9e7595f0beb1')).not.toThrow()
    })

    it('should reject hash without 0x prefix', () => {
      expect(() => CastHashSchema.parse('742d35cc6634c0532925a3b844bc9e7595f0beb1')).toThrow(
        'Invalid cast hash format'
      )
    })

    it('should reject hash with wrong length', () => {
      expect(() => CastHashSchema.parse('0x742d35cc')).toThrow('Invalid cast hash format')
    })
  })

  describe('ChainSchema', () => {
    it('should accept valid chain names', () => {
      expect(() => ChainSchema.parse('base')).not.toThrow()
      expect(() => ChainSchema.parse('op')).not.toThrow()
      expect(() => ChainSchema.parse('celo')).not.toThrow()
      expect(() => ChainSchema.parse('unichain')).not.toThrow()
      expect(() => ChainSchema.parse('ink')).not.toThrow()
    })

    it('should reject invalid chain name', () => {
      expect(() => ChainSchema.parse('ethereum')).toThrow()
      expect(() => ChainSchema.parse('polygon')).toThrow()
    })
  })
})

describe('Badge Schemas', () => {
  describe('BadgeAssignSchema', () => {
    it('should accept valid badge assignment', () => {
      const valid = {
        fid: 12345,
        badgeId: 'badge-123',
        metadata: { tier: 'epic' },
      }
      expect(() => BadgeAssignSchema.parse(valid)).not.toThrow()
    })

    it('should accept without optional metadata', () => {
      const valid = {
        fid: 12345,
        badgeId: 'badge-123',
      }
      expect(() => BadgeAssignSchema.parse(valid)).not.toThrow()
    })

    it('should reject missing fid', () => {
      const invalid = {
        badgeId: 'badge-123',
      }
      expect(() => BadgeAssignSchema.parse(invalid)).toThrow()
    })

    it('should reject empty badgeId', () => {
      const invalid = {
        fid: 12345,
        badgeId: '',
      }
      expect(() => BadgeAssignSchema.parse(invalid)).toThrow('Badge ID is required')
    })
  })

  describe('BadgeMintSchema', () => {
    it('should accept valid badge mint', () => {
      const valid = {
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x' + 'a'.repeat(64),
      }
      expect(() => BadgeMintSchema.parse(valid)).not.toThrow()
    })

    it('should accept with optional fields', () => {
      const valid = {
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x' + 'a'.repeat(64),
        tokenId: 42,
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      }
      expect(() => BadgeMintSchema.parse(valid)).not.toThrow()
    })

    it('should reject invalid txHash format', () => {
      const invalid = {
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x123',
      }
      expect(() => BadgeMintSchema.parse(invalid)).toThrow('Invalid transaction hash format')
    })

    it('should reject negative tokenId', () => {
      const invalid = {
        fid: 12345,
        badgeType: 'gm-streak',
        txHash: '0x' + 'a'.repeat(64),
        tokenId: -1,
      }
      expect(() => BadgeMintSchema.parse(invalid)).toThrow()
    })
  })
})

describe('Quest Schemas', () => {
  describe('QuestVerifySchema', () => {
    it('should accept valid quest verification', () => {
      const valid = {
        fid: 12345,
        questId: '123e4567-e89b-12d3-a456-426614174000',
        proof: { signature: '0xabc' },
      }
      expect(() => QuestVerifySchema.parse(valid)).not.toThrow()
    })

    it('should accept without optional proof', () => {
      const valid = {
        fid: 12345,
        questId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => QuestVerifySchema.parse(valid)).not.toThrow()
    })

    it('should reject invalid UUID format', () => {
      const invalid = {
        fid: 12345,
        questId: 'not-a-uuid',
      }
      expect(() => QuestVerifySchema.parse(invalid)).toThrow('Invalid quest ID format')
    })
  })

  describe('QuestClaimSchema', () => {
    it('should accept valid quest claim', () => {
      const valid = {
        fid: 12345,
        questId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => QuestClaimSchema.parse(valid)).not.toThrow()
    })

    it('should reject missing fields', () => {
      expect(() => QuestClaimSchema.parse({})).toThrow()
    })
  })
})

describe('Analytics Schemas', () => {
  describe('AnalyticsSummarySchema', () => {
    it('should accept valid analytics query', () => {
      const valid = {
        fid: 12345,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
      }
      expect(() => AnalyticsSummarySchema.parse(valid)).not.toThrow()
    })

    it('should accept all optional fields', () => {
      expect(() => AnalyticsSummarySchema.parse({})).not.toThrow()
    })

    it('should reject invalid datetime format', () => {
      const invalid = {
        startDate: '2025-01-01',
      }
      expect(() => AnalyticsSummarySchema.parse(invalid)).toThrow()
    })
  })
})

describe('Telemetry Schemas', () => {
  describe('TelemetryRankSchema', () => {
    it('should accept valid telemetry rank', () => {
      const valid = {
        fid: 12345,
        eventType: 'quest_complete',
        eventDetail: { questId: 'q123' },
        points: 100,
        chain: 'base',
      }
      expect(() => TelemetryRankSchema.parse(valid)).not.toThrow()
    })

    it('should accept without optional fields', () => {
      const valid = {
        fid: 12345,
        eventType: 'quest_complete',
      }
      expect(() => TelemetryRankSchema.parse(valid)).not.toThrow()
    })

    it('should reject negative points', () => {
      const invalid = {
        fid: 12345,
        eventType: 'quest_complete',
        points: -10,
      }
      expect(() => TelemetryRankSchema.parse(invalid)).toThrow()
    })

    it('should reject empty eventType', () => {
      const invalid = {
        fid: 12345,
        eventType: '',
      }
      expect(() => TelemetryRankSchema.parse(invalid)).toThrow('Event type is required')
    })
  })
})

describe('Admin Schemas', () => {
  describe('AdminBadgeCreateSchema', () => {
    it('should accept valid badge creation', () => {
      const valid = {
        name: 'GM Streak Master',
        description: 'Achieved 100-day GM streak',
        tier: 'legendary',
        imageUrl: 'https://example.com/badge.png',
      }
      expect(() => AdminBadgeCreateSchema.parse(valid)).not.toThrow()
    })

    it('should accept all tier values', () => {
      const tiers = ['mythic', 'legendary', 'epic', 'rare', 'common'] as const
      tiers.forEach((tier) => {
        const valid = {
          name: 'Test Badge',
          description: 'Test',
          tier,
          imageUrl: 'https://example.com/badge.png',
        }
        expect(() => AdminBadgeCreateSchema.parse(valid)).not.toThrow()
      })
    })

    it('should reject invalid tier', () => {
      const invalid = {
        name: 'Test Badge',
        description: 'Test',
        tier: 'ultra-rare',
        imageUrl: 'https://example.com/badge.png',
      }
      expect(() => AdminBadgeCreateSchema.parse(invalid)).toThrow()
    })

    it('should reject invalid imageUrl', () => {
      const invalid = {
        name: 'Test Badge',
        description: 'Test',
        tier: 'rare',
        imageUrl: 'not-a-url',
      }
      expect(() => AdminBadgeCreateSchema.parse(invalid)).toThrow('Invalid image URL')
    })
  })

  describe('AdminBadgeUpdateSchema', () => {
    it('should accept partial updates', () => {
      const valid = { name: 'Updated Name' }
      expect(() => AdminBadgeUpdateSchema.parse(valid)).not.toThrow()
    })

    it('should accept all fields', () => {
      const valid = {
        name: 'Updated Badge',
        description: 'Updated description',
        tier: 'epic',
        imageUrl: 'https://example.com/new-badge.png',
        metadata: { version: 2 },
        isActive: true,
      }
      expect(() => AdminBadgeUpdateSchema.parse(valid)).not.toThrow()
    })

    it('should accept empty object', () => {
      expect(() => AdminBadgeUpdateSchema.parse({})).not.toThrow()
    })
  })

  describe('AdminLoginSchema', () => {
    it('should accept valid admin login', () => {
      const valid = {
        passcode: 'secret123',
        totp: '123456',
        remember: true,
      }
      expect(() => AdminLoginSchema.parse(valid)).not.toThrow()
    })

    it('should accept without optional fields', () => {
      const valid = { passcode: 'secret123' }
      expect(() => AdminLoginSchema.parse(valid)).not.toThrow()
    })

    it('should reject empty passcode', () => {
      const invalid = { passcode: '' }
      expect(() => AdminLoginSchema.parse(invalid)).toThrow('Passcode is required')
    })
  })
})

describe('Frame Schemas', () => {
  describe('FrameIdentifySchema', () => {
    it('should accept valid frame identification', () => {
      const valid = {
        fid: 12345,
        buttonIndex: 2,
        messageHash: '0xabc123',
      }
      expect(() => FrameIdentifySchema.parse(valid)).not.toThrow()
    })

    it('should accept buttonIndex range 1-4', () => {
      ;[1, 2, 3, 4].forEach((index) => {
        const valid = { fid: 12345, buttonIndex: index }
        expect(() => FrameIdentifySchema.parse(valid)).not.toThrow()
      })
    })

    it('should reject buttonIndex out of range', () => {
      const invalid = { fid: 12345, buttonIndex: 5 }
      expect(() => FrameIdentifySchema.parse(invalid)).toThrow()
    })
  })

  describe('FrameActionSchema', () => {
    it('should accept valid frame action', () => {
      const valid = {
        untrustedData: {
          fid: 12345,
          buttonIndex: 1,
          messageHash: '0xabc',
          timestamp: 1700000000,
        },
        trustedData: {
          messageBytes: 'base64encodeddata',
        },
      }
      expect(() => FrameActionSchema.parse(valid)).not.toThrow()
    })

    it('should accept with optional fields', () => {
      const valid = {
        untrustedData: {
          fid: 12345,
          buttonIndex: 1,
          inputText: 'User input',
          castId: {
            fid: 67890,
            hash: '0xdef',
          },
          messageHash: '0xabc',
          timestamp: 1700000000,
        },
        trustedData: {
          messageBytes: 'base64encodeddata',
        },
      }
      expect(() => FrameActionSchema.parse(valid)).not.toThrow()
    })
  })
})

describe('Viral Schemas', () => {
  describe('ViralStatsQuerySchema', () => {
    it('should accept valid viral stats query', () => {
      const valid = {
        fid: 12345,
        timeframe: 'week',
        limit: 50,
      }
      expect(() => ViralStatsQuerySchema.parse(valid)).not.toThrow()
    })

    it('should accept all timeframe values', () => {
      const timeframes = ['day', 'week', 'month', 'all'] as const
      timeframes.forEach((timeframe) => {
        const valid = { timeframe }
        expect(() => ViralStatsQuerySchema.parse(valid)).not.toThrow()
      })
    })

    it('should reject limit over 100', () => {
      const invalid = { limit: 101 }
      expect(() => ViralStatsQuerySchema.parse(invalid)).toThrow()
    })
  })
})

describe('Leaderboard Schemas', () => {
  describe('LeaderboardQuerySchema', () => {
    it('should accept valid leaderboard query', () => {
      const valid = {
        chain: 'base',
        limit: 25,
        offset: 0,
      }
      expect(() => LeaderboardQuerySchema.parse(valid)).not.toThrow()
    })

    it('should reject negative offset', () => {
      const invalid = { offset: -1 }
      expect(() => LeaderboardQuerySchema.parse(invalid)).toThrow()
    })
  })

  describe('LeaderboardSyncSchema', () => {
    it('should accept valid sync request', () => {
      const valid = {
        chain: 'base',
        force: true,
      }
      expect(() => LeaderboardSyncSchema.parse(valid)).not.toThrow()
    })

    it('should accept empty object', () => {
      expect(() => LeaderboardSyncSchema.parse({})).not.toThrow()
    })
  })
})

describe('Tips Schemas', () => {
  describe('TipIngestSchema', () => {
    it('should accept valid tip ingestion', () => {
      const valid = {
        fromFid: 12345,
        toFid: 67890,
        amount: 10.5,
        currency: 'USDC',
      }
      expect(() => TipIngestSchema.parse(valid)).not.toThrow()
    })

    it('should accept with optional txHash', () => {
      const valid = {
        fromFid: 12345,
        toFid: 67890,
        amount: 10.5,
        currency: 'USDC',
        txHash: '0x' + 'a'.repeat(64),
      }
      expect(() => TipIngestSchema.parse(valid)).not.toThrow()
    })

    it('should reject negative amount', () => {
      const invalid = {
        fromFid: 12345,
        toFid: 67890,
        amount: -10,
        currency: 'USDC',
      }
      expect(() => TipIngestSchema.parse(invalid)).toThrow('Amount must be positive')
    })

    it('should reject zero amount', () => {
      const invalid = {
        fromFid: 12345,
        toFid: 67890,
        amount: 0,
        currency: 'USDC',
      }
      expect(() => TipIngestSchema.parse(invalid)).toThrow('Amount must be positive')
    })
  })
})

describe('Farcaster Schemas', () => {
  describe('FarcasterBulkSchema', () => {
    it('should accept valid bulk FID array', () => {
      const valid = {
        fids: [1, 2, 3, 4, 5],
      }
      expect(() => FarcasterBulkSchema.parse(valid)).not.toThrow()
    })

    it('should reject empty array', () => {
      const invalid = { fids: [] }
      expect(() => FarcasterBulkSchema.parse(invalid)).toThrow()
    })

    it('should reject array over 100', () => {
      const invalid = { fids: Array.from({ length: 101 }, (_, i) => i + 1) }
      expect(() => FarcasterBulkSchema.parse(invalid)).toThrow()
    })

    it('should reject invalid FIDs in array', () => {
      const invalid = { fids: [1, -2, 3] }
      expect(() => FarcasterBulkSchema.parse(invalid)).toThrow()
    })
  })
})

describe('Snapshot Schemas', () => {
  describe('SnapshotCreateSchema', () => {
    it('should accept valid snapshot creation', () => {
      const valid = {
        type: 'leaderboard',
        metadata: { season: 1 },
      }
      expect(() => SnapshotCreateSchema.parse(valid)).not.toThrow()
    })

    it('should accept all snapshot types', () => {
      const types = ['leaderboard', 'badges', 'quests'] as const
      types.forEach((type) => {
        const valid = { type }
        expect(() => SnapshotCreateSchema.parse(valid)).not.toThrow()
      })
    })
  })
})

describe('Cast Schemas', () => {
  describe('CastBadgeShareSchema', () => {
    it('should accept valid badge share', () => {
      const valid = {
        fid: 12345,
        badgeId: 'badge-123',
        message: 'Just earned this awesome badge!',
      }
      expect(() => CastBadgeShareSchema.parse(valid)).not.toThrow()
    })

    it('should reject message over 320 chars', () => {
      const invalid = {
        fid: 12345,
        badgeId: 'badge-123',
        message: 'a'.repeat(321),
      }
      expect(() => CastBadgeShareSchema.parse(invalid)).toThrow()
    })
  })
})

describe('Onboard Schemas', () => {
  describe('OnboardCompleteSchema', () => {
    it('should accept valid onboarding completion', () => {
      const valid = {
        fid: 12345,
        custodyAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
        verifiedAddresses: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3'],
      }
      expect(() => OnboardCompleteSchema.parse(valid)).not.toThrow()
    })

    it('should accept with only FID', () => {
      const valid = { fid: 12345 }
      expect(() => OnboardCompleteSchema.parse(valid)).not.toThrow()
    })
  })
})

describe('Bot Config Schemas', () => {
  describe('BotConfigUpdateSchema', () => {
    it('should accept valid bot config update', () => {
      const valid = {
        enabled: true,
        autoReplyEnabled: true,
        statsEnabled: false,
        minEngagementThreshold: 5,
        dailyPostLimit: 50,
        responseTemplates: ['Template 1', 'Template 2'],
        blacklistedFids: [123, 456],
        whitelistedFids: [789],
      }
      expect(() => BotConfigUpdateSchema.parse(valid)).not.toThrow()
    })

    it('should reject dailyPostLimit over 100', () => {
      const invalid = { dailyPostLimit: 101 }
      expect(() => BotConfigUpdateSchema.parse(invalid)).toThrow()
    })

    it('should reject negative minEngagementThreshold', () => {
      const invalid = { minEngagementThreshold: -1 }
      expect(() => BotConfigUpdateSchema.parse(invalid)).toThrow()
    })
  })
})

describe('Season Schemas', () => {
  describe('SeasonQuerySchema', () => {
    it('should accept valid season query', () => {
      const valid = { chain: 'base' }
      expect(() => SeasonQuerySchema.parse(valid)).not.toThrow()
    })

    it('should accept empty object', () => {
      expect(() => SeasonQuerySchema.parse({})).not.toThrow()
    })
  })
})

describe('Webhook Schemas', () => {
  describe('WebhookPayloadSchema', () => {
    it('should accept valid webhook payload', () => {
      const valid = {
        type: 'cast.created',
        data: { castHash: '0xabc', text: 'GM!' },
        created_at: 1700000000,
      }
      expect(() => WebhookPayloadSchema.parse(valid)).not.toThrow()
    })

    it('should accept all event types', () => {
      const types = ['cast.created', 'user.updated', 'reaction.created', 'follow.created'] as const
      types.forEach((type) => {
        const valid = {
          type,
          data: {},
          created_at: 1700000000,
        }
        expect(() => WebhookPayloadSchema.parse(valid)).not.toThrow()
      })
    })
  })
})

describe('Badge Upload Schemas', () => {
  describe('BadgeUploadSchema', () => {
    it('should accept valid badge upload', () => {
      const valid = {
        badgeType: 'gm-streak',
        tier: 'epic',
        imageFile: 'base64encodedimage',
      }
      expect(() => BadgeUploadSchema.parse(valid)).not.toThrow()
    })

    it('should reject empty imageFile', () => {
      const invalid = {
        badgeType: 'gm-streak',
        tier: 'epic',
        imageFile: '',
      }
      expect(() => BadgeUploadSchema.parse(invalid)).toThrow('Image file is required')
    })
  })
})

describe('Admin Query Schemas', () => {
  describe('AdminQuerySchema', () => {
    it('should accept valid admin query', () => {
      const valid = {
        limit: 50,
        offset: 10,
        timeframe: 'week',
        sortBy: 'created_at',
        sortOrder: 'desc',
      }
      expect(() => AdminQuerySchema.parse(valid)).not.toThrow()
    })

    it('should accept all timeframe values', () => {
      const timeframes = ['hour', 'day', 'week', 'month', 'all'] as const
      timeframes.forEach((timeframe) => {
        const valid = { timeframe }
        expect(() => AdminQuerySchema.parse(valid)).not.toThrow()
      })
    })

    it('should reject limit over 100', () => {
      const invalid = { limit: 101 }
      expect(() => AdminQuerySchema.parse(invalid)).toThrow()
    })
  })
})
