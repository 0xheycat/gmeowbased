#!/bin/bash
# Quick RPC Endpoint Switcher
# Use when current RPC hits rate limits

RPC_ENDPOINTS=(
    "https://mainnet.base.org (Coinbase official)"
    "https://base.llamarpc.com (LlamaNodes)"
    "https://base-rpc.publicnode.com (PublicNode - higher limits)"
    "https://base-mainnet.public.blastapi.io (BlastAPI)"
)

echo "========================================="
echo "🔄 RPC ENDPOINT SWITCHER"
echo "========================================="
echo ""
echo "Available RPC endpoints:"
for i in "${!RPC_ENDPOINTS[@]}"; do
    echo "  $i) ${RPC_ENDPOINTS[$i]}"
done
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./switch-rpc.sh <index>"
    echo "Example: ./switch-rpc.sh 1  # Switch to LlamaNodes"
    echo ""
    echo "Current setting:"
    grep "RPC_ENDPOINT_INDEX" .env 2>/dev/null || echo "  Not set (using default: 0)"
    exit 0
fi

INDEX=$1

if [ "$INDEX" -lt 0 ] || [ "$INDEX" -gt 3 ]; then
    echo "❌ Invalid index. Use 0-3."
    exit 1
fi

echo "🔄 Switching to RPC endpoint $INDEX: ${RPC_ENDPOINTS[$INDEX]}"
echo ""

# Update or add RPC_ENDPOINT_INDEX in .env
if grep -q "^RPC_ENDPOINT_INDEX=" .env 2>/dev/null; then
    sed -i "s/^RPC_ENDPOINT_INDEX=.*/RPC_ENDPOINT_INDEX=$INDEX/" .env
else
    echo "" >> .env
    echo "# RPC endpoint selector (0-3)" >> .env
    echo "RPC_ENDPOINT_INDEX=$INDEX" >> .env
fi

echo "✅ .env updated with RPC_ENDPOINT_INDEX=$INDEX"
echo ""
echo "⚠️  Restart processor for changes to take effect:"
echo "   kill \$(cat processor.pid 2>/dev/null) 2>/dev/null"
echo "   npm run process > reindex.log 2>&1 &"
echo "   echo \$! > processor.pid"
echo ""
