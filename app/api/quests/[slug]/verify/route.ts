/**
 * Quest Verification API (NEW SYSTEM)
 * POST /api/quests/[questId]/verify - Verify quest task completion
 * 
 * Uses verification-orchestrator.ts for direct database updates
 * No oracle signatures, no manual claiming
 * Rewards (XP + Points) automatically distributed
 * 
 * MCP Created: December 4, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyQuest } from '@/lib/quests/verification-orchestrator';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/error-handler';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Request validation schema
const VerifyQuestSchema = z.object({
  userFid: z.number().int().positive().min(1).max(1000000),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  taskIndex: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  const questSlug = params.slug;
  
  try {
    // 1. RATE LIMITING (60 requests per minute)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: `/api/quests/${questSlug}/verify`,
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
    
    // 2. INPUT VALIDATION
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
    
    const validationResult = VerifyQuestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid request body',
        statusCode: 400,
        details: validationResult.error.flatten(),
      });
    }
    
    // 3. EXTRACT QUEST ID
    // Quest slug format: "quest-1" or just "1"
    const questIdMatch = questSlug.match(/^quest-(\d+)$/) || questSlug.match(/^(\d+)$/);
    if (!questIdMatch) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid quest ID format',
        statusCode: 400,
        details: { expected: 'quest-{id} or {id}' },
      });
    }
    
    const questId = parseInt(questIdMatch[1]);
    
    // 4. VERIFY QUEST TASK
    const verificationResult = await verifyQuest({
      userFid: validationResult.data.userFid,
      userAddress: validationResult.data.userAddress as `0x${string}` | undefined,
      questId: questId,
      taskIndex: validationResult.data.taskIndex,
    });
    
    // 5. REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] POST /api/quests/[questId]/verify', {
      ip: clientIp,
      questId,
      userFid: validationResult.data.userFid,
      taskIndex: validationResult.data.taskIndex,
      success: verificationResult.success,
      questCompleted: verificationResult.quest_completed,
      taskCompleted: verificationResult.task_completed,
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // 6. RESPONSE
    const response = NextResponse.json(verificationResult);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit || 60));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 60));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset || Date.now() + 60000));
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError(error instanceof Error ? error : String(error), {
      endpoint: `/api/quests/${questSlug}/verify`,
      ip: clientIp,
      method: 'POST',
      duration: `${duration}ms`,
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to verify quest',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? {
        error: 'Verification failed. Please try again later.'
        // Internal error logged above, never expose to users
      } : undefined,
    });
  }
}
