-- Rename viral_bonus_points → viral_bonus_xp in badge_casts
-- Date: December 27, 2025
-- Justification: viral_bonus_points stores XP values (engagement progression metric), not Points currency
-- The column tracks viral engagement XP bonuses from cast metrics (likes/recasts/replies)
-- Renaming to viral_bonus_xp maintains consistency with viral_xp naming convention
-- This corrects the Dec 22 migration that went in the wrong direction

ALTER TABLE badge_casts 
  RENAME COLUMN viral_bonus_points TO viral_bonus_xp;

COMMENT ON COLUMN badge_casts.viral_bonus_xp IS 
  'Bonus XP from viral cast engagement (calculated from viral_score using tier thresholds). XP is progression metric, separate from Points currency.';

-- Rollback plan:
-- ALTER TABLE badge_casts RENAME COLUMN viral_bonus_xp TO viral_bonus_points;
