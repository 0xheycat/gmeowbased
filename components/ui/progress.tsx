"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
  }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
  ref={ref}
  aria-label="Rank progress"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={value ?? 0}
  className={cn(
    "relative h-2 w-full overflow-hidden rounded-full backdrop-blur-md bg-gradient-to-r from-white/10 via-white/5 to-transparent border border-slate-200 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
    className
  )}
  {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
