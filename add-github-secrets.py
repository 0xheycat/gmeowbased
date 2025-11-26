#!/usr/bin/env python3
"""
Add GitHub secrets from .env.local file
Uses GitHub REST API to add secrets programmatically
"""

import os
import sys
import json
import base64
import subprocess
from pathlib import Path

# Required secrets mapping (name -> value from .env.local)
REQUIRED_SECRETS = {
    'SUPABASE_URL': 'https://bgnerptdanbgvcjentbt.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE2NzAzOSwiZXhwIjoyMDc2NzQzMDM5fQ.7jg7jDBZYBplAfbZlz7rsLRG4K2dQ27QZsv79nnioeM',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjcwMzksImV4cCI6MjA3Njc0MzAzOX0.XyXD7nJ21saJaJEzxfAReT8kpZY6yLhYq3_1sgbyiZM',
    'NEYNAR_API_KEY': '76C0C613-378F-4562-9512-600DD84EB085',
    'RPC_BASE': 'https://base-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
    'RPC_OP': 'https://opt-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
    'RPC_CELO': 'https://celo-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
    'RPC_UNICHAIN': 'https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
    'RPC_INK': 'https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe',
}

# Optional secret (for badge minting)
OPTIONAL_SECRETS = {
    'MINTER_PRIVATE_KEY': '0x9abe1d6ae90d3fc0625d7a8dfc4866f4b08d606c20a5f6b4a0bbd62894c82e6b',
}

def main():
    print("🔐 GitHub Secrets Configuration")
    print("=" * 50)
    print()
    
    print("📋 Secrets to be added:")
    print()
    print("🔴 CRITICAL SECRETS:")
    for name in REQUIRED_SECRETS:
        value = REQUIRED_SECRETS[name]
        print(f"  ✅ {name} ({len(value)} chars)")
    
    print()
    print("🟢 OPTIONAL SECRETS:")
    for name in OPTIONAL_SECRETS:
        value = OPTIONAL_SECRETS[name]
        print(f"  ✅ {name} ({len(value)} chars)")
    
    print()
    print("=" * 50)
    print()
    print("📝 To add these secrets to GitHub, use one of these methods:")
    print()
    print("METHOD 1: GitHub Web UI (Easiest)")
    print("-" * 50)
    print("1. Visit: https://github.com/0xheycat/gmeowbased/settings/secrets/actions")
    print("2. Click 'New repository secret'")
    print("3. Copy each secret name and value from above")
    print()
    
    print("METHOD 2: GitHub CLI (If installed)")
    print("-" * 50)
    print("Run these commands:")
    print()
    
    all_secrets = {**REQUIRED_SECRETS, **OPTIONAL_SECRETS}
    for name, value in all_secrets.items():
        # Escape single quotes in value for shell
        escaped_value = value.replace("'", "'\\''")
        print(f"gh secret set {name} --body '{escaped_value}'")
    
    print()
    print("METHOD 3: Ask Copilot (GitHub MCP)")
    print("-" * 50)
    print('Tell Copilot: "Add these secrets to GitHub Actions"')
    print()
    
    # Save to a secure file for reference
    output_file = '.github-secrets-values.txt'
    with open(output_file, 'w') as f:
        f.write("# GitHub Secrets - DO NOT COMMIT THIS FILE\n")
        f.write("# Add to .gitignore immediately\n\n")
        for name, value in all_secrets.items():
            f.write(f"{name}={value}\n")
    
    print(f"✅ Secret values saved to: {output_file}")
    print(f"⚠️  IMPORTANT: Add '{output_file}' to .gitignore!")
    print()
    
    # Add to .gitignore
    gitignore_path = Path('.gitignore')
    gitignore_content = gitignore_path.read_text() if gitignore_path.exists() else ''
    if output_file not in gitignore_content:
        with open('.gitignore', 'a') as f:
            f.write(f"\n# GitHub secrets backup (DO NOT COMMIT)\n")
            f.write(f"{output_file}\n")
        print(f"✅ Added '{output_file}' to .gitignore")
    
    print()
    print("🎯 Next Steps:")
    print("1. Add secrets using one of the methods above")
    print("2. Test workflows: npm run automation:test-badge-minting")
    print("3. Verify: Check GitHub Actions runs")
    print()

if __name__ == '__main__':
    main()
