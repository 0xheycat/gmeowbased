#!/bin/bash

# Deployment Test Script
# Tests deployment locally before mainnet

set -e

echo "=== Testing Gmeow Contract Deployment ==="
echo ""

# Check environment
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo "   Set with: export PRIVATE_KEY=your_private_key"
    exit 1
fi

if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  Warning: BASESCAN_API_KEY not set (verification will fail)"
    echo "   Set with: export BASESCAN_API_KEY=your_api_key"
fi

# Run deployment simulation
echo "1. Running deployment simulation (dry run)..."
forge script script/Deploy.sol --rpc-url base --private-key $PRIVATE_KEY

if [ $? -eq 0 ]; then
    echo "✅ Deployment simulation successful"
    echo ""
    echo "=== Ready to Deploy ==="
    echo "To deploy to Base mainnet:"
    echo ""
    echo "forge script script/Deploy.sol \\"
    echo "  --rpc-url base \\"
    echo "  --private-key \$PRIVATE_KEY \\"
    echo "  --broadcast \\"
    echo "  --verify \\"
    echo "  --etherscan-api-key \$BASESCAN_API_KEY"
    echo ""
    echo "⚠️  WARNING: This will deploy to mainnet and cost gas!"
else
    echo "❌ Deployment simulation failed"
    exit 1
fi
