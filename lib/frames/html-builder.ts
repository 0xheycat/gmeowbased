/**
 * Frame HTML Builder
 * Generates frame HTML with Farcaster vNext metadata
 */

import { sanitizeButtons } from './frame-validation'
import { getComposeText } from './compose-text'

// Helper function for HTML escaping
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))
}

// Helper function for URL sanitization (XSS protection)
function sanitizeUrl(url: string): string {
  if (!url) return ''
  const lower = url.toLowerCase().trim()
  // Block dangerous protocols
  if (lower.startsWith('javascript:') || 
      lower.startsWith('data:') || 
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:')) {
    return '#'
  }
  return url
}

export interface OverlayProfile {
  username: string | null
  displayName: string | null
  pfpUrl: string | null
}

export type FrameButton = {
  label: string
  target?: string
  action?: 'link' | 'post' | 'post_redirect'
}

export interface BuildFrameHtmlParams {
  title: string
  description: string
  image?: string
  url?: string
  buttons?: FrameButton[]
  fcMeta?: Record<string, string> | null
  debug?: any
  profile?: OverlayProfile | null
  kicker?: string | null
  chainIcon?: string | null
  chainLabel?: string | null
  chainKey?: string | null
  frameOrigin?: string | null
  frameVersion?: string | null
  hideOverlay?: boolean
  heroBadge?: { label: string; tone?: 'emerald' | 'violet' | 'gold' | 'blue' | 'pink'; icon?: string } | null
  heroStats?: Array<{ label: string; value: string; accent?: boolean }>
  heroList?: Array<{ primary: string; secondary?: string; icon?: string }>
  defaultFrameImage?: string | null
  frameType?: string
  streak?: number
  gmCount?: number
  level?: number
  tier?: string
  xp?: number
  badgeCount?: number
  progress?: number
  reward?: number
}

