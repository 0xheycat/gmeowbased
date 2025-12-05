/**
 * QuestCard - Professional quest card with Material Design elevation
 * 
 * @component
 * Template: jumbo-7.4/JumboCardFeatured (60% adaptation - MUI → Tailwind)
 * Adaptation: Backdrop, elevation, separator, image overlay
 * 
 * Features:
 * - Professional backdrop blur effect
 * - Material Design elevation (shadow-2xl)
 * - Separator tick mark
 * - Gradient overlay on image
 * - Professional hover animations
 * - Featured badge with Star icon
 * 
 * Usage:
 * <QuestCard
 *   id="123"
 *   title="Viral Champion"
 *   slug="viral-champion"
 *   category="Social"
 *   coverImage="/quests/viral-champion.jpg"
 *   xpReward={100}
 *   creator={{ avatar: "/avatars/creator.jpg", name: "gmeow", fid: 12345 }}
 *   participantCount={1234}
 *   estimatedTime="~10 min"
 * />
 */

import Image from 'next/image';
import Link from 'next/link';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { cn } from '@/lib/utils';

export interface QuestCardProps {
  /** Quest ID */
  id: string | number;
  /** Quest title */
  title: string;
  /** Quest URL slug */
  slug: string;
  /** Quest category/type name */
  category: string;
  /** Quest cover image */
  coverImage: string;
  /** Quest badge/icon image (optional) */
  badgeImage?: string;
  /** XP reward amount */
  xpReward: number;
  /** Quest creator info */
  creator: {
    avatar?: string;
    name: string;
    fid: number;
  };
  /** Participant count (optional) */
  participantCount?: number;
  /** Estimated time (optional) */
  estimatedTime?: string;
  /** Quest status (optional) */
  status?: 'active' | 'completed' | 'locked' | 'upcoming';
  /** Additional className */
  className?: string;
  /** Priority loading for above-fold images (Task 6) */
  priority?: boolean;
  /** Show featured badge */
  showFeaturedBadge?: boolean;
  /** Backdrop blur opacity (0-1) */
  backdropOpacity?: number;
  /** Show Material Design separator tick */
  showSeparator?: boolean;
}

export default function QuestCard({
  id,
  title,
  slug,
  category,
  coverImage,
  xpReward,
  creator,
  participantCount,
  estimatedTime,
  status = 'active',
  className,
  priority = false,
  showFeaturedBadge = false,
  backdropOpacity = 0.15,
  showSeparator = true,
}: QuestCardProps) {

  return (
    <Link href={`/quests/${slug || id}`} className="block group">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl transition-all duration-300',
          'bg-white dark:bg-gray-800',
          'shadow-xl hover:shadow-2xl',
          'hover:-translate-y-2',
          'border border-gray-200 dark:border-gray-700',
          status === 'locked' && 'opacity-60 cursor-not-allowed',
          className,
        )}
      >
        {/* Image Section with Gradient Overlay - MOVED TO TOP */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={coverImage}
            alt={title}
            fill
            priority={priority}
            className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
          />
          {/* Gradient Overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
          
          {/* Badges on Image - Top Absolute Position */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-20">
            <div className="flex flex-col gap-2">
              {/* Featured Badge (Optional) */}
              {showFeaturedBadge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/90 text-yellow-900 border border-yellow-400 backdrop-blur-sm shadow-lg">
                  <StarIcon className="w-3.5 h-3.5 fill-current" />
                  Featured
                </span>
              )}
              
              {/* Category Badge */}
              <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-500/90 text-white border border-primary-400 backdrop-blur-sm shadow-lg">
                {category}
              </span>
            </div>
            
            {/* XP Badge - Top Right */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-yellow-500/90 text-yellow-900 border border-yellow-400 backdrop-blur-sm shadow-lg">
              <EmojiEventsIcon className="w-4 h-4" />
              <span>{xpReward} XP</span>
            </div>
          </div>

          {/* Title & Creator Overlay - Bottom Absolute Position */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            {/* Material Design Separator Tick */}
            {showSeparator && (
              <div className="w-8 h-1 bg-primary-400 rounded-full mb-3" />
            )}
            
            <h3 className="text-2xl font-bold text-white mb-3 leading-tight">
              {title}
            </h3>
            
            {/* Creator Info */}
            <div className="flex items-center gap-2">
              {creator.avatar && (
                <Image
                  src={creator.avatar}
                  alt={creator.name}
                  width={24}
                  height={24}
                  className="rounded-full ring-2 ring-white/50"
                />
              )}
              <span className="text-sm text-white/90">
                by <span className="font-semibold text-white">{creator.name}</span>
              </span>
            </div>
          </div>

          {/* Backdrop Blur Effect */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-primary-600/15 to-primary-700/20 backdrop-blur-[0.5px] pointer-events-none z-10"
            style={{ opacity: backdropOpacity }}
          />
        </div>

        {/* Content Section - Below Image */}
        <div className="p-6 space-y-4 bg-white dark:bg-gray-800">
          {/* Stats Row */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {participantCount !== undefined && (
              <div className="flex items-center gap-1.5">
                <PeopleIcon className="w-4 h-4" />
                <span className="font-medium">{participantCount.toLocaleString()} joined</span>
              </div>
            )}
            {estimatedTime && (
              <div className="flex items-center gap-1.5">
                <AccessTimeIcon className="w-4 h-4" />
                <span className="font-medium">{estimatedTime}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <div className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 font-semibold text-lg group-hover:gap-3 transition-all">
              <span>Start Quest</span>
              <ArrowForwardIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
