# 🚨 SECURITY INCIDENT - Secrets Exposed in Git History

**Date:** November 25, 2025
**Severity:** CRITICAL
**Status:** ACTIVE - IMMEDIATE ACTION REQUIRED

## What Happened

The file `add-github-secrets.py` was committed to git (commit 43f81c9) with **REAL SECRET VALUES** hardcoded inside. This file was pushed to GitHub and is publicly visible.

## Exposed Secrets

### 🔴 CRITICAL - Exposed in add-github-secrets.py:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (full database access!)
- SUPABASE_ANON_KEY
- NEYNAR_API_KEY
- RPC_BASE (Alchemy API key)
- RPC_OP (Alchemy API key)
- RPC_CELO (Alchemy API key)
- RPC_UNICHAIN (Alchemy API key)
- RPC_INK (Alchemy API key)
- MINTER_PRIVATE_KEY (wallet private key!)

## IMMEDIATE ACTIONS (Do These NOW)

### 1. Rotate Supabase Credentials (URGENT!)
```bash
# Go to Supabase Dashboard
# https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/settings/api

1. Click "Reset service_role key" - this invalidates the exposed key
2. Copy new service_role key
3. Update .env.local with new key
```

### 2. Rotate Neynar API Key
```bash
# Go to Neynar Dashboard
# https://dev.neynar.com/

1. Revoke old key: 76C0C613-378F-4562-9512-600DD84EB085
2. Generate new API key
3. Update .env.local
```

### 3. Rotate Alchemy RPC Keys (URGENT!)
```bash
# Go to Alchemy Dashboard
# https://dashboard.alchemy.com/

1. Delete or regenerate app with key: AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe
2. Create new apps for each chain
3. Update all RPC_* variables in .env.local
```

### 4. Secure Wallet Private Key (CRITICAL!)
```bash
# The exposed wallet: 0x9abe1d6ae90d3fc0625d7a8dfc4866f4b08d606c20a5f6b4a0bbd62894c82e6b

1. Check balance: Visit Basescan and check if wallet has funds
2. If it has funds: TRANSFER IMMEDIATELY to new wallet
3. Generate NEW minter wallet
4. Update MINTER_PRIVATE_KEY in .env.local
5. Update minter address in contracts if needed
```

### 5. Remove Secrets from Git History
```bash
# Option 1: Using git filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path add-github-secrets.py --invert-paths
git push origin main --force

# Option 2: Using BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files add-github-secrets.py
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin main --force

# Option 3: Nuclear option - Delete and recreate repo
# (Use this if above methods fail)
```

## After Rotation

### Update GitHub Secrets
```bash
# After rotating all credentials, update GitHub Actions secrets:
gh secret set SUPABASE_SERVICE_ROLE_KEY --body 'NEW_KEY_HERE'
gh secret set NEYNAR_API_KEY --body 'NEW_KEY_HERE'
gh secret set RPC_BASE --body 'NEW_RPC_HERE'
gh secret set RPC_OP --body 'NEW_RPC_HERE'
gh secret set RPC_CELO --body 'NEW_RPC_HERE'
gh secret set RPC_UNICHAIN --body 'NEW_RPC_HERE'
gh secret set RPC_INK --body 'NEW_RPC_HERE'
gh secret set MINTER_PRIVATE_KEY --body 'NEW_PRIVATE_KEY_HERE'
```

### Update Local Files
```bash
# Update .env.local with all new credentials
# DO NOT commit .env.local to git!
```

## Prevention Checklist

- [ ] Rotate all exposed credentials
- [ ] Transfer funds from exposed wallet
- [ ] Remove secrets from git history
- [ ] Force push cleaned history to GitHub
- [ ] Update GitHub Actions secrets with new credentials
- [ ] Add git pre-commit hooks to prevent future leaks
- [ ] Review all files before committing
- [ ] Never hardcode secrets in Python/JS files

## Files to DELETE

These files contain secrets and should be removed from repository:
- ❌ add-github-secrets.py (contains hardcoded secrets!)
- ❌ .github-secrets-values.txt (if exists locally, already in .gitignore)
- ⚠️ COPY-PASTE-SECRETS.sh (check if it has secrets)

## Who Can See This?

**YES** - The Vercel deployment URL you shared shows the SOURCE CODE of the deployment, including all committed files. Anyone with that link can see:
- add-github-secrets.py with all secrets
- The entire git history
- All committed files

## Next Steps After Cleanup

1. Monitor for suspicious activity:
   - Supabase logs: Check for unauthorized queries
   - Alchemy dashboard: Check API usage
   - Wallet: Check for unauthorized transactions
   - GitHub: Check for unauthorized access

2. Set up alerting:
   - Supabase: Enable email alerts for unusual activity
   - Alchemy: Monitor API usage quotas
   - Wallet: Use block explorers to monitor transactions

---

**Remember:** This is a learning experience. In the future:
- ✅ NEVER hardcode secrets in code files
- ✅ ALWAYS use .env files (in .gitignore)
- ✅ ALWAYS review `git diff` before committing
- ✅ Use git pre-commit hooks to scan for secrets
- ✅ Rotate credentials regularly as best practice
