#!/bin/bash
# Quick cleanup script for exposed secrets

echo "🚨 SECURITY CLEANUP"
echo "===================="
echo ""
echo "Step 1: Removing exposed file from current git..."
git rm -f add-github-secrets.py 2>/dev/null || echo "Already removed"
git rm -f .github-secrets-values.txt 2>/dev/null || echo "Not tracked (good)"

echo ""
echo "Step 2: Checking COPY-PASTE-SECRETS.sh for hardcoded secrets..."
if grep -q "eyJ" COPY-PASTE-SECRETS.sh 2>/dev/null; then
    echo "⚠️  WARNING: COPY-PASTE-SECRETS.sh contains secrets!"
    git rm -f COPY-PASTE-SECRETS.sh
else
    echo "✅ COPY-PASTE-SECRETS.sh is safe (no hardcoded secrets)"
fi

echo ""
echo "Step 3: Committing removal..."
git commit -m "SECURITY: Remove all files with exposed secrets" 2>/dev/null || echo "Nothing to commit"

echo ""
echo "Step 4: Pushing to GitHub..."
git push origin main

echo ""
echo "⚠️  IMPORTANT: Secrets are still in git HISTORY!"
echo ""
echo "To completely remove from history, run:"
echo "  pip install git-filter-repo"
echo "  git filter-repo --path add-github-secrets.py --invert-paths"
echo "  git push origin main --force"
echo ""
