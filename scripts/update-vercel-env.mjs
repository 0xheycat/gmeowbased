#!/usr/bin/env node
/**
 * Vercel Environment Variable Updater
 * Updates environment variables via Vercel API (bypasses CLI fair use limit)
 * 
 * Usage: node scripts/update-vercel-env.mjs
 */

import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

const PROJECT_ID = 'prj_wYXOR0jhNjub1cdUckibpqDxG9HS';
const TEAM_ID = 'team_HBpOutUe7j02mxRqeJZANGg3';

// Get Vercel token from CLI
function getVercelToken() {
  try {
    // Try to get token from vercel whoami
    const result = execSync('vercel whoami --token 2>&1', { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    console.error('Error: Could not authenticate with Vercel');
    console.log('Please run: vercel login');
    process.exit(1);
  }
}

// Read .env.local and extract variable
function getEnvVar(key) {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const regex = new RegExp(`^${key}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (match) {
      return match[1].replace(/^["']|["']$/g, ''); // Remove quotes
    }
    return null;
  } catch (error) {
    console.error(`Error reading .env.local: ${error.message}`);
    return null;
  }
}

// Make API request to Vercel
function makeApiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const token = process.env.VERCEL_TOKEN;
    
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Get existing environment variables
async function getExistingEnvVars() {
  const path = `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`;
  try {
    const response = await makeApiRequest('GET', path);
    return response.envs || [];
  } catch (error) {
    console.error(`Error fetching env vars: ${error.message}`);
    return [];
  }
}

// Update or create environment variable
async function updateEnvVar(key, value) {
  console.log(`Updating: ${key}`);
  
  // Check if variable exists
  const existing = await getExistingEnvVars();
  const existingVar = existing.find(env => env.key === key);
  
  if (existingVar) {
    // Update existing
    const path = `/v9/projects/${PROJECT_ID}/env/${existingVar.id}?teamId=${TEAM_ID}`;
    try {
      await makeApiRequest('PATCH', path, {
        value: value,
        target: ['production', 'preview', 'development']
      });
      console.log(`  ✓ Updated (existing)`);
      return true;
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      return false;
    }
  } else {
    // Create new
    const path = `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`;
    try {
      await makeApiRequest('POST', path, {
        key: key,
        value: value,
        type: 'encrypted',
        target: ['production', 'preview', 'development']
      });
      console.log(`  ✓ Created (new)`);
      return true;
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('Vercel Environment Variable Updater');
  console.log('===================================\n');
  
  // Get token
  console.log('Authenticating...');
  const token = getVercelToken();
  process.env.VERCEL_TOKEN = token;
  console.log('✓ Authenticated\n');
  
  console.log('Updating Phase 9 critical variables...\n');
  
  const criticalVars = [
    'NEXT_PUBLIC_RPC_BASE',
    'RPC_BASE',
    'RPC_BASE_HTTP',
    'RPC_API_KEY',
    'NEXT_PUBLIC_SUBSQUID_URL',
    'SUBSQUID_API_KEY',
    'NEXT_PUBLIC_GM_BASE_SCORING'
  ];
  
  let success = 0;
  let failed = 0;
  
  for (const varName of criticalVars) {
    const value = getEnvVar(varName);
    if (!value) {
      console.log(`⚠️  Skipping ${varName}: not found in .env.local`);
      failed++;
      continue;
    }
    
    const result = await updateEnvVar(varName, value);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${criticalVars.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}\n`);
  
  if (success === criticalVars.length) {
    console.log('✅ All critical Phase 9 variables updated!');
    console.log('\nNext: Deploy to preview');
    console.log('  Run: vercel deploy\n');
  } else {
    console.log('⚠️  Some variables failed to update');
    console.log('You may need to update them manually\n');
  }
}

main().catch(error => {
  console.error(`\nFatal error: ${error.message}`);
  process.exit(1);
});
