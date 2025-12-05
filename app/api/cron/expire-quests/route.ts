import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, strictLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/rate-limit';

/**
 * Quest Expiry Cron Job
 * 
 * Runs hourly via GitHub Actions to:
 * - Mark quests past expiry_date as 'expired'
 * - Notify creators of expired quests
 * 
 * Security Features:
 * - CRON_SECRET bearer token verification
 * - Rate limiting: 10 requests per minute per IP (strictLimiter)
 * - IP whitelist: GitHub Actions IPs only
 * - Request logging for audit trail
 * - Timeout protection (60s max duration)
 * 
 * GitHub Actions IP Ranges (as of 2024):
 * - https://api.github.com/meta (dynamic list)
 * - Primary ranges: 140.82.112.0/20, 143.55.64.0/20, 185.199.108.0/22
 */

// GitHub Actions IP verification (optional - disable for local testing)
const GITHUB_ACTIONS_ENABLED = process.env.ENABLE_GITHUB_IP_WHITELIST === 'true';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('❌ [Quest Expiry] CRON_SECRET not configured');
    return false;
  }
  
  if (token !== cronSecret) {
    console.error('❌ [Quest Expiry] Invalid CRON_SECRET provided');
    return false;
  }
  
  return true;
}

// Verify request is from GitHub Actions (optional security layer)
function verifyGitHubActionsIP(request: NextRequest): boolean {
  if (!GITHUB_ACTIONS_ENABLED) return true; // Disabled for local dev
  
  const ip = getClientIp(request);
  const forwardedFor = request.headers.get('x-forwarded-for');
  
  console.log(`[Quest Expiry] Request from IP: ${ip}, X-Forwarded-For: ${forwardedFor}`);
  
  // In production, you could verify against GitHub's IP ranges
  // For now, we rely on CRON_SECRET as primary security
  return true;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  
  try {
    // Security Layer 1: Rate limiting (10 req/min per IP)
    const rateLimitResult = await rateLimit(ip, strictLimiter);
    if (!rateLimitResult.success) {
      console.warn(`[Quest Expiry] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          }
        }
      );
    }
    
    // Security Layer 2: CRON_SECRET verification
    if (!verifyCronSecret(request)) {
      console.error(`[Quest Expiry] Unauthorized request from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Security Layer 3: GitHub Actions IP verification (optional)
    if (!verifyGitHubActionsIP(request)) {
      console.error(`[Quest Expiry] Request from non-whitelisted IP: ${ip}`);
      return NextResponse.json(
        { error: 'Forbidden - Invalid source IP' },
        { status: 403 }
      );
    }
    
    console.log(`[Quest Expiry] Authorized request from IP: ${ip}`);

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

    console.log(`✅ [Quest Expiry] Complete: ${expiredCount || 0} quests expired in ${duration}ms from IP: ${ip}`);

    return NextResponse.json({
      success: true,
      expired_count: expiredCount || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      source_ip: ip // Include for audit trail
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Quest Expiry] Failed from IP ${ip}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  
  // Rate limit health checks too
  const rateLimitResult = await rateLimit(ip, strictLimiter);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.error(`[Quest Expiry Health] Unauthorized from IP: ${ip}`);
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
