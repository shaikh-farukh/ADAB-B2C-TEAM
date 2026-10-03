-- Add refresh_token to manage_b_to_b_userdetail to support JWT refresh cycles

ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS refresh_token TEXT;
