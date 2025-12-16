/**
 * XP Celebration System - Confetti Canvas
 * 
 * Canvas-based particle system with branded shapes.
 * 
 * Features:
 * - 60fps performance (GPU-accelerated)
 * - 5 particle shapes (rectangle, circle, star, heart, catPaw)
 * - Physics-based motion (gravity + wind + rotation)
 * - Tier-based colors
 * - 2-3 second lifecycle with fade-out
 * - Configurable particle count (default: 40, max: 80 for tier-change)
 * 
 * Particle Shapes:
 * - rectangle: Classic confetti
 * - circle: Round particles
 * - star: 5-pointed stars
 * - heart: Bezier curve hearts
 * - catPaw: Gmeowbased branded (main pad + 3 toes)
 * 
 * Performance:
 * - Target: 60fps
 * - Max particles: 80 (tier-change variant)
 * - Canvas cleanup on unmount
 * - Respects prefers-reduced-motion
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { Particle, ConfettiCanvasProps, ParticleShape } from './types'
import { ANIMATION_TIMINGS } from './types'

/**
 * Physics constants for realistic particle motion
 */
const PHYSICS = {
  gravity: 0.5, // Downward acceleration
  windMin: -0.2, // Wind horizontal force (left)
  windMax: 0.2, // Wind horizontal force (right)
  rotationSpeedMin: -5, // Rotation speed range
  rotationSpeedMax: 5,
  velocityXMin: -8, // Initial horizontal velocity
  velocityXMax: 8,
  velocityYMin: -15, // Initial upward velocity
  velocityYMax: -8,
  sizeMin: 4, // Particle size range
  sizeMax: 10,
} as const

/**
 * Create a single particle with randomized properties
 */
function createParticle(
  canvasWidth: number,
  canvasHeight: number,
  colors: string[],
  shapes: ParticleShape[] = ['rectangle']
): Particle {
  return {
    x: canvasWidth / 2, // Start from center
    y: canvasHeight / 2,
    vx: Math.random() * (PHYSICS.velocityXMax - PHYSICS.velocityXMin) + PHYSICS.velocityXMin,
    vy: Math.random() * (PHYSICS.velocityYMin - PHYSICS.velocityYMin) + PHYSICS.velocityYMin,
    color: colors[Math.floor(Math.random() * colors.length)] || '#FFFFFF',
    size: Math.random() * (PHYSICS.sizeMax - PHYSICS.sizeMin) + PHYSICS.sizeMin,
    opacity: 1,
    rotation: Math.random() * 360,
    rotationSpeed: Math.random() * (PHYSICS.rotationSpeedMax - PHYSICS.rotationSpeedMin) + PHYSICS.rotationSpeedMin,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }
}

/**
 * Update particle physics (position, rotation, opacity)
 */
function updateParticle(particle: Particle, deltaTime: number): Particle {
  // Apply gravity
  particle.vy += PHYSICS.gravity

  // Apply wind (random horizontal force)
  const wind = Math.random() * (PHYSICS.windMax - PHYSICS.windMin) + PHYSICS.windMin
  particle.vx += wind

  // Update position
  particle.x += particle.vx * deltaTime
  particle.y += particle.vy * deltaTime

  // Update rotation
  particle.rotation += particle.rotationSpeed * deltaTime

  // Fade out over time (last 1 second)
  particle.opacity = Math.max(0, particle.opacity - 0.008 * deltaTime)

  return particle
}

/**
 * Draw 5-pointed star shape
 */
function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const spikes = 5
  const outerRadius = size
  const innerRadius = size * 0.4
  
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (i * Math.PI) / spikes - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw heart shape using bezier curves
 */
function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
  const scale = size / 10
  ctx.beginPath()
  ctx.moveTo(0, 3 * scale)
  ctx.bezierCurveTo(-5 * scale, -3 * scale, -10 * scale, 2 * scale, 0, 10 * scale)
  ctx.bezierCurveTo(10 * scale, 2 * scale, 5 * scale, -3 * scale, 0, 3 * scale)
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw cat paw shape (Gmeowbased branded)
 * Consists of main pad (ellipse) + 3 toe pads (circles)
 */
function drawCatPaw(ctx: CanvasRenderingContext2D, size: number) {
  const scale = size / 10
  
  // Main pad (bottom)
  ctx.beginPath()
  ctx.ellipse(0, 3 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Top left toe
  ctx.beginPath()
  ctx.arc(-3 * scale, -3 * scale, 2 * scale, 0, Math.PI * 2)
  ctx.fill()
  
  // Top middle toe
  ctx.beginPath()
  ctx.arc(0, -4 * scale, 2 * scale, 0, Math.PI * 2)
  ctx.fill()
  
  // Top right toe
  ctx.beginPath()
  ctx.arc(3 * scale, -3 * scale, 2 * scale, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Draw a single particle on canvas with shape-based rendering
 */
function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  ctx.save()

  // Translate to particle position
  ctx.translate(particle.x, particle.y)

  // Rotate canvas
  ctx.rotate((particle.rotation * Math.PI) / 180)

  // Set particle appearance
  ctx.globalAlpha = particle.opacity
  ctx.fillStyle = particle.color

  // Draw shape based on particle type
  const halfSize = particle.size / 2
  
  switch (particle.shape) {
    case 'circle':
      ctx.beginPath()
      ctx.arc(0, 0, halfSize, 0, Math.PI * 2)
      ctx.fill()
      break
      
    case 'star':
      drawStar(ctx, halfSize)
      break
      
    case 'heart':
      drawHeart(ctx, halfSize)
      break
      
    case 'catPaw':
      drawCatPaw(ctx, halfSize)
      break
      
    case 'rectangle':
    default:
      // Original rectangle confetti
      ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size * 1.5)
      break
  }

  ctx.restore()
}

/**
 * Confetti Canvas Component (Phase 3 Enhancement - Branded Shapes)
 * Canvas-based particle system for XP celebration with custom shapes
 */
export function ConfettiCanvas({
  colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'],
  duration = ANIMATION_TIMINGS.confettiFall,
  particleCount = 40,
  shapes = ['rectangle', 'circle', 'star', 'heart', 'catPaw'], // All 5 branded shapes
}: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Skip animation for reduced motion
    if (prefersReducedMotion) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // Performance optimization
    })
    if (!ctx) return

    // Set canvas size
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    // Initialize particles with branded shapes
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(canvas.width, canvas.height, colors, shapes)
    )

    // Animation loop
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current

      // Stop animation after duration
      if (elapsed > duration) {
        return
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current = particlesRef.current
        .map((particle) => updateParticle(particle, 1)) // deltaTime = 1 for 60fps
        .filter((particle) => particle.opacity > 0) // Remove fully faded particles

      particlesRef.current.forEach((particle) => {
        drawParticle(ctx, particle)
      })

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Start animation with delay (after burst)
    setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(animate)
    }, ANIMATION_TIMINGS.confettiBurst)

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', setCanvasSize)
    }
  }, [colors, duration, particleCount, prefersReducedMotion])

  // Don't render canvas for reduced motion
  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-50"
      style={{
        mixBlendMode: 'screen', // Visual blend effect
      }}
      aria-hidden="true"
    />
  )
}
