#!/usr/bin/env tsx
/**
 * Professional Contract Testing Suite
 * Tests all contract functions after verification
 */

import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { join } from 'path';

// Contract addresses
const CONTRACTS = {
  core: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92' as `0x${string}`,
  guild: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059' as `0x${string}`,
  nft: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20' as `0x${string}`,
  proxy: '0x6A48B758ed42d7c934D387164E60aa58A92eD206' as `0x${string}`,
} as const;

// Multiple Base RPC endpoints for fallback
const BASE_RPC_ENDPOINTS = [
  'https://base.llamarpc.com',
  'https://base-mainnet.public.blastapi.io',
  'https://base.blockpi.network/v1/rpc/public',
  'https://1rpc.io/base',
  'https://base.meowrpc.com',
  'https://base-rpc.publicnode.com',
  'https://mainnet.base.org',
];

// Create Base client with fallback transports
const client = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_ENDPOINTS[0], {
    retryCount: 3,
    timeout: 10_000,
  }),
});

// Fallback RPC rotation helper
let currentRpcIndex = 0;
async function createClientWithFallback() {
  for (let i = 0; i < BASE_RPC_ENDPOINTS.length; i++) {
    const rpcIndex = (currentRpcIndex + i) % BASE_RPC_ENDPOINTS.length;
    try {
      const testClient = createPublicClient({
        chain: base,
        transport: http(BASE_RPC_ENDPOINTS[rpcIndex], {
          retryCount: 2,
          timeout: 8_000,
        }),
      });
      // Test connection
      await testClient.getBlockNumber();
      currentRpcIndex = rpcIndex;
      return testClient;
    } catch (e) {
      continue;
    }
  }
  return client; // Fallback to default
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper to log test results
function logTest(name: string, passed: boolean, error?: string, duration?: number) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  const time = duration ? ` (${duration}ms)` : '';
  
  console.log(`${color}${symbol} ${name}${time}${colors.reset}`);
  if (error) {
    console.log(`  ${colors.red}Error: ${error}${colors.reset}`);
  }
  
  results.push({
    name,
    passed,
    error,
    duration: duration || 0,
  });
}

