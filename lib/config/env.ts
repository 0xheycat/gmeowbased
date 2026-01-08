/**
 * ENVIRONMENT VARIABLE VALIDATION
 * 
 * Phase 9.2: Type Safety & Validation
 * 
 * This file validates all environment variables at application startup, providing:
 * - Type-safe access to env vars via `env` export
 * - Clear error messages for missing/invalid variables
 * - Automatic type coercion (strings → numbers, booleans, URLs)
 * - Fail-fast behavior (crashes on startup if invalid)
 * 
 * Usage:
 * ```typescript
 * import { env } from '@/lib/config/env';
 * 
 * // Type-safe access (no more process.env.X!)
 * const apiKey = env.NEYNAR_API_KEY;
 * const dbUrl = env.SUPABASE_URL;
 * 
 * // Optional vars with defaults
 * const port = env.PORT; // default: '3000'
 * const nodeEnv = env.NODE_ENV; // default: 'development'
 * ```
 * 
 * @see Phase 9.2 in LIB-REFACTOR-PLAN.md
 * @see https://zod.dev for schema validation
 */

import { z } from 'zod';

/**
 * Ethereum address validation (42 chars, 0x prefix)
 */
const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid Ethereum address (0x + 40 hex chars)');

/**
 * Private key validation (66 chars, 0x prefix)
 */
const privateKeySchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Must be valid private key (0x + 64 hex chars)');

/**
 * URL schema (must be valid HTTP/HTTPS URL)
 */
const urlSchema = z.string().url('Must be valid URL');

/**
 * Environment variable schema with Zod validation
 * 
 * **REQUIRED** vars: Must be set or startup fails
 * **OPTIONAL** vars: Have sensible defaults
 */
