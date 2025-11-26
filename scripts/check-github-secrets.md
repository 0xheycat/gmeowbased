# GitHub Secrets Management Guide

Since you have GitHub MCP access, here's how to manage your secrets programmatically.

## Quick Check: Which Secrets Are Configured?

I'll help you check and add secrets via the GitHub MCP. Just ask me to:
- "Check which GitHub secrets are configured"
- "Add [SECRET_NAME] to GitHub secrets"
- "Update [SECRET_NAME] in GitHub secrets"

## Required Secrets for GitHub Actions

### 🔴 Critical (All workflows need these)
```
SUPABASE_URL              - Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (full access)
SUPABASE_ANON_KEY         - Supabase anon key (public access)
NEYNAR_API_KEY            - Neynar API key for Farcaster bot
```

### 🟡 Important (Blockchain interactions)
```
RPC_BASE                  - Base mainnet RPC endpoint
RPC_OP                    - Optimism mainnet RPC endpoint  
RPC_CELO                  - Celo mainnet RPC endpoint
RPC_UNICHAIN              - Unichain mainnet RPC endpoint
RPC_INK                   - Ink mainnet RPC endpoint
```

### 🟢 Optional (Only for badge minting)
```
MINTER_PRIVATE_KEY        - Private key for minting badges on-chain
```

## Workflow Dependencies

| Workflow | Secrets Required |
|----------|-----------------|
| **warmup-frames.yml** | None (public endpoints only) |
| **supabase-leaderboard-sync.yml** | SUPABASE_*, RPC_* |
| **badge-minting.yml** | ALL (including MINTER_PRIVATE_KEY) |
| **gm-reminders.yml** | SUPABASE_*, NEYNAR_*, RPC_* |

## How to Add Secrets Via MCP

Just tell me which secret you want to add, and I'll do it for you using the GitHub MCP:

**Example conversation:**
```
You: "Add my Supabase URL as a GitHub secret"
Me: [I'll prompt you for the value and add it securely]

You: "Add all my RPC endpoints"
Me: [I'll guide you through adding each one]

You: "Check if NEYNAR_API_KEY is configured"
Me: [I'll verify and tell you the status]
```

## Where to Find These Values

### Supabase
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click "Settings" → "API"
3. Copy:
   - Project URL → `SUPABASE_URL`
   - anon public → `SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

### Neynar
1. Go to: https://dev.neynar.com/
2. Click "API Keys" → "Create New Key"
3. Copy key → `NEYNAR_API_KEY`

### RPC Endpoints
- **Base**: https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
- **Optimism**: https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
- **Celo**: https://forno.celo.org (no key needed)
- **Unichain**: https://mainnet.unichain.org (public)
- **Ink**: https://ink-mainnet.g.alchemy.com/v2/YOUR_KEY

Get Alchemy keys: https://dashboard.alchemy.com/

### Minter Private Key (Optional)
- Export from your wallet (MetaMask: Account Details → Show Private Key)
- **WARNING**: Only use a dedicated minting wallet, not your main wallet!
- Ensure wallet has ETH on Base for gas fees

## Testing After Adding Secrets

```bash
# Test individual workflows
npm run automation:test-badge-minting    # Dry run badge minting
npm run automation:test-gm-reminders     # Dry run GM reminders

# Or trigger via GitHub (I can do this for you via MCP)
# Just say: "Test the badge minting workflow"
```

## Security Best Practices

✅ **DO:**
- Use a dedicated wallet for MINTER_PRIVATE_KEY
- Rotate secrets regularly
- Use read-only keys when possible
- Monitor secret usage in workflow logs

❌ **DON'T:**
- Share secrets in chat or commit to git
- Use your personal wallet's private key
- Hardcode secrets in code
- Use production keys for testing

## Status Check

Last update: November 25, 2025
Workflows configured: 4
Secrets required: 10 (9 required + 1 optional)

**Ready to add secrets?** Just tell me which ones, and I'll help you configure them via GitHub MCP!
