#!/usr/bin/env node

/**
 * Run SQL migration using direct Postgres connection
 * Install: npm install pg
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

// Extract project ref from URL: https://bgnerptdanbgvcjentbt.supabase.co
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Invalid SUPABASE_URL format')
  process.exit(1)
}

// Construct direct Postgres connection string
// Try direct database connection
const connectionString = `postgresql://postgres.${projectRef}:${supabaseKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: false,
  })

  try {
    console.log('🔌 Connecting to Supabase Postgres...')
    await client.connect()
    console.log('✅ Connected!')

    console.log('\n📦 Reading migration file...')
    const sqlPath = join(__dirname, 'sql', 'create_user_notification_history.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('🚀 Executing migration...\n')
    
    await client.query(sqlContent)
    
    console.log('✅ Migration executed successfully!')
    console.log('\n📊 Migration summary:')
    console.log('   ✓ Table: user_notification_history')
    console.log('   ✓ Indexes: 4 indexes created')
    console.log('   ✓ RLS: 3 policies enabled')
    console.log('   ✓ Function: cleanup_old_notifications()')
    
    // Verify table creation
    console.log('\n🔍 Verifying table...')
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_notification_history'
      ORDER BY ordinal_position
    `)
    
    console.log(`✅ Table has ${verifyResult.rows.length} columns:`)
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`)
    })

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message)
    console.log('\n💡 Manual migration instructions:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/sql')
    console.log('   2. Copy contents of: scripts/sql/create_user_notification_history.sql')
    console.log('   3. Paste and run in SQL Editor')
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
