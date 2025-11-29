#!/bin/bash
echo "=== VERCEL DEPLOYMENT DEBUG ==="
echo ""
echo "1. Local file (what should be deployed):"
cat public/.well-known/farcaster.json | jq -r '.accountAssociation.header' | base64 -d | jq -r '.type'

echo ""
echo "2. Production (what's actually live):"
curl -s https://gmeowhq.art/.well-known/farcaster.json | jq -r '.accountAssociation.header' | base64 -d | jq -r '.type'

echo ""
echo "3. Last commit time:"
git log -1 --format="%cr"

echo ""
echo "4. Checking deployment..."
echo "   Visit: https://vercel.com/deployments"
echo "   Look for: commit cfdcf66"
echo ""

echo "=== ISSUE IDENTIFIED ==="
echo "❌ Production still shows 'auth' type"
echo "✅ Local shows 'custody' type"
echo "⏳ Vercel may still be deploying OR needs cache clear"
echo ""
echo "SOLUTIONS:"
echo "1. Wait 2-3 more minutes for deployment"
echo "2. Force cache clear: Add ?v=$(date +%s) to URL"
echo "3. Check Vercel dashboard for deployment status"
echo "4. Verify no build errors in Vercel logs"
