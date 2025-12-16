-- Drop all tip-related tables (Session 8 delayed)
-- User decision: Focus on critical security + dashboard instead

DROP TABLE IF EXISTS public.tip_streaks CASCADE;
DROP TABLE IF EXISTS public.tip_leaderboard CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;

-- Note: Tip system research complete (1500+ lines documentation)
-- Implementation delayed for higher priority features
-- See: docs/features/TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md
