-- Expose gmeow.badge_adventure via a public read-only view for PostgREST access
-- Generated on 2025-11-11

create or replace view public.gmeow_badge_adventure as
select * from gmeow.badge_adventure;

grant select on public.gmeow_badge_adventure to anon, authenticated, service_role;
