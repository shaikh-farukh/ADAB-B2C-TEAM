-- ===================================================
-- ADAB B2B Standalone Project Database Migration
-- Contains ONLY B2B necessary tables
-- ===================================================

-- 1. B2B User Types & Roles
CREATE TABLE IF NOT EXISTS manage_b_to_b_user_type (
  id SERIAL PRIMARY KEY,
  typename VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. B2B User Details (Manufacturers, Distributors, Admins)
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
  refresh_token VARCHAR(255),
  bank_account_no VARCHAR(100),
  ifsc_code VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopdetail (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255),
  email_id VARCHAR(255),
  owner_name VARCHAR(255),
  mobile_number VARCHAR(20),
  active BOOLEAN DEFAULT true,
  delete_at TIMESTAMP
);

-- 3. B2B Categories & Subcategories
CREATE TABLE IF NOT EXISTS manage_b_to_b_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manage_b_to_b_subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES manage_b_to_b_categories(id) ON DELETE CASCADE,
  subcategory_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Manufacturer Products & Multi-Warehouse Stock
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
  moq INTEGER DEFAULT 1,
  total_stock INTEGER DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  north_hub INTEGER DEFAULT 0,
  south_hub INTEGER DEFAULT 0,
  central_hub INTEGER DEFAULT 0,
  image_url TEXT,
  image TEXT,
  product_image TEXT,
  status VARCHAR(50) DEFAULT 'active',
  active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 5. B2B Cart
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

-- 6. B2B Orders & Items
CREATE TABLE IF NOT EXISTS manage_b_to_b_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  distributor_id INTEGER NOT NULL,
  manufacturer_id INTEGER NOT NULL,
  shop_id INTEGER,
  total_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
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

-- 7. B2B Access / RFQ Connection Requests
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

-- 8. Sequences for Settlement & Invoices
CREATE SEQUENCE IF NOT EXISTS settlement_number_seq START 1001;

-- 9. Settlements & Invoices
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

-- 10. Payments & Credit Notes
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

-- 11. Ledger Entries & Relationship Credit Limits
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

-- 12. Payouts & Logistics
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
  updated_at TIMESTAMP
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

-- 13. Support & Audit Trail
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

CREATE TABLE IF NOT EXISTS campaign_notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  message TEXT,
  target_role VARCHAR(50),
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
