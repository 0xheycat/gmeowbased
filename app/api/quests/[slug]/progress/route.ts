/**
 * Quest Progress Check API
 * POST /api/quests/[questId]/progress - Check and update user's quest progress
 * 
 * Security: Rate limiting (60 req/min), Zod validation, error handling
 * MCP Verified: 2025-12-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuestBySlug } from '@/lib/supabase/queries/quests';
import { QuestProgressCheckSchema } from '@/lib/validation/api-schemas';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  const slug = params.slug;
  
  try {
    // 1. RATE LIMITING (60 requests per minute)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: `/api/quests/${slug}/progress`,
        ip: clientIp,
        method: 'POST',
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
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid JSON body',
        statusCode: 400,
      });
    }
    
    // Validate with Zod schema
    const validationResult = QuestProgressCheckSchema.safeParse(body);
    
    if (!validationResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid request body',
        statusCode: 400,
        details: validationResult.error.flatten(),
      });
    }
    
    // 3. QUEST SLUG VALIDATION
    if (!slug || !slug.startsWith('quest-')) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid quest slug format',
        statusCode: 400,
        details: { expected: 'quest-{number}' },
      });
    }
    
    // 4. CHECK QUEST PROGRESS (fetches from database)
    const result = await getQuestBySlug(slug, validationResult.data.userFid);
    
    if (!result) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Quest not found',
        statusCode: 404,
        details: { slug },
      });
    }
    
    const progress = result.user_progress;
    
    // 5. REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] POST /api/quests/[slug]/progress', {
      ip: clientIp,
      slug,
      userFid: validationResult.data.userFid,
      status: progress?.status || 'not_started',
      progress: progress ? `${progress.progress_percentage}%` : '0%',
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 6. RESPONSE WITH RATE LIMIT HEADERS
    const statusMessage = progress?.status === 'completed' 
      ? `Quest completed! You earned ${result.reward_points} points!`
      : progress?.status === 'in_progress'
      ? `Quest in progress: ${progress.progress_percentage}% complete`
      : 'Quest not started yet';
    
    const response = NextResponse.json({
      success: true,
      data: {
        questId: result.id,
        slug: result.slug,
        status: progress?.status || 'not_started',
        progress: progress ? `${progress.progress_percentage}%` : '0%',
        completedTasks: progress?.completed_tasks || [],
        currentTaskIndex: progress?.current_task_index || 0,
        totalTasks: result.tasks.length,
      },
      message: statusMessage,
    });
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit || 60));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 60));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset || Date.now() + 60000));
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle quest not found specifically
    if (error instanceof Error && error.message.includes('not found')) {
      logError(error, {
        endpoint: `/api/quests/${slug}/progress`,
        ip: clientIp,
        method: 'POST',
        duration: `${duration}ms`,
      });
      
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Quest not found',
        statusCode: 404,
        details: { slug },
      });
    }
    
    // Handle Farcaster API errors
    if (error instanceof Error && error.message.includes('Farcaster')) {
      logError(error, {
        endpoint: `/api/quests/${slug}/progress`,
        ip: clientIp,
        method: 'POST',
        duration: `${duration}ms`,
      });
      
      return createErrorResponse({
        type: ErrorType.EXTERNAL_API,
        message: 'Failed to fetch data from Farcaster',
        statusCode: 503,
        details: process.env.NODE_ENV === 'development' ? {
          error: error.message
        } : undefined,
      });
    }
    
    // Generic error handling
    logError(error instanceof Error ? error : String(error), {
      endpoint: `/api/quests/${slug}/progress`,
      ip: clientIp,
      method: 'POST',
      duration: `${duration}ms`,
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to check quest progress',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? {
        error: 'Failed to fetch quest progress. Please try again later.'
        // Internal error logged above, never expose to users
      } : undefined,
    });
  }
}
