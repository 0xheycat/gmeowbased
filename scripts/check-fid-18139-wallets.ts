import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkUser() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Update bot FID 1069798 with oracle custody address
  console.log('Updating bot FID 1069798 with oracle custody address...')
  const { error: botError } = await supabase
    .from('user_profiles')
    .upsert({
      fid: 1069798,
      wallet_address: '0x4b0c55b534cb3388b43ad6b0e0dbe1e6e63ac6da',
      custody_address: '0x8870c155666809609176260f2b65a626c000d773', // Oracle wallet
      verified_addresses: ['0x4b0c55b534cb3388b43ad6b0e0dbe1e6e63ac6da']
    }, { onConflict: 'fid' })
  
  if (botError) console.error('Bot update error:', botError)
  else console.log('✅ Bot FID updated\n')

  console.log('Updating FID 18139 with CORRECT wallets from Neynar...')
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      wallet_address: '0x7539472dad6a371e6e152c5a203469aa32314130', // Primary
      custody_address: '0x7539472dad6a371e6e152c5a203469aa32314130', // Custody
      verified_addresses: [
        '0x7539472dad6a371e6e152c5a203469aa32314130',
        '0x8a3094e44577579d6f41f6214a86c250b7dbdc4e',
        '0x07fc7eb1ffe44bed46eae308c469a9b66ba7301f'
      ]
    })
    .eq('fid', 18139)

  if (updateError) {
    console.error('Update error:', updateError)
    return
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('fid, wallet_address, custody_address, verified_addresses')
    .eq('fid', 18139)
    .single()

  console.log('\nFID 18139 All Wallets:')
  console.log('='.repeat(80))
  if (data) {
    console.log(`Primary:   ${data.wallet_address}`)
    console.log(`Custody:   ${data.custody_address || '(none)'}`)
    console.log(`Verified:  ${data.verified_addresses ? JSON.stringify(data.verified_addresses, null, 2) : '(none)'}`)
    console.log(`\nTotal wallets: ${[data.wallet_address, data.custody_address, ...(data.verified_addresses || [])].filter(Boolean).length}`)
  }
  if (error) console.error('Error:', error)
}

checkUser()
