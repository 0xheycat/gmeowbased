-- Quest Creation System Migration
-- Date: December 4, 2025
-- Purpose: Support user-created quests with points economy

-- ============================================
-- Quest Creators Table
-- ============================================
CREATE TABLE IF NOT EXISTS quest_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL REFERENCES user_profiles(fid) ON DELETE CASCADE,
  total_quests_created INTEGER DEFAULT 0,
  total_points_spent BIGINT DEFAULT 0,
  active_quests INTEGER DEFAULT 0,
  max_active_quests INTEGER DEFAULT 5, -- Tier-based limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(fid)
);

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_quest_creators_fid ON quest_creators(fid);

-- ============================================
-- Quest Creation Costs Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS quest_creation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES unified_quests(id) ON DELETE CASCADE,
  creator_fid BIGINT NOT NULL,
  total_cost BIGINT NOT NULL,
  breakdown JSONB NOT NULL, -- { base: 100, tasks: 40, rewards: 50, badge: 50 }
  points_escrowed BIGINT NOT NULL,
  points_refunded BIGINT DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

-- Index for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_quest_creation_costs_quest_id ON quest_creation_costs(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_creation_costs_creator ON quest_creation_costs(creator_fid);

-- ============================================
-- Quest Templates Library
-- ============================================
CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('onchain', 'social', 'creative', 'learn', 'hybrid')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  cost_points INTEGER NOT NULL DEFAULT 100,
  template_data JSONB NOT NULL, -- Pre-filled quest configuration
  usage_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'system',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for template queries
CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON quest_templates(difficulty) WHERE is_active = TRUE;

-- ============================================
-- Extend unified_quests Table
-- ============================================
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS creator_fid BIGINT REFERENCES user_profiles(fid);
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS creation_cost BIGINT DEFAULT 0;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quest_templates(id);
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE unified_quests ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0;

-- Indexes for creator queries
CREATE INDEX IF NOT EXISTS idx_unified_quests_creator_fid ON unified_quests(creator_fid) WHERE is_draft = FALSE;
CREATE INDEX IF NOT EXISTS idx_unified_quests_template_id ON unified_quests(template_id);
CREATE INDEX IF NOT EXISTS idx_unified_quests_published_at ON unified_quests(published_at DESC) WHERE status = 'active';

-- ============================================
-- Quest Tasks Extended
-- ============================================
-- Add verification_config if not exists
ALTER TABLE quest_tasks ADD COLUMN IF NOT EXISTS verification_config JSONB;

-- Update existing tasks to have proper verification config
UPDATE quest_tasks 
SET verification_config = jsonb_build_object(
  'type', requirement_type,
  'value', requirement_value
)
WHERE verification_config IS NULL;

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Initialize quest creator record
CREATE OR REPLACE FUNCTION initialize_quest_creator(p_fid BIGINT)
RETURNS quest_creators AS $$
DECLARE
  v_creator quest_creators;
BEGIN
  INSERT INTO quest_creators (fid, max_active_quests)
  VALUES (p_fid, 5)
  ON CONFLICT (fid) DO UPDATE
  SET updated_at = NOW()
  RETURNING * INTO v_creator;
  
  RETURN v_creator;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment quest creator stats
CREATE OR REPLACE FUNCTION increment_creator_stats(
  p_fid BIGINT,
  p_cost BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE quest_creators
  SET 
    total_quests_created = total_quests_created + 1,
    active_quests = active_quests + 1,
    total_points_spent = total_points_spent + p_cost,
    updated_at = NOW()
  WHERE fid = p_fid;
END;
$$ LANGUAGE plpgsql;

-- Function: Decrement active quests (when quest expires/completes)
CREATE OR REPLACE FUNCTION decrement_active_quests(p_fid BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE quest_creators
  SET 
    active_quests = GREATEST(0, active_quests - 1),
    updated_at = NOW()
  WHERE fid = p_fid;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate quest creation cost
CREATE OR REPLACE FUNCTION calculate_quest_cost(
  p_category TEXT,
  p_task_count INTEGER,
  p_reward_xp INTEGER,
  p_has_badge BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE
  v_base_cost INTEGER;
  v_task_cost INTEGER;
  v_reward_cost INTEGER;
  v_badge_cost INTEGER;
  v_total_cost INTEGER;
BEGIN
  -- Base cost varies by category
  v_base_cost := CASE 
    WHEN p_category = 'social' THEN 50
    WHEN p_category = 'onchain' THEN 200
    WHEN p_category = 'hybrid' THEN 250
    ELSE 100
  END;
  
  -- Cost per task
  v_task_cost := p_task_count * 20;
  
  -- Reward cost (10:1 ratio)
  v_reward_cost := p_reward_xp / 10;
  
  -- Badge creation cost
  v_badge_cost := CASE WHEN p_has_badge THEN 50 ELSE 0 END;
  
  -- Total
  v_total_cost := v_base_cost + v_task_cost + v_reward_cost + v_badge_cost;
  
  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function: Refund unused points (when quest expires with no completions)
CREATE OR REPLACE FUNCTION refund_quest_points(
  p_quest_id UUID,
  p_reason TEXT DEFAULT 'Quest expired with no completions'
) RETURNS BIGINT AS $$
DECLARE
  v_creator_fid BIGINT;
  v_cost_record quest_creation_costs;
  v_refund_amount BIGINT;
BEGIN
  -- Get quest creator and cost
  SELECT creator_fid INTO v_creator_fid
  FROM unified_quests
  WHERE id = p_quest_id;
  
  SELECT * INTO v_cost_record
  FROM quest_creation_costs
  WHERE quest_id = p_quest_id;
  
  -- Calculate refund (full escrow if no participants)
  SELECT 
    CASE 
      WHEN current_participants = 0 THEN v_cost_record.points_escrowed
      ELSE v_cost_record.points_escrowed - (current_participants * reward_points)
    END INTO v_refund_amount
  FROM unified_quests
  WHERE id = p_quest_id;
  
  -- Refund points
  IF v_refund_amount > 0 THEN
    -- Add points back to creator
    PERFORM award_points(v_creator_fid, v_refund_amount, 'quest_refund');
    
    -- Update cost record
    UPDATE quest_creation_costs
    SET 
      points_refunded = v_refund_amount,
      refund_reason = p_reason,
      refunded_at = NOW()
    WHERE quest_id = p_quest_id;
  END IF;
  
  -- Decrement active quests
  PERFORM decrement_active_quests(v_creator_fid);
  
  RETURN v_refund_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Seed Quest Templates
-- ============================================

-- Template 1: Social Amplifier (Free - 50 points)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('Social Amplifier', 'Boost your social presence with Farcaster engagement', 'social', 'beginner', 50, '{
  "title": "Social Amplifier Quest",
  "description": "Complete social tasks to earn viral XP",
  "category": "social",
  "difficulty": "beginner",
  "estimated_time_minutes": 15,
  "reward_xp": 50,
  "reward_category": "viral_xp",
  "tasks": [
    {
      "type": "social",
      "title": "Follow the creator",
      "description": "Follow @creator on Farcaster",
      "verification": {
        "type": "follow",
        "target_fid": 0
      },
      "required": true,
      "order": 0
    },
    {
      "type": "social",
      "title": "Cast in channel",
      "description": "Share a cast in /base channel",
      "verification": {
        "type": "cast",
        "channel_id": "base"
      },
      "required": true,
      "order": 1
    },
    {
      "type": "social",
      "title": "Recast announcement",
      "description": "Recast the announcement cast",
      "verification": {
        "type": "recast",
        "cast_hash": ""
      },
      "required": true,
      "order": 2
    }
  ]
}'::JSONB)
ON CONFLICT DO NOTHING;

-- Template 2: Community Builder (150 points)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('Community Builder', 'Grow and engage your community', 'social', 'intermediate', 150, '{
  "title": "Community Builder Quest",
  "description": "Build your community through engagement",
  "category": "social",
  "difficulty": "intermediate",
  "estimated_time_minutes": 30,
  "reward_xp": 100,
  "reward_category": "viral_xp",
  "tasks": [
    {
      "type": "social",
      "title": "Join community channel",
      "description": "Join our Farcaster channel",
      "verification": {
        "type": "channel_join",
        "channel_id": ""
      },
      "required": true,
      "order": 0
    },
    {
      "type": "social",
      "title": "Cast with hashtag",
      "description": "Share a cast with #BuildOnBase",
      "verification": {
        "type": "cast",
        "required_text": "#BuildOnBase"
      },
      "required": true,
      "order": 1
    },
    {
      "type": "social",
      "title": "Follow team members",
      "description": "Follow 3 team accounts",
      "verification": {
        "type": "follow",
        "min_count": 3
      },
      "required": true,
      "order": 2
    }
  ]
}'::JSONB)
ON CONFLICT DO NOTHING;

-- Template 3: Base Chain Explorer (200 points)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('Base Chain Explorer', 'Explore Base chain through onchain actions', 'onchain', 'beginner', 200, '{
  "title": "Base Chain Explorer Quest",
  "description": "Complete onchain tasks on Base",
  "category": "onchain",
  "difficulty": "beginner",
  "estimated_time_minutes": 45,
  "reward_xp": 200,
  "reward_category": "base_points",
  "tasks": [
    {
      "type": "onchain",
      "title": "Swap tokens on Base",
      "description": "Make a token swap on Base",
      "verification": {
        "type": "swap",
        "min_amount": "0.001"
      },
      "required": true,
      "order": 0
    },
    {
      "type": "onchain",
      "title": "Hold ETH on Base",
      "description": "Hold at least 0.01 ETH on Base",
      "verification": {
        "type": "token_hold",
        "token_address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "min_amount": "10000000000000000"
      },
      "required": true,
      "order": 1
    },
    {
      "type": "onchain",
      "title": "Mint an NFT",
      "description": "Mint any NFT on Base",
      "verification": {
        "type": "nft_mint",
        "min_balance": 1
      },
      "required": true,
      "order": 2
    }
  ]
}'::JSONB)
ON CONFLICT DO NOTHING;

-- Template 4: DeFi Master (300 points)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('DeFi Master', 'Master DeFi protocols on Base', 'onchain', 'advanced', 300, '{
  "title": "DeFi Master Quest",
  "description": "Complete advanced DeFi tasks",
  "category": "onchain",
  "difficulty": "advanced",
  "estimated_time_minutes": 120,
  "reward_xp": 500,
  "reward_category": "base_points",
  "tasks": [
    {
      "type": "onchain",
      "title": "Provide liquidity",
      "description": "Add liquidity to any pool on Base",
      "verification": {
        "type": "provide_liquidity",
        "min_liquidity": "100"
      },
      "required": true,
      "order": 0
    },
    {
      "type": "onchain",
      "title": "Hold LP tokens",
      "description": "Hold LP tokens for 7 days",
      "verification": {
        "type": "token_hold",
        "min_duration_days": 7
      },
      "required": true,
      "order": 1
    },
    {
      "type": "onchain",
      "title": "Complete 3 swaps",
      "description": "Make 3 different token swaps",
      "verification": {
        "type": "swap",
        "min_count": 3
      },
      "required": true,
      "order": 2
    }
  ]
}'::JSONB)
ON CONFLICT DO NOTHING;

-- Template 5: Hybrid Champion (250 points)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('Hybrid Champion', 'Complete both social and onchain tasks', 'hybrid', 'intermediate', 250, '{
  "title": "Hybrid Champion Quest",
  "description": "Master both social and onchain challenges",
  "category": "hybrid",
  "difficulty": "intermediate",
  "estimated_time_minutes": 60,
  "reward_xp": 300,
  "reward_category": "both",
  "tasks": [
    {
      "type": "social",
      "title": "Follow and cast",
      "description": "Follow creator and share a cast",
      "verification": {
        "type": "follow_and_cast",
        "target_fid": 0,
        "channel_id": "base"
      },
      "required": true,
      "order": 0
    },
    {
      "type": "onchain",
      "title": "Swap on Base",
      "description": "Make a token swap",
      "verification": {
        "type": "swap",
        "min_amount": "0.01"
      },
      "required": true,
      "order": 1
    },
    {
      "type": "onchain",
      "title": "Hold NFT",
      "description": "Own any NFT on Base",
      "verification": {
        "type": "nft_own",
        "min_balance": 1
      },
      "required": true,
      "order": 2
    },
    {
      "type": "social",
      "title": "Share achievement",
      "description": "Cast about completing this quest",
      "verification": {
        "type": "cast",
        "required_text": "#HybridChampion"
      },
      "required": false,
      "order": 3
    }
  ]
}'::JSONB)
ON CONFLICT DO NOTHING;

-- Template 6: Custom Quest (Free)
INSERT INTO quest_templates (name, description, category, difficulty, cost_points, template_data) VALUES
('Custom Quest', 'Start from scratch with full customization', 'social', 'beginner', 0, '{
  "title": "",
  "description": "",
  "category": "social",
  "difficulty": "beginner",
  "estimated_time_minutes": 30,
  "reward_xp": 100,
  "reward_category": "viral_xp",
  "tasks": []
}'::JSONB)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS Policies
-- ============================================

-- Quest creators: Users can view their own records
ALTER TABLE quest_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creator record"
ON quest_creators FOR SELECT
USING (fid = (current_setting('app.current_user_fid')::BIGINT));

CREATE POLICY "Users can insert own creator record"
ON quest_creators FOR INSERT
WITH CHECK (fid = (current_setting('app.current_user_fid')::BIGINT));

CREATE POLICY "Users can update own creator record"
ON quest_creators FOR UPDATE
USING (fid = (current_setting('app.current_user_fid')::BIGINT));

-- Quest creation costs: Users can view their own costs
ALTER TABLE quest_creation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest costs"
ON quest_creation_costs FOR SELECT
USING (creator_fid = (current_setting('app.current_user_fid')::BIGINT));

-- Quest templates: Public read, admin write
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are publicly readable"
ON quest_templates FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Only admins can modify templates"
ON quest_templates FOR ALL
USING (current_user = 'admin');

-- ============================================
-- Triggers
-- ============================================

-- Update quest_templates.updated_at on change
CREATE OR REPLACE FUNCTION update_quest_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quest_template_timestamp
BEFORE UPDATE ON quest_templates
FOR EACH ROW
EXECUTE FUNCTION update_quest_template_timestamp();

-- Update quest_creators.updated_at on change
CREATE OR REPLACE FUNCTION update_quest_creator_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quest_creator_timestamp
BEFORE UPDATE ON quest_creators
FOR EACH ROW
EXECUTE FUNCTION update_quest_creator_timestamp();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE quest_creators IS 'Tracks users who create quests and their stats';
COMMENT ON TABLE quest_creation_costs IS 'Tracks points spent and escrowed for quest creation';
COMMENT ON TABLE quest_templates IS 'Pre-built quest templates for quick creation';

COMMENT ON FUNCTION calculate_quest_cost IS 'Calculates the points cost for creating a quest';
COMMENT ON FUNCTION refund_quest_points IS 'Refunds unused points when quest expires';
COMMENT ON FUNCTION initialize_quest_creator IS 'Creates or updates a quest creator record';
