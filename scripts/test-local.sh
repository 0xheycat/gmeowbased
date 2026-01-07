#!/bin/bash
# Comprehensive local validation script - tests build and all active pages

set -e  # Exit on error

# Cleanup function to ensure server is killed
cleanup() {
  echo "🧹 Cleaning up..."
  # Kill all Next.js processes
  pkill -f "next start" 2>/dev/null || true
  lsof -ti:3002 | xargs kill -9 2>/dev/null || true
  sleep 2
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo "🔧 1/5 Cleaning previous build and processes..."
rm -rf .next
cleanup

echo "📦 2/5 Building project..."
if ! pnpm run build > /tmp/build.log 2>&1; then
  echo "❌ Build failed!"
  tail -50 /tmp/build.log
  exit 1
fi
echo "✅ Build succeeded"

echo "🚀 3/5 Starting production server..."
PORT=3002 pnpm run start > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server with timeout
for i in {1..20}; do
  if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ Server started (${i}s)"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "❌ Server failed to start after 20s"
    cat /tmp/server.log
    exit 1
  fi
  sleep 1
done

echo "🧪 4/5 Testing critical pages..."
ERRORS=0

# Test homepage
if ! curl -s -f http://localhost:3002 > /dev/null; then
  echo "❌ Homepage (/) failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Homepage (/) OK"
fi

# Test API health
if ! curl -s -f http://localhost:3002/api/health > /dev/null; then
  echo "❌ /api/health failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ /api/health OK"
fi

# Test other critical API routes
API_ROUTES=(
  "/api/quests"
  "/api/guild/leaderboard"
  "/api/referral/leaderboard"
  "/api/viral/leaderboard"
)

for route in "${API_ROUTES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002$route)
  # Accept 200, 400 (validation error), or 401 (auth required)
  if [ "$status" = "200" ] || [ "$status" = "400" ] || [ "$status" = "401" ]; then
    echo "✅ $route OK ($status)"
  else
    echo "❌ $route failed ($status)"
    ERRORS=$((ERRORS + 1))
  fi
done

# Test critical pages
PAGES=(
  "/dashboard"
  "/quests"
  "/guild"
  "/leaderboard"
  "/referral"
)

for page in "${PAGES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002$page)
  if [ "$status" = "200" ]; then
    echo "✅ $page OK"
  else
    echo "❌ $page failed ($status)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo "🔍 5/6 Checking webpack bundle..."

# Check for util.deprecate error in bundle
if curl -s http://localhost:3002 | grep -q "webpack-"; then
  echo "✅ Webpack bundle generated"
else
  echo "❌ No webpack bundle found"
  ERRORS=$((ERRORS + 1))
fi

echo "🌐 6/6 Testing browser JavaScript errors..."

# Run browser test to catch JavaScript runtime errors
if node scripts/browser-test.mjs http://localhost:3002; then
  echo "✅ No critical JavaScript errors"
else
  echo "❌ JavaScript errors detected in browser"
  ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All tests passed! Safe to deploy."
  exit 0
else
  echo "❌ $ERRORS test(s) failed. Check logs before deploying."
  echo "Server logs in /tmp/server.log"
  exit 1
fi
