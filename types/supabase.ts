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
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