export function buildFrameHtml(params: BuildFrameHtmlParams): string {
  const {
    title,
    description,
    image,
    url,
    buttons,
    fcMeta,
    debug,
    profile,
    kicker,
    chainIcon,
    chainLabel,
    chainKey,
    frameOrigin,
    frameVersion,
    hideOverlay,
    heroBadge,
    heroStats,
    heroList,
    defaultFrameImage,
    frameType,
    streak,
    gmCount,
    level,
    tier,
    xp,
    badgeCount,
    progress,
    reward,
  } = params
  const pageTitle = escapeHtml(title)
  const rawDescription = description || ''
  const desc = escapeHtml(rawDescription)
  const sanitizedUrl = sanitizeUrl(url || '')
  const urlEsc = escapeHtml(sanitizedUrl)
  // CRITICAL: Farcaster requires fc:frame:image tag with 3:2 aspect ratio
  // Use frame-image.png (1200x800) for correct frame spec, not og-image.png (1200x630)
  const resolvedImage = image || (frameOrigin ? `${frameOrigin}/frame-image.png` : '')
  const imageEsc = resolvedImage ? escapeHtml(resolvedImage) : ''
  const overlayHidden = Boolean(hideOverlay) // eslint-disable-line @typescript-eslint/no-unused-vars
  const descriptionSegments = rawDescription
    .split(' • ')
    .map((segment) => segment.trim())
    .filter(Boolean)
  const primaryOverlaySegment = descriptionSegments[0] || ''
  const overlaySecondarySegments = descriptionSegments.slice(1)
  const overlayPrimaryHtml = primaryOverlaySegment ? escapeHtml(primaryOverlaySegment) : pageTitle
  const renderOverlayList = (segments: string[]) => `<ul class="overlay-list">${segments.map((segment) => `<li>${escapeHtml(segment)}</li>`).join('')}</ul>`
  const chunkSegments = (segments: string[], size: number) => {
    const chunks: string[][] = []
    for (let i = 0; i < segments.length; i += size) {
      chunks.push(segments.slice(i, i + size))
    }
    return chunks
  }
  let overlaySecondaryHtml = ''

  // Generate compose text for frame sharing
  // Phase 1F Task 11: Pass all available context for achievement-based messaging
  const composeText = getComposeText(frameType, {
    title: pageTitle,
    chain: chainLabel || undefined,
    username: profile?.username || undefined,
    streak: streak || undefined,
    gmCount: gmCount || undefined,
    level: level || undefined,
    tier: tier || undefined,
    xp: xp || undefined,
    badgeCount: badgeCount || undefined,
    progress: progress || undefined,
    reward: reward || undefined,
  })
  const composeTextEsc = escapeHtml(composeText)

  if (overlaySecondarySegments.length) {
    if (overlaySecondarySegments.length >= 6) {
        const chunks = chunkSegments(overlaySecondarySegments, 3)
        overlaySecondaryHtml = `<div class="overlay-list-grid overlay-list-grid-card">${chunks.map((group) => renderOverlayList(group)).join('')}</div>`
    } else {
      overlaySecondaryHtml = renderOverlayList(overlaySecondarySegments)
    }
  }
  const normalizedProfile = profile && (profile.username || profile.displayName || profile.pfpUrl)
    ? {
        username: profile.username ? String(profile.username).replace(/^@+/, '') : null,
        displayName: profile.displayName ? String(profile.displayName).trim() : null,
        pfpUrl: profile.pfpUrl ? String(profile.pfpUrl) : null,
      }
    : null
  const profileHandle = normalizedProfile?.username ? `@${normalizedProfile.username}` : ''
  const normalizedDisplay = normalizedProfile?.displayName || ''
  const handleComparable = normalizedProfile?.username ? normalizedProfile.username.toLowerCase() : ''
  const displayComparable = normalizedDisplay.replace(/^@+/, '').toLowerCase()
  const showDisplayName = Boolean(normalizedDisplay && displayComparable && displayComparable !== handleComparable)
  const profileAlt = profileHandle || normalizedDisplay || 'User avatar'
  const fallbackInitial = ((profileHandle || normalizedDisplay || pageTitle).replace(/^@/, '').trim().charAt(0) || 'G').toUpperCase()
  const chainIconClean = typeof chainIcon === 'string' && chainIcon.trim() ? chainIcon.trim() : null
  const kickerRaw = typeof kicker === 'string' && kicker.trim() ? kicker.trim() : title
  const kickerEsc = escapeHtml(kickerRaw)
  const chainLabelRaw = typeof chainLabel === 'string' && chainLabel.trim() ? chainLabel.trim() : kickerRaw
  const chainLabelEsc = escapeHtml(chainLabelRaw)
  const overlayKickerHtml = `
    <div class="overlay-kicker${chainIconClean ? ' overlay-kicker-chain' : ''}">
      ${chainIconClean ? `<img class="overlay-chain-icon" src="${escapeHtml(chainIconClean)}" alt="${chainLabelEsc} icon" />` : ''}
      <span>${kickerEsc}</span>
    </div>
  `
  const badgeHtml = heroBadge
    ? `<div class="overlay-badge overlay-badge-${heroBadge.tone || 'emerald'}">${heroBadge.icon ? `<span class="overlay-badge-icon">${escapeHtml(heroBadge.icon)}</span>` : ''}<span>${escapeHtml(heroBadge.label)}</span></div>`
    : ''
  const statsHtml = heroStats && heroStats.length
    ? `<div class="overlay-metrics">${heroStats
        .map(stat => `<div class="overlay-metric${stat.accent ? ' overlay-metric-accent' : ''}"><span class="overlay-metric-label">${escapeHtml(stat.label)}</span><strong>${escapeHtml(stat.value)}</strong></div>`)
        .join('')}</div>`
    : ''
  const identityBadgeHtml = normalizedProfile ? badgeHtml : ''
  const headingBadgeHtml = normalizedProfile ? '' : badgeHtml
  const identityKickerHtml = normalizedProfile ? overlayKickerHtml : ''
  const headingKickerHtml = normalizedProfile ? '' : overlayKickerHtml
  const overlayTitleHtml = primaryOverlaySegment ? '' : `<div class="overlay-title">${overlayPrimaryHtml}</div>`
  const overlayHeadingInner = `${headingBadgeHtml}${headingKickerHtml}${overlayTitleHtml}${statsHtml}`
  const overlayProfileHtml = normalizedProfile
    ? `<div class="overlay-profile identity-card">
        <span class="identity-card-glow"></span>
        <div class="identity-card-body">
          <div class="identity-avatar-shell">
            ${normalizedProfile.pfpUrl ? `<img class="identity-avatar" src="${escapeHtml(normalizedProfile.pfpUrl)}" alt="${escapeHtml(profileAlt)}" />` : `<div class="identity-avatar identity-avatar-fallback">${escapeHtml(fallbackInitial)}</div>`}
            <span class="identity-avatar-ring"></span>
          </div>
          <div class="overlay-profile-text identity-card-text">
            ${identityBadgeHtml ? `<div class="identity-badge-wrap">${identityBadgeHtml}</div>` : ''}
            ${profileHandle ? `<div class="overlay-handle identity-handle">${escapeHtml(profileHandle)}</div>` : ''}
            ${showDisplayName ? `<div class="overlay-name identity-name">${escapeHtml(normalizedDisplay)}</div>` : ''}
            ${identityKickerHtml ? `<div class="identity-card-kicker">${identityKickerHtml}</div>` : ''}
          </div>
        </div>
      </div>`
    : ''
  const listHtml = heroList && heroList.length
    ? `<div class="overlay-hierarchy">${heroList
        .map(item => `<div class="overlay-hierarchy-item">${item.icon ? `<span class="overlay-hierarchy-icon">${escapeHtml(item.icon)}</span>` : ''}<div><div class="overlay-hierarchy-primary">${escapeHtml(item.primary)}</div>${item.secondary ? `<div class="overlay-hierarchy-secondary">${escapeHtml(item.secondary)}</div>` : ''}</div></div>`)
        .join('')}</div>`
    : ''
  const overlayTopHtml = normalizedProfile // eslint-disable-line @typescript-eslint/no-unused-vars
    ? `<div class="overlay-top">${overlayProfileHtml}<div class="overlay-heading">${overlayHeadingInner}</div></div>`
    : `<div class="overlay-heading">${overlayHeadingInner}</div>`
  const overlayDetailsFallback = !primaryOverlaySegment ? `<div class="overlay-text">${desc}</div>` : ''
  const overlayDetailsHtml = overlaySecondaryHtml || overlayDetailsFallback // eslint-disable-line @typescript-eslint/no-unused-vars
  const overlayFooterHtml = listHtml // eslint-disable-line @typescript-eslint/no-unused-vars
  
  // Enforce 4-button limit per Farcaster vNext spec
  const { buttons: validatedButtons, truncated, originalCount, invalidTitles } = sanitizeButtons(buttons || [])
  if (truncated) {
    console.warn(`[buildFrameHtml] Button limit exceeded: ${originalCount} buttons provided, truncated to 4`)
  }
  if (invalidTitles && invalidTitles.length > 0) {
    console.warn(`[buildFrameHtml] Button title length violations:`, invalidTitles)
  }
  
  // Build Frame metadata (Farcaster vNext format)
  // Reference: https://miniapps.farcaster.xyz/docs/specification
  // VERIFIED: Based on working Farville implementation (https://farville.farm)
  // Use 'launch_frame' to launch mini app within Warpcast (not external browser)
  // Use version: 'next' (Farville production-verified, November 19, 2025)
  const primaryButton = validatedButtons[0]
  const launchUrl = primaryButton?.target || frameOrigin
  const splashUrl = frameOrigin ? `${frameOrigin}/splash.png` : undefined
  
  // Yu-Gi-Oh! Rich Frame Palette (dynamic colors based on frame type)
  const getFramePalette = (type?: string) => {
    const palettes: Record<string, { primary: string; secondary: string; background: string; accent: string; label: string }> = {
      quest: { primary: '#8e7cff', secondary: '#a78bff', background: '#0a0520', accent: '#5ad2ff', label: 'QUEST' },
      guild: { primary: '#4da3ff', secondary: '#6bb5ff', background: '#050a20', accent: '#7CFF7A', label: 'GUILD' },
      leaderboards: { primary: '#ffd700', secondary: '#ffed4e', background: '#201a05', accent: '#ff6b6b', label: 'LEADERBOARD' },
      verify: { primary: '#7CFF7A', secondary: '#9bffaa', background: '#052010', accent: '#5ad2ff', label: 'VERIFY' },
      referral: { primary: '#ff6b9d', secondary: '#ff8db4', background: '#200510', accent: '#ffd700', label: 'REFERRAL' },
      onchainstats: { primary: '#00d4ff', secondary: '#5ae4ff', background: '#051520', accent: '#ffd700', label: 'ONCHAIN' },
      points: { primary: '#ffb700', secondary: '#ffc840', background: '#201405', accent: '#8e7cff', label: 'POINTS' },
      gm: { primary: '#ff9500', secondary: '#ffab40', background: '#201005', accent: '#7CFF7A', label: 'GM' },
      badge: { primary: '#ff00ff', secondary: '#ff69ff', background: '#200520', accent: '#00d4ff', label: 'BADGE' },
    }
    return palettes[type || ''] || { primary: '#8e7cff', secondary: '#a78bff', background: '#0a0e22', accent: '#5ad2ff', label: 'FRAME' }
  }
  
  const framePalette = getFramePalette(frameType)
  
  // Generate vNext JSON frame meta tag (single tag format for validator compatibility)
  // Reference: https://docs.farcaster.xyz/reference/frames/spec
  // CRITICAL: Match Farville format - use double quotes with &quot; encoding, not single quotes
  const frameMetaTags = primaryButton && frameOrigin && resolvedImage ? `
    <meta name="fc:frame" content="${JSON.stringify({
      version: 'next',
      imageUrl: resolvedImage,
      button: {
        title: primaryButton.label,
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: launchUrl,
          splashImageUrl: splashUrl,
          splashBackgroundColor: '#000000'
        }
      }
    }).replace(/"/g, '&quot;')}" />` : ''
  
  // Phase 1B.2: Generate classic Frames v1 button meta tags for POST actions
  // Reference: https://docs.farcaster.xyz/reference/frames/v1/spec
  // Supports multiple interactive POST buttons alongside vNext launch_frame
  // CRITICAL: Use post_url to point POST actions to this frame endpoint
  const postUrl = frameOrigin ? `${frameOrigin}/api/frame` : ''
  
  // Add frame state to track frame type for POST handler button mapping (Phase 1B.2)
  const frameStateTags = frameType ? `
    <meta property="fc:frame:state" content="${escapeHtml(JSON.stringify({ frameType }))}" />
    <meta property="fc:frame:post_url" content="${escapeHtml(postUrl)}" />` : ''
  
  const classicButtonTags = validatedButtons.length && postUrl ? validatedButtons.map((btn, idx) => {
    const buttonNumber = idx + 1
    const buttonAction = btn.action || 'link' // default to 'link' if action not specified
    
    // Only generate classic tags for POST action buttons (Phase 1B.2)
    if (buttonAction === 'post' || buttonAction === 'post_redirect') {
      return `
    <meta property="fc:frame:button:${buttonNumber}" content="${escapeHtml(btn.label)}" />
    <meta property="fc:frame:button:${buttonNumber}:action" content="${buttonAction}" />`
    }
    
    // For link buttons, still generate classic tags for compatibility
    if (buttonAction === 'link' && btn.target) {
      const sanitizedTarget = sanitizeUrl(btn.target)
      return `
    <meta property="fc:frame:button:${buttonNumber}" content="${escapeHtml(btn.label)}" />
    <meta property="fc:frame:button:${buttonNumber}:action" content="link" />
    <meta property="fc:frame:button:${buttonNumber}:target" content="${escapeHtml(sanitizedTarget)}" />`
    }
    
    return '' // skip if no valid action
  }).join('') : ''
  
  // Yu-Gi-Oh! Rich Template (November 21, 2025)
  // Enhanced card-style structure with dynamic palette, type badges, and rich visual effects
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${pageTitle}</title>
    <meta name="description" content="${desc}" />
    ${frameMetaTags}${frameStateTags}${classicButtonTags}
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${desc}" />
    ${imageEsc ? `<meta property="og:image" content="${imageEsc}" />` : ''}
    ${imageEsc ? `<meta property="og:image:width" content="600" />` : ''}
    ${imageEsc ? `<meta property="og:image:height" content="400" />` : ''}
    <meta property="og:url" content="${urlEsc}" />
    <meta property="fc:frame" content="${frameVersion || 'vNext'}" />
    <meta name="fc:frame:text" content="${composeTextEsc}" />
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, ${framePalette.background}, ${framePalette.secondary}20);
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
        /* Use dynamic viewport height for iOS Safari address bar handling */
        min-height: 100dvh;
      }
      /* Fallback for browsers without dvh support */
      @supports not (height: 100dvh) {
        body {
          min-height: 100vh;
        }
      }
      .container {
        max-width: 768px;
        margin: 0 auto;
        padding: 30px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        border: 2px solid ${framePalette.primary};
        box-shadow: 0 0 40px ${framePalette.primary}40;
        position: relative;
        overflow: hidden;
      }
      .container::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(135deg, ${framePalette.primary}20, ${framePalette.secondary}10);
        border-radius: 20px;
        z-index: -1;
      }
      .frame-badge {
        display: inline-block;
        padding: 6px 14px;
        background: ${framePalette.primary}40;
        border: 1px solid ${framePalette.primary};
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        color: ${framePalette.primary};
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }
      h1 {
        color: ${framePalette.primary};
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 700;
        text-shadow: 0 2px 8px ${framePalette.primary}40;
      }
      p {
        line-height: 1.7;
        color: rgb(226 231 255);
        margin: 12px 0;
        font-size: 15px;
      }
      .meta-info {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 16px 0;
        padding: 16px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        border: 1px solid ${framePalette.primary}20;
      }
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        color: ${framePalette.secondary};
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .meta-value {
        font-size: 16px;
        color: ${framePalette.accent};
        font-weight: 700;
      }
      a {
        color: ${framePalette.accent};
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
      }
      a:hover {
        text-decoration: underline;
        text-shadow: 0 0 8px ${framePalette.accent}60;
      }
      .powered-by {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid ${framePalette.primary}20;
        font-size: 12px;
        color: ${framePalette.secondary}80;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <span class="frame-badge">${framePalette.label}</span>
      ${chainLabel && chainIcon ? `<div class="chain-info" style="display: inline-flex; align-items: center; gap: 8px; margin: 12px 0; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid ${framePalette.primary}40;">
        <img src="${escapeHtml(chainIcon)}" alt="${escapeHtml(chainLabel)}" style="width: 20px; height: 20px; border-radius: 50%;" />
        <span style="color: ${framePalette.primary}; font-size: 14px; font-weight: 600;">${escapeHtml(chainLabel)}</span>
      </div>` : ''}
      <h1>${pageTitle}</h1>
      <p>${desc}</p>
      <div class="powered-by">Powered by @gmeowbased</div>
    </div>
  </body>
</html>`
}
