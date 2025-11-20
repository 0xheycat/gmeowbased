import { getSupabaseServerClient } from '../lib/supabase-server.js'

const fid = 18139

const supabase = getSupabaseServerClient()
if (!supabase) {
  console.error('Supabase not configured')
  process.exit(1)
}

const { data, error } = await supabase
  .from('mint_queue')
  .select('*')
  .eq('fid', fid)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error:', error)
} else if (!data || data.length === 0) {
  console.log('No entries in mint queue')
} else {
  console.log('Mint queue entries:')
  data.forEach((m, i) => {
    console.log(`\n${i+1}. Badge: ${m.badge_type}`)
    console.log(`   Status: ${m.status}`)
    console.log(`   Created: ${m.created_at}`)
    console.log(`   Error: ${m.error || 'N/A'}`)
  })
}
