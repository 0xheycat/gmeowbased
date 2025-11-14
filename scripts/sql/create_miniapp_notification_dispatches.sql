-- Miniapp notification dispatch log storage
-- Run once against Supabase to capture notification batch history
-- Requires pgcrypto for UUID generation (already enabled in main migration)

create extension if not exists "pgcrypto";

create table if not exists public.miniapp_notification_dispatches (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default timezone('utc', now()),
    notification_title text,
    notification_body text,
    target_count integer not null default 0,
    payload jsonb,
    results jsonb
);

create index if not exists miniapp_notification_dispatches_created_idx
    on public.miniapp_notification_dispatches (created_at desc);
