export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      user_notification_history: {
        Row: {
          id: string
          fid: number | null
          wallet_address: string | null
          category: string
          title: string
          description: string | null
          tone: string
          metadata: Json | null
          action_label: string | null
          action_href: string | null
          dismissed_at: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          fid?: number | null
          wallet_address?: string | null
          category: string
          title: string
          description?: string | null
          tone: string
          metadata?: Json | null
          action_label?: string | null
          action_href?: string | null
          dismissed_at?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          fid?: number | null
          wallet_address?: string | null
          category?: string
          title?: string
          description?: string | null
          tone?: string
          metadata?: Json | null
          action_label?: string | null
          action_href?: string | null
          dismissed_at?: string | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      viral_milestone_achievements: {
        Row: {
          id: string
          fid: number
          achievement_type: string
          achieved_at: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          cast_hash: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          fid: number
          achievement_type: string
          achieved_at?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          cast_hash?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          fid?: number
          achievement_type?: string
          achieved_at?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          cast_hash?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      gmeow_rank_events: {
        Row: {
          id: string
          created_at: string
          event_type: string
          chain: string
          wallet_address: string
          fid: number | null
          quest_id: number | null
          delta: number
          total_points: number
          previous_points: number | null
          level: number
          tier_name: string
          tier_percent: number
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          event_type: string
          chain: string
          wallet_address: string
          fid?: number | null
          quest_id?: number | null
          delta: number
          total_points: number
          previous_points?: number | null
          level: number
          tier_name: string
          tier_percent: number
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          event_type?: string
          chain?: string
          wallet_address?: string
          fid?: number | null
          quest_id?: number | null
          delta?: number
          total_points?: number
          previous_points?: number | null
          level?: number
          tier_name?: string
          tier_percent?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          fid: number
          wallet_address: string | null
          custody_address: string | null
          verified_addresses: string[] | null
          neynar_score: number | null
          neynar_tier: string | null
          points: number | null
          xp: number | null
          onboarded_at: string | null
          og_nft_eligible: boolean | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          total_points_earned: number | null
          total_points_spent: number | null
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          cover_image_url: string | null
          social_links: Json | null
          pfp_url: string | null
          profile_visibility: string | null
          viral_xp: number | null
          points_escrowed: number | null
          is_refunded: boolean | null
          guild_id: string | null
          last_gm_at: string | null
        }
        Insert: {
          id?: string
          fid: number
          wallet_address?: string | null
          custody_address?: string | null
          verified_addresses?: string[] | null
          neynar_score?: number | null
          neynar_tier?: string | null
          points?: number | null
          xp?: number | null
          onboarded_at?: string | null
          og_nft_eligible?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          total_points_earned?: number | null
          total_points_spent?: number | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          social_links?: Json | null
          pfp_url?: string | null
          profile_visibility?: string | null
          viral_xp?: number | null
          points_escrowed?: number | null
          is_refunded?: boolean | null
          guild_id?: string | null
          last_gm_at?: string | null
        }
        Update: {
          id?: string
          fid?: number
          wallet_address?: string | null
          custody_address?: string | null
          verified_addresses?: string[] | null
          neynar_score?: number | null
          neynar_tier?: string | null
          points?: number | null
          xp?: number | null
          onboarded_at?: string | null
          og_nft_eligible?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          total_points_earned?: number | null
          total_points_spent?: number | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          social_links?: Json | null
          pfp_url?: string | null
          profile_visibility?: string | null
          viral_xp?: number | null
          points_escrowed?: number | null
          is_refunded?: boolean | null
          guild_id?: string | null
          last_gm_at?: string | null
        }
        Relationships: []
      }
      quest_templates: {
        Row: {
          id: string
          name: string
          slug: string
          category: string
          description: string
          difficulty: string
          usage_count: number
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category: string
          description: string
          difficulty: string
          usage_count?: number
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?: string
          description?: string
          difficulty?: string
          usage_count?: number
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Relationships: []
      }
      unified_quests: {
        Row: {
          id: number
          slug: string
          title: string
          category: string
          description: string
          type: string
          status: string
          creator_fid: number
          creator_address: string
          reward_points: number
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: number
          slug: string
          title: string
          category: string
          description: string
          type: string
          status?: string
          creator_fid: number
          creator_address: string
          reward_points?: number
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: number
          slug?: string
          title?: string
          category?: string
          description?: string
          type?: string
          status?: string
          creator_fid?: number
          creator_address?: string
          reward_points?: number
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Relationships: []
      }
      leaderboard_calculations: {
        Row: {
          id: number
          farcaster_fid: number
          address: string
          base_points: number
          total_score: number | null
          period: string
          calculated_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: number
          farcaster_fid: number
          address: string
          base_points?: number
          total_score?: number | null
          period?: string
          calculated_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: number
          farcaster_fid?: number
          address?: string
          base_points?: number
          total_score?: number | null
          period?: string
          calculated_at?: string
          updated_at?: string
          [key: string]: any
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          id: string
          fid: number
          amount: number
          source: string
          created_at: string | null
        }
        Insert: {
          id?: string
          fid: number
          amount: number
          source: string
          created_at?: string | null
        }
        Update: {
          id?: string
          fid?: number
          amount?: number
          source?: string
          created_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          [key: string]: any
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          [key: string]: any
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          [key: string]: any
        }
        Relationships: []
      }
      user_badge_collection: {
        Row: {
          id: number
          fid: number
          [key: string]: any
        }
        Insert: {
          id?: number
          fid: number
          [key: string]: any
        }
        Update: {
          id?: number
          fid?: number
          [key: string]: any
        }
        Relationships: []
      }
      user_quest_progress: {
        Row: {
          id: number
          user_fid: number
          quest_id: number
          status: string
          [key: string]: any
        }
        Insert: {
          id?: number
          user_fid: number
          quest_id: number
          status?: string
          [key: string]: any
        }
        Update: {
          id?: number
          user_fid?: number
          quest_id?: number
          status?: string
          [key: string]: any
        }
        Relationships: []
      }
      quest_tasks: {
        Row: {
          id: number
          quest_id: number
          title: string
          description: string
          [key: string]: any
        }
        Insert: {
          id?: number
          quest_id: number
          title: string
          description: string
          [key: string]: any
        }
        Update: {
          id?: number
          quest_id?: number
          title?: string
          description?: string
          [key: string]: any
        }
        Relationships: []
      }
      quest_creation_costs: {
        Row: {
          id: string
          creator_fid: number
          points_escrowed: number
          quest_id: string | null
          quest_title: string
          quest_category: string
          quest_slug: string | null
          is_refunded: boolean
          refunded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_fid: number
          points_escrowed: number
          quest_id?: string | null
          quest_title: string
          quest_category: string
          quest_slug?: string | null
          is_refunded?: boolean
          refunded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_fid?: number
          points_escrowed?: number
          quest_id?: string | null
          quest_title?: string
          quest_category?: string
          quest_slug?: string | null
          is_refunded?: boolean
          refunded_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      guilds: {
        Row: {
          guild_id: string
          name: string
          description: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          guild_id: string
          name: string
          description?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          guild_id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      increment_template_usage: {
        Args: {
          p_template_id: string
        }
        Returns: void
      }
      increment_base_points: {
        Args: {
          user_fid: number
          points: number
        }
        Returns: void
      }
      update_user_quest_progress: {
        Args: {
          p_user_fid: number
          p_quest_id: number
          p_status: string
        }
        Returns: void
      }
      user_meets_viral_xp_requirement: {
        Args: {
          p_user_fid: number
          p_required_xp: number
        }
        Returns: boolean
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
