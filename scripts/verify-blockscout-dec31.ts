#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Contracts deployed on December 31, 2025
const CONTRACTS = [
  { name: 'ScoringModule', address: '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6', block: 40193345 },
  { name: 'Core', address: '0x343829A6A613d51B4A81c2dE508e49CA66D4548d', block: 40193395 },
  { name: 'Guild', address: '0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097', block: 40218430 },
  { name: 'Referral', address: '0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df', block: 40193500 },
  { name: 'NFT', address: '0x34d0CD77Ba8d643C1d5f568331d61eFa35132eA8', block: 40219320 },
  { name: 'Badge', address: '0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb', block: 40193500 },
];

async function verifyBlockscout(address: string) {
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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  December 31, 2025 Deployment Verification - Base Mainnet                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Contract Verification Status:\n');
  
  let verified = 0;
  
  for (const contract of CONTRACTS) {
    const info = await verifyBlockscout(contract.address);
    const status = info.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';
    
    console.log(`${contract.name.padEnd(20)} ${contract.address}`);
    console.log(`  Status: ${status}`);
    console.log(`  Compiler: ${info.compiler}`);
    console.log(`  Deployment Block: ${contract.block.toLocaleString()}`);
    console.log(`  Blockscout: https://base.blockscout.com/address/${contract.address}`);
    console.log('');
    
    if (info.verified) verified++;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('═'.repeat(80));
  console.log(`\n✅ Verification Summary: ${verified}/${CONTRACTS.length} contracts verified on Blockscout`);
  console.log('\n📝 Note: Contracts are verified on Blockscout (Base L2 explorer), not Etherscan\n');
  
  if (verified === CONTRACTS.length) {
    console.log('🎉 All December 31, 2025 deployments are VERIFIED and READY for production\n');
  }
}

main().catch(console.error);
