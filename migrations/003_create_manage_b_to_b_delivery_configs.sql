-- Migration: Create manage_b_to_b_delivery_configs table
-- Purpose: B2B shop-specific delivery configurations, distance pricing rules, and thresholds

BEGIN;

CREATE TABLE IF NOT EXISTS public.manage_b_to_b_delivery_configs (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER,
    mode VARCHAR(50),
    base_charge NUMERIC(10,2) DEFAULT 0,
    per_km_charge NUMERIC(10,2) DEFAULT 0,
    min_free_delivery_order_value NUMERIC(10,2) DEFAULT 0,
    max_delivery_radius_km NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manage_b_to_b_delivery_configs_shop_id ON public.manage_b_to_b_delivery_configs(shop_id);

COMMIT;
