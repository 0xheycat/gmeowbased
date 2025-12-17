/**
 * #file: app/api/cron/process-mint-queue/route.ts
 * 
 * TODO:
 * - Add request logging to audit table
 * - Add response caching (60 seconds) to prevent duplicate calls
 * - Add health check endpoint (/api/cron/health)
 * - Add metrics endpoint (/api/cron/metrics)
 * 
 * FEATURES:
 * - API endpoint to trigger Supabase Edge Function
 * - Authenticates requests using CRON_SECRET bearer token
 * - Forwards requests to Supabase Edge Function
 * - Returns mint worker results (processed, successful, failed)
 * - Implements rate limiting to prevent abuse
 * - Professional headers (X-Content-Type-Options, X-Frame-Options)
 * 
 * PHASE: Phase 1 - Critical Infrastructure (Week 1, Day 1)
 * DATE: December 16, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - NFT-SYSTEM-ARCHITECTURE-PART-4.md (Section 17, Task 1.3)
 * - farcaster.instructions.md (Section 3.2 - API Security 10-Layer Pattern)
 * - farcaster.instructions.md (Section 3.3 - Professional Headers)
 * 
 * SUGGESTIONS:
 * - Add webhook notifications after successful processing
 * - Add Sentry error tracking for failed API calls
 * - Add response compression for large result sets
 * - Consider implementing circuit breaker pattern for Supabase calls
 * 
 * CRITICAL FOUND:
 * - ⚠️ CRON_SECRET must be strong (32+ characters, high entropy)
 * - ⚠️ Rate limiting critical to prevent DoS attacks
 * - ⚠️ Supabase service role key has full database access (secure storage)
 * - ⚠️ Edge Function timeout is 300s - ensure cron timeout is higher
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO public access without authentication
 * - ❌ NO exposing sensitive error details to client
 * - ❌ NO missing CSRF protection
 * - ❌ NO skipping rate limiting
 * - ❌ NO hardcoded secrets
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/middleware/rate-limit'

/**
 * POST /api/cron/process-mint-queue
 * 
 * Triggers the NFT mint worker to process pending mints from mint_queue table.
 * Requires CRON_SECRET authentication header.
 * 
 * @returns JSON response with mint processing results
 */
export async function POST(request: NextRequest) {
  try {
    // Layer 1: Rate Limiting (10 requests per minute for cron endpoints)
    const identifier = getClientIdentifier(request)
    const rateLimitResult = await checkRateLimit({
      maxRequests: 10,
      windowSeconds: 60,
      identifier,
      namespace: 'cron_mint_worker'
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetAt / 1000)),
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
          }
        }
      )
    }

    // Layer 3: Authentication (CRON_SECRET verification)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.log('Unauthorized cron request:', {
        ip: identifier,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="Cron API"'
          }
        }
      )
    }

    // Layer 7: CSRF Protection (Origin validation)
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'https://gmeowhq.art',
      process.env.NEXT_PUBLIC_BASE_URL
    ].filter(Boolean)
    
    // Allow GitHub Actions (no origin header) or allowed origins
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'Forbidden origin' },
        { status: 403 }
      )
    }

    console.log('Processing mint queue:', {
      timestamp: new Date().toISOString(),
      source: origin || 'GitHub Actions'
    })

    // Step 1: Call Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-mint-queue`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(280000) // 280s timeout (less than Edge Function timeout)
      }
    )

    // Check if Edge Function call succeeded
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Edge Function error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      // Layer 10: Error Masking (don't expose Edge Function errors)
      return NextResponse.json(
        { 
          error: 'Mint worker failed',
          processed: 0
        },
        { status: 500 }
      )
    }

    // Step 2: Parse and return results
    const result = await response.json()
    
    console.log('Mint worker completed:', {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      timestamp: new Date().toISOString()
    })

    // Layer 9: Audit Logging (log successful cron execution)
    // Note: In production, send to external logging service (Datadog, Sentry)
    
    // Return results with professional headers
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error: any) {
    // Log error securely (don't expose to client)
    console.error('Mint queue processing error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    // Layer 10: Error Masking (generic error message)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        processed: 0
      },
      { 
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}

/**
 * GET /api/cron/process-mint-queue
 * 
 * Method not allowed - only POST is supported
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST to trigger mint worker'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST'
      }
    }
  )
}
