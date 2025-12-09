-- Performance Optimization Migration
-- Task 11 Phase 2: Database Indexing
-- Date: December 7, 2025
-- 
-- This migration adds composite indexes to optimize common query patterns
-- Expected performance improvement: 30-40% reduction in query execution time

-- ============================================================================
-- LEADERBOARD CALCULATIONS (Profile, Referral, Guild)
-- ============================================================================

-- Profile queries: Get user stats by FID
CREATE INDEX IF NOT EXISTS idx_leaderboard_fid_base_points 
  ON leaderboard_calculations(farcaster_fid, base_points DESC)
  WHERE farcaster_fid IS NOT NULL;

-- Profile queries: Get user stats by address
CREATE INDEX IF NOT EXISTS idx_leaderboard_address_viral_xp 
  ON leaderboard_calculations(address, viral_xp DESC)
  WHERE address IS NOT NULL;

-- Guild queries: Get guild members sorted by points
CREATE INDEX IF NOT EXISTS idx_leaderboard_guild_id_points 
  ON leaderboard_calculations(guild_id, base_points DESC) 
  WHERE guild_id IS NOT NULL;

-- Leaderboard queries: Global ranking
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank 
  ON leaderboard_calculations(viral_xp DESC, base_points DESC, address);

-- Streak queries: Active users
CREATE INDEX IF NOT EXISTS idx_leaderboard_current_streak 
  ON leaderboard_calculations(current_gm_streak DESC, farcaster_fid)
  WHERE current_gm_streak > 0;

COMMENT ON INDEX idx_leaderboard_fid_base_points IS 'Optimize profile stats queries by FID';
COMMENT ON INDEX idx_leaderboard_address_viral_xp IS 'Optimize profile stats queries by address';
COMMENT ON INDEX idx_leaderboard_guild_id_points IS 'Optimize guild member ranking queries';
COMMENT ON INDEX idx_leaderboard_global_rank IS 'Optimize global leaderboard queries';
COMMENT ON INDEX idx_leaderboard_current_streak IS 'Optimize streak leaderboard queries';

-- ============================================================================
-- REFERRAL REGISTRATIONS (Referral System)
-- ============================================================================

-- Referral queries: Get all referrals for a user (sorted by recent)
CREATE INDEX IF NOT EXISTS idx_referral_referrer_timestamp 
  ON referral_registrations(referrer_fid, created_at DESC)
  WHERE referrer_fid IS NOT NULL;

-- Referral queries: Lookup by custom code
CREATE INDEX IF NOT EXISTS idx_referral_code 
  ON referral_registrations(referral_code) 
  WHERE referral_code IS NOT NULL;

-- Activity feed queries: Get user's referral activity
CREATE INDEX IF NOT EXISTS idx_referral_referred_timestamp 
  ON referral_registrations(referred_fid, created_at DESC)
  WHERE referred_fid IS NOT NULL;

-- Leaderboard queries: Count referrals by referrer
CREATE INDEX IF NOT EXISTS idx_referral_referrer_count 
  ON referral_registrations(referrer_fid, created_at)
  WHERE referrer_fid IS NOT NULL;

-- Analytics queries: Time-based referral stats
CREATE INDEX IF NOT EXISTS idx_referral_created_at 
  ON referral_registrations(created_at DESC);

COMMENT ON INDEX idx_referral_referrer_timestamp IS 'Optimize referral history queries';
COMMENT ON INDEX idx_referral_code IS 'Optimize referral code lookup';
COMMENT ON INDEX idx_referral_referred_timestamp IS 'Optimize activity feed queries';
COMMENT ON INDEX idx_referral_referrer_count IS 'Optimize referral leaderboard queries';
COMMENT ON INDEX idx_referral_created_at IS 'Optimize time-based analytics queries';

-- ============================================================================
-- GUILDS (Guild System)
-- ============================================================================

-- Guild queries: Get guilds by chain and sort by points
CREATE INDEX IF NOT EXISTS idx_guild_chain_points 
  ON guilds(chain, total_points DESC);

-- Guild queries: Sort by creation date (recent first)
CREATE INDEX IF NOT EXISTS idx_guild_created_at 
  ON guilds(created_at DESC);

-- Guild queries: Sort by member count
CREATE INDEX IF NOT EXISTS idx_guild_member_count 
  ON guilds(member_count DESC, total_points DESC);

