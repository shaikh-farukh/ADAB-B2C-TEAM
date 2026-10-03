-- Add missing columns to manage_manufacturer_products

ALTER TABLE manage_manufacturer_products
ADD COLUMN IF NOT EXISTS warehouse_stock JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS international_selling BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS international_price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS export_hs_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS tier_pricing JSONB,
ADD COLUMN IF NOT EXISTS modified_by INTEGER;
