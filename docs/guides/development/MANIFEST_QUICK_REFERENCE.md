# 🚀 Farcaster Manifest - Quick Reference

## 📍 Location
**File**: `/public/.well-known/farcaster.json`  
**URL**: https://gmeowhq.art/.well-known/farcaster.json

---

## ⚠️ CRITICAL: Signing Required
The manifest contains **placeholder values** and MUST be signed before production deployment.

### Quick Sign (3 Steps)
1. **Visit**: Farcaster Miniapp Manifest Tool or Neynar docs
2. **Enter**: `gmeowhq.art`
3. **Sign**: With your Farcaster custody address

**Full Guide**: See [MANIFEST_SETUP.md](./MANIFEST_SETUP.md)

---

## ✅ Quick Validation

```bash
# Validate structure
node scripts/validate-manifest.js

# Check if signed
bash scripts/sign-manifest-helper.sh

# View manifest
cat public/.well-known/farcaster.json | jq .

# Test locally
npm run dev
curl http://localhost:3000/.well-known/farcaster.json
```

---

## 📦 What Changed

### Before
- ❌ External hosted manifest (Farcaster API)
- ❌ Old manifest ID: `0199e9d4-1cd4-4931-9d52-f6998bc70004`
- ❌ Redirects in `next.config.js` and `versel.json`
- ❌ No control over metadata

### After
- ✅ Self-hosted manifest
- ✅ New domain: `gmeowhq.art`
- ✅ Local serving from `/public/.well-known/farcaster.json`
- ✅ Full control over all fields
- ✅ Multi-chain support (5 chains)
- ✅ Rich discovery metadata

---

## 🎯 Configured Features

### Core
- ✅ App name: "Gmeowbased Adventure"
- ✅ Domain: gmeowhq.art
- ✅ Icon: 1024x1024px PNG
- ✅ Splash screen with custom color

### Discovery
- ✅ Category: games
- ✅ Tags: gm, quests, onchain, multichain, guild
- ✅ Hero image, OG metadata
- ✅ Description and tagline

### Integration
- ✅ Webhook: /api/neynar/webhook
- ✅ Multi-chain: Base, Optimism, Celo, Ink, Unichain
- ✅ Canonical domain set

### Status
- ⏳ Screenshots: Empty (optional, but recommended)
- ⚠️ Account Association: Unsigned (REQUIRED before production)

---

## 🛠️ Helper Scripts

```bash
# Validate manifest
node scripts/validate-manifest.js

# Check signing status
bash scripts/sign-manifest-helper.sh
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **MANIFEST_SETUP.md** | Complete signing guide |
| **MANIFEST_REGENERATION_SUMMARY.md** | Full change documentation |
| **Quick_Reference.md** | This file (TL;DR) |
| **farcaster.json.OLD_BACKUP** | Old config reference |

---

## 🚦 Deployment Checklist

- [x] Create manifest file
- [x] Configure all required fields
- [x] Remove old redirects
- [x] Validate structure
- [ ] **Sign manifest** ⚠️ REQUIRED
- [ ] Add screenshots (optional)
- [ ] Deploy to production
- [ ] Test in Warpcast
- [ ] Verify webhook events

---

## 📖 Key Commands

```bash
# Development
npm run dev

# Validate
node scripts/validate-manifest.js

# Check signing status
bash scripts/sign-manifest-helper.sh

# Deploy
vercel --prod

# Test production
curl https://gmeowhq.art/.well-known/farcaster.json | jq .
```

---

## 🆘 Troubleshooting

### Manifest not loading?
- Check file exists: `ls public/.well-known/farcaster.json`
- Verify JSON: `cat public/.well-known/farcaster.json | jq .`
- Check no redirects: Review `next.config.js` and `versel.json`

### Signature verification fails?
- Must sign with Farcaster custody address
- Domain must exactly match: `gmeowhq.art`
- Use official signing tools (not manual)

### Warpcast shows errors?
- Force refresh: Settings > Developer Tools > Domains
- Check manifest accessibility
- Verify all required fields present

---

## 🔗 Resources

- **Farcaster Spec**: https://miniapps.farcaster.xyz/docs/specification
- **Neynar Guide**: https://docs.neynar.com/docs/convert-web-app-to-mini-app
- **JFS Spec**: https://github.com/farcasterxyz/protocol/discussions/208

---

## ⚡ TL;DR

1. Manifest created at `/public/.well-known/farcaster.json`
2. All fields configured for domain `gmeowhq.art`
3. Validation passes ✅
4. **MUST SIGN** before production deployment
5. Use: `bash scripts/sign-manifest-helper.sh` for instructions

---

**Status**: ⚠️ UNSIGNED - Ready for signing  
**Next Step**: Sign manifest using Farcaster Manifest Tool  
**After Signing**: Deploy and test in Warpcast
