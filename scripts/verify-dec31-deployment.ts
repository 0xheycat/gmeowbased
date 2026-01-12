#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;

// Contracts deployed on December 31, 2025
const CONTRACTS = {
  ScoringModule: '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6',
  Core: '0x343829A6A613d51B4A81c2dE508e49CA66D4548d',
  Guild: '0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097',
  Referral: '0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df',
  NFT: '0x34d0CD77Ba8d643C1d5f568331d61eFa35132eA8',
  Badge: '0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb',
};

async function verifyContract(name: string, address: string) {
  const url = `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${address}&apikey=${BASESCAN_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result[0].SourceCode) {
      const result = data.result[0];
      const deployTx = await getDeploymentTx(address);
      
      console.log(`\n✅ ${name}: ${address}`);
      console.log(`   Contract Name: ${result.ContractName}`);
      console.log(`   Compiler: ${result.CompilerVersion}`);
      console.log(`   Optimization: ${result.OptimizationUsed === '1' ? 'Yes' : 'No'} (${result.Runs} runs)`);
      console.log(`   Verified: ✅ YES`);
      console.log(`   Deployment TX: ${deployTx?.hash || 'N/A'}`);
      console.log(`   Deployment Date: ${deployTx?.timeStamp ? new Date(parseInt(deployTx.timeStamp) * 1000).toLocaleString() : 'N/A'}`);
      console.log(`   BaseScan: https://basescan.org/address/${address}`);
      
      return true;
    } else {
      console.log(`\n❌ ${name}: ${address}`);
      console.log(`   Status: NOT VERIFIED`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying ${name}:`, error);
    return false;
  }
}

async function getDeploymentTx(address: string) {
  const url = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${BASESCAN_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      return data.result[0];
    }
  } catch (error) {
    console.error('Error getting deployment tx:', error);
  }
  return null;
}

async function main() {
  console.log('🔍 Verifying All Contracts Deployed on December 31, 2025\n');
  console.log('═'.repeat(80));
  
  if (!BASESCAN_API_KEY) {
    console.error('❌ BASESCAN_API_KEY not found in .env.local');
    process.exit(1);
  }
  
  let verified = 0;
  let total = Object.keys(CONTRACTS).length;
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    const isVerified = await verifyContract(name, address);
    if (isVerified) verified++;
    await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 Verification Summary: ${verified}/${total} contracts verified\n`);
  
  if (verified === total) {
    console.log('✅ All contracts deployed on December 31, 2025 are VERIFIED');
  } else {
    console.log('⚠️ Some contracts are not verified');
  }
}

main().catch(console.error);
