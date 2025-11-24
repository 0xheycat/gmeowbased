# FARCASTER MINIAPP MANIFEST - COMPLETE SPECIFICATION AUDIT

**Source**: Farcaster MiniApp Specification + Neynar Best Practices
**Date**: November 23, 2025

---

## REQUIRED FIELDS (MUST HAVE) ✅

### Core Required (4 fields)
- [x] `version` - "1.1" ✅
- [x] `name` - "Gmeowbased Adventure" ✅
- [x] `homeUrl` - toAbsoluteUrl('/', baseUrl) ✅
- [x] `iconUrl` - toAbsoluteUrl('/favicon.ico', baseUrl) ✅

### Account Association (REQUIRED)
- [x] `accountAssociation.header` ✅
- [x] `accountAssociation.payload` ✅
- [x] `accountAssociation.signature` ✅

---

## MISSING FIELDS (USER IDENTIFIED) ❌

### Discovery & Launch (RECOMMENDED - MISSING)
- [ ] **`imageUrl`** ❌ - OpenGraph image for social sharing
- [ ] **`buttonTitle`** ❌ - CTA text for "Use App" button (e.g., "🚩 Start", "Play Now")
- [ ] **`screenshotUrls`** ❌ - Array of app screenshots for store listing
- [ ] **`castShareUrl`** ❌ - Custom URL for cast sharing with personalization

---

## CURRENTLY INCLUDED (OPTIONAL BUT RECOMMENDED) ✅

### Branding & UX
- [x] `splashImageUrl` - toAbsoluteUrl('/splash.png', baseUrl) ✅
- [x] `splashBackgroundColor` - '#0B0A16' ✅
- [x] `subtitle` - 'Daily GM Quest Hub' ✅
- [x] `description` - Full description ✅
- [x] `tagline` - 'Keep your GM streak alive' ✅

### SEO & Discovery
- [x] `ogTitle` - 'Gmeowbased Quest Game' ✅
- [x] `ogDescription` - Full OG description ✅
- [x] `ogImageUrl` - toAbsoluteUrl('/og-image.png', baseUrl) ✅
- [x] `primaryCategory` - 'social' ✅
- [x] `tags` - ['gm', 'streak', 'base', 'social', 'daily'] ✅
- [x] `heroImageUrl` - toAbsoluteUrl('/hero.png', baseUrl) ✅
- [x] `noindex` - false ✅
- [x] `canonicalDomain` - baseUrl.hostname ✅

### Technical
- [x] `webhookUrl` - toAbsoluteUrl('/api/neynar/webhook', baseUrl) ✅
- [x] `requiredChains` - ['eip155:8453', 'eip155:10', 'eip155:42220'] ✅
- [x] `requiredCapabilities` - ['actions.ready', 'actions.composeCast', 'wallet.getEthereumProvider'] ✅

### Base Builder Support
- [x] `baseBuilder.ownerAddress` - 0xB4F2fF92E8ccbbeAb7094cef5514A15aeBbbD11F ✅

---

## ADDITIONAL OPTIONAL FIELDS (NOT YET ADDED)

### Analytics & Tracking
- [ ] `privacyPolicyUrl` - Link to privacy policy
- [ ] `termsOfServiceUrl` - Link to terms of service
- [ ] `supportUrl` - Link to support/help center

### Advanced Features
- [ ] `theme` - Color theme object (primary, secondary, background, text colors)
- [ ] `locale` - Supported locales array
- [ ] `orientation` - Preferred orientation (portrait/landscape)

---

## NEYNAR BEST PRACTICES

### Personalized Share Images (RECOMMENDED)
Example from Yoink.party:
```
"castShareUrl": "https://yoink.party/share/[fid]"
```
This creates viral sharing with personalized images per user.

### Button Title Examples (RECOMMENDED)
- Gaming: "🎮 Play Now", "🚀 Start Adventure"
- Social: "🚩 Start", "👋 Say GM"
- Quest: "⚔️ Begin Quest", "🏆 Join Now"

### Screenshot URLs (RECOMMENDED)
Array of 2-5 screenshots showing key features:
```json
"screenshotUrls": [
  "https://domain.com/screenshots/gm-streak.png",
  "https://domain.com/screenshots/leaderboard.png",
  "https://domain.com/screenshots/badges.png"
]
```

---

## PRIORITY RECOMMENDATIONS

### IMMEDIATE (MISSING CRITICAL FIELDS)
1. **`buttonTitle`** - Add launch CTA (e.g., "👋 Say GM")
2. **`imageUrl`** - Add social share image (can reuse ogImageUrl)

### HIGH PRIORITY (VIRAL GROWTH)
3. **`castShareUrl`** - Enable personalized sharing (/share/[fid])
4. **`screenshotUrls`** - Add app store screenshots

### MEDIUM PRIORITY (LEGAL/SUPPORT)
5. `privacyPolicyUrl` - Add privacy policy
6. `termsOfServiceUrl` - Add terms of service
7. `supportUrl` - Add help/support link

---

## EXAMPLE: COMPLETE MANIFEST WITH MISSING FIELDS

```typescript
miniapp: {
  version: '1.1',
  name: 'Gmeowbased Adventure',
  
  // MISSING - ADD THESE
  imageUrl: toAbsoluteUrl('/og-image.png', baseUrl), // Social share image
  buttonTitle: '👋 Say GM', // Launch CTA
  screenshotUrls: [ // App store screenshots
    toAbsoluteUrl('/screenshots/gm-streak.png', baseUrl),
    toAbsoluteUrl('/screenshots/leaderboard.png', baseUrl),
    toAbsoluteUrl('/screenshots/badges.png', baseUrl),
  ],
  castShareUrl: toAbsoluteUrl('/share/[fid]', baseUrl), // Personalized sharing
  
  // EXISTING FIELDS (KEEP)
  iconUrl: toAbsoluteUrl('/favicon.ico', baseUrl),
  homeUrl: toAbsoluteUrl('/', baseUrl),
  splashImageUrl: toAbsoluteUrl('/splash.png', baseUrl),
  splashBackgroundColor: '#0B0A16',
  webhookUrl: toAbsoluteUrl('/api/neynar/webhook', baseUrl),
  subtitle: 'Daily GM Quest Hub',
  description: '...',
  primaryCategory: 'social',
  tags: ['gm', 'streak', 'base', 'social', 'daily'],
  heroImageUrl: toAbsoluteUrl('/hero.png', baseUrl),
  tagline: 'Keep your GM streak alive',
  ogTitle: 'Gmeowbased Quest Game',
  ogDescription: '...',
  ogImageUrl: toAbsoluteUrl('/og-image.png', baseUrl),
  noindex: false,
  canonicalDomain: baseUrl.hostname,
  requiredChains: ['eip155:8453', 'eip155:10', 'eip155:42220'],
  requiredCapabilities: [
    'actions.ready',
    'actions.composeCast',
    'wallet.getEthereumProvider',
  ],
}
```

---

## VERIFICATION STEPS

1. [ ] Add missing fields to manifest route
2. [ ] Create screenshot images (3-5 key features)
3. [ ] Implement /share/[fid] route for personalized sharing
4. [ ] Test manifest at /.well-known/farcaster.json
5. [ ] Validate with Warpcast Manifest Tool
6. [ ] Submit to Farcaster app stores

---

**STATUS**: 4 CRITICAL FIELDS MISSING
- imageUrl (social sharing)
- buttonTitle (launch CTA)
- screenshotUrls (app store)
- castShareUrl (viral growth)

