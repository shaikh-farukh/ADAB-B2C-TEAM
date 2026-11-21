-- =========================================================================
-- Migration: 003_add_cloudinary_support.sql
-- Description: Add Cloudinary image_public_id columns to existing entities
--              and create admin_banners table for platform carousel/marketing banners.
-- Date: 2026-11-20
-- Note: Strictly non-breaking, nullable columns only. No static data inserted.
-- =========================================================================

-- -------------------------------------------------------------------------
-- UP MIGRATION
-- -------------------------------------------------------------------------
BEGIN;

-- 1. Categories (adab/categories)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS image_public_id TEXT;

-- 2. Product Images (adab/products)
ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS image_public_id TEXT;

-- 3. Master Catalog Items (adab/products)
ALTER TABLE master_catalog_items
ADD COLUMN IF NOT EXISTS default_image_public_id TEXT;

-- 4. Brands (adab/brands)
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS logo_public_id TEXT;

-- 5. Seller Documents (adab/sellers/kyc & adab/sellers/branding)
ALTER TABLE seller_documents
ADD COLUMN IF NOT EXISTS file_public_id TEXT;

-- 6. Promotions (adab/marketing/banners)
ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS banner_public_id TEXT;

-- 7. Users Profile Avatar (adab/profile-images)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_public_id TEXT;

-- 8. Customer Profiles Avatar (adab/profile-images)
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS profile_picture_public_id TEXT;

-- 9. Admin Marketing Banners Table (adab/marketing/banners)
CREATE TABLE IF NOT EXISTS admin_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    target_screen VARCHAR(100),
    target_url TEXT,
    image_url TEXT NOT NULL,
    image_public_id TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_banners_active ON admin_banners(is_active, display_order);

COMMIT;

-- =========================================================================
-- DOWN MIGRATION (Rollback Reference)
-- =========================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS admin_banners CASCADE;
-- ALTER TABLE customer_profiles DROP COLUMN IF EXISTS profile_picture_public_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS avatar_public_id;
-- ALTER TABLE promotions DROP COLUMN IF EXISTS banner_public_id;
-- ALTER TABLE seller_documents DROP COLUMN IF EXISTS file_public_id;
-- ALTER TABLE brands DROP COLUMN IF EXISTS logo_public_id;
-- ALTER TABLE master_catalog_items DROP COLUMN IF EXISTS default_image_public_id;
-- ALTER TABLE product_images DROP COLUMN IF EXISTS image_public_id;
-- ALTER TABLE categories DROP COLUMN IF EXISTS image_public_id;
-- COMMIT;
