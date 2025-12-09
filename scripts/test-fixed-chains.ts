#!/usr/bin/env tsx
/**
 * Test the fixed Blockscout chains (Base and Arbitrum)
 * With proper error handling and rate limit delays
 */

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const BASE_URL = 'http://localhost:3001'

// Expected from BLOCKSCOUT-PERFECT-SOLUTION.md
const EXPECTED_STATS = {
  accountAgeDays: 644, // TRUE age
  totalVolume: '10.0020', // EXACT volume
  contractsDeployed: 15, // REAL count
}

interface TestResult {
  chain: string
  success: boolean
  dataSource?: string
  hasBasicStats?: boolean
  hasRichStats?: boolean
  hasScores?: boolean
  error?: string
  stats?: any
}

async function testChain(chain: string, delay: number = 0): Promise<TestResult> {
  // Add delay to avoid rate limits
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000) // 20 second timeout

    const response = await fetch(
      `${BASE_URL}/api/onchain-stats/${chain}?address=${TEST_ADDRESS}`,
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        chain,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const result = await response.json()
    const data = result?.data

    if (!data) {
      return {
        chain,
        success: false,
        error: 'No data returned',
      }
    }

    const hasBasicStats =
      typeof data.balance !== 'undefined' &&
      typeof data.nonce !== 'undefined' &&
      typeof data.accountAgeDays !== 'undefined'

    const hasRichStats =
      typeof data.totalTxs !== 'undefined' &&
      typeof data.uniqueContracts !== 'undefined'

    const hasScores =
      typeof data.talentScore !== 'undefined' ||
      typeof data.neynarScore !== 'undefined'

    return {
      chain,
      success: true,
      dataSource: data.dataSource,
      hasBasicStats,
      hasRichStats,
      hasScores,
      stats: {
        accountAgeDays: data.accountAgeDays,
        totalVolume: data.totalVolume,
        contractsDeployed: data.contractsDeployed,
        totalTxs: data.totalTxs,
        uniqueContracts: data.uniqueContracts,
        talentScore: data.talentScore,
        neynarScore: data.neynarScore,
      },
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        chain,
        success: false,
        error: 'Timeout (20s)',
      }
    }
    return {
      chain,
      success: false,
      error: error.message,
    }
  }
}

async function main() {
  console.log('\n🧪 Testing Fixed Blockscout Chains\n')
  console.log(`Test Address: ${TEST_ADDRESS}`)
  console.log(`Expected: ${EXPECTED_STATS.accountAgeDays} days, ${EXPECTED_STATS.totalVolume} ETH, ${EXPECTED_STATS.contractsDeployed} contracts\n`)

  const chains = [
    { name: 'base', delay: 0 },
    { name: 'arbitrum', delay: 2000 }, // 2 second delay to avoid rate limits
    { name: 'ethereum', delay: 4000 }, // 4 second delay
    { name: 'optimism', delay: 6000 }, // 6 second delay
    { name: 'celo', delay: 8000 }, // 8 second delay
  ]

  const results: TestResult[] = []

  for (const { name, delay } of chains) {
    process.stdout.write(`Testing ${name}...`)
    const result = await testChain(name, delay)
    results.push(result)

    if (result.success) {
      const icon = result.dataSource === 'blockscout' ? '✅' : '⚠️'
      const basicIcon = result.hasBasicStats ? '✅' : '❌'
      const richIcon = result.hasRichStats ? '✅' : '❌'
      const scoresIcon = result.hasScores ? '✅' : '⚠️'

      console.log(` ${icon} ${result.dataSource} | ${basicIcon} basic | ${richIcon} rich | ${scoresIcon} scores`)

      if (result.stats) {
        console.log(`   └─ Age: ${result.stats.accountAgeDays} days, Volume: ${result.stats.totalVolume} ETH, Contracts: ${result.stats.contractsDeployed}`)
        if (result.stats.totalTxs) {
          console.log(`   └─ Txs: ${result.stats.totalTxs}, Unique Contracts: ${result.stats.uniqueContracts}`)
        }
        if (result.stats.talentScore || result.stats.neynarScore) {
          console.log(`   └─ Talent: ${result.stats.talentScore || 'N/A'}, Neynar: ${result.stats.neynarScore || 'N/A'}`)
        }
      }
    } else {
      console.log(` ❌ ${result.error}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter((r) => r.success)
  const blockscoutChains = successful.filter((r) => r.dataSource === 'blockscout')
  const withRichStats = successful.filter((r) => r.hasRichStats)
  const withScores = successful.filter((r) => r.hasScores)

  console.log(`Total Chains: ${chains.length}`)
  console.log(`Success: ${successful.length}/${chains.length} (${Math.round((successful.length / chains.length) * 100)}%)`)
  console.log(`Using Blockscout: ${blockscoutChains.length}/${chains.length}`)
  console.log(`With Rich Stats: ${withRichStats.length}/${chains.length}`)
  console.log(`With Scores: ${withScores.length}/${chains.length}`)

  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    console.log(`\nFailed Chains: ${failed.map((r) => r.chain).join(', ')}`)
    console.log('\n❌ SOME TESTS FAILED')
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED')
  }
}

main().catch(console.error)
