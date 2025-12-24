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
    Functions: {
      get_guild_stats_atomic: {
        Args: { p_guild_id: string }
        Returns: {
          guild_id: string
          leader_address: string
          level: number
          member_addresses: string[]
          member_count: number
          member_points: Json
          officers: Json
          total_points: number
        }[]
      }
      // ... other functions omitted for brevity
      [key: string]: any
    }
  }
}
