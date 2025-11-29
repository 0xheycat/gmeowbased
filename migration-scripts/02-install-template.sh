#!/bin/bash

# Template Migration - Install Tailwick Template
# Copies Tailwick structure while preserving critical code

set -e

echo "🚀 Installing Tailwick template..."

TEMPLATE_PATH="planning/template/Tailwick v2.0 HTML/Nextjs-TS"

# Verify template exists
if [ ! -d "$TEMPLATE_PATH" ]; then
  echo "❌ Template not found: $TEMPLATE_PATH"
  exit 1
fi

echo "✅ Template found: $TEMPLATE_PATH"

# Create temporary directory
TEMP_DIR="temp-template"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📦 Copying template to temporary directory..."
cp -r "$TEMPLATE_PATH"/* "$TEMP_DIR/"

# Create src/ directory for new structure
echo "📂 Creating new src/ directory..."
mkdir -p src

# Copy template structure (but don't overwrite yet)
echo "📂 Copying template components..."
cp -r "$TEMP_DIR/src/components" src/ 2>/dev/null || echo "⚠️  No components in template"
cp -r "$TEMP_DIR/src/assets" src/ 2>/dev/null || echo "⚠️  No assets in template"
cp -r "$TEMP_DIR/src/helpers" src/ 2>/dev/null || echo "⚠️  No helpers in template"
cp -r "$TEMP_DIR/src/utils" src/ 2>/dev/null || echo "⚠️  No utils in template"

# Preserve existing code
echo "💾 Preserving existing API routes..."
if [ -d "app/api" ]; then
  mkdir -p src/app/api
  cp -r app/api/* src/app/api/
  echo "✅ API routes preserved"
fi

echo "💾 Preserving existing business logic..."
if [ -d "lib" ]; then
  mkdir -p src/lib-preserved
  cp -r lib/* src/lib-preserved/
  echo "✅ Business logic preserved in src/lib-preserved/"
fi

echo "💾 Preserving smart contracts..."
if [ -d "contract" ]; then
  mkdir -p src/contract-preserved
  cp -r contract/* src/contract-preserved/
  echo "✅ Smart contracts preserved in src/contract-preserved/"
fi

echo "💾 Preserving ABI files..."
if [ -d "lib/abi" ]; then
  mkdir -p src/lib-preserved/abi
  cp -r lib/abi/* src/lib-preserved/abi/
  echo "✅ ABI files preserved"
fi

# Copy template configs (we'll merge manually)
echo "📄 Copying template configs..."
cp "$TEMP_DIR/tsconfig.json" tsconfig.json.new 2>/dev/null || true
cp "$TEMP_DIR/next.config.ts" next.config.ts.new 2>/dev/null || true
cp "$TEMP_DIR/postcss.config.mjs" postcss.config.mjs.new 2>/dev/null || true
cp "$TEMP_DIR/eslint.config.mjs" eslint.config.mjs.new 2>/dev/null || true

echo ""
echo "✅ Template installation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review new config files:"
echo "   - tsconfig.json.new"
echo "   - next.config.ts.new"
echo "   - postcss.config.mjs.new"
echo ""
echo "2. Merge package.json dependencies:"
echo "   node migration-scripts/merge-package-json.js"
echo ""
echo "3. Install dependencies:"
echo "   npm install"
echo ""
echo "4. Start building new structure:"
echo "   - Create src/app/layout.tsx (merge with template)"
echo "   - Create src/components/layouts/"
echo "   - Migrate components one by one"
echo ""
echo "📁 Preserved Code Locations:"
echo "   - API: src/app/api/"
echo "   - Business Logic: src/lib-preserved/"
echo "   - Smart Contracts: src/contract-preserved/"
echo ""
