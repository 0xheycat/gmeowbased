#!/bin/bash
# FINAL STEP: Copy and paste these commands to add all GitHub secrets

echo "🚀 Quick Setup: Copy these commands to your terminal"
echo "===================================================="
echo ""
echo "These commands will add all required secrets to GitHub Actions."
echo "Make sure you're in the project directory first!"
echo ""
echo "# Navigate to project"
echo "cd /home/heycat/Desktop/2025/Gmeowbased"
echo ""
echo "# Install GitHub CLI if needed (one-time setup)"
echo "# sudo snap install gh"
echo "# gh auth login"
echo ""
echo "# Add all secrets (copy all lines below)"
echo ""

# Read secrets from file and generate gh commands
cat << 'EOF'
gh secret set SUPABASE_URL --body 'https://bgnerptdanbgvcjentbt.supabase.co'

gh secret set SUPABASE_SERVICE_ROLE_KEY --body 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE2NzAzOSwiZXhwIjoyMDc2NzQzMDM5fQ.7jg7jDBZYBplAfbZlz7rsLRG4K2dQ27QZsv79nnioeM'

gh secret set SUPABASE_ANON_KEY --body 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjcwMzksImV4cCI6MjA3Njc0MzAzOX0.XyXD7nJ21saJaJEzxfAReT8kpZY6yLhYq3_1sgbyiZM'

gh secret set NEYNAR_API_KEY --body '76C0C613-378F-4562-9512-600DD84EB085'

gh secret set RPC_BASE --body 'https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'

gh secret set RPC_OP --body 'https://opt-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'

gh secret set RPC_CELO --body 'https://celo-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'

gh secret set RPC_UNICHAIN --body 'https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'

gh secret set RPC_INK --body 'https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'

gh secret set MINTER_PRIVATE_KEY --body '0x9abe1d6ae90d3fc0625d7a8dfc4866f4b08d606c20a5f6b4a0bbd62894c82e6b'

EOF

echo ""
echo "# Verify secrets were added"
echo "gh secret list"
echo ""
echo "# Test a workflow manually"
echo "gh workflow run badge-minting.yml"
echo ""
echo "✅ After running these commands, your GitHub Actions will be fully configured!"
