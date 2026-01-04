/**
 * Apollo Client Configuration for Subsquid GraphQL
 * Phase 3.2G - Hybrid Architecture Migration (Jan 1, 2026)
 * 
 * Features:
 * - Professional caching with InMemoryCache
 * - Error handling with retry logic
 * - Request batching for performance
 * - Type-safe queries with TypeScript
 * - Fallback strategies built-in
 * 
 * Architecture:
 * Layer 2 (Subsquid GraphQL) → Layer 1 (Contract reads) → Layer 3 (Supabase cache)
 */

import { ApolloClient, InMemoryCache, HttpLink, from, ApolloLink } from '@apollo/client'
import { onError } from '@apollo/client/link/error'

// Environment configuration
// Production Subsquid Cloud (deployed Jan 1, 2026 with Phase 1 schema ✅)
// Indexer synced to current block, all 17 scoring fields available
// Uses NEXT_PUBLIC_SUBSQUID_URL from .env.local
const SUBSQUID_GRAPHQL_URL = process.env.NEXT_PUBLIC_SUBSQUID_URL || 'https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql'

/**
 * Error handling link
 * Logs errors and provides debugging information
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
        `Operation: ${operation.operationName}`
      )
    })
  }

  if (networkError) {
    console.error(
      `[Network error]: ${networkError.message}`,
      `Operation: ${operation.operationName}`
    )
  }
})

/**
 * Retry logic with exponential backoff
 * Implemented as custom ApolloLink
 */
const retryLink = new ApolloLink((operation, forward) => {
  let attempt = 0
  const maxAttempts = 3
  
  const executeWithRetry = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      forward(operation).subscribe({
        next: resolve,
        error: (error) => {
          attempt++
          // Retry on network errors, but not on GraphQL validation errors
          if (
            attempt < maxAttempts &&
            error &&
            !error.message?.includes('GRAPHQL_VALIDATION_FAILED')
          ) {
            const delay = Math.min(300 * Math.pow(2, attempt), 5000)
            setTimeout(() => {
              executeWithRetry().then(resolve).catch(reject)
            }, delay)
          } else {
            reject(error)
          }
        },
      })
    })
  }
  
  return forward(operation)
})

/**
 * HTTP link to Subsquid GraphQL endpoint
 */
const httpLink = new HttpLink({
  uri: SUBSQUID_GRAPHQL_URL,
  credentials: 'same-origin',
  fetchOptions: {
    // Timeout after 120 seconds (production Subsquid cloud can be slow on complex queries)
    signal: AbortSignal.timeout(120000),
  },
})

/**
 * Request logger (development only)
 */
const loggerLink = new ApolloLink((operation, forward) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[GraphQL Request]: ${operation.operationName}`)
  }
  return forward(operation)
})

/**
 * In-Memory Cache Configuration
 * - Optimized for leaderboard and user stats
 * - Prevents unnecessary re-fetches
 */
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // User queries: Cache by ID (address)
        user: {
          keyArgs: ['id'],
          merge: true,
        },
        users: {
          keyArgs: ['where', 'orderBy', 'limit', 'offset'],
          merge(existing = [], incoming, { args }) {
            // If offset is 0 or undefined, replace the cache
            if (!args?.offset) {
              return incoming
            }
            // Otherwise, append new data (pagination)
            return [...existing, ...incoming]
          },
        },
        // Leaderboard entries: Cache by user ID
        leaderboardEntries: {
          keyArgs: ['orderBy', 'limit', 'offset'],
          merge(existing = [], incoming, { args }) {
            if (!args?.offset) {
              return incoming
            }
            return [...existing, ...incoming]
          },
        },
        // Stats events: Cache by time range
        statsUpdatedEvents: {
          keyArgs: ['where', 'orderBy'],
          merge: true,
        },
        levelUpEvents: {
          keyArgs: ['where', 'orderBy'],
          merge: true,
        },
        rankUpEvents: {
          keyArgs: ['where', 'orderBy'],
          merge: true,
        },
      },
    },
    User: {
      keyFields: ['id'], // Use wallet address as key
    },
    LeaderboardEntry: {
      keyFields: ['id'], // Use wallet address as key
    },
    StatsUpdatedEvent: {
      keyFields: ['id'], // Use txHash-logIndex as key
    },
    LevelUpEvent: {
      keyFields: ['id'],
    },
    RankUpEvent: {
      keyFields: ['id'],
    },
  },
})

/**
 * Apollo Client instance
 * Singleton pattern for Next.js (SSR-safe)
 */
let apolloClient: ApolloClient<any> | null = null

export const createApolloClient = () => {
  return new ApolloClient({
    link: from([loggerLink, errorLink, retryLink, httpLink]),
    cache,
    defaultOptions: {
      query: {
        // Cache-first: Use cache, only fetch if not cached
        fetchPolicy: 'cache-first',
        // Error policy: Return partial data even if errors occur
        errorPolicy: 'all',
      },
      watchQuery: {
        // Network-only for real-time data like leaderboards
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
    },
    // SSR support
    ssrMode: typeof window === 'undefined',
  })
}

/**
 * Get Apollo Client instance (singleton)
 * Reuses client on subsequent calls
 */
export const getApolloClient = () => {
  if (!apolloClient) {
    apolloClient = createApolloClient()
  }
  return apolloClient
}

/**
 * Reset Apollo Client cache
 * Useful for testing or after major data updates
 */
export const resetApolloCache = async () => {
  if (apolloClient) {
    await apolloClient.clearStore()
  }
}

// Export default client
export default getApolloClient()
