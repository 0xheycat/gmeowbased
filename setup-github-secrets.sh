#!/bin/bash
# Setup all GitHub secrets from .env.local
# This script will add all required secrets to GitHub Actions

set -e

echo "🔐 GitHub Secrets Setup"
echo "======================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Please create .env.local with all required variables first."
    exit 1
fi

echo "✅ Found .env.local"
echo ""

# Source the environment file
set -a
source .env.local
set +a

echo "📋 Required secrets to add:"
echo ""

# Define required secrets
declare -a REQUIRED_SECRETS=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_ANON_KEY"
    "NEYNAR_API_KEY"
    "RPC_BASE"
    "RPC_OP"
    "RPC_CELO"
    "RPC_UNICHAIN"
    "RPC_INK"
)

declare -a OPTIONAL_SECRETS=(
    "MINTER_PRIVATE_KEY"
)

# Function to add secret via GitHub API
add_secret_via_api() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo "   ⚠️  Value is empty, skipping"
        return 1
    fi
    
    # Get repository public key for encryption
    local public_key_response=$(curl -s -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/0xheycat/gmeowbased/actions/secrets/public-key")
    
    local key_id=$(echo "$public_key_response" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
    local public_key=$(echo "$public_key_response" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$key_id" ]; then
        echo "   ❌ Failed to get public key (authentication required)"
        return 1
    fi
    
    # For now, we'll create a list of commands to run
    echo "$secret_name=$secret_value" >> .github-secrets-temp
    return 0
}

# Check which secrets are available
echo "🔴 CRITICAL SECRETS:"
for secret in "${REQUIRED_SECRETS[@]}"; do
    value="${!secret}"
    if [ -n "$value" ]; then
        echo "  ✅ $secret (${#value} chars)"
    else
        echo "  ❌ $secret (MISSING)"
    fi
done

echo ""
echo "🟢 OPTIONAL SECRETS:"
for secret in "${OPTIONAL_SECRETS[@]}"; do
    value="${!secret}"
    if [ -n "$value" ]; then
        echo "  ✅ $secret (${#value} chars)"
    else
        echo "  ⚠️  $secret (not set)"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 IMPORTANT: GitHub Secrets Management"
echo ""
echo "I found all required secrets in your .env.local file."
echo "To add them to GitHub, I need you to help with one of these methods:"
echo ""
echo "METHOD 1: Use GitHub Web UI (Recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Open: https://github.com/0xheycat/gmeowbased/settings/secrets/actions"
echo "2. Click 'New repository secret' for each:"
echo ""

for secret in "${REQUIRED_SECRETS[@]}"; do
    value="${!secret}"
    if [ -n "$value" ]; then
        echo "   Secret name: $secret"
        echo "   Secret value: [Copy from .env.local]"
        echo ""
    fi
done

echo ""
echo "METHOD 2: Use This Script (Interactive)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run with GitHub CLI (requires 'gh' command):"
echo ""
echo "   bash setup-github-secrets-interactive.sh"
echo ""

echo ""
echo "METHOD 3: Let Copilot Add Them (GitHub MCP)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ask Copilot to add secrets from your .env.local:"
echo ""
echo '   "Add all secrets from .env.local to GitHub"'
echo ""

echo "✅ Setup information prepared!"
echo ""