-- Guild queries: Full-text search on name (requires pg_trgm extension)
-- Note: Run this after enabling pg_trgm extension
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_guild_name_trgm 
--   ON guilds USING gin(name gin_trgm_ops);

-- Guild queries: Lookup by leader
CREATE INDEX IF NOT EXISTS idx_guild_leader 
  ON guilds(leader_address)
  WHERE leader_address IS NOT NULL;

COMMENT ON INDEX idx_guild_chain_points IS 'Optimize guild discovery by chain and ranking';
COMMENT ON INDEX idx_guild_created_at IS 'Optimize guild discovery by recent';
COMMENT ON INDEX idx_guild_member_count IS 'Optimize guild discovery by popularity';
COMMENT ON INDEX idx_guild_leader IS 'Optimize guild lookup by leader';

-- ============================================================================
-- GUILD MEMBERS (Guild System)
-- ============================================================================

-- Guild queries: Get members sorted by join date
CREATE INDEX IF NOT EXISTS idx_guild_member_guild_joined 
  ON guild_members(guild_id, joined_at DESC);

-- Guild queries: Get members sorted by contribution
CREATE INDEX IF NOT EXISTS idx_guild_member_guild_points 
  ON guild_members(guild_id, points_contributed DESC);

-- User queries: Get user's guild history
CREATE INDEX IF NOT EXISTS idx_guild_member_fid_joined 
  ON guild_members(farcaster_fid, joined_at DESC)
  WHERE farcaster_fid IS NOT NULL;

-- Role queries: Get officers in a guild
CREATE INDEX IF NOT EXISTS idx_guild_member_role 
  ON guild_members(guild_id, role)
  WHERE role != 'member';

COMMENT ON INDEX idx_guild_member_guild_joined IS 'Optimize guild member list queries';
COMMENT ON INDEX idx_guild_member_guild_points IS 'Optimize guild contributor ranking';
COMMENT ON INDEX idx_guild_member_fid_joined IS 'Optimize user guild history queries';
COMMENT ON INDEX idx_guild_member_role IS 'Optimize officer/role queries';

-- ============================================================================
-- QUEST COMPLETIONS (Profile System)
-- ============================================================================

-- Profile queries: Get user's quest history (sorted by recent)
CREATE INDEX IF NOT EXISTS idx_quest_completion_fid_timestamp 
  ON quest_completions(farcaster_fid, completed_at DESC)
  WHERE farcaster_fid IS NOT NULL;

-- Quest queries: Get completions for a quest
CREATE INDEX IF NOT EXISTS idx_quest_completion_quest 
  ON quest_completions(quest_id);

-- Analytics queries: Count completions by quest and time
CREATE INDEX IF NOT EXISTS idx_quest_completion_quest_timestamp 
  ON quest_completions(quest_id, completed_at DESC);

-- Leaderboard queries: Top quest completers
CREATE INDEX IF NOT EXISTS idx_quest_completion_count 
  ON quest_completions(farcaster_fid, completed_at)
  WHERE farcaster_fid IS NOT NULL;

COMMENT ON INDEX idx_quest_completion_fid_timestamp IS 'Optimize profile quest history queries';
COMMENT ON INDEX idx_quest_completion_quest IS 'Optimize quest completion lookup';
COMMENT ON INDEX idx_quest_completion_quest_timestamp IS 'Optimize quest analytics queries';
COMMENT ON INDEX idx_quest_completion_count IS 'Optimize quest leaderboard queries';

-- ============================================================================
-- USER BADGES (Profile System)
-- ============================================================================

-- Profile queries: Get user's badges sorted by tier
CREATE INDEX IF NOT EXISTS idx_user_badge_fid_tier 
  ON user_badges(farcaster_fid, tier)
  WHERE farcaster_fid IS NOT NULL;

-- Profile queries: Get user's earned badges (sorted by recent)
CREATE INDEX IF NOT EXISTS idx_user_badge_fid_earned 
  ON user_badges(farcaster_fid, earned_at DESC) 
  WHERE earned = true;

-- Badge queries: Count users who earned a badge
CREATE INDEX IF NOT EXISTS idx_user_badge_badge_earned 
  ON user_badges(badge_id, earned_at)
  WHERE earned = true;

