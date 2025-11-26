# GitHub Secrets Status Check

This file tracks which secrets are configured for GitHub Actions workflows.

## Required Secrets for Workflows

### ✅ Core Secrets (Required for all workflows)
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `NEYNAR_API_KEY` - Neynar API key for bot & notifications

### ✅ RPC Endpoints (Required for blockchain interactions)
- [ ] `RPC_BASE` - Base mainnet RPC endpoint
- [ ] `RPC_OP` - Optimism mainnet RPC endpoint
- [ ] `RPC_CELO` - Celo mainnet RPC endpoint
- [ ] `RPC_UNICHAIN` - Unichain mainnet RPC endpoint
- [ ] `RPC_INK` - Ink mainnet RPC endpoint

### 🔧 Optional Secrets
- [ ] `MINTER_PRIVATE_KEY` - Private key for badge minting (only if minting badges on-chain)

## Workflows Using These Secrets

### badge-minting.yml (Daily at 01:00 UTC)
Requires: All core secrets + all RPC endpoints + MINTER_PRIVATE_KEY

### gm-reminders.yml (Twice daily at 09:00, 21:00 UTC)
Requires: NEYNAR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, RPC_BASE, RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK

### supabase-leaderboard-sync.yml (Daily at 00:00 UTC)
Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RPC_BASE, RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK

### warmup-frames.yml (Every 10-30 minutes)
No secrets required (just keeps functions warm)

## How to Check Secrets

```bash
# List all configured secrets
gh secret list

# Check if specific secret exists
gh secret list | grep SUPABASE_URL
```

## How to Add Missing Secrets

```bash
# Interactive helper script
./add-github-secrets.sh

# Or manually add each secret
gh secret set SECRET_NAME --body "value"

# Or via GitHub UI
# https://github.com/0xheycat/gmeowbased/settings/secrets/actions
```

Last checked: November 25, 2025
