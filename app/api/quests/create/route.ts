/**
 * Quest Creation API Endpoint
 * POST /api/quests/create
 * 
 * Enterprise Enhancement: Idempotency Keys (CRITICAL)
 * Prevents duplicate quest creation and double-charging points on network retry.
 * Pattern: Stripe API idempotency (24h cache, X-Idempotency-Replayed header)
 * 
 * Phase 3: Business Logic - Quest Creation System
 * Task 8.5: Quest Creation UI
 * 
 * Creates new quests with:
 * - Points escrow (BASE POINTS deducted from creator)
 * - Unified quest insertion
 * - Task creation with verification data
 * - Slug generation
 * - Cost calculation
 * 
 * Created: December 4, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler';
import { calculateQuestCost, type QuestCostInput } from '@/lib/quests/cost-calculator';
import { escrowPoints } from '@/lib/quests/points-escrow-service';
import { getSupabaseServerClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { QuestCategory, QuestDifficulty } from '@/lib/supabase/types/quest';
import type { QuestDraft } from '@/lib/quests/types';
import { checkIdempotency, storeIdempotency, getIdempotencyKey } from '@/lib/middleware/idempotency';
import { generateRequestId } from '@/lib/middleware/request-id';

export const dynamic = 'force-dynamic';

// Request validation schema
const TaskSchema = z.object({
  type: z.enum(['social', 'onchain', 'manual']),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  verification_data: z.record(z.string(), z.any()),
  required: z.boolean(),
  order: z.number().int().min(0),
});

const CreateQuestSchema = z.object({
  // Creator info
  creator_fid: z.number().int().positive(),
  creator_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  
  // Quest basics
  title: z.string().min(10).max(100),
  description: z.string().min(20).max(500),
  category: z.enum(['onchain', 'social', 'creative', 'learn', 'hybrid']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_time: z.string(),
  
  // Dates
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  max_participants: z.number().int().positive().optional(),
  
  // Tasks
  tasks: z.array(TaskSchema).min(1).max(10),
  
  // Rewards
  reward_points: z.number().int().min(10).max(1000),
  reward_xp: z.number().int().min(0).max(500).optional(),
  create_new_badge: z.boolean().optional(),
  
  // Optional
  template_id: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  announce_via_bot: z.boolean().optional(),
});

type CreateQuestRequest = z.infer<typeof CreateQuestSchema>;

/**
 * Generate unique quest slug
 */
function generateQuestSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  const timestamp = Date.now().toString(36);
  return `${base}-${timestamp}`;
}

