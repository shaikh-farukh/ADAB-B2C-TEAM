-- =========================================================================
-- MIGRATION: 004_sync_b2b_manufacturer_flow.sql
-- PURPOSE: Synchronize B2B Manufacturer & B2B Ecosystem Tables with Live Database
-- FLOW: Manufacturer -> Seller -> Customer / Admin
-- COMPLIANCE: Safe idempotent DDL with UP and DOWN definitions
-- =========================================================================

-- =========================================================================
-- SECTION 1: UP MIGRATION
-- =========================================================================

-- 1. Reference Geography Tables (States & Cities)
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

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. B2B User Types & Roles
CREATE TABLE IF NOT EXISTS manage_b_to_b_user_type (
  id SERIAL PRIMARY KEY,
  typename VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. B2B User Details (Manufacturers, Distributors, Admins)
CREATE TABLE IF NOT EXISTS manage_b_to_b_userdetail (
  id SERIAL PRIMARY KEY,
  business_type_id INTEGER REFERENCES manage_b_to_b_user_type(id),
  company_name VARCHAR(255),
  owner_name VARCHAR(255),
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
  age INTEGER,
  gender VARCHAR(20),
  personal_contact VARCHAR(20),
  personal_email VARCHAR(255),
  bank_name VARCHAR(255),
  refresh_token TEXT,
  bank_account_no VARCHAR(100),
  ifsc_code VARCHAR(50),
  company_logo VARCHAR(500),
  product_category VARCHAR(255),
  contact_person VARCHAR(255),
  international_business BOOLEAN DEFAULT false,
  wish_to_export_countries TEXT,
  vat_number VARCHAR(100),
  export_hs_code VARCHAR(100),
  preferred_currency VARCHAR(10) DEFAULT 'INR',
  market_scope VARCHAR(50) DEFAULT 'domestic',
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  fk_state INTEGER,
  fk_city INTEGER,
  serviceable_pincodes VARCHAR(10)[],
  is_featured BOOLEAN DEFAULT false,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 5. B2B Shop Detail
CREATE TABLE IF NOT EXISTS shopdetail (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255),
  email_id VARCHAR(255),
  owner_name VARCHAR(255),
  first_name VARCHAR(255),
  mobile_number VARCHAR(20),
  mobile_no VARCHAR(20),
  gst_id VARCHAR(50),
  shop_address TEXT,
  address TEXT,
  pincode VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100),
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  fk_city INTEGER,
  fk_state INTEGER,
  fk_country INTEGER,
  password VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delete_at TIMESTAMP
);

-- 6. B2B Categories & Subcategories
CREATE TABLE IF NOT EXISTS manage_b_to_b_categories (
  id SERIAL PRIMARY KEY,
  manufacturer_id INTEGER,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by INTEGER
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES manage_b_to_b_categories(id) ON DELETE CASCADE,
  subcategory_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by INTEGER
);

-- 7. Manufacturer Products (CORE OF FLOW: Manufacturer -> Seller Master Catalog)
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
  warehouse_stock JSONB DEFAULT '{}'::jsonb,
  international_selling BOOLEAN DEFAULT false,
  international_price NUMERIC(12,2),
  export_hs_code VARCHAR(100),
  hsn_code VARCHAR(100),
  gst_rate NUMERIC(5,2),
  tier_pricing JSONB,
  image_url TEXT,
  image TEXT,
  product_image TEXT,
  status VARCHAR(50) DEFAULT 'active',
  active BOOLEAN DEFAULT true,
  created_by INTEGER,
  modified_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mmp_manufacturer_id ON manage_manufacturer_products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_mmp_status ON manage_manufacturer_products(status, active);
CREATE INDEX IF NOT EXISTS idx_mmp_sku ON manage_manufacturer_products(sku);

-- 8. Distributor Products (Adopted products by Distributors / Sellers)
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
  product_id INTEGER REFERENCES manage_manufacturer_products(id) ON DELETE SET NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  CONSTRAINT unique_distributor_product UNIQUE (distributor_id, product_id)
);