const envSchema = z.object({
  // ===================================================================
  // NODE ENVIRONMENT
  // ===================================================================
  
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ===================================================================
  // SUPABASE (REQUIRED)
  // ===================================================================
  
  SUPABASE_URL: urlSchema.describe('Supabase project URL'),
  
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY is required')
    .describe('Supabase anonymous/public key'),
  
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server operations')
    .describe('Supabase service role key (admin access)'),

  // Public vars (client-side)
  NEXT_PUBLIC_SUPABASE_URL: urlSchema.describe('Supabase URL for client'),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .describe('Supabase anon key for client'),

  // ===================================================================
  // NEYNAR API (REQUIRED)
  // ===================================================================
  
  NEYNAR_API_KEY: z
    .string()
    .min(1, 'NEYNAR_API_KEY is required for Farcaster integration')
    .describe('Neynar API key for Farcaster data'),
  
  NEYNAR_SERVER_WALLET_ID: z
    .string()
    .optional()
    .describe('Neynar server wallet ID for bot interactions'),

  NEXT_PUBLIC_NEYNAR_API_KEY: z
    .string()
    .min(1)
    .describe('Neynar API key for client-side'),

  // ===================================================================
  // REDIS / UPSTASH (REQUIRED for rate limiting)
  // ===================================================================
  
  UPSTASH_REDIS_REST_URL: urlSchema.optional().describe('Upstash Redis REST URL'),
  
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe('Upstash Redis REST token (optional for build)'),

  // ===================================================================
  // CONTRACT ADDRESSES (Base Chain)
  // ===================================================================
  
  NEXT_PUBLIC_GM_BASE_CORE: ethereumAddressSchema
    .default('0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73')
    .describe('GM Core contract on Base'),
  
  NEXT_PUBLIC_GM_BASE_GUILD: ethereumAddressSchema
    .default('0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3')
    .describe('GM Guild contract on Base'),
  
  NEXT_PUBLIC_GM_BASE_NFT: ethereumAddressSchema
    .default('0xCE9596a992e38c5fa2d997ea916a277E0F652D5C')
    .describe('GM NFT contract on Base'),
  
  NEXT_PUBLIC_GM_BASE_BADGE: ethereumAddressSchema
    .default('0x5Af50Ee323C45564d94B0869d95698D837c59aD2')
    .describe('GM Badge contract on Base'),
  
  NEXT_PUBLIC_GM_BASE_REFERRAL: ethereumAddressSchema
    .default('0x9E7c32C1fB3a2c08e973185181512a442b90Ba44')
    .describe('GM Referral contract on Base'),

  // Multi-chain GM addresses (optional, have defaults)
  NEXT_PUBLIC_GM_BASE_ADDRESS: ethereumAddressSchema
    .default('0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F'),
  
  NEXT_PUBLIC_GM_UNICHAIN_ADDRESS: ethereumAddressSchema
    .default('0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f'),
  
  NEXT_PUBLIC_GM_CELO_ADDRESS: ethereumAddressSchema
    .default('0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52'),
  
  NEXT_PUBLIC_GM_INK_ADDRESS: ethereumAddressSchema
    .default('0x6081a70c2F33329E49cD2aC673bF1ae838617d26'),
  
  NEXT_PUBLIC_GM_OP_ADDRESS: ethereumAddressSchema
    .default('0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6'),

  // ===================================================================
  // PRIVATE KEYS (REQUIRED for server-side transactions)
  // ===================================================================
  
  ORACLE_PRIVATE_KEY: privateKeySchema
    .optional()
    .describe('Oracle private key for auto-deposit signatures'),
  
  OWNER_PRIVATE_KEY: privateKeySchema
    .optional()
    .describe('Owner private key for contract admin operations'),

  // ===================================================================
  // RPC ENDPOINTS (have public fallbacks)
  // ===================================================================
  
  RPC_BASE: urlSchema
    .optional()
    .describe('Base RPC endpoint'),
  
  BASE_RPC: urlSchema
    .optional()
    .describe('Base RPC endpoint (alternative name)'),
  
  NEXT_PUBLIC_RPC_BASE: urlSchema
    .optional()
    .describe('Base RPC endpoint for client'),

  // ===================================================================
  // APP URLS
  // ===================================================================
  
  NEXT_PUBLIC_APP_URL: urlSchema
    .default('https://gmeowhq.art')
    .describe('Application base URL'),
  
  NEXT_PUBLIC_BASE_URL: urlSchema
    .optional()
    .describe('Alternative base URL'),
  
  NEXT_PUBLIC_FRAME_ORIGIN: urlSchema
    .optional()
    .describe('Frame origin URL'),
  
  VERCEL_URL: z
    .string()
    .optional()
    .describe('Vercel deployment URL (auto-set)'),

  // ===================================================================
  // STORAGE & METADATA
  // ===================================================================
  
  NEXT_PUBLIC_IPFS_GATEWAY: urlSchema
    .default('https://cloudflare-ipfs.com/ipfs')
    .describe('IPFS gateway URL'),
  
  NEXT_PUBLIC_ARWEAVE_GATEWAY: urlSchema
    .default('https://arweave.net')
    .describe('Arweave gateway URL'),
  
  NEXT_PUBLIC_R2_DOMAIN: urlSchema
    .optional()
    .describe('Cloudflare R2 domain'),
  
  NEXT_PUBLIC_NFT_STORAGE: z
    .enum(['supabase', 'ipfs', 'arweave', 'r2'])
    .default('supabase')
    .describe('NFT metadata storage type'),
  
  NEXT_PUBLIC_BADGE_STORAGE: z
    .enum(['supabase', 'ipfs', 'arweave', 'r2'])
    .default('supabase')
    .describe('Badge metadata storage type'),
  
  NFT_STORAGE_API_KEY: z
    .string()
    .optional()
    .describe('NFT.Storage API key'),
  
  PINATA_API_KEY: z
    .string()
    .optional()
    .describe('Pinata API key'),

  // ===================================================================
  // SUPABASE TABLE/BUCKET NAMES
  // ===================================================================
  
  SUPABASE_BADGE_TEMPLATE_TABLE: z
    .string()
    .default('badge_templates')
    .describe('Badge templates table name'),
  
  SUPABASE_BADGE_BUCKET: z
    .string()
    .default('badge-art')
    .describe('Badge art storage bucket'),

  // ===================================================================
  // CACHE & PERFORMANCE TUNING
  // ===================================================================
  
  BADGE_TEMPLATE_CACHE_TTL_MS: z
    .string()
    .default('15000')
    .transform(Number)
    .pipe(z.number().int().positive())
    .describe('Badge template cache TTL in ms'),
  
  BADGE_MINT_CACHE_TTL_MS: z
    .string()
    .default('30000')
    .transform(Number)
    .pipe(z.number().int().positive())
    .describe('Badge mint cache TTL in ms'),
  
  BADGE_MINT_LOOKBACK_BLOCKS: z
    .string()
    .default('400000')
    .transform(Number)
    .pipe(z.number().int().positive())
    .describe('Badge mint lookback blocks'),
  
  BOT_STATS_CONFIG_CACHE_MS: z
    .string()
    .default('180000')
    .transform(Number)
    .pipe(z.number().int().positive())
    .describe('Bot stats config cache TTL in ms'),
  
  SLOW_REQUEST_THRESHOLD_MS: z
    .string()
    .default('500')
    .transform(Number)
    .pipe(z.number().int().positive())
    .describe('Slow request alert threshold in ms'),

  // ===================================================================
  // FEATURE FLAGS
  // ===================================================================
  
  NEXT_PUBLIC_USE_MOCK_GM: z
    .string()
    .default('false')
    .transform((v) => v === 'true')
    .pipe(z.boolean())
    .describe('Use mock GM data'),
  
  NEXT_PUBLIC_USE_MOCK_QUESTS: z
    .string()
    .default('true')
    .transform((v) => v === 'true')
    .pipe(z.boolean())
    .describe('Use mock quest data'),
  
  ENABLE_SLOW_REQUEST_ALERTS: z
    .string()
    .default('true')
    .transform((v) => v !== 'false')
    .pipe(z.boolean())
    .describe('Enable slow request alerts'),

  // ===================================================================
  // ADMIN & SECURITY
  // ===================================================================
  
  ADMIN_SECRET: z
    .string()
    .optional()
    .describe('Admin API secret'),
  
  ADMIN_JWT_SECRET: z
    .string()
    .optional()
    .describe('Admin JWT signing secret'),
  
  ADMIN_ACCESS_CODE: z
    .string()
    .optional()
    .describe('Admin access code'),
  
  CRON_SECRET: z
    .string()
    .optional()
    .describe('Cron job authentication secret'),

  // ===================================================================
  // MONITORING & OBSERVABILITY
  // ===================================================================
  
  MONITORING_WEBHOOK_URL: urlSchema
    .optional()
    .describe('Webhook URL for monitoring alerts'),
  
  BOT_STATS_CONFIG: z
    .string()
    .optional()
    .describe('Bot stats configuration JSON'),

  // ===================================================================
  // DEPRECATED / LEGACY
  // ===================================================================
  
  CHAIN_START_BLOCK: z
    .string()
    .optional()
    .describe('[DEPRECATED] Chain start block (inline in code now)'),
});

