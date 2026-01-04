/**
 * Quest Details API
 * GET /api/quests/[slug] - Fetch quest details with user progress
 * 
 * Security: Rate limiting (60 req/min), Zod validation, error handling
 * MCP Verified: 2025-01-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuestBySlug } from '@/lib/supabase/queries/quests';
import { QuestDetailsQuerySchema } from '@/lib/validation/api-schemas';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler';
import { getCached } from '@/lib/cache/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  // Next.js 15: params must be awaited
  const { slug: questSlug } = await params;
  
  try {
    // 1. RATE LIMITING (60 requests per minute)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: '/api/quests/[slug]',
        ip: clientIp,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      });
      
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        details: {
          limit: rateLimitResult.limit,
          remaining: 0,
          reset: rateLimitResult.reset,
        },
      });
    }
    
    // 2. INPUT VALIDATION with Zod (userFid optional)
    const searchParams = request.nextUrl.searchParams;
    const userFidParam = searchParams.get('userFid');
    const cacheBustParam = searchParams.get('_t'); // Cache-busting parameter
    
    let userFidNum: number | undefined = undefined;
    
    if (userFidParam) {
      userFidNum = parseInt(userFidParam);
      
      // Validate with Zod schema if provided
      const validationResult = QuestDetailsQuerySchema.safeParse({ userFid: userFidNum });
      
      if (!validationResult.success) {
        return createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid user FID',
          statusCode: 400,
          details: validationResult.error.flatten(),
        });
      }
      
      userFidNum = validationResult.data.userFid;
    }
    
    // 3. QUEST SLUG VALIDATION
    if (!questSlug || typeof questSlug !== 'string') {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid quest slug format',
        statusCode: 400,
        details: { expected: 'string slug' },
      });
    }
    
    // 4. CACHED QUEST FETCH WITH PROGRESS (Bug #42: bypass cache if _t parameter present)
    const shouldBypassCache = !!cacheBustParam;
    const cacheKey = userFidNum ? `${questSlug}:${userFidNum}` : questSlug;
    
    let result;
    if (shouldBypassCache) {
      // Bypass cache for fresh data after quest completion
      result = await getQuestBySlug(questSlug, userFidNum);
    } else {
      // Use cached data for normal requests
      result = await getCached(
        'quest-details',
        cacheKey,
        async () => {
          return await getQuestBySlug(questSlug, userFidNum);
        },
        { ttl: 60 }
      );
    }
    
    if (!result) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Quest not found',
        statusCode: 404,
        details: { questSlug },
      });
    }
    
    // 5. REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] GET /api/quests/[slug]', {
      ip: clientIp,
      questSlug,
      userFid: userFidNum || 'anonymous',
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 6. RESPONSE WITH RATE LIMIT HEADERS
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Limit': String(rateLimitResult.limit || 60),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 60),
        },
      }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle quest not found specifically
    if (error instanceof Error && error.message.includes('not found')) {
      logError(error, {
        endpoint: '/api/quests/[slug]',
        ip: clientIp,
        duration: `${duration}ms`,
      });
      
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Quest not found',
        statusCode: 404,
        details: { questSlug },
      });
    }
    
    // Generic error handling
    logError(error instanceof Error ? error : String(error), {
      endpoint: '/api/quests/[slug]',
      ip: clientIp,
      duration: `${duration}ms`,
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch quest details',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : String(error)
      } : undefined,
    });
  }
}
