/**
 * @file lib/frames/frog-config.ts
 * @description Frog framework configuration for Farcaster frames
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * 
 * FEATURES:
 *   - Frog framework instance configuration
 *   - Neynar middleware integration
 *   - Custom fonts (Gmeow, Inter)
 *   - Hub API configuration
 *   - Image generation settings (1200x630)
 *   - Devtools integration for development
 * 
 * REFERENCE DOCUMENTATION:
 *   - Frog framework: https://frog.fm
 *   - Neynar API: https://neynar.com
 *   - Frame routes: app/api/frame/
 * 
 * REQUIREMENTS:
 *   - NEYNAR_API_KEY environment variable
 *   - Farcaster hub access
 *   - Custom fonts in app/fonts/
 * 
 * TODO:
 *   - [ ] Add production/development config separation
 *   - [ ] Add rate limiting middleware
 *   - [ ] Add error handling middleware
 *   - [ ] Add analytics middleware
 *   - [ ] Add caching middleware
 * 
 * CRITICAL:
 *   - NEYNAR_API_KEY must be set
 *   - Hub URL must be correct
 *   - Image dimensions must match frame spec
 *   - Fonts must exist in app/fonts/
 * 
 * SUGGESTIONS:
 *   - Add middleware for common operations
 *   - Configure different settings per environment
 *   - Add request logging middleware
 *   - Cache Frog instance creation
 * 
 * AVOID:
 *   - Exposing API keys in config
 *   - Using default image dimensions
 *   - Missing font fallbacks
 *   - Running devtools in production
 */

import { Frog } from 'frog'
import { devtools } from 'frog/dev'
import { neynar } from 'frog/middlewares'

/**
 * Frog Framework Configuration
 * 
 * This is the main Frog instance used for all Frame routes.
 * Configured with Neynar middleware for user data access.
 */
export const app = new Frog({
  basePath: '/api/frame',
  hub: {
    apiUrl: 'https://hub.farcaster.xyz',
    fetchOptions: {
      headers: {
        'x-farcaster-auth': process.env.NEYNAR_API_KEY || '',
      },
    },
  },
  imageOptions: {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        source: 'google',
        weight: 400,
      },
      {
        name: 'Inter',
        source: 'google',
        weight: 700,
      },
    ],
  },
  title: 'Gmeow - Social XP Platform',
  // Browser location when user clicks on the Frame
  browserLocation: process.env.NEXT_PUBLIC_URL || 'https://gmeowhq.art',
})

/**
 * Neynar Middleware
 * 
 * Provides easy access to:
 * - frameData.fid: User's Farcaster ID
 * - interactor: User who clicked the button
 * - cast: Original cast data
 */
app.use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || '',
    features: ['interactor', 'cast'],
  })
)

/**
 * Dev Tools (localhost only)
 * 
 * Access at: http://localhost:3000/api/frame/dev
 */
if (process.env.NODE_ENV === 'development') {
  devtools(app)
}
