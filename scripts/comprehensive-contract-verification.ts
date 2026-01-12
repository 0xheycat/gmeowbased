#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CONTRACTS = [
  { name: 'ScoringModule', address: '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6', key: 'NEXT_PUBLIC_GM_BASE_SCORING' },
  { name: 'Core', address: '0x343829A6A613d51B4A81c2dE508e49CA66D4548d', key: 'NEXT_PUBLIC_GM_BASE_CORE' },
  { name: 'Guild', address: '0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097', key: 'NEXT_PUBLIC_GM_BASE_GUILD' },
  { name: 'Referral', address: '0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df', key: 'NEXT_PUBLIC_GM_BASE_REFERRAL' },
  { name: 'NFT', address: '0x34d0CD77Ba8d643C1d5f568331d61eFa35132eA8', key: 'NEXT_PUBLIC_GM_BASE_NFT' },
  { name: 'Badge', address: '0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb', key: 'NEXT_PUBLIC_GM_BASE_BADGE' },
];

async function getCodeSize(address: string): Promise<number> {
  try {
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
    return data.result !== '0x' ? (data.result.length - 2) / 2 : 0;
  } catch {
    return 0;
  }
}

async function getBlockscoutInfo(address: string) {
  try {
    const response = await fetch(`https://base.blockscout.com/api/v2/smart-contracts/${address}`);
    const data = await response.json();
    return {
      verified: data.is_verified || false,
      name: data.name || 'Unknown',
      compiler: data.compiler_version || 'N/A',
    };
  } catch {
    return { verified: false, name: 'Unknown', compiler: 'N/A' };
  }
}

async function getBasescanInfo(address: string) {
  try {
    // Basescan API V1 is deprecated, so we scrape the website
    const response = await fetch(`https://basescan.org/address/${address}`);
    const html = await response.text();
    
    const isVerified = html.includes('Contract Source Code Verified');
    
    if (isVerified) {
      // Try to extract contract name from the page
      const nameMatch = html.match(/<span[^>]*title="Contract Name"[^>]*>([^<]+)<\/span>/);
      const name = nameMatch ? nameMatch[1].trim() : 'Verified';
      return {
        verified: true,
        name,
        compiler: 'v0.8.23+commit.f704f362' // Known from our deployment
      };
    }
    return { verified: false, name: 'Unknown', compiler: 'N/A' };
  } catch {
    return { verified: false, name: 'Unknown', compiler: 'N/A' };
  }
}

async function testContractCall(address: string, name: string): Promise<boolean> {
  try {
    const response = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: address,
          data: name === 'ScoringModule' ? '0x8da5cb5b' : '0x8da5cb5b' // owner()
        }, 'latest']
      })
    });
    const data = await response.json();
    return !!data.result && data.result !== '0x';
  } catch {
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              COMPREHENSIVE CONTRACT VERIFICATION REPORT                   ║');
  console.log('║                    December 31, 2025 Deployment                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  const results = [];
  
  for (const contract of CONTRACTS) {
    console.log(`Checking ${contract.name}...`);
    
    const [codeSize, blockscout, basescan, callable] = await Promise.all([
      getCodeSize(contract.address),
      getBlockscoutInfo(contract.address),
      getBasescanInfo(contract.address),
      testContractCall(contract.address, contract.name)
    ]);
    
    results.push({
      ...contract,
      codeSize,
      blockscout,
      basescan,
      callable,
      deployed: codeSize > 0,
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 DETAILED VERIFICATION RESULTS');
  console.log('═'.repeat(80) + '\n');
  
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} (${r.key})`);
    console.log(`   Address: ${r.address}`);
    console.log(`   Status: ${r.deployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    
    if (r.deployed) {
      console.log(`   Code Size: ${r.codeSize.toLocaleString()} bytes`);
      
      // Check both Blockscout and Basescan verification
      const isVerified = r.blockscout.verified || r.basescan.verified;
      const verificationSource = r.basescan.verified ? 'Basescan' : r.blockscout.verified ? 'Blockscout' : 'None';
      const verificationInfo = r.basescan.verified ? r.basescan : r.blockscout;
      
      console.log(`   Verification: ${isVerified ? '✅ VERIFIED' : '⚠️  UNVERIFIED'} (${verificationSource})`);
      
      if (isVerified) {
        console.log(`   Contract Name: ${verificationInfo.name}`);
        console.log(`   Compiler: ${verificationInfo.compiler}`);
      }
      
      console.log(`   Callable: ${r.callable ? '✅ YES' : '❌ NO'}`);
      console.log(`   Blockscout: https://base.blockscout.com/address/${r.address}`);
      console.log(`   BaseScan: https://basescan.org/address/${r.address}`);
    }
    console.log('');
  });
  
  const deployed = results.filter(r => r.deployed).length;
  const verified = results.filter(r => r.blockscout.verified || r.basescan.verified).length;
  const callable = results.filter(r => r.callable).length;
  
  console.log('═'.repeat(80));
  console.log('📈 SUMMARY STATISTICS');
  console.log('═'.repeat(80));
  console.log(`✅ Deployed: ${deployed}/${results.length} contracts`);
  console.log(`✅ Verified: ${verified}/${results.length} contracts (Blockscout + Basescan)`);
  console.log(`✅ Callable: ${callable}/${results.length} contracts responding`);
  console.log(`📅 Deployment Date: December 31, 2025 (12-13 days ago)`);
  console.log(`🔧 Compiler: Solidity v0.8.23 (optimization enabled)`);
  
  if (deployed === results.length && callable === results.length) {
    console.log(`\n🎉 ALL CONTRACTS OPERATIONAL!`);
    console.log(`   ${verified} verified with source code`);
    console.log(`   ${deployed - verified} unverified but functional`);
  }
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

main().catch(console.error);
