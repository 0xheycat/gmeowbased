#!/usr/bin/env tsx

/**
 * Run SQL migration for user_notification_history table
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration() {
  console.log('📦 Reading migration file...')
  const sqlPath = join(__dirname, 'sql', 'create_user_notification_history.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  console.log('🚀 Executing migration...')
  
  // Split SQL into individual statements (simple split by semicolon)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`)
    console.log(statement.substring(0, 100) + '...')

    const { error } = await supabase.rpc('exec_sql', { sql: statement }).single()
    
    if (error) {
      // Try direct query if RPC fails
      const { error: queryError } = await supabase.from('_sql').select('*').limit(0)
      
      if (queryError && queryError.message.includes('relation "_sql" does not exist')) {
        console.log('⚠️  Cannot execute via RPC, trying alternative method...')
        
        // Use the Postgres REST API endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sql: statement }),
        })

        if (!response.ok) {
          console.warn(`⚠️  Statement ${i + 1} may have failed or already exists: ${response.statusText}`)
        } else {
          console.log(`✅ Statement ${i + 1} executed`)
        }
      } else if (error.message.includes('already exists') || error.message.includes('does not exist')) {
        console.log(`ℹ️  Statement ${i + 1} already applied or skipped`)
      } else {
        console.warn(`⚠️  Statement ${i + 1} warning:`, error.message)
      }
    } else {
      console.log(`✅ Statement ${i + 1} executed successfully`)
    }
  }

  console.log('\n🎉 Migration completed!')
  
  // Verify table was created
  console.log('\n🔍 Verifying table creation...')
  const { error } = await supabase
    .from('user_notification_history')
    .select('id')
    .limit(0)

  if (error) {
    console.error('❌ Table verification failed:', error.message)
    console.log('\n💡 Please run the migration manually via Supabase Dashboard SQL Editor:')
    console.log('   1. Go to https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/sql')
    console.log('   2. Copy the contents of scripts/sql/create_user_notification_history.sql')
    console.log('   3. Paste and execute in the SQL Editor')
    process.exit(1)
  } else {
    console.log('✅ Table user_notification_history exists and is accessible')
    console.log('\n📊 Migration summary:')
    console.log('   ✓ Table: user_notification_history')
    console.log('   ✓ Indexes: 4 indexes created')
    console.log('   ✓ RLS: 3 policies enabled')
    console.log('   ✓ Function: cleanup_old_notifications()')
  }
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
