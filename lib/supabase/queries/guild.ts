/**
 * Guild Supabase Queries
 * 
 * Purpose: Guild metadata enrichment (name, description, avatar) (5% of calculation)
 * Heavy lifting: Done by Subsquid Guild entities (95% of calculation)
 * 
 * Pattern: Hybrid Supabase + Subsquid
 * 1. Supabase: guilds table (guild metadata - name, description, avatar, etc.)
 * 2. Subsquid: Guild entity (members, points, events from blockchain)
 * 
 * Migration Status: Week 2 Day 4
 */

import { getSupabaseServerClient } from '@/lib/supabase'

/**
 * Get guild metadata from Supabase
 * Used by: Guild Frame (to display name, description, avatar)
 */
export async function getGuildMetadata(guildId: string | number) {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.error('[getGuildMetadata] Supabase client is null')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('guilds')
      .select('guild_id, name, description, avatar_url, created_at, updated_at')
      .eq('guild_id', String(guildId))
      .maybeSingle()

    if (error) {
      console.error('[getGuildMetadata] Error:', error)
      return null
    }

    if (!data) {
      console.warn('[getGuildMetadata] No guild metadata found:', guildId)
      return null
    }

    return {
      guildId: data.guild_id,
      name: data.name || `Guild #${guildId}`,
      description: data.description || null,
      avatarUrl: data.avatar_url || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.error('[getGuildMetadata] Error:', err)
    return null
  }
}

/**
 * Batch get guild metadata for multiple guilds
 * Used by: Leaderboard, user profile pages showing guild memberships
 */
export async function getGuildsMetadata(guildIds: (string | number)[]) {
  const supabase = getSupabaseServerClient()
  const map = new Map<string, any>()

  if (!supabase || guildIds.length === 0) {
    return map
  }

  try {
    const { data, error } = await supabase
      .from('guilds')
      .select('guild_id, name, description, avatar_url')
      .in('guild_id', guildIds.map(String))

    if (error) {
      console.error('[getGuildsMetadata] Error:', error)
      return map
    }

    data?.forEach((guild: any) => {
      map.set(guild.guild_id, {
        guildId: guild.guild_id,
        name: guild.name || `Guild #${guild.guild_id}`,
        description: guild.description || null,
        avatarUrl: guild.avatar_url || null,
      })
    })

    return map
  } catch (err) {
    console.error('[getGuildsMetadata] Error:', err)
    return map
  }
}
