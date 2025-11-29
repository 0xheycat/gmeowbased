/**
 * Testimonials Component - Gmeowbased Landing Page
 * Fetches and displays featured testimonials from database
 * Server Component - fetches data at build/request time
 * 
 * Template Compliance:
 * - Uses Card/CardBody from tailwick-primitives (Tailwick v2.0)
 * - Uses Gmeowbased v0.1 avatar images
 * - Real data from Supabase testimonials table
 */

import Image from 'next/image'
import { Card, CardBody } from '@/components/ui/tailwick-primitives'

interface Testimonial {
  id: string
  username: string
  role: string
  quote: string
  avatar_url: string
  display_order: number
}

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/testimonials`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch testimonials')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    // Return fallback data
    return [
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
    ]
  }
}

export async function Testimonials() {
  const testimonials = await getTestimonials()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((testimonial: Testimonial) => (
        <Card key={testimonial.id} gradient="purple">
          <CardBody>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3 shadow-lg bg-gradient-to-br from-purple-400 to-pink-500">
                <Image
                  src={`/assets/gmeow-illustrations/Avatars/${testimonial.avatar_url}`}
                  alt={testimonial.username}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-bold">{testimonial.username}</div>
                <div className="text-sm text-purple-300">{testimonial.role}</div>
              </div>
            </div>
            <p className="text-purple-200 leading-relaxed italic">"{testimonial.quote}"</p>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

export function TestimonialsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} gradient="purple">
          <CardBody>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-700/50 animate-pulse mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-purple-700/50 rounded animate-pulse mb-2 w-24"></div>
                <div className="h-3 bg-purple-700/30 rounded animate-pulse w-32"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-purple-700/30 rounded animate-pulse w-full"></div>
              <div className="h-3 bg-purple-700/30 rounded animate-pulse w-5/6"></div>
              <div className="h-3 bg-purple-700/30 rounded animate-pulse w-4/6"></div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
