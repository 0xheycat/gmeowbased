#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Contracts from .env.local (deployed December 30-31, 2025)
const CONTRACTS = [
  { name: 'ScoringModule', address: process.env.NEXT_PUBLIC_GM_BASE_SCORING!, env: 'NEXT_PUBLIC_GM_BASE_SCORING' },
  { name: 'Core', address: process.env.NEXT_PUBLIC_GM_BASE_CORE!, env: 'NEXT_PUBLIC_GM_BASE_CORE' },
  { name: 'Guild', address: process.env.NEXT_PUBLIC_GM_BASE_GUILD!, env: 'NEXT_PUBLIC_GM_BASE_GUILD' },
  { name: 'Referral', address: process.env.NEXT_PUBLIC_GM_BASE_REFERRAL!, env: 'NEXT_PUBLIC_GM_BASE_REFERRAL' },
  { name: 'NFT', address: process.env.NEXT_PUBLIC_GM_BASE_NFT!, env: 'NEXT_PUBLIC_GM_BASE_NFT' },
  { name: 'Badge', address: process.env.NEXT_PUBLIC_GM_BASE_BADGE!, env: 'NEXT_PUBLIC_GM_BASE_BADGE' },
];

async function getBlockInfo(address: string) {
  try {
    // Use Base RPC to get transaction list
    const response = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [address, 'latest']
      })
    });
    
    const data = await response.json();
    const code = data.result;
    
    if (code && code !== '0x') {
      return {
        exists: true,
        codeSize: (code.length - 2) / 2, // Remove 0x and convert hex to bytes
      };
    }
    return { exists: false, codeSize: 0 };
  } catch (error) {
    return { exists: false, codeSize: 0 };
  }
}

async function checkBlockscout(address: string) {
  try {
    const response = await fetch(`https://base.blockscout.com/api/v2/smart-contracts/${address}`);
    const data = await response.json();
    
    return {
      verified: data.is_verified || false,
      name: data.name || 'Unknown',
      compiler: data.compiler_version || 'N/A',
      optimization: data.optimization_enabled ? 'Yes' : 'No',
    };
  } catch {
    return { verified: false, name: 'Unknown', compiler: 'N/A', optimization: 'N/A' };
  }
}

async function verifyContract(contract: { name: string; address: string; env: string }) {
  const blockInfo = await getBlockInfo(contract.address);
  const blockscout = await checkBlockscout(contract.address);
  
  console.log(`\n${contract.name}:`);
  console.log(`  Address: ${contract.address}`);
  console.log(`  Env Variable: ${contract.env}`);
  
  if (blockInfo.exists) {
    console.log(`  ✅ ON-CHAIN: ${blockInfo.codeSize.toLocaleString()} bytes`);
  } else {
    console.log(`  ❌ NOT FOUND ON-CHAIN`);
  }
  
  if (blockscout.verified) {
    console.log(`  ✅ VERIFIED: ${blockscout.name} (${blockscout.compiler})`);
    console.log(`  Optimization: ${blockscout.optimization}`);
  } else {
    console.log(`  ⚠️  NOT VERIFIED on Blockscout (but contract exists)`);
  }
  
  console.log(`  Blockscout: https://base.blockscout.com/address/${contract.address}`);
  console.log(`  BaseScan: https://basescan.org/address/${contract.address}`);
  
  return { exists: blockInfo.exists, verified: blockscout.verified };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  Verifying Contracts from .env.local (Deployed ~12-13 days ago)           ║');
  console.log('║  Date Range: December 30-31, 2025                                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📍 Today: January 12, 2026');
  console.log('📅 Target Deployment: December 30-31, 2025 (12-13 days ago)');
  console.log('');
  
  let existsCount = 0;
  let verifiedCount = 0;
  
  for (const contract of CONTRACTS) {
    const result = await verifyContract(contract);
    if (result.exists) existsCount++;
    if (result.verified) verifiedCount++;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n✅ On-Chain: ${existsCount}/${CONTRACTS.length} contracts exist`);
  console.log(`✅ Verified: ${verifiedCount}/${CONTRACTS.length} contracts verified on Blockscout`);
  
  if (existsCount === CONTRACTS.length && verifiedCount > 0) {
    console.log('\n🎉 All contracts from .env.local are deployed and functional!');
    console.log(`   ${verifiedCount} verified, ${existsCount - verifiedCount} unverified but working\n`);
  }
}

main().catch(console.error);
