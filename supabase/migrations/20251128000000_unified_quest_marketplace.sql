-- Unified Quest Marketplace: On-Chain + Social Quests
-- Phase 13: User-generated quests with points economy
-- Created: 2025-11-28

-- ============================================================================
-- unified_quests: Main quest storage (on-chain + social)
-- ============================================================================
create table if not exists unified_quests (
  id bigserial primary key,
  
  -- Quest metadata
  title text not null,
  description text not null,
  category text not null check (category in ('onchain', 'social')),
  type text not null,
  
  -- Creator info
  creator_fid bigint not null,
  creator_address text not null,
  
  -- Rewards
  reward_points bigint not null default 0,
  reward_mode text not null default 'points' check (reward_mode in ('points', 'token', 'nft')),
  reward_token_address text, -- ERC20 address if reward_mode = 'token'
  reward_token_amount numeric(78, 0), -- Token amount in wei if reward_mode = 'token'
  reward_nft_address text, -- NFT contract if reward_mode = 'nft'
  reward_nft_token_id numeric(78, 0), -- Token ID if reward_mode = 'nft'
  
  -- Creator economics
  creation_cost bigint not null default 100, -- Points spent to create
  creator_earnings_percent int not null default 10 check (creator_earnings_percent between 0 and 100),
  total_completions bigint not null default 0,
  total_earned_points bigint not null default 0,
  
  -- Verification data (JSONB - dynamic per quest type)
  verification_data jsonb not null default '{}'::jsonb,
  
  -- Quest state
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'expired')),
  max_completions bigint, -- NULL = unlimited
  expiry_date timestamptz,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for unified_quests
create index if not exists unified_quests_category_idx on unified_quests(category);
create index if not exists unified_quests_type_idx on unified_quests(type);
create index if not exists unified_quests_creator_fid_idx on unified_quests(creator_fid);
create index if not exists unified_quests_status_idx on unified_quests(status);
create index if not exists unified_quests_created_at_idx on unified_quests(created_at desc);
create index if not exists unified_quests_total_completions_idx on unified_quests(total_completions desc);

-- GIN index for JSONB verification_data queries
create index if not exists unified_quests_verification_data_idx on unified_quests using gin(verification_data);

-- ============================================================================
-- quest_completions: Track who completed which quests
-- ============================================================================
create table if not exists quest_completions (
  id bigserial primary key,
  
  quest_id bigint not null references unified_quests(id) on delete cascade,
  
  -- Completer info
  completer_fid bigint not null,
  completer_address text not null,
  
  -- Verification proof
  verification_proof jsonb not null default '{}'::jsonb, -- Transaction hash, cast hash, etc.
  
  -- Rewards issued
  points_awarded bigint not null default 0,
  token_awarded numeric(78, 0),
  nft_awarded_token_id numeric(78, 0),
  
  -- Timestamps
  completed_at timestamptz not null default now(),
  
  -- Unique constraint: one completion per user per quest
  unique(quest_id, completer_fid)
);

-- Indexes for quest_completions
create index if not exists quest_completions_quest_id_idx on quest_completions(quest_id);
create index if not exists quest_completions_completer_fid_idx on quest_completions(completer_fid);
create index if not exists quest_completions_completed_at_idx on quest_completions(completed_at desc);

-- ============================================================================
-- quest_creator_earnings: Track creator revenue per quest
-- ============================================================================
create table if not exists quest_creator_earnings (
  id bigserial primary key,
  
  quest_id bigint not null references unified_quests(id) on delete cascade,
  creator_fid bigint not null,
  
  -- Earnings snapshot
  completions_count bigint not null default 0,
  points_earned bigint not null default 0,
  viral_bonus_awarded bigint not null default 0, -- 10/50/100 milestone bonuses
  
  -- Milestones hit
  milestone_10_claimed boolean not null default false,
  milestone_50_claimed boolean not null default false,
  milestone_100_claimed boolean not null default false,
  
  -- Timestamps
  last_updated_at timestamptz not null default now()
);

-- Indexes for quest_creator_earnings
create index if not exists quest_creator_earnings_quest_id_idx on quest_creator_earnings(quest_id);
create index if not exists quest_creator_earnings_creator_fid_idx on quest_creator_earnings(creator_fid);
create index if not exists quest_creator_earnings_points_earned_idx on quest_creator_earnings(points_earned desc);

-- ============================================================================
-- Quest type definitions (for reference)
-- ============================================================================

-- ON-CHAIN QUEST TYPES:
-- 'token_hold'          - Hold X tokens for Y days
-- 'nft_own'             - Own specific NFT
-- 'transaction_make'    - Make on-chain transaction
-- 'multichain_gm'       - GM on multiple chains
-- 'contract_interact'   - Interact with specific contract
-- 'liquidity_provide'   - Provide liquidity in DEX

