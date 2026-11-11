-- ============================================================================
-- ADAB ENTERPRISE MARKETPLACE — COMPLETE UNIFIED DATABASE SETUP SCRIPT
-- Version: 2.5.0 (All 3 Portals + B2B Wholesale Platform)
--
-- Description:
-- 1-Click Bootstrap migration for a completely fresh PostgreSQL instance.
-- Creates all 187 tables across all 11 architecture domains in strict
-- foreign-key dependency order, followed by essential baseline seeds.
--
-- Safe & Idempotent: Can be run on any empty or existing database.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- =========================================================================
-- ADAB ENTERPRISE MULTI-PORTAL POSTGRESQL SCHEMA (100% COMPLETE & PRODUCTION GRADE)
-- PostgreSQL 16+ Compatible
-- Covers: Seller Portal, Customer App, and Admin Platform (All 113+ Tables)
-- =========================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- DOMAIN 1: IDENTITY, ACCESS CONTROL, AUTH & RBAC (Karan)
-- =========================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    user_type VARCHAR(30) NOT NULL CHECK (user_type IN ('CUSTOMER','SELLER','ADMIN','DRIVER','AGENT')),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','BANNED')),
    avatar_url TEXT,
    is_phone_verified BOOLEAN DEFAULT false,
    is_email_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type, status);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);
CREATE INDEX IF NOT EXISTS idx_perm_module ON permissions(module);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_ur_user ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    is_trusted BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sess_user_exp ON sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);

CREATE TABLE IF NOT EXISTS auth_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20),
    email VARCHAR(255),
    otp_code_hash VARCHAR(255) NOT NULL,
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN ('LOGIN_OTP','REGISTRATION_OTP','PASSWORD_RESET','KYC_VERIFY')),
    attempts INT DEFAULT 0,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_chall_phone ON auth_challenges(phone, is_used, expires_at);

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    user_agent TEXT,
    last_ip INET,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_trusted_dev ON trusted_devices(user_id, device_fingerprint);

CREATE TABLE IF NOT EXISTS passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_or_email VARCHAR(150) NOT NULL,
    ip_address INET NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('SUCCESS','OTP_FAILED','RATE_LIMITED','BLOCKED')),
    failure_reason VARCHAR(150),
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_att ON login_attempts(phone_or_email, attempted_at DESC);

CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    is_granted BOOLEAN DEFAULT true,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    redirect_uris TEXT[] NOT NULL,
    allowed_grant_types TEXT[] DEFAULT '{"authorization_code","refresh_token"}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- DOMAIN 2: PROFILES, STORES & ONBOARDING (Shabbir & Mahi)
-- =========================================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    loyalty_tier VARCHAR(30) DEFAULT 'BRONZE' CHECK (loyalty_tier IN ('BRONZE','SILVER','GOLD','PLATINUM')),
    date_of_birth DATE,
    gender VARCHAR(20),
    profile_picture_url TEXT,
    gst_in VARCHAR(15),
    company_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cust_prof_user ON customer_profiles(user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_updates_sms BOOLEAN DEFAULT true,
    order_updates_email BOOLEAN DEFAULT true,
    order_updates_whatsapp BOOLEAN DEFAULT true,
    promotional_sms BOOLEAN DEFAULT false,
    promotional_email BOOLEAN DEFAULT false,
    promotional_whatsapp BOOLEAN DEFAULT false,
    soundbox_alerts BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home',
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line TEXT NOT NULL,
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addr_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home',
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line TEXT NOT NULL,
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_caddr_cust ON customer_addresses(customer_id);

CREATE TABLE IF NOT EXISTS seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    legal_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('Sole Proprietorship','Partnership Firm','LLP','Private Limited','Individual Trader')),
    gstin VARCHAR(15) UNIQUE,
    pan VARCHAR(10) NOT NULL,
    fssai_license VARCHAR(20),
    udhyam_msme VARCHAR(30),
    kyc_status VARCHAR(30) DEFAULT 'DRAFT' CHECK (kyc_status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED')),
    onboarding_step INT DEFAULT 1,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_gstin ON seller_profiles(gstin);
CREATE INDEX IF NOT EXISTS idx_sp_status ON seller_profiles(kyc_status);

CREATE TABLE IF NOT EXISTS seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('GST_CERTIFICATE','SHOP_IMAGE','FSSAI_DOC','PAN_CARD','CANCELLED_CHEQUE')),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'PENDING',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdocs_seller ON seller_documents(seller_id);

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    store_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address_line TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    delivery_radius_km NUMERIC(5,2) DEFAULT 10.00,
    is_online BOOLEAN DEFAULT true,
    open_time TIME DEFAULT '08:00:00',
    close_time TIME DEFAULT '22:00:00',
    soundbox_enabled BOOLEAN DEFAULT true,
    ui_mode VARCHAR(20) DEFAULT 'SIMPLE' CHECK (ui_mode IN ('SIMPLE','PRO')),
    rating NUMERIC(3,2) DEFAULT 5.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stores_loc ON stores(city, pincode);
CREATE INDEX IF NOT EXISTS idx_stores_radius ON stores(latitude, longitude);

CREATE TABLE IF NOT EXISTS seller_onboarding_steps (
    user_id UUID PRIMARY KEY,
    step1 BOOLEAN DEFAULT false,
    step2 BOOLEAN DEFAULT false,
    step3 BOOLEAN DEFAULT false,
    step4 BOOLEAN DEFAULT false,
    step5 BOOLEAN DEFAULT false,
    step6 BOOLEAN DEFAULT false,
    step7 BOOLEAN DEFAULT false,
    profile_data JSONB DEFAULT '{}'::jsonb,
    delivery_config JSONB DEFAULT '{}'::jsonb,
    credit_config JSONB DEFAULT '{}'::jsonb,
    starter_products JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(15) NOT NULL,
    account_type VARCHAR(20) DEFAULT 'CURRENT' CHECK (account_type IN ('CURRENT','SAVINGS')),
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sba_seller ON seller_bank_accounts(seller_id);

CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    radius_km NUMERIC(5,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0.00,
    delivery_fee NUMERIC(8,2) DEFAULT 0.00,
    estimated_minutes_min INT DEFAULT 14,
    estimated_minutes_max INT DEFAULT 30,
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_dz_store ON delivery_zones(store_id);

CREATE TABLE IF NOT EXISTS seller_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    driver_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_number VARCHAR(50),
    vehicle_type VARCHAR(30) DEFAULT 'BIKE' CHECK (vehicle_type IN ('BIKE','VAN','AUTO_RICKSHAW','ELECTRIC_SCOOTER')),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdrivers_store ON seller_drivers(store_id);

CREATE TABLE IF NOT EXISTS export_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) DEFAULT 'CSV' CHECK (format IN ('CSV','PDF','XLSX')),
    status VARCHAR(30) DEFAULT 'COMPLETED',
    file_url TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exprep_seller ON export_reports(seller_id);

-- =========================================================================
-- DOMAIN 3: BANKING PARTNERS, CREDIT LINES & 0% BNPL (Karan & Devika)
-- =========================================================================

CREATE TABLE IF NOT EXISTS bank_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    logo_url TEXT,
    interest_rate_pct NUMERIC(4,2) DEFAULT 0.00 CHECK (interest_rate_pct >= 0.00),
    max_credit_limit NUMERIC(12,2) NOT NULL,
    tenure_options INT[] DEFAULT '{7, 14, 21, 30, 60}',
    eligibility_criteria JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bp_code ON bank_partners(code);
CREATE INDEX IF NOT EXISTS idx_bp_active ON bank_partners(is_active);

CREATE TABLE IF NOT EXISTS credit_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(30) UNIQUE NOT NULL,
    applicant_type VARCHAR(20) NOT NULL CHECK (applicant_type IN ('CUSTOMER','SELLER')),
    applicant_id UUID NOT NULL,
    applicant_name VARCHAR(150) NOT NULL,
    bank_id UUID NOT NULL REFERENCES bank_partners(id),
    requested_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2) DEFAULT 0.00,
    tenure_days INT DEFAULT 14,
    monthly_turnover NUMERIC(12,2),
    reason VARCHAR(255),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','UNDER_REVIEW')),
    admin_note TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ca_status ON credit_applications(status);
