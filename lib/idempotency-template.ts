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
 */
async function POST(req: NextRequest) {
  try {
    // IDEMPOTENCY CHECK - Prevent duplicate operations
    const idempotencyKey = getIdempotencyKey(req)
    
    if (idempotencyKey) {
      // Validate key format
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return createErrorResponse(
          'Invalid idempotency key format. Must be 36-72 characters.',
          400
        )
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
    
    // ... rest of handler
  }
}

/**
 * STEP 4: Cache success response
 */
const responseData = {
  // ... response data
}

// Store result with idempotency key if provided
if (idempotencyKey) {
  await storeIdempotency(idempotencyKey, responseData, 200)
}

return createSuccessResponse(responseData)

/**
 * STEP 5: Cache critical error responses (optional but recommended)
 */
if (criticalError) {
  const errorResponse = {
    success: false,
    message: 'Error message',
    timestamp: Date.now(),
  }
  
  // Cache error response with idempotency key
  if (idempotencyKey) {
    await storeIdempotency(idempotencyKey, errorResponse, 403)
  }
  
  return createErrorResponse(errorResponse.message, 403)
}
