/**
 * @file app/api/quests/mark-claimed/route.ts
 * @description Mark quest as claimed in database after on-chain transaction
 * 
 * Phase: Quest On-Chain Claiming (December 31, 2025)
 * 
 * Updates quest_completions table to track which quests have been claimed
 * on-chain. This prevents duplicate claims and provides claiming status
 * for the UI.
 * 
 * @module app/api/quests/mark-claimed
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/edge';

// Request validation schema
const MarkClaimedSchema = z.object({
  quest_id: z.number().int().positive(),
  user_fid: z.number().int().positive(),
  tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. PARSE AND VALIDATE REQUEST
    const body = await request.json();
    const validationResult = MarkClaimedSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] POST /api/quests/mark-claimed - Validation failed:', {
        requestId,
        errors: validationResult.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { quest_id, user_fid, tx_hash } = validationResult.data;

    // 2. UPDATE DATABASE
    const supabase = createClient();

    const { data: updateData, error: updateError } = await supabase
      .from('quest_completions')
      .update({
        is_claimed: true,
        claim_tx_hash: tx_hash,
        claimed_at: new Date().toISOString(),
      })
      .eq('quest_id', quest_id)
      .eq('completer_fid', user_fid)
      .select()
      .single();

    if (updateError) {
      console.error('[API] POST /api/quests/mark-claimed - Update failed:', {
        requestId,
        quest_id,
        user_fid,
        error: updateError,
      });

      return NextResponse.json(
        {
          error: 'Failed to update quest completion',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // 3. SUCCESS LOGGING
    const duration = Date.now() - startTime;
    console.log('[API] POST /api/quests/mark-claimed - Success:', {
      requestId,
      quest_id,
      user_fid,
      tx_hash,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      quest_completion: updateData,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[API] POST /api/quests/mark-claimed - Error:', {
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
