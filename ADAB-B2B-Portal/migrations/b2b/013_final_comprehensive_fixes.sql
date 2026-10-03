-- =============================================
-- Migration 013: Final comprehensive fixes
-- Adds ALL remaining missing columns and tables
-- =============================================

-- 1. Campaigns table missing columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE campaign_notifications ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- 2. Audit logs - add all columns the middleware writes to
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS entity_id INTEGER;
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS resource VARCHAR(100);
ALTER TABLE manage_b_to_b_audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(100);

-- 3. Categories - manufacturer scoping
ALTER TABLE manage_b_to_b_categories ADD COLUMN IF NOT EXISTS manufacturer_id INTEGER;
ALTER TABLE manage_b_to_b_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE manage_b_to_b_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 4. Products - pricing tiers
ALTER TABLE manage_manufacturer_products ADD COLUMN IF NOT EXISTS manufacturer_price DECIMAL(12,2);
ALTER TABLE manage_manufacturer_products ADD COLUMN IF NOT EXISTS distributor_price DECIMAL(12,2);
ALTER TABLE manage_manufacturer_products ADD COLUMN IF NOT EXISTS retail_price DECIMAL(12,2);

-- 5. Territory assignments table
CREATE TABLE IF NOT EXISTS territory_assignments (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER,
    territory_name VARCHAR(255),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    state_id INTEGER,
    city_id INTEGER,
    distributor_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 6. Logistics providers table
ALTER TABLE manage_b_to_b_logistics_providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 7. Add missing deleted_at to categories and subcategories
ALTER TABLE manage_b_to_b_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE manage_b_to_b_subcategories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
-- 8. Add missing delivery_charge to orders
ALTER TABLE manage_b_to_b_orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0.00;
