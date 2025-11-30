/**
 * Featured Quest Card - Layer3-Inspired
 * 
 * Large hero-style quest card for daily/featured missions
 * Inspired by Layer3's "Curated Activations"
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'

interface FeaturedQuest {
  id: string
  title: string
  description: string
  reward: {
    amount: number
    type: 'xp' | 'points' | 'badges'
    label: string
  }
  difficulty: 'easy' | 'medium' | 'hard'
  timeLeft?: string
  participants?: number
  imageUrl?: string
  href: string
  tags?: string[]
}

interface FeaturedQuestCardProps {
  quest: FeaturedQuest
}

const difficultyColors = {
  easy: 'from-green-500 to-emerald-500',
  medium: 'from-yellow-500 to-orange-500',
  hard: 'from-red-500 to-pink-500',
}

const difficultyLabels = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Expert',
}

export function FeaturedQuestCard({ quest }: FeaturedQuestCardProps) {
  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold theme-text-primary">🎯 Featured Quest</h2>
          <p className="text-sm theme-text-secondary mt-1">Complete today's challenge for bonus rewards</p>
        </div>
        {quest.timeLeft && (
          <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-pink-500/20 dark:from-orange-500/30 dark:to-pink-500/30 border border-orange-500/30 dark:border-orange-500/40">
            <div className="text-xs font-semibold theme-text-secondary">ENDS IN</div>
            <div className="text-lg font-bold theme-text-primary">{quest.timeLeft}</div>
          </div>
        )}
      </div>

      {/* Card */}
      <Link href={quest.href}>
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-sky-500/10 dark:from-purple-500/20 dark:via-purple-600/10 dark:to-sky-500/20 border border-purple-500/30 dark:border-purple-500/40 hover:border-purple-500/60 dark:hover:border-purple-500/70 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500 rounded-full blur-3xl animate-float-delayed" />
          </div>

          <div className="relative grid md:grid-cols-2 gap-6 p-8">
            {/* Left Side - Content */}
            <div className="flex flex-col justify-center space-y-6">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${difficultyColors[quest.difficulty]} shadow-lg`}>
                  {difficultyLabels[quest.difficulty]}
                </div>
                {quest.tags?.map((tag) => (
                  <div key={tag} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm theme-text-secondary border border-white/20 dark:border-gray-700/50">
                    {tag}
                  </div>
                ))}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-3xl md:text-4xl font-black theme-text-primary mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {quest.title}
                </h3>
                <p className="text-lg theme-text-secondary leading-relaxed">
                  {quest.description}
                </p>
              </div>

              {/* Stats */}
              {quest.participants && (
                <div className="flex items-center gap-2 text-sm theme-text-secondary">
                  <span className="text-2xl">👥</span>
                  <span className="font-semibold">{quest.participants.toLocaleString()} pilots active</span>
                </div>
              )}

              {/* Reward */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 dark:from-yellow-500/20 dark:via-orange-500/20 dark:to-pink-500/20 border border-yellow-500/30 dark:border-yellow-500/40">
                <div className="text-sm font-semibold theme-text-secondary mb-2">QUEST REWARD</div>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-black bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-600 dark:from-yellow-400 dark:via-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
                    +{quest.reward.amount}
                  </span>
                  <div>
                    <div className="text-xl font-bold theme-text-primary">{quest.reward.label}</div>
                    <div className="text-xs theme-text-secondary">Instant reward</div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button className="group/btn w-full py-4 px-8 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-500 to-sky-500 hover:from-purple-600 hover:to-sky-600 shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                <span className="flex items-center justify-center gap-3">
                  <span>START QUEST NOW</span>
                  <span className="group-hover/btn:translate-x-2 transition-transform">→</span>
                </span>
              </button>
            </div>

            {/* Right Side - Visual */}
            <div className="relative flex items-center justify-center">
              {quest.imageUrl ? (
                <div className="relative w-full h-64 md:h-full rounded-2xl overflow-hidden group-hover:scale-110 transition-transform duration-500">
                  <Image
                    src={quest.imageUrl}
                    alt={quest.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-full h-64 md:h-full flex items-center justify-center">
                  <div className="text-9xl opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
                    🎯
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