-- SOCIAL QUEST TYPES:
-- 'follow_user'         - Follow a Farcaster user
-- 'like_cast'           - Like a specific cast
-- 'recast_cast'         - Recast a specific cast
-- 'reply_cast'          - Reply to a specific cast
-- 'join_channel'        - Join a Farcaster channel
-- 'cast_mention'        - Mention user in a cast
-- 'cast_hashtag'        - Use hashtag in a cast

-- ============================================================================
-- Example verification_data structures
-- ============================================================================

-- ON-CHAIN (token_hold):
-- {
--   "chain": "base",
--   "token_address": "0x...",
--   "min_amount": "1000000000000000000",
--   "duration_days": 7
-- }

-- ON-CHAIN (nft_own):
-- {
--   "chain": "base",
--   "nft_address": "0x...",
--   "token_id": "123",
--   "collection": "Cool Cats"
-- }

-- SOCIAL (follow_user):
-- {
--   "target_fid": 14206,
--   "target_username": "dwr.eth"
-- }

-- SOCIAL (like_cast):
-- {
--   "cast_hash": "0x...",
--   "cast_url": "https://warpcast.com/..."
-- }

-- SOCIAL (cast_hashtag):
-- {
--   "hashtag": "gmeow",
--   "min_engagement": 5
-- }

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_unified_quests_updated_at
  before update on unified_quests
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- RLS Policies (Enable RLS for security)
-- ============================================================================

-- Enable RLS
alter table unified_quests enable row level security;
alter table quest_completions enable row level security;
alter table quest_creator_earnings enable row level security;

-- Public read access for active quests
create policy "Anyone can view active quests"
  on unified_quests for select
  using (status = 'active');

-- Creators can update their own quests
create policy "Creators can update their own quests"
  on unified_quests for update
  using (creator_fid = current_setting('app.current_user_fid', true)::bigint);

-- Anyone can view completions (for leaderboards)
create policy "Anyone can view completions"
  on quest_completions for select
  using (true);

-- Anyone can view creator earnings (transparency)
create policy "Anyone can view creator earnings"
  on quest_creator_earnings for select
  using (true);

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Function: Increment quest completion count
create or replace function increment_quest_completion(p_quest_id bigint)
returns void as $$
begin
  update unified_quests
  set 
    total_completions = total_completions + 1,
    updated_at = now()
  where id = p_quest_id;
end;
$$ language plpgsql;

-- Function: Award creator earnings
create or replace function award_creator_earnings(
  p_quest_id bigint,
  p_creator_fid bigint,
  p_points bigint
)
returns void as $$
declare
  v_existing record;
  v_new_completions bigint;
  v_bonus bigint := 0;
begin
  -- Get existing earnings record
  select * into v_existing
  from quest_creator_earnings
  where quest_id = p_quest_id and creator_fid = p_creator_fid;
  
  if v_existing is null then
    -- Create new earnings record
    insert into quest_creator_earnings (
      quest_id,
      creator_fid,
      completions_count,
      points_earned
    ) values (
      p_quest_id,
      p_creator_fid,
      1,
      p_points
    );
  else
    -- Update existing record
    v_new_completions := v_existing.completions_count + 1;
    
    -- Check for milestone bonuses
    if v_new_completions >= 100 and not v_existing.milestone_100_claimed then
      v_bonus := 500; -- 500pt bonus for 100 completions
    elsif v_new_completions >= 50 and not v_existing.milestone_50_claimed then
      v_bonus := 200; -- 200pt bonus for 50 completions
    elsif v_new_completions >= 10 and not v_existing.milestone_10_claimed then
      v_bonus := 50; -- 50pt bonus for 10 completions
    end if;
    
    update quest_creator_earnings
    set
      completions_count = v_new_completions,
      points_earned = points_earned + p_points,
      viral_bonus_awarded = viral_bonus_awarded + v_bonus,
      milestone_10_claimed = case when v_new_completions >= 10 then true else milestone_10_claimed end,
      milestone_50_claimed = case when v_new_completions >= 50 then true else milestone_50_claimed end,
      milestone_100_claimed = case when v_new_completions >= 100 then true else milestone_100_claimed end,
      last_updated_at = now()
    where quest_id = p_quest_id and creator_fid = p_creator_fid;
  end if;
end;
$$ language plpgsql;

-- ============================================================================
-- Migration complete
-- ============================================================================

comment on table unified_quests is 'Unified quest marketplace: on-chain + social user-generated quests';
comment on table quest_completions is 'Track quest completions with verification proof';
comment on table quest_creator_earnings is 'Track creator earnings and viral bonuses';
