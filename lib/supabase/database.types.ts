/**
 * Supabase Database Types (Minimal - Phase 5)
 * 
 * NOTE: This is a minimal type definition created manually because Supabase
 * is not running locally. It only includes tables that still exist after
 * Phase 3 cleanup (heavy analytics tables were dropped).
 * 
 * Tables included:
 * - user_profiles (identity data)
 * - guilds, guild_members, guild_metadata (guild system)
 * - unified_quests, quest_templates, quest_creators, quest_requirements (quest system)
 * - user_points_balances (escrow system)
 * - Other lightweight tables
 * 
 * Tables DROPPED (not included):
 * - leaderboard_calculations → Subsquid
 * - gmeow_rank_events → Subsquid
 * - xp_transactions → Subsquid
 * - viral_milestone_achievements → Subsquid
 * - And 5 more analytics tables
 * 
 * Generated: December 18, 2025
 * Phase: 5 (Deprecation Cleanup)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          fid: number
          wallet_address: string | null
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          cover_image_url: string | null
          verified_addresses: string[] | null
          social_links: Json | null
          neynar_score: number | null
          neynar_tier: string | null
          onboarded_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          fid: number
          wallet_address?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          verified_addresses?: string[] | null
          social_links?: Json | null
          neynar_score?: number | null
          neynar_tier?: string | null
          onboarded_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          fid?: number
          wallet_address?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          verified_addresses?: string[] | null
          social_links?: Json | null
          neynar_score?: number | null
          neynar_tier?: string | null
          onboarded_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      guilds: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      guild_members: {
        Row: {
          guild_id: string
          fid: number
          is_guild_officer: boolean
          joined_at: string
        }
        Insert: {
          guild_id: string
          fid: number
          is_guild_officer?: boolean
          joined_at?: string
        }
        Update: {
          guild_id?: string
          fid?: number
          is_guild_officer?: boolean
          joined_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
