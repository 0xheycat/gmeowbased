#!/bin/bash
# Quick script to add GitHub secrets
# Requires GitHub CLI: https://cli.github.com/

echo "🔐 GitHub Secrets Setup"
echo "======================="
echo ""
echo "This script will help you add secrets to GitHub Actions"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not installed"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "🔑 Not authenticated. Running: gh auth login"
    gh auth login
fi

echo "✅ GitHub CLI ready"
echo ""

# Function to add secret
add_secret() {
    local name=$1
    local description=$2
    
    echo "📝 Adding: $name"
    echo "   $description"
    read -p "   Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        if gh secret set "$name" --body "$value" 2>/dev/null; then
            echo "   ✅ Added successfully"
        else
            echo "   ⚠️  Failed to add (may already exist)"
        fi
    else
        echo "   ⏭️  Skipped"
    fi
    echo ""
}

echo "🚀 Adding Supabase Secrets"
echo "=========================="
add_secret "SUPABASE_URL" "Supabase project URL (https://xxx.supabase.co)"
add_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key (eyJ...)"
add_secret "SUPABASE_ANON_KEY" "Supabase anon key (eyJ...)"

echo "🚀 Adding Neynar Secret"
echo "======================="
add_secret "NEYNAR_API_KEY" "Neynar API key for bot & notifications"

echo "🚀 Adding RPC Endpoints"
echo "======================="
add_secret "RPC_BASE" "Base RPC (https://base-mainnet.g.alchemy.com/v2/...)"
add_secret "RPC_OP" "Optimism RPC (https://opt-mainnet.g.alchemy.com/v2/...)"
add_secret "RPC_CELO" "Celo RPC (https://forno.celo.org)"
add_secret "RPC_UNICHAIN" "Unichain RPC (https://mainnet.unichain.org)"
add_secret "RPC_INK" "Ink RPC (https://ink-mainnet.g.alchemy.com/v2/...)"

echo "🚀 Optional: Badge Minting"
echo "==========================="
add_secret "MINTER_PRIVATE_KEY" "Private key for badge minting (0x...)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 View all secrets:"
echo "   gh secret list"
echo ""
echo "🧪 Test workflows:"
echo "   gh workflow run badge-minting.yml"
echo "   gh workflow run gm-reminders.yml -f dry_run=true"
echo ""
