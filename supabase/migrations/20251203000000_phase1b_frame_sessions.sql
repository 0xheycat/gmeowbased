-- Phase 1B: Interactive Frame Actions - Frame State Management
-- Creates frame_sessions table for persisting frame interaction state

-- Create frame_sessions table
CREATE TABLE IF NOT EXISTS frame_sessions (
  session_id TEXT PRIMARY KEY,
  fid INTEGER NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_frame_sessions_fid ON frame_sessions(fid);
CREATE INDEX IF NOT EXISTS idx_frame_sessions_updated_at ON frame_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_frame_sessions_created_at ON frame_sessions(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_frame_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_frame_sessions_updated_at
  BEFORE UPDATE ON frame_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_frame_sessions_updated_at();

-- Create function to cleanup expired sessions (24-hour TTL)
CREATE OR REPLACE FUNCTION cleanup_expired_frame_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM frame_sessions
  WHERE updated_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE frame_sessions IS 'Stores frame interaction state for multi-step flows (Phase 1B)';
COMMENT ON COLUMN frame_sessions.session_id IS 'Unique session identifier (UUID)';
COMMENT ON COLUMN frame_sessions.fid IS 'Farcaster ID of the user';
COMMENT ON COLUMN frame_sessions.state IS 'JSONB state object for frame interactions';
COMMENT ON FUNCTION cleanup_expired_frame_sessions() IS 'Deletes sessions older than 24 hours';
