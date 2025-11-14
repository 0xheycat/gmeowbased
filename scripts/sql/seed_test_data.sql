-- Seed test data for gmeow_rank_events
-- Testing user: fid 18139 with wallet address from Neynar

-- Clear existing test data (optional)
DELETE FROM gmeow_rank_events WHERE fid = 18139;

-- Insert GM events (daily check-ins)
INSERT INTO gmeow_rank_events (
  fid,
  wallet_address,
  chain,
  event_type,
  delta,
  total_points,
  level,
  tier_name,
  created_at,
  metadata
) VALUES
-- Week 1: Consistent GM streak
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 10, 10, 1, 'Bronze', '2025-11-01 08:00:00+00', '{"streak": 1, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 10, 20, 1, 'Bronze', '2025-11-02 09:00:00+00', '{"streak": 2, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 10, 30, 1, 'Bronze', '2025-11-03 10:00:00+00', '{"streak": 3, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 10, 40, 1, 'Bronze', '2025-11-04 08:30:00+00', '{"streak": 4, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 10, 50, 1, 'Bronze', '2025-11-05 07:45:00+00', '{"streak": 5, "time": "morning"}'),

-- Quest completion events
(18139, '0x1234567890123456789012345678901234567890', 'base', 'quest-verify', 50, 100, 2, 'Silver', '2025-11-06 14:00:00+00', '{"quest_id": "intro-quest", "quest_name": "Welcome Aboard"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'quest-verify', 100, 200, 2, 'Silver', '2025-11-07 16:30:00+00', '{"quest_id": "first-cast", "quest_name": "First Cast"}'),

-- More GM events after level up
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 15, 215, 2, 'Silver', '2025-11-08 08:15:00+00', '{"streak": 6, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 15, 230, 2, 'Silver', '2025-11-09 09:20:00+00', '{"streak": 7, "time": "morning"}'),

-- Tip events (giving and receiving)
(18139, '0x1234567890123456789012345678901234567890', 'base', 'tip', 25, 255, 2, 'Silver', '2025-11-10 12:00:00+00', '{"tip_type": "received", "from_fid": 12345, "amount": 10}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'tip', 10, 265, 2, 'Silver', '2025-11-10 15:00:00+00', '{"tip_type": "sent", "to_fid": 67890, "amount": 5}'),

-- More recent activity
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 15, 280, 2, 'Silver', '2025-11-11 07:30:00+00', '{"streak": 8, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'quest-verify', 150, 430, 3, 'Gold', '2025-11-11 18:00:00+00', '{"quest_id": "power-user", "quest_name": "Power User"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 20, 450, 3, 'Gold', '2025-11-12 08:00:00+00', '{"streak": 9, "time": "morning"}'),
(18139, '0x1234567890123456789012345678901234567890', 'base', 'gm', 20, 470, 3, 'Gold', '2025-11-13 08:05:00+00', '{"streak": 10, "time": "morning"}');

-- Add some multi-chain activity
INSERT INTO gmeow_rank_events (
  fid,
  wallet_address,
  chain,
  event_type,
  delta,
  total_points,
  level,
  tier_name,
  created_at,
  metadata
) VALUES
(18139, '0x1234567890123456789012345678901234567890', 'optimism', 'gm', 10, 480, 3, 'Gold', '2025-11-13 09:00:00+00', '{"streak": 1, "time": "morning", "chain": "optimism"}'),
(18139, '0x1234567890123456789012345678901234567890', 'optimism', 'quest-verify', 75, 555, 3, 'Gold', '2025-11-13 11:00:00+00', '{"quest_id": "cross-chain", "quest_name": "Cross-Chain Explorer"}');

-- Summary of test data:
-- Total Points: 555
-- Current Level: 3 (Gold)
-- GM Streak: 10 days (on Base), 1 day (on Optimism)
-- Quests Completed: 4
-- Tips Activity: 2 events (1 received, 1 sent)
-- Chains: Base (primary), Optimism (secondary)
