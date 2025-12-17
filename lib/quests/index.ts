/**
 * Quest System - Barrel Exports
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Central export point for quest system modules
 * - Exports verification services (Farcaster, onchain, orchestrator)
 * - Exports validation schemas (Zod)
 * - Handles export conflicts (cost-calculator vs points-escrow-service)
 * - Provides clean import paths for consumers
 * - Supports tree-shaking for optimal bundle size
 * - Documents export conflicts with comments
 * 
 * TODO:
 * - Add re-exported types from all modules
 * - Group exports by functionality (verification, validation, etc.)
 * - Add JSDoc for each exported module
 * - Implement namespace exports for better organization
 * - Add export versioning for breaking changes
 * - Generate export documentation automatically
 * 
 * CRITICAL:
 * - Export conflicts must be resolved (never use export *)
 * - Circular dependencies must be avoided
 * - All exports must be explicitly listed for clarity
 * - Breaking changes require major version bump
 * 
 * SUGGESTIONS:
 * - Consider splitting into multiple index files by domain
 * - Add deprecation warnings for old exports
 * - Implement export aliases for backward compatibility
 * - Add export summary at top of file
 * 
 * AVOID:
 * - Using wildcard exports with conflicts (causes runtime errors)
 * - Exporting internal implementation details
 * - Creating circular dependencies between modules
 * - Changing export names without deprecation period
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Pattern: Barrel Export
 * Quality Gates: GI-21 (Module Organization)
 */

// Export individual modules
export * from './farcaster-verification'
export * from './onchain-verification'
export * from './quest-creation-validation'

// Cost calculator - use directly to avoid conflicts
// export * from './cost-calculator'

// Points escrow - use directly to avoid conflicts  
// export * from './points-escrow-service'
