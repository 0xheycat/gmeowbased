#!/bin/bash
# Phase 9 - Vercel Environment Sync Script
# Syncs all variables from .env.local to Vercel (Production, Preview, Development)
# Run this after resolving Vercel fair use limit

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Vercel Environment Sync Script${NC}"
echo -e "${BLUE}Phase 9 - Complete Environment Update${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local not found!${NC}"
    exit 1
fi

# Check if vercel CLI is logged in
if ! vercel whoami &>/dev/null; then
    echo -e "${RED}Error: Not logged in to Vercel CLI${NC}"
    echo -e "${YELLOW}Run: vercel login${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will update ALL Vercel environment variables from .env.local${NC}"
echo -e "${YELLOW}Environments: Production, Preview, Development${NC}\n"

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

# Function to add/update environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    
    echo -e "${BLUE}Updating: ${var_name}${NC}"
    
    # Remove existing variable from all environments (ignore errors)
    vercel env rm "$var_name" production -y 2>/dev/null || true
    vercel env rm "$var_name" preview -y 2>/dev/null || true
    vercel env rm "$var_name" development -y 2>/dev/null || true
    
    # Add new value to all environments
    echo "$var_value" | vercel env add "$var_name" production preview development
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Updated: ${var_name}${NC}\n"
        return 0
    else
        echo -e "${RED}✗ Failed: ${var_name}${NC}\n"
        return 1
    fi
}

# Counter for stats
total=0
success=0
failed=0

echo -e "\n${BLUE}Starting environment sync...${NC}\n"

# Read .env.local and process each variable
while IFS= read -r line; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Extract variable name and value
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"
        
        # Remove surrounding quotes if present
        var_value="${var_value#\"}"
        var_value="${var_value%\"}"
        var_value="${var_value#\'}"
        var_value="${var_value%\'}"
        
        ((total++))
        
        if update_env_var "$var_name" "$var_value"; then
            ((success++))
        else
            ((failed++))
        fi
        
        # Rate limiting - wait between updates to avoid hitting limits
        sleep 2
    fi
done < .env.local

# Summary
echo -e "\n${BLUE}=================================${NC}"
echo -e "${BLUE}Sync Summary${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}✓ Successfully updated: ${success}/${total}${NC}"
if [ $failed -gt 0 ]; then
    echo -e "${RED}✗ Failed: ${failed}/${total}${NC}"
fi
echo -e "${BLUE}=================================${NC}\n"

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}All environment variables synced successfully!${NC}"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "1. Test deployment: ${BLUE}vercel deploy${NC}"
    echo -e "2. Production deployment: ${BLUE}vercel deploy --prod${NC}\n"
else
    echo -e "${YELLOW}Some variables failed to sync. Check errors above.${NC}"
    echo -e "${YELLOW}You may need to update them manually in Vercel Dashboard.${NC}\n"
fi
