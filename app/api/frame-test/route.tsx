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
  
  // Test vNext format with multiple buttons (Neynar reference format)
  const vNextMultiButton = {
    version: 'vNext',
    imageUrl: `${origin}/api/frame/image?type=${type}`,
    buttons: [
      {
        index: 1,
        title: 'Open GM Ritual',
        action_type: 'launch_frame',
        target: `${origin}/gm`,
        splash_image_url: `${origin}/splash.png`,
        splash_background_color: '#000000'
      },
      {
        index: 2,
        title: '🎯 Record GM',
        action_type: 'post',
        post_url: `${origin}/api/frame`
      },
      {
        index: 3,
        title: '📊 View Stats',
        action_type: 'post',
        post_url: `${origin}/api/frame`
      }
    ],
    state: {
      frameType: type
    }
  }
  
  // Generate vNext meta tag
  const vNextTag = `<meta name="fc:frame" content="${escapeHtml(JSON.stringify(vNextMultiButton))}" />`
  
  // Also include Classic Frames v1 for fallback
  const classicTags = `
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${origin}/api/frame/image?type=${type}" />
    <meta property="fc:frame:post_url" content="${origin}/api/frame" />
    <meta property="fc:frame:state" content="${escapeHtml(JSON.stringify({ frameType: type }))}" />
    <meta property="fc:frame:button:1" content="Open GM Ritual" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${origin}/gm" />
    <meta property="fc:frame:button:2" content="🎯 Record GM" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:button:3" content="📊 View Stats" />
    <meta property="fc:frame:button:3:action" content="post" />`
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Test vNext Multi-Button Frame</title>
    
    <!-- vNext Format with Multiple Buttons (Test) -->
    ${vNextTag}
    
    <!-- Classic Frames v1 Fallback -->
    ${classicTags}
    
    <meta property="og:title" content="Test vNext Multi-Button Frame" />
    <meta property="og:description" content="Testing vNext spec with multiple buttons" />
    <meta property="og:image" content="${origin}/api/frame/image?type=${type}" />
  </head>
  <body>
    <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>🧪 Frame Test Route</h1>
      <p><strong>Status:</strong> Testing vNext multi-button format</p>
      
      <h2>vNext Format (Neynar Reference)</h2>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">${escapeHtml(JSON.stringify(vNextMultiButton, null, 2))}</pre>
      
      <h2>Test URLs</h2>
      <ul>
        <li><a href="/api/frame-test?type=gm">GM Frame Test</a></li>
        <li><a href="/api/frame-test?type=points">Points Frame Test</a></li>
        <li><a href="https://farcaster.xyz/~/compose?embeds[]=${encodeURIComponent(origin + '/api/frame-test?type=gm')}">Test in Farcaster Composer</a></li>
      </ul>
      
      <h2>Expected Behavior</h2>
      <ul>
        <li>✅ Button 1: "Open GM Ritual" (launch_frame action)</li>
        <li>✅ Button 2: "🎯 Record GM" (post action)</li>
        <li>✅ Button 3: "📊 View Stats" (post action)</li>
      </ul>
      
      <h2>Neynar Reference Structure</h2>
      <p>Based on Paragraph frame with 4 buttons:</p>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">{
  "version": "vNext",
  "buttons": [
    { "index": 1, "title": "Open", "action_type": "post_redirect", ... },
    { "index": 2, "title": "Read Inline", "action_type": "post", ... },
    { "index": 3, "title": "Subscribe 🔔", "action_type": "post", ... },
    { "index": 4, "title": "Mint", "action_type": "post", ... }
  ]
}</pre>
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd;">
        <strong>⚠️ Test Route Only</strong> - This endpoint is for testing vNext multi-button format before applying to production.
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
