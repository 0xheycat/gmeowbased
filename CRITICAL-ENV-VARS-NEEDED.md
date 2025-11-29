# CRITICAL: Missing Environment Variables for Vercel

## Build is Failing Because These Are Missing

Add these via Vercel Dashboard: https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables

Select **Preview** and **Production** for each variable.

### 1. Supabase Public Variables (CRITICAL - BUILD FAILING)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbmVycHRkYW5iZ3ZjamVudGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjcwMzksImV4cCI6MjA3Njc0MzAzOX0.XyXD7nJ21saJaJEzxfAReT8kpZY6yLhYq3_1sgbyiZM
```

### 2. Contract Addresses (CRITICAL - APP WON'T WORK)

#### Base Chain
```bash
NEXT_PUBLIC_GM_BASE_CORE
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

NEXT_PUBLIC_GM_BASE_PROXY
Value: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

NEXT_PUBLIC_GM_BASE_GUILD
Value: 0x9674a39AE9af27c49DaDD9db99e49fC1EC2cd059

NEXT_PUBLIC_GM_BASE_NFT
Value: 0xD99aAaa5cB16C9B3DB7968C72dEE91B4c5A90c20
```

#### Optimism Chain
```bash
NEXT_PUBLIC_GM_OP_CORE
Value: 0x1599BCF3d46Bd8fc68e0EDf39E8aF3C43E27E15B

NEXT_PUBLIC_GM_OP_PROXY
Value: 0x9f959856F7c92Bd1C4D0E98d786d7Af12B36F839

NEXT_PUBLIC_GM_OP_GUILD
Value: 0x71EA4DA40d59Fb99fc64e7EB74f5b7D50476Bc58

NEXT_PUBLIC_GM_OP_NFT
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
```

#### Unichain
```bash
NEXT_PUBLIC_GM_UNICHAIN_CORE
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

NEXT_PUBLIC_GM_UNICHAIN_PROXY
Value: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

NEXT_PUBLIC_GM_UNICHAIN_GUILD
Value: 0x9674a39AE9af27c49DaDD9db99e49fC1EC2cd059

NEXT_PUBLIC_GM_UNICHAIN_NFT
Value: 0xD99aAaa5cB16C9B3DB7968C72dEE91B4c5A90c20
```

#### Celo Chain
```bash
NEXT_PUBLIC_GM_CELO_CORE
Value: 0x1599BCF3d46Bd8fc68e0EDf39E8aF3C43E27E15B

NEXT_PUBLIC_GM_CELO_PROXY
Value: 0x9f959856F7c92Bd1C4D0E98d786d7Af12B36F839

NEXT_PUBLIC_GM_CELO_GUILD
Value: 0x71EA4DA40d59Fb99fc64e7EB74f5b7D50476Bc58

NEXT_PUBLIC_GM_CELO_NFT
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
```

#### Ink Chain
```bash
NEXT_PUBLIC_GM_INK_CORE
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

NEXT_PUBLIC_GM_INK_PROXY
Value: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

NEXT_PUBLIC_GM_INK_GUILD
Value: 0x9674a39AE9af27c49DaDD9db99e49fC1EC2cd059

NEXT_PUBLIC_GM_INK_NFT
Value: 0xD99aAaa5cB16C9B3DB7968C72dEE91B4c5A90c20
```

#### Arbitrum Chain
```bash
NEXT_PUBLIC_GM_ARBITRUM_CORE
Value: 0x1599BCF3d46Bd8fc68e0EDf39E8aF3C43E27E15B

NEXT_PUBLIC_GM_ARBITRUM_PROXY
Value: 0x9f959856F7c92Bd1C4D0E98d786d7Af12B36F839

NEXT_PUBLIC_GM_ARBITRUM_GUILD
Value: 0x71EA4DA40d59Fb99fc64e7EB74f5b7D50476Bc58

NEXT_PUBLIC_GM_ARBITRUM_NFT
Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
```

## Quick Steps

1. Go to: https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables
2. Click "Add New" for each variable above
3. Copy the name and value exactly
4. Select "Preview" checkbox
5. Select "Production" checkbox  
6. Click "Save"
7. Repeat for all 26 variables

## After Adding Variables

Trigger a new deployment:
```bash
git commit --allow-empty -m "chore: trigger redeploy after env vars"
git push origin foundation-rebuild
```

Or just wait for automatic redeploy (Vercel detects env var changes).