// Load ABIs
function loadABI(filename: string) {
  try {
    const path = join(process.cwd(), 'abi', filename);
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}Failed to load ABI: ${filename}${colors.reset}`);
    throw error;
  }
}

// Test Core Contract
async function testCoreContract() {
  console.log(`\n${colors.blue}━━━ Testing GmeowCore Contract ━━━${colors.reset}`);
  
  const coreAbi = loadABI('GmeowCore.abi.json');
  const start = Date.now();
  
  try {
    // Test 1: Check if contract is deployed
    const code = await client.getBytecode({ address: CONTRACTS.core });
    logTest('Contract deployment check', !!code, undefined, Date.now() - start);
    
    // Test 2: Read paused state
    const pausedStart = Date.now();
    const paused = await client.readContract({
      address: CONTRACTS.core,
      abi: coreAbi,
      functionName: 'paused',
    });
    logTest('Read paused state', typeof paused === 'boolean', undefined, Date.now() - pausedStart);
    
    // Test 3: Check oracle signer
    const oracleStart = Date.now();
    const oracleSigner = await client.readContract({
      address: CONTRACTS.core,
      abi: coreAbi,
      functionName: 'oracleSigner',
    });
    logTest('Read oracle signer', typeof oracleSigner === 'string', undefined, Date.now() - oracleStart);
    
    // Test 4: Check referral function exists
    const hasReferral = coreAbi.some((item: any) => 
      item.name === 'registerReferralCode' || item.name === 'setReferrer'
    );
    logTest('Referral functions in ABI', hasReferral);
    
  } catch (error: any) {
    logTest('Core contract test failed', false, error.message);
  }
}

// Test Guild Contract
async function testGuildContract() {
  console.log(`\n${colors.blue}━━━ Testing GmeowGuild Contract ━━━${colors.reset}`);
  
  const guildAbi = loadABI('GmeowGuild.abi.json');
  const start = Date.now();
  
  try {
    // Test 1: Check if contract is deployed
    const code = await client.getBytecode({ address: CONTRACTS.guild });
    logTest('Contract deployment check', !!code, undefined, Date.now() - start);
    
    // Test 2: Read next guild ID
    const nextIdStart = Date.now();
    const nextGuildId = await client.readContract({
      address: CONTRACTS.guild,
      abi: guildAbi,
      functionName: 'nextGuildId',
    });
    logTest('Read next guild ID', typeof nextGuildId === 'bigint', undefined, Date.now() - nextIdStart);
    
    // Test 3: Check guild functions in ABI
    const hasGuildFunctions = guildAbi.some((item: any) => 
      item.name === 'createGuild' || item.name === 'joinGuild'
    );
    logTest('Guild functions in ABI', hasGuildFunctions);
    
  } catch (error: any) {
    logTest('Guild contract test failed', false, error.message);
  }
}

// Test NFT Contract
async function testNFTContract() {
  console.log(`\n${colors.blue}━━━ Testing GmeowNFT Contract ━━━${colors.reset}`);
  
  const nftAbi = loadABI('GmeowNFT.abi.json');
  const start = Date.now();
  
  try {
    // Test 1: Check if contract is deployed
    const code = await client.getBytecode({ address: CONTRACTS.nft });
    logTest('Contract deployment check', !!code, undefined, Date.now() - start);
    
    // Test 2: Read paused state
    const pausedStart = Date.now();
    const nftPaused = await client.readContract({
      address: CONTRACTS.nft,
      abi: nftAbi,
      functionName: 'paused',
    });
    logTest('Read NFT paused state', typeof nftPaused === 'boolean', undefined, Date.now() - pausedStart);
    
    // Test 3: Check NFT functions in ABI
    const hasNFTFunctions = nftAbi.some((item: any) => 
      item.name === 'mint' || item.name === 'batchMint'
    );
    logTest('NFT functions in ABI', hasNFTFunctions);
    
  } catch (error: any) {
    logTest('NFT contract test failed', false, error.message);
  }
}

// Test Contract Interactions
async function testContractInteractions() {
  console.log(`\n${colors.blue}━━━ Testing Contract Interactions ━━━${colors.reset}`);
  
  try {
    const coreAbi = loadABI('GmeowCore.abi.json');
    
    // Use fallback client for rate-limited calls
    const fallbackClient = await createClientWithFallback();
    
    // Test: Check guild contract address in Core
    const guildStart = Date.now();
    const guildContractAddress = await fallbackClient.readContract({
      address: CONTRACTS.core,
      abi: coreAbi,
      functionName: 'guildContract',
    });
    
    const guildLinked = guildContractAddress === CONTRACTS.guild;
    logTest(
      'Guild contract linked to Core',
      guildLinked,
      guildLinked ? undefined : `Expected ${CONTRACTS.guild}, got ${guildContractAddress}`,
      Date.now() - guildStart
    );
    
    // Test: Check NFT contract address in Core
    const nftStart = Date.now();
    const nftContractAddress = await fallbackClient.readContract({
      address: CONTRACTS.core,
      abi: coreAbi,
      functionName: 'nftContractAddress',
    });
    
    const nftLinked = nftContractAddress === CONTRACTS.nft;
    logTest(
      'NFT contract linked to Core',
      nftLinked,
      nftLinked ? undefined : `Expected ${CONTRACTS.nft}, got ${nftContractAddress}`,
      Date.now() - nftStart
    );
    
  } catch (error: any) {
    logTest('Contract interaction test failed', false, error.message);
  }
}

// Print summary
function printSummary() {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  console.log(`Total Time: ${totalTime}ms`);
  
  const successRate = ((passed / total) * 100).toFixed(1);
  const color = passed === total ? colors.green : failed > passed ? colors.red : colors.yellow;
  console.log(`\n${color}Success Rate: ${successRate}%${colors.reset}`);
  
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.error) {
        console.log(`    ${r.error}`);
      }
    });
  }
  
  console.log('');
  
  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Main test runner
async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Gmeowbased Contract Testing Suite                   ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}Testing contracts on Base mainnet...${colors.reset}`);
  
  try {
    await testCoreContract();
    await testGuildContract();
    await testNFTContract();
    await testContractInteractions();
    
    printSummary();
  } catch (error: any) {
    console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
