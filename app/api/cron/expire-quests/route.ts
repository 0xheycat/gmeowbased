import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Quest Expiry Cron Job
 * 
 * Runs hourly via GitHub Actions to:
 * - Mark quests past expiry_date as 'expired'
 * - Notify creators of expired quests
 * 
 * Security: Protected by CRON_SECRET bearer token
 */

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return false;
  }
  
  return token === cronSecret;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🕐 Starting quest expiry check...');

    // Call the database function
    const { data, error } = await supabase.rpc('cron_expire_quests');

    if (error) {
      console.error('❌ Quest expiry failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          duration: `${Date.now() - startTime}ms`
        },
        { status: 500 }
      );
    }

    // Get count of expired quests
    const { count: expiredCount } = await supabase
      .from('unified_quests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')
      .gte('updated_at', new Date(startTime).toISOString());

    const duration = Date.now() - startTime;

    console.log(`✅ Quest expiry complete: ${expiredCount || 0} quests expired in ${duration}ms`);

    return NextResponse.json({
      success: true,
      expired_count: expiredCount || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Quest expiry cron failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check database connection
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Supabase configuration missing'
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Test query
  const { count, error } = await supabase
    .from('unified_quests')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    message: 'Quest expiry cron endpoint ready',
    total_quests: count,
    timestamp: new Date().toISOString()
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout
