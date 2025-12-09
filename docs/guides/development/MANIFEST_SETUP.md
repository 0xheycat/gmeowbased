# Farcaster Miniapp Manifest Setup Guide

## Overview
This guide explains how to configure and sign the Farcaster miniapp manifest for Gmeowbased Adventure at `gmeowhq.art`.

## Manifest Location
- **File**: `/public/.well-known/farcaster.json`
- **URL**: https://gmeowhq.art/.well-known/farcaster.json
- **Specification**: Farcaster Miniapp Manifest v1

## Manifest Structure

The manifest consists of two main sections:

### 1. `accountAssociation` (Required for Production)
Verifies ownership of the domain to a Farcaster account using JSON Farcaster Signature (JFS).

**Current Status**: Contains placeholder values that MUST be replaced with real signatures.

### 2. `miniapp` (Configured)
Contains all metadata about the Gmeowbased Adventure miniapp.

## Required Fields (Already Configured)
- ✅ `version`: "1" (Manifest version)
- ✅ `name`: "Gmeowbased Adventure"
- ✅ `iconUrl`: Icon image (1024x1024px PNG, no alpha)
- ✅ `homeUrl`: Default launch URL
- ✅ `splashImageUrl`: Loading screen image (200x200px)
- ✅ `splashBackgroundColor`: Hex color for loading screen
- ✅ `webhookUrl`: Notification webhook endpoint

## Optional Fields (Configured)
- ✅ `subtitle`: "Daily GM Rituals & Quests"
- ✅ `description`: Full app description
- ✅ `primaryCategory`: "games"
- ✅ `tags`: ["gm", "quests", "onchain", "multichain", "guild"]
- ✅ `heroImageUrl`: Promotional image (1200x630px)
- ✅ `tagline`: "Pixel Luxury for Daily GM"
- ✅ `ogTitle`, `ogDescription`, `ogImageUrl`: Open Graph metadata
- ✅ `requiredChains`: Multi-chain support (Base, Optimism, Celo, Ink, Unichain)
- ✅ `canonicalDomain`: "gmeowhq.art"

## 🚨 Critical Step: Signing the Manifest

The `accountAssociation` section MUST be signed with your Farcaster custody address before the manifest is production-ready.

### Option 1: Using Farcaster Mini App Manifest Tool (Recommended)

1. **Navigate to the Manifest Tool**:
   - Go to: https://miniapps.farcaster.xyz/miniapp-manifest-tool (or similar Farcaster official tool)
   - Or use Neynar's tool if available

2. **Enter Your Domain**:
   - Enter: `gmeowhq.art`
   - Click "Check domain status" to verify the manifest is accessible

3. **Claim Ownership**:
   - Scroll to the bottom
   - Click "Claim Ownership"
   - Follow the prompts to sign with your Farcaster custody address
   - This typically involves scanning a QR code with your phone

4. **Copy the Signed Manifest**:
   - The tool will generate a complete manifest with valid `accountAssociation` fields
   - Copy the entire JSON output
   - Replace the contents of `/public/.well-known/farcaster.json` with the signed version

### Option 2: Using Neynar SDK (Programmatic)

If you're using the Neynar SDK in your app:

\`\`\`typescript
import { signManifest } from '@farcaster/miniapp-sdk'

// Use the SDK to generate the signature
const signature = await signManifest({
  domain: 'gmeowhq.art'
})

// Update your manifest with the signature
const manifest = {
  accountAssociation: signature,
  miniapp: { /* ... your miniapp config ... */ }
}
\`\`\`

### Option 3: Manual Signing

If you have your Farcaster custody private key:

1. Create a JSON Farcaster Signature (JFS) with:
   - **Header**: `{"fid": YOUR_FID, "type": "custody", "key": "YOUR_CUSTODY_ADDRESS"}`
   - **Payload**: `{"domain": "gmeowhq.art"}`
   
2. Sign the payload with your custody address
3. Base64 encode all three components (header, payload, signature)
4. Update the manifest

## Verification Steps

After signing the manifest:

1. **Verify Manifest is Accessible**:
   \`\`\`bash
   curl https://gmeowhq.art/.well-known/farcaster.json
   \`\`\`

2. **Check JSON Validity**:
   \`\`\`bash
   curl https://gmeowhq.art/.well-known/farcaster.json | jq .
   \`\`\`

3. **Validate Required Fields**:
   - Ensure `accountAssociation` no longer has placeholder values
   - Verify all required `miniapp` fields are present
   - Check that URLs are accessible

4. **Test in Warpcast** (if using):
   - Go to Settings > Developer Tools > Domains
   - Enter `gmeowhq.art`
   - Click "Check domain status" to force a refresh
   - Verify no errors are shown

## Manifest Schema Reference

### accountAssociation Schema
\`\`\`typescript
{
  "header": string,      // base64 encoded JFS header
  "payload": string,     // base64 encoded payload
  "signature": string    // base64 encoded signature
}
\`\`\`

### miniapp Schema (Key Fields)
\`\`\`typescript
{
  "version": "1",                           // Must be "1"
  "name": string,                           // Max 32 characters
  "iconUrl": string,                        // 1024x1024px PNG, no alpha
  "homeUrl": string,                        // Max 1024 characters
  "splashImageUrl"?: string,                // 200x200px
  "splashBackgroundColor"?: string,         // Hex color
  "webhookUrl"?: string,                    // Max 1024 characters
  "subtitle"?: string,                      // Max 30 characters
  "description"?: string,                   // Max 170 characters
  "primaryCategory"?: string,               // See allowed categories
  "tags"?: string[],                        // Up to 5 tags, max 20 chars each
  "heroImageUrl"?: string,                  // 1200x630px
  "requiredChains"?: string[],              // CAIP-2 format
  "canonicalDomain"?: string                // Domain without protocol
}
\`\`\`

## Allowed Primary Categories
- games
- social
- finance
- utility
- productivity
- health-fitness
- news-media
- music
- shopping
- education
- developer-tools
- entertainment
- art-creativity

## Required Chain IDs (CAIP-2 Format)
Currently configured:
- **Base**: `eip155:8453`
- **Optimism**: `eip155:10`
- **Celo**: `eip155:42220`
- **Ink**: `eip155:57073`
- **Unichain**: `eip155:763373`

## Image Requirements

### Icon (`iconUrl`)
- **Size**: 1024x1024px
- **Format**: PNG
- **Alpha**: No transparency
- **Current**: `/icon.png`

### Splash Image (`splashImageUrl`)
- **Size**: 200x200px
- **Current**: `/splash.png`

### Hero Image (`heroImageUrl`)
- **Size**: 1200x630px (1.91:1 aspect ratio)
- **Current**: `/hero.png`

### OG Image (`ogImageUrl`)
- **Size**: 1200x630px (1.91:1 aspect ratio)
- **Current**: `/og-image.png`

### Screenshots (`screenshotUrls`)
- **Orientation**: Portrait
- **Size**: 1284x2778px
- **Max Count**: 3 screenshots
- **Current**: Empty array (TODO: Add screenshots)

## Caching Considerations

Farcaster clients may cache your manifest. To force a refresh:

1. **Warpcast**: Settings > Developer Tools > Domains > Check domain status
2. **API**: Wait for cache TTL to expire (varies by client)
3. **Testing**: Use `?v=timestamp` query param during development

## Troubleshooting

### Manifest Not Loading
- Verify file exists at `/public/.well-known/farcaster.json`
- Check file is accessible via HTTPS
- Ensure no redirect rules are interfering (removed from `versel.json` and `next.config.js`)

### Signature Verification Fails
- Ensure you signed with your Farcaster custody address
- Verify the domain in the payload exactly matches `gmeowhq.art`
- Check that header.type is "custody" or "auth"

### Invalid Field Values
- Name must be ≤ 32 characters
- URLs must be ≤ 1024 characters (except homeUrl)
- Tags must be lowercase, no spaces, no special characters
- Required chains must use CAIP-2 format

## Next Steps

1. ✅ Deploy the current manifest to production
2. 🔲 **Sign the manifest** using one of the methods above
3. 🔲 Add screenshots to `screenshotUrls` array
4. 🔲 Test in Warpcast and other Farcaster clients
5. 🔲 Monitor webhook events at `/api/neynar/webhook`
6. 🔲 Update manifest as needed (name, description, images, etc.)

## Resources

- **Farcaster Miniapp Spec**: https://miniapps.farcaster.xyz/docs/specification
- **Neynar Manifest Guide**: https://docs.neynar.com/docs/convert-web-app-to-mini-app
- **Manifest Tool**: Check Farcaster official documentation for latest tool URL
- **JSON Farcaster Signature**: https://github.com/farcasterxyz/protocol/discussions/208

## Support

If you encounter issues:
- Check Farcaster documentation: https://docs.farcaster.xyz
- Neynar documentation: https://docs.neynar.com
- Join Farcaster developer chat
- Test using the manifest tool first

---

**Last Updated**: 2025-11-13
**Domain**: gmeowhq.art
**Manifest Version**: 1
**Status**: ⚠️ REQUIRES SIGNING
