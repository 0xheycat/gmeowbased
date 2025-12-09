#!/bin/bash
#################################################################################
# Clear MCP Cache Script
# Removes all MCP cache, logs, and sync data from VS Code
# Use this when you need to reset MCP servers to fresh state
#################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  MCP Cache Cleanup Tool${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to remove directory/files
remove_item() {
    local path=$1
    local description=$2
    
    if [ -e "$path" ]; then
        rm -rf "$path" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Removed: $description"
        else
            echo -e "${RED}✗${NC} Failed to remove: $description"
        fi
    else
        echo -e "${YELLOW}○${NC} Not found: $description"
    fi
}

echo -e "${BLUE}Cleaning workspace MCP cache...${NC}"
remove_item ".vscode/.mcp-cache" "Workspace MCP cache"
remove_item ".vscode/mcp-cache" "Workspace MCP cache (alt)"

echo ""
echo -e "${BLUE}Cleaning global VS Code MCP data...${NC}"
remove_item "$HOME/.config/Code/User/mcp" "User MCP directory"
remove_item "$HOME/.config/Code/User/sync/mcp" "MCP sync folder"

echo ""
echo -e "${BLUE}Cleaning MCP logs...${NC}"
# Remove all MCP server logs
find "$HOME/.config/Code/logs" -type f -name "mcpServer*" -delete 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Removed: MCP server logs" || \
    echo -e "${YELLOW}○${NC} No MCP server logs found"

# Remove all MCP exthost logs
find "$HOME/.config/Code/logs" -type d -path "*/exthost/*" -exec rm -rf {} + 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Removed: MCP exthost logs" || \
    echo -e "${YELLOW}○${NC} No MCP exthost logs found"

echo ""
echo -e "${BLUE}Cleaning alternative cache locations...${NC}"
remove_item "$HOME/.vscode/mcp-cache" "Home .vscode MCP cache"
remove_item "$HOME/.local/share/Code/mcp" "Local share MCP data"

# Optional: Clean specific MCP server caches
if [ -d "$HOME/.cache" ]; then
    echo ""
    echo -e "${BLUE}Cleaning MCP server caches...${NC}"
    find "$HOME/.cache" -type d -name "*mcp*" -o -name "*blockscout*" 2>/dev/null | while read dir; do
        if [ -d "$dir" ]; then
            rm -rf "$dir" 2>/dev/null
            echo -e "${GREEN}✓${NC} Removed: $(basename "$dir")"
        fi
    done
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ MCP cache cleanup completed!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Reload VS Code window (Ctrl+Shift+P → 'Developer: Reload Window')"
echo "2. All MCP servers will reinitialize with fresh state"
echo ""
