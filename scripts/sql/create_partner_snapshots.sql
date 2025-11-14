-- Partner snapshot table for storing per-address eligibility results
-- Run this in the Supabase SQL editor or include in your migration bundle.

create table if not exists partner_snapshots (
    id bigserial primary key,
    snapshot_id text not null,
    partner text not null,
    chain text not null,
    address text not null,
    eligible boolean not null default false,
    balance numeric(78, 0) not null default 0,
    requirement_kind text not null,
    requirement_address text,
    requirement_token_id numeric(78, 0),
    requirement_minimum numeric(78, 0) not null default 0,
    computed_at timestamptz not null default now(),
    reason text,
    metadata jsonb
);

create index if not exists partner_snapshots_snapshot_idx on partner_snapshots (snapshot_id);
create index if not exists partner_snapshots_partner_idx on partner_snapshots (partner);
create index if not exists partner_snapshots_chain_idx on partner_snapshots (chain);
create index if not exists partner_snapshots_address_idx on partner_snapshots (address);
create index if not exists partner_snapshots_eligibility_idx on partner_snapshots (eligible);
create index if not exists partner_snapshots_computed_at_idx on partner_snapshots (computed_at desc);
