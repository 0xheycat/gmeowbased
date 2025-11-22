import { NextRequest, NextResponse } from 'next/server'

/**
 * Phase 1B.2 Test Route 2 - Minimal Approach
 * Testing minimal frame spec with just image + buttons
 * No vNext tag, no fc:frame version tag
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
  
  const frameImage = `${origin}/api/frame/image?type=${type}`
  const postUrl = `${origin}/api/frame`
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Test Route 2: Minimal Frame</title>
    
    <!-- Minimal Frame Spec - No fc:frame version tag -->
    <meta property="fc:frame:image" content="${frameImage}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
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
    
    <meta property="og:title" content="Test Route 2: Minimal Frame" />
    <meta property="og:description" content="Testing minimal frame spec" />
    <meta property="og:image" content="${frameImage}" />
  </head>
  <body>
    <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>🧪 Test Route 2: Minimal Approach</h1>
      <p><strong>Status:</strong> No fc:frame version tag, just image + buttons</p>
      
      <h2>Minimal Frame Format</h2>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto;">
fc:frame:image: ${frameImage}
fc:frame:image:aspect_ratio: 1.91:1
fc:frame:post_url: ${postUrl}
fc:frame:state: {"frameType":"${type}"}
fc:frame:button:1: "Open GM Ritual" (link)
fc:frame:button:2: "🎯 Record GM" (post)
fc:frame:button:3: "📊 View Stats" (post)
      </pre>
      
      <h2>Test URLs</h2>
      <ul>
        <li><a href="/api/frame-test2?type=gm">GM Frame Test</a></li>
        <li><a href="/api/frame-test2?type=points">Points Frame Test</a></li>
      </ul>
      
      <h2>Approach</h2>
      <p>This test removes the fc:frame property entirely to see if Farcaster reads just the button tags.</p>
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd;">
        <strong>⚠️ Test Route 2</strong> - Minimal frame spec experiment
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
