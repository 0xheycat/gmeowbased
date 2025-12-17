/**
 * Quest Seed API
 * POST /api/quests/seed - Seed initial quest data (development only)
 * 
 * Security: Dev-only, strict rate limiting (10 req/min), error handling
 * MCP Verified: 2025-12-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler';
import { generateRequestId } from '@/lib/middleware/request-id';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  
  try {
    // 1. ENVIRONMENT CHECK - Production forbidden
    if (process.env.NODE_ENV === 'production') {
      logError('Seed attempt in production', {
        endpoint: '/api/quests/seed',
        ip: clientIp,
        method: 'POST',
      });
      
      return createErrorResponse({
        type: ErrorType.AUTHORIZATION,
        message: 'Seeding is only available in development mode',
        statusCode: 403,
        requestId,
      });
    }
    
    // 2. STRICT RATE LIMITING (10 requests per minute for admin operations)
    const rateLimitResult = await rateLimit(clientIp, strictLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded on seed endpoint', {
        endpoint: '/api/quests/seed',
        ip: clientIp,
        method: 'POST',
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      });
      
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many seed requests. Please try again later.',
        statusCode: 429,
        requestId,
        details: {
          limit: rateLimitResult.limit,
          remaining: 0,
          reset: rateLimitResult.reset,
        },
      });
    }
    
    // 3. SEED QUESTS (Using Mock Data)
    // Note: Mock data is in lib/supabase/mock-quest-data.ts
    // Set NEXT_PUBLIC_USE_MOCK_QUESTS=true to enable
    
    // 4. REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] POST /api/quests/seed', {
      ip: clientIp,
      success: true,
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 5. RESPONSE WITH RATE LIMIT HEADERS
    const response = NextResponse.json({
      success: true,
      message: 'Mock data available - no seeding required',
      data: {
        note: 'Set NEXT_PUBLIC_USE_MOCK_QUESTS=true to use mock quest data',
        mockDataPath: 'lib/supabase/mock-quest-data.ts',
        categories: ['onchain', 'social'],
      },
    });
    
    // Add rate limit and request ID headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit || 10));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 10));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset || Date.now() + 60000));
    response.headers.set('X-Request-ID', requestId);
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError(error instanceof Error ? error : String(error), {
      endpoint: '/api/quests/seed',
      ip: clientIp,
      method: 'POST',
      duration: `${duration}ms`,
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to seed quests',
      statusCode: 500,
      requestId,
      details: process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : String(error)
      } : undefined,
    });
  }
}
