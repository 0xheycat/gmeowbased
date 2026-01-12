#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;

// Old contracts (December 8-11, 2025)
const OLD_CONTRACTS = {
  'Old Core': '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
  'Old Guild': '0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3',
  'Old NFT': '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C',
  'Old Badge': '0x5Af50Ee323C45564d94B0869d95698D837c59aD2',
  'Old Referral': '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44',
};

// New contracts (December 31, 2025)
const NEW_CONTRACTS = {
  'ScoringModule': '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6',
  'Core': '0x343829A6A613d51B4A81c2dE508e49CA66D4548d',
  'Guild': '0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097',
  'Referral': '0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df',
  'NFT': '0x34d0CD77Ba8d643C1d5f568331d61eFa35132eA8',
  'Badge': '0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb',
};

async function getContractInfo(address: string) {
  const url = `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${address}&apikey=${BASESCAN_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result[0]) {
      const result = data.result[0];
      return {
        verified: result.SourceCode !== '',
        contractName: result.ContractName || 'Unknown',
        compiler: result.CompilerVersion || 'N/A',
        optimization: result.OptimizationUsed === '1' ? `Yes (${result.Runs} runs)` : 'No',
        constructorArgs: result.ConstructorArguments || 'None',
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getDeploymentInfo(address: string) {
  const url = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${BASESCAN_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      const tx = data.result[0];
      return {
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
        deployer: tx.from,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function verifyContract(name: string, address: string) {
  const info = await getContractInfo(address);
  const deployment = await getDeploymentInfo(address);
  
  console.log(`\n${name}: ${address}`);
  
  if (info && info.verified) {
    console.log(`  ✅ VERIFIED on Basescan`);
    console.log(`  Contract: ${info.contractName}`);
    console.log(`  Compiler: ${info.compiler}`);
    console.log(`  Optimization: ${info.optimization}`);
  } else {
    console.log(`  ❌ NOT VERIFIED on Basescan`);
  }
  
  if (deployment) {
    console.log(`  Deployed: ${deployment.timestamp}`);
    console.log(`  Block: ${deployment.blockNumber.toLocaleString()}`);
    console.log(`  TX: ${deployment.txHash}`);
    console.log(`  Deployer: ${deployment.deployer}`);
  }
  
  console.log(`  BaseScan: https://basescan.org/address/${address}`);
  
  return info?.verified || false;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       Contract Verification via Basescan API (Etherscan for Base)         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  if (!BASESCAN_API_KEY) {
    console.error('❌ BASESCAN_API_KEY not found in .env.local');
    process.exit(1);
  }
  
  console.log('API Key:', BASESCAN_API_KEY.substring(0, 8) + '...' + BASESCAN_API_KEY.substring(BASESCAN_API_KEY.length - 4));
  console.log('');
  
  // Verify old contracts
  console.log('═'.repeat(80));
  console.log('📜 OLD CONTRACTS (December 8-11, 2025) - DEPRECATED');
  console.log('═'.repeat(80));
  
  let oldVerified = 0;
  for (const [name, address] of Object.entries(OLD_CONTRACTS)) {
    const verified = await verifyContract(name, address);
    if (verified) oldVerified++;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Verify new contracts
  console.log('\n' + '═'.repeat(80));
  console.log('🆕 NEW CONTRACTS (December 31, 2025) - PRODUCTION');
  console.log('═'.repeat(80));
  
  let newVerified = 0;
  for (const [name, address] of Object.entries(NEW_CONTRACTS)) {
    const verified = await verifyContract(name, address);
    if (verified) newVerified++;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nOld Contracts: ${oldVerified}/${Object.keys(OLD_CONTRACTS).length} verified`);
  console.log(`New Contracts: ${newVerified}/${Object.keys(NEW_CONTRACTS).length} verified`);
  console.log(`\nTotal: ${oldVerified + newVerified}/${Object.keys(OLD_CONTRACTS).length + Object.keys(NEW_CONTRACTS).length} contracts verified on Basescan\n`);
  
  if (oldVerified === Object.keys(OLD_CONTRACTS).length) {
    console.log('✅ All old contracts are verified');
  }
  if (newVerified === Object.keys(NEW_CONTRACTS).length) {
    console.log('✅ All new contracts are verified');
  }
}

main().catch(console.error);
