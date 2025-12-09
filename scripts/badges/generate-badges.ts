#!/usr/bin/env tsx
/**
 * Badge Generator Script
 * Generates SVG badges matching the existing 5 badge styles
 * Converts to PNG and saves to public/badges/
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface BadgeConfig {
  id: string;
  name: string;
  tier: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  icon: string;
}

const badges: BadgeConfig[] = [
  {
    id: 'neon-initiate',
    name: 'Neon Initiate',
    tier: 'common',
    primaryColor: '#D3D7DC',
    secondaryColor: '#8B92A0',
    glowColor: '#B4B9C2',
    icon: '✨'
  },
  {
    id: 'pulse-runner',
    name: 'Pulse Runner',
    tier: 'rare',
    primaryColor: '#A18CFF',
    secondaryColor: '#7B5FE8',
    glowColor: '#C3B4FF',
    icon: '⚡'
  },
  {
    id: 'signal-luminary',
    name: 'Signal Luminary',
    tier: 'epic',
    primaryColor: '#61DFFF',
    secondaryColor: '#3ABADD',
    glowColor: '#8EEEFF',
    icon: '🌟'
  },
  {
    id: 'warp-navigator',
    name: 'Warp Navigator',
    tier: 'legendary',
    primaryColor: '#FFD966',
    secondaryColor: '#E6B84D',
    glowColor: '#FFE699',
    icon: '🚀'
  },
  {
    id: 'gmeow-vanguard',
    name: 'Gmeow Vanguard',
    tier: 'mythic',
    primaryColor: '#9C27FF',
    secondaryColor: '#7B1FCC',
    glowColor: '#B852FF',
    icon: '👑'
  }
];

function generateBadgeSVG(badge: BadgeConfig): string {
  const size = 1024;
  const center = size / 2;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Radial gradient for background -->
    <radialGradient id="bg-${badge.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f0f1e;stop-opacity:1" />
    </radialGradient>
    
    <!-- Glow effect -->
    <filter id="glow-${badge.id}">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Outer glow -->
    <filter id="outer-glow-${badge.id}">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Primary gradient -->
    <linearGradient id="primary-${badge.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${badge.primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${badge.secondaryColor};stop-opacity:1" />
    </linearGradient>
    
    <!-- Shimmer gradient -->
    <linearGradient id="shimmer-${badge.id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${badge.glowColor};stop-opacity:0" />
      <stop offset="50%" style="stop-color:${badge.glowColor};stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:${badge.glowColor};stop-opacity:0" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg-${badge.id})"/>
  
  <!-- Outer glow circle -->
  <circle cx="${center}" cy="${center}" r="380" 
    fill="none" 
    stroke="${badge.glowColor}" 
    stroke-width="3" 
    opacity="0.3"
    filter="url(#outer-glow-${badge.id})"/>
  
  <!-- Main badge circle -->
  <circle cx="${center}" cy="${center}" r="350" 
    fill="url(#primary-${badge.id})" 
    opacity="0.9"
    filter="url(#glow-${badge.id})"/>
  
  <!-- Inner circle border -->
  <circle cx="${center}" cy="${center}" r="350" 
    fill="none" 
    stroke="${badge.primaryColor}" 
    stroke-width="4" 
    opacity="0.6"/>
  
  <!-- Geometric decoration - hexagon -->
  <polygon points="${center},${center-280} ${center+240},${center-140} ${center+240},${center+140} ${center},${center+280} ${center-240},${center+140} ${center-240},${center-140}"
    fill="none"
    stroke="${badge.secondaryColor}"
    stroke-width="2"
    opacity="0.4"/>
  
  <!-- Inner hexagon -->
  <polygon points="${center},${center-220} ${center+190},${center-110} ${center+190},${center+110} ${center},${center+220} ${center-190},${center+110} ${center-190},${center-110}"
    fill="none"
    stroke="${badge.primaryColor}"
    stroke-width="3"
    opacity="0.5"/>
  
  <!-- Center icon circle -->
  <circle cx="${center}" cy="${center}" r="150" 
    fill="rgba(0,0,0,0.3)"/>
  
  <!-- Icon text -->
  <text x="${center}" y="${center+60}" 
    font-family="Arial, sans-serif" 
    font-size="120" 
    text-anchor="middle" 
    fill="${badge.glowColor}"
    filter="url(#glow-${badge.id})">
    ${badge.icon}
  </text>
  
  <!-- Badge name -->
  <text x="${center}" y="${center+400}" 
    font-family="Arial, sans-serif" 
    font-size="60" 
    font-weight="bold"
    text-anchor="middle" 
    fill="${badge.primaryColor}"
    opacity="0.9">
    ${badge.name.toUpperCase()}
  </text>
  
  <!-- Tier text -->
  <text x="${center}" y="${center+460}" 
    font-family="Arial, sans-serif" 
    font-size="36" 
    text-anchor="middle" 
    fill="${badge.glowColor}"
    opacity="0.7">
    ${badge.tier.toUpperCase()}
  </text>
  
  <!-- Corner decorations -->
  <circle cx="100" cy="100" r="5" fill="${badge.glowColor}" opacity="0.6"/>
  <circle cx="924" cy="100" r="5" fill="${badge.glowColor}" opacity="0.6"/>
  <circle cx="100" cy="924" r="5" fill="${badge.glowColor}" opacity="0.6"/>
  <circle cx="924" cy="924" r="5" fill="${badge.glowColor}" opacity="0.6"/>
  
  <!-- Shimmer effect -->
  <rect x="0" y="${center-200}" width="${size}" height="400" 
    fill="url(#shimmer-${badge.id})" 
    opacity="0.2"
    transform="rotate(-45 ${center} ${center})"/>
</svg>`;
}

// Generate SVGs
const outputDir = join(process.cwd(), 'public', 'badges');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log('🎨 Generating badge SVGs...\n');

badges.forEach(badge => {
  const svg = generateBadgeSVG(badge);
  const svgPath = join(outputDir, `${badge.id}.svg`);
  writeFileSync(svgPath, svg, 'utf-8');
  console.log(`✅ Generated: ${badge.id}.svg`);
});

console.log('\n✨ All badge SVGs generated successfully!');
console.log(`📁 Output directory: ${outputDir}`);
console.log('\n💡 To convert to PNG, run:');
console.log('   npm run badges:convert');
