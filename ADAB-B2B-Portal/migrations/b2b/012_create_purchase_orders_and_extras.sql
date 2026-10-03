-- =============================================
-- Migration 012: Create missing tables for shop orders and campaigns
-- =============================================

CREATE TABLE IF NOT EXISTS manage_b2b_purchase_order (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100),
    distributor_id INTEGER,
    manufacturer_id INTEGER,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    item_count INTEGER DEFAULT 1,
    notes TEXT,
    delivery_date DATE,
    fk_supplier_detail INTEGER,
    fk_shop_detail INTEGER,
    tax DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    po_number VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS manage_b2b_purchase_order_detail (
    id SERIAL PRIMARY KEY,
    fk_purchase_order INTEGER REFERENCES manage_b2b_purchase_order(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_name VARCHAR(255),
    quantity INTEGER,
    price DECIMAL(12,2),
    tax DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fk_product INTEGER,
    unit_price DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
    id SERIAL PRIMARY KEY,
    campaign_notification_id INTEGER,
    user_id INTEGER,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'delivered'
);

-- Add missing columns to shopdetail for auth/profile queries
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS gst_id VARCHAR(50);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS fk_city INTEGER;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS fk_state INTEGER;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS fk_country INTEGER;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE shopdetail ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to manage_b_to_b_userdetail for discovery/profile
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS product_category VARCHAR(255);
ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
