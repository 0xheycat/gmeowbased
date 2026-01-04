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
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler';
import { z } from 'zod';
import { generateRequestId } from '@/lib/middleware/request-id';

export const dynamic = 'force-dynamic';

// Request validation schema
const VerifyQuestSchema = z.object({
  userFid: z.number().int().positive().min(1).max(10000000), // Raised from 1M to 10M to support growing Farcaster network
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  taskIndex: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  // Next.js 15: params must be awaited
  const { slug: questSlug } = await params;
  
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
    
    // 3. FETCH QUEST BY SLUG (supports both numeric ID and text slug)
    const { getQuestBySlug } = await import('@/lib/supabase/queries/quests');
    const questData = await getQuestBySlug(questSlug, validationResult.data.userFid);
    
    if (!questData) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Quest not found',
        statusCode: 404,
        details: { slug: questSlug },
      });
    }
    
    const questId = questData.id;
    
    // 4. VERIFY QUEST TASK
    const verificationResult = await verifyQuest({
      userFid: validationResult.data.userFid,
      userAddress: validationResult.data.userAddress as `0x${string}` | undefined,
      questId: questId,
      taskIndex: validationResult.data.taskIndex,
    });
    
    // 4.5. GENERATE ORACLE SIGNATURE (if quest completed and user has wallet)
    let claimSignature = null;
    if (verificationResult.quest_completed && validationResult.data.userAddress) {
      try {
        const { generateQuestClaimSignature } = await import('@/lib/quests/oracle-signature');
        
        // CRITICAL: Use onchain_quest_id, not database id
        if (!questData.onchain_quest_id) {
          throw new Error('Quest not deployed on-chain - cannot generate claim signature');
        }
        
        claimSignature = await generateQuestClaimSignature({
          questId: questData.onchain_quest_id,
          userAddress: validationResult.data.userAddress as `0x${string}`,
          fid: validationResult.data.userFid,
        });
        
        console.log('[API] Generated claim signature:', {
          questId,
          userFid: validationResult.data.userFid,
          deadline: claimSignature.deadline,
          nonce: claimSignature.nonce.toString(),
        });
        
        // Store signature in quest_completions for later claiming
        try {
          const { createClient } = await import('@/lib/supabase/edge');
          const supabase = createClient();
          
          // Convert BigInt to string for JSON storage
          const serializableSignature = {
            ...claimSignature,
            nonce: claimSignature.nonce.toString(),
          };
          
          await supabase
            .from('quest_completions')
            .update({
              claim_signature: serializableSignature
            })
            .eq('quest_id', questId)
            .eq('completer_fid', validationResult.data.userFid);
          
          console.log('[API] Stored claim signature in database');
        } catch (dbError) {
          console.error('[API] Failed to store claim signature in database:', dbError);
        }
      } catch (signatureError) {
        // Log error but don't fail verification - user can still complete quest later
        console.error('[API] Failed to generate claim signature:', signatureError);
      }
    }
    
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
    const response = NextResponse.json({
      ...verificationResult,
      claim_signature: claimSignature, // Add signature if quest completed
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
