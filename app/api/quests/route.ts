/**
 * Quest List API
 * GET /api/quests - Fetch all active quests with optional filters
 * 
 * Security: Rate limiting (60 req/min), Zod validation, error handling
 * MCP Verified: 2025-12-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveQuests } from '@/lib/supabase/queries/quests';
import { QuestListQuerySchema } from '@/lib/validation/api-schemas';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/error-handler';
import { ZodError } from 'zod';
import { generateRequestId } from '@/lib/request-id';

interface QuestFilters {
  category?: 'onchain' | 'social';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  limit?: number;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  
  try {
    // 1. RATE LIMITING (60 requests per minute)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: '/api/quests',
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
    
    // 2. INPUT VALIDATION with Zod
    const searchParams = request.nextUrl.searchParams;
    
    const rawParams = {
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };
    
    // Validate with Zod schema
    const validationResult = QuestListQuerySchema.safeParse(rawParams);
    
    if (!validationResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid query parameters',
        statusCode: 400,
        details: validationResult.error.flatten(),
      });
    }
    
    const filters: QuestFilters = {
      category: validationResult.data.category as any,
      difficulty: validationResult.data.difficulty as any,
      search: validationResult.data.search,
      limit: validationResult.data.limit || 20,
    };
    
    // 3. FETCH QUESTS
    const quests = await getActiveQuests(filters);
    
    // 4. REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] GET /api/quests', {
      ip: clientIp,
      filters,
      count: quests.length,
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 5. RESPONSE WITH RATE LIMIT HEADERS
    const response = NextResponse.json({
      success: true,
      data: quests,
      count: quests.length,
    });
    
    // Add rate limit and request ID headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit || 60));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 60));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset || Date.now() + 60000));
    response.headers.set('X-Request-ID', requestId);
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError(error instanceof Error ? error : String(error), {
      endpoint: '/api/quests',
      ip: clientIp,
      duration: `${duration}ms`,
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch quests',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? {
        error: 'Failed to load quests. Please try again later.'
        // Internal error logged above, never expose to users
      } : undefined,
    });
  }
}
