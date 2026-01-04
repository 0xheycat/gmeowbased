-- Migration: Populate verification_data.type for existing quests
-- Date: December 28, 2025
-- Purpose: Fix Bug #21 - Missing verification_data.type field
-- 
-- Context: verification_data is a JSONB column in unified_quests table.
-- This migration populates the 'type' field within the JSON data for existing quests
-- based on their existing field values, enabling proper verification type dispatch.
--
-- No schema changes - only data population within JSONB column.

-- Update social quests with inferred verification type
UPDATE unified_quests
SET verification_data = jsonb_set(
  COALESCE(verification_data, '{}'::jsonb),
  '{type}',
  CASE 
    WHEN verification_data ? 'target_fid' THEN '"follow_user"'::jsonb
    WHEN verification_data ? 'channel_id' OR verification_data ? 'target_channel_id' THEN '"join_channel"'::jsonb
    WHEN verification_data ? 'cast_hash' OR verification_data ? 'target_cast_hash' THEN '"like_cast"'::jsonb
    WHEN verification_data ? 'required_text' OR verification_data ? 'required_tag' THEN '"create_cast_with_tag"'::jsonb
    ELSE '"follow_user"'::jsonb
  END
)
WHERE category = 'social' 
  AND (verification_data IS NULL OR NOT verification_data ? 'type');

-- Update onchain quests with inferred verification type
UPDATE unified_quests
SET verification_data = jsonb_set(
  COALESCE(verification_data, '{}'::jsonb),
  '{type}',
  CASE
    WHEN verification_data ? 'nft_contract' THEN '"mint_nft"'::jsonb
    WHEN verification_data ? 'token_address' THEN '"swap_token"'::jsonb
    WHEN verification_data ? 'pool_address' THEN '"provide_liquidity"'::jsonb
    WHEN verification_data ? 'transaction_hash' THEN '"bridge"'::jsonb
    ELSE '"mint_nft"'::jsonb
  END
)
WHERE category = 'onchain'
  AND (verification_data IS NULL OR NOT verification_data ? 'type');

-- Verification query (run after migration to confirm success)
-- SELECT 
--   category,
--   COUNT(*) as total_quests,
--   COUNT(CASE WHEN verification_data ? 'type' THEN 1 END) as with_type,
--   COUNT(CASE WHEN NOT verification_data ? 'type' THEN 1 END) as without_type
-- FROM unified_quests
-- WHERE category IN ('social', 'onchain')
-- GROUP BY category;
