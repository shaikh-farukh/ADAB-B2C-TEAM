-- Migration 008: Add discovery and territory features
-- Add serviceable_pincodes, is_featured, campaign_id to manage_b_to_b_userdetail

ALTER TABLE manage_b_to_b_userdetail
ADD COLUMN IF NOT EXISTS serviceable_pincodes VARCHAR(10)[],
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS campaign_id INTEGER;

-- Create campaigns table if it doesn't exist (optional, but good for foreign key)
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key
ALTER TABLE manage_b_to_b_userdetail
ADD CONSTRAINT fk_userdetail_campaign
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
