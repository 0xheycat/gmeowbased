#!/usr/bin/env tsx
/**
 * Complete Database Verification
 * Checks all Subsquid database tables for oracle data
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import pg from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

const ORACLE = '0x8870c155666809609176260f2b65a626c000d773'

// Database connection from Subsquid
const DB_CONFIG = {
  host: 'localhost',
  port: 23798,
  database: 'squid',
  user: 'postgres',
  password: 'postgres'
}

interface TableCheck {
  table: string
  count: number
  hasOracleData: boolean
  sampleData?: any
}

async function main() {
  console.log('🔍 Complete Database Verification')
  console.log('═'.repeat(80))
  console.log(`Oracle: ${ORACLE}`)
  console.log()
  
  const client = new pg.Client(DB_CONFIG)
  await client.connect()
  
  const results: TableCheck[] = []
  
  // Check all tables
  const tables = [
    { name: 'user', oracleField: 'id' },
    { name: 'gm_event', oracleField: 'user_id' },
    { name: 'guild', oracleField: 'owner' },
    { name: 'guild_member', oracleField: 'user_id' },
    { name: 'badge_mint', oracleField: 'user_id' },
    { name: 'referral_code', oracleField: 'owner' },
    { name: 'referral_use', oracleField: 'user_id' },
    { name: 'nft_mint', oracleField: 'user_id' },
    { name: 'nft_transfer', oracleField: 'to' }
  ]
  
  for (const { name, oracleField } of tables) {
    try {
      // Get total count
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${name}"`)
      const totalCount = parseInt(countRes.rows[0].count)
      
      // Check for oracle data
      const oracleRes = await client.query(
        `SELECT * FROM "${name}" WHERE ${oracleField} = $1 LIMIT 1`,
        [ORACLE]
      )
      
      const hasOracleData = oracleRes.rows.length > 0
      
      results.push({
        table: name,
        count: totalCount,
        hasOracleData,
        sampleData: hasOracleData ? oracleRes.rows[0] : null
      })
      
      const icon = hasOracleData ? '✅' : totalCount > 0 ? '⚠️ ' : '❌'
      console.log(`${icon} ${name.padEnd(20)} Total: ${totalCount.toString().padStart(4)} | Oracle: ${hasOracleData ? 'YES' : 'NO'}`)
      
      if (hasOracleData && oracleRes.rows[0]) {
        const sample = oracleRes.rows[0]
        if (name === 'user') {
          console.log(`   User: streak=${sample.current_streak}, gms=${sample.lifetime_gms}, xp=${sample.total_xp}`)
        } else if (name === 'gm_event') {
          console.log(`   GM: xp=${sample.xp_awarded}, day=${sample.streak_day}, block=${sample.block_number}`)
        } else if (name === 'referral_code') {
          console.log(`   Code: ${sample.id}, uses=${sample.total_uses}, rewards=${sample.total_rewards}`)
        } else if (name === 'guild') {
          console.log(`   Guild: #${sample.id}, members=${sample.total_members}, points=${sample.total_points}`)
        } else if (name === 'guild_member') {
          console.log(`   Member: guild=${sample.guild_id}, role=${sample.role}`)
        } else if (name === 'badge_mint') {
          console.log(`   Badge: type=${sample.badge_type}, token=${sample.token_id}`)
        }
      }
      
    } catch (error: any) {
      console.log(`❌ ${name.padEnd(20)} Error: ${error.message}`)
      results.push({
        table: name,
        count: 0,
        hasOracleData: false
      })
    }
  }
  
  await client.end()
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // Summary
  const totalTables = results.length
  const tablesWithData = results.filter(r => r.count > 0).length
  const tablesWithOracle = results.filter(r => r.hasOracleData).length
  
  console.log('📊 Summary:')
  console.log(`  Total tables: ${totalTables}`)
  console.log(`  Tables with data: ${tablesWithData}`)
  console.log(`  Tables with oracle data: ${tablesWithOracle}`)
  console.log()
  
  // Critical tables check
  const criticalTables = ['user', 'gm_event', 'referral_code']
  const criticalPass = criticalTables.every(t => 
    results.find(r => r.table === t)?.hasOracleData
  )
  
  if (criticalPass) {
    console.log('🎉 All critical tables verified!')
    console.log('   ✅ User profile')
    console.log('   ✅ GM events')
    console.log('   ✅ Referral codes')
  } else {
    console.log('⚠️  Some critical tables missing oracle data')
  }
  
  console.log()
  
  // Tables we expect to have oracle data
  const expectedTables = ['user', 'gm_event', 'guild', 'guild_member', 'badge_mint', 'referral_code']
  const missingTables = expectedTables.filter(t => 
    !results.find(r => r.table === t)?.hasOracleData
  )
  
  if (missingTables.length > 0) {
    console.log('📋 Missing oracle data in:')
    missingTables.forEach(t => console.log(`   - ${t}`))
    console.log()
  }
  
  // NFT and referral_use are optional (oracle hasn't done these actions yet)
  const optionalTables = results.filter(r => 
    ['nft_mint', 'nft_transfer', 'referral_use'].includes(r.table)
  )
  
  if (optionalTables.some(t => !t.hasOracleData)) {
    console.log('ℹ️  Optional tables (no oracle activity yet):')
    optionalTables.filter(t => !t.hasOracleData).forEach(t => {
      console.log(`   - ${t.table}`)
    })
    console.log()
  }
}

main().catch(error => {
  console.error('💥 Error:', error.message)
  process.exit(1)
})
