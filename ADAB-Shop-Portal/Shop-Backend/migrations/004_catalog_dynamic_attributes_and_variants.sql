-- ============================================================================
-- ADAB B2C Catalog Architecture Migration Script
-- Version: 2.0.0
-- Migration: 004_catalog_dynamic_attributes_and_variants.sql
-- 
-- Description:
-- Consolidated DDL migration for Dynamic Attributes, Multi-Level Taxonomy,
-- Product Variants, Concurrency-Safe Inventory, and Catalog Curation.
--
-- Shared Database: PostgreSQL (adab_b2c_team)
-- Authors: ADAB-Shop-Portal Team (Ready for 3-Portal Review & Sign-Off)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Taxonomy & Categories Hierarchy Enhancements
-- ----------------------------------------------------------------------------
ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS materialized_path VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_leaf BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS google_product_category_id INT;

-- Backfill existing root categories if materialized_path is null
UPDATE categories 
SET level = 1, 
    materialized_path = id::text, 
    is_leaf = true 
WHERE materialized_path IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_materialized_path ON categories(materialized_path);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);


-- ----------------------------------------------------------------------------
-- 2. Category Aliases & Synonyms
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    alias_term VARCHAR(255) NOT NULL,
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_category_alias UNIQUE (category_id, alias_term)
);

CREATE INDEX IF NOT EXISTS idx_category_aliases_term ON category_aliases (alias_term);
CREATE INDEX IF NOT EXISTS idx_category_aliases_cat ON category_aliases (category_id);


-- ----------------------------------------------------------------------------
-- 3. Dynamic Attribute Definitions (Global Dictionary)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attribute_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL, -- 'TEXT', 'NUMBER', 'BOOLEAN', 'ENUM', 'MULTI_SELECT', 'DATE'
    ui_type VARCHAR(50) NOT NULL,   -- 'text', 'number', 'select', 'multiselect', 'radio', 'checkbox', 'date'
    allowed_values JSONB DEFAULT '[]'::jsonb,
    unit_options JSONB DEFAULT '[]'::jsonb,
    validation_regex VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attribute_definitions_code ON attribute_definitions(code);


-- ----------------------------------------------------------------------------
-- 4. Category Attribute Mapping (Inheritance & Constraints)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    is_variant_key BOOLEAN DEFAULT false,
    is_filter_facet BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    section_group VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cat_attr UNIQUE (category_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_category_attributes_cat ON category_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_attr ON category_attributes(attribute_id);


-- ----------------------------------------------------------------------------
-- 5. Seller Listings Schema Upgrades
-- ----------------------------------------------------------------------------
ALTER TABLE seller_listings 
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'PACKED_ITEM',
    ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS master_catalog_id UUID REFERENCES master_catalog_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manufacturer_product_id UUID REFERENCES manage_manufacturer_products(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Convert stock_qty and min_order_qty to NUMERIC(12, 3) to support fractional weights
ALTER TABLE seller_listings 
    ALTER COLUMN stock_qty TYPE NUMERIC(12, 3) USING stock_qty::numeric(12, 3),
    ALTER COLUMN min_order_qty TYPE NUMERIC(12, 3) USING min_order_qty::numeric(12, 3);

CREATE INDEX IF NOT EXISTS idx_seller_listings_attributes ON seller_listings USING gin (attributes);
CREATE INDEX IF NOT EXISTS idx_seller_listings_product_type ON seller_listings(product_type);
CREATE INDEX IF NOT EXISTS idx_seller_listings_master_catalog ON seller_listings(master_catalog_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_manufacturer_product ON seller_listings(manufacturer_product_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_published ON seller_listings(approval_status, is_active);


-- ----------------------------------------------------------------------------
-- 6. Product Variants (listing_variants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    mrp NUMERIC(12, 2) NOT NULL,
    sell_price NUMERIC(12, 2) NOT NULL,
    stock_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    variant_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_listing_variant_sku UNIQUE (listing_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_listing_variants_listing_id ON listing_variants(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_variants_barcode ON listing_variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_variants_attributes ON listing_variants USING gin (variant_attributes);


-- ----------------------------------------------------------------------------
-- 7. Cart & Order Decimal Quantity & Variant Foreign Keys
-- ----------------------------------------------------------------------------
ALTER TABLE cart_items 
    ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL;

ALTER TABLE cart_items 
    ALTER COLUMN quantity TYPE NUMERIC(12, 3) USING quantity::numeric(12, 3);

ALTER TABLE order_items 
    ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL;

ALTER TABLE order_items 
    ALTER COLUMN quantity TYPE NUMERIC(12, 3) USING quantity::numeric(12, 3);

CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 8. Catalog Promotion Audit Trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_promotion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    master_catalog_id UUID NOT NULL REFERENCES master_catalog_items(id) ON DELETE CASCADE,
    promoted_by UUID,
    promoted_barcode VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_promotion_audit_listing ON catalog_promotion_audit(listing_id);
CREATE INDEX IF NOT EXISTS idx_catalog_promotion_audit_master ON catalog_promotion_audit(master_catalog_id);


-- ----------------------------------------------------------------------------
-- 9. Taxonomy Versions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS taxonomy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number INT NOT NULL,
    published_by UUID,
    changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;

