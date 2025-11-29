#!/bin/bash

# GmeowMultichain Contract Splitter
# This script helps split the monolithic contract into modular components

echo "🔨 Starting GmeowMultichain Modularization..."
echo ""

cd "$(dirname "$0")"

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p contract/modules
mkdir -p contract/interfaces
mkdir -p scripts/deployment/modular

echo "✅ Directory structure created"
echo ""

# Check contract size before split
echo "📊 Analyzing current contract..."
if [ -f "contract/GmeowMultiChain.sol" ]; then
    LINES=$(wc -l < contract/GmeowMultiChain.sol)
    SIZE=$(stat -f%z contract/GmeowMultiChain.sol 2>/dev/null || stat -c%s contract/GmeowMultiChain.sol)
    echo "  - Lines: $LINES"
    echo "  - File Size: $(echo "scale=2; $SIZE/1024" | bc)KB"
fi
echo ""

# Compile to check bytecode size
echo "🔧 Compiling current contract to check bytecode size..."
solc contract/GmeowMultiChain.sol \
    @openzeppelin=node_modules/@openzeppelin \
    --base-path . \
    --include-path node_modules \
    --bin \
    --optimize \
    --optimize-runs 200 \
    --via-ir \
    -o build/ \
    --overwrite 2>&1 | grep -i "code size\|bytes"

echo ""
echo "📦 Modules to be created:"
echo "  1. GmeowCore.sol         - Quest & Points System"
echo "  2. GmeowReferrals.sol    - Referral System"
echo "  3. GmeowGuilds.sol       - Guild System"
echo "  4. GmeowNFTManager.sol   - NFT Minting Logic"
echo "  5. GmeowMigration.sol    - Migration System"
echo ""

echo "✅ Analysis complete!"
echo ""
echo "Next steps:"
echo "1. Review MODULAR-ARCHITECTURE.md for detailed plan"
echo "2. Implement each module with Slither fixes"
echo "3. Update deployment scripts"
echo "4. Run comprehensive tests"
echo ""
