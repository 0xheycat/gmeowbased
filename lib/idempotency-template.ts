/**
 * Idempotency Template for Financial APIs
 * 
 * Quick reference for applying idempotency to remaining APIs
 * 
 * STEP 1: Add imports
 */

// Add to imports:
import { 
  checkIdempotency, 
  storeIdempotency, 
  getIdempotencyKey, 
  isValidIdempotencyKey,
  returnCachedResponse 
} from '@/lib/idempotency'

/**
 * STEP 2: Add documentation
 */
/*
 * Enterprise Enhancement: Idempotency Keys
 * - Header: Idempotency-Key (36-72 chars, UUID v4 recommended)
 * - TTL: 24 hours
 * - CRITICAL: Prevents duplicate [operation] on network retry
 * - Pattern: Stripe API
 */

/**
 * STEP 3: Add idempotency check at start of POST handler
 * 
 * Example implementation:
 */
export async function examplePOSTHandler(req: any) {
  try {
    // IDEMPOTENCY CHECK - Prevent duplicate operations
    const idempotencyKey = getIdempotencyKey(req)
    
    if (idempotencyKey) {
      try {
        // Validate key format
        if (!isValidIdempotencyKey(idempotencyKey)) {
          return {
            error: 'Invalid idempotency key format. Must be 36-72 characters.',
            status: 400
          }
        }
        
        // Check if operation already completed
        const cachedResult = await checkIdempotency(idempotencyKey)
        if (cachedResult.exists) {
          console.log('[api-name] Returning cached response for idempotency key:', idempotencyKey)
          return returnCachedResponse(cachedResult)
        }
      } catch (cacheError) {
        console.error('Cache check error:', cacheError)
      }
    }
    
    // ... rest of handler
    
    /**
     * STEP 4: Cache success response
     */
    const responseData = {
      // ... response data
      success: true
    }

    // Store result with idempotency key if provided
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responseData, 200)
    }

    return { data: responseData, status: 200 }
    
  } catch (error) {
    console.error('Handler error:', error)
    
    /**
     * STEP 5: Cache critical error responses (optional but recommended)
     */
    const criticalError = error as Error
    const errorResponse = {
      success: false,
      message: criticalError.message || 'Error message',
      timestamp: Date.now(),
    }
    
    // Cache error response with idempotency key
    const idempotencyKey = getIdempotencyKey(req)
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, errorResponse, 403)
    }
    
    return { error: errorResponse.message, status: 403 }
  }
}
