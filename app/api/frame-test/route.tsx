import { NextRequest, NextResponse } from 'next/server'

/**
 * Phase 1B.2 Test Route - vNext Multi-Button Format
 * Testing vNext spec with multiple buttons based on Neynar reference
 * Reference: Paragraph frame with 4 buttons (Open, Read Inline, Subscribe, Mint)
 * 
 * DO NOT USE IN PRODUCTION - Test route only
 */

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = url.origin
  
  const type = url.searchParams.get('type') || 'gm'
  
  // EXACT COPY of main route structure that creates valid embed
  const frameImage = `${origin}/api/frame/image?type=${type}`
  const launchUrl = `${origin}/gm`
  const splashUrl = `${origin}/splash.png`
  const postUrl = `${origin}/api/frame`
  
  // CRITICAL: vNext single button tag (makes it a valid embed like main route)
  const vNextTag = `<meta name="fc:frame" content="${escapeHtml(JSON.stringify({
    version: 'next',
    imageUrl: frameImage,
    button: {
      title: 'Open GM Ritual',
      action: {
        type: 'launch_frame',
        name: 'Gmeowbased',
        url: launchUrl,
        splashImageUrl: splashUrl,
        splashBackgroundColor: '#000000'
      }
    }
  }))}" />`
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Test Route 3: Exact Main Clone</title>
    
    <!-- vNext single button (EXACT copy from main route) -->
    ${vNextTag}
    
    <!-- Classic Frames v1 tags (same as main route) -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${frameImage}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    <meta property="fc:frame:state" content="${escapeHtml(JSON.stringify({ frameType: type }))}" />
    
    <!-- Button 1: Link action -->
    <meta property="fc:frame:button:1" content="Open GM Ritual" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${origin}/gm" />
    
    <!-- Button 2: POST action -->
    <meta property="fc:frame:button:2" content="🎯 Record GM" />
    <meta property="fc:frame:button:2:action" content="post" />
    
    <!-- Button 3: POST action -->
    <meta property="fc:frame:button:3" content="📊 View Stats" />
    <meta property="fc:frame:button:3:action" content="post" />
    
    <meta property="og:title" content="Test vNext Multi-Button Frame" />
    <meta property="og:description" content="Testing vNext spec with multiple buttons" />
    <meta property="og:image" content="${origin}/api/frame/image?type=${type}" />
  </head>
  <body>
    <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>🧪 Test Route 3: Exact Main Clone</h1>
      <p><strong>Status:</strong> EXACT copy of main route structure</p>
      
      <h2>Why This Should Work</h2>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
Main route has:
1. vNext single button tag (name="fc:frame") ← MAKES IT VALID EMBED
2. Classic Frames v1 tags (property="fc:frame:button:N")

This test route copies EXACTLY the same structure.
      </pre>
      
      <h2>Test URLs</h2>
      <ul>
        <li><a href="/api/frame-test?type=gm">GM Frame Test</a></li>
        <li><a href="/api/frame-test?type=points">Points Frame Test</a></li>
        <li><a href="https://farcaster.xyz/~/compose?embeds[]=${encodeURIComponent(origin + '/api/frame-test?type=gm')}">Test in Farcaster Composer</a></li>
      </ul>
      
      <h2>Expected Behavior</h2>
      <ul>
        <li>✅ Button 1: "Open GM Ritual" (link action)</li>
        <li>✅ Button 2: "🎯 Record GM" (post action)</li>
        <li>✅ Button 3: "📊 View Stats" (post action)</li>
      </ul>
      
      <h2>Classic Frames v1 Reference</h2>
      <p>Using standard Farcaster Frames v1 spec for self-hosted frames:</p>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
https://docs.farcaster.xyz/reference/frames/spec
- fc:frame property meta tags
- Multiple buttons with individual action tags
- POST actions for interactive buttons
      </pre>
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd;">
        <strong>⚠️ Test Route Only</strong> - This endpoint tests Classic Frames v1 format before applying to production.
      </p>
    </div>
  </body>
</html>`
  
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
