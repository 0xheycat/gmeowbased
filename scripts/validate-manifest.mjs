#!/usr/bin/env node

/**
 * Farcaster Miniapp Manifest Validator
 * 
 * Validates the manifest file at /public/.well-known/farcaster.json
 * against the Farcaster Miniapp v1 specification.
 * 
 * Usage: node scripts/validate-manifest.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_PATH = path.join(__dirname, '../public/.well-known/farcaster.json');
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  error: (msg) => console.error(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  warning: (msg) => console.warn(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
};

const ALLOWED_CATEGORIES = [
  'games', 'social', 'finance', 'utility', 'productivity',
  'health-fitness', 'news-media', 'music', 'shopping',
  'education', 'developer-tools', 'entertainment', 'art-creativity'
];

const SUPPORTED_CHAINS = [
  'eip155:1',      // Ethereum Mainnet
  'eip155:10',     // Optimism
  'eip155:8453',   // Base
  'eip155:42220',  // Celo
  'eip155:57073',  // Ink
  'eip155:763373', // Unichain
];

function validateManifest() {
  console.log('\n🔍 Validating Farcaster Miniapp Manifest...\n');

  // Check if file exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    log.error(`Manifest file not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  // Read and parse JSON
  let manifest;
  try {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(content);
    log.success('Manifest file is valid JSON');
  } catch (error) {
    log.error(`Failed to parse manifest: ${error.message}`);
    process.exit(1);
  }

  let errors = 0;
  let warnings = 0;

  // Validate top-level structure
  console.log('\n📋 Validating Structure...');
  
  if (!manifest.accountAssociation) {
    log.error('Missing required field: accountAssociation');
    errors++;
  } else {
    validateAccountAssociation(manifest.accountAssociation);
  }

  if (!manifest.miniapp && !manifest.frame) {
    log.error('Missing required field: miniapp (or frame for backward compatibility)');
    errors++;
  } else {
    const miniappConfig = manifest.miniapp || manifest.frame;
    const result = validateMiniappConfig(miniappConfig);
    errors += result.errors;
    warnings += result.warnings;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (errors === 0 && warnings === 0) {
    log.success('Manifest validation passed! ✨');
  } else if (errors === 0) {
    log.warning(`Validation passed with ${warnings} warning(s)`);
  } else {
    log.error(`Validation failed with ${errors} error(s) and ${warnings} warning(s)`);
    process.exit(1);
  }
  console.log('='.repeat(60) + '\n');
}

function validateAccountAssociation(accountAssociation) {
  const requiredFields = ['header', 'payload', 'signature'];
  const placeholders = ['PLACEHOLDER', 'TO_BE_SIGNED'];
  
  for (const field of requiredFields) {
    if (!accountAssociation[field]) {
      log.error(`accountAssociation missing required field: ${field}`);
      return;
    }
    
    // Check for placeholder values
    const value = accountAssociation[field];
    if (placeholders.some(ph => value.includes(ph))) {
      log.warning(`accountAssociation.${field} contains placeholder value - MUST be signed before production deployment`);
    }
  }
  
  // Check if it looks like base64
  for (const field of requiredFields) {
    const value = accountAssociation[field];
    if (!value.match(/^[A-Za-z0-9+/=_-]+$/)) {
      log.warning(`accountAssociation.${field} doesn't look like valid base64`);
    }
  }
  
  log.success('accountAssociation structure is valid');
}

function validateMiniappConfig(config) {
  let errors = 0;
  let warnings = 0;

  console.log('\n🎯 Validating Miniapp Config...');

  // Required fields
  const required = {
    version: { validate: (v) => v === '1', message: 'Must be "1"' },
    name: { validate: (v) => v && v.length <= 32, message: 'Required, max 32 characters' },
    iconUrl: { validate: (v) => isValidUrl(v), message: 'Required, must be valid URL' },
    homeUrl: { validate: (v) => isValidUrl(v), message: 'Required, must be valid URL' },
  };

  for (const [field, { validate, message }] of Object.entries(required)) {
    if (!config[field]) {
      log.error(`Missing required field: ${field} (${message})`);
      errors++;
    } else if (!validate(config[field])) {
      log.error(`Invalid ${field}: ${message}`);
      errors++;
    } else {
      log.success(`${field}: ${config[field]}`);
    }
  }

  // Optional fields with validation
  if (config.subtitle && config.subtitle.length > 30) {
    log.warning('subtitle exceeds 30 characters');
    warnings++;
  }

  if (config.description && config.description.length > 170) {
    log.warning('description exceeds 170 characters');
    warnings++;
  }

  if (config.primaryCategory) {
    if (!ALLOWED_CATEGORIES.includes(config.primaryCategory)) {
      log.error(`Invalid primaryCategory: ${config.primaryCategory}`);
      errors++;
    } else {
      log.success(`primaryCategory: ${config.primaryCategory}`);
    }
  }

  if (config.tags) {
    if (!Array.isArray(config.tags)) {
      log.error('tags must be an array');
      errors++;
    } else if (config.tags.length > 5) {
      log.warning('tags should have maximum 5 entries');
      warnings++;
    } else {
      for (const tag of config.tags) {
        if (tag.length > 20) {
          log.warning(`tag "${tag}" exceeds 20 characters`);
          warnings++;
        }
        if (!/^[a-z0-9-]+$/.test(tag)) {
          log.warning(`tag "${tag}" should be lowercase, no spaces, no special characters`);
          warnings++;
        }
      }
      log.success(`tags: [${config.tags.join(', ')}]`);
    }
  }

  if (config.requiredChains) {
    if (!Array.isArray(config.requiredChains)) {
      log.error('requiredChains must be an array');
      errors++;
    } else {
      for (const chain of config.requiredChains) {
        if (!chain.startsWith('eip155:')) {
          log.warning(`Chain "${chain}" doesn't follow CAIP-2 format (eip155:chainId)`);
          warnings++;
        }
        if (!SUPPORTED_CHAINS.includes(chain)) {
          log.info(`Chain "${chain}" may not be supported by all clients`);
        }
      }
      log.success(`requiredChains: ${config.requiredChains.length} chains configured`);
    }
  }

  if (config.screenshotUrls) {
    if (!Array.isArray(config.screenshotUrls)) {
      log.error('screenshotUrls must be an array');
      errors++;
    } else if (config.screenshotUrls.length > 3) {
      log.warning('screenshotUrls should have maximum 3 screenshots');
      warnings++;
    } else if (config.screenshotUrls.length === 0) {
      log.info('screenshotUrls is empty - consider adding screenshots for better discovery');
    }
  }

  // URL validation for optional fields
  const urlFields = [
    'splashImageUrl', 'heroImageUrl', 'ogImageUrl', 
    'webhookUrl', 'imageUrl'
  ];
  
  for (const field of urlFields) {
    if (config[field] && !isValidUrl(config[field])) {
      log.warning(`${field} doesn't appear to be a valid URL`);
      warnings++;
    } else if (config[field]) {
      log.success(`${field}: configured`);
    }
  }

  // Splash background color
  if (config.splashBackgroundColor) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(config.splashBackgroundColor)) {
      log.warning('splashBackgroundColor should be a hex color code (e.g., #0B0A16)');
      warnings++;
    } else {
      log.success(`splashBackgroundColor: ${config.splashBackgroundColor}`);
    }
  }

  return { errors, warnings };
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Run validation
validateManifest();
