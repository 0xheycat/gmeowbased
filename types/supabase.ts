export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      quest_creation_costs: {
        Row: {
          breakdown: Json
          created_at: string | null
          creator_fid: number
          id: string
          is_refunded: boolean | null
          points_escrowed: number
          points_refunded: number | null
          quest_id: number
          refund_reason: string | null
          refunded_at: string | null
          total_cost: number
        }
        Insert: {
          breakdown: Json
          created_at?: string | null
          creator_fid: number
          id?: string
          is_refunded?: boolean | null
          points_escrowed: number
          points_refunded?: number | null
          quest_id: number
          refund_reason?: string | null
          refunded_at?: string | null
          total_cost: number
        }
        Update: {
          breakdown?: Json
          created_at?: string | null
          creator_fid?: number
          id?: string
          is_refunded?: boolean | null
          points_escrowed?: number
          points_refunded?: number | null
          quest_id?: number
          refund_reason?: string | null
          refunded_at?: string | null
          total_cost?: number
        }
        Relationships: []
      }
      quest_templates: {
        Row: {
          id: string
          name: string
          slug: string
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      unified_quests: {
        Row: {
          id: number
          title: string
          slug: string
          category: string
          creator_fid: number
          reward_points: number
          total_completions: number
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          slug: string
          category: string
          creator_fid: number
          reward_points?: number
          total_completions?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          slug?: string
          category?: string
          creator_fid?: number
          reward_points?: number
          total_completions?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      user_points_balances: {
        Row: {
          base_points: number
          fid: number
          guild_bonus: number
          last_synced_at: string
          total_points: number
          updated_at: string
          viral_xp: number
        }
        Insert: {
          base_points?: number
          fid: number
          guild_bonus?: number
          last_synced_at?: string
          total_points?: number
          updated_at?: string
          viral_xp?: number
        }
        Update: {
          base_points?: number
          fid?: number
          guild_bonus?: number
          last_synced_at?: string
          total_points?: number
          updated_at?: string
          viral_xp?: number
        }
        Relationships: []
      }
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
      badge_casts: {
        Row: {
          id: string
          fid: number
          badge_id: string
          cast_hash: string
          cast_url: string
          tier: string
          created_at: string
          likes_count: number
          recasts_count: number
          replies_count: number
          viral_score: number
          viral_tier: string
          viral_bonus_xp: number
          last_updated_at: string | null
        }
        Insert: {
          id?: string
          fid: number
          badge_id: string
          cast_hash: string
          cast_url: string
          tier: string
          created_at?: string
          likes_count?: number
          recasts_count?: number
          replies_count?: number
          viral_score?: number
          viral_tier?: string
          viral_bonus_xp?: number
          last_updated_at?: string | null
        }
        Update: {
          id?: string
          fid?: number
          badge_id?: string
          cast_hash?: string
          cast_url?: string
          tier?: string
          created_at?: string
          likes_count?: number
          recasts_count?: number
          replies_count?: number
          viral_score?: number
          viral_tier?: string
          viral_bonus_xp?: number
          last_updated_at?: string | null
        }
        Relationships: []
      }
      viral_milestone_achievements: {
        Row: {
          id: string
          fid: number
          achievement_type: string
          cast_hash: string | null
          achieved_at: string
          metadata: Json | null
          seen: boolean
          notification_sent: boolean
        }
        Insert: {
          id?: string
          fid: number
          achievement_type: string
          cast_hash?: string | null
          achieved_at?: string
          metadata?: Json | null
          seen?: boolean
          notification_sent?: boolean
        }
        Update: {
          id?: string
          fid?: number
          achievement_type?: string
          cast_hash?: string | null
          achieved_at?: string
          metadata?: Json | null
          seen?: boolean
          notification_sent?: boolean
        }
        Relationships: []
      }
      user_notification_history: {
        Row: {
          id: string
          fid: number
          category: string
          title: string
          description: string
          tone: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          fid: number
          category: string
          title: string
          description: string
          tone: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          fid?: number
          category?: string
          title?: string
          description?: string
          tone?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      increment_user_xp: {
        Args: { p_fid: number; p_xp_amount: number }
        Returns: undefined
      }
      increment_user_points: {
        Args: { p_fid: number; p_amount: number; p_source: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
    }
  }
}