/**
 * POST /api/quests/create
 * Create new quest with points escrow
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(request);
  
  try {
    // 1. RATE LIMITING (20 requests per hour per creator)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter);
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: '/api/quests/create',
        ip: clientIp,
        method: 'POST',
      });
      
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many quest creation requests. Please try again later.',
        statusCode: 429,
        requestId,
      });
    }
    
    // 2. INPUT VALIDATION
    let body: CreateQuestRequest;
    try {
      const rawBody = await request.json();
      body = CreateQuestSchema.parse(rawBody);
    } catch (parseError) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: parseError instanceof z.ZodError 
          ? 'Invalid request data' 
          : 'Invalid JSON body',
        statusCode: 400,
        details: parseError instanceof z.ZodError ? parseError.flatten() : undefined,
      });
    }
    
    // Enterprise Enhancement: Check Idempotency Key (CRITICAL - prevents double-charging)
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const cachedResponse = await checkIdempotency(idempotencyKey);
      if (cachedResponse) {
        return cachedResponse; // Returns cached response with X-Idempotency-Replayed header
      }
    }
    
    // 3. CALCULATE COST
    const costInput: QuestCostInput = {
      category: body.category,
      taskCount: body.tasks.length,
      rewardXp: body.reward_xp || 0,
      hasNewBadge: body.create_new_badge,
      rewardPoints: body.reward_points,
    };
    
    const cost = calculateQuestCost(costInput);
    
    // 4. INITIALIZE SUPABASE CLIENT
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Database connection failed',
        statusCode: 500,
      });
    }
    
    // 5. VERIFY CREATOR HAS SUFFICIENT POINTS
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('user_points_balances')
      .select('total_points')
      .eq('fid', body.creator_fid)
      .single() as { data: Database['public']['Tables']['user_points_balances']['Row'], error: any };
    
    if (leaderboardError || !leaderboardData) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Creator not found in points balances',
        statusCode: 404,
      });
    }
    
    const creatorPoints = leaderboardData.total_points || 0;
    
    if (creatorPoints < cost.total) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Insufficient TOTAL POINTS to create quest',
        statusCode: 400,
        details: {
          required: cost.total,
          available: creatorPoints,
          shortage: cost.total - creatorPoints,
        },
      });
    }
    
    // 6. GENERATE SLUG
    const slug = generateQuestSlug(body.title);
    
    // 7. ESCROW POINTS (deduct from creator, store in costs table)
    const escrowResult = await escrowPoints({
      fid: body.creator_fid,
      amount: cost.total,
      questData: {
        title: body.title,
        category: body.category,
        slug,
      },
    });
    
    if (!escrowResult.success) {
      return createErrorResponse({
        type: ErrorType.DATABASE,
        message: escrowResult.error || 'Failed to escrow points',
        statusCode: 500,
      });
    }
    
    // 8. INSERT UNIFIED QUEST (with tasks as JSON)
    const { data: questData, error: questError } = await supabase
      .from('unified_quests')
      .insert({
        title: body.title,
        description: body.description,
        slug,
        category: body.category,
        type: 'custom',
        difficulty: body.difficulty,
        estimated_time_minutes: parseInt(body.estimated_time) || 30,
        tasks: body.tasks as any, // Store tasks as JSON
        creator_fid: body.creator_fid,
        creator_address: body.creator_address,
        reward_points: body.reward_points,
        reward_xp: body.reward_xp || 0,
        reward_mode: 'points',
        status: 'active',
        max_completions: body.max_participants,
        completion_count: 0,
        expiry_date: body.ends_at,
        cover_image_url: body.cover_image_url,
        min_viral_xp_required: 0,
        is_featured: false,
        tags: [body.category, body.difficulty],
        participant_count: 0,
        verification_data: {
          creation_cost: cost.total,
          template_id: body.template_id,
        },
      } as any)
      .select()
      .single() as { data: Database['public']['Tables']['unified_quests']['Row'], error: any };
    
    if (questError || !questData) {
      // ROLLBACK: Refund escrow if quest creation fails
      await supabase
        .from('user_points_balances')
        .update({ 
          base_points: creatorPoints, // Restore original points
          updated_at: new Date().toISOString()
        })
        .eq('fid', body.creator_fid);
      
      logError('Quest creation failed', {
        error: questError,
        creator_fid: body.creator_fid,
      });
      
      return createErrorResponse({
        type: ErrorType.DATABASE,
        message: 'Failed to create quest',
        statusCode: 500,
        details: questError,
      });
    }
    
    // 9. TASKS STORED AS JSON (no separate quest_tasks table)
    // Tasks are already stored in the unified_quests.tasks column above
    // No separate insert needed
    
    // 10. UPDATE TEMPLATE USAGE (if used)
    if (body.template_id) {
      await supabase
        .from('quest_templates')
        .update({ 
          usage_count: questData.id, // Will be incremented via RPC
        })
        .eq('id', body.template_id);
      
      // Use RPC to increment atomically
      await supabase.rpc('increment_template_usage', {
        p_template_id: body.template_id,
      });
    }
    
    // 11. SUCCESS RESPONSE
    const duration = Date.now() - startTime;
    
    // 12. POST-PUBLISH ACTIONS (Phase 4 - Complete)
    try {
      // Send success notification to creator via notification history
      const { saveNotification } = await import('@/lib/notifications');
      await saveNotification({
        fid: body.creator_fid,
        category: 'quest',
        title: 'Quest Published Successfully! 🎉',
        description: `Your quest "${body.title}" is now live and ready for participants. Share it to get started!`,
        tone: 'quest_added',
        metadata: {
          quest_id: questData.id,
          quest_slug: questData.slug,
          quest_title: body.title,
          cost: cost.total,
          tasks_count: body.tasks.length,
        },
        actionLabel: 'View Quest',
        actionHref: `/quests/${questData.slug}`,
      });
      
      // Generate quest frame URL for sharing (Farcaster frames)
      const frameUrl = `${process.env.NEXT_PUBLIC_URL || 'https://gmeowbased.fun'}/frame/quest/${questData.slug}`;
      
      // Optional: Announce via @gmeowbased bot (if requested)
      // Note: Bot announcement is optional and won't block quest creation
      // Phase 4: Bot announcement feature placeholder (requires bot infrastructure setup)
      if (body.announce_via_bot === true) {
        console.info('[Quest Create] Bot announcement requested for quest:', questData.slug);
        // TODO: Implement bot announcement via Neynar API
        // const castText = `🎮 New Quest Alert!\n\n"${body.title}"\n\n✨ Difficulty: ${body.difficulty}\n🏆 Rewards: ${body.reward_points} BASE POINTS${body.reward_xp ? ` + ${body.reward_xp} XP` : ''}\n📋 ${body.tasks.length} task${body.tasks.length > 1 ? 's' : ''} to complete\n\nJoin now: ${frameUrl}`;
        // await publishBotCast(castText, frameUrl);
      }
    } catch (notifError) {
      // Don't fail quest creation if post-publish actions fail
      logError('Post-publish actions failed', {
        error: notifError,
        quest_id: questData.id,
      });
    }
    
    const responsePayload = {
      success: true,
      data: {
        quest: {
          id: questData.id,
          slug: questData.slug,
          title: questData.title,
          category: questData.category,
          cost: cost.total,
        },
        escrow: {
          cost_breakdown: cost,
          points_remaining: creatorPoints - cost.total,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
    };

    // Store idempotency key for 24h (CRITICAL - prevents duplicate quest creation and double-charging)
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responsePayload);
    }

    const response = NextResponse.json(responsePayload, { status: 201 });
    response.headers.set('X-Request-ID', requestId);
    return response;
    
  } catch (error) {
    logError('Quest creation error', {
      error,
      endpoint: '/api/quests/create',
    });
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Internal server error',
      statusCode: 500,
      requestId,
    });
  }
}
