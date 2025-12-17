#!/usr/bin/env tsx
import { config } from 'dotenv'

config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard-sync'

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase environment variables are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    throw new Error('Failed to initialise Supabase client')
  }

  const result = await syncSupabaseLeaderboard({ supabase, logger: console })

  console.info('🎉 Supabase leaderboard sync finished at %s', result.updatedAtIso)
  console.info('   Global rows: %d', result.globalRows)
  for (const [chain, count] of Object.entries(result.perChain)) {
    console.info('   %s rows: %d', chain, count as number)
  }
  console.info('   Total rows: %d', result.totalRows)
}

main().catch(err => {
  console.error('Supabase leaderboard sync failed:', err)
  process.exitCode = 1
})
