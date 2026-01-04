/**
 * @file app/api/quests/regenerate-signature/route.ts
 * @description Regenerate claim signature for existing quest completions
 * 
 * This endpoint is used to generate claim signatures for quests that were
 * completed before the claiming system was implemented, or where signature
 * generation failed during verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/edge';
import { generateQuestClaimSignature } from '@/lib/quests/oracle-signature';

const RegenerateSchema = z.object({
  quest_id: z.number().int().positive(),
  fid: z.number().int().positive(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), // Override wallet address
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = RegenerateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { quest_id, fid, userAddress: overrideAddress } = validationResult.data;

    // Get quest completion from database
    const supabase = createClient();
    const { data: completion, error: fetchError } = await supabase
      .from('quest_completions')
      .select('*, unified_quests(onchain_quest_id)')
      .eq('quest_id', quest_id)
      .eq('completer_fid', fid)
      .single();

    if (fetchError || !completion) {
      return NextResponse.json(
        { error: 'Quest completion not found' },
        { status: 404 }
      );
    }

    if (completion.is_claimed) {
      return NextResponse.json(
        { error: 'Quest already claimed' },
        { status: 400 }
      );
    }

    if (!completion.completer_address) {
      return NextResponse.json(
        { error: 'No wallet address associated with this completion' },
        { status: 400 }
      );
    }

    // CRITICAL: Use onchain_quest_id, not database quest_id
    const onchainQuestId = (completion.unified_quests as any)?.onchain_quest_id;
    if (!onchainQuestId) {
      return NextResponse.json(
        { error: 'Quest not deployed on-chain' },
        { status: 400 }
      );
    }

    // Use override address if provided (for multi-wallet users), otherwise use stored address
    const targetAddress = overrideAddress || completion.completer_address;
    
    if (!targetAddress) {
      return NextResponse.json(
        { error: 'No wallet address available' },
        { status: 400 }
      );
    }

    console.log('[RegenerateSignature] Generating for:', {
      questId: onchainQuestId,
      fid,
      originalAddress: completion.completer_address,
      targetAddress,
      isOverride: !!overrideAddress
    });

    // Generate new signature with on-chain quest ID
    const signature = await generateQuestClaimSignature({
      questId: onchainQuestId,
      userAddress: targetAddress as `0x${string}`,
      fid: fid,
    });

    // Convert BigInt to string for JSON serialization
    const serializableSignature = {
      ...signature,
      nonce: signature.nonce.toString(),
    };

    // Update database with signature
    const { error: updateError } = await supabase
      .from('quest_completions')
      .update({ claim_signature: serializableSignature })
      .eq('id', completion.id);

    if (updateError) {
      throw new Error(`Failed to store signature: ${updateError.message}`);
    }

    console.log('[API] Regenerated claim signature:', {
      quest_id,
      fid,
      deadline: signature.deadline,
    });

    return NextResponse.json({
      success: true,
      signature: serializableSignature,
      message: 'Claim signature regenerated successfully',
    });
  } catch (error) {
    console.error('[API] Error regenerating signature:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
