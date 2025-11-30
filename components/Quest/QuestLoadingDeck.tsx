"use client"

import { cn } from '@/lib/utils'

type QuestLoadingDeckProps = {
  count?: number
  columns?: 'auto' | 'single' | 'dual'
  dense?: boolean
  className?: string
}

const DEFAULT_COUNT = 6

export default function QuestLoadingDeck({ count = DEFAULT_COUNT, columns = 'auto', dense = false, className }: QuestLoadingDeckProps) {
  const gridClass = columns === 'single'
    ? 'grid gap-5 grid-cols-1'
    : columns === 'dual'
      ? 'grid gap-5 sm:grid-cols-2'
      : 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'

  return (
    <div className={cn(gridClass, className)}>
      {Array.from({ length: Math.max(1, count) }).map((_, index) => (
        <article key={index} className={cn('quest-loading-card', dense && 'quest-loading-card--dense')}>
          <span className="quest-loading-aurora" aria-hidden />
          <div className="quest-loading-pill quest-loading-shimmer" aria-hidden />
          <div className="quest-loading-line quest-loading-lg quest-loading-shimmer" />
          <div className="quest-loading-line quest-loading-md quest-loading-shimmer" />
          <div className="quest-loading-body">
            <span className="quest-loading-line quest-loading-sm quest-loading-shimmer" />
            <span className="quest-loading-line quest-loading-sm quest-loading-shimmer delay-150" />
            <span className="quest-loading-line quest-loading-sm quest-loading-shimmer delay-300" />
          </div>
          <div className="quest-loading-chips">
            <span className="quest-loading-chip quest-loading-shimmer" />
            <span className="quest-loading-chip quest-loading-shimmer delay-150" />
            <span className="quest-loading-chip quest-loading-shimmer delay-300" />
          </div>
          <div className="quest-loading-progress" aria-hidden>
            <span className="quest-loading-progress-bar" />
          </div>
        </article>
      ))}
      <style jsx>{`
        .quest-loading-card {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid color-mix(in srgb, var(--frost-accent) 30%, var(--frost-border) 70%);
          background: color-mix(in srgb, var(--shell-overlay) 90%, transparent 10%);
          padding: 20px 18px;
          min-height: 180px;
        
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
        
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
        
          box-shadow:
            0 24px 70px color-mix(in srgb, var(--frost-shadow) 55%, transparent 45%);
        
          transition:
            border-color 200ms ease,
            box-shadow 230ms ease,
            transform 200ms ease;
        
          will-change: transform, border-color, box-shadow;
        }
        
        .quest-loading-card--dense {
          padding: 18px 16px;
          min-height: 160px;
          border-radius: 18px;
        }
        
        /* Frost overlay */
        .quest-loading-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            140deg,
            color-mix(in srgb, var(--frost-accent) 16%, transparent),
            color-mix(in srgb, var(--shell-info) 10%, transparent),
            color-mix(in srgb, var(--shell-overlay) 70%, transparent)
          );
          opacity: 0.55;
          pointer-events: none;
        }
        
        /* Content stays elevated */
        .quest-loading-card > * {
          position: relative;
          z-index: 1;
        }
        
        /* ----------------------------------------------------------
           AURORA SPIN
        ---------------------------------------------------------- */
        .quest-loading-aurora {
          position: absolute;
          inset: -55% -30%;
        
          background: conic-gradient(
            from 120deg,
            color-mix(in srgb, var(--frost-accent) 12%, transparent),
            color-mix(in srgb, var(--frost-accent) 25%, transparent),
            color-mix(in srgb, var(--frost-accent) 12%, transparent)
          );
        
          filter: blur(30px);
          opacity: 0.78;
        
          animation: quest-loading-spin 5s linear infinite;
          pointer-events: none;
          z-index: 0;
        
          will-change: transform;
        }
        
        /* ----------------------------------------------------------
           SHIMMER
        ---------------------------------------------------------- */
        
        .quest-loading-shimmer {
          position: relative;
          overflow: hidden;
        }
        
        .quest-loading-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
        
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--frost-accent) 55%, white 10%),
            transparent
          );
        
          transform: translateX(-120%);
          animation: quest-loading-shimmer 2.4s cubic-bezier(.25, .46, .45, .94) infinite;
          will-change: transform;
        }
        
        .quest-loading-shimmer.delay-150::after {
          animation-delay: .45s;
        }
        
        .quest-loading-shimmer.delay-300::after {
          animation-delay: .9s;
        }
        
        /* ----------------------------------------------------------
           BODY STRUCTURE
        ---------------------------------------------------------- */
        
        .quest-loading-pill {
          width: 120px;
          height: 14px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--frost-accent) 25%, transparent);
        }
        
        .quest-loading-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .quest-loading-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .quest-loading-chip {
          flex: 0 0 auto;
          width: 72px;
          height: 12px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--frost-accent) 18%, transparent);
        }
        
        .quest-loading-line {
          height: 14px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--frost-accent) 20%, transparent);
        }
        
        .quest-loading-lg {
          width: 78%;
        }
        
        .quest-loading-md {
          width: 58%;
        }
        
        .quest-loading-sm {
          width: 92%;
          height: 10px;
        }
        
        /* ----------------------------------------------------------
           PROGRESS BAR
        ---------------------------------------------------------- */
        
        .quest-loading-progress {
          position: relative;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        
        .quest-loading-progress-bar {
          position: absolute;
          inset: 0;
        
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--frost-accent) 85%, white 10%),
            transparent
          );
        
          animation: quest-loading-sweep 1.85s cubic-bezier(.25, .46, .45, .94) infinite;
          will-change: transform;
        }
        
        /* ----------------------------------------------------------
           INTERACTION
        ---------------------------------------------------------- */
        .quest-loading-card:hover {
          border-color: color-mix(in srgb, var(--frost-accent) 60%, white 10%);
          box-shadow:
            0 28px 80px color-mix(in srgb, var(--frost-shadow) 65%, transparent 35%);
          transform: translateY(-2px);
        }
        
        /* ----------------------------------------------------------
           ANIMATIONS
        ---------------------------------------------------------- */
        
        @keyframes quest-loading-spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes quest-loading-sweep {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes quest-loading-shimmer {
          0%   { transform: translateX(-120%); }
          50%  { transform: translateX(25%); }
          100% { transform: translateX(120%); }
        }
        
        /* ----------------------------------------------------------
           REDUCED MOTION (A11y)
        ---------------------------------------------------------- */
        @media (prefers-reduced-motion: reduce) {
          .quest-loading-aurora,
          .quest-loading-shimmer::after,
          .quest-loading-progress-bar {
            animation: none !important;
            transform: none !important;
          }
        
          .quest-loading-card {
            transition: none !important;
          }
        }
        
        /* ----------------------------------------------------------
           RESPONSIVE SIZING (Mobile optimization)
        ---------------------------------------------------------- */
        @media (min-width: 640px) {
          .quest-loading-card {
            padding: 26px 24px;
            min-height: 260px;
          }
          
          .quest-loading-card--dense {
            padding: 22px 20px;
            min-height: 210px;
          }
        }
        
      `}</style>
    </div>
  )
}
