/**
 * Points Cost Badge Component
 * Template: gmeowbased0.6/badge.tsx (0% adaptation)
 * 
 * Shows real-time quest creation cost with breakdown tooltip
 * Uses NEW foundation patterns only
 */

'use client'

import { useState } from 'react'

interface QuestCostBreakdown {
  base: number
  tasks: number
  rewards: number
  pointsEscrow: number
  badge: number
  total: number
}

interface PointsCostBadgeProps {
  cost: QuestCostBreakdown
  className?: string
}

export function PointsCostBadge({ cost, className = '' }: PointsCostBadgeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowBreakdown(true)}
        onMouseLeave={() => setShowBreakdown(false)}
        className={`flex items-center gap-2 text-lg px-4 py-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors ${className}`}
      >
        <span className="text-muted-foreground">Total Cost:</span>
        <span className="font-bold">{cost.total} POINTS</span>
      </button>

      {/* Breakdown Tooltip */}
      {showBreakdown && (
        <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="text-sm space-y-2">
            <div className="font-semibold mb-3 pb-2 border-b border-border">
              Cost Breakdown
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Cost:</span>
              <span className="font-medium">{cost.base} pts</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasks ({cost.tasks / 20}):</span>
              <span className="font-medium">{cost.tasks} pts</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">XP Rewards:</span>
              <span className="font-medium">{cost.rewards} pts</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Points Escrow:</span>
              <span className="font-medium">{cost.pointsEscrow} pts</span>
            </div>
            
            {cost.badge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Badge:</span>
                <span className="font-medium">{cost.badge} pts</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 border-t border-border font-bold">
              <span>Total:</span>
              <span>{cost.total} pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
