/**
 * Test Blockscout Contract Deployments (Direct API call, no server needed)
 * 
 * Verifies: Blockscout API returns accurate contract deployment count
 */

const TEST_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const TEST_CHAIN = 'base'

async function testBlockscoutContractDeployments() {
  console.log('🧪 Testing Blockscout Contract Deployments API')
  console.log('=' .repeat(70))
  console.log(`Address: ${TEST_ADDRESS}`)
  console.log(`Chain: ${TEST_CHAIN}`)
  console.log('='.repeat(70))
  console.log('')

  try {
    // Call Blockscout API with pagination (same as our route does)
    console.log('📡 Fetching transactions from Blockscout (with pagination)...')
    
    let allContractCreations: any[] = []
    let nextPageUrl: string | null = `https://base.blockscout.com/api/v2/addresses/${TEST_ADDRESS}/transactions`
    let pageCount = 0
    const maxPages = 5 // Limit to 5 pages (250 transactions)
    
    while (nextPageUrl && pageCount < maxPages) {
      const response = await fetch(nextPageUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Blockscout API error: ${response.status}`)
      }

      const data = await response.json()
      
      console.log(`📊 Page ${pageCount + 1}: ${data.items?.length || 0} transactions`)
      
      // Debug: Show first transaction structure
      if (pageCount === 0 && data.items?.[0]) {
        console.log(`🔍 Sample transaction structure:`)
        console.log(`   Type: ${data.items[0].type}`)
        console.log(`   To: ${data.items[0].to ? 'exists' : 'NULL'}`)
        console.log(`   Result: ${data.items[0].result}`)
      }
      
      // Filter contract creations from this page
      // Contract creation = "to" is null
      const contractCreations = (data.items || []).filter(
        (tx: any) => {
          const isContractCreation = tx.to === null || tx.to === undefined
          const fromAddress = typeof tx.from === 'string' ? tx.from : tx.from?.hash
          const isFrom = fromAddress?.toLowerCase() === TEST_ADDRESS.toLowerCase()
          
          if (isContractCreation && isFrom) {
            console.log(`   ✅ Found contract creation: ${tx.hash}`)
            console.log(`      Created: ${tx.created_contract?.hash || 'Unknown'}`)
            console.log(`      Name: ${tx.created_contract?.name || 'Unnamed'}`)
          }
          
          return isContractCreation && isFrom
        }
      )
      
      if (contractCreations.length > 0) {
        console.log(`   ✅ Found ${contractCreations.length} contract creations on this page`)
      }
      
      allContractCreations.push(...contractCreations)
      
      // Check if there's a next page
      nextPageUrl = data.next_page_params ? 
        `https://base.blockscout.com/api/v2/addresses/${TEST_ADDRESS}/transactions?${new URLSearchParams(data.next_page_params).toString()}` :
        null
      
      pageCount++
      
      // Stop if we found some contracts and no more pages
      if (allContractCreations.length > 0 && !nextPageUrl) {
        break
      }
    }
    
    const contractCreations = allContractCreations

    console.log(`✅ Found ${contractCreations.length} contract deployments:\n`)

    contractCreations.forEach((tx: any, index: number) => {
      console.log(`   ${index + 1}. ${tx.created_contract?.name || 'Unnamed'}`)
      console.log(`      Address: ${tx.created_contract?.hash}`)
      console.log(`      TX: ${tx.hash}`)
      console.log(`      Timestamp: ${tx.timestamp}`)
      console.log(`      Verified: ${tx.created_contract?.is_verified ? 'Yes' : 'No'}`)
      console.log('')
    })

    console.log('=' .repeat(70))
    console.log(`✅ Total: ${contractCreations.length} contracts deployed`)
    console.log('=' .repeat(70))

    return contractCreations.length
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testBlockscoutContractDeployments().then(count => {
  console.log(`\n✅ Test passed: Found ${count} contract deployments`)
  process.exit(0)
})
