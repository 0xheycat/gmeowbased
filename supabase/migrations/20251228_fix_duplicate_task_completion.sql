-- Fix Bug #24: Duplicate task completion in update_user_quest_progress
-- Update function to prevent duplicate task indices in completed_tasks array
-- Created: December 28, 2025
-- Issue: array_append adds task even if already completed, causing progress > 100%
-- Fix: Only append if task not already in array

-- ============================================================================
-- Fix update_user_quest_progress function
-- ============================================================================

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
  v_new_completed_tasks int[];
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
    -- FIXED: Only append if not already in array (prevent duplicates)
    completed_tasks = case
      when p_task_index = any(user_quest_progress.completed_tasks) then user_quest_progress.completed_tasks
      else array_append(user_quest_progress.completed_tasks, p_task_index)
    end,
    -- FIXED: Calculate percentage based on updated array
    progress_percentage = case 
      when v_total_tasks > 0 then (
        cardinality(
          case
            when p_task_index = any(user_quest_progress.completed_tasks) then user_quest_progress.completed_tasks
            else array_append(user_quest_progress.completed_tasks, p_task_index)
          end
        ) * 100 / v_total_tasks
      )
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

comment on function update_user_quest_progress is 'Update quest progress (FIXED: prevents duplicate task indices)';
