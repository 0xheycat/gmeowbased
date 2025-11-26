#!/usr/bin/env node
/**
 * Check user's Neynar score and wallet address
 * Usage: npx tsx scripts/check-user-score.ts
 */

import { fetchUserByFid } from '@/lib/neynar'

async function checkUser(fid: number) {
  console.log(`\n🔍 Checking user FID ${fid}...`)
  
  try {
    const user = await fetchUserByFid(fid)
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('\n✅ User found:')
    console.log(`  Username: @${user.username}`)
    console.log(`  Display Name: ${user.displayName}`)
    console.log(`  FID: ${user.fid}`)
    console.log(`  Neynar Score: ${user.neynarScore ?? 'unknown'}`)
    console.log(`  Verifications:`, user.verifications)
    console.log(`  Custody Address:`, user.custodyAddress)
    console.log(`  Wallet Address:`, user.walletAddress)
    
    // Check if meets bot requirements
    const minScore = 0.5
    const hasSufficientScore = user.neynarScore != null && user.neynarScore >= minScore
    const hasWallet = user.verifications && user.verifications.length > 0
    
    console.log('\n🤖 Bot Interaction Requirements:')
    console.log(`  Min Score (0.5): ${hasSufficientScore ? '✅' : '❌'} ${user.neynarScore ?? 'N/A'}`)
    console.log(`  Has Wallet: ${hasWallet ? '✅' : '❌'}`)
    console.log(`  Can Interact: ${hasSufficientScore && hasWallet ? '✅ YES' : '❌ NO'}`)
    
    if (!hasSufficientScore) {
      console.log(`\n⚠️  Score too low. Need ${minScore}+ to interact with bot.`)
      console.log('   Build score by casting & engaging on Farcaster.')
    }
    
    if (!hasWallet) {
      console.log('\n⚠️  No verified wallet found.')
      console.log('   Connect a wallet at https://warpcast.com/~/settings/verified-addresses')
    }
    
  } catch (error) {
    console.error('❌ Error fetching user:', error)
  }
}

async function main() {
  console.log('🤖 Gmeowbased Bot - User Score Checker')
  console.log('=====================================')
  
  // Check @heycat
  await checkUser(18139)
  
  console.log('\n' + '='.repeat(60))
}

main().catch(console.error)