-- 9. B2B Cart
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

-- 10. B2B Orders & Items
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

-- 11. B2B Purchase Orders (Shop-level POs)
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

-- 12. RFQ / Access Requests
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
  distributor_tier VARCHAR(50) DEFAULT 'Bronze',
  product_id INTEGER,
  product_name VARCHAR(255),
  quantity INTEGER,
  target_price NUMERIC(12,2),
  deadline TIMESTAMP,
  negotiation_history JSONB DEFAULT '[]'::jsonb,
  proposed_price NUMERIC(12,2),
  counter_price NUMERIC(12,2),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 13. Settlements & Invoices
CREATE SEQUENCE IF NOT EXISTS settlement_number_seq START 1001;

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

-- 14. Logistics & Drivers
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
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

-- 15. Support & Audit Trail
CREATE TABLE IF NOT EXISTS manage_b_to_b_support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  subject VARCHAR(255),
  description TEXT,
  attachment TEXT,
  status VARCHAR(50) DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_contact_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_role VARCHAR(50),
  entity_type VARCHAR(100),
  entity_id INTEGER,
  action VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(50),
  metadata JSONB,
  resource VARCHAR(100),
  resource_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 16. Razorpay Checkouts Table
CREATE TABLE IF NOT EXISTS razorpay_checkouts (
  id SERIAL PRIMARY KEY,
  distributor_id INTEGER NOT NULL,
  razorpay_order_id VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100),
  amount_paise BIGINT NOT NULL,
  amount_rupees NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) DEFAULT 'INITIATED',
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

-- 17. Seed Default User Types if missing
INSERT INTO manage_b_to_b_user_type (id, typename, description, active)
VALUES 
  (1, 'MANUFACTURER', 'Product manufacturer with multi-warehouse catalog', true),
  (2, 'DISTRIBUTOR', 'Distributor ordering stock in bulk from manufacturers', true),
  (3, 'ADMIN', 'Super administrator supervising all B2B operations', true)
ON CONFLICT (typename) DO NOTHING;

-- 18. Cross-Portal Link: Connect seller_listings with manufacturer product origin
ALTER TABLE seller_listings 
  ADD COLUMN IF NOT EXISTS manufacturer_product_id INTEGER REFERENCES manage_manufacturer_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sl_manufacturer_product_id ON seller_listings(manufacturer_product_id);

-- =========================================================================
-- SECTION 2: DOWN MIGRATION (ROLLBACK IN REVERSE ORDER)
-- =========================================================================
/*
ALTER TABLE seller_listings DROP COLUMN IF EXISTS manufacturer_product_id;
DROP TABLE IF EXISTS razorpay_checkouts CASCADE;
DROP TABLE IF EXISTS campaign_deliveries CASCADE;
DROP TABLE IF EXISTS campaign_notifications CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_audit_logs CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_contact_submissions CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_support_tickets CASCADE;
DROP TABLE IF EXISTS territory_assignments CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_vehicles CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_drivers CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_logistics_providers CASCADE;
DROP TABLE IF EXISTS relationship_credits CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_ledger_entries CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_credit_notes CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_payments CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_invoices CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_settlements CASCADE;
DROP SEQUENCE IF EXISTS settlement_number_seq CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_request_access CASCADE;
DROP TABLE IF EXISTS manage_b2b_purchase_order_detail CASCADE;
DROP TABLE IF EXISTS manage_b2b_purchase_order CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_order_status_history CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_order_items CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_orders CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_cart CASCADE;
DROP TABLE IF EXISTS distributor_products CASCADE;
DROP TABLE IF EXISTS manage_manufacturer_products CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_subcategories CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_categories CASCADE;
DROP TABLE IF EXISTS shopdetail CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_userdetail CASCADE;
DROP TABLE IF EXISTS manage_b_to_b_user_type CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS city CASCADE;
DROP TABLE IF EXISTS state CASCADE;
*/
