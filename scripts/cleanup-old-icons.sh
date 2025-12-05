#!/bin/bash

# Icon System Cleanup Script
# Removes old custom icon files (now using @mui/icons-material)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../components/icons/material"

echo "🧹 Icon System Cleanup"
echo "====================="
echo ""
echo "This script will remove old custom icon files that are no longer needed."
echo "Icons are now powered by @mui/icons-material!"
echo ""

# Count files
OLD_ICONS=$(find "$ICONS_DIR" -name "*.tsx" -not -name "index.tsx" | wc -l)
echo "Found $OLD_ICONS old custom icon files to clean up"
echo ""

# Ask for confirmation
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

# Create backup
BACKUP_DIR="$ICONS_DIR/OLD_CUSTOM_ICONS_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Creating backup in: $BACKUP_DIR"

# Move old icon files to backup
find "$ICONS_DIR" -maxdepth 1 -name "*.tsx" -not -name "index.tsx" -exec mv {} "$BACKUP_DIR/" \;

echo "✅ Moved $OLD_ICONS files to backup"
echo ""

# Keep essential files
KEPT_FILES=(
    "index.ts"
    "../svg-icon.tsx"
    "../create-svg-icon.tsx"
)

echo "📝 Kept essential files:"
for file in "${KEPT_FILES[@]}"; do
    if [ -f "$ICONS_DIR/$file" ]; then
        echo "  ✅ $file"
    fi
done
echo ""

# Summary
echo "🎉 Cleanup Complete!"
echo ""
echo "Summary:"
echo "  - Removed: $OLD_ICONS old custom icon files"
echo "  - Backup: $BACKUP_DIR"
echo "  - Kept: index.ts, svg-icon.tsx, create-svg-icon.tsx"
echo ""
echo "Your code still works! All imports use @mui/icons-material now."
echo ""
echo "To restore old files (if needed):"
echo "  mv $BACKUP_DIR/* $ICONS_DIR/"
echo ""