CREATE INDEX IF NOT EXISTS idx_ca_applicant ON credit_applications(applicant_type, applicant_id);

CREATE TABLE IF NOT EXISTS credit_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_type VARCHAR(20) NOT NULL,
    applicant_id UUID NOT NULL,
    bank_id UUID NOT NULL REFERENCES bank_partners(id),
    total_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    utilized_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    available_amount NUMERIC(12,2) GENERATED ALWAYS AS (total_limit - utilized_amount) STORED,
    due_date TIMESTAMPTZ,
    is_locked BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_util_limit CHECK (utilized_amount <= total_limit)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cl_entity ON credit_ledgers(applicant_type, applicant_id);

CREATE TABLE IF NOT EXISTS credit_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL REFERENCES credit_ledgers(id),
    payment_amount NUMERIC(12,2) NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'SUCCESS',
    paid_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_ledger ON credit_repayments(ledger_id);

-- =========================================================================

-- B2B Base Entities (Needed for Catalog Cross-References)
CREATE TABLE IF NOT EXISTS state (
    id SERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS city (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES state(id),
    city_name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_categories (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES manage_b_to_b_categories(id) ON DELETE CASCADE,
    subcategory_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_manufacturer_products (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL,
    category_id INTEGER,
    subcategory_id INTEGER,
    category VARCHAR(255),
    sub_category VARCHAR(255),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'pcs',
    price NUMERIC(12,2) DEFAULT 0,
    mrp NUMERIC(12,2) DEFAULT 0,
    manufacturer_price NUMERIC(12,2),
    distributor_price NUMERIC(12,2),
    retail_price NUMERIC(12,2),
    moq INTEGER DEFAULT 1,
    total_stock INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    north_hub INTEGER DEFAULT 0,
    south_hub INTEGER DEFAULT 0,
    central_hub INTEGER DEFAULT 0,
    image_url TEXT,
    image TEXT,
    product_image TEXT,
    tier_pricing JSONB,
    status VARCHAR(50) DEFAULT 'active',
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- DOMAIN 4: CATALOG, PRODUCTS, VARIANTS & SEARCH (Karan & Shabbir)
-- =========================================================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    materialized_path VARCHAR(500),
    is_leaf BOOLEAN DEFAULT true,
    icon_class VARCHAR(50),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    google_product_category_id INT
);
CREATE INDEX IF NOT EXISTS idx_cat_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_materialized_path ON categories(materialized_path);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    barcode VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

CREATE TABLE IF NOT EXISTS master_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(50) UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    category_id INT REFERENCES categories(id),
    printed_mrp NUMERIC(10,2) NOT NULL,
    standard_unit VARCHAR(20) DEFAULT 'pcs',
    default_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mc_barcode ON master_catalog_items(barcode);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES master_catalog_items(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    pack_size VARCHAR(50) NOT NULL,
    weight_in_grams NUMERIC(10,2),
    mrp NUMERIC(12,2) NOT NULL,
    base_cost NUMERIC(12,2),
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prod_var_prod ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_var_sku ON product_variants(sku);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES master_catalog_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    alt_text VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prod_img_prod ON product_images(product_id, display_order);

CREATE TABLE IF NOT EXISTS seller_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL DEFAULT 'PACKED_ITEM' CHECK (product_type IN ('OWN_BRAND','LOOSE_WEIGHT','PACKED_ITEM')),
    master_catalog_id UUID REFERENCES master_catalog_items(id) ON DELETE SET NULL,
    manufacturer_product_id INTEGER,
    title VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(50),
    brand_tag VARCHAR(100),
    category_id INT NOT NULL REFERENCES categories(id),
    mrp NUMERIC(12,2) NOT NULL,
    sell_price NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pcs',
    stock_qty NUMERIC(12,3) DEFAULT 0.000,
    min_order_qty NUMERIC(12,3) DEFAULT 1.000,
    allowed_buyers VARCHAR(30) DEFAULT 'ALL' CHECK (allowed_buyers IN ('ALL','CUSTOMERS_ONLY','STORES_ONLY')),
    approval_status VARCHAR(30) DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','SUBMITTED','PENDING','APPROVED','REJECTED','CHANGES_REQUIRED')),
    rejection_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    is_refundable BOOLEAN DEFAULT true,
    refund_percentage NUMERIC(5,2) DEFAULT 100.00,
    return_window_days INT DEFAULT 7,
    attributes JSONB DEFAULT '{}'::jsonb,
    has_variants BOOLEAN DEFAULT false,
    rating NUMERIC(3,2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sl_store ON seller_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_sl_status ON seller_listings(approval_status, is_active);
CREATE INDEX IF NOT EXISTS idx_sl_type ON seller_listings(product_type);
CREATE INDEX IF NOT EXISTS idx_seller_listings_attributes ON seller_listings USING gin (attributes);
CREATE INDEX IF NOT EXISTS idx_seller_listings_master_catalog ON seller_listings(master_catalog_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_manufacturer_product ON seller_listings(manufacturer_product_id);

CREATE TABLE IF NOT EXISTS listing_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    attribute_key VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, attribute_key)
);
CREATE INDEX IF NOT EXISTS idx_list_attr ON listing_attributes(listing_id);

CREATE TABLE IF NOT EXISTS listing_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ld_listing ON listing_documents(listing_id);

-- Dynamic Catalog Specifications & Multi-SKU Variant Architecture
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

CREATE TABLE IF NOT EXISTS attribute_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL,
    ui_type VARCHAR(50) NOT NULL,
    allowed_values JSONB DEFAULT '[]'::jsonb,
    unit_options JSONB DEFAULT '[]'::jsonb,
    validation_regex VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attribute_definitions_code ON attribute_definitions(code);

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

CREATE TABLE IF NOT EXISTS taxonomy_versions (
    version_tag VARCHAR(50) PRIMARY KEY,
    description TEXT,
    migration_file VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_promotion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    target_listing_id UUID REFERENCES seller_listings(id) ON DELETE SET NULL,
    curation_notes TEXT,
    action_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalog_promo_audit_store ON catalog_promotion_audit(store_id);


CREATE TABLE IF NOT EXISTS product_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id),
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    rejection_reason TEXT,
    notes TEXT,
    action_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prod_appr_hist ON product_approval_history(listing_id, action_at DESC);

CREATE TABLE IF NOT EXISTS search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_term VARCHAR(100) NOT NULL,
    synonyms TEXT[] NOT NULL,
    language_code VARCHAR(10) DEFAULT 'hi',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(primary_term, language_code)
);
CREATE INDEX IF NOT EXISTS idx_search_syn ON search_synonyms(primary_term);

CREATE TABLE IF NOT EXISTS search_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_term VARCHAR(100) UNIQUE NOT NULL,
    redirect_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID UNIQUE REFERENCES seller_listings(id) ON DELETE CASCADE,
    search_vector tsvector,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psi_vector ON product_search_index USING gin(search_vector);

CREATE TABLE IF NOT EXISTS partner_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    source_brand_store_id UUID NOT NULL REFERENCES stores(id),
    source_listing_id UUID NOT NULL REFERENCES seller_listings(id),
    custom_sell_price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pp_store ON partner_packs(store_id);

-- =========================================================================
-- DOMAIN 5: INVENTORY, WAREHOUSES & B2B PROCUREMENT (Mayank)
-- =========================================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    address_line TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wh_store ON warehouses(store_id);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL UNIQUE REFERENCES seller_listings(id) ON DELETE CASCADE,
    stock_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    available_quantity NUMERIC(10,2) GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
    low_stock_threshold NUMERIC(10,2) DEFAULT 5.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_stock_reserved CHECK (stock_quantity >= reserved_quantity)
);
CREATE INDEX IF NOT EXISTS idx_inv_listing ON inventory(listing_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('RESTOCK','ORDER_FULFILL','POS_COUNTER_SALE','MANUAL_ADJUSTMENT','RETURN_RESTOCK','DAMAGED_WRITE_OFF')),
    quantity_change INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_inv ON inventory_transactions(inventory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150),
    gstin VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    payment_terms VARCHAR(100) DEFAULT '15_DAYS_CREDIT',
    rating NUMERIC(3,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supp_city ON suppliers(city, is_active);

CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit_cost NUMERIC(12,2) NOT NULL,
    moq INT DEFAULT 1,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supp_prod ON supplier_products(supplier_id);

CREATE TABLE IF NOT EXISTS stock_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    total_amount NUMERIC(14,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'CREDIT_LINE',
    status VARCHAR(50) DEFAULT 'PLACED' CHECK (status IN ('DRAFT','PLACED','CONFIRMED','SHIPPED','RECEIVED','CANCELLED')),
    expected_delivery DATE,
    actual_delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_store ON stock_purchase_orders(store_id, status);

CREATE TABLE IF NOT EXISTS stock_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES stock_purchase_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    unit_purchase_price NUMERIC(12,2) NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    total_cost NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_items ON stock_purchase_order_items(purchase_order_id);

CREATE TABLE IF NOT EXISTS b2b_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(30) UNIQUE NOT NULL,
    buyer_store_id UUID NOT NULL REFERENCES stores(id),
    supplier_store_id UUID NOT NULL REFERENCES stores(id),
    total_amount NUMERIC(12,2) NOT NULL,
    payment_terms VARCHAR(30) DEFAULT 'CREDIT_14D' CHECK (payment_terms IN ('CREDIT_7D','CREDIT_14D','CREDIT_30D','ADVANCE_UPI')),
    status VARCHAR(30) DEFAULT 'PLACED' CHECK (status IN ('PLACED','CONFIRMED','DISPATCHED','RECEIVED','CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_b2bpo_buyer ON b2b_purchase_orders(buyer_store_id);
CREATE INDEX IF NOT EXISTS idx_b2bpo_supplier ON b2b_purchase_orders(supplier_store_id);

CREATE TABLE IF NOT EXISTS b2b_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES b2b_purchase_orders(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id),
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_b2bitems_po ON b2b_purchase_items(purchase_order_id);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_TRANSIT','COMPLETED','CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id),
    quantity NUMERIC(10,2) NOT NULL
);

-- =========================================================================
-- DOMAIN 6: CARTS, WISHLIST, OFFERS & REWARDS (Mrunal & Mahi)
-- =========================================================================

CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255),
    coupon_code VARCHAR(50),
    delivery_speed VARCHAR(30) DEFAULT 'EXPRESS_30M' CHECK (delivery_speed IN ('EXPRESS_30M','SAME_DAY','STORE_PICKUP')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);

CREATE TABLE IF NOT EXISTS guest_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id),
    variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1.000,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, listing_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_ci_cart ON cart_items(cart_id);

CREATE TABLE IF NOT EXISTS cart_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlists(user_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wishlist_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_wli_wishlist ON wishlist_items(wishlist_id);

CREATE TABLE IF NOT EXISTS customer_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_cfav_cust ON customer_favorites(customer_id);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE','FLAT_AMOUNT')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_value NUMERIC(10,2) DEFAULT 0.00,
    max_discount_cap NUMERIC(10,2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    promo_type VARCHAR(50) NOT NULL,
    banner_url TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_products (
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
    promo_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (promotion_id, listing_id)
);

CREATE TABLE IF NOT EXISTS rewards_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_earned INT DEFAULT 0,
    tier VARCHAR(30) DEFAULT 'BRONZE',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ra_user ON rewards_accounts(user_id);

CREATE TABLE IF NOT EXISTS reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('EARN_ORDER','EARN_POS','REDEEM_ORDER','SIGNUP_BONUS')),
    reference_id VARCHAR(100),
    balance_after INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rw_user ON reward_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rewards_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('EARN_ORDER','EARN_POS','REDEEM_ORDER','SIGNUP_BONUS')),
    reference_id VARCHAR(100),
    balance_after INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0.00 CHECK (balance >= 0.00),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cw_cust ON customer_wallets(customer_id);

-- =========================================================================
-- DOMAIN 7: ORDERS, SHIPPING, PAYMENTS & SETTLEMENTS (Mayank & Mrunal)
-- =========================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    delivery_address JSONB NOT NULL,
    delivery_mode VARCHAR(30) DEFAULT 'EXPRESS_30M' CHECK (delivery_mode IN ('EXPRESS_30M','SAME_DAY','STORE_PICKUP')),
    total_mrp NUMERIC(10,2) NOT NULL,
    total_discount NUMERIC(10,2) DEFAULT 0.00,
    delivery_fee NUMERIC(10,2) DEFAULT 0.00,
    grand_total NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('UPI','CREDIT_14D','CARD','CASH_ON_DELIVERY','WALLET','NET_BANKING','ADAB_PAY_LATER')),
    payment_status VARCHAR(30) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','AUTHORIZED','CAPTURED','PAID','FAILED','REFUNDED')),
    order_status VARCHAR(30) DEFAULT 'PLACED' CHECK (order_status IN ('PLACED','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED')),
    eta_minutes INT DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_cust ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stat ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    subtotal NUMERIC(10,2) NOT NULL,
    commission_fee NUMERIC(10,2) DEFAULT 0.00,
    seller_payout_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'NEW' CHECK (status IN ('NEW','ACCEPTED','PACKED','DISPATCHED','DELIVERED','CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_store ON seller_orders(store_id, status);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id),
    variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oi_so ON order_items(seller_order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_order_id UUID REFERENCES seller_orders(id),
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ord_stat_hist ON order_status_history(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    order_id UUID REFERENCES orders(id),
    cart_id UUID REFERENCES carts(id),
    quantity_reserved INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMMITTED','EXPIRED','RELEASED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_res_exp ON inventory_reservations(expires_at, status);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    coupon_code VARCHAR(50) NOT NULL,
    discount_availed NUMERIC(12,2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coup_red ON coupon_redemptions(customer_id, coupon_code);

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(30) NOT NULL CHECK (method_type IN ('CARD','UPI','NET_BANKING','WALLET')),
    provider VARCHAR(50) NOT NULL,
    token_reference VARCHAR(255) NOT NULL,
    last4 VARCHAR(4),
    expiry_month INT,
    expiry_year INT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_user ON payment_methods(user_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    payment_gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(150) UNIQUE,
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('UPI','CARD','NET_BANKING','ADAB_PAY_LATER','WALLET','COD')),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED')),
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_tx_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_gw ON payment_transactions(gateway_transaction_id);

CREATE TABLE IF NOT EXISTS payment_provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) NOT NULL,
    merchant_id VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret_key_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    tracking_url_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES shipping_carriers(id),
    account_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carrier_service_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID REFERENCES shipping_carriers(id) ON DELETE CASCADE,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    expected_days INT DEFAULT 3,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES delivery_zones(id),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_deliveries INT DEFAULT 20,
    current_booked INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(zone_id, slot_date, start_time, end_time)
);
CREATE INDEX IF NOT EXISTS idx_del_slots ON delivery_slots(zone_id, slot_date, is_active);

CREATE TABLE IF NOT EXISTS shipping_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES delivery_zones(id),
    min_weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    max_weight_kg NUMERIC(6,2) NOT NULL,
    base_rate NUMERIC(10,2) NOT NULL,
    per_kg_rate NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    carrier_name VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100) UNIQUE,
    label_url TEXT,
    status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN ('CREATED','MANIFESTED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED')),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ship_so ON shipments(seller_order_id);

CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id)
);

CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id),
    event_name VARCHAR(100) NOT NULL,
    event_description TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_track_events ON tracking_events(order_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    seller_order_id UUID REFERENCES seller_orders(id),
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    invoice_pdf_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_order ON invoices(order_id);

CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    settlement_cycle VARCHAR(50) NOT NULL,
    total_sales NUMERIC(14,2) NOT NULL,
    total_commission NUMERIC(12,2) NOT NULL,
    total_tax_deducted NUMERIC(12,2) DEFAULT 0.00,
    net_payable NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','PAID','DISPUTED')),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settle_store ON settlements(store_id);

CREATE TABLE IF NOT EXISTS settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id),
    amount NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_batch_id VARCHAR(100) NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    bank_account_id UUID NOT NULL REFERENCES seller_bank_accounts(id),
    gross_earnings NUMERIC(14,2) NOT NULL,
    commission_deducted NUMERIC(12,2) NOT NULL,
    tax_tcs_tds_deducted NUMERIC(12,2) NOT NULL,
    net_payout_amount NUMERIC(14,2) NOT NULL,
    utr_number VARCHAR(100) UNIQUE,
    payout_status VARCHAR(50) DEFAULT 'PROCESSING' CHECK (payout_status IN ('INITIATED','PROCESSING','SETTLED','FAILED','HELD_FOR_REVIEW')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_store ON seller_payouts(store_id, payout_status);

-- =========================================================================
-- DOMAIN 8: RETURNS, REFUNDS & REVIEWS (Mrunal & Mayank)
-- =========================================================================

CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','ITEM_PICKED','COMPLETED','REJECTED')),
    refund_amount NUMERIC(10,2) NOT NULL,
    refund_percentage NUMERIC(5,2) DEFAULT 100.00,
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ret_seller ON returns(seller_order_id);
CREATE INDEX IF NOT EXISTS idx_ret_cust ON returns(customer_id);

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INT NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    item_condition VARCHAR(50) DEFAULT 'SEALED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ret_items ON return_items(return_id);

CREATE TABLE IF NOT EXISTS return_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    return_id UUID REFERENCES returns(id),
    amount NUMERIC(12,2) NOT NULL,
    refund_mode VARCHAR(30) NOT NULL CHECK (refund_mode IN ('ORIGINAL_PAYMENT','WALLET','CREDIT_OFFSET')),
    gateway_refund_id VARCHAR(150),
    status VARCHAR(30) DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','PROCESSED','FAILED')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    amount NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES seller_listings(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(150),
    comment TEXT,
    seller_reply TEXT,
    seller_replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rev_listing ON reviews(listing_id, rating);

CREATE TABLE IF NOT EXISTS review_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    responder_user_id UUID NOT NULL REFERENCES users(id),
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rev_replies ON review_replies(review_id);

CREATE TABLE IF NOT EXISTS review_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE','VIDEO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rev_media ON review_media(review_id);

-- =========================================================================
-- DOMAIN 9: POS, SUPPORT, MESSAGES, NOTIFICATIONS & AUDIT (All Portals)
-- =========================================================================

CREATE TABLE IF NOT EXISTS pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES users(id),
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    closing_balance NUMERIC(12,2),
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_poss_store ON pos_sessions(store_id);

CREATE TABLE IF NOT EXISTS pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    receipt_no VARCHAR(50) NOT NULL,
    buyer_type VARCHAR(20) DEFAULT 'WALK_IN_CUSTOMER',
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('CASH','UPI','CARD','CREDIT_14D')),
    total_amount NUMERIC(10,2) NOT NULL,
    points_earned INT DEFAULT 0,
    announced_audio BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_store ON pos_sales(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pos_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES seller_listings(id),
    item_name VARCHAR(200) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity NUMERIC(8,3) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_items ON pos_sale_items(pos_sale_id);

CREATE TABLE IF NOT EXISTS pos_counter_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cashier_user_id UUID NOT NULL REFERENCES users(id),
    opening_cash_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    closing_cash_balance NUMERIC(12,2),
    actual_cash_counted NUMERIC(12,2),
    cash_discrepancy NUMERIC(12,2) DEFAULT 0.00,
    total_upi_soundbox_sales NUMERIC(12,2) DEFAULT 0.00,
    total_card_sales NUMERIC(12,2) DEFAULT 0.00,
    shift_status VARCHAR(50) DEFAULT 'OPEN' CHECK (shift_status IN ('OPEN','CLOSED','AUDIT_FLAGGED')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pos_shifts ON pos_counter_shifts(store_id, cashier_user_id, shift_status);

CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES users(id),
    participant_b UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(200),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_part ON message_threads(participant_a, participant_b);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ORDER_STATUS','KYC_UPDATE','CREDIT_APPROVAL','PRICE_ALERT','GENERAL')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('IN_APP','SMS','EMAIL','WHATSAPP','PUSH')),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED','DELIVERED')),
    error_message TEXT,
    sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(100) UNIQUE NOT NULL,
    title_template VARCHAR(200) NOT NULL,
    body_template TEXT NOT NULL,
    sms_template TEXT,
    email_subject VARCHAR(200),
    email_html TEXT,
    whatsapp_template_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    user_role VARCHAR(30) NOT NULL,
    order_id UUID REFERENCES orders(id),
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(30) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')),
    assigned_admin_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ticket_user ON support_tickets(user_id, status);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_internal_admin_note BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supp_msgs ON support_messages(ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS support_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_al_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_al_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ps_key ON platform_settings(key);

CREATE TABLE IF NOT EXISTS account_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
    order_defect_rate NUMERIC(5,2) DEFAULT 0.00,
    cancellation_rate NUMERIC(5,2) DEFAULT 0.00,
    late_dispatch_rate NUMERIC(5,2) DEFAULT 0.00,
    policy_compliance_score NUMERIC(5,2) DEFAULT 100.00,
    status VARCHAR(30) DEFAULT 'GOOD' CHECK (status IN ('GOOD','AT_RISK','CRITICAL','SUSPENDED')),
    last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(30) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPEALED','RESOLVED','ENFORCED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- DOMAIN 10: ENTERPRISE SUPPORT, AI, TAX, INTEGRATION & SYNC (Extended)
-- =========================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    target_roles TEXT[] DEFAULT '{}',
    target_pincodes TEXT[] DEFAULT '{}',
    percentage_rollout INT DEFAULT 100 CHECK (percentage_rollout BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ff_key ON feature_flags(flag_key);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED','FAILED')),
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    request_path VARCHAR(255) NOT NULL,
    response_status_code INT NOT NULL,
    response_body JSONB NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_idemp_key ON idempotency_keys(key);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSED','FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_product_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('SELL_RECOMMENDED','BUY_RECOMMENDED','HIGH_DEMAND_INSIGHT','TRENDING_NEAR_YOU','DEAD_STOCK_CLEARANCE','CROSS_SELL')),
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.8500,
    reason_text TEXT NOT NULL,
    expected_demand_lift_pct NUMERIC(5,2),
    action_taken VARCHAR(50) DEFAULT 'PENDING' CHECK (action_taken IN ('PENDING','ADDED_TO_SHELF','ORDERED_B2B','DISMISSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rec_store_type ON ai_product_recommendations(store_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_cust ON ai_product_recommendations(customer_id, confidence_score DESC);

CREATE TABLE IF NOT EXISTS export_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    order_id UUID REFERENCES orders(id),
    export_reference_no VARCHAR(100) UNIQUE NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    port_of_loading VARCHAR(100) NOT NULL,
    port_of_discharge VARCHAR(100) NOT NULL,
    incoterms VARCHAR(20) NOT NULL CHECK (incoterms IN ('FOB','CIF','EXW','DDP','CFR')),
    hs_code VARCHAR(50) NOT NULL,
    fob_value_usd NUMERIC(12,2) NOT NULL,
    cif_value_usd NUMERIC(12,2) NOT NULL,
    shipping_bill_no VARCHAR(100),
    customs_clearance_status VARCHAR(50) DEFAULT 'DRAFT' CHECK (customs_clearance_status IN ('DRAFT','SUBMITTED','UNDER_INSPECTION','CUSTOMS_CLEARED','CONTAINER_LOADED','SAILED','REJECTED')),
    phytosanitary_cert_no VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_export_store ON export_declarations(store_id, customs_clearance_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_export_ref ON export_declarations(export_reference_no);

CREATE TABLE IF NOT EXISTS compliance_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL CHECK (certificate_type IN ('FSSAI_CENTRAL','FSSAI_STATE','ORGANIC_INDIA_NPOP','HALAL_CERTIFICATE','ISO_22000','AGMARK','IMPORT_EXPORT_CODE_IEC','APEDA_REGISTRATION')),
    certificate_name VARCHAR(200) NOT NULL,
    issuing_authority VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    document_url TEXT NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','EXPIRED','REJECTED')),
    verified_by_admin_id UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_store ON compliance_certificates(store_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_cert_expiry ON compliance_certificates(expiry_date);

CREATE TABLE IF NOT EXISTS partner_brand_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    authorized_tier VARCHAR(50) DEFAULT 'SILVER_DEALER',
    commission_rebate_pct NUMERIC(5,2) DEFAULT 3.50,
    minimum_monthly_stock_units INT DEFAULT 50,
    exclusive_territory_pincode VARCHAR(20),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','TERMINATED','RENEWAL_PENDING')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_pbc_store ON partner_brand_contracts(store_id, status);

CREATE TABLE IF NOT EXISTS freight_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_manifest_no VARCHAR(100) UNIQUE NOT NULL,
    origin_store_id UUID NOT NULL REFERENCES stores(id),
    destination_hub_id UUID REFERENCES delivery_zones(id),
    transporter_name VARCHAR(150) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    total_weight_kg NUMERIC(10,2) NOT NULL,
    freight_charges NUMERIC(12,2) NOT NULL,
    dispatch_status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (dispatch_status IN ('SCHEDULED','LOADING','IN_TRANSIT','CUSTOMS_INSPECTED','DELIVERED','DELAYED','CANCELLED')),
    dispatched_at TIMESTAMPTZ,
    expected_arrival_at TIMESTAMPTZ,
    actual_delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_freight_status ON freight_shipments(origin_store_id, dispatch_status);

CREATE TABLE IF NOT EXISTS delivery_fleet_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id),
    vehicle_type VARCHAR(50) NOT NULL,
    assigned_pincodes TEXT[] NOT NULL,
    total_assigned_stops INT DEFAULT 0,
    completed_stops INT DEFAULT 0,
    active_latitude NUMERIC(10,8),
    active_longitude NUMERIC(11,8),
    last_location_ping TIMESTAMPTZ,
    route_status VARCHAR(50) DEFAULT 'IDLE' CHECK (route_status IN ('IDLE','EN_ROUTE_PICKUP','OUT_FOR_DELIVERY','SHIFT_COMPLETED')),
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fleet_driver ON delivery_fleet_routes(driver_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_fleet_coords ON delivery_fleet_routes(active_latitude, active_longitude);

CREATE TABLE IF NOT EXISTS store_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_orders INT DEFAULT 0,
    fulfilled_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    avg_fulfillment_time_minutes NUMERIC(8,2) DEFAULT 0.00,
    sla_adherence_pct NUMERIC(5,2) DEFAULT 100.00,
    customer_rating_avg NUMERIC(3,2) DEFAULT 5.00,
    on_time_delivery_pct NUMERIC(5,2) DEFAULT 100.00,
    total_gross_revenue NUMERIC(14,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_perf_store_date ON store_performance_metrics(store_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS catalog_stories_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE','VIDEO')),
    caption VARCHAR(250),
    linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    view_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 HOURS'
);
CREATE INDEX IF NOT EXISTS idx_stories_active ON catalog_stories_feed(is_active, expires_at);

CREATE TABLE IF NOT EXISTS external_channel_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    channel_name VARCHAR(50) NOT NULL CHECK (channel_name IN ('AMAZON','FLIPKART','MYNTRA','BLINKIT','ZEPTO')),
    channel_seller_id VARCHAR(100) NOT NULL,
    auth_credentials JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_channel_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_account_id UUID NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
    external_listing_id VARCHAR(100) NOT NULL,
    sync_status VARCHAR(30) DEFAULT 'SYNCED',
    last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_channel_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_account_id UUID NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE,
    seller_order_id UUID REFERENCES seller_orders(id),
    external_order_id VARCHAR(100) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_channel_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_account_id UUID NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(100) UNIQUE NOT NULL,
    credentials_encrypted JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(100) NOT NULL,
    event VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_sync_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(100) NOT NULL,
    checkpoint_key VARCHAR(100) NOT NULL,
    last_synced_value TEXT NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(integration_name, checkpoint_key)
);

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID REFERENCES users(id),
    file_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_sac_code VARCHAR(50) NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    cgst_pct NUMERIC(5,2) DEFAULT 0.00,
    sgst_pct NUMERIC(5,2) DEFAULT 0.00,
    igst_pct NUMERIC(5,2) DEFAULT 0.00,
    effective_from DATE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    doc_type VARCHAR(50) NOT NULL,
    doc_number VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    risk_score NUMERIC(5,2) NOT NULL,
    flag_reason VARCHAR(255) NOT NULL,
    action_taken VARCHAR(50) DEFAULT 'FLAGGED',
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    report_type VARCHAR(100) NOT NULL,
    filter_params JSONB,
    file_format VARCHAR(10) DEFAULT 'CSV',
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    download_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    cron_expression VARCHAR(50) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    recipients TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    user_id UUID,
    prompt TEXT,
    tool_name TEXT NOT NULL,
    tool_tier TEXT DEFAULT 'TIER_1_READ',
    arguments JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_store_id ON ai_audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai_audit_logs(created_at);


-- =========================================================================
-- DOMAIN 11: B2B COMMERCE & MANUFACTURER PLATFORM (Standalone & Hybrid B2B)
-- =========================================================================

-- 1. B2B User Types & Roles
CREATE TABLE IF NOT EXISTS manage_b_to_b_user_type (
    id SERIAL PRIMARY KEY,
    typename VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Geographic Coverage: State & City
CREATE TABLE IF NOT EXISTS state (
    id SERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS city (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES state(id),
    city_name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. B2B Campaigns & Marketing
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    target_role VARCHAR(50),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
    id SERIAL PRIMARY KEY,
    campaign_notification_id INTEGER,
    user_id INTEGER,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'delivered'
);

-- 4. B2B User Profiles & Discovery
CREATE TABLE IF NOT EXISTS manage_b_to_b_userdetail (
    id SERIAL PRIMARY KEY,
    business_type_id INTEGER REFERENCES manage_b_to_b_user_type(id),
    company_name VARCHAR(255),
    owner_name VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20),
    password VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    kyc_status VARCHAR(50) DEFAULT 'PENDING',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    fk_state INTEGER REFERENCES state(id),
    fk_city INTEGER REFERENCES city(id),
    serviceable_pincodes VARCHAR(10)[],
    is_featured BOOLEAN DEFAULT false,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    product_category VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20),
    personal_contact VARCHAR(20),
    personal_email VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_no VARCHAR(100),
    ifsc_code VARCHAR(50),
    refresh_token VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopdetail (
    id SERIAL PRIMARY KEY,
    shop_name VARCHAR(255),
    owner_name VARCHAR(255),
    first_name VARCHAR(255),
    email_id VARCHAR(255),
    mobile_number VARCHAR(20),
    password VARCHAR(255),
    gst_id VARCHAR(50),
    fk_city INTEGER,
    fk_state INTEGER,
    fk_country INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_at TIMESTAMP
);

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

-- 5. B2B Taxonomy & Manufacturer Products
CREATE TABLE IF NOT EXISTS manage_b_to_b_categories (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES manage_b_to_b_categories(id) ON DELETE CASCADE,
    subcategory_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);


CREATE TABLE IF NOT EXISTS distributor_products (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER,
    product_name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    CONSTRAINT unique_distributor_product UNIQUE (distributor_id, product_id)
);

CREATE TABLE IF NOT EXISTS manage_manufacturer_products (
    id SERIAL PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL,
    category_id INTEGER,
    subcategory_id INTEGER,
    category VARCHAR(255),
    sub_category VARCHAR(255),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'pcs',
    price NUMERIC(12,2) DEFAULT 0,
    mrp NUMERIC(12,2) DEFAULT 0,
    manufacturer_price NUMERIC(12,2),
    distributor_price NUMERIC(12,2),
    retail_price NUMERIC(12,2),
    moq INTEGER DEFAULT 1,
    total_stock INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    north_hub INTEGER DEFAULT 0,
    south_hub INTEGER DEFAULT 0,
    central_hub INTEGER DEFAULT 0,
    image_url TEXT,
    image TEXT,
    product_image TEXT,
    tier_pricing JSONB,
    status VARCHAR(50) DEFAULT 'active',
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 6. B2B Cart, Orders & Procurement
CREATE TABLE IF NOT EXISTS manage_b_to_b_cart (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER NOT NULL,
    product_id INTEGER REFERENCES manage_manufacturer_products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    distributor_id INTEGER NOT NULL,
    manufacturer_id INTEGER NOT NULL,
    shop_id INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    delivery_charge NUMERIC(10,2) DEFAULT 0.00,
    final_amount NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    delivery_mode VARCHAR(50) DEFAULT 'Standard Ground Shipping',
    payment_mode VARCHAR(50) DEFAULT 'CASH',
    tracking_number VARCHAR(100),
    shipping_address TEXT,
    active BOOLEAN DEFAULT true,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES manage_b_to_b_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES manage_manufacturer_products(id),
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES manage_b_to_b_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b2b_purchase_order (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100),
    distributor_id INTEGER,
    manufacturer_id INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    item_count INTEGER DEFAULT 1,
    notes TEXT,
    delivery_date DATE,
    fk_supplier_detail INTEGER,
    fk_shop_detail INTEGER,
    tax NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    due_amount NUMERIC(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    po_number VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS manage_b2b_purchase_order_detail (
    id SERIAL PRIMARY KEY,
    fk_purchase_order INTEGER REFERENCES manage_b2b_purchase_order(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_name VARCHAR(255),
    quantity INTEGER,
    price NUMERIC(12,2),
    tax NUMERIC(12,2),
    grand_total NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fk_product INTEGER,
    unit_price NUMERIC(12,2)
);

-- 7. B2B Access & Connection RFQs
CREATE TABLE IF NOT EXISTS manage_b_to_b_request_access (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER,
    manufacturer_id INTEGER,
    name VARCHAR(255),
    email_distributer VARCHAR(255),
    email_manufacturer VARCHAR(255),
    description TEXT,
    unique_request_id VARCHAR(100),
    distributer_request INTEGER DEFAULT 1,
    manufacture_request INTEGER DEFAULT 1,
    request_type VARCHAR(50) DEFAULT 'CONNECTION',
    status VARCHAR(50) DEFAULT 'PENDING',
    proposed_price NUMERIC(12,2),
    counter_price NUMERIC(12,2),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 8. Settlements, Invoices & Financials
CREATE TABLE IF NOT EXISTS manage_b_to_b_settlements (
    id SERIAL PRIMARY KEY,
    settlement_number VARCHAR(100) UNIQUE,
    manufacturer_id INTEGER,
    shop_id INTEGER,
    total_invoice_amount NUMERIC(12,2) DEFAULT 0,
    total_collected NUMERIC(12,2) DEFAULT 0,
    commission NUMERIC(12,2) DEFAULT 0,
    pg_charges NUMERIC(12,2) DEFAULT 0,
    returns_amount NUMERIC(12,2) DEFAULT 0,
    tds NUMERIC(12,2) DEFAULT 0,
    net_payable NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    modified_at TIMESTAMP,
    modified_by INTEGER,
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE,
    order_id INTEGER REFERENCES manage_b_to_b_orders(id),
    distributor_id INTEGER,
    manufacturer_id INTEGER,
    shop_id INTEGER,
    settlement_id INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    gst_percentage NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'issued',
    due_date DATE,
    invoice_pdf_url TEXT,
    items_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    modified_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_payments (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER,
    shop_id INTEGER,
    manufacturer_id INTEGER,
    invoice_id INTEGER REFERENCES manage_b_to_b_invoices(id),
    amount NUMERIC(12,2) DEFAULT 0,
    mode VARCHAR(50),
    reference_id VARCHAR(120),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_payment_allocations (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES manage_b_to_b_payments(id),
    invoice_id INTEGER REFERENCES manage_b_to_b_invoices(id),
    allocated_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_credit_notes (
    id SERIAL PRIMARY KEY,
    credit_note_number VARCHAR(100) UNIQUE,
    invoice_id INTEGER REFERENCES manage_b_to_b_invoices(id),
    manufacturer_id INTEGER,
    distributor_id INTEGER,
    shop_id INTEGER,
    amount NUMERIC(12,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_ledger_entries (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER,
    shop_id INTEGER,
    type VARCHAR(50),
    reference_id INTEGER,
    description TEXT,
    debit NUMERIC(12,2) DEFAULT 0,
    credit NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relationship_credits (
    id SERIAL PRIMARY KEY,
    creditor_id INTEGER NOT NULL,
    debtor_id INTEGER NOT NULL,
    debtor_type VARCHAR(50) NOT NULL,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 30,
    outstanding_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP,
    UNIQUE(creditor_id, debtor_id, debtor_type)
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_payouts (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER REFERENCES manage_b_to_b_settlements(id),
    amount NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    transaction_ref VARCHAR(120),
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- 9. Razorpay Payment Gateway Integration
CREATE TABLE IF NOT EXISTS razorpay_checkouts (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER NOT NULL,
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    amount_paise BIGINT NOT NULL,
    amount_rupees NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','CREATED','PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','PROVIDER_ERROR','REFUNDED')),
    payment_method VARCHAR(50),
    signature_verified BOOLEAN DEFAULT FALSE,
    webhook_verified BOOLEAN DEFAULT FALSE,
    verification_source VARCHAR(20),
    verified_at TIMESTAMP,
    failure_reason TEXT,
    error_code VARCHAR(100),
    error_description TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    captured_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rzp_co_distributor ON razorpay_checkouts(distributor_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_order ON razorpay_checkouts(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_payment ON razorpay_checkouts(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_status ON razorpay_checkouts(status);

CREATE TABLE IF NOT EXISTS razorpay_checkout_orders (
    id SERIAL PRIMARY KEY,
    checkout_id INTEGER NOT NULL REFERENCES razorpay_checkouts(id),
    order_id INTEGER NOT NULL REFERENCES manage_b_to_b_orders(id),
    manufacturer_id INTEGER NOT NULL,
    order_amount_paise BIGINT NOT NULL,
    order_amount_rupees NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(checkout_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_rzp_co_orders_checkout ON razorpay_checkout_orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_orders_order ON razorpay_checkout_orders(order_id);

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    processing_status VARCHAR(30) DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED','PROCESSING','PROCESSED','SKIPPED','FAILED')),
    skip_reason VARCHAR(200),
    processing_error TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    source_ip VARCHAR(45),
    payload_summary JSONB
);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_event_id ON razorpay_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_order_id ON razorpay_webhook_events(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_status ON razorpay_webhook_events(processing_status);

-- 10. Logistics & Fleet Management
CREATE TABLE IF NOT EXISTS manage_b_to_b_logistics_providers (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    provider_name VARCHAR(255),
    contact_person VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(100),
    active_status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_drivers (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    logistics_provider_id INTEGER REFERENCES manage_b_to_b_logistics_providers(id),
    driver_name VARCHAR(255),
    mobile VARCHAR(20),
    license_number VARCHAR(100),
    license_expiry_date DATE,
    aadhaar_number VARCHAR(100),
    emergency_contact VARCHAR(20),
    is_available BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_vehicles (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    logistics_provider_id INTEGER REFERENCES manage_b_to_b_logistics_providers(id),
    driver_id INTEGER REFERENCES manage_b_to_b_drivers(id),
    vehicle_number VARCHAR(100),
    vehicle_type VARCHAR(100),
    capacity VARCHAR(100),
    insurance_expiry_date DATE,
    permit_expiry_date DATE,
    is_available BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_vehicle_routes (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    vehicle_id INTEGER REFERENCES manage_b_to_b_vehicles(id),
    driver_id INTEGER REFERENCES manage_b_to_b_drivers(id),
    order_id INTEGER REFERENCES manage_b_to_b_orders(id),
    route_name VARCHAR(255),
    source_location VARCHAR(255),
    destination_location VARCHAR(255),
    waypoints JSONB,
    estimated_distance_km NUMERIC(8,2),
    estimated_time_hours NUMERIC(6,2),
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. B2B Support & Auditing
CREATE TABLE IF NOT EXISTS manage_b_to_b_support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_contact_submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_role VARCHAR(50),
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id INTEGER,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    ip_address VARCHAR(50),
    details JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_role VARCHAR(50),
    action VARCHAR(100),
    endpoint VARCHAR(255),
    ip_address VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- MIGRATION HISTORY TABLE
-- =========================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('v1.0.0_enterprise_marketplace_all_portals')
ON CONFLICT (version) DO NOTHING;



-- =========================================================================
-- BASELINE SEED DATA (Essential bootstrap records for all portals)
-- =========================================================================

-- 1. Core Roles
INSERT INTO roles (slug, name, description) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full platform access across all portals'),
('ADMIN', 'Platform Administrator', 'Catalog, seller approval, and operations access'),
('SELLER', 'Store Merchant', 'Seller portal access for inventory, orders, and pricing'),
('CUSTOMER', 'Consumer Buyer', 'End-customer web & mobile application access'),
('DISTRIBUTOR', 'B2B Distributor', 'B2B Wholesale portal buyer access'),
('MANUFACTURER', 'B2B Manufacturer', 'B2B Factory supplier access'),
('DRIVER', 'Delivery Agent', 'Logistics and delivery application access')
ON CONFLICT (slug) DO NOTHING;

-- 2. Root Categories (Level 1)
INSERT INTO categories (id, slug, name, level, materialized_path, is_leaf, display_order) VALUES
(1, 'fresh-produce', 'Fresh Produce', 1, '1', false, 1),
(2, 'dairy-eggs', 'Dairy & Eggs', 1, '2', false, 2),
(3, 'pantry-staples', 'Pantry Staples', 1, '3', false, 3),
(4, 'snacks-packaged', 'Snacks & Packaged', 1, '4', false, 4),
(5, 'beverages-drinks', 'Beverages & Drinks', 1, '5', false, 5),
(6, 'personal-care', 'Personal Care', 1, '6', false, 6),
(7, 'cleaning-household', 'Cleaning & Household', 1, '7', false, 7),
(8, 'fashion-apparel', 'Fashion & Apparel', 1, '8', false, 8),
(9, 'bakery', 'Bakery', 1, '9', false, 9),
(10, 'spices-edible-oils', 'Spices & Edible Oils', 1, '10', false, 10)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  slug = EXCLUDED.slug, 
  level = EXCLUDED.level, 
  materialized_path = EXCLUDED.materialized_path,
  is_leaf = EXCLUDED.is_leaf;

-- Adjust sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Subcategories (Level 2 & Level 3)
INSERT INTO categories (id, slug, name, parent_id, level, materialized_path, is_leaf, display_order) VALUES
(11, 'mens-clothing', 'Men''s Clothing', 8, 2, '8.11', false, 1),
(12, 'mens-kurtas-ethnic', 'Kurtas & Ethnic Sets', 11, 3, '8.11.12', true, 1),
(13, 'mens-shirts-polos', 'Shirts & Polos', 11, 3, '8.11.13', true, 2),
(14, 'womens-clothing', 'Women''s Clothing', 8, 2, '8.14', false, 2),
(15, 'womens-sarees-kurtis', 'Sarees & Kurtis', 14, 3, '8.14.15', true, 1),
(16, 'fresh-vegetables', 'Fresh Vegetables', 1, 2, '1.16', true, 1),
(17, 'fresh-fruits', 'Fresh Fruits', 1, 2, '1.17', true, 2),
(18, 'atta-flours-sooji', 'Atta, Flours & Sooji', 3, 2, '3.18', true, 1),
(19, 'rice-rice-products', 'Rice & Rice Products', 3, 2, '3.19', true, 2),
(20, 'dals-pulses', 'Dals & Pulses', 3, 2, '3.20', true, 3),
(21, 'biscuits-cookies', 'Biscuits & Cookies', 4, 2, '4.21', true, 1),
(22, 'noodles-pasta', 'Noodles & Pasta', 4, 2, '4.22', true, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  materialized_path = EXCLUDED.materialized_path,
  is_leaf = EXCLUDED.is_leaf;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 3. Dynamic Attribute Definitions
INSERT INTO attribute_definitions (code, label, description, data_type, ui_type, allowed_values, unit_options, validation_regex) VALUES
('size', 'Size', 'Apparel or footwear sizing', 'ENUM', 'select', '["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"]'::jsonb, '[]'::jsonb, null),
('color', 'Color', 'Primary color / shade', 'ENUM', 'select', '["Black", "White", "Navy Blue", "Maroon", "Red", "Green", "Yellow", "Grey", "Beige", "Blue", "Pink", "Multicolor"]'::jsonb, '[]'::jsonb, null),
('fabric_material', 'Fabric / Material', 'Primary textile composition', 'ENUM', 'select', '["100% Cotton", "Pure Silk", "Linen", "Chiffon", "Georgette", "Polyester Blend", "Rayon", "Khadi", "Denim"]'::jsonb, '[]'::jsonb, null),
('fit_type', 'Fit Profile', 'Fit profile of garment', 'ENUM', 'select', '["Slim Fit", "Regular Fit", "Relaxed Fit", "Loose Fit", "Oversized"]'::jsonb, '[]'::jsonb, null),
('sleeve_length', 'Sleeve Length', 'Garment sleeve cut', 'ENUM', 'select', '["Full Sleeve", "Half Sleeve", "Sleeveless", "3/4th Sleeve", "Short Sleeve"]'::jsonb, '[]'::jsonb, null),
('pattern', 'Pattern / Print', 'Weave or visual pattern', 'ENUM', 'select', '["Solid / Plain", "Striped", "Printed", "Checked", "Embroidered", "Floral", "Self Design"]'::jsonb, '[]'::jsonb, null),
('dietary_type', 'Dietary Preference', 'Food classification (Veg / Non-Veg)', 'ENUM', 'radio', '["Veg", "Non-Veg", "Vegan", "Egg"]'::jsonb, '[]'::jsonb, null),
('fssai_license_number', 'FSSAI License Number', '14-digit food safety registration', 'TEXT', 'text', '[]'::jsonb, '[]'::jsonb, '^[0-9]{14}$'),
('shelf_life_days', 'Shelf Life', 'Product shelf duration', 'NUMBER', 'number', '[]'::jsonb, '["days", "months", "years"]'::jsonb, null),
('country_of_origin', 'Country of Origin', 'Country of manufacturing', 'ENUM', 'select', '["India", "Bangladesh", "Vietnam", "Sri Lanka", "Other"]'::jsonb, '[]'::jsonb, null),
('storage_instructions', 'Storage Instructions', 'Preservation instructions', 'TEXT', 'text', '["Store in a cool dry place", "Keep refrigerated", "Do not freeze", "Store away from direct sunlight"]'::jsonb, '[]'::jsonb, null),
('organic_certified', 'Organic Certified', 'Official organic certification', 'BOOLEAN', 'checkbox', '[]'::jsonb, '[]'::jsonb, null)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  allowed_values = EXCLUDED.allowed_values,
  ui_type = EXCLUDED.ui_type,
  validation_regex = EXCLUDED.validation_regex;

-- 4. Map Attributes to Fashion Categories (Kurtas & Shirts)
INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 12, id, true, false, true, 1, 'Key Specifications' FROM attribute_definitions WHERE code = 'fabric_material'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 12, id, false, false, true, 2, 'Key Specifications' FROM attribute_definitions WHERE code = 'fit_type'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 12, id, false, false, true, 3, 'Key Specifications' FROM attribute_definitions WHERE code = 'pattern'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 12, id, false, false, false, 4, 'General Specs' FROM attribute_definitions WHERE code = 'country_of_origin'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

-- Map Attributes to Food & FMCG (Dairy, Grocery)
INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 2, id, true, false, true, 1, 'Compliance & Diet' FROM attribute_definitions WHERE code = 'dietary_type'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 2, id, true, false, false, 2, 'Compliance & Diet' FROM attribute_definitions WHERE code = 'fssai_license_number'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 2, id, false, false, false, 3, 'Key Specifications' FROM attribute_definitions WHERE code = 'shelf_life_days'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
SELECT 2, id, false, false, false, 4, 'Usage & Storage' FROM attribute_definitions WHERE code = 'storage_instructions'
ON CONFLICT (category_id, attribute_id) DO NOTHING;

-- 5. Default Bank Partners for 0% BNPL / Credit Lines
INSERT INTO bank_partners (name, code, interest_rate_pct, max_credit_limit, tenure_options, is_active) VALUES
('HDFC Bank', 'HDFC', 0.00, 500000.00, '{7, 14, 21, 30, 60}', true),
('ICICI Bank', 'ICICI', 0.00, 500000.00, '{7, 14, 21, 30, 60}', true),
('State Bank of India', 'SBI', 0.00, 300000.00, '{7, 14, 30}', true)
ON CONFLICT (code) DO NOTHING;

-- 6. National Master Catalog Items (Verified Packaged Goods for instant auto-fill)
INSERT INTO master_catalog_items (id, barcode, product_name, brand_name, category_id, printed_mrp, standard_unit, default_image_url) VALUES
('a0000001-0000-0000-0000-000000000001', '8901030381018', 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', 'Aashirvaad', 18, 485.00, 'pack', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
('a0000001-0000-0000-0000-000000000002', '8901262010057', 'Amul Pasteurised Butter 500g', 'Amul', 2, 275.00, 'pack', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400'),
('a0000001-0000-0000-0000-000000000003', '8901262020018', 'Amul Pure Ghee 1L Tin', 'Amul', 2, 610.00, 'bottle', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400'),
('a0000001-0000-0000-0000-000000000004', '8901063012224', 'Fortune Sunlite Refined Sunflower Oil 1L Pouch', 'Fortune', 10, 160.00, 'pouch', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400'),
('a0000001-0000-0000-0000-000000000005', '8901058852331', 'Tata Salt Vacuum Evaporated 1kg', 'Tata Salt', 10, 28.00, 'pack', 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400')
ON CONFLICT (barcode) DO NOTHING;

-- 7. Sample B2B Manufacturer Products
INSERT INTO manage_manufacturer_products (id, manufacturer_id, category_id, category, product_name, sku, unit, price, mrp, stock_quantity, active) VALUES
(1, 101, 2, 'Dairy & Eggs', 'Amul Butter Pasteurised 500g', 'AMUL-BTR-500', 'pack', 245.00, 275.00, 500, true),
(2, 102, 10, 'Spices & Edible Oils', 'Fortune Sunlite Refined Sunflower Oil 1L', 'FRTN-OIL-1L', 'pouch', 142.00, 160.00, 1000, true),
(3, 103, 10, 'Spices & Edible Oils', 'Tata Salt Vacuum Evaporated 1kg', 'TATA-SLT-1KG', 'pack', 22.00, 28.00, 2000, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('manage_manufacturer_products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM manage_manufacturer_products));

COMMIT;
