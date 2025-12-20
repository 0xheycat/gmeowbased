/**
 * DEPRECATED: Seasons API Route
 * 
 * Status: Deprecated as of December 19, 2025
 * Reason: Seasons functionality does not exist in current contract
 * Frontend: Not used by any frontend components (verified via grep)
 * 
 * This route returns empty seasons array for backward compatibility.
 * Consider removing this route entirely in future cleanup.
 * 
 * Migration Status: ✅ Complete (Route deprecated)
 * Last Contract Read Route: Removed December 19, 2025
 */

import { NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/middleware/request-id'

export const GET = async (req: Request) => {
  const requestId = generateRequestId()
  
  return NextResponse.json(
    {
      ok: true,
      chain: 'base',
      seasons: [],
      reason: 'deprecated_route',
      message: 'Seasons functionality is not available. This route is deprecated.',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        'X-Request-ID': requestId,
        'X-Deprecated': 'true',
        'X-Deprecation-Date': '2025-12-19',
      },
    }
  )
}
