/**
 * Supabase Server Client
 * Server-side Supabase client for API routes
 * 
 * Source: lib/supabase-server.ts (existing pattern)
 * Date: December 9, 2025
 */

import { getSupabaseServerClient } from '../supabase-server'

// Export standard createClient function for API routes
export function createClient() {
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error('Supabase not configured')
  }
  return client
}
