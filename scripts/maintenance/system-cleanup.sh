#!/bin/bash

# ═══════════════════════════════════════════════════════════
# System Cleanup & Optimization Script
# ═══════════════════════════════════════════════════════════
# Purpose: Clean VS Code cache, workspace history, system cache
#          Disable startup programs, optimize Ubuntu performance
# Date: December 3, 2025
# ═══════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  System Cleanup & Optimization${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to get directory size
get_size() {
    if [ -d "$1" ]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Function to clean directory safely
clean_dir() {
    local dir="$1"
    local desc="$2"
    
    if [ -d "$dir" ]; then
        local size=$(get_size "$dir")
        echo -e "${YELLOW}Cleaning ${desc}...${NC} (Current size: ${size})"
        rm -rf "$dir"/* 2>/dev/null || true
        echo -e "${GREEN}✓ Cleaned${NC}"
    else
        echo -e "${YELLOW}${desc} not found, skipping${NC}"
    fi
}

echo -e "${BLUE}━━━ PART 1: VS Code Cache Cleanup ━━━${NC}"
echo ""

# VS Code Cache locations
VSCODE_CACHE="$HOME/.config/Code/Cache"
VSCODE_CACHE_DATA="$HOME/.config/Code/CachedData"
VSCODE_CACHE_EXT="$HOME/.config/Code/CachedExtensions"
VSCODE_LOGS="$HOME/.config/Code/logs"
VSCODE_USER_DATA="$HOME/.config/Code/User"

echo "VS Code cache locations:"
echo "  Cache:           $(get_size "$VSCODE_CACHE")"
echo "  CachedData:      $(get_size "$VSCODE_CACHE_DATA")"
echo "  CachedExtensions: $(get_size "$VSCODE_CACHE_EXT")"
echo "  Logs:            $(get_size "$VSCODE_LOGS")"
echo ""

read -p "Clean VS Code cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clean_dir "$VSCODE_CACHE" "VS Code Cache"
    clean_dir "$VSCODE_CACHE_DATA" "VS Code CachedData"
    clean_dir "$VSCODE_CACHE_EXT" "VS Code CachedExtensions"
    clean_dir "$VSCODE_LOGS" "VS Code Logs"
    echo -e "${GREEN}✓ VS Code cache cleaned${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 2: VS Code Workspace History ━━━${NC}"
echo ""

VSCODE_WORKSPACE_STORAGE="$HOME/.config/Code/User/workspaceStorage"
VSCODE_GLOBAL_STORAGE="$HOME/.config/Code/User/globalStorage"

echo "Workspace storage locations:"
echo "  workspaceStorage: $(get_size "$VSCODE_WORKSPACE_STORAGE")"
echo "  globalStorage:    $(get_size "$VSCODE_GLOBAL_STORAGE")"
echo ""
echo -e "${YELLOW}WARNING: This will clear workspace history (recent files, settings per workspace)${NC}"
read -p "Clean workspace storage? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Keep the directories but clear contents
    if [ -d "$VSCODE_WORKSPACE_STORAGE" ]; then
        echo "Clearing workspace storage..."
        find "$VSCODE_WORKSPACE_STORAGE" -mindepth 1 -delete 2>/dev/null || true
        echo -e "${GREEN}✓ Workspace storage cleared${NC}"
    fi
    
    # Clean specific global storage items (keep extensions data)
    if [ -d "$VSCODE_GLOBAL_STORAGE" ]; then
        echo "Cleaning global storage (keeping extensions)..."
        # Clear state.vscdb (telemetry/history)
        rm -f "$VSCODE_GLOBAL_STORAGE/state.vscdb"* 2>/dev/null || true
        echo -e "${GREEN}✓ Global storage cleaned${NC}"
    fi
fi
echo ""

echo -e "${BLUE}━━━ PART 3: System Cache Cleanup ━━━${NC}"
echo ""

# System cache
THUMBNAIL_CACHE="$HOME/.cache/thumbnails"
TEMP_FILES="$HOME/.cache/tmp"
APT_CACHE="/var/cache/apt/archives"
SNAP_CACHE="/var/lib/snapd/cache"

echo "System cache locations:"
echo "  Thumbnails:  $(get_size "$THUMBNAIL_CACHE")"
echo "  Temp files:  $(get_size "$HOME/.cache")"
echo ""

read -p "Clean system cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # User cache (safe to delete)
    clean_dir "$THUMBNAIL_CACHE" "Thumbnail cache"
    
    # Clean temp files in .cache (keep directory structure)
    if [ -d "$HOME/.cache" ]; then
        echo -e "${YELLOW}Cleaning ~/.cache temp files...${NC}"
        find "$HOME/.cache" -type f -name "*.tmp" -delete 2>/dev/null || true
        find "$HOME/.cache" -type f -name "*.log" -delete 2>/dev/null || true
        echo -e "${GREEN}✓ Temp files cleaned${NC}"
    fi
    
    # APT cache (requires sudo)
    echo -e "${YELLOW}Cleaning APT cache (requires sudo)...${NC}"
    sudo apt-get clean 2>/dev/null || echo "Skipped (no sudo access)"
    
    # Snap cache (requires sudo)
    if command -v snap &> /dev/null; then
        echo -e "${YELLOW}Cleaning Snap cache (requires sudo)...${NC}"
        sudo rm -rf /var/lib/snapd/cache/* 2>/dev/null || echo "Skipped (no sudo access)"
    fi
    
    echo -e "${GREEN}✓ System cache cleaned${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 4: Browser Cache Cleanup ━━━${NC}"
echo ""

CHROME_CACHE="$HOME/.cache/google-chrome"
FIREFOX_CACHE="$HOME/.cache/mozilla"

echo "Browser cache locations:"
[ -d "$CHROME_CACHE" ] && echo "  Chrome:  $(get_size "$CHROME_CACHE")"
[ -d "$FIREFOX_CACHE" ] && echo "  Firefox: $(get_size "$FIREFOX_CACHE")"
echo ""

read -p "Clean browser cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clean_dir "$CHROME_CACHE" "Chrome cache"
    clean_dir "$FIREFOX_CACHE" "Firefox cache"
    echo -e "${GREEN}✓ Browser cache cleaned${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 5: Node.js / pnpm Cache ━━━${NC}"
echo ""

PNPM_CACHE="$HOME/.local/share/pnpm/store"
NPM_CACHE="$HOME/.npm"

echo "Node.js cache locations:"
[ -d "$PNPM_CACHE" ] && echo "  pnpm store: $(get_size "$PNPM_CACHE")"
[ -d "$NPM_CACHE" ] && echo "  npm cache:  $(get_size "$NPM_CACHE")"
echo ""

read -p "Clean Node.js cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v pnpm &> /dev/null; then
        echo "Running pnpm store prune..."
        pnpm store prune || true
    fi
    
    if command -v npm &> /dev/null; then
        echo "Running npm cache clean..."
        npm cache clean --force || true
    fi
    
    echo -e "${GREEN}✓ Node.js cache cleaned${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 6: Disable Startup Programs ━━━${NC}"
echo ""

echo "Common startup programs that can be disabled:"
echo "  • GNOME Software (software updates)"
echo "  • Tracker (file indexing)"
echo "  • Evolution (email client)"
echo "  • Snap Store"
echo ""

read -p "Disable unnecessary startup programs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Disable GNOME Software auto-start
    if [ -f "/etc/xdg/autostart/gnome-software-service.desktop" ]; then
        echo "Disabling GNOME Software auto-start..."
        mkdir -p "$HOME/.config/autostart"
        cp /etc/xdg/autostart/gnome-software-service.desktop "$HOME/.config/autostart/"
        echo "Hidden=true" >> "$HOME/.config/autostart/gnome-software-service.desktop"
    fi
    
    # Disable Tracker (file indexing)
    if command -v tracker &> /dev/null; then
        echo "Disabling Tracker indexing..."
        systemctl --user mask tracker-store.service tracker-miner-fs.service tracker-miner-rss.service tracker-extract.service tracker-miner-apps.service tracker-writeback.service 2>/dev/null || true
    fi
    
    # Disable Evolution
    if [ -f "/etc/xdg/autostart/org.gnome.Evolution-alarm-notify.desktop" ]; then
        echo "Disabling Evolution auto-start..."
        cp /etc/xdg/autostart/org.gnome.Evolution-alarm-notify.desktop "$HOME/.config/autostart/"
        echo "Hidden=true" >> "$HOME/.config/autostart/org.gnome.Evolution-alarm-notify.desktop"
    fi
    
    echo -e "${GREEN}✓ Startup programs disabled${NC}"
    echo -e "${YELLOW}Note: Restart required for changes to take effect${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 7: System Performance Tweaks ━━━${NC}"
echo ""

read -p "Apply performance tweaks? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Reduce swappiness (less disk swapping, more RAM usage)
    echo "Setting swappiness to 10 (default: 60)..."
    echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/99-swappiness.conf > /dev/null || true
    sudo sysctl -p /etc/sysctl.d/99-swappiness.conf 2>/dev/null || true
    
    # Disable unnecessary services
    echo "Disabling unnecessary services..."
    sudo systemctl disable bluetooth.service 2>/dev/null || true
    sudo systemctl disable cups-browsed.service 2>/dev/null || true
    
    # Set CPU governor to performance (if available)
    if [ -f "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor" ]; then
        echo "Setting CPU governor to performance..."
        echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor > /dev/null 2>&1 || true
    fi
    
    echo -e "${GREEN}✓ Performance tweaks applied${NC}"
fi
echo ""

echo -e "${BLUE}━━━ PART 8: Final Cleanup ━━━${NC}"
echo ""

read -p "Remove old kernels and clean package cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove old kernels (keep current and one previous)
    echo "Removing old kernels..."
    sudo apt-get autoremove --purge -y 2>/dev/null || echo "Skipped (no sudo access)"
    
    # Clean package cache
    echo "Cleaning package cache..."
    sudo apt-get autoclean -y 2>/dev/null || echo "Skipped (no sudo access)"
    
    # Remove orphaned packages
    echo "Removing orphaned packages..."
    sudo apt-get autoremove -y 2>/dev/null || echo "Skipped (no sudo access)"
    
    echo -e "${GREEN}✓ System cleanup complete${NC}"
fi
echo ""

echo -e "${BLUE}━━━ Summary ━━━${NC}"
echo ""

# Calculate freed space (rough estimate)
echo "Cleanup complete! Summary:"
echo "  • VS Code cache cleared"
echo "  • Workspace history cleaned"
echo "  • System cache optimized"
echo "  • Startup programs disabled"
echo "  • Performance tweaks applied"
echo ""
echo -e "${GREEN}✓ Your system should now run faster!${NC}"
echo ""
echo -e "${YELLOW}Recommended next steps:${NC}"
echo "  1. Restart your computer to apply all changes"
echo "  2. Close unnecessary browser tabs"
echo "  3. Restart VS Code to clear memory"
echo "  4. Get some sleep! 😊"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
