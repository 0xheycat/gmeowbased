/**
 * Usage Metrics API Endpoint
 * 
 * Provides real-time usage statistics for the admin dashboard
 * - API call counts by chain
 * - Cache hit rates
 * - Etherscan FREE tier usage
 * - Top users by call volume
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/request-id'

type TimeRange = '1h' | '24h' | '7d' | '30d'

// In-memory usage tracking (upgrade to Redis for production)
type UsageRecord = {
  timestamp: number
  address: string
  chain: string
  cacheHit: boolean
  etherscanCalls: number
}

const usageLog: UsageRecord[] = []

// Track usage (called from onchain-stats API route)
export function trackApiUsage(
  address: string,
  chain: string,
  cacheHit: boolean,
  etherscanCalls: number
): void {
  usageLog.push({
    timestamp: Date.now(),
    address,
    chain,
    cacheHit,
    etherscanCalls,
  })

  // Keep only last 30 days of data
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  while (usageLog.length > 0 && usageLog[0].timestamp < thirtyDaysAgo) {
    usageLog.shift()
  }
}

function getTimeRangeMs(range: TimeRange): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const range = (searchParams.get('range') || '24h') as TimeRange

    const now = Date.now()
    const rangeMs = getTimeRangeMs(range)
    const startTime = now - rangeMs

    // Filter records in time range
    const records = usageLog.filter(r => r.timestamp >= startTime)

    // Calculate metrics
    const totalApiCalls = records.length
    const cacheHits = records.filter(r => r.cacheHit).length
    const cacheMisses = records.filter(r => !r.cacheHit).length
    const cacheHitRate = totalApiCalls > 0 ? (cacheHits / totalApiCalls) * 100 : 0

    // API calls by chain
    const apiCallsByChain: Record<string, number> = {}
    for (const record of records) {
      apiCallsByChain[record.chain] = (apiCallsByChain[record.chain] || 0) + 1
    }

    // Etherscan calls today (FREE tier tracking)
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const todayRecords = usageLog.filter(r => r.timestamp >= oneDayAgo)
    const etherscanCallsToday = todayRecords.reduce((sum, r) => sum + r.etherscanCalls, 0)
    const etherscanLimit = 432000 // 5 calls/sec = 432k calls/day
    const etherscanUsagePercent = (etherscanCallsToday / etherscanLimit) * 100

    // Top users by API calls
    const userCounts = new Map<string, number>()
    for (const record of records) {
      userCounts.set(record.address, (userCounts.get(record.address) || 0) + 1)
    }
    const topUsers = Array.from(userCounts.entries())
      .map(([address, calls]) => ({ address, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10)

    // Estimated cost (currently $0 with FREE tiers)
    const estimatedCost = 0 // We're using FREE Etherscan API

    return NextResponse.json({
      totalApiCalls,
      apiCallsByChain,
      cacheHitRate,
      cacheHits,
      cacheMisses,
      estimatedCost,
      topUsers,
      timeRange: range,
      etherscanCallsToday,
      etherscanLimit,
      etherscanUsagePercent,
    }, {
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 's-maxage=120, stale-while-revalidate=240',
      }
    })
  } catch (error) {
    console.error('Failed to fetch usage metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
