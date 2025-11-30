'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { type IconName } from '@/utils/assets'

interface FeatureCardProps {
  iconName: IconName
  title: string
  description: string
  gradient?: string
}

export function FeatureCard({ iconName, title, description, gradient = 'from-purple-800/80 to-purple-900/80' }: FeatureCardProps) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-8 backdrop-blur border border-purple-700/50 hover:border-purple-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20`}>
      <div className="mb-4 flex justify-center">
        <Image
          src={`/assets/icons/${iconName.charAt(0).toUpperCase() + iconName.slice(1)} Icon.svg`}
          alt={title}
          width={64}
          height={64}
          className="w-16 h-16"
        />
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-purple-200 leading-relaxed">{description}</p>
    </div>
  )
}

interface StatCardProps {
  value: string
  label: string
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="text-center p-6 rounded-2xl bg-purple-800/30 border border-purple-700/30 hover:border-purple-500/50 transition-all hover:scale-105">
      <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">{value}</div>
      <div className="text-purple-200">{label}</div>
    </div>
  )
}

interface StepCardProps {
  number: number
  title: string
  description: string
}

export function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold border-4 border-purple-400 shadow-lg shadow-purple-600/50">
          {number}
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-purple-200 leading-relaxed">{description}</p>
    </div>
  )
}

interface TestimonialCardProps {
  avatar: string
  name: string
  role: string
  quote: string
}

export function TestimonialCard({ avatar, name, role, quote }: TestimonialCardProps) {
  return (
    <div className="rounded-2xl bg-purple-800/30 p-8 border border-purple-700/50 hover:border-purple-500/50 transition-all hover:scale-105">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-2xl mr-3 shadow-lg">
          {avatar}
        </div>
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-sm text-purple-300">{role}</div>
        </div>
      </div>
      <p className="text-purple-200 leading-relaxed italic">"{quote}"</p>
    </div>
  )
}

interface SectionProps {
  children: ReactNode
  className?: string
  dark?: boolean
}

export function Section({ children, className = '', dark = false }: SectionProps) {
  return (
    <section className={`py-20 px-4 ${dark ? 'bg-black/30' : ''} ${className}`}>
      <div className="container mx-auto max-w-6xl">
        {children}
      </div>
    </section>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 font-gmeow">{title}</h2>
      {subtitle && <p className="text-purple-300 text-lg max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  )
}
