#!/bin/bash

# CSS Migration Audit Script
# Finds all inline styles and ranks components by severity

echo "🔍 GMEOWBASED CSS MIGRATION AUDIT"
echo "=================================="
echo ""

# Count inline styles by file
echo "📊 Top 20 Components with Inline Styles:"
echo "----------------------------------------"

grep -r "style={{" --include="*.tsx" --include="*.jsx" app/ components/ | \
  cut -d: -f1 | \
  sort | \
  uniq -c | \
  sort -rn | \
  head -20 | \
  awk '{printf "%-5s %s\n", $1, $2}'

echo ""
echo "📊 Components with <style> tags:"
echo "----------------------------------------"
grep -r "<style" --include="*.tsx" --include="*.jsx" app/ components/ | \
  cut -d: -f1 | \
  sort | \
  uniq

echo ""
echo "📊 Components with template literal classNames:"
echo "----------------------------------------"
grep -r 'className=.*\${' --include="*.tsx" --include="*.jsx" app/ components/ | \
  cut -d: -f1 | \
  sort | \
  uniq -c | \
  sort -rn | \
  head -10

echo ""
echo "✅ AUDIT COMPLETE"
echo ""
echo "Next Steps:"
echo "1. Review top 20 components above"
echo "2. Start with components having 10+ inline styles"
echo "3. Use foundation CSS classes from styles/gmeowbased-foundation.css"
echo "4. Test each component after refactoring"
