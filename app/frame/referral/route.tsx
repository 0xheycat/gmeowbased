// app/frame/referral/route.tsx
// Dynamic Referral Sharing Frame Route

import { NextResponse } from 'next/server'
import { buildDynamicFrameImageUrl } from '@/lib/api/share'

export const runtime = 'nodejs'
export const revalidate = 300

function shortenHex(value: string, size = 4) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed
  return `${trimmed.slice(0, 2 + size)}…${trimmed.slice(-size)}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  
  const user = url.searchParams.get('user') || url.searchParams.get('addr') || ''
  const code = url.searchParams.get('code') || url.searchParams.get('ref') || ''
  const referrerFid = url.searchParams.get('referrerFid') || url.searchParams.get('fid') || ''
  const referrerUsername = url.searchParams.get('referrerUsername') || url.searchParams.get('username') || ''
  const referralCount = url.searchParams.get('referralCount') || url.searchParams.get('count') || '0'
  const rewardAmount = url.searchParams.get('rewardAmount') || url.searchParams.get('rewards') || '0'
  
  const shareUrl = `${origin}/referral${code ? `?code=${encodeURIComponent(String(code))}` : ''}`
  const title = code ? `Summon Frens • Code ${String(code).toUpperCase()}` : 'Summon Frens • Referral'
  const descriptionPieces: string[] = []
  if (code) descriptionPieces.push(`Share code ${String(code).toUpperCase()} to split gmeowbased Points with frens.`)
  descriptionPieces.push('Each completed quest powers up the guild streaks.')
  if (user) descriptionPieces.push(`Tracked to ${shortenHex(String(user))}`)
  descriptionPieces.push('— @gmeowbased')
  const description = descriptionPieces.join(' • ')
  
  const imageUrl = buildDynamicFrameImageUrl({
    type: 'referral',
    user,
    fid: referrerFid ? Number(referrerFid) : undefined,
    referral: code,
    extra: { referrerFid, referrerUsername, referralCount, rewardAmount, inviteCode: code }
  }, origin)
  
  const frameJson = {
    version: 'next',
    imageUrl,
    button: {
      title: code ? `Share ${String(code).toUpperCase()}` : 'Open Referral Hub',
      action: {
        type: 'launch_frame',
        name: 'Gmeowbased',
        url: shareUrl,
        splashImageUrl: `${origin}/splash.png`,
        splashBackgroundColor: '#000000'
      }
    }
  }
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="fc:frame" content="${JSON.stringify(frameJson).replace(/"/g, '&quot;')}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <style>
      body{margin:0;padding:20px;background:linear-gradient(135deg,#200510,#ff6b9d20);font-family:system-ui,sans-serif;color:#fff;min-height:100dvh}
      .container{max-width:768px;margin:0 auto;padding:30px;background:rgba(0,0,0,.6);border-radius:20px;border:2px solid #ff6b9d}
      h1{color:#ff6b9d;margin:0 0 16px}
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </div>
  </body>
</html>`
  
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-frame-options': 'ALLOWALL',
      'access-control-allow-origin': '*'
    }
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))
}