-- Analytics queries: Badge distribution
CREATE INDEX IF NOT EXISTS idx_user_badge_tier_earned 
  ON user_badges(tier, earned_at DESC)
  WHERE earned = true;

COMMENT ON INDEX idx_user_badge_fid_tier IS 'Optimize profile badge collection queries';
COMMENT ON INDEX idx_user_badge_fid_earned IS 'Optimize profile earned badge queries';
COMMENT ON INDEX idx_user_badge_badge_earned IS 'Optimize badge holder count queries';
COMMENT ON INDEX idx_user_badge_tier_earned IS 'Optimize badge analytics queries';

-- ============================================================================
-- QUESTS (Quest System)
-- ============================================================================

-- Quest queries: Get active quests
CREATE INDEX IF NOT EXISTS idx_quest_status_created 
  ON quests(status, created_at DESC)
  WHERE status = 'active';

-- Quest queries: Get featured quests
CREATE INDEX IF NOT EXISTS idx_quest_featured 
  ON quests(is_featured DESC, created_at DESC)
  WHERE status = 'active';

-- Quest queries: Search by category
CREATE INDEX IF NOT EXISTS idx_quest_category_status 
  ON quests(category, status, created_at DESC);

-- Quest queries: Search by difficulty
CREATE INDEX IF NOT EXISTS idx_quest_difficulty_status 
  ON quests(difficulty, status, created_at DESC);

COMMENT ON INDEX idx_quest_status_created IS 'Optimize active quest queries';
COMMENT ON INDEX idx_quest_featured IS 'Optimize featured quest queries';
COMMENT ON INDEX idx_quest_category_status IS 'Optimize quest filter by category';
COMMENT ON INDEX idx_quest_difficulty_status IS 'Optimize quest filter by difficulty';

-- ============================================================================
-- GUILD TREASURY (Guild System)
-- ============================================================================

-- Treasury queries: Get deposits for a guild (sorted by recent)
CREATE INDEX IF NOT EXISTS idx_guild_treasury_guild_timestamp 
  ON guild_treasury(guild_id, created_at DESC);

-- Treasury queries: Get user's deposit history
CREATE INDEX IF NOT EXISTS idx_guild_treasury_fid_timestamp 
  ON guild_treasury(farcaster_fid, created_at DESC)
  WHERE farcaster_fid IS NOT NULL;

-- Analytics queries: Sum deposits/claims by guild
CREATE INDEX IF NOT EXISTS idx_guild_treasury_guild_type 
  ON guild_treasury(guild_id, transaction_type, amount);

COMMENT ON INDEX idx_guild_treasury_guild_timestamp IS 'Optimize guild treasury history';
COMMENT ON INDEX idx_guild_treasury_fid_timestamp IS 'Optimize user deposit history';
COMMENT ON INDEX idx_guild_treasury_guild_type IS 'Optimize treasury analytics';

-- ============================================================================
-- AUDIT LOGS (All Systems)
-- ============================================================================

-- Audit queries: Get logs by user (sorted by recent)
CREATE INDEX IF NOT EXISTS idx_audit_log_fid_timestamp 
  ON audit_logs(farcaster_fid, created_at DESC)
  WHERE farcaster_fid IS NOT NULL;

-- Audit queries: Get logs by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action_timestamp 
  ON audit_logs(action_type, created_at DESC);

-- Audit queries: Get logs by IP address (security)
CREATE INDEX IF NOT EXISTS idx_audit_log_ip_timestamp 
  ON audit_logs(ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

COMMENT ON INDEX idx_audit_log_fid_timestamp IS 'Optimize user audit history';
COMMENT ON INDEX idx_audit_log_action_timestamp IS 'Optimize audit queries by action type';
COMMENT ON INDEX idx_audit_log_ip_timestamp IS 'Optimize security audit queries';

-- ============================================================================
-- VERIFY INDEX CREATION
-- ============================================================================

-- Check all indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Monitor index usage (run after deployment)
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched,
--   pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Monitor query performance (requires pg_stat_statements extension)
-- SELECT 
--   query,
--   calls,
--   mean_exec_time,
--   max_exec_time,
--   stddev_exec_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%leaderboard%' OR query LIKE '%referral%' OR query LIKE '%guild%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;
