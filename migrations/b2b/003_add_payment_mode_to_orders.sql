-- Migration to add payment_mode to manage_b_to_b_orders
ALTER TABLE manage_b_to_b_orders 
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'CASH';
