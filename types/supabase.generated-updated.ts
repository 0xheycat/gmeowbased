// This file is temporarily created with updated quest_creation_costs table
// TO BE REPLACED with full supabase type generation

export type Database = {
  public: {
    Tables: {
      quest_creation_costs: {
        Row: {
          quest_id: number | null  // Updated to nullable
          // ... other fields
        }
        Insert: {
          quest_id?: number | null  // Updated to nullable
          // ... other fields
        }
        Update: {
          quest_id?: number | null  // Updated to nullable
          // ... other fields
        }
      }
    }
  }
}
