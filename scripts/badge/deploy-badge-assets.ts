#!/usr/bin/env tsx
/**
 * Deploy Badge Assets to Supabase Storage
 * 
 * Uploads badge images and generates metadata.json for all supported chains:
 * - Base
 * - Optimism (OP)
 * - Celo
 * - Unichain
 * - Ink
 * 
 * Usage: tsx scripts/badge/deploy-badge-assets.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// ========================================
// Configuration
// ========================================

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BADGE_BUCKET = process.env.SUPABASE_BADGE_BUCKET || 'badge-art'
const BASE_URL = process.env.MAIN_URL || 'https://gmeowhq.art'

// Supported chains
const CHAINS = ['base', 'op', 'celo', 'unichain', 'ink'] as const
type ChainKey = typeof CHAINS[number]

// Contract addresses per chain (from .env)
const CONTRACT_ADDRESSES: Record<ChainKey, string> = {
  base: process.env.BADGE_CONTRACT_BASE || '0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9',
  op: process.env.BADGE_CONTRACT_OP || '0xb6055bF4AeD5f10884eC313dE7b733Ceb4dc3446',
  celo: process.env.BADGE_CONTRACT_CELO || '0x16CF68d057e931aBDFeC67D0B4C3CaF3BA21f9D3',
  unichain: process.env.BADGE_CONTRACT_UNICHAIN || '0xd54275a6e8db11f5aC5C065eE1E8f10dCA37Ad86',
  ink: process.env.BADGE_CONTRACT_INK || '0x1fC08c7466dF4134E624bc18520eC0d9CC308765',
}

// Badge registry path
const REGISTRY_PATH = join(process.cwd(), 'planning', 'badge', 'badge-registry.json')
const ART_PATH = join(process.cwd(), 'planning', 'badge', 'badge-art')

// ========================================
// Types
// ========================================

type BadgeRegistry = {
  version: string
  lastUpdated: string
  description: string
  tiers: Record<string, {
    name: string
    color: string
    scoreRange: { min: number; max: number }
    pointsBonus: number
    bgGradient: string
  }>
  badges: Array<{
    id: string
    name: string
    slug: string
    badgeType: string
    tier: string
    description: string
    chain: string
    contractAddress: string
    pointsCost: number
    imageUrl: string
    artPath: string
    active: boolean
    autoAssign: boolean
    assignmentRule: string
    metadata: Record<string, unknown>
  }>
}

type NFTMetadata = {
  name: string
  description: string
  image: string
  external_url: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
}

// ========================================
// Supabase Client
// ========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// ========================================
// Helper Functions
// ========================================

function loadBadgeRegistry(): BadgeRegistry {
  const content = readFileSync(REGISTRY_PATH, 'utf-8')
  return JSON.parse(content)
}

function generateNFTMetadata(badge: BadgeRegistry['badges'][number], chain: ChainKey, tokenId: number): NFTMetadata {
  const imageUrl = `${BASE_URL}/api/badges/image/${badge.slug}?chain=${chain}`
  const externalUrl = `${BASE_URL}/badges/${badge.slug}?chain=${chain}&tokenId=${tokenId}`
  
  return {
    name: badge.name,
    description: badge.description,
    image: imageUrl,
    external_url: externalUrl,
    attributes: [
      { trait_type: 'Tier', value: badge.tier },
      { trait_type: 'Chain', value: chain.toUpperCase() },
      { trait_type: 'Badge Type', value: badge.badgeType },
      { trait_type: 'Season', value: (badge.metadata.season as string) || 'Genesis' },
      { trait_type: 'Rarity', value: (badge.metadata.rarityLabel as string) || badge.tier },
      { trait_type: 'Points Bonus', value: badge.metadata.tier ? (badge.metadata as any).pointsBonus || 0 : 0 },
      ...(badge.metadata.attributes as Array<{ trait_type: string; value: string | number }> || []),
    ],
  }
}

async function uploadImage(imagePath: string, storagePath: string): Promise<string> {
  const imageBuffer = readFileSync(imagePath)
  const contentType = imagePath.endsWith('.webp') ? 'image/webp' : 
                      imagePath.endsWith('.png') ? 'image/png' : 
                      'image/jpeg'
  
  const { data, error } = await supabase.storage
    .from(BADGE_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType,
      cacheControl: '31536000', // 1 year
      upsert: true, // Overwrite if exists
    })
  
  if (error) {
    throw new Error(`Failed to upload ${storagePath}: ${error.message}`)
  }
  
  const { data: urlData } = supabase.storage
    .from(BADGE_BUCKET)
    .getPublicUrl(storagePath)
  
  return urlData.publicUrl
}

async function uploadMetadata(metadata: NFTMetadata, storagePath: string): Promise<string> {
  const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8')
  
  const { data, error } = await supabase.storage
    .from(BADGE_BUCKET)
    .upload(storagePath, metadataBuffer, {
      contentType: 'application/json',
      cacheControl: '3600', // 1 hour (shorter for metadata updates)
      upsert: true,
    })
  
  if (error) {
    throw new Error(`Failed to upload ${storagePath}: ${error.message}`)
  }
  
  const { data: urlData } = supabase.storage
    .from(BADGE_BUCKET)
    .getPublicUrl(storagePath)
  
  return urlData.publicUrl
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BADGE_BUCKET)
  
  if (!bucketExists) {
    console.log(`📦 Creating bucket: ${BADGE_BUCKET}`)
    const { error } = await supabase.storage.createBucket(BADGE_BUCKET, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg', 'application/json'],
    })
    
    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`)
    }
    console.log(`✅ Bucket created: ${BADGE_BUCKET}`)
  } else {
    console.log(`✅ Bucket exists: ${BADGE_BUCKET}`)
  }
}

// ========================================
// Main Deployment
// ========================================

async function deployBadgeAssets() {
  console.log('🚀 Starting badge asset deployment...\n')
  
  // Step 1: Ensure bucket exists
  await ensureBucket()
  
  // Step 2: Load badge registry
  console.log('📖 Loading badge registry...')
  const registry = loadBadgeRegistry()
  console.log(`✅ Loaded ${registry.badges.length} badges\n`)
  
  // Step 3: Get available badge images
  const availableImages = readdirSync(ART_PATH)
  console.log(`📸 Found ${availableImages.length} badge images in ${ART_PATH}\n`)
  
  // Step 4: Deploy each badge to all chains
  const results: Array<{
    badge: string
    chain: ChainKey
    imageUrl: string
    metadataUrl: string
    status: 'success' | 'error'
    error?: string
  }> = []
  
  for (const badge of registry.badges) {
    console.log(`\n🎨 Processing badge: ${badge.name} (${badge.id})`)
    
    // Find badge image
    const imageName = badge.artPath.split('/').pop()!
    const imagePath = join(ART_PATH, imageName)
    
    if (!availableImages.includes(imageName)) {
      console.warn(`  ⚠️  Image not found: ${imageName}`)
      continue
    }
    
    // Upload image once (shared across all chains)
    console.log(`  📤 Uploading image: ${imageName}`)
    const imageStoragePath = `images/${badge.slug}.webp`
    try {
      const imageUrl = await uploadImage(imagePath, imageStoragePath)
      console.log(`  ✅ Image uploaded: ${imageUrl}`)
      
      // Deploy to all chains
      for (const chain of CHAINS) {
        console.log(`  🔗 Deploying to ${chain.toUpperCase()}...`)
        
        try {
          // Generate metadata for each tokenId (0-99 for initial deployment)
          const tokenIds = [0, 1, 2, 3, 4] // Deploy first 5 token metadata
          
          for (const tokenId of tokenIds) {
            const metadata = generateNFTMetadata(badge, chain, tokenId)
            const metadataPath = `metadata/${chain}/${badge.slug}/${tokenId}.json`
            
            const metadataUrl = await uploadMetadata(metadata, metadataPath)
            
            results.push({
              badge: badge.name,
              chain,
              imageUrl,
              metadataUrl,
              status: 'success',
            })
          }
          
          console.log(`  ✅ ${chain.toUpperCase()}: ${tokenIds.length} metadata files uploaded`)
        } catch (error) {
          console.error(`  ❌ ${chain.toUpperCase()}: ${(error as Error).message}`)
          results.push({
            badge: badge.name,
            chain,
            imageUrl: '',
            metadataUrl: '',
            status: 'error',
            error: (error as Error).message,
          })
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to upload image: ${(error as Error).message}`)
    }
  }
  
  // Step 5: Summary
  console.log('\n\n📊 Deployment Summary')
  console.log('═══════════════════════════════════════════════════════')
  
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  console.log(`✅ Successful deployments: ${successCount}`)
  console.log(`❌ Failed deployments: ${errorCount}`)
  console.log(`📦 Total badges: ${registry.badges.length}`)
  console.log(`🔗 Chains: ${CHAINS.join(', ')}`)
  
  // Group by chain
  console.log('\n📋 Per-Chain Summary:')
  for (const chain of CHAINS) {
    const chainResults = results.filter(r => r.chain === chain && r.status === 'success')
    console.log(`  ${chain.toUpperCase()}: ${chainResults.length} metadata files`)
  }
  
  // Show sample URLs
  console.log('\n🔗 Sample URLs:')
  const sampleSuccess = results.find(r => r.status === 'success')
  if (sampleSuccess) {
    console.log(`  Image: ${sampleSuccess.imageUrl}`)
    console.log(`  Metadata: ${sampleSuccess.metadataUrl}`)
  }
  
  // Show errors
  if (errorCount > 0) {
    console.log('\n❌ Errors:')
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  ${r.badge} (${r.chain}): ${r.error}`)
    })
  }
  
  console.log('\n✅ Deployment complete!\n')
}

// ========================================
// Run
// ========================================

deployBadgeAssets()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Deployment failed:', error)
    process.exit(1)
  })
