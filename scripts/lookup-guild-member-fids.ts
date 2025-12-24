/**
 * Lookup FIDs for actual guild members from on-chain data
 * Direct Neynar API call (standalone script)
 */

const GUILD_MEMBERS = [
  '0x8870C155666809609176260F2B65a626C000D773', // Guild leader (from createGuild event)
  '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e', // Member (from joinGuild event)
]

async function fetchFidByAddress(address: string): Promise<number | null> {
  const apiKey = process.env.NEYNAR_API_KEY || process.env.NEYNAR_GLOBAL_API
  if (!apiKey) {
    throw new Error('NEYNAR_API_KEY not set')
  }

  const addr = address.toLowerCase()
  
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addr}&address_types=custody_address,verified_address`,
      {
        headers: { 'api_key': apiKey }
      }
    )

    if (!response.ok) {
      console.warn(`API error ${response.status}: ${await response.text()}`)
      return null
    }

    const data = await response.json()
    const users = data[addr]
    
    if (Array.isArray(users) && users.length > 0) {
      return users[0].fid
    }

    return null
  } catch (error) {
    console.warn('Error looking up FID:', error)
    return null
  }
}

async function main() {
  console.log('🔍 Looking up FIDs for guild members (from on-chain events)...\n')

  for (const address of GUILD_MEMBERS) {
    console.log(`Address: ${address}`)
    
    try {
      const fid = await fetchFidByAddress(address)
      
      if (fid) {
        console.log(`✅ FID: ${fid}\n`)
      } else {
        console.log(`❌ No Farcaster account found\n`)
      }
    } catch (error) {
      console.error(`❌ Error: ${error}\n`)
    }
  }
}

main().catch(console.error)
