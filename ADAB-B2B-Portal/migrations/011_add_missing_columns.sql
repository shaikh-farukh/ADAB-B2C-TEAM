-- =============================================
-- Migration 011: Add missing columns to existing tables
-- Fixes: company_logo, deleted_at on vehicles/drivers,
-- shop columns, request_access columns, user profile columns
-- =============================================

-- 1. Add missing columns to manage_b_to_b_userdetail
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS company_logo VARCHAR(500);
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS international_business BOOLEAN DEFAULT false;
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS wish_to_export_countries TEXT;
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS vat_number VARCHAR(100);
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS export_hs_code VARCHAR(100);
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS market_scope VARCHAR(50) DEFAULT 'domestic';

-- 2. Add deleted_at to vehicles and drivers tables
ALTER TABLE manage_b_to_b_vehicles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE manage_b_to_b_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE manage_b_to_b_drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE manage_b_to_b_drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Add missing columns to shopdetail
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS shop_address TEXT;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(20);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);

-- 4. Add missing columns to manage_b_to_b_request_access
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS target_price NUMERIC(12,2);
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS deadline TIMESTAMP;
ALTER TABLE manage_b_to_b_request_access ADD COLUMN IF NOT EXISTS negotiation_history JSONB DEFAULT '[]'::jsonb;
