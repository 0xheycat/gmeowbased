#!/bin/bash
echo "=== CHECKING VERCEL DEPLOYMENT STATUS ==="
echo ""
echo "Latest commits pushed:"
git log --oneline -3
echo ""
echo "Last push time:"
git log -1 --format="%cr" origin/main
echo ""
echo "Current production manifest:"
curl -s https://gmeowhq.art/.well-known/farcaster.json | jq -r '.miniapp.version + " - buttonTitle: " + (.miniapp.buttonTitle // "MISSING")'
echo ""
echo "Expected after deployment:"
echo "1.1 - buttonTitle: 👋 Say GM"
echo ""
echo "⏳ Vercel typically takes 4-5 minutes to build and deploy"
echo "⏳ Commit 270325a was pushed $(git log -1 --format='%cr' 270325a)"
echo ""
echo "To check deployment status:"
echo "1. Visit: https://vercel.com/your-project/deployments"
echo "2. Look for commit: 270325a"
echo "3. Wait for 'Ready' status"