/**
 * Validated environment variables
 * 
 * This export provides type-safe, validated access to all environment variables.
 * 
 * ❌ NEVER use process.env directly after importing this file
 * ✅ ALWAYS use `env.VAR_NAME` instead
 * 
 * @example
 * // ❌ BAD
 * const apiKey = process.env.NEYNAR_API_KEY!;
 * 
 * // ✅ GOOD
 * import { env } from '@/lib/config/env';
 * const apiKey = env.NEYNAR_API_KEY;
 */
export const env = envSchema.parse(process.env);

/**
 * Type export for environment variables
 * 
 * Use this type when passing env vars as function parameters
 * 
 * @example
 * function initSupabase(config: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>) {
 *   // ...
 * }
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if environment is properly configured
 * 
 * @returns true if all required env vars are set
 * 
 * @example
 * if (!isEnvConfigured()) {
 *   console.error('Environment not configured!');
 *   process.exit(1);
 * }
 */
export function isEnvConfigured(): boolean {
  try {
    envSchema.parse(process.env);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get validation errors without throwing
 * 
 * Useful for displaying friendly error messages in development
 * 
 * @returns Array of validation errors, or null if valid
 * 
 * @example
 * const errors = getEnvValidationErrors();
 * if (errors) {
 *   errors.forEach(err => console.error(`❌ ${err.path}: ${err.message}`));
 * }
 */
export function getEnvValidationErrors() {
  try {
    envSchema.parse(process.env);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
    }
    return [{ path: 'unknown', message: 'Unknown validation error', code: 'custom' }];
  }
}

// ===================================================================
// STARTUP VALIDATION
// ===================================================================

/**
 * Validate environment on module load
 * 
 * This runs automatically when the module is imported, ensuring that:
 * 1. All required env vars are present
 * 2. All env vars have correct types/formats
 * 3. Application fails fast if misconfigured
 * 
 * Skip validation during Next.js build phase (env vars not available in Docker build)
 * In development, shows friendly error messages.
 * In production, crashes immediately (better than runtime errors).
 */
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (process.env.NODE_ENV !== 'test' && !isNextBuild) {
  try {
    envSchema.parse(process.env);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Environment variables validated successfully');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
      console.error('The following environment variables are missing or invalid:\n');
      
      error.issues.forEach((err) => {
        console.error(`  • ${err.path.join('.')}: ${err.message}`);
      });
      
      console.error('\n💡 Check your .env file and ensure all required variables are set.');
      console.error('📖 See lib/config/env.ts for full documentation\n');
    }
    
    process.exit(1);
  }
}
