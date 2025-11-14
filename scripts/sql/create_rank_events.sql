-- Creates the telemetry sink for rank updates consumed by the Neynar in-feed agent.
-- Columns mirror the payload emitted from quest creation and verification flows.
CREATE TABLE IF NOT EXISTS public.gmeow_rank_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    event_type text NOT NULL,
    chain text NOT NULL,
    wallet_address text NOT NULL,
    fid bigint,
    quest_id bigint,
    delta bigint NOT NULL,
    total_points bigint NOT NULL,
    previous_points bigint,
    level integer NOT NULL,
    tier_name text NOT NULL,
    tier_percent numeric(5,2),
    metadata jsonb
);

CREATE INDEX IF NOT EXISTS gmeow_rank_events_lookup
    ON public.gmeow_rank_events (wallet_address, created_at DESC);

COMMENT ON TABLE public.gmeow_rank_events IS 'Latest rank diffs emitted from quest + gm flows for the in-feed responder.';
COMMENT ON COLUMN public.gmeow_rank_events.event_type IS 'quest-create, quest-verify, gm, etc.';
COMMENT ON COLUMN public.gmeow_rank_events.metadata IS 'JSON payload containing xp/tier breakdowns and optional quest context.';
