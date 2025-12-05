-- Enhancement: Professional Quest System UI Fields
-- Phase 2.7: Quest Page Rebuild - Add UI/UX fields
-- Created: December 3, 2025

-- ============================================================================
-- Add professional UI fields to unified_quests
-- ============================================================================

-- Add image fields for quest cards
alter table unified_quests 
  add column if not exists cover_image_url text,
  add column if not exists badge_image_url text,
  add column if not exists thumbnail_url text; -- For blur placeholder

-- Add viral XP requirement for social quests
alter table unified_quests
  add column if not exists min_viral_xp_required bigint default 0;

-- Add featured/highlighted status
alter table unified_quests
  add column if not exists is_featured boolean default false,
  add column if not exists featured_order int;

-- Add quest difficulty/tags
alter table unified_quests
  add column if not exists difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced') or difficulty is null),
  add column if not exists estimated_time_minutes int,
  add column if not exists tags text[] default '{}';

-- Add participant count (cached for performance)
alter table unified_quests
  add column if not exists participant_count bigint default 0;

-- Add quest tasks (multi-step quests)
alter table unified_quests
  add column if not exists tasks jsonb default '[]'::jsonb;

-- Comments for documentation
comment on column unified_quests.cover_image_url is 'Quest card cover image (800x1100, aspect-[8/11])';
comment on column unified_quests.badge_image_url is 'Quest badge/icon (optional, shown in corner)';
comment on column unified_quests.thumbnail_url is 'Blurred thumbnail for loading placeholder';
comment on column unified_quests.min_viral_xp_required is 'Minimum viral XP required to unlock quest';
comment on column unified_quests.is_featured is 'Show in featured section (use JumboCardFeatured)';
comment on column unified_quests.difficulty is 'Quest difficulty badge (beginner/intermediate/advanced)';
comment on column unified_quests.estimated_time_minutes is 'Estimated completion time in minutes';
comment on column unified_quests.tags is 'Quest tags for filtering (e.g., ["nft", "defi", "social"])';
comment on column unified_quests.participant_count is 'Cached count of unique participants';
comment on column unified_quests.tasks is 'Multi-step quest tasks: [{"id": 1, "title": "...", "type": "...", "status": "pending"}]';

-- ============================================================================
-- Create indexes for new fields
-- ============================================================================

create index if not exists unified_quests_is_featured_idx 
  on unified_quests(is_featured, featured_order) 
  where is_featured = true;

create index if not exists unified_quests_difficulty_idx 
  on unified_quests(difficulty);

create index if not exists unified_quests_min_viral_xp_idx 
  on unified_quests(min_viral_xp_required);

create index if not exists unified_quests_participant_count_idx 
  on unified_quests(participant_count desc);

-- GIN index for tags array
create index if not exists unified_quests_tags_idx 
  on unified_quests using gin(tags);

-- GIN index for tasks jsonb
create index if not exists unified_quests_tasks_idx 
  on unified_quests using gin(tasks);

-- ============================================================================
-- Add user quest progress tracking
-- ============================================================================

create table if not exists user_quest_progress (
  id bigserial primary key,
  
  -- User + Quest
  user_fid bigint not null,
  quest_id bigint not null references unified_quests(id) on delete cascade,
  
  -- Progress tracking
  current_task_index int not null default 0,
  completed_tasks int[] default '{}',
  progress_percentage int not null default 0 check (progress_percentage between 0 and 100),
  
  -- Status
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed', 'failed')),
  
  -- Timestamps
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  
  -- Unique constraint: one progress per user per quest
  unique(user_fid, quest_id)
);

-- Indexes for user_quest_progress
create index if not exists user_quest_progress_user_fid_idx 
  on user_quest_progress(user_fid);

create index if not exists user_quest_progress_quest_id_idx 
  on user_quest_progress(quest_id);

create index if not exists user_quest_progress_status_idx 
  on user_quest_progress(status);

create index if not exists user_quest_progress_last_activity_idx 
  on user_quest_progress(last_activity_at desc);

-- GIN index for completed_tasks array
create index if not exists user_quest_progress_completed_tasks_idx 
  on user_quest_progress using gin(completed_tasks);

-- ============================================================================
-- Create task completion tracking table
-- ============================================================================

create table if not exists task_completions (
  id bigserial primary key,
  
  -- User + Quest + Task
  user_fid bigint not null,
  quest_id bigint not null references unified_quests(id) on delete cascade,
  task_index int not null, -- Position in tasks array
  
  -- Verification
  verification_proof jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  
  -- Unique constraint: one completion per user per quest task
  unique(user_fid, quest_id, task_index)
);

