const fs = require('fs');
const path = require('path');
const pool = require('../db');

// Domain and App mapping for all 142 tables
const APP_MAPPINGS = {
  // Domain 1: Identity & Auth (Shared / Admin / All)
  users: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'Core user identity across Seller, Customer, B2B Wholesaler, and Admin accounts' },
  roles: { app: 'Admin Portal', domain: 'Identity & Access', desc: 'RBAC user roles (Admin, Merchant, Buyer, Wholesaler)' },
  permissions: { app: 'Admin Portal', domain: 'Identity & Access', desc: 'Granular system privileges and permissions' },
  user_roles: { app: 'Admin Portal', domain: 'Identity & Access', desc: 'M:N mapping between users and system roles' },
  sessions: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'Active authentication sessions and tokens' },
  oauth_accounts: { app: 'Customer / Seller', domain: 'Identity & Access', desc: 'Social login links (Google OAuth, Apple ID)' },
  auth_challenges: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'OTP challenges, SMS/Email verification nonces' },
  trusted_devices: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'Device fingerprinting for fraud prevention' },
  passkeys: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'WebAuthn biometric passkey credentials' },
  login_attempts: { app: 'Admin Portal', domain: 'Security & Audit', desc: 'Security logging for brute-force rate-limiting' },
  consents: { app: 'Shared / All Portals', domain: 'Identity & Access', desc: 'DPDP Act user privacy and data consent audit log' },
  api_keys: { app: 'Admin / B2B Portal', domain: 'Identity & Access', desc: 'M2M API keys for ERP and B2B distributor integrations' },
  oauth_clients: { app: 'Admin Portal', domain: 'Identity & Access', desc: 'Registered OAuth client applications' },

  // Domain 2: Profiles & Stores (Seller / Customer / Admin)
  customer_profiles: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Shopper preferences, demographics, and VIP tiers' },
  addresses: { app: 'Shared / All Portals', domain: 'Geocoding & Logistics', desc: 'Physical geolocation address book' },
  customer_addresses: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Saved delivery addresses for shoppers' },
  seller_profiles: { app: 'Seller Portal', domain: 'Merchant Operations', desc: 'Legal business entity, PAN, GSTIN, and KYC status' },
  seller_onboarding_steps: { app: 'Seller Portal', domain: 'Merchant Operations', desc: '7-step dynamic onboarding state, starter products, and delivery configs' },
  seller_documents: { app: 'Seller / Admin', domain: 'Compliance & KYC', desc: 'Uploaded verification documents (FSSAI, GST, Cheque)' },
  stores: { app: 'Seller Portal', domain: 'Merchant Operations', desc: 'Physical/cloud grocery store profile, operational hours, radius, soundbox' },
  seller_bank_accounts: { app: 'Seller Portal', domain: 'Settlements & Banking', desc: 'Bank accounts for daily/weekly merchant payouts' },
  delivery_zones: { app: 'Seller / Admin', domain: 'Geocoding & Logistics', desc: 'Geofenced delivery polygons and hyperlocal radii' },
  seller_drivers: { app: 'Seller Portal', domain: 'Merchant Operations', desc: 'Dedicated store delivery drivers and riders' },
  export_reports: { app: 'Seller / Admin', domain: 'Analytics & Reporting', desc: 'CSV/Excel generated export batch records' },
  account_health: { app: 'Admin / Seller', domain: 'Compliance & KYC', desc: 'Merchant fulfillment rating, cancellation rate, defect score' },
  policy_violations: { app: 'Admin Portal', domain: 'Compliance & KYC', desc: 'Store compliance violations, counterfeit warnings, penalties' },

  // Domain 3: Banking Partners, Credit & BNPL (B2B / Seller)
  bank_partners: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Lending partners (HDFC, SBI, Bajaj, ICICI) offering MSME lines' },
  credit_applications: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Merchant applications for 14-day/30-day working capital credit' },
  credit_ledgers: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Credit drawdowns, repayments, and outstanding principal' },
  credit_repayments: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Repayment transaction receipts from merchant to lender' },

  // Domain 4: Catalog & Products (Seller / Customer / Admin)
  categories: { app: 'Shared (Admin / Seller / Customer)', domain: 'Catalog & Taxonomies', desc: 'Taxonomy hierarchy (Dairy, Pantry, Snacks, Beverages)' },
  brands: { app: 'Shared (Admin / Seller / Customer)', domain: 'Catalog & Taxonomies', desc: 'FMCG brand registry (Amul, Tata, Aashirvaad, Maggi)' },
  products: { app: 'Admin / Catalog', domain: 'Master Catalog', desc: 'Canonical system product definitions' },
  master_catalog_items: { app: 'Shared (Admin / Seller / B2B)', domain: 'Master Catalog', desc: 'Central barcode catalog with standard MRP and packaging' },
  product_variants: { app: 'Shared (Admin / Seller / Customer)', domain: 'Master Catalog', desc: 'SKU variants by pack size, weight, and volume' },
  product_images: { app: 'Shared (Admin / Seller / Customer)', domain: 'Master Catalog', desc: 'High-res product gallery photography and thumbnails' },
  seller_listings: { app: 'Seller Portal', domain: 'Catalog & Inventory', desc: 'Merchant-specific listings, custom sell prices, and stock counts' },
  listing_attributes: { app: 'Seller Portal', domain: 'Catalog & Inventory', desc: 'Key-value custom attributes for merchant listings' },
  listing_documents: { app: 'Seller Portal', domain: 'Compliance & KYC', desc: 'FSSAI labels, batch test reports for listings' },
  product_approval_history: { app: 'Admin Portal', domain: 'Compliance & KYC', desc: 'Audit log of admin approval/rejection of seller listings' },
  search_synonyms: { app: 'Customer / Admin', domain: 'Search & Discovery', desc: 'Vernacular and phonetic search synonyms (e.g. chaaval -> rice)' },
  search_redirects: { app: 'Customer / Admin', domain: 'Search & Discovery', desc: 'URL search keyword query redirects' },
  product_search_index: { app: 'Customer Portal', domain: 'Search & Discovery', desc: 'Full-text Elasticsearch/PostgreSQL search vector index' },
  partner_packs: { app: 'Seller / B2B', domain: 'Catalog & Inventory', desc: 'Combo packs and wholesale bulk bundled packages' },

  // Domain 5: Inventory, Warehouses & B2B Procurement (Seller / B2B)
  warehouses: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Warehouses', desc: 'Wholesale regional fulfillment hubs and storage facilities' },
  inventory: { app: 'Seller Portal', domain: 'Catalog & Inventory', desc: 'Real-time stock ledger, reservations, low-stock threshold' },
  inventory_transactions: { app: 'Seller Portal', domain: 'Catalog & Inventory', desc: 'Immutable ledger of restocks, sales, damages, and returns' },
  inventory_reservations: { app: 'Seller / Customer', domain: 'Orders & Checkout', desc: 'Temporary stock hold while customer is in checkout' },
  suppliers: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'B2B wholesalers, FMCG distributors, millers, and farmers' },
  supplier_products: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Wholesaler product catalog with tiered tier-pricing' },
  stock_purchase_orders: { app: 'Seller / B2B', domain: 'Wholesale & B2B', desc: 'Purchase orders from retail merchant to wholesale distributor' },
  stock_purchase_order_items: { app: 'Seller / B2B', domain: 'Wholesale & B2B', desc: 'Line items within internal stock purchase orders' },
  b2b_purchase_orders: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'B2B Restock POs executed with trade credit terms' },
  b2b_purchase_items: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'B2B line items with wholesale discounted rates' },
  stock_transfers: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Warehouses', desc: 'Inter-warehouse and hub-to-store stock transfers' },
  stock_transfer_items: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Warehouses', desc: 'Line items within inventory transfer manifests' },

  // Domain 6: Carts, Wishlists, Promotions & Wallets (Customer / Seller)
  carts: { app: 'Customer Portal', domain: 'Orders & Checkout', desc: 'Active consumer shopping carts' },
  guest_carts: { app: 'Customer Portal', domain: 'Orders & Checkout', desc: 'Anonymous unauthenticated visitor shopping sessions' },
  cart_items: { app: 'Customer Portal', domain: 'Orders & Checkout', desc: 'Selected products, quantities, and applied seller discounts' },
  cart_events: { app: 'Customer / Analytics', domain: 'Orders & Checkout', desc: 'Cart abandonment tracking and real-time checkout telemetry' },
  wishlists: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Saved consumer shopping wishlists' },
  wishlist_items: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Product items saved inside consumer wishlists' },
  customer_favorites: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Frequently reordered items and favorite kirana stores' },
  coupons: { app: 'Seller / Admin', domain: 'Promotions & Loyalty', desc: 'Store-level and platform discount promo codes' },
  coupon_redemptions: { app: 'Customer / Seller', domain: 'Promotions & Loyalty', desc: 'Tracking 1-time coupon usage per shopper' },
  promotions: { app: 'Seller / Admin', domain: 'Promotions & Loyalty', desc: 'Flash sales, festive discounts, bundle promotions' },
  promotion_products: { app: 'Seller / Admin', domain: 'Promotions & Loyalty', desc: 'Products eligible for specific promotional campaigns' },
  rewards_accounts: { app: 'Customer Portal', domain: 'Promotions & Loyalty', desc: 'Shopper loyalty rewards balance and tiers' },
  reward_ledger: { app: 'Customer Portal', domain: 'Promotions & Loyalty', desc: 'Points accrual and redemption audit trail' },
  rewards_ledger: { app: 'Customer Portal', domain: 'Promotions & Loyalty', desc: 'Extended multi-tier cashback audit ledger' },
  customer_wallets: { app: 'Customer Portal', domain: 'Payments & Wallets', desc: 'In-app pre-loaded rupee wallet for instant 1-tap checkout' },

  // Domain 7: Orders, Shipping, Payments & Settlements (Customer / Seller / Admin)
  orders: { app: 'Shared (Customer / Seller / Admin)', domain: 'Orders & Fulfillment', desc: 'Parent multi-store customer order manifest' },
  seller_orders: { app: 'Seller Portal', domain: 'Orders & Fulfillment', desc: 'Store-specific split order for fulfillment & packing' },
  order_items: { app: 'Shared (Customer / Seller)', domain: 'Orders & Fulfillment', desc: 'Purchased product lines, quantities, unit prices' },
  order_status_history: { app: 'Shared (Customer / Seller)', domain: 'Orders & Fulfillment', desc: 'FSM state changes (NEW -> ACCEPTED -> PACKED -> DELIVERED)' },
  payment_methods: { app: 'Customer Portal', domain: 'Payments & Settlements', desc: 'Configured payment gateways (UPI, Cards, NetBanking, COD)' },
  payments: { app: 'Shared / Admin', domain: 'Payments & Settlements', desc: 'Order transaction charges and payment gateway tokens' },
  payment_transactions: { app: 'Shared / Admin', domain: 'Payments & Settlements', desc: 'Detailed webhook logs from Razorpay/PayU/UPI' },
  payment_provider_accounts: { app: 'Admin Portal', domain: 'Payments & Settlements', desc: 'Merchant aggregator payment gateway credentials' },
  payment_webhook_subscriptions: { app: 'Admin Portal', domain: 'Payments & Settlements', desc: 'PG webhook event handlers and signing secrets' },
  shipping_carriers: { app: 'Admin / Logistics', domain: 'Geocoding & Logistics', desc: '3PL delivery fleet providers (Dunzo, Shadowfax, Borzo)' },
  shipping_provider_accounts: { app: 'Admin / Logistics', domain: 'Geocoding & Logistics', desc: 'API keys and accounts for shipping logistics carriers' },
  carrier_service_levels: { app: 'Admin / Logistics', domain: 'Geocoding & Logistics', desc: 'Express 30-min, Same Day, Standard Next Day options' },
  delivery_slots: { app: 'Customer / Seller', domain: 'Geocoding & Logistics', desc: 'Bookable time windows for grocery delivery' },
  shipping_rates: { app: 'Admin / Seller', domain: 'Geocoding & Logistics', desc: 'Base fare, per-km charges, surge delivery fees' },
  shipments: { app: 'Seller / Delivery', domain: 'Geocoding & Logistics', desc: 'Delivery package manifests dispatched with rider' },
  shipment_items: { app: 'Seller / Delivery', domain: 'Geocoding & Logistics', desc: 'Products assigned to specific delivery bags' },
  tracking_events: { app: 'Customer / Seller', domain: 'Geocoding & Logistics', desc: 'Rider GPS breadcrumb updates and timestamps' },
  invoices: { app: 'Seller / Customer', domain: 'Invoicing & Tax', desc: 'GST-compliant tax invoices with HSN codes' },
  settlements: { app: 'Seller / Admin', domain: 'Settlements & Banking', desc: 'Periodic payout batch calculations and deductions' },
  settlement_items: { app: 'Seller / Admin', domain: 'Settlements & Banking', desc: 'Individual seller orders included in a payout settlement' },
  seller_payouts: { app: 'Seller / Admin', domain: 'Settlements & Banking', desc: 'Direct bank transfer payout transactions' },

  // Domain 8: Returns, Refunds & Reviews (Customer / Seller / Admin)
  returns: { app: 'Customer / Seller', domain: 'Returns & Customer Care', desc: 'Shopper item return requests and reasons' },
  return_items: { app: 'Customer / Seller', domain: 'Returns & Customer Care', desc: 'Specific damaged or wrong items requested for return' },
  return_status_history: { app: 'Customer / Seller', domain: 'Returns & Customer Care', desc: 'State tracking of returns (REQUESTED, APPROVED, PICKED, REFUNDED)' },
  refunds: { app: 'Customer / Admin', domain: 'Payments & Settlements', desc: 'Financial refund vouchers and UPI reverse transfers' },
  refund_items: { app: 'Customer / Admin', domain: 'Payments & Settlements', desc: 'Item-level breakdown of refunded amounts' },
  reviews: { app: 'Customer / Seller', domain: 'Customer CRM', desc: 'Customer star ratings and written reviews for products & stores' },
  review_replies: { app: 'Seller Portal', domain: 'Customer CRM', desc: 'Merchant public responses to customer reviews' },
  review_media: { app: 'Customer Portal', domain: 'Customer CRM', desc: 'Customer uploaded photos of received grocery items' },

  // Domain 9: POS, Support, Notifications & Audit (Seller / All)
  pos_sessions: { app: 'Seller Portal (POS)', domain: 'POS Counter Operations', desc: 'Daily physical counter billing register sessions' },
  pos_sales: { app: 'Seller Portal (POS)', domain: 'POS Counter Operations', desc: 'Offline retail walk-in customer checkout transactions' },
  pos_sale_items: { app: 'Seller Portal (POS)', domain: 'POS Counter Operations', desc: 'Scanned barcode line items on the POS counter' },
  pos_counter_shifts: { app: 'Seller Portal (POS)', domain: 'POS Counter Operations', desc: 'Cashier shift opening & closing cash balances' },
  message_threads: { app: 'Shared / All Portals', domain: 'Communication & Chat', desc: 'Chat threads between Buyer, Seller, Driver, and Support' },
  messages: { app: 'Shared / All Portals', domain: 'Communication & Chat', desc: 'Individual chat messages, timestamps, and read receipts' },
  notifications: { app: 'Shared / All Portals', domain: 'Communication & Chat', desc: 'In-app alert feed for orders, stock, and payouts' },
  notification_deliveries: { app: 'Shared / All Portals', domain: 'Communication & Chat', desc: 'Push notification (FCM), SMS, and WhatsApp delivery logs' },
  notification_templates: { app: 'Admin Portal', domain: 'Communication & Chat', desc: 'Multilingual notification copy templates (EN, HI, GU)' },
  notification_preferences: { app: 'Shared / All Portals', domain: 'Communication & Chat', desc: 'User channel opt-in/opt-out preferences' },
  support_tickets: { app: 'Customer / Seller / Admin', domain: 'Helpdesk & Support', desc: 'Customer dispute and technical support tickets' },
  support_messages: { app: 'Customer / Seller / Admin', domain: 'Helpdesk & Support', desc: 'Correspondence within a support ticket' },
  support_assignments: { app: 'Admin Portal', domain: 'Helpdesk & Support', desc: 'Support rep allocation and queue balancing' },
  audit_logs: { app: 'Admin Portal', domain: 'Security & Audit', desc: 'System-wide administrative action logs' },
  platform_settings: { app: 'Admin Portal', domain: 'Platform Config', desc: 'Global commission rates, operational toggles, surge rules' },
  feature_flags: { app: 'Admin Portal', domain: 'Platform Config', desc: 'Canary releases and beta feature toggles' },
  outbox_events: { app: 'Shared (Microservices)', domain: 'Event Driven Outbox', desc: 'Transactional outbox for reliable async domain event dispatching' },
  idempotency_keys: { app: 'Shared / All Portals', domain: 'API Infrastructure', desc: 'Prevents duplicate order creation or double payment charges' },
  webhook_events: { app: 'Shared / Admin', domain: 'API Infrastructure', desc: 'Inbound external partner webhook delivery records' },
  file_uploads: { app: 'Shared / All Portals', domain: 'Media & Storage', desc: 'MinIO/S3 object storage metadata and presigned URLs' },

  // Domain 10: AI Copilot, Tax, Enterprise Integration (Extended)
  ai_audit_logs: { app: 'Seller Portal (AI Copilot)', domain: 'AI Copilot & Tool Calling', desc: 'DPDP-compliant audit trails for all Gemini MCP tool executions & latency' },
  ai_product_recommendations: { app: 'Customer / Seller', domain: 'AI Copilot & Recommendations', desc: 'ML smart restock recommendations & shopper cross-sell items' },
  export_declarations: { app: 'Admin / B2B', domain: 'Compliance & Export', desc: 'Customs and cross-border trade shipment manifests' },
  compliance_certificates: { app: 'Admin / B2B', domain: 'Compliance & Export', desc: 'APEDA, FSSAI, Organic ISO certifications' },
  partner_brand_contracts: { app: 'Admin / B2B', domain: 'Wholesale & B2B', desc: 'Direct brand tie-ups, SLA commitments, margin splits' },
  freight_shipments: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Logistics', desc: 'Inter-city freight linehaul truck shipments' },
  delivery_fleet_routes: { app: 'Admin / Logistics', domain: 'Geocoding & Logistics', desc: 'Dynamic TSP route optimization paths for delivery drivers' },
  store_performance_metrics: { app: 'Seller / Admin', domain: 'Analytics & Reporting', desc: 'Daily GMV, defect rate, speed-to-pack metrics' },
  catalog_stories_feed: { app: 'Customer Portal', domain: 'Marketing & Feeds', desc: 'Instagram-like interactive video reels and product stories' },
  external_channel_accounts: { app: 'Seller Portal', domain: 'Omnichannel Sync', desc: 'Integrations with Amazon, Flipkart, ONDC, Blinkit' },
  external_channel_listings: { app: 'Seller Portal', domain: 'Omnichannel Sync', desc: 'Listing SKU mappings across external marketplaces' },
  external_channel_orders: { app: 'Seller Portal', domain: 'Omnichannel Sync', desc: 'Syncing external marketplace orders into single shop portal' },
  external_channel_sync_jobs: { app: 'Seller Portal', domain: 'Omnichannel Sync', desc: 'Cron background workers syncing stock across channels' },
  integration_credentials: { app: 'Seller / Admin', domain: 'Omnichannel Sync', desc: 'Encrypted OAuth secrets for external channels' },
  integration_logs: { app: 'Admin / Seller', domain: 'Omnichannel Sync', desc: 'Sync audit logs, conflict resolutions, failed webhooks' },
  integration_sync_checkpoints: { app: 'Seller / Admin', domain: 'Omnichannel Sync', desc: 'High-watermark timestamps for delta syncing' },
  tax_rules: { app: 'Admin Portal', domain: 'Invoicing & Tax', desc: 'State GST rates, HSN tax slab mappings' },
  tax_documents: { app: 'Seller / Admin', domain: 'Invoicing & Tax', desc: 'Monthly GSTR-1, GSTR-3B filed returns and reports' },
  fraud_risk_events: { app: 'Admin Portal', domain: 'Security & Audit', desc: 'ML fraud scoring on suspicious COD orders or card chargebacks' },
  report_jobs: { app: 'Admin / Seller', domain: 'Analytics & Reporting', desc: 'Asynchronous business intelligence report generation queue' },
  scheduled_reports: { app: 'Admin / Seller', domain: 'Analytics & Reporting', desc: 'Automated recurring weekly/monthly PDF email digests' },
  schema_migrations: { app: 'Infrastructure / DevOps', domain: 'Database DevOps', desc: 'Versioned database migration tracking' },

  // Domain 4: Additional Taxonomy, Attributes & Variants
  category_aliases: { app: 'Shared (Admin / Seller / Customer)', domain: 'Catalog & Taxonomies', desc: 'Category alternative search terms and vernacular synonyms' },
  attribute_definitions: { app: 'Admin / Seller', domain: 'Catalog & Taxonomies', desc: 'Configurable product attribute specifications (color, size, weight, pack type)' },
  category_attributes: { app: 'Admin / Seller', domain: 'Catalog & Taxonomies', desc: 'Mapping required and filter facet attributes to specific product categories' },
  listing_variants: { app: 'Seller Portal', domain: 'Catalog & Inventory', desc: 'SKU variants for merchant listings with independent prices and stock quantities' },
  taxonomy_versions: { app: 'Admin Portal', domain: 'Catalog & Taxonomies', desc: 'Versioned snapshots of the marketplace category and attribute taxonomy' },
  catalog_promotion_audit: { app: 'Seller / Admin', domain: 'Catalog & Inventory', desc: 'Audit log of listings curated into festive, flash, or sponsored promotions' },

  // Domain 11: B2B Commerce & Manufacturer Platform (Standalone & Hybrid B2B)
  manage_b_to_b_user_type: { app: 'ADAB B2B Portal', domain: 'B2B Identity & Roles', desc: 'Wholesale role classifications (Manufacturer, Primary Distributor, Super Stockist, Retailer)' },
  state: { app: 'Shared / All Portals', domain: 'Geocoding & Logistics', desc: 'Master registry of Indian states for GST compliance and shipping zones' },
  city: { app: 'Shared / All Portals', domain: 'Geocoding & Logistics', desc: 'Master registry of cities mapped to states for localized delivery' },
  campaigns: { app: 'ADAB B2B Portal', domain: 'B2B Marketing & Campaigns', desc: 'Targeted marketing campaigns, distributor trade schemes, volume rebates' },
  campaign_notifications: { app: 'ADAB B2B Portal', domain: 'B2B Marketing & Campaigns', desc: 'Broadcast push/SMS notifications targeted at wholesaler roles' },
  campaign_deliveries: { app: 'ADAB B2B Portal', domain: 'B2B Marketing & Campaigns', desc: 'Delivery receipts and engagement logs for commercial campaigns' },
  manage_b_to_b_userdetail: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Enterprise business profile, GSTIN, owner KYC, and geolocation for distributors' },
  shopdetail: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Retail kirana shop details linked to upstream distributor accounts' },
  territory_assignments: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Warehouses', desc: 'Exclusive territory and pincode zone assignments for distributors' },
  manage_b_to_b_categories: { app: 'ADAB B2B Portal', domain: 'Master Catalog', desc: 'Wholesale and bulk FMCG product categories' },
  manage_b_to_b_subcategories: { app: 'ADAB B2B Portal', domain: 'Master Catalog', desc: 'Granular subcategories for wholesale commodities' },
  distributor_products: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Distributor active stock catalog, wholesale selling prices, and distributor margins' },
  manage_manufacturer_products: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Manufacturer factory-gate product catalog and case packaging specs' },
  manage_b_to_b_cart: { app: 'ADAB B2B Portal', domain: 'Orders & Checkout', desc: 'Wholesale buyer restock cart holding case-lot quantities' },
  manage_b_to_b_orders: { app: 'ADAB B2B Portal', domain: 'Orders & Fulfillment', desc: 'Commercial B2B restock orders placed by retailers with distributors' },
  manage_b_to_b_order_items: { app: 'ADAB B2B Portal', domain: 'Orders & Fulfillment', desc: 'Case pack quantities, trade discounts, and tax lines on B2B orders' },
  manage_b_to_b_order_status_history: { app: 'ADAB B2B Portal', domain: 'Orders & Fulfillment', desc: 'State tracking of wholesale orders (CONFIRMED, INVOICED, DISPATCHED, DELIVERED)' },
  manage_b2b_purchase_order: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Formal purchase order contracts generated between commercial parties' },
  manage_b2b_purchase_order_detail: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Line item specifications, MOQs, and batch criteria on purchase orders' },
  manage_b_to_b_request_access: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Retailer applications requesting permission to purchase from brand distributors' },
  manage_b_to_b_settlements: { app: 'ADAB B2B Portal', domain: 'Settlements & Banking', desc: 'Commercial reconciliation and trade payout settlement records' },
  manage_b_to_b_invoices: { app: 'ADAB B2B Portal', domain: 'Invoicing & Tax', desc: 'GST e-invoices with IRN, e-Way bills, and HSN tax distributions' },
  manage_b_to_b_payments: { app: 'ADAB B2B Portal', domain: 'Payments & Settlements', desc: 'Commercial payments (NEFT/RTGS, UPI, Trade Credit Drawdowns)' },
  manage_b_to_b_payment_allocations: { app: 'ADAB B2B Portal', domain: 'Payments & Settlements', desc: 'Accounting allocation linking bulk payments to outstanding invoices' },
  manage_b_to_b_credit_notes: { app: 'ADAB B2B Portal', domain: 'Settlements & Banking', desc: 'Trade returns, damaged case deductions, and scheme credit notes' },
  manage_b_to_b_ledger_entries: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Double-entry general ledger for B2B accounts receivable & payable' },
  relationship_credits: { app: 'ADAB B2B Portal', domain: 'B2B Financing & Credit', desc: 'Direct bilateral merchant-distributor credit limits and credit terms' },
  manage_b_to_b_payouts: { app: 'ADAB B2B Portal', domain: 'Settlements & Banking', desc: 'Disbursements from escrow to manufacturer bank accounts' },
  razorpay_checkouts: { app: 'Shared (Customer / Seller / B2B)', domain: 'Payments & Settlements', desc: 'Razorpay PG checkout sessions and pre-charge authentication' },
  razorpay_checkout_orders: { app: 'Shared (Customer / Seller / B2B)', domain: 'Payments & Settlements', desc: 'Mapping Razorpay gateway order IDs to internal platform orders' },
  razorpay_webhook_events: { app: 'Shared / Admin', domain: 'Payments & Settlements', desc: 'Signed Razorpay webhook payload events for transaction confirmation' },
  manage_b_to_b_logistics_providers: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Logistics', desc: 'Commercial freight linehaul logistics fleet companies' },
  manage_b_to_b_drivers: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Logistics', desc: 'Commercial heavy transport truck drivers and contact details' },
  manage_b_to_b_vehicles: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Logistics', desc: 'Commercial vehicles, payload capacity (tons), and registration details' },
  manage_b_to_b_vehicle_routes: { app: 'ADAB B2B Portal', domain: 'Supply Chain & Logistics', desc: 'Wholesale delivery truck dispatch routes, waypoints, and drop sequences' },
  manage_b_to_b_support_tickets: { app: 'ADAB B2B Portal', domain: 'Helpdesk & Support', desc: 'Commercial dispute tickets regarding damaged cases or pricing errors' },
  manage_b_to_b_contact_submissions: { app: 'ADAB B2B Portal', domain: 'Wholesale & B2B', desc: 'Prospective manufacturer and distributor onboarding inquiries' },
  manage_b_to_b_audit_logs: { app: 'ADAB B2B Portal', domain: 'Security & Audit', desc: 'Administrative and operational audit trail for B2B platform actions' },
  audit_trail: { app: 'Shared / Admin', domain: 'Security & Audit', desc: 'Unified cross-portal compliance and security audit trail' },
};

