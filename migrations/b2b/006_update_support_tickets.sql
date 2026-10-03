-- Migration 006: Drop duplicate message column in manage_b_to_b_support_tickets

-- The table was somehow created with both message and description.
-- The backend uses description, so we drop message.
ALTER TABLE manage_b_to_b_support_tickets DROP COLUMN IF EXISTS message;
