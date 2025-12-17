/**
 * Authentication & Authorization - Organized exports
 * 
 * Two authentication systems:
 * - admin.ts: JWT/TOTP admin authentication (18 imports)
 * - api-key.ts: Simple API key authentication (legacy, 0 imports)
 * 
 * Import patterns:
 * - Admin: import { requireAdminSession } from '@/lib/auth/admin'
 * - API Key: import { checkAdminAuth } from '@/lib/auth/api-key'
 */

// JWT/TOTP Admin auth (previously lib/admin-auth.ts)
export * from './admin'

// API Key auth (previously lib/auth.ts)
export * from './api-key'