-- Indexes for task_completions
create index if not exists task_completions_user_fid_idx 
  on task_completions(user_fid);

create index if not exists task_completions_quest_id_idx 
  on task_completions(quest_id);

create index if not exists task_completions_verified_at_idx 
  on task_completions(verified_at desc);

-- ============================================================================
-- Enable RLS for new tables
-- ============================================================================

alter table user_quest_progress enable row level security;
alter table task_completions enable row level security;

-- Users can view their own progress
create policy "Users can view their own quest progress"
  on user_quest_progress for select
  using (user_fid = current_setting('app.current_user_fid', true)::bigint);

-- Users can view their own task completions
create policy "Users can view their own task completions"
  on task_completions for select
  using (user_fid = current_setting('app.current_user_fid', true)::bigint);

-- Public can view completion stats (for quest cards)
create policy "Anyone can view quest progress stats"
  on user_quest_progress for select
  using (true);

-- ============================================================================
-- Helper functions for professional quest system
-- ============================================================================

-- Function: Update participant count (cached for performance)
create or replace function update_quest_participant_count(p_quest_id bigint)
returns void as $$
begin
  update unified_quests
  set participant_count = (
    select count(distinct user_fid)
    from user_quest_progress
    where quest_id = p_quest_id
  )
  where id = p_quest_id;
end;
$$ language plpgsql;

-- Function: Update user quest progress
create or replace function update_user_quest_progress(
  p_user_fid bigint,
  p_quest_id bigint,
  p_task_index int
)
returns void as $$
declare
  v_total_tasks int;
  v_completed_count int;
  v_new_percentage int;
begin
  -- Get total tasks for quest
  select jsonb_array_length(tasks) into v_total_tasks
  from unified_quests
  where id = p_quest_id;
  
  -- Insert or update progress
  insert into user_quest_progress (user_fid, quest_id, current_task_index, completed_tasks, progress_percentage, status)
  values (
    p_user_fid,
    p_quest_id,
    p_task_index + 1,
    array[p_task_index],
    case when v_total_tasks > 0 then (1 * 100 / v_total_tasks) else 100 end,
    case when p_task_index + 1 >= v_total_tasks then 'completed' else 'in_progress' end
  )
  on conflict (user_fid, quest_id) do update set
    current_task_index = greatest(user_quest_progress.current_task_index, p_task_index + 1),
    completed_tasks = array_append(user_quest_progress.completed_tasks, p_task_index),
    progress_percentage = case 
      when v_total_tasks > 0 then (cardinality(array_append(user_quest_progress.completed_tasks, p_task_index)) * 100 / v_total_tasks)
      else 100
    end,
    status = case 
      when p_task_index + 1 >= v_total_tasks then 'completed' 
      else 'in_progress' 
    end,
    last_activity_at = now(),
    completed_at = case when p_task_index + 1 >= v_total_tasks then now() else null end;
end;
$$ language plpgsql;

-- Function: Get featured quests (for homepage)
create or replace function get_featured_quests(p_limit int default 6)
returns table (
  quest_id bigint,
  title text,
  cover_image_url text,
  category text,
  reward_points bigint,
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
    q.reward_points,
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

-- Function: Check if user meets viral XP requirement
create or replace function user_meets_viral_xp_requirement(
  p_user_fid bigint,
  p_quest_id bigint
)
returns boolean as $$
declare
  v_min_viral_xp bigint;
  v_user_viral_xp bigint;
begin
  -- Get quest requirement
  select min_viral_xp_required into v_min_viral_xp
  from unified_quests
  where id = p_quest_id;
  
  -- If no requirement, return true
  if v_min_viral_xp is null or v_min_viral_xp = 0 then
    return true;
  end if;
  
  -- Get user's current viral XP
  select coalesce(viral_xp, 0) into v_user_viral_xp
  from leaderboard_weekly
  where fid = p_user_fid
  limit 1;
  
  return v_user_viral_xp >= v_min_viral_xp;
end;
$$ language plpgsql;

-- ============================================================================
-- Triggers for automatic updates
-- ============================================================================

-- Trigger: Update participant count when progress changes
create or replace function trigger_update_participant_count()
returns trigger as $$
begin
  perform update_quest_participant_count(new.quest_id);
  return new;
end;
$$ language plpgsql;

create trigger update_participant_count_on_progress
  after insert or update on user_quest_progress
  for each row
  execute function trigger_update_participant_count();

-- ============================================================================
-- Migration complete
-- ============================================================================

comment on table user_quest_progress is 'Track user progress through multi-step quests';
comment on table task_completions is 'Individual task completion records with verification';

```