#!/bin/bash
#
# Git pre-commit hook for documentation validation
# 
# Installation:
#   cp scripts/docs/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Not in a git repository"
  exit 0
fi

# Check if documentation files are being committed
DOCS_CHANGED=$(git diff --cached --name-only | grep -E '^docs/.*\.md$' || true)

if [ -z "$DOCS_CHANGED" ]; then
  echo "ℹ️  No documentation files changed, skipping validation"
  exit 0
fi

echo "📚 Documentation files changed:"
echo "$DOCS_CHANGED" | sed 's/^/   - /'
echo ""

# Validate links in changed files
echo "🔗 Validating markdown links..."

VALIDATION_FAILED=0

# Use tsx to run validation script
if command -v pnpm &> /dev/null; then
  if ! pnpm run docs:validate 2>&1 | grep -q "All links are valid"; then
    VALIDATION_FAILED=1
  fi
else
  echo "⚠️  Warning: pnpm not found, skipping link validation"
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
  echo ""
  echo "❌ Documentation validation failed!"
  echo ""
  echo "Found broken links in documentation. Please fix them before committing."
  echo ""
  echo "To see details, run:"
  echo "   pnpm run docs:validate"
  echo ""
  echo "To bypass this check (not recommended), use:"
  echo "   git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ Documentation validation passed!"
echo ""

exit 0
