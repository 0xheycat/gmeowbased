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
import { generateRequestId } from '@/lib/middleware/request-id';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  const questSlug = params.slug;
  
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
        requestId,
        details: {
          limit: rateLimitResult.limit,
          remaining: 0,
          reset: rateLimitResult.reset,
        },
      });
    }
    
    // 2. INPUT VALIDATION with Zod
    const searchParams = request.nextUrl.searchParams;
    const userFidParam = searchParams.get('userFid');
    
    if (!userFidParam) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'User FID is required',
        statusCode: 400,
        requestId,
        details: { required: 'userFid query parameter' },
      });
    }
    
    const userFidNum = parseInt(userFidParam);
    
    // Validate with Zod schema
    const validationResult = QuestDetailsQuerySchema.safeParse({ userFid: userFidNum });
    
    if (!validationResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid user FID',
        statusCode: 400,
        requestId,
        details: validationResult.error.flatten(),
      });
    }
    
    // 3. QUEST SLUG VALIDATION
    if (!questSlug || typeof questSlug !== 'string') {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid quest slug format',
        statusCode: 400,
        requestId,
        details: { expected: 'string slug' },
      });
    }
    
    // 4. FETCH QUEST WITH PROGRESS
    const result = await getQuestBySlug(questSlug, validationResult.data.userFid);
    
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
      userFid: validationResult.data.userFid,
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 6. RESPONSE WITH RATE LIMIT HEADERS
    const response = NextResponse.json({
      success: true,
      data: result,
    });
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit || 60));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 60));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset || Date.now() + 60000));
    response.headers.set('X-Request-ID', requestId);
    
    return response;
    
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
      requestId,
      details: process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : String(error)
      } : undefined,
    });
  }
}
