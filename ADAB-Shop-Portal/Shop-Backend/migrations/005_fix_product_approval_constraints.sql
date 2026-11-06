-- ============================================================================
-- Migration 005: Fix Product Approval Constraints & Allow Seller Submissions
-- ============================================================================

BEGIN;

-- 1. Allow seller submissions in product_approval_history (admin_id is null on initial seller submit)
ALTER TABLE product_approval_history ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE product_approval_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Upgrade approval_status check constraint to support 9-state lifecycle
ALTER TABLE seller_listings DROP CONSTRAINT IF EXISTS seller_listings_approval_status_check;

ALTER TABLE seller_listings ADD CONSTRAINT seller_listings_approval_status_check 
CHECK (approval_status IN (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'CHANGES_REQUIRED', 'REJECTED', 'SUSPENDED', 'ARCHIVED', 'PENDING'
));

-- 3. Support fractional stock weights (e.g. 150.500 kg)
ALTER TABLE seller_listings 
    ALTER COLUMN stock_qty TYPE NUMERIC(12, 3) USING stock_qty::numeric(12, 3);

-- 4. Align product_images foreign key to point to seller_listings(id) instead of master_catalog_items(id)
ALTER TABLE product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
ALTER TABLE product_images ADD CONSTRAINT product_images_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES seller_listings(id) ON DELETE CASCADE;

COMMIT;
