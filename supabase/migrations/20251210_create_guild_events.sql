-- Guild Events Table Migration
-- Tracks all guild activities for analytics and activity feed
-- Created: December 10, 2025

-- Create guild_events table
CREATE TABLE IF NOT EXISTS guild_events (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'MEMBER_JOINED',
    'MEMBER_LEFT', 
    'MEMBER_PROMOTED',
    'MEMBER_DEMOTED',
    'POINTS_DEPOSITED',
    'POINTS_CLAIMED',
    'GUILD_CREATED',
    'GUILD_UPDATED'
  )),
  actor_address TEXT NOT NULL,
  target_address TEXT,
  amount INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_events_guild_id 
  ON guild_events (guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_events_actor 
  ON guild_events (actor_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_events_type 
  ON guild_events (guild_id, event_type, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE guild_events IS 'Tracks all guild activities for analytics, activity feed, and audit trails';
COMMENT ON COLUMN guild_events.guild_id IS 'Guild ID (bigint stored as text)';
COMMENT ON COLUMN guild_events.event_type IS 'Type of event (MEMBER_JOINED, MEMBER_LEFT, MEMBER_PROMOTED, MEMBER_DEMOTED, POINTS_DEPOSITED, POINTS_CLAIMED, GUILD_CREATED, GUILD_UPDATED)';
COMMENT ON COLUMN guild_events.actor_address IS 'Address of user performing the action';
COMMENT ON COLUMN guild_events.target_address IS 'Address of target user (for promote/demote events)';
COMMENT ON COLUMN guild_events.amount IS 'Amount of points (for deposit/claim events)';
COMMENT ON COLUMN guild_events.metadata IS 'Additional event data as JSON';
