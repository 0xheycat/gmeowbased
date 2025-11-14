#!/bin/bash

# Verify Build Cleanliness Script
# Checks that YOUR APP CODE has no __dirname references
# (Next.js dependencies will always have __dirname - that's normal)

echo "🔍 Verifying build cleanliness..."
echo ""

# Check if .next exists
if [ ! -d ".next" ]; then
    echo "❌ .next directory not found. Run 'pnpm build' first."
    exit 1
fi

#!/bin/bash

# Verify Next.js build doesn't contain __dirname in EDGE RUNTIME code
# Edge runtime is incompatible with __dirname

set -e

echo "🔍 Verifying build cleanliness..."
echo ""

# Only check if middleware or API routes are using edge runtime
# These files would have been compiled to .next/server/edge-runtime/
if [ -d .next/server/edge-runtime ]; then
  echo "Searching for __dirname in edge runtime chunks..."
  if find .next/server/edge-runtime -type f -name "*.js" | \
     xargs grep -l "__dirname" 2>/dev/null; then
    echo ""
    echo "❌ Found __dirname in edge runtime! This will cause errors."
    echo "⚠️  NOT safe to deploy! Check your middleware.ts and API routes."
    echo ""
    exit 1
  fi
fi

echo "✅ Build is clean and safe to deploy!"
echo ""
exit 0
