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
