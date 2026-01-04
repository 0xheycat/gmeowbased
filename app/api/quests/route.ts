/**
 * Quest List API
 * GET /api/quests - Fetch all active quests with optional filters
 * 
 * Security: Rate limiting (60 req/min), Zod validation, error handling
 * MCP Verified: 2025-12-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveQuests } from '@/lib/supabase/queries/quests';
import { getQuestById, getQuestCompletionCount } from '@/lib/subsquid-client';
import { QuestListQuerySchema } from '@/lib/validation/api-schemas';
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit';
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler';
import { getCached } from '@/lib/cache/server';
import { ZodError } from 'zod';

interface QuestFilters {
  category?: 'onchain' | 'social';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  limit?: number;
  sortBy?: 'recent' | 'popular' | 'rewards';
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
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
      sortBy: searchParams.get('sortBy') || 'recent',
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
      sortBy: rawParams.sortBy as any,
    };
    
    // 3. CACHED QUEST FETCH
    const cacheKey = `${filters.category || 'all'}:${filters.difficulty || 'all'}:${filters.search || ''}:${filters.limit}:${filters.sortBy}`;
    const questsWithStats = await getCached(
      'quests-list',
      cacheKey,
      async () => {
        // FETCH QUESTS FROM SUPABASE
        let quests = await getActiveQuests(filters);
        
        // ENRICH WITH SUBSQUID COMPLETION STATS (Phase 8.1)
        // Fetch completion counts for each quest from blockchain indexer
        const enrichedQuests = await Promise.all(
          quests.map(async (quest) => {
            let completionCount = 0;
            
            // Try to fetch from Subsquid if quest has contract_quest_id
            if ((quest as any).contract_quest_id) {
              try {
                const subsquidQuest = await getQuestById((quest as any).contract_quest_id);
                completionCount = subsquidQuest?.totalCompletions || 0;
              } catch (error) {
                console.warn(`[Quest Stats] Failed to fetch Subsquid data for quest ${quest.id}:`, error);
              }
            }
            
            return {
              ...quest,
              completionCount,
              popularity: completionCount * (quest.reward_points_awarded || 0), // engagement score
            };
          })
        );
        
        // SORT BY POPULARITY IF REQUESTED
        if (filters.sortBy === 'popular') {
          enrichedQuests.sort((a, b) => b.completionCount - a.completionCount);
        } else if (filters.sortBy === 'rewards') {
          enrichedQuests.sort((a, b) => (b.reward_points_awarded || 0) - (a.reward_points_awarded || 0));
        }
        
        return enrichedQuests;
      },
      { ttl: 120 }
    );
    
    // REQUEST LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] GET /api/quests', {
      ip: clientIp,
      filters,
      count: questsWithStats.length,
      duration: `${duration}ms`,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
    });
    
    // RESPONSE WITH RATE LIMIT HEADERS
    return NextResponse.json(
      {
        success: true,
        data: questsWithStats,
        count: questsWithStats.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
          'X-RateLimit-Limit': String(rateLimitResult.limit || 60),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 60),
        },
      }
    );
    
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
