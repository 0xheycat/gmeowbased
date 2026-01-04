-- Fix Bug #23: Database Functions Using Old Column Names
-- Update get_featured_quests function to use reward_points_awarded
-- Created: December 28, 2025
-- Issue: record "v_quest_row" has no field "reward_points"
-- Fix: Change reward_points → reward_points_awarded

-- ============================================================================
-- Fix get_featured_quests function
-- ============================================================================

-- Drop existing function
drop function if exists get_featured_quests(int);

-- Recreate with correct column name
create or replace function get_featured_quests(p_limit int default 6)
returns table (
  quest_id bigint,
  title text,
  cover_image_url text,
  category text,
  reward_points_awarded bigint,  -- FIXED: was reward_points
  participant_count bigint,
  difficulty text,
  estimated_time_minutes int
) as $$
begin
  return query
  select 
    q.id,
    q.title,
    q.cover_image_url,
    q.category,
    q.reward_points_awarded,
    q.participant_count,
    q.difficulty,
    q.estimated_time_minutes
  from unified_quests q
  where q.is_featured = true 
    and q.status = 'active'
  order by q.featured_order asc nulls last, q.created_at desc
  limit p_limit;
end;
$$ language plpgsql;

comment on function get_featured_quests is 'Get featured quests for homepage (FIXED: uses reward_points_awarded)';

