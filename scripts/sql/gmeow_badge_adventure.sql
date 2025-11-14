-- Create badge templates table on supabase example https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/functions
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

create table if not exists gmeow.badge_adventure (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    name text not null,
    slug text not null unique,
    badge_type text not null,
    description text,
    chain text not null,
    points_cost integer not null default 0,
    image_url text,
    art_path text,
    active boolean not null default true,
    metadata jsonb
);

create or replace function gmeow.badge_adventure_set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists badge_templates_set_updated_at on gmeow.badge_adventure;
create trigger badge_templates_set_updated_at
before update on gmeow.badge_adventure
for each row execute function gmeow.badge_adventure_set_updated_at();

create index if not exists badge_templates_chain_idx on gmeow.badge_adventure (chain);
create index if not exists badge_templates_badge_type_idx on gmeow.badge_adventure (badge_type);

alter table gmeow.badge_adventure enable row level security;
-- service role bypasses RLS; add explicit policies for other roles if needed.
