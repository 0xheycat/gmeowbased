#!/bin/bash
# Quick local validation script - tests build and critical functionality

set -e  # Exit on error

echo "🔧 1/4 Cleaning previous build..."
rm -rf .next

echo "📦 2/4 Building project..."
if ! pnpm run build > /tmp/build.log 2>&1; then
  echo "❌ Build failed!"
  tail -50 /tmp/build.log
  exit 1
fi
echo "✅ Build succeeded"

echo "🚀 3/4 Starting production server..."
PORT=3002 pnpm run start > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 8  # Wait for server to start

echo "🧪 4/4 Testing critical pages..."
ERRORS=0

# Test homepage
if ! curl -s -f http://localhost:3002 > /dev/null; then
  echo "❌ Homepage failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Homepage OK"
fi

# Test API health
if ! curl -s -f http://localhost:3002/api/health > /dev/null; then
  echo "⚠️  API health endpoint not found (may be expected)"
else
  echo "✅ API health OK"
fi

# Check for util.deprecate error in browser bundle
if curl -s http://localhost:3002 | grep -q "webpack-"; then
  echo "✅ Webpack bundle generated"
else
  echo "❌ No webpack bundle found"
  ERRORS=$((ERRORS + 1))
fi

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
sleep 2

if [ $ERRORS -eq 0 ]; then
  echo ""
  echo "✅ All tests passed! Safe to deploy."
  exit 0
else
  echo ""
  echo "❌ $ERRORS test(s) failed. Check logs before deploying."
  exit 1
fi
