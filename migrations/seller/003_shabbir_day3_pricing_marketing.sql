-- Day 3: Pricing, Marketing, and Domain Events

-- 1. Create outbox_events table for transactional domain events
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add advanced targeting columns to coupons table
ALTER TABLE coupons 
  ADD COLUMN IF NOT EXISTS applies_to VARCHAR(50) DEFAULT 'ENTIRE_SHOP',
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'CUSTOMERS',
  ADD COLUMN IF NOT EXISTS target_value VARCHAR(255);
