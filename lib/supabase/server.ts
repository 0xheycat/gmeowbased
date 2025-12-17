/**
 * Supabase Server Client
 * Server-side Supabase client for API routes
 * 
 * Source: lib/supabase-server.ts → lib/supabase/client.ts
 * Date: December 17, 2025
 */

import { getSupabaseServerClient } from './client'

// Export standard createClient function for API routes
export function createClient() {
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error('Supabase not configured')
  }
  return client
}
