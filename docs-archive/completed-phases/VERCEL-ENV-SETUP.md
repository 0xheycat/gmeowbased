# Vercel Environment Variables Setup

## Missing Variables for New Foundation

Add these to Vercel for **Preview** and **Production** environments:

### Core Contract Addresses (NEW)
```bash
vercel env add NEXT_PUBLIC_GM_BASE_CORE preview production
# Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

vercel env add NEXT_PUBLIC_GM_BASE_PROXY preview production
# Value: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

vercel env add NEXT_PUBLIC_GM_OP_CORE preview production
# Value: 0x1599e491FaA2F22AA053dD9304308231c0F0E15B

vercel env add NEXT_PUBLIC_GM_OP_PROXY preview production
# Value: 0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839

vercel env add NEXT_PUBLIC_GM_UNICHAIN_CORE preview production
# Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

vercel env add NEXT_PUBLIC_GM_UNICHAIN_PROXY preview production
# Value: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

vercel env add NEXT_PUBLIC_GM_CELO_CORE preview production
# Value: 0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe

vercel env add NEXT_PUBLIC_GM_CELO_PROXY preview production
# Value: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4

vercel env add NEXT_PUBLIC_GM_INK_CORE preview production
# Value: 0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe

vercel env add NEXT_PUBLIC_GM_INK_PROXY preview production
# Value: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4

vercel env add NEXT_PUBLIC_GM_ARBITRUM_CORE preview production
# Value: 0xC8c39e1312c4F3775CE1fc35327ed2c719B82eFe

vercel env add NEXT_PUBLIC_GM_ARBITRUM_PROXY preview production
# Value: 0xa0001886C87a19d49BAC88a5Cbf993f0866110C4
```

### Guild Contract Addresses
```bash
vercel env add NEXT_PUBLIC_GM_BASE_GUILD preview production
# Value: 0x967457be45facE07c22c0374dAfBeF7b2f7cd059

vercel env add NEXT_PUBLIC_GM_OP_GUILD preview production
# Value: 0x71EA982A8E2be62191ac7e2A98277c986DEbBc58

vercel env add NEXT_PUBLIC_GM_UNICHAIN_GUILD preview production
# Value: 0x967457be45facE07c22c0374dAfBeF7b2f7cd059

vercel env add NEXT_PUBLIC_GM_CELO_GUILD preview production
# Value: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C

vercel env add NEXT_PUBLIC_GM_INK_GUILD preview production
# Value: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C

vercel env add NEXT_PUBLIC_GM_ARBITRUM_GUILD preview production
# Value: 0x3030cbD17bc8AB3Fa1CC45964C20A12617a7D42C
```

### NFT Contract Addresses
```bash
vercel env add NEXT_PUBLIC_GM_BASE_NFT preview production
# Value: 0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20

vercel env add NEXT_PUBLIC_GM_OP_NFT preview production
# Value: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92

vercel env add NEXT_PUBLIC_GM_UNICHAIN_NFT preview production
# Value: 0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20

vercel env add NEXT_PUBLIC_GM_CELO_NFT preview production
# Value: 0x059b474799f8602975E60A789105955CbB61d878

vercel env add NEXT_PUBLIC_GM_INK_NFT preview production
# Value: 0x059b474799f8602975E60A789105955CbB61d878

vercel env add NEXT_PUBLIC_GM_ARBITRUM_NFT preview production
# Value: 0x059b474799f8602975E60A789105955CbB61d878
```

## Quick Add Script

Run this in your terminal:

```bash
cd /home/heycat/Desktop/2025/Gmeowbased

# Base chain
echo "0x9BDD11aA50456572E3Ea5329fcDEb81974137f92" | vercel env add NEXT_PUBLIC_GM_BASE_CORE preview
echo "0x6A48B758ed42d7c934D387164E60aa58A92eD206" | vercel env add NEXT_PUBLIC_GM_BASE_PROXY preview
echo "0x967457be45facE07c22c0374dAfBeF7b2f7cd059" | vercel env add NEXT_PUBLIC_GM_BASE_GUILD preview
echo "0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20" | vercel env add NEXT_PUBLIC_GM_BASE_NFT preview

# OP chain
echo "0x1599e491FaA2F22AA053dD9304308231c0F0E15B" | vercel env add NEXT_PUBLIC_GM_OP_CORE preview
echo "0x9f95383B4AFA0f9633Ef9E3D5eF37A704E26F839" | vercel env add NEXT_PUBLIC_GM_OP_PROXY preview
echo "0x71EA982A8E2be62191ac7e2A98277c986DEbBc58" | vercel env add NEXT_PUBLIC_GM_OP_GUILD preview
echo "0x9BDD11aA50456572E3Ea5329fcDEb81974137f92" | vercel env add NEXT_PUBLIC_GM_OP_NFT preview
```

## Or Use Vercel Dashboard

1. Go to: https://vercel.com/0xheycat/gmeow-adventure/settings/environment-variables
2. Add each variable manually with the values above
3. Select "Preview" and "Production" environments
4. Click "Save"

## After Adding Variables

Trigger a new deployment:
```bash
git commit --allow-empty -m "chore: trigger redeploy with new env vars"
git push origin foundation-rebuild
```

Or use Vercel CLI:
```bash
vercel --prod  # for production
vercel         # for preview
```
