#!/bin/bash
#
# Local test script for GitHub Actions workflow
# Simulates the NFT Mint Worker workflow steps
#

set -e

echo "=== NFT Mint Worker Test (Local Simulation) ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Step 1: Validate required secrets
echo "Step 1: Validating required secrets..."
if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: CRON_SECRET is not set"
  echo "Run: export CRON_SECRET=\$(grep CRON_SECRET .env.local | cut -d'=' -f2)"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_BASE_URL" ]; then
  echo "ERROR: NEXT_PUBLIC_BASE_URL is not set"
  echo "Run: export NEXT_PUBLIC_BASE_URL=\$(grep NEXT_PUBLIC_BASE_URL .env.local | cut -d'=' -f2)"
  exit 1
fi

echo "✓ All required secrets are present"
echo "  CRON_SECRET: ${CRON_SECRET:0:10}..."
echo "  BASE_URL: $NEXT_PUBLIC_BASE_URL"
echo ""

# Step 2: Start dev server if not running
echo "Step 2: Checking if dev server is running..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "⚠ Dev server not running on port 3000"
  echo "Using localhost:3000 anyway (workflow will use production URL)"
fi
echo ""

# Step 3: Call mint worker endpoint (localhost for testing)
echo "Step 3: Calling mint worker endpoint..."
echo "URL: http://localhost:3000/api/cron/process-mint-queue"

# Note: GitHub Actions doesn't send Origin header, so we test without it
response=$(curl -X POST \
  "http://localhost:3000/api/cron/process-mint-queue" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -H "User-Agent: GitHub-Actions" \
  -w "\n%{http_code}" \
  -s \
  --max-time 30 2>&1)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response: $body"
echo ""

# Step 4: Parse results
if [ "$http_code" = "200" ]; then
  echo "Step 4: Parsing results..."
  
  # Extract metrics using grep (jq-free method)
  processed=$(echo "$body" | grep -oP '"processed":\s*\K\d+' || echo "0")
  successful=$(echo "$body" | grep -oP '"successful":\s*\K\d+' || echo "0")
  failed=$(echo "$body" | grep -oP '"failed":\s*\K\d+' || echo "0")
  
  echo "=== Mint Worker Results ==="
  echo "Total processed: $processed"
  echo "Successful: $successful"
  echo "Failed: $failed"
  echo ""
  
  echo "✅ Workflow test PASSED"
  exit 0
else
  echo "Step 4: Handling failures..."
  echo "=== Mint Worker Failed ==="
  echo "HTTP Code: $http_code"
  echo "Response: $body"
  echo ""
  
  echo "❌ Workflow test FAILED"
  exit 1
fi
