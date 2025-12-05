#!/bin/bash
# Extract animation/motion icons from template

SOURCE_DIR="planning/template/music/common/resources/client/icons/material"
TARGET_DIR="components/icons/material"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Animation Icons Extraction ===${NC}"
echo ""

# Animation & Motion icons
ANIMATION_ICONS=(
  "Animation"
  "AutoAwesomeMotion"
  "MotionPhotosAuto"
  "MotionPhotosOff"
  "SlowMotionVideo"
  "Airplay"
  "SmartDisplay"
  "TapAndPlay"
)

# Rotation & Flip icons
ROTATION_ICONS=(
  "Rotate90DegreesCcw"
  "Rotate90DegreesCw"
  "RotateLeft"
  "RotateRight"
  "CropRotate"
  "Flip"
  "FlipCameraAndroid"
  "FlipCameraIos"
  "FlipToBack"
  "FlipToFront"
  "TextRotateUp"
  "TextRotateVertical"
)

# Play & Replay icons
PLAYBACK_ICONS=(
  "PlayArrow"
  "PlayCircle"
  "PlayCircleFilled"
  "PlayCircleFilledWhite"
  "PlayCircleOutline"
  "PlayDisabled"
  "PlayForWork"
  "PlayLesson"
  "Replay"
  "Replay10"
  "Replay30"
  "Replay5"
  "ReplayCircleFilled"
)

# Playlist icons
PLAYLIST_ICONS=(
  "PlaylistAdd"
  "PlaylistAddCheck"
  "PlaylistAddCheckCircle"
  "PlaylistAddCircle"
  "PlaylistPlay"
  "PlaylistRemove"
  "QueuePlayNext"
  "FeaturedPlayList"
  "LocalPlay"
)

# Combine all icons
ALL_ICONS=("${ANIMATION_ICONS[@]}" "${ROTATION_ICONS[@]}" "${PLAYBACK_ICONS[@]}" "${PLAYLIST_ICONS[@]}")

echo -e "${BLUE}Extracting ${#ALL_ICONS[@]} animation-related icons...${NC}"
echo ""

COPIED=0
SKIPPED=0
MISSING=0

for icon in "${ALL_ICONS[@]}"; do
  SOURCE_FILE="$SOURCE_DIR/${icon}.tsx"
  TARGET_FILE="$TARGET_DIR/${icon}.tsx"
  
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
    echo -e "${YELLOW}?${NC} $icon.tsx (not found)"
    ((MISSING++))
  fi
done

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}Copied: $COPIED icons${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED icons (already exist)${NC}"
if [ $MISSING -gt 0 ]; then
  echo -e "${YELLOW}Missing: $MISSING icons (not in template)${NC}"
fi
echo ""
echo -e "${GREEN}Animation icons extracted!${NC}"
echo ""
echo -e "${BLUE}Categories:${NC}"
echo "- Animation & Motion: ${#ANIMATION_ICONS[@]} icons"
echo "- Rotation & Flip: ${#ROTATION_ICONS[@]} icons"
echo "- Play & Replay: ${#PLAYBACK_ICONS[@]} icons"
echo "- Playlist: ${#PLAYLIST_ICONS[@]} icons"

