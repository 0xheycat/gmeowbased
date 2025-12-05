#!/bin/bash
# Extract useful icons from template to components/icons

SOURCE_DIR="planning/template/music/common/resources/client/icons"
TARGET_DIR="components/icons"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Icon Extraction Script ===${NC}"
echo ""

# Check if source exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${YELLOW}Source directory not found: $SOURCE_DIR${NC}"
  exit 1
fi

# 1. Copy create-svg-icon.tsx if not exists
if [ ! -f "$TARGET_DIR/create-svg-icon.tsx" ]; then
  echo -e "${GREEN}Copying create-svg-icon.tsx...${NC}"
  cp "$SOURCE_DIR/create-svg-icon.tsx" "$TARGET_DIR/"
else
  echo -e "${YELLOW}create-svg-icon.tsx already exists, skipping${NC}"
fi

# 2. Create material subdirectory if not exists
mkdir -p "$TARGET_DIR/material"

# 3. High-priority icons to copy
PRIORITY_ICONS=(
  "Add"
  "Remove"
  "Edit"
  "Delete"
  "Search"
  "Settings"
  "Share"
  "Download"
  "Upload"
  "Save"
  "ContentCopy"
  "Close"
  "Menu"
  "MoreVert"
  "MoreHoriz"
  "Refresh"
  "Info"
  "Warning"
  "Error"
  "Check"
  "Home"
  "NavigateNext"
  "NavigateBefore"
  "FirstPage"
  "LastPage"
  "Visibility"
  "VisibilityOff"
  "AttachFile"
  "Send"
  "Reply"
  "Favorite"
  "Star"
  "Folder"
  "File"
  "Image"
  "ShoppingCart"
  "Payment"
  "Person"
  "Group"
  "Notifications"
  "Dashboard"
)

echo ""
echo -e "${BLUE}Copying ${#PRIORITY_ICONS[@]} priority Material icons...${NC}"

COPIED=0
SKIPPED=0

for icon in "${PRIORITY_ICONS[@]}"; do
  SOURCE_FILE="$SOURCE_DIR/material/${icon}.tsx"
  TARGET_FILE="$TARGET_DIR/material/${icon}.tsx"
  
  if [ -f "$SOURCE_FILE" ]; then
    if [ ! -f "$TARGET_FILE" ]; then
      cp "$SOURCE_FILE" "$TARGET_FILE"
      echo -e "${GREEN}✓${NC} $icon.tsx"
      ((COPIED++))
    else
      echo -e "${YELLOW}⊘${NC} $icon.tsx (already exists)"
      ((SKIPPED++))
    fi
  else
    echo -e "${YELLOW}?${NC} $icon.tsx (not found in template)"
  fi
done

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}Copied: $COPIED icons${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED icons${NC}"
echo ""
echo -e "${GREEN}Done! Icons extracted to $TARGET_DIR${NC}"

