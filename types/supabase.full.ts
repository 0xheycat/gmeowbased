// CRITICAL: DO NOT REGENERATE FROM SCRATCH
// - Use Supabase MCP only for verification (mcp_supabase_list_tables)
// - Add new tables manually by copying schema from MCP output
// - Insert new table definitions alphabetically in Tables section
// - This prevents breaking existing type definitions
//
// Manual additions:
// - 2025-12-21: guild_stats_cache (line 246)
// - 2025-12-21: reward_claims (line 1257)

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
      badge_casts: {
        Row: {
          badge_id: string
          cast_hash: string
          cast_url: string
          created_at: string
          fid: number
          id: string
          last_metrics_update: string | null
          likes_count: number | null
          recasts_count: number | null
          replies_count: number | null
          tier: string
          viral_bonus_xp: number | null
          viral_score: number | null
          viral_tier: string | null
        }
        Insert: {
          badge_id: string
          cast_hash: string
          cast_url: string
          created_at?: string
          fid: number
          id?: string
          last_metrics_update?: string | null
          likes_count?: number | null
          recasts_count?: number | null
          replies_count?: number | null
          tier: string
          viral_bonus_xp?: number | null
          viral_score?: number | null
          viral_tier?: string | null
        }
        Update: {
          badge_id?: string
          cast_hash?: string
          cast_url?: string
          created_at?: string
          fid?: number
          id?: string
          last_metrics_update?: string | null
          likes_count?: number | null
          recasts_count?: number | null
          replies_count?: number | null
          tier?: string
          viral_bonus_xp?: number | null
          viral_score?: number | null
          viral_tier?: string | null
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          badge_prestige_claimed: number | null
          claimed_at: string | null
          created_at: string | null
          fid: number | null
          guild_bonus_claimed: number | null
          id: string
          oracle_address: string | null
          referral_bonus_claimed: number | null
          streak_bonus_claimed: number | null
          total_claimed: number
          tx_hash: string | null
          viral_xp_claimed: number | null
          wallet_address: string
        }
        Insert: {
          badge_prestige_claimed?: number | null
          claimed_at?: string | null
          created_at?: string | null
          fid?: number | null
          guild_bonus_claimed?: number | null
          id?: string
          oracle_address?: string | null
          referral_bonus_claimed?: number | null
          streak_bonus_claimed?: number | null
          total_claimed: number
          tx_hash?: string | null
          viral_xp_claimed?: number | null
          wallet_address: string
        }
        Update: {
          badge_prestige_claimed?: number | null
          claimed_at?: string | null
          created_at?: string | null
          fid?: number | null
          guild_bonus_claimed?: number | null
          id?: string
          oracle_address?: string | null
          referral_bonus_claimed?: number | null
          streak_bonus_claimed?: number | null
          total_claimed?: number
          tx_hash?: string | null
          viral_xp_claimed?: number | null
          wallet_address?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          custody_address: string | null
          display_name: string | null
          fid: number
          id: string
          metadata: Json | null
          neynar_score: number | null
          neynar_tier: string | null
          og_nft_eligible: boolean | null
          onboarded_at: string | null
          points: number | null
          social_links: Json | null
          total_points_earned: number | null
          total_points_spent: number | null
          updated_at: string | null
          verified_addresses: string[] | null
          wallet_address: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custody_address?: string | null
          display_name?: string | null
          fid: number
          id?: string
          metadata?: Json | null
          neynar_score?: number | null
          neynar_tier?: string | null
          og_nft_eligible?: boolean | null
          onboarded_at?: string | null
          points?: number | null
          social_links?: Json | null
          total_points_earned?: number | null
          total_points_spent?: number | null
          updated_at?: string | null
          verified_addresses?: string[] | null
          wallet_address?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          custody_address?: string | null
          display_name?: string | null
          fid?: number
          id?: string
          metadata?: Json | null
          neynar_score?: number | null
          neynar_tier?: string | null
          og_nft_eligible?: boolean | null
          onboarded_at?: string | null
          points?: number | null
          social_links?: Json | null
          total_points_earned?: number | null
          total_points_spent?: number | null
          updated_at?: string | null
          verified_addresses?: string[] | null
          wallet_address?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      points_leaderboard: {
        Row: {
          current_points: number | null
          fid: number | null
          points_rank: number | null
          total_points_earned: number | null
          total_points_spent: number | null
          xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
