import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/testimonials
 * Fetches featured testimonials from Supabase
 * Used by landing page Testimonials component
 */
export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch featured testimonials
    const { data, error } = await supabase
      .from('testimonials')
      .select('id, username, role, quote, avatar_url, display_order')
      .eq('is_featured', true)
      .order('display_order', { ascending: true })
      .limit(3)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    
    // Return fallback data on error
    return NextResponse.json([
      {
        id: '1',
        username: '@cryptoGM',
        role: 'Level 47 Explorer',
        quote: "Best on-chain game I've played. The daily GM streak keeps me coming back, and the multi-chain quests are genuinely fun!",
        avatar_url: '01- Default Avatar.png',
        display_order: 1
      },
      {
        id: '2',
        username: '@defiQueen',
        role: 'Guild Leader',
        quote: "Love the guild system! We're competing for the top spot and the community is amazing. Can't wait for the next season.",
        avatar_url: '02.jpg',
        display_order: 2
      },
      {
        id: '3',
        username: '@baseBuilder',
        role: 'Badge Collector',
        quote: "The NFT badges are amazing! Just minted my first Mythic rarity. The quest variety keeps things fresh every day.",
        avatar_url: '03.jpg',
        display_order: 3
      }
    ])
  }
}
