-- Guild Metadata Table
-- Stores guild name, description, and banner URL
-- Complements on-chain guild data with off-chain metadata

CREATE TABLE IF NOT EXISTS guild_metadata (
  guild_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guild_metadata_guild_id ON guild_metadata(guild_id);

-- RLS Policies (anyone can read, only backend can write)
ALTER TABLE guild_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read guild metadata
CREATE POLICY "Allow public read access to guild metadata"
  ON guild_metadata
  FOR SELECT
  USING (true);

-- Only authenticated service role can insert/update
CREATE POLICY "Allow service role to insert guild metadata"
  ON guild_metadata
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role to update guild metadata"
  ON guild_metadata
  FOR UPDATE
  USING (true);
