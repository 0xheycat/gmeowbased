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
    }
    Functions: {
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