async function generateDoc() {
  console.log('Querying Neon information_schema.columns...');
  const res = await pool.query(`
    SELECT 
      table_name,
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const tablesMap = new Map();
  for (const row of res.rows) {
    if (!tablesMap.has(row.table_name)) {
      tablesMap.set(row.table_name, []);
    }
    tablesMap.get(row.table_name).push(row);
  }

  console.log(`Fetched columns for ${tablesMap.size} tables.`);

  // Categorize tables into apps
  const appBuckets = {
    'ADAB Seller Portal': [],
    'ADAB B2B Portal (Wholesale & Credit)': [],
    'ADAB Customer Portal': [],
    'ADAB Admin Portal': [],
    'Shared Core Infrastructure & Commerce': []
  };

  for (const [tableName, cols] of tablesMap.entries()) {
    const meta = APP_MAPPINGS[tableName] || { app: 'Shared Core Infrastructure', domain: 'General', desc: 'System table' };
    const appCategory = meta.app;

    if (appCategory.includes('B2B')) {
      appBuckets['ADAB B2B Portal (Wholesale & Credit)'].push({ tableName, meta, cols });
    } else if (appCategory.includes('Seller') && !appCategory.includes('Shared')) {
      appBuckets['ADAB Seller Portal'].push({ tableName, meta, cols });
    } else if (appCategory.includes('Customer') && !appCategory.includes('Shared')) {
      appBuckets['ADAB Customer Portal'].push({ tableName, meta, cols });
    } else if (appCategory.includes('Admin') && !appCategory.includes('Shared')) {
      appBuckets['ADAB Admin Portal'].push({ tableName, meta, cols });
    } else {
      appBuckets['Shared Core Infrastructure & Commerce'].push({ tableName, meta, cols });
    }
  }

  // Build markdown document
  let md = `# ADAB Enterprise Database Schema & Application Mapping Catalog\n\n`;
  md += `**Total Database Tables:** ${tablesMap.size}  \n`;
  md += `**Target Database:** Neon PostgreSQL 18.6 (\`neondb\`, Schema: \`public\`)  \n`;
  md += `**Document Version:** 1.0.0 (Production Verified)  \n\n`;
  md += `---\n\n`;

  md += `## Executive Application Matrix\n\n`;
  md += `The ADAB multi-portal ecosystem shares a unified PostgreSQL schema divided into 4 primary application suites and 1 shared core foundation:\n\n`;
  md += `| Application Suite | Target Users | Table Count | Key Functional Focus |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **ADAB Seller Portal** | Store Owners, Kirana Merchants | **${appBuckets['ADAB Seller Portal'].length} Tables** | In-store operations, listings, POS counter billing, stock edits, order fulfillment, AI Copilot audit logs |\n`;
  md += `| **ADAB B2B Portal** | FMCG Wholesalers, Distributors, Millers | **${appBuckets['ADAB B2B Portal (Wholesale & Credit)'].length} Tables** | Wholesale catalogs, bulk restock POs, 14-day trade credit lines, banking partner integrations |\n`;
  md += `| **ADAB Customer Portal** | Shoppers, Grocery Consumers | **${appBuckets['ADAB Customer Portal'].length} Tables** | Cart, 1-tap checkout, consumer wallets, loyalty cashback, ratings & reviews, favorite stores |\n`;
  md += `| **ADAB Admin Portal** | Ops Team, Risk, Compliance | **${appBuckets['ADAB Admin Portal'].length} Tables** | KYC verification, platform fees, seller suspensions, system settings, RBAC, fraud risk |\n`;
  md += `| **Shared Core Infrastructure** | All Portals & Microservices | **${appBuckets['Shared Core Infrastructure & Commerce'].length} Tables** | Unified identities (\`users\`), parent \`orders\`, payments, notifications, taxonomy hierarchy |\n\n`;
  md += `---\n\n`;

  // Render each application suite
  for (const [appName, tablesList] of Object.entries(appBuckets)) {
    md += `## ${appName} (${tablesList.length} Tables)\n\n`;

    for (const t of tablesList) {
      md += `### \`${t.tableName}\`\n`;
      md += `* **Primary App:** ${t.meta.app}\n`;
      md += `* **Functional Domain:** ${t.meta.domain}\n`;
      md += `* **Description:** ${t.meta.desc}\n\n`;

      md += `| # | Column Name | Data Type | Nullable | Default Value |\n`;
      md += `| :-: | :--- | :--- | :-: | :--- |\n`;

      t.cols.forEach((c, idx) => {
        let typeStr = c.data_type;
        if (c.character_maximum_length) {
          typeStr += `(${c.character_maximum_length})`;
        }
        const isNullable = c.is_nullable === 'YES' ? 'Yes' : '**No**';
        const defaultVal = c.column_default ? `\`${c.column_default.replace(/::[a-zA-Z0-9_\s]+/g, '')}\`` : '—';
        md += `| ${idx + 1} | \`${c.column_name}\` | \`${typeStr}\` | ${isNullable} | ${defaultVal} |\n`;
      });

      md += `\n---\n\n`;
    }
  }

  const outPath = 'C:/Users/MAYAN/.gemini/antigravity/brain/15832ff5-8640-448f-baf8-885fc4dbfe69/ADAB_DATABASE_TABLES_CATALOG.md';
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`✅ Successfully generated catalog with all ${tablesMap.size} tables at: ${outPath}`);
  process.exit(0);
}

generateDoc().catch(err => {
  console.error('Error generating doc:', err);
  process.exit(1);
});
