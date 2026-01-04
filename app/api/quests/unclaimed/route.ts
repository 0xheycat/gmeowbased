/**
 * @file app/api/quests/unclaimed/route.ts
 * @description Fetch unclaimed quest completions for a user
 * 
 * Phase: Quest On-Chain Claiming (December 31, 2025)
 * 
 * Returns list of quests that have been completed but not claimed on-chain.
 * Used by the UI to show claim buttons for pending rewards.
 * 
 * @module app/api/quests/unclaimed
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/edge';

// Request validation schema
const UnclaimedQuerySchema = z.object({
  fid: z.string().regex(/^\d+$/, 'FID must be a number').transform(Number),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. PARSE AND VALIDATE REQUEST
    const searchParams = request.nextUrl.searchParams;
    const validationResult = UnclaimedQuerySchema.safeParse({
      fid: searchParams.get('fid') || '',
    });

    if (!validationResult.success) {
      console.error('[API] GET /api/quests/unclaimed - Validation failed:', {
        requestId,
        errors: validationResult.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { fid } = validationResult.data;

    // 2. FETCH UNCLAIMED QUESTS
    const supabase = createClient();

    const { data: unclaimedQuests, error: fetchError } = await supabase
      .from('quest_completions')
      .select(`
        id,
        quest_id,
        completer_fid,
        completer_address,
        points_awarded,
        completed_at,
        is_claimed,
        claim_signature,
        unified_quests (
          id,
          title,
          slug,
          category,
          reward_points_awarded,
          onchain_quest_id
        )
      `)
      .eq('completer_fid', fid)
      .eq('is_claimed', false)
      .not('claim_signature', 'is', null)
      .order('completed_at', { ascending: false });

    if (fetchError) {
      console.error('[API] GET /api/quests/unclaimed - Fetch failed:', {
        requestId,
        fid,
        error: fetchError,
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch unclaimed quests',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    // 3. SUCCESS LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] GET /api/quests/unclaimed - Success:', {
      requestId,
      fid,
      count: unclaimedQuests?.length || 0,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      unclaimed_quests: unclaimedQuests || [],
      count: unclaimedQuests?.length || 0,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[API] GET /api/quests/unclaimed - Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
