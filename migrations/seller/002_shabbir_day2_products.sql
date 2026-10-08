-- Day 2: Product Approval Workflow & Images

-- 1. Create product approval history table
CREATE TABLE IF NOT EXISTS product_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create listing documents table
CREATE TABLE IF NOT EXISTS listing_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
    document_type VARCHAR(100),
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Fix constraints on seller_listings to allow DRAFT states without admin approval
ALTER TABLE seller_listings ALTER COLUMN admin_id DROP NOT NULL;
