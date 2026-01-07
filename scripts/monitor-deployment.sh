#!/bin/bash
# Monitor Railway deployment and test when ready

URL="https://gmeowhq.art"
MAX_WAIT=600  # 10 minutes
INTERVAL=15   # Check every 15 seconds

echo "🚀 Monitoring deployment of $URL"
echo "Waiting for new build to deploy..."

# Get current webpack hash
INITIAL_HASH=$(curl -s $URL | grep -o "webpack-[a-z0-9]*\.js" | head -1)
echo "Current hash: $INITIAL_HASH"

START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  
  if [ $ELAPSED -gt $MAX_WAIT ]; then
    echo "❌ Timeout: No deployment after ${MAX_WAIT}s"
    exit 1
  fi
  
  # Check current hash
  NEW_HASH=$(curl -s $URL | grep -o "webpack-[a-z0-9]*\.js" | head -1)
  
  if [ "$NEW_HASH" != "$INITIAL_HASH" ] && [ -n "$NEW_HASH" ]; then
    echo "✅ New build detected! Hash: $NEW_HASH (${ELAPSED}s)"
    echo ""
    echo "🧪 Running browser tests..."
    sleep 5  # Wait for CDN to update
    
    if node scripts/browser-test.mjs $URL; then
      echo ""
      echo "✅✅✅ DEPLOYMENT SUCCESSFUL - NO ERRORS ✅✅✅"
      exit 0
    else
      echo ""
      echo "❌❌❌ DEPLOYMENT HAS ERRORS - SEE ABOVE ❌❌❌"
      exit 1
    fi
  fi
  
  echo "[$ELAPSED/$MAX_WAIT] Still waiting... (hash: $NEW_HASH)"
  sleep $INTERVAL
done
