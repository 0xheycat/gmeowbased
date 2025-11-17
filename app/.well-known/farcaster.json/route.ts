import { NextResponse } from 'next/server'

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

export async function GET() {
  try {
    const manifest = {
      accountAssociation: {
        header: "eyJmaWQiOjE4MTM5LCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4OGEzMDk0ZTQ0NTc3NTc5ZDZmNDFGNjIxNGE4NkMyNTBiN2RCREM0ZSJ9",
        payload: "eyJkb21haW4iOiJnbWVvd2hxLmFydCJ9",
        signature: "ma2xN3r5WlQtga5DzVlKnRmyRpKVswxrrDbS0FkEIXtdns/IyQKA1irzruuaOYVI3vw5jkhEUXOc6vzbDOKNFRs="
      },
      miniapp: {
        version: "1",
        name: "Gmeowbased Adventure",
        iconUrl: `${baseUrl}/icon.png`,
        homeUrl: baseUrl,
        splashImageUrl: `${baseUrl}/splash.png`,
        splashBackgroundColor: "#0B0A16",
        webhookUrl: `${baseUrl}/api/neynar/webhook`,
        subtitle: "Daily GM Quest Hub",
        description: "Join the epic Gmeow Adventure! Daily GM rituals, cross-chain quests, guild battles, and prestige rewards across Base, Celo, Optimism, Unichain, and Ink.",
        primaryCategory: "social",
        tags: ["gm", "streak", "base", "social", "daily"],
        heroImageUrl: `${baseUrl}/hero.png`,
        tagline: "Keep your GM streak alive",
        ogTitle: "Gmeowbased Quest Game",
        ogDescription: "Daily GM quests, onchain streaks, and leaderboard rewards with GMEOW Adventure.",
        ogImageUrl: `${baseUrl}/og-image.png`,
        noindex: false,
        canonicalDomain: "gmeowhq.art",
        requiredChains: [
          "eip155:8453",
          "eip155:10",
          "eip155:42220"
        ],
        requiredCapabilities: [
          "actions.ready",
          "actions.composeCast",
          "wallet.getEthereumProvider"
        ]
      },
      baseBuilder: {
        ownerAddress: "0xB4F2fF92E8ccbbeAb7094cef5514A15aeBbbD11F"
      }
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    })
  } catch (error) {
    console.error('Error generating manifest:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
