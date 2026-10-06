-- Migration: Add stock_qty and make category_id nullable in seller_listings
-- Date: 2024-10-06

BEGIN;

-- 1. Add stock_qty column to track inventory for LOOSE and PACKED items
ALTER TABLE seller_listings 
ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT 0;

-- 2. Drop NOT NULL constraint on category_id as product categorization might happen later
ALTER TABLE seller_listings 
ALTER COLUMN category_id DROP NOT NULL;

COMMIT;
