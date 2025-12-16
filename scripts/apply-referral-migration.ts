/**
 * Apply Referral System Database Migration
 * 
 * Purpose: Creates referral_stats, referral_activity, and referral_registrations tables
 * Usage: tsx scripts/apply-referral-migration.ts
 * 
 * This script executes raw SQL via Supabase PostgREST API
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌')
  process.exit(1)
}

async function executeSql(sql: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return response
}

async function verifyTable(tableName: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  })

  return response.ok
}

async function applyMigration() {
  console.log('🚀 Starting referral system migration...\n')
  console.log('📋 Database:', SUPABASE_URL)
  console.log('🔑 Using service role key (length:', SUPABASE_SERVICE_KEY.length, 'chars)\n')

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20251211000000_create_referral_system.sql')
    const fullSql = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📏 SQL length:', fullSql.length, 'bytes\n')

    // Execute the full SQL as a transaction
    console.log('🔧 Executing migration...\n')
    
    try {
      // Try via PostgREST if available
      await executeSql(fullSql)
      console.log('✅ Migration executed via PostgREST\n')
    } catch (error: any) {
      console.log('⚠️  PostgREST execution failed, trying direct table creation...\n')
      console.error('   Error:', error.message, '\n')
      
      // Fallback: Use Supabase client to create tables via standard SQL
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      
      // Execute each CREATE TABLE separately
      const createStatements = fullSql.match(/CREATE TABLE[^;]+;/gs) || []
      console.log('   Found', createStatements.length, 'CREATE TABLE statements\n')
      
      for (const stmt of createStatements) {
        const tableName = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1]
        console.log(`   Creating table: ${tableName}...`)
        
        const { error } = await supabase.rpc('exec_sql', { sql: stmt })
        if (error) {
          console.log(`   ⚠️  Skipping (may already exist): ${error.message}`)
        } else {
          console.log(`   ✅ Created: ${tableName}`)
        }
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying tables...\n')
    
    const tables = ['referral_stats', 'referral_activity', 'referral_registrations']
    let createdCount = 0

    for (const table of tables) {
      const exists = await verifyTable(table)
      
      if (exists) {
        console.log(`✅ Table '${table}' exists and is accessible`)
        createdCount++
      } else {
        console.error(`❌ Table '${table}' not found or not accessible`)
      }
    }

    console.log('\n' + '='.repeat(60))
    if (createdCount === tables.length) {
      console.log('🎉 SUCCESS! All 3 referral tables created successfully!')
      console.log('='.repeat(60) + '\n')
      
      console.log('✨ Next steps:')
      console.log('   1. Restart dev server: pnpm dev')
      console.log('   2. Test API: http://localhost:3000/api/referral/leaderboard')
      console.log('   3. Check browser console for errors')
      console.log('   4. Update REFERRAL-SYSTEM-FIX-PLAN.md')
      
      return true
    } else {
      console.log('⚠️  WARNING: Only', createdCount, 'of', tables.length, 'tables verified')
      console.log('='.repeat(60) + '\n')
      console.log('Manual verification required. Check Supabase dashboard:')
      console.log(SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/'))
      
      return false
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.stack) {
      console.error('\nStack:', error.stack)
    }
    return false
  }
}

// Run migration
applyMigration()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
