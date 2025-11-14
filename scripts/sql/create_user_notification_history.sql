-- User notification history storage
-- Run this migration against the Supabase project's Postgres database
-- Stores notification history for users to view past notifications

create extension if not exists "pgcrypto";

create table if not exists public.user_notification_history (
    id uuid primary key default gen_random_uuid(),
    fid bigint,
    wallet_address text,
    category text not null,
    title text not null,
    description text,
    tone text not null,
    metadata jsonb,
    action_label text,
    action_href text,
    dismissed_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    
    constraint check_user_identifier check (fid is not null or wallet_address is not null)
);

-- Indexes for common queries
create index if not exists user_notification_history_fid_idx on public.user_notification_history (fid, created_at desc);
create index if not exists user_notification_history_wallet_idx on public.user_notification_history (wallet_address, created_at desc);
create index if not exists user_notification_history_category_idx on public.user_notification_history (category);
create index if not exists user_notification_history_created_at_idx on public.user_notification_history (created_at desc);

-- RLS policies
alter table public.user_notification_history enable row level security;

-- Policy: Users can view their own notification history
create policy "Users can view own notifications"
    on public.user_notification_history
    for select
    using (
        fid = current_setting('app.current_fid', true)::bigint
        or wallet_address = lower(current_setting('app.current_wallet', true))
    );

-- Policy: Service role can insert notifications
create policy "Service role can insert notifications"
    on public.user_notification_history
    for insert
    with check (true);

-- Policy: Users can update their own notifications (for dismissing)
create policy "Users can update own notifications"
    on public.user_notification_history
    for update
    using (
        fid = current_setting('app.current_fid', true)::bigint
        or wallet_address = lower(current_setting('app.current_wallet', true))
    );

-- Auto-cleanup old notifications (older than 90 days)
create or replace function cleanup_old_notifications()
returns void as $$
begin
    delete from public.user_notification_history
    where created_at < now() - interval '90 days';
end;
$$ language plpgsql security definer;

-- Optional: Schedule cleanup with pg_cron (if available)
-- select cron.schedule('cleanup-old-notifications', '0 2 * * *', 'select cleanup_old_notifications()');

comment on table public.user_notification_history is 'Stores notification history for users';
comment on column public.user_notification_history.fid is 'Farcaster FID (optional)';
comment on column public.user_notification_history.wallet_address is 'Ethereum wallet address (optional, normalized to lowercase)';
comment on column public.user_notification_history.category is 'Notification category: system, quest, badge, guild, reward, tip, level, reminder, mention, streak';
comment on column public.user_notification_history.tone is 'Notification tone: info, success, warning, error';
comment on column public.user_notification_history.metadata is 'Additional notification metadata (mentioned_user, reward_amount, streak_count, etc.)';
comment on column public.user_notification_history.dismissed_at is 'Timestamp when notification was dismissed by user';
