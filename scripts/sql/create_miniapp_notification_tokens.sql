-- Mini app notification tokens storage
-- Run this migration against the Supabase project's Postgres database
-- Requires `pgcrypto` extension for gen_random_uuid()

create extension if not exists "pgcrypto";

create table if not exists public.miniapp_notification_tokens (
    id uuid primary key default gen_random_uuid(),
    fid bigint not null,
    token text not null,
    notification_url text not null,
    status text not null default 'enabled',
    last_event text,
    last_event_at timestamptz,
    last_seen_at timestamptz not null default timezone('utc', now()),
    last_gm_reference_at timestamptz,
    last_gm_reminder_sent_at timestamptz,
    last_gm_context jsonb,
    wallet_address text,
    client_fid bigint,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (token)
);

create index if not exists miniapp_notification_tokens_fid_idx on public.miniapp_notification_tokens (fid);
create index if not exists miniapp_notification_tokens_status_idx on public.miniapp_notification_tokens (status);
create index if not exists miniapp_notification_tokens_last_seen_idx on public.miniapp_notification_tokens (last_seen_at desc);

create or replace function public.update_miniapp_notification_tokens_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

create trigger trg_miniapp_notification_tokens_updated_at
before update on public.miniapp_notification_tokens
for each row execute function public.update_miniapp_notification_tokens_updated_at();
