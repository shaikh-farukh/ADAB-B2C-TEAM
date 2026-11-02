# ADAB Enterprise Database Schema & Application Mapping Catalog

**Total Database Tables:** 187  
**Target Database:** Neon PostgreSQL 18.6 (`neondb`, Schema: `public`)  
**Document Version:** 1.0.0 (Production Verified)  

---

## Executive Application Matrix

The ADAB multi-portal ecosystem shares a unified PostgreSQL schema divided into 4 primary application suites and 1 shared core foundation:

| Application Suite | Target Users | Table Count | Key Functional Focus |
| :--- | :--- | :--- | :--- |
| **ADAB Seller Portal** | Store Owners, Kirana Merchants | **58 Tables** | In-store operations, listings, POS counter billing, stock edits, order fulfillment, AI Copilot audit logs |
| **ADAB B2B Portal** | FMCG Wholesalers, Distributors, Millers | **55 Tables** | Wholesale catalogs, bulk restock POs, 14-day trade credit lines, banking partner integrations |
| **ADAB Customer Portal** | Shoppers, Grocery Consumers | **21 Tables** | Cart, 1-tap checkout, consumer wallets, loyalty cashback, ratings & reviews, favorite stores |
| **ADAB Admin Portal** | Ops Team, Risk, Compliance | **22 Tables** | KYC verification, platform fees, seller suspensions, system settings, RBAC, fraud risk |
| **Shared Core Infrastructure** | All Portals & Microservices | **31 Tables** | Unified identities (`users`), parent `orders`, payments, notifications, taxonomy hierarchy |

---

## ADAB Seller Portal (58 Tables)

### `account_health`
* **Primary App:** Admin / Seller
* **Functional Domain:** Compliance & KYC
* **Description:** Merchant fulfillment rating, cancellation rate, defect score

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `order_defect_rate` | `numeric` | Yes | `0.00` |
| 4 | `cancellation_rate` | `numeric` | Yes | `0.00` |
| 5 | `late_dispatch_rate` | `numeric` | Yes | `0.00` |
| 6 | `policy_compliance_score` | `numeric` | Yes | `100.00` |
| 7 | `status` | `character varying(30)` | Yes | `'GOOD'` |
| 8 | `last_evaluated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `ai_audit_logs`
* **Primary App:** Seller Portal (AI Copilot)
* **Functional Domain:** AI Copilot & Tool Calling
* **Description:** DPDP-compliant audit trails for all Gemini MCP tool executions & latency

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `user_id` | `uuid` | Yes | — |
| 4 | `prompt` | `text` | Yes | — |
| 5 | `tool_name` | `text` | **No** | — |
| 6 | `tool_tier` | `text` | Yes | `'TIER_1_READ'` |
| 7 | `arguments` | `jsonb` | Yes | `'{}'` |
| 8 | `result` | `jsonb` | Yes | `'{}'` |
| 9 | `success` | `boolean` | **No** | `true` |
| 10 | `duration_ms` | `integer` | Yes | `0` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `ai_product_recommendations`
* **Primary App:** Customer / Seller
* **Functional Domain:** AI Copilot & Recommendations
* **Description:** ML smart restock recommendations & shopper cross-sell items

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | Yes | — |
| 3 | `customer_id` | `uuid` | Yes | — |
| 4 | `product_id` | `uuid` | **No** | — |
| 5 | `recommendation_type` | `character varying(50)` | **No** | — |
| 6 | `confidence_score` | `numeric` | **No** | `0.8500` |
| 7 | `reason_text` | `text` | **No** | — |
| 8 | `expected_demand_lift_pct` | `numeric` | Yes | — |
| 9 | `action_taken` | `character varying(50)` | Yes | `'PENDING'` |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 11 | `expires_at` | `timestamp with time zone` | Yes | — |

---

### `attribute_definitions`
* **Primary App:** Admin / Seller
* **Functional Domain:** Catalog & Taxonomies
* **Description:** Configurable product attribute specifications (color, size, weight, pack type)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `code` | `character varying(100)` | **No** | — |
| 3 | `label` | `character varying(255)` | **No** | — |
| 4 | `description` | `text` | Yes | — |
| 5 | `data_type` | `character varying(50)` | **No** | — |
| 6 | `ui_type` | `character varying(50)` | **No** | — |
| 7 | `allowed_values` | `jsonb` | Yes | `'[]'` |
| 8 | `unit_options` | `jsonb` | Yes | `'[]'` |
| 9 | `validation_regex` | `character varying(255)` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `catalog_promotion_audit`
* **Primary App:** Seller / Admin
* **Functional Domain:** Catalog & Inventory
* **Description:** Audit log of listings curated into festive, flash, or sponsored promotions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `source_type` | `character varying(50)` | **No** | — |
| 4 | `source_id` | `character varying(100)` | **No** | — |
| 5 | `target_listing_id` | `uuid` | Yes | — |
| 6 | `curation_notes` | `text` | Yes | — |
| 7 | `action_by` | `uuid` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `category_attributes`
* **Primary App:** Admin / Seller
* **Functional Domain:** Catalog & Taxonomies
* **Description:** Mapping required and filter facet attributes to specific product categories

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `category_id` | `integer` | **No** | — |
| 3 | `attribute_id` | `uuid` | **No** | — |
| 4 | `is_required` | `boolean` | Yes | `false` |
| 5 | `is_variant_key` | `boolean` | Yes | `false` |
| 6 | `is_filter_facet` | `boolean` | Yes | `false` |
| 7 | `display_order` | `integer` | Yes | `0` |
| 8 | `section_group` | `character varying(100)` | Yes | `'General'` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `coupon_redemptions`
* **Primary App:** Customer / Seller
* **Functional Domain:** Promotions & Loyalty
* **Description:** Tracking 1-time coupon usage per shopper

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | Yes | — |
| 3 | `customer_id` | `uuid` | **No** | — |
| 4 | `order_id` | `uuid` | **No** | — |
| 5 | `coupon_code` | `character varying(50)` | **No** | — |
| 6 | `discount_availed` | `numeric` | **No** | — |
| 7 | `redeemed_at` | `timestamp with time zone` | Yes | `now()` |

---

### `coupons`
* **Primary App:** Seller / Admin
* **Functional Domain:** Promotions & Loyalty
* **Description:** Store-level and platform discount promo codes

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | Yes | — |
| 3 | `code` | `character varying(50)` | **No** | — |
| 4 | `discount_type` | `character varying(20)` | **No** | — |
| 5 | `discount_value` | `numeric` | **No** | — |
| 6 | `min_order_value` | `numeric` | Yes | `0.00` |
| 7 | `max_discount_cap` | `numeric` | Yes | — |
| 8 | `usage_limit` | `integer` | Yes | — |
| 9 | `usage_count` | `integer` | Yes | `0` |
| 10 | `valid_from` | `timestamp with time zone` | **No** | — |
| 11 | `valid_until` | `timestamp with time zone` | **No** | — |
| 12 | `is_active` | `boolean` | Yes | `true` |
| 13 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 14 | `applies_to` | `character varying(50)` | Yes | `'ENTIRE_SHOP'` |
| 15 | `target_audience` | `character varying(50)` | Yes | `'CUSTOMERS'` |
| 16 | `target_value` | `character varying(255)` | Yes | — |

---

### `delivery_slots`
* **Primary App:** Customer / Seller
* **Functional Domain:** Geocoding & Logistics
* **Description:** Bookable time windows for grocery delivery

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `zone_id` | `uuid` | **No** | — |
| 3 | `slot_date` | `date` | **No** | — |
| 4 | `start_time` | `time without time zone` | **No** | — |
| 5 | `end_time` | `time without time zone` | **No** | — |
| 6 | `max_deliveries` | `integer` | Yes | `20` |
| 7 | `current_booked` | `integer` | Yes | `0` |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `delivery_zones`
* **Primary App:** Seller / Admin
* **Functional Domain:** Geocoding & Logistics
* **Description:** Geofenced delivery polygons and hyperlocal radii

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `zone_name` | `character varying(100)` | **No** | — |
| 4 | `radius_km` | `numeric` | **No** | — |
| 5 | `min_order_amount` | `numeric` | Yes | `0.00` |
| 6 | `delivery_fee` | `numeric` | Yes | `0.00` |
| 7 | `estimated_minutes_min` | `integer` | Yes | `14` |
| 8 | `estimated_minutes_max` | `integer` | Yes | `30` |
| 9 | `is_active` | `boolean` | Yes | `true` |

---

### `export_reports`
* **Primary App:** Seller / Admin
* **Functional Domain:** Analytics & Reporting
* **Description:** CSV/Excel generated export batch records

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_id` | `uuid` | **No** | — |
| 3 | `report_type` | `character varying(50)` | **No** | — |
| 4 | `format` | `character varying(10)` | Yes | `'CSV'` |
| 5 | `status` | `character varying(30)` | Yes | `'COMPLETED'` |
| 6 | `file_url` | `text` | **No** | — |
| 7 | `generated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `external_channel_accounts`
* **Primary App:** Seller Portal
* **Functional Domain:** Omnichannel Sync
* **Description:** Integrations with Amazon, Flipkart, ONDC, Blinkit

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `channel_name` | `character varying(50)` | **No** | — |
| 4 | `channel_seller_id` | `character varying(100)` | **No** | — |
| 5 | `auth_credentials` | `jsonb` | Yes | — |
| 6 | `is_active` | `boolean` | Yes | `true` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `external_channel_listings`
* **Primary App:** Seller Portal
* **Functional Domain:** Omnichannel Sync
* **Description:** Listing SKU mappings across external marketplaces

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `channel_account_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `external_listing_id` | `character varying(100)` | **No** | — |
| 5 | `sync_status` | `character varying(30)` | Yes | `'SYNCED'` |
| 6 | `last_synced_at` | `timestamp with time zone` | Yes | `now()` |

---

### `external_channel_orders`
* **Primary App:** Seller Portal
* **Functional Domain:** Omnichannel Sync
* **Description:** Syncing external marketplace orders into single shop portal

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `channel_account_id` | `uuid` | **No** | — |
| 3 | `seller_order_id` | `uuid` | Yes | — |
| 4 | `external_order_id` | `character varying(100)` | **No** | — |
| 5 | `payload` | `jsonb` | Yes | — |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `external_channel_sync_jobs`
* **Primary App:** Seller Portal
* **Functional Domain:** Omnichannel Sync
* **Description:** Cron background workers syncing stock across channels

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `channel_account_id` | `uuid` | **No** | — |
| 3 | `job_type` | `character varying(50)` | **No** | — |
| 4 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 5 | `log` | `text` | Yes | — |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `integration_credentials`
* **Primary App:** Seller / Admin
* **Functional Domain:** Omnichannel Sync
* **Description:** Encrypted OAuth secrets for external channels

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `integration_name` | `character varying(100)` | **No** | — |
| 3 | `credentials_encrypted` | `jsonb` | **No** | — |
| 4 | `is_active` | `boolean` | Yes | `true` |
| 5 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `integration_logs`
* **Primary App:** Admin / Seller
* **Functional Domain:** Omnichannel Sync
* **Description:** Sync audit logs, conflict resolutions, failed webhooks

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `integration_name` | `character varying(100)` | **No** | — |
| 3 | `event` | `character varying(100)` | **No** | — |
| 4 | `correlation_id` | `character varying(100)` | Yes | — |
| 5 | `status` | `character varying(30)` | **No** | — |
| 6 | `details` | `jsonb` | Yes | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `integration_sync_checkpoints`
* **Primary App:** Seller / Admin
* **Functional Domain:** Omnichannel Sync
* **Description:** High-watermark timestamps for delta syncing

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `integration_name` | `character varying(100)` | **No** | — |
| 3 | `checkpoint_key` | `character varying(100)` | **No** | — |
| 4 | `last_synced_value` | `text` | **No** | — |
| 5 | `synced_at` | `timestamp with time zone` | Yes | `now()` |

---

### `inventory`
* **Primary App:** Seller Portal
* **Functional Domain:** Catalog & Inventory
* **Description:** Real-time stock ledger, reservations, low-stock threshold

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `stock_quantity` | `numeric` | **No** | `0` |
| 4 | `reserved_quantity` | `numeric` | **No** | `0` |
| 5 | `available_quantity` | `numeric` | Yes | — |
| 6 | `low_stock_threshold` | `numeric` | Yes | `5.0` |
| 7 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `inventory_reservations`
* **Primary App:** Seller / Customer
* **Functional Domain:** Orders & Checkout
* **Description:** Temporary stock hold while customer is in checkout

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `inventory_id` | `uuid` | **No** | — |
| 3 | `order_id` | `uuid` | Yes | — |
| 4 | `cart_id` | `uuid` | Yes | — |
| 5 | `quantity_reserved` | `integer` | **No** | — |
| 6 | `expires_at` | `timestamp with time zone` | **No** | — |
| 7 | `status` | `character varying(30)` | Yes | `'ACTIVE'` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `inventory_transactions`
* **Primary App:** Seller Portal
* **Functional Domain:** Catalog & Inventory
* **Description:** Immutable ledger of restocks, sales, damages, and returns

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `inventory_id` | `uuid` | **No** | — |
| 3 | `transaction_type` | `character varying(50)` | **No** | — |
| 4 | `quantity_change` | `integer` | **No** | — |
| 5 | `quantity_after` | `integer` | **No** | — |
| 6 | `reference_type` | `character varying(50)` | **No** | — |
| 7 | `reference_id` | `uuid` | Yes | — |
| 8 | `notes` | `text` | Yes | — |
| 9 | `created_by` | `uuid` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `invoices`
* **Primary App:** Seller / Customer
* **Functional Domain:** Invoicing & Tax
* **Description:** GST-compliant tax invoices with HSN codes

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `invoice_number` | `character varying(50)` | **No** | — |
| 3 | `order_id` | `uuid` | **No** | — |
| 4 | `seller_order_id` | `uuid` | Yes | — |
| 5 | `tax_amount` | `numeric` | Yes | `0.00` |
| 6 | `total_amount` | `numeric` | **No** | — |
| 7 | `invoice_pdf_url` | `text` | Yes | — |
| 8 | `generated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `listing_attributes`
* **Primary App:** Seller Portal
* **Functional Domain:** Catalog & Inventory
* **Description:** Key-value custom attributes for merchant listings

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `attribute_key` | `character varying(100)` | **No** | — |
| 4 | `attribute_value` | `text` | **No** | — |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `listing_documents`
* **Primary App:** Seller Portal
* **Functional Domain:** Compliance & KYC
* **Description:** FSSAI labels, batch test reports for listings

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `document_type` | `character varying(50)` | **No** | — |
| 4 | `document_url` | `text` | **No** | — |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `listing_variants`
* **Primary App:** Seller Portal
* **Functional Domain:** Catalog & Inventory
* **Description:** SKU variants for merchant listings with independent prices and stock quantities

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `sku` | `character varying(100)` | **No** | — |
| 4 | `barcode` | `character varying(100)` | Yes | — |
| 5 | `mrp` | `numeric` | **No** | — |
| 6 | `sell_price` | `numeric` | **No** | — |
| 7 | `stock_qty` | `numeric` | **No** | `0.000` |
| 8 | `variant_attributes` | `jsonb` | **No** | `'{}'` |
| 9 | `image_url` | `text` | Yes | — |
| 10 | `is_active` | `boolean` | Yes | `true` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 12 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `oauth_accounts`
* **Primary App:** Customer / Seller
* **Functional Domain:** Identity & Access
* **Description:** Social login links (Google OAuth, Apple ID)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `provider` | `character varying(50)` | **No** | — |
| 4 | `provider_user_id` | `character varying(255)` | **No** | — |
| 5 | `access_token` | `text` | Yes | — |
| 6 | `refresh_token` | `text` | Yes | — |
| 7 | `token_expires_at` | `timestamp with time zone` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `pos_counter_shifts`
* **Primary App:** Seller Portal (POS)
* **Functional Domain:** POS Counter Operations
* **Description:** Cashier shift opening & closing cash balances

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `cashier_user_id` | `uuid` | **No** | — |
| 4 | `opening_cash_balance` | `numeric` | **No** | `0.00` |
| 5 | `closing_cash_balance` | `numeric` | Yes | — |
| 6 | `actual_cash_counted` | `numeric` | Yes | — |
| 7 | `cash_discrepancy` | `numeric` | Yes | `0.00` |
| 8 | `total_upi_soundbox_sales` | `numeric` | Yes | `0.00` |
| 9 | `total_card_sales` | `numeric` | Yes | `0.00` |
| 10 | `shift_status` | `character varying(50)` | Yes | `'OPEN'` |
| 11 | `opened_at` | `timestamp with time zone` | Yes | `now()` |
| 12 | `closed_at` | `timestamp with time zone` | Yes | — |

---

### `pos_sale_items`
* **Primary App:** Seller Portal (POS)
* **Functional Domain:** POS Counter Operations
* **Description:** Scanned barcode line items on the POS counter

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `pos_sale_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | Yes | — |
| 4 | `item_name` | `character varying(200)` | **No** | — |
| 5 | `unit_price` | `numeric` | **No** | — |
| 6 | `quantity` | `numeric` | **No** | — |
| 7 | `discount_amount` | `numeric` | Yes | `0.00` |
| 8 | `line_total` | `numeric` | **No** | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `pos_sales`
* **Primary App:** Seller Portal (POS)
* **Functional Domain:** POS Counter Operations
* **Description:** Offline retail walk-in customer checkout transactions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `receipt_no` | `character varying(50)` | **No** | — |
| 4 | `buyer_type` | `character varying(20)` | Yes | `'WALK_IN_CUSTOMER'` |
| 5 | `payment_mode` | `character varying(20)` | **No** | — |
| 6 | `total_amount` | `numeric` | **No** | — |
| 7 | `points_earned` | `integer` | Yes | `0` |
| 8 | `announced_audio` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `pos_sessions`
* **Primary App:** Seller Portal (POS)
* **Functional Domain:** POS Counter Operations
* **Description:** Daily physical counter billing register sessions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `cashier_id` | `uuid` | **No** | — |
| 4 | `opening_balance` | `numeric` | Yes | `0.00` |
| 5 | `closing_balance` | `numeric` | Yes | — |
| 6 | `status` | `character varying(30)` | Yes | `'OPEN'` |
| 7 | `opened_at` | `timestamp with time zone` | Yes | `now()` |
| 8 | `closed_at` | `timestamp with time zone` | Yes | — |

---

### `promotion_products`
* **Primary App:** Seller / Admin
* **Functional Domain:** Promotions & Loyalty
* **Description:** Products eligible for specific promotional campaigns

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `promotion_id` | `uuid` | **No** | — |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `promo_price` | `numeric` | **No** | — |

---

### `promotions`
* **Primary App:** Seller / Admin
* **Functional Domain:** Promotions & Loyalty
* **Description:** Flash sales, festive discounts, bundle promotions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | Yes | — |
| 3 | `title` | `character varying(150)` | **No** | — |
| 4 | `promo_type` | `character varying(50)` | **No** | — |
| 5 | `banner_url` | `text` | Yes | — |
| 6 | `start_date` | `timestamp with time zone` | **No** | — |
| 7 | `end_date` | `timestamp with time zone` | **No** | — |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `report_jobs`
* **Primary App:** Admin / Seller
* **Functional Domain:** Analytics & Reporting
* **Description:** Asynchronous business intelligence report generation queue

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | Yes | — |
| 3 | `report_type` | `character varying(100)` | **No** | — |
| 4 | `filter_params` | `jsonb` | Yes | — |
| 5 | `file_format` | `character varying(10)` | Yes | `'CSV'` |
| 6 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 7 | `download_url` | `text` | Yes | — |
| 8 | `error_message` | `text` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 10 | `completed_at` | `timestamp with time zone` | Yes | — |

---

### `return_items`
* **Primary App:** Customer / Seller
* **Functional Domain:** Returns & Customer Care
* **Description:** Specific damaged or wrong items requested for return

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `return_id` | `uuid` | **No** | — |
| 3 | `order_item_id` | `uuid` | **No** | — |
| 4 | `quantity` | `integer` | **No** | — |
| 5 | `refund_amount` | `numeric` | **No** | — |
| 6 | `reason` | `character varying(100)` | **No** | — |
| 7 | `item_condition` | `character varying(50)` | Yes | `'SEALED'` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `return_status_history`
* **Primary App:** Customer / Seller
* **Functional Domain:** Returns & Customer Care
* **Description:** State tracking of returns (REQUESTED, APPROVED, PICKED, REFUNDED)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `return_id` | `uuid` | **No** | — |
| 3 | `previous_status` | `character varying(50)` | **No** | — |
| 4 | `new_status` | `character varying(50)` | **No** | — |
| 5 | `notes` | `text` | Yes | — |
| 6 | `changed_at` | `timestamp with time zone` | Yes | `now()` |

---

### `returns`
* **Primary App:** Customer / Seller
* **Functional Domain:** Returns & Customer Care
* **Description:** Shopper item return requests and reasons

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | **No** | — |
| 3 | `seller_order_id` | `uuid` | **No** | — |
| 4 | `customer_id` | `uuid` | **No** | — |
| 5 | `reason` | `character varying(255)` | **No** | — |
| 6 | `status` | `character varying(30)` | Yes | `'REQUESTED'` |
| 7 | `refund_amount` | `numeric` | **No** | — |
| 8 | `refund_percentage` | `numeric` | Yes | `100.00` |
| 9 | `rejection_reason` | `text` | Yes | — |
| 10 | `requested_at` | `timestamp with time zone` | Yes | `now()` |
| 11 | `resolved_at` | `timestamp with time zone` | Yes | — |

---

### `review_replies`
* **Primary App:** Seller Portal
* **Functional Domain:** Customer CRM
* **Description:** Merchant public responses to customer reviews

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `review_id` | `uuid` | **No** | — |
| 3 | `store_id` | `uuid` | **No** | — |
| 4 | `responder_user_id` | `uuid` | **No** | — |
| 5 | `reply_text` | `text` | **No** | — |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `reviews`
* **Primary App:** Customer / Seller
* **Functional Domain:** Customer CRM
* **Description:** Customer star ratings and written reviews for products & stores

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `customer_id` | `uuid` | **No** | — |
| 4 | `order_id` | `uuid` | Yes | — |
| 5 | `rating` | `integer` | **No** | — |
| 6 | `title` | `character varying(150)` | Yes | — |
| 7 | `comment` | `text` | Yes | — |
| 8 | `seller_reply` | `text` | Yes | — |
| 9 | `seller_replied_at` | `timestamp with time zone` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `scheduled_reports`
* **Primary App:** Admin / Seller
* **Functional Domain:** Analytics & Reporting
* **Description:** Automated recurring weekly/monthly PDF email digests

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `title` | `character varying(150)` | **No** | — |
| 3 | `cron_expression` | `character varying(50)` | **No** | — |
| 4 | `report_type` | `character varying(100)` | **No** | — |
| 5 | `recipients` | `ARRAY` | **No** | — |
| 6 | `is_active` | `boolean` | Yes | `true` |
| 7 | `last_run_at` | `timestamp with time zone` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_bank_accounts`
* **Primary App:** Seller Portal
* **Functional Domain:** Settlements & Banking
* **Description:** Bank accounts for daily/weekly merchant payouts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_id` | `uuid` | **No** | — |
| 3 | `bank_name` | `character varying(100)` | **No** | — |
| 4 | `account_holder_name` | `character varying(150)` | **No** | — |
| 5 | `account_number` | `character varying(50)` | **No** | — |
| 6 | `ifsc_code` | `character varying(15)` | **No** | — |
| 7 | `account_type` | `character varying(20)` | Yes | `'CURRENT'` |
| 8 | `is_verified` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_documents`
* **Primary App:** Seller / Admin
* **Functional Domain:** Compliance & KYC
* **Description:** Uploaded verification documents (FSSAI, GST, Cheque)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_id` | `uuid` | **No** | — |
| 3 | `doc_type` | `character varying(50)` | **No** | — |
| 4 | `file_name` | `character varying(255)` | **No** | — |
| 5 | `file_url` | `text` | **No** | — |
| 6 | `verification_status` | `character varying(30)` | Yes | `'PENDING'` |
| 7 | `uploaded_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_drivers`
* **Primary App:** Seller Portal
* **Functional Domain:** Merchant Operations
* **Description:** Dedicated store delivery drivers and riders

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `driver_name` | `character varying(100)` | **No** | — |
| 4 | `phone` | `character varying(20)` | **No** | — |
| 5 | `vehicle_number` | `character varying(50)` | Yes | — |
| 6 | `vehicle_type` | `character varying(30)` | Yes | `'BIKE'` |
| 7 | `is_available` | `boolean` | Yes | `true` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_listings`
* **Primary App:** Seller Portal
* **Functional Domain:** Catalog & Inventory
* **Description:** Merchant-specific listings, custom sell prices, and stock counts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `product_type` | `character varying(30)` | **No** | — |
| 4 | `master_catalog_id` | `uuid` | Yes | — |
| 5 | `title` | `character varying(255)` | **No** | — |
| 6 | `sku` | `character varying(100)` | Yes | — |
| 7 | `barcode` | `character varying(50)` | Yes | — |
| 8 | `brand_tag` | `character varying(100)` | Yes | — |
| 9 | `category_id` | `integer` | Yes | — |
| 10 | `mrp` | `numeric` | **No** | — |
| 11 | `sell_price` | `numeric` | **No** | — |
| 12 | `unit` | `character varying(20)` | Yes | `'pcs'` |
| 13 | `min_order_qty` | `numeric` | Yes | `1.0` |
| 14 | `allowed_buyers` | `character varying(30)` | Yes | `'ALL'` |
| 15 | `approval_status` | `character varying(30)` | Yes | `'PENDING'` |
| 16 | `rejection_reason` | `text` | Yes | — |
| 17 | `is_active` | `boolean` | Yes | `true` |
| 18 | `is_refundable` | `boolean` | Yes | `true` |
| 19 | `refund_percentage` | `numeric` | Yes | `100.00` |
| 20 | `return_window_days` | `integer` | Yes | `7` |
| 21 | `rating` | `numeric` | Yes | `5.00` |
| 22 | `review_count` | `integer` | Yes | `0` |
| 23 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 24 | `updated_at` | `timestamp with time zone` | Yes | `now()` |
| 25 | `stock_qty` | `integer` | Yes | `0` |
| 26 | `blocked_reseller_store_ids` | `ARRAY` | Yes | `'{}'[]` |
| 27 | `wholesale_price` | `numeric` | Yes | — |
| 28 | `tiered_pricing` | `jsonb` | Yes | `'[]'` |
| 29 | `sample_available` | `boolean` | Yes | `true` |
| 30 | `original_listing_id` | `uuid` | Yes | — |
| 31 | `manufacturer_product_id` | `integer` | Yes | — |
| 32 | `attributes` | `jsonb` | Yes | `'{}'` |
| 33 | `has_variants` | `boolean` | Yes | `false` |

---

### `seller_onboarding_steps`
* **Primary App:** Seller Portal
* **Functional Domain:** Merchant Operations
* **Description:** 7-step dynamic onboarding state, starter products, and delivery configs

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `user_id` | `uuid` | **No** | — |
| 2 | `step1` | `boolean` | Yes | `false` |
| 3 | `step2` | `boolean` | Yes | `false` |
| 4 | `step3` | `boolean` | Yes | `false` |
| 5 | `step4` | `boolean` | Yes | `false` |
| 6 | `step5` | `boolean` | Yes | `false` |
| 7 | `step6` | `boolean` | Yes | `false` |
| 8 | `step7` | `boolean` | Yes | `false` |
| 9 | `profile_data` | `jsonb` | Yes | `'{}'` |
| 10 | `delivery_config` | `jsonb` | Yes | `'{}'` |
| 11 | `credit_config` | `jsonb` | Yes | `'{}'` |
| 12 | `starter_products` | `jsonb` | Yes | `'[]'` |
| 13 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_orders`
* **Primary App:** Seller Portal
* **Functional Domain:** Orders & Fulfillment
* **Description:** Store-specific split order for fulfillment & packing

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `parent_order_id` | `uuid` | **No** | — |
| 3 | `store_id` | `uuid` | **No** | — |
| 4 | `subtotal` | `numeric` | **No** | — |
| 5 | `commission_fee` | `numeric` | Yes | `0.00` |
| 6 | `seller_payout_amount` | `numeric` | **No** | — |
| 7 | `status` | `character varying(30)` | Yes | `'NEW'` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_payouts`
* **Primary App:** Seller / Admin
* **Functional Domain:** Settlements & Banking
* **Description:** Direct bank transfer payout transactions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `payout_batch_id` | `character varying(100)` | **No** | — |
| 3 | `store_id` | `uuid` | **No** | — |
| 4 | `bank_account_id` | `uuid` | **No** | — |
| 5 | `gross_earnings` | `numeric` | **No** | — |
| 6 | `commission_deducted` | `numeric` | **No** | — |
| 7 | `tax_tcs_tds_deducted` | `numeric` | **No** | — |
| 8 | `net_payout_amount` | `numeric` | **No** | — |
| 9 | `utr_number` | `character varying(100)` | Yes | — |
| 10 | `payout_status` | `character varying(50)` | Yes | `'PROCESSING'` |
| 11 | `processed_at` | `timestamp with time zone` | Yes | — |
| 12 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `seller_profiles`
* **Primary App:** Seller Portal
* **Functional Domain:** Merchant Operations
* **Description:** Legal business entity, PAN, GSTIN, and KYC status

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `legal_name` | `character varying(200)` | **No** | — |
| 4 | `entity_type` | `character varying(50)` | **No** | — |
| 5 | `gstin` | `character varying(15)` | Yes | — |
| 6 | `pan` | `character varying(10)` | **No** | — |
| 7 | `fssai_license` | `character varying(20)` | Yes | — |
| 8 | `udhyam_msme` | `character varying(30)` | Yes | — |
| 9 | `kyc_status` | `character varying(30)` | Yes | `'DRAFT'` |
| 10 | `onboarding_step` | `integer` | Yes | `1` |
| 11 | `rejection_reason` | `text` | Yes | — |
| 12 | `submitted_at` | `timestamp with time zone` | Yes | — |
| 13 | `verified_at` | `timestamp with time zone` | Yes | — |
| 14 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 15 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `settlement_items`
* **Primary App:** Seller / Admin
* **Functional Domain:** Settlements & Banking
* **Description:** Individual seller orders included in a payout settlement

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `settlement_id` | `uuid` | **No** | — |
| 3 | `seller_order_id` | `uuid` | **No** | — |
| 4 | `amount` | `numeric` | **No** | — |

---

### `settlements`
* **Primary App:** Seller / Admin
* **Functional Domain:** Settlements & Banking
* **Description:** Periodic payout batch calculations and deductions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `settlement_cycle` | `character varying(50)` | **No** | — |
| 4 | `total_sales` | `numeric` | **No** | — |
| 5 | `total_commission` | `numeric` | **No** | — |
| 6 | `total_tax_deducted` | `numeric` | Yes | `0.00` |
| 7 | `net_payable` | `numeric` | **No** | — |
| 8 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 9 | `settled_at` | `timestamp with time zone` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `shipment_items`
* **Primary App:** Seller / Delivery
* **Functional Domain:** Geocoding & Logistics
* **Description:** Products assigned to specific delivery bags

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `shipment_id` | `uuid` | **No** | — |
| 3 | `order_item_id` | `uuid` | **No** | — |

---

### `shipments`
* **Primary App:** Seller / Delivery
* **Functional Domain:** Geocoding & Logistics
* **Description:** Delivery package manifests dispatched with rider

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_order_id` | `uuid` | **No** | — |
| 3 | `carrier_name` | `character varying(100)` | **No** | — |
| 4 | `tracking_number` | `character varying(100)` | Yes | — |
| 5 | `label_url` | `text` | Yes | — |
| 6 | `status` | `character varying(50)` | Yes | `'CREATED'` |
| 7 | `shipped_at` | `timestamp with time zone` | Yes | — |
| 8 | `delivered_at` | `timestamp with time zone` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `shipping_rates`
* **Primary App:** Admin / Seller
* **Functional Domain:** Geocoding & Logistics
* **Description:** Base fare, per-km charges, surge delivery fees

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `zone_id` | `uuid` | Yes | — |
| 3 | `min_weight_kg` | `numeric` | **No** | `0.00` |
| 4 | `max_weight_kg` | `numeric` | **No** | — |
| 5 | `base_rate` | `numeric` | **No** | — |
| 6 | `per_kg_rate` | `numeric` | Yes | `0.00` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `store_performance_metrics`
* **Primary App:** Seller / Admin
* **Functional Domain:** Analytics & Reporting
* **Description:** Daily GMV, defect rate, speed-to-pack metrics

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `metric_date` | `date` | **No** | `CURRENT_DATE` |
| 4 | `total_orders` | `integer` | Yes | `0` |
| 5 | `fulfilled_orders` | `integer` | Yes | `0` |
| 6 | `cancelled_orders` | `integer` | Yes | `0` |
| 7 | `avg_fulfillment_time_minutes` | `numeric` | Yes | `0.00` |
| 8 | `sla_adherence_pct` | `numeric` | Yes | `100.00` |
| 9 | `customer_rating_avg` | `numeric` | Yes | `5.00` |
| 10 | `on_time_delivery_pct` | `numeric` | Yes | `100.00` |
| 11 | `total_gross_revenue` | `numeric` | Yes | `0.00` |
| 12 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `stores`
* **Primary App:** Seller Portal
* **Functional Domain:** Merchant Operations
* **Description:** Physical/cloud grocery store profile, operational hours, radius, soundbox

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_id` | `uuid` | **No** | — |
| 3 | `store_name` | `character varying(150)` | **No** | — |
| 4 | `category` | `character varying(100)` | **No** | — |
| 5 | `phone` | `character varying(20)` | **No** | — |
| 6 | `email` | `character varying(255)` | Yes | — |
| 7 | `address_line` | `text` | **No** | — |
| 8 | `city` | `character varying(100)` | **No** | — |
| 9 | `state` | `character varying(100)` | **No** | — |
| 10 | `pincode` | `character varying(10)` | **No** | — |
| 11 | `latitude` | `numeric` | Yes | — |
| 12 | `longitude` | `numeric` | Yes | — |
| 13 | `delivery_radius_km` | `numeric` | Yes | `10.00` |
| 14 | `is_online` | `boolean` | Yes | `true` |
| 15 | `open_time` | `time without time zone` | Yes | `'08:00:00'` |
| 16 | `close_time` | `time without time zone` | Yes | `'22:00:00'` |
| 17 | `soundbox_enabled` | `boolean` | Yes | `true` |
| 18 | `ui_mode` | `character varying(20)` | Yes | `'SIMPLE'` |
| 19 | `rating` | `numeric` | Yes | `5.00` |
| 20 | `rating_count` | `integer` | Yes | `0` |
| 21 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `support_messages`
* **Primary App:** Customer / Seller / Admin
* **Functional Domain:** Helpdesk & Support
* **Description:** Correspondence within a support ticket

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `ticket_id` | `uuid` | **No** | — |
| 3 | `sender_user_id` | `uuid` | **No** | — |
| 4 | `message` | `text` | **No** | — |
| 5 | `attachment_url` | `text` | Yes | — |
| 6 | `is_internal_admin_note` | `boolean` | Yes | `false` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `support_tickets`
* **Primary App:** Customer / Seller / Admin
* **Functional Domain:** Helpdesk & Support
* **Description:** Customer dispute and technical support tickets

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `ticket_number` | `character varying(50)` | **No** | — |
| 3 | `user_id` | `uuid` | **No** | — |
| 4 | `user_role` | `character varying(30)` | **No** | — |
| 5 | `order_id` | `uuid` | Yes | — |
| 6 | `category` | `character varying(100)` | **No** | — |
| 7 | `priority` | `character varying(30)` | Yes | `'MEDIUM'` |
| 8 | `status` | `character varying(50)` | Yes | `'OPEN'` |
| 9 | `assigned_admin_id` | `uuid` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 11 | `resolved_at` | `timestamp with time zone` | Yes | — |

---

### `tax_documents`
* **Primary App:** Seller / Admin
* **Functional Domain:** Invoicing & Tax
* **Description:** Monthly GSTR-1, GSTR-3B filed returns and reports

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | Yes | — |
| 3 | `doc_type` | `character varying(50)` | **No** | — |
| 4 | `doc_number` | `character varying(100)` | **No** | — |
| 5 | `file_url` | `text` | **No** | — |
| 6 | `issued_at` | `timestamp with time zone` | Yes | `now()` |

---

### `tracking_events`
* **Primary App:** Customer / Seller
* **Functional Domain:** Geocoding & Logistics
* **Description:** Rider GPS breadcrumb updates and timestamps

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | **No** | — |
| 3 | `driver_id` | `uuid` | Yes | — |
| 4 | `event_name` | `character varying(100)` | **No** | — |
| 5 | `event_description` | `text` | Yes | — |
| 6 | `latitude` | `numeric` | Yes | — |
| 7 | `longitude` | `numeric` | Yes | — |
| 8 | `timestamp` | `timestamp with time zone` | Yes | `now()` |

---

## ADAB B2B Portal (Wholesale & Credit) (55 Tables)

### `api_keys`
* **Primary App:** Admin / B2B Portal
* **Functional Domain:** Identity & Access
* **Description:** M2M API keys for ERP and B2B distributor integrations

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `name` | `character varying(100)` | **No** | — |
| 3 | `key_hash` | `character varying(255)` | **No** | — |
| 4 | `prefix` | `character varying(20)` | **No** | — |
| 5 | `scopes` | `ARRAY` | Yes | `'{}'[]` |
| 6 | `created_by` | `uuid` | Yes | — |
| 7 | `expires_at` | `timestamp with time zone` | Yes | — |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `b2b_purchase_items`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** B2B line items with wholesale discounted rates

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `purchase_order_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `quantity` | `numeric` | **No** | — |
| 5 | `unit_price` | `numeric` | **No** | — |
| 6 | `total_price` | `numeric` | **No** | — |
| 7 | `item_name` | `character varying(255)` | Yes | — |
| 8 | `unit` | `character varying(50)` | Yes | — |
| 9 | `image_url` | `text` | Yes | — |
| 10 | `brand_tag` | `character varying(100)` | Yes | — |
| 11 | `mrp` | `numeric` | Yes | — |
| 12 | `category_name` | `character varying(100)` | Yes | — |
| 13 | `resale_sell_price` | `numeric` | Yes | — |

---

### `b2b_purchase_orders`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** B2B Restock POs executed with trade credit terms

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `po_number` | `character varying(30)` | **No** | — |
| 3 | `buyer_store_id` | `uuid` | **No** | — |
| 4 | `supplier_store_id` | `uuid` | **No** | — |
| 5 | `total_amount` | `numeric` | **No** | — |
| 6 | `payment_terms` | `character varying(30)` | Yes | `'CREDIT_14D'` |
| 7 | `status` | `character varying(30)` | Yes | `'PLACED'` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 9 | `payment_status` | `character varying(50)` | Yes | `'PENDING'` |
| 10 | `payment_method` | `character varying(50)` | Yes | — |
| 11 | `payment_reference` | `character varying(150)` | Yes | — |
| 12 | `payment_metadata` | `jsonb` | Yes | `'{}'` |
| 13 | `delivery_method` | `character varying(50)` | Yes | — |
| 14 | `delivery_fee` | `numeric` | Yes | `0` |
| 15 | `notes` | `text` | Yes | — |
| 16 | `updated_at` | `timestamp with time zone` | Yes | `now()` |
| 17 | `rejection_reason` | `text` | Yes | — |

---

### `bank_partners`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Lending partners (HDFC, SBI, Bajaj, ICICI) offering MSME lines

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `name` | `character varying(100)` | **No** | — |
| 3 | `code` | `character varying(30)` | **No** | — |
| 4 | `logo_url` | `text` | Yes | — |
| 5 | `interest_rate_pct` | `numeric` | Yes | `0.00` |
| 6 | `max_credit_limit` | `numeric` | **No** | — |
| 7 | `tenure_options` | `ARRAY` | Yes | `'{7,14,21,30,60}'[]` |
| 8 | `eligibility_criteria` | `jsonb` | Yes | — |
| 9 | `is_active` | `boolean` | Yes | `true` |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `campaign_deliveries`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Marketing & Campaigns
* **Description:** Delivery receipts and engagement logs for commercial campaigns

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('campaign_deliveries_id_seq')` |
| 2 | `campaign_notification_id` | `integer` | Yes | — |
| 3 | `user_id` | `integer` | Yes | — |
| 4 | `delivered_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 5 | `status` | `character varying(50)` | Yes | `'delivered'` |

---

### `campaign_notifications`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Marketing & Campaigns
* **Description:** Broadcast push/SMS notifications targeted at wholesaler roles

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('campaign_notifications_id_seq')` |
| 2 | `title` | `character varying(255)` | Yes | — |
| 3 | `message` | `text` | Yes | — |
| 4 | `target_role` | `character varying(50)` | Yes | — |
| 5 | `created_by` | `integer` | Yes | — |
| 6 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `campaigns`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Marketing & Campaigns
* **Description:** Targeted marketing campaigns, distributor trade schemes, volume rebates

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('campaigns_id_seq')` |
| 2 | `name` | `character varying(255)` | **No** | — |
| 3 | `type` | `character varying(100)` | Yes | — |
| 4 | `description` | `text` | Yes | — |
| 5 | `start_date` | `timestamp without time zone` | Yes | — |
| 6 | `end_date` | `timestamp without time zone` | Yes | — |
| 7 | `created_by` | `integer` | Yes | — |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `compliance_certificates`
* **Primary App:** Admin / B2B
* **Functional Domain:** Compliance & Export
* **Description:** APEDA, FSSAI, Organic ISO certifications

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `certificate_type` | `character varying(100)` | **No** | — |
| 4 | `certificate_name` | `character varying(200)` | **No** | — |
| 5 | `issuing_authority` | `character varying(200)` | **No** | — |
| 6 | `license_number` | `character varying(100)` | **No** | — |
| 7 | `issue_date` | `date` | **No** | — |
| 8 | `expiry_date` | `date` | **No** | — |
| 9 | `document_url` | `text` | **No** | — |
| 10 | `verification_status` | `character varying(50)` | Yes | `'PENDING'` |
| 11 | `verified_by_admin_id` | `uuid` | Yes | — |
| 12 | `verified_at` | `timestamp with time zone` | Yes | — |
| 13 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `credit_applications`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Merchant applications for 14-day/30-day working capital credit

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `application_no` | `character varying(30)` | **No** | — |
| 3 | `applicant_type` | `character varying(20)` | **No** | — |
| 4 | `applicant_id` | `uuid` | **No** | — |
| 5 | `applicant_name` | `character varying(150)` | **No** | — |
| 6 | `bank_id` | `uuid` | **No** | — |
| 7 | `requested_amount` | `numeric` | **No** | — |
| 8 | `approved_amount` | `numeric` | Yes | `0.00` |
| 9 | `tenure_days` | `integer` | Yes | `14` |
| 10 | `monthly_turnover` | `numeric` | Yes | — |
| 11 | `reason` | `character varying(255)` | Yes | — |
| 12 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 13 | `admin_note` | `text` | Yes | — |
| 14 | `approved_by` | `uuid` | Yes | — |
| 15 | `approved_at` | `timestamp with time zone` | Yes | — |
| 16 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `credit_ledgers`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Credit drawdowns, repayments, and outstanding principal

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `applicant_type` | `character varying(20)` | **No** | — |
| 3 | `applicant_id` | `uuid` | **No** | — |
| 4 | `bank_id` | `uuid` | **No** | — |
| 5 | `total_limit` | `numeric` | **No** | `0.00` |
| 6 | `utilized_amount` | `numeric` | **No** | `0.00` |
| 7 | `available_amount` | `numeric` | Yes | — |
| 8 | `due_date` | `timestamp with time zone` | Yes | — |
| 9 | `is_locked` | `boolean` | Yes | `false` |
| 10 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `credit_repayments`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Repayment transaction receipts from merchant to lender

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `ledger_id` | `uuid` | **No** | — |
| 3 | `payment_amount` | `numeric` | **No** | — |
| 4 | `transaction_ref` | `character varying(100)` | **No** | — |
| 5 | `payment_mode` | `character varying(30)` | **No** | — |
| 6 | `status` | `character varying(30)` | Yes | `'SUCCESS'` |
| 7 | `paid_at` | `timestamp with time zone` | Yes | `now()` |

---

### `distributor_products`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Distributor active stock catalog, wholesale selling prices, and distributor margins

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('distributor_products_id_seq')` |
| 2 | `distributor_id` | `integer` | Yes | — |
| 3 | `product_name` | `character varying(255)` | Yes | — |
| 4 | `sku` | `character varying(100)` | Yes | — |
| 5 | `category` | `character varying(100)` | Yes | — |
| 6 | `price` | `numeric` | Yes | `0` |
| 7 | `stock` | `integer` | Yes | `0` |
| 8 | `status` | `character varying(50)` | Yes | `'ACTIVE'` |
| 9 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 11 | `product_id` | `integer` | Yes | — |
| 12 | `stock_quantity` | `integer` | Yes | `0` |
| 13 | `is_published` | `boolean` | Yes | `true` |

---

### `export_declarations`
* **Primary App:** Admin / B2B
* **Functional Domain:** Compliance & Export
* **Description:** Customs and cross-border trade shipment manifests

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `order_id` | `uuid` | Yes | — |
| 4 | `export_reference_no` | `character varying(100)` | **No** | — |
| 5 | `destination_country` | `character varying(100)` | **No** | — |
| 6 | `port_of_loading` | `character varying(100)` | **No** | — |
| 7 | `port_of_discharge` | `character varying(100)` | **No** | — |
| 8 | `incoterms` | `character varying(20)` | **No** | — |
| 9 | `hs_code` | `character varying(50)` | **No** | — |
| 10 | `fob_value_usd` | `numeric` | **No** | — |
| 11 | `cif_value_usd` | `numeric` | **No** | — |
| 12 | `shipping_bill_no` | `character varying(100)` | Yes | — |
| 13 | `customs_clearance_status` | `character varying(50)` | Yes | `'DRAFT'` |
| 14 | `phytosanitary_cert_no` | `character varying(100)` | Yes | — |
| 15 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 16 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `freight_shipments`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics
* **Description:** Inter-city freight linehaul truck shipments

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `shipment_manifest_no` | `character varying(100)` | **No** | — |
| 3 | `origin_store_id` | `uuid` | **No** | — |
| 4 | `destination_hub_id` | `uuid` | Yes | — |
| 5 | `transporter_name` | `character varying(150)` | **No** | — |
| 6 | `vehicle_number` | `character varying(50)` | **No** | — |
| 7 | `driver_name` | `character varying(100)` | **No** | — |
| 8 | `driver_phone` | `character varying(20)` | **No** | — |
| 9 | `total_weight_kg` | `numeric` | **No** | — |
| 10 | `freight_charges` | `numeric` | **No** | — |
| 11 | `dispatch_status` | `character varying(50)` | Yes | `'SCHEDULED'` |
| 12 | `dispatched_at` | `timestamp with time zone` | Yes | — |
| 13 | `expected_arrival_at` | `timestamp with time zone` | Yes | — |
| 14 | `actual_delivered_at` | `timestamp with time zone` | Yes | — |
| 15 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `manage_b2b_purchase_order`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Formal purchase order contracts generated between commercial parties

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b2b_purchase_order_id_seq')` |
| 2 | `order_number` | `character varying(100)` | Yes | — |
| 3 | `distributor_id` | `integer` | Yes | — |
| 4 | `manufacturer_id` | `integer` | Yes | — |
| 5 | `total_amount` | `numeric` | Yes | `0` |
| 6 | `status` | `character varying(50)` | Yes | `'PENDING'` |
| 7 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 8 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 9 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `item_count` | `integer` | Yes | `1` |
| 11 | `notes` | `text` | Yes | — |
| 12 | `delivery_date` | `date` | Yes | — |
| 13 | `fk_supplier_detail` | `integer` | Yes | — |
| 14 | `fk_shop_detail` | `integer` | Yes | — |
| 15 | `tax` | `numeric` | Yes | `0` |
| 16 | `grand_total` | `numeric` | Yes | `0` |
| 17 | `paid_amount` | `numeric` | Yes | `0` |
| 18 | `due_amount` | `numeric` | Yes | `0` |
| 19 | `payment_status` | `character varying(50)` | Yes | `'UNPAID'` |
| 20 | `po_number` | `character varying(100)` | Yes | — |

---

### `manage_b2b_purchase_order_detail`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Line item specifications, MOQs, and batch criteria on purchase orders

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b2b_purchase_order_detail_id_seq')` |
| 2 | `fk_purchase_order` | `integer` | Yes | — |
| 3 | `product_id` | `integer` | Yes | — |
| 4 | `product_name` | `character varying(255)` | Yes | — |
| 5 | `quantity` | `integer` | Yes | — |
| 6 | `price` | `numeric` | Yes | — |
| 7 | `tax` | `numeric` | Yes | — |
| 8 | `grand_total` | `numeric` | Yes | — |
| 9 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `fk_product` | `integer` | Yes | — |
| 11 | `unit_price` | `numeric` | Yes | — |

---

### `manage_b_to_b_audit_logs`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Security & Audit
* **Description:** Administrative and operational audit trail for B2B platform actions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_audit_logs_id_seq')` |
| 2 | `user_id` | `integer` | Yes | — |
| 3 | `action` | `character varying(255)` | Yes | — |
| 4 | `details` | `text` | Yes | — |
| 5 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 6 | `user_role` | `character varying(50)` | Yes | — |
| 7 | `entity_type` | `character varying(100)` | Yes | — |
| 8 | `entity_id` | `integer` | Yes | — |
| 9 | `ip_address` | `character varying(50)` | Yes | — |
| 10 | `metadata` | `jsonb` | Yes | — |
| 11 | `resource` | `character varying(100)` | Yes | — |
| 12 | `resource_id` | `character varying(100)` | Yes | — |

---

### `manage_b_to_b_cart`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Orders & Checkout
* **Description:** Wholesale buyer restock cart holding case-lot quantities

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_cart_id_seq')` |
| 2 | `distributor_id` | `integer` | **No** | — |
| 3 | `product_id` | `integer` | Yes | — |
| 4 | `quantity` | `integer` | Yes | `1` |
| 5 | `unit_price` | `numeric` | Yes | `0` |
| 6 | `active` | `boolean` | Yes | `true` |
| 7 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 8 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_categories`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Master Catalog
* **Description:** Wholesale and bulk FMCG product categories

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_categories_id_seq')` |
| 2 | `category_name` | `character varying(255)` | **No** | — |
| 3 | `description` | `text` | Yes | — |
| 4 | `image_url` | `text` | Yes | — |
| 5 | `active` | `boolean` | Yes | `true` |
| 6 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 7 | `deleted_by` | `integer` | Yes | — |
| 8 | `manufacturer_id` | `integer` | Yes | — |
| 9 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_contact_submissions`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Prospective manufacturer and distributor onboarding inquiries

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_contact_submissions_id_seq')` |
| 2 | `name` | `character varying(255)` | Yes | — |
| 3 | `email` | `character varying(255)` | Yes | — |
| 4 | `phone` | `character varying(20)` | Yes | — |
| 5 | `message` | `text` | Yes | — |
| 6 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 7 | `user_id` | `integer` | Yes | — |
| 8 | `status` | `character varying(50)` | Yes | `'pending'` |

---

### `manage_b_to_b_credit_notes`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Settlements & Banking
* **Description:** Trade returns, damaged case deductions, and scheme credit notes

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_credit_notes_id_seq')` |
| 2 | `credit_note_number` | `character varying(100)` | Yes | — |
| 3 | `invoice_id` | `integer` | Yes | — |
| 4 | `manufacturer_id` | `integer` | Yes | — |
| 5 | `distributor_id` | `integer` | Yes | — |
| 6 | `shop_id` | `integer` | Yes | — |
| 7 | `amount` | `numeric` | Yes | `0` |
| 8 | `reason` | `text` | Yes | — |
| 9 | `status` | `character varying(50)` | Yes | `'approved'` |
| 10 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 11 | `created_by` | `integer` | Yes | — |
| 12 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_drivers`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics
* **Description:** Commercial heavy transport truck drivers and contact details

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_drivers_id_seq')` |
| 2 | `owner_id` | `integer` | Yes | — |
| 3 | `logistics_provider_id` | `integer` | Yes | — |
| 4 | `driver_name` | `character varying(255)` | Yes | — |
| 5 | `mobile` | `character varying(20)` | Yes | — |
| 6 | `license_number` | `character varying(100)` | Yes | — |
| 7 | `license_expiry_date` | `date` | Yes | — |
| 8 | `aadhaar_number` | `character varying(100)` | Yes | — |
| 9 | `emergency_contact` | `character varying(20)` | Yes | — |
| 10 | `is_available` | `boolean` | Yes | `true` |
| 11 | `status` | `character varying(50)` | Yes | `'active'` |
| 12 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 13 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 14 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_invoices`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Invoicing & Tax
* **Description:** GST e-invoices with IRN, e-Way bills, and HSN tax distributions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_invoices_id_seq')` |
| 2 | `invoice_number` | `character varying(100)` | Yes | — |
| 3 | `order_id` | `integer` | Yes | — |
| 4 | `distributor_id` | `integer` | Yes | — |
| 5 | `manufacturer_id` | `integer` | Yes | — |
| 6 | `shop_id` | `integer` | Yes | — |
| 7 | `settlement_id` | `integer` | Yes | — |
| 8 | `total_amount` | `numeric` | Yes | `0` |
| 9 | `subtotal` | `numeric` | Yes | `0` |
| 10 | `tax_amount` | `numeric` | Yes | `0` |
| 11 | `gst_percentage` | `numeric` | Yes | `0` |
| 12 | `status` | `character varying(50)` | Yes | `'issued'` |
| 13 | `due_date` | `date` | Yes | — |
| 14 | `invoice_pdf_url` | `text` | Yes | — |
| 15 | `items_json` | `jsonb` | Yes | — |
| 16 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 17 | `created_by` | `integer` | Yes | — |
| 18 | `modified_at` | `timestamp without time zone` | Yes | — |
| 19 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_ledger_entries`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Double-entry general ledger for B2B accounts receivable & payable

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_ledger_entries_id_seq')` |
| 2 | `distributor_id` | `integer` | Yes | — |
| 3 | `shop_id` | `integer` | Yes | — |
| 4 | `type` | `character varying(50)` | Yes | — |
| 5 | `reference_id` | `integer` | Yes | — |
| 6 | `description` | `text` | Yes | — |
| 7 | `debit` | `numeric` | Yes | `0` |
| 8 | `credit` | `numeric` | Yes | `0` |
| 9 | `balance` | `numeric` | Yes | `0` |
| 10 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_logistics_providers`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics
* **Description:** Commercial freight linehaul logistics fleet companies

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_logistics_providers_id_seq')` |
| 2 | `owner_id` | `integer` | Yes | — |
| 3 | `provider_name` | `character varying(255)` | Yes | — |
| 4 | `contact_person` | `character varying(255)` | Yes | — |
| 5 | `mobile` | `character varying(20)` | Yes | — |
| 6 | `email` | `character varying(255)` | Yes | — |
| 7 | `address` | `text` | Yes | — |
| 8 | `gst_number` | `character varying(100)` | Yes | — |
| 9 | `active_status` | `boolean` | Yes | `true` |
| 10 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 11 | `updated_at` | `timestamp without time zone` | Yes | — |
| 12 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_order_items`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Orders & Fulfillment
* **Description:** Case pack quantities, trade discounts, and tax lines on B2B orders

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_order_items_id_seq')` |
| 2 | `order_id` | `integer` | Yes | — |
| 3 | `product_id` | `integer` | Yes | — |
| 4 | `product_name` | `character varying(255)` | Yes | — |
| 5 | `quantity` | `integer` | **No** | — |
| 6 | `unit_price` | `numeric` | **No** | — |
| 7 | `total_price` | `numeric` | **No** | — |
| 8 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_order_status_history`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Orders & Fulfillment
* **Description:** State tracking of wholesale orders (CONFIRMED, INVOICED, DISPATCHED, DELIVERED)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_order_status_history_id_seq')` |
| 2 | `order_id` | `integer` | Yes | — |
| 3 | `status` | `character varying(50)` | **No** | — |
| 4 | `notes` | `text` | Yes | — |
| 5 | `updated_by` | `integer` | Yes | — |
| 6 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_orders`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Orders & Fulfillment
* **Description:** Commercial B2B restock orders placed by retailers with distributors

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_orders_id_seq')` |
| 2 | `order_number` | `character varying(100)` | **No** | — |
| 3 | `distributor_id` | `integer` | **No** | — |
| 4 | `manufacturer_id` | `integer` | **No** | — |
| 5 | `shop_id` | `integer` | Yes | — |
| 6 | `total_amount` | `numeric` | Yes | `0` |
| 7 | `tax_amount` | `numeric` | Yes | `0` |
| 8 | `discount_amount` | `numeric` | Yes | `0` |
| 9 | `final_amount` | `numeric` | Yes | `0` |
| 10 | `status` | `character varying(50)` | Yes | `'PENDING'` |
| 11 | `payment_status` | `character varying(50)` | Yes | `'UNPAID'` |
| 12 | `delivery_mode` | `character varying(50)` | Yes | `'Standard Ground Shipping'` |
| 13 | `payment_mode` | `character varying(50)` | Yes | `'CASH'` |
| 14 | `tracking_number` | `character varying(100)` | Yes | — |
| 15 | `shipping_address` | `text` | Yes | — |
| 16 | `active` | `boolean` | Yes | `true` |
| 17 | `order_date` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 18 | `created_by` | `integer` | Yes | — |
| 19 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 20 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 21 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 22 | `delivery_charge` | `numeric` | Yes | `0.00` |

---

### `manage_b_to_b_payment_allocations`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Payments & Settlements
* **Description:** Accounting allocation linking bulk payments to outstanding invoices

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_payment_allocations_id_seq')` |
| 2 | `payment_id` | `integer` | Yes | — |
| 3 | `invoice_id` | `integer` | Yes | — |
| 4 | `allocated_amount` | `numeric` | Yes | `0` |
| 5 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_payments`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Payments & Settlements
* **Description:** Commercial payments (NEFT/RTGS, UPI, Trade Credit Drawdowns)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_payments_id_seq')` |
| 2 | `distributor_id` | `integer` | Yes | — |
| 3 | `shop_id` | `integer` | Yes | — |
| 4 | `manufacturer_id` | `integer` | Yes | — |
| 5 | `invoice_id` | `integer` | Yes | — |
| 6 | `amount` | `numeric` | Yes | `0` |
| 7 | `mode` | `character varying(50)` | Yes | — |
| 8 | `reference_id` | `character varying(120)` | Yes | — |
| 9 | `status` | `character varying(50)` | Yes | `'completed'` |
| 10 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 11 | `created_by` | `integer` | Yes | — |
| 12 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_payouts`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Settlements & Banking
* **Description:** Disbursements from escrow to manufacturer bank accounts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_payouts_id_seq')` |
| 2 | `settlement_id` | `integer` | Yes | — |
| 3 | `amount` | `numeric` | Yes | `0` |
| 4 | `status` | `character varying(50)` | Yes | `'completed'` |
| 5 | `transaction_ref` | `character varying(120)` | Yes | — |
| 6 | `failure_reason` | `text` | Yes | — |
| 7 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 8 | `created_by` | `integer` | Yes | — |

---

### `manage_b_to_b_request_access`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Retailer applications requesting permission to purchase from brand distributors

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_request_access_id_seq')` |
| 2 | `distributor_id` | `integer` | Yes | — |
| 3 | `manufacturer_id` | `integer` | Yes | — |
| 4 | `name` | `character varying(255)` | Yes | — |
| 5 | `email_distributer` | `character varying(255)` | Yes | — |
| 6 | `email_manufacturer` | `character varying(255)` | Yes | — |
| 7 | `description` | `text` | Yes | — |
| 8 | `unique_request_id` | `character varying(100)` | Yes | — |
| 9 | `distributer_request` | `integer` | Yes | `1` |
| 10 | `manufacture_request` | `integer` | Yes | `1` |
| 11 | `request_type` | `character varying(50)` | Yes | `'CONNECTION'` |
| 12 | `status` | `character varying(50)` | Yes | `'PENDING'` |
| 13 | `proposed_price` | `numeric` | Yes | — |
| 14 | `counter_price` | `numeric` | Yes | — |
| 15 | `notes` | `text` | Yes | — |
| 16 | `active` | `boolean` | Yes | `true` |
| 17 | `created_by` | `integer` | Yes | — |
| 18 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 19 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 20 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 21 | `distributor_tier` | `character varying(50)` | Yes | `'Bronze'` |
| 22 | `product_id` | `integer` | Yes | — |
| 23 | `product_name` | `character varying(255)` | Yes | — |
| 24 | `quantity` | `integer` | Yes | — |
| 25 | `target_price` | `numeric` | Yes | — |
| 26 | `deadline` | `timestamp without time zone` | Yes | — |
| 27 | `negotiation_history` | `jsonb` | Yes | `'[]'` |

---

### `manage_b_to_b_settlements`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Settlements & Banking
* **Description:** Commercial reconciliation and trade payout settlement records

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_settlements_id_seq')` |
| 2 | `settlement_number` | `character varying(100)` | Yes | — |
| 3 | `manufacturer_id` | `integer` | Yes | — |
| 4 | `shop_id` | `integer` | Yes | — |
| 5 | `total_invoice_amount` | `numeric` | Yes | `0` |
| 6 | `total_collected` | `numeric` | Yes | `0` |
| 7 | `commission` | `numeric` | Yes | `0` |
| 8 | `pg_charges` | `numeric` | Yes | `0` |
| 9 | `returns_amount` | `numeric` | Yes | `0` |
| 10 | `tds` | `numeric` | Yes | `0` |
| 11 | `net_payable` | `numeric` | Yes | `0` |
| 12 | `status` | `character varying(50)` | Yes | `'pending'` |
| 13 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 14 | `created_by` | `integer` | Yes | — |
| 15 | `modified_at` | `timestamp without time zone` | Yes | — |
| 16 | `modified_by` | `integer` | Yes | — |
| 17 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 18 | `deleted_by` | `integer` | Yes | — |

---

### `manage_b_to_b_subcategories`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Master Catalog
* **Description:** Granular subcategories for wholesale commodities

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_subcategories_id_seq')` |
| 2 | `category_id` | `integer` | Yes | — |
| 3 | `subcategory_name` | `character varying(255)` | **No** | — |
| 4 | `description` | `text` | Yes | — |
| 5 | `image_url` | `text` | Yes | — |
| 6 | `active` | `boolean` | Yes | `true` |
| 7 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 8 | `deleted_by` | `integer` | Yes | — |
| 9 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `manage_b_to_b_support_tickets`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Helpdesk & Support
* **Description:** Commercial dispute tickets regarding damaged cases or pricing errors

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_support_tickets_id_seq')` |
| 2 | `user_id` | `integer` | Yes | — |
| 3 | `subject` | `character varying(255)` | Yes | — |
| 4 | `status` | `character varying(50)` | Yes | `'OPEN'` |
| 5 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 6 | `attachment` | `text` | Yes | — |
| 7 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 8 | `message` | `text` | Yes | — |

---

### `manage_b_to_b_user_type`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Identity & Roles
* **Description:** Wholesale role classifications (Manufacturer, Primary Distributor, Super Stockist, Retailer)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_user_type_id_seq')` |
| 2 | `typename` | `character varying(100)` | **No** | — |
| 3 | `description` | `text` | Yes | — |
| 4 | `active` | `boolean` | Yes | `true` |
| 5 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_userdetail`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Enterprise business profile, GSTIN, owner KYC, and geolocation for distributors

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_userdetail_id_seq')` |
| 2 | `business_type_id` | `integer` | Yes | — |
| 3 | `company_name` | `character varying(255)` | Yes | — |
| 4 | `owner_name` | `character varying(255)` | Yes | — |
| 5 | `email` | `character varying(255)` | Yes | — |
| 6 | `mobile` | `character varying(20)` | Yes | — |
| 7 | `password` | `character varying(255)` | Yes | — |
| 8 | `gst_number` | `character varying(50)` | Yes | — |
| 9 | `pan_number` | `character varying(50)` | Yes | — |
| 10 | `kyc_status` | `character varying(50)` | Yes | `'PENDING'` |
| 11 | `address` | `text` | Yes | — |
| 12 | `city` | `character varying(100)` | Yes | — |
| 13 | `state` | `character varying(100)` | Yes | — |
| 14 | `country` | `character varying(100)` | Yes | `'India'` |
| 15 | `pincode` | `character varying(20)` | Yes | — |
| 16 | `age` | `integer` | Yes | — |
| 17 | `gender` | `character varying(20)` | Yes | — |
| 18 | `personal_contact` | `character varying(20)` | Yes | — |
| 19 | `personal_email` | `character varying(255)` | Yes | — |
| 20 | `bank_name` | `character varying(255)` | Yes | — |
| 21 | `refresh_token` | `character varying(255)` | Yes | — |
| 22 | `bank_account_no` | `character varying(100)` | Yes | — |
| 23 | `ifsc_code` | `character varying(50)` | Yes | — |
| 24 | `active` | `boolean` | Yes | `true` |
| 25 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 26 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 27 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 28 | `latitude` | `numeric` | Yes | — |
| 29 | `longitude` | `numeric` | Yes | — |
| 30 | `fk_state` | `integer` | Yes | — |
| 31 | `fk_city` | `integer` | Yes | — |
| 32 | `serviceable_pincodes` | `ARRAY` | Yes | — |
| 33 | `is_featured` | `boolean` | Yes | `false` |
| 34 | `campaign_id` | `integer` | Yes | — |
| 35 | `company_logo` | `character varying(500)` | Yes | — |
| 36 | `international_business` | `boolean` | Yes | `false` |
| 37 | `wish_to_export_countries` | `text` | Yes | — |
| 38 | `vat_number` | `character varying(100)` | Yes | — |
| 39 | `export_hs_code` | `character varying(100)` | Yes | — |
| 40 | `preferred_currency` | `character varying(10)` | Yes | `'INR'` |
| 41 | `market_scope` | `character varying(50)` | Yes | `'domestic'` |
| 42 | `product_category` | `character varying(255)` | Yes | — |
| 43 | `contact_person` | `character varying(255)` | Yes | — |

---

### `manage_b_to_b_vehicle_routes`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics
* **Description:** Wholesale delivery truck dispatch routes, waypoints, and drop sequences

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_vehicle_routes_id_seq')` |
| 2 | `owner_id` | `integer` | Yes | — |
| 3 | `vehicle_id` | `integer` | Yes | — |
| 4 | `driver_id` | `integer` | Yes | — |
| 5 | `order_id` | `integer` | Yes | — |
| 6 | `route_name` | `character varying(255)` | Yes | — |
| 7 | `source_location` | `character varying(255)` | Yes | — |
| 8 | `destination_location` | `character varying(255)` | Yes | — |
| 9 | `waypoints` | `jsonb` | Yes | — |
| 10 | `estimated_distance_km` | `numeric` | Yes | — |
| 11 | `estimated_time_hours` | `numeric` | Yes | — |
| 12 | `status` | `character varying(50)` | Yes | `'SCHEDULED'` |
| 13 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_b_to_b_vehicles`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics
* **Description:** Commercial vehicles, payload capacity (tons), and registration details

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_vehicles_id_seq')` |
| 2 | `owner_id` | `integer` | Yes | — |
| 3 | `logistics_provider_id` | `integer` | Yes | — |
| 4 | `driver_id` | `integer` | Yes | — |
| 5 | `vehicle_number` | `character varying(100)` | Yes | — |
| 6 | `vehicle_type` | `character varying(100)` | Yes | — |
| 7 | `capacity` | `character varying(100)` | Yes | — |
| 8 | `insurance_expiry_date` | `date` | Yes | — |
| 9 | `permit_expiry_date` | `date` | Yes | — |
| 10 | `is_available` | `boolean` | Yes | `true` |
| 11 | `status` | `character varying(50)` | Yes | `'active'` |
| 12 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 13 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 14 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `manage_manufacturer_products`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Manufacturer factory-gate product catalog and case packaging specs

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_manufacturer_products_id_seq')` |
| 2 | `manufacturer_id` | `integer` | **No** | — |
| 3 | `category_id` | `integer` | Yes | — |
| 4 | `subcategory_id` | `integer` | Yes | — |
| 5 | `category` | `character varying(255)` | Yes | — |
| 6 | `sub_category` | `character varying(255)` | Yes | — |
| 7 | `product_name` | `character varying(255)` | **No** | — |
| 8 | `sku` | `character varying(100)` | Yes | — |
| 9 | `description` | `text` | Yes | — |
| 10 | `unit` | `character varying(50)` | Yes | `'pcs'` |
| 11 | `price` | `numeric` | Yes | `0` |
| 12 | `mrp` | `numeric` | Yes | `0` |
| 13 | `moq` | `integer` | Yes | `1` |
| 14 | `total_stock` | `integer` | Yes | `0` |
| 15 | `stock_quantity` | `integer` | Yes | `0` |
| 16 | `north_hub` | `integer` | Yes | `0` |
| 17 | `south_hub` | `integer` | Yes | `0` |
| 18 | `central_hub` | `integer` | Yes | `0` |
| 19 | `image_url` | `text` | Yes | — |
| 20 | `image` | `text` | Yes | — |
| 21 | `product_image` | `text` | Yes | — |
| 22 | `status` | `character varying(50)` | Yes | `'active'` |
| 23 | `active` | `boolean` | Yes | `true` |
| 24 | `created_by` | `integer` | Yes | — |
| 25 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 26 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 27 | `deleted_at` | `timestamp without time zone` | Yes | — |
| 28 | `warehouse_stock` | `jsonb` | Yes | `'{}'` |
| 29 | `international_selling` | `boolean` | Yes | `false` |
| 30 | `international_price` | `numeric` | Yes | — |
| 31 | `export_hs_code` | `character varying(100)` | Yes | — |
| 32 | `hsn_code` | `character varying(100)` | Yes | — |
| 33 | `gst_rate` | `numeric` | Yes | — |
| 34 | `tier_pricing` | `jsonb` | Yes | — |
| 35 | `modified_by` | `integer` | Yes | — |
| 36 | `deleted_by` | `integer` | Yes | — |
| 37 | `manufacturer_price` | `numeric` | Yes | — |
| 38 | `distributor_price` | `numeric` | Yes | — |
| 39 | `retail_price` | `numeric` | Yes | — |

---

### `master_catalog_items`
* **Primary App:** Shared (Admin / Seller / B2B)
* **Functional Domain:** Master Catalog
* **Description:** Central barcode catalog with standard MRP and packaging

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `barcode` | `character varying(50)` | Yes | — |
| 3 | `product_name` | `character varying(255)` | **No** | — |
| 4 | `brand_name` | `character varying(100)` | **No** | — |
| 5 | `category_id` | `integer` | Yes | — |
| 6 | `printed_mrp` | `numeric` | **No** | — |
| 7 | `standard_unit` | `character varying(20)` | Yes | `'pcs'` |
| 8 | `default_image_url` | `text` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `partner_brand_contracts`
* **Primary App:** Admin / B2B
* **Functional Domain:** Wholesale & B2B
* **Description:** Direct brand tie-ups, SLA commitments, margin splits

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `brand_id` | `uuid` | **No** | — |
| 3 | `store_id` | `uuid` | **No** | — |
| 4 | `authorized_tier` | `character varying(50)` | Yes | `'SILVER_DEALER'` |
| 5 | `commission_rebate_pct` | `numeric` | Yes | `3.50` |
| 6 | `minimum_monthly_stock_units` | `integer` | Yes | `50` |
| 7 | `exclusive_territory_pincode` | `character varying(20)` | Yes | — |
| 8 | `contract_start_date` | `date` | **No** | — |
| 9 | `contract_end_date` | `date` | **No** | — |
| 10 | `status` | `character varying(50)` | Yes | `'ACTIVE'` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `partner_packs`
* **Primary App:** Seller / B2B
* **Functional Domain:** Catalog & Inventory
* **Description:** Combo packs and wholesale bulk bundled packages

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `source_brand_store_id` | `uuid` | **No** | — |
| 4 | `source_listing_id` | `uuid` | **No** | — |
| 5 | `custom_sell_price` | `numeric` | **No** | — |
| 6 | `is_active` | `boolean` | Yes | `true` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `razorpay_checkout_orders`
* **Primary App:** Shared (Customer / Seller / B2B)
* **Functional Domain:** Payments & Settlements
* **Description:** Mapping Razorpay gateway order IDs to internal platform orders

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('razorpay_checkout_orders_id_seq')` |
| 2 | `checkout_id` | `integer` | **No** | — |
| 3 | `order_id` | `integer` | **No** | — |
| 4 | `manufacturer_id` | `integer` | **No** | — |
| 5 | `order_amount_paise` | `bigint` | **No** | — |
| 6 | `order_amount_rupees` | `numeric` | **No** | — |
| 7 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `razorpay_checkouts`
* **Primary App:** Shared (Customer / Seller / B2B)
* **Functional Domain:** Payments & Settlements
* **Description:** Razorpay PG checkout sessions and pre-charge authentication

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('razorpay_checkouts_id_seq')` |
| 2 | `distributor_id` | `integer` | **No** | — |
| 3 | `razorpay_order_id` | `character varying(100)` | Yes | — |
| 4 | `razorpay_payment_id` | `character varying(100)` | Yes | — |
| 5 | `amount_paise` | `bigint` | **No** | — |
| 6 | `amount_rupees` | `numeric` | **No** | — |
| 7 | `currency` | `character varying(10)` | **No** | `'INR'` |
| 8 | `status` | `character varying(30)` | Yes | `'INITIATED'` |
| 9 | `payment_method` | `character varying(50)` | Yes | — |
| 10 | `signature_verified` | `boolean` | Yes | `false` |
| 11 | `webhook_verified` | `boolean` | Yes | `false` |
| 12 | `verification_source` | `character varying(20)` | Yes | — |
| 13 | `verified_at` | `timestamp without time zone` | Yes | — |
| 14 | `failure_reason` | `text` | Yes | — |
| 15 | `error_code` | `character varying(100)` | Yes | — |
| 16 | `error_description` | `text` | Yes | — |
| 17 | `idempotency_key` | `character varying(100)` | Yes | — |
| 18 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 19 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 20 | `captured_at` | `timestamp without time zone` | Yes | — |

---

### `relationship_credits`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** B2B Financing & Credit
* **Description:** Direct bilateral merchant-distributor credit limits and credit terms

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('relationship_credits_id_seq')` |
| 2 | `creditor_id` | `integer` | **No** | — |
| 3 | `debtor_id` | `integer` | **No** | — |
| 4 | `debtor_type` | `character varying(50)` | **No** | — |
| 5 | `credit_limit` | `numeric` | Yes | `0` |
| 6 | `credit_days` | `integer` | Yes | `30` |
| 7 | `outstanding_amount` | `numeric` | Yes | `0` |
| 8 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 9 | `modified_at` | `timestamp without time zone` | Yes | — |

---

### `shopdetail`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Retail kirana shop details linked to upstream distributor accounts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('shopdetail_id_seq')` |
| 2 | `shop_name` | `character varying(255)` | Yes | — |
| 3 | `email_id` | `character varying(255)` | Yes | — |
| 4 | `owner_name` | `character varying(255)` | Yes | — |
| 5 | `mobile_number` | `character varying(20)` | Yes | — |
| 6 | `active` | `boolean` | Yes | `true` |
| 7 | `delete_at` | `timestamp without time zone` | Yes | — |
| 8 | `shop_address` | `text` | Yes | — |
| 9 | `address` | `text` | Yes | — |
| 10 | `mobile_no` | `character varying(20)` | Yes | — |
| 11 | `pincode` | `character varying(20)` | Yes | — |
| 12 | `city` | `character varying(100)` | Yes | — |
| 13 | `state` | `character varying(100)` | Yes | — |
| 14 | `latitude` | `numeric` | Yes | — |
| 15 | `longitude` | `numeric` | Yes | — |
| 16 | `first_name` | `character varying(255)` | Yes | — |
| 17 | `gst_id` | `character varying(50)` | Yes | — |
| 18 | `fk_city` | `integer` | Yes | — |
| 19 | `fk_state` | `integer` | Yes | — |
| 20 | `fk_country` | `integer` | Yes | — |
| 21 | `password` | `character varying(255)` | Yes | — |
| 22 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 23 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `stock_purchase_order_items`
* **Primary App:** Seller / B2B
* **Functional Domain:** Wholesale & B2B
* **Description:** Line items within internal stock purchase orders

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `purchase_order_id` | `uuid` | **No** | — |
| 3 | `item_name` | `character varying(200)` | **No** | — |
| 4 | `sku` | `character varying(100)` | Yes | — |
| 5 | `unit_purchase_price` | `numeric` | **No** | — |
| 6 | `quantity_ordered` | `integer` | **No** | — |
| 7 | `quantity_received` | `integer` | Yes | `0` |
| 8 | `total_cost` | `numeric` | **No** | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `stock_purchase_orders`
* **Primary App:** Seller / B2B
* **Functional Domain:** Wholesale & B2B
* **Description:** Purchase orders from retail merchant to wholesale distributor

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `po_number` | `character varying(100)` | **No** | — |
| 3 | `store_id` | `uuid` | **No** | — |
| 4 | `supplier_id` | `uuid` | **No** | — |
| 5 | `total_amount` | `numeric` | **No** | — |
| 6 | `tax_amount` | `numeric` | Yes | `0.00` |
| 7 | `payment_mode` | `character varying(50)` | Yes | `'CREDIT_LINE'` |
| 8 | `status` | `character varying(50)` | Yes | `'PLACED'` |
| 9 | `expected_delivery` | `date` | Yes | — |
| 10 | `actual_delivered_at` | `timestamp with time zone` | Yes | — |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `stock_transfer_items`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Warehouses
* **Description:** Line items within inventory transfer manifests

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `transfer_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `quantity` | `numeric` | **No** | — |

---

### `stock_transfers`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Warehouses
* **Description:** Inter-warehouse and hub-to-store stock transfers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `transfer_number` | `character varying(50)` | **No** | — |
| 3 | `from_warehouse_id` | `uuid` | **No** | — |
| 4 | `to_warehouse_id` | `uuid` | **No** | — |
| 5 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 6 | `notes` | `text` | Yes | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `supplier_products`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** Wholesaler product catalog with tiered tier-pricing

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `supplier_id` | `uuid` | **No** | — |
| 3 | `product_name` | `character varying(255)` | **No** | — |
| 4 | `sku` | `character varying(100)` | Yes | — |
| 5 | `unit_cost` | `numeric` | **No** | — |
| 6 | `moq` | `integer` | Yes | `1` |
| 7 | `is_available` | `boolean` | Yes | `true` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `suppliers`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Wholesale & B2B
* **Description:** B2B wholesalers, FMCG distributors, millers, and farmers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `supplier_name` | `character varying(200)` | **No** | — |
| 3 | `contact_person` | `character varying(100)` | Yes | — |
| 4 | `phone` | `character varying(20)` | **No** | — |
| 5 | `email` | `character varying(150)` | Yes | — |
| 6 | `gstin` | `character varying(20)` | Yes | — |
| 7 | `city` | `character varying(100)` | **No** | — |
| 8 | `payment_terms` | `character varying(100)` | Yes | `'15_DAYS_CREDIT'` |
| 9 | `rating` | `numeric` | Yes | `5.00` |
| 10 | `is_active` | `boolean` | Yes | `true` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `territory_assignments`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Warehouses
* **Description:** Exclusive territory and pincode zone assignments for distributors

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('territory_assignments_id_seq')` |
| 2 | `manufacturer_id` | `integer` | Yes | — |
| 3 | `territory_name` | `character varying(255)` | Yes | — |
| 4 | `state` | `character varying(100)` | Yes | — |
| 5 | `city` | `character varying(100)` | Yes | — |
| 6 | `pincode` | `character varying(20)` | Yes | — |
| 7 | `state_id` | `integer` | Yes | — |
| 8 | `city_id` | `integer` | Yes | — |
| 9 | `distributor_id` | `integer` | Yes | — |
| 10 | `status` | `character varying(50)` | Yes | `'active'` |
| 11 | `active` | `boolean` | Yes | `true` |
| 12 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 13 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 14 | `deleted_at` | `timestamp without time zone` | Yes | — |

---

### `warehouses`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Warehouses
* **Description:** Wholesale regional fulfillment hubs and storage facilities

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `name` | `character varying(150)` | **No** | — |
| 4 | `code` | `character varying(50)` | Yes | — |
| 5 | `address_line` | `text` | **No** | — |
| 6 | `city` | `character varying(100)` | **No** | — |
| 7 | `pincode` | `character varying(10)` | **No** | — |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

## ADAB Customer Portal (21 Tables)

### `cart_events`
* **Primary App:** Customer / Analytics
* **Functional Domain:** Orders & Checkout
* **Description:** Cart abandonment tracking and real-time checkout telemetry

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `cart_id` | `uuid` | Yes | — |
| 3 | `user_id` | `uuid` | Yes | — |
| 4 | `action` | `character varying(50)` | **No** | — |
| 5 | `payload` | `jsonb` | Yes | — |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `cart_items`
* **Primary App:** Customer Portal
* **Functional Domain:** Orders & Checkout
* **Description:** Selected products, quantities, and applied seller discounts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `cart_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `quantity` | `numeric` | **No** | `1` |
| 5 | `added_at` | `timestamp with time zone` | Yes | `now()` |
| 6 | `variant_id` | `uuid` | Yes | — |

---

### `carts`
* **Primary App:** Customer Portal
* **Functional Domain:** Orders & Checkout
* **Description:** Active consumer shopping carts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `customer_id` | `uuid` | Yes | — |
| 3 | `session_token` | `character varying(255)` | Yes | — |
| 4 | `coupon_code` | `character varying(50)` | Yes | — |
| 5 | `delivery_speed` | `character varying(30)` | Yes | `'EXPRESS_30M'` |
| 6 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `catalog_stories_feed`
* **Primary App:** Customer Portal
* **Functional Domain:** Marketing & Feeds
* **Description:** Instagram-like interactive video reels and product stories

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `media_url` | `text` | **No** | — |
| 4 | `media_type` | `character varying(20)` | Yes | `'IMAGE'` |
| 5 | `caption` | `character varying(250)` | Yes | — |
| 6 | `linked_product_id` | `uuid` | Yes | — |
| 7 | `view_count` | `integer` | Yes | `0` |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 10 | `expires_at` | `timestamp with time zone` | Yes | `(now() + '24:00:00')` |

---

### `customer_addresses`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Saved delivery addresses for shoppers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `customer_id` | `uuid` | **No** | — |
| 3 | `label` | `character varying(50)` | Yes | `'Home'` |
| 4 | `recipient_name` | `character varying(150)` | **No** | — |
| 5 | `phone` | `character varying(20)` | **No** | — |
| 6 | `address_line` | `text` | **No** | — |
| 7 | `landmark` | `character varying(150)` | Yes | — |
| 8 | `city` | `character varying(100)` | **No** | — |
| 9 | `pincode` | `character varying(10)` | **No** | — |
| 10 | `is_default` | `boolean` | Yes | `false` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `customer_favorites`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Frequently reordered items and favorite kirana stores

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `customer_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `customer_profiles`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Shopper preferences, demographics, and VIP tiers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `preferred_language` | `character varying(10)` | Yes | `'en'` |
| 4 | `loyalty_tier` | `character varying(30)` | Yes | `'BRONZE'` |
| 5 | `date_of_birth` | `date` | Yes | — |
| 6 | `gender` | `character varying(20)` | Yes | — |
| 7 | `profile_picture_url` | `text` | Yes | — |
| 8 | `gst_in` | `character varying(15)` | Yes | — |
| 9 | `company_name` | `character varying(150)` | Yes | — |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `customer_wallets`
* **Primary App:** Customer Portal
* **Functional Domain:** Payments & Wallets
* **Description:** In-app pre-loaded rupee wallet for instant 1-tap checkout

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `customer_id` | `uuid` | **No** | — |
| 3 | `balance` | `numeric` | Yes | `0.00` |
| 4 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `guest_carts`
* **Primary App:** Customer Portal
* **Functional Domain:** Orders & Checkout
* **Description:** Anonymous unauthenticated visitor shopping sessions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `session_token` | `character varying(255)` | **No** | — |
| 3 | `payload` | `jsonb` | **No** | — |
| 4 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 5 | `expires_at` | `timestamp with time zone` | **No** | — |

---

### `payment_methods`
* **Primary App:** Customer Portal
* **Functional Domain:** Payments & Settlements
* **Description:** Configured payment gateways (UPI, Cards, NetBanking, COD)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `method_type` | `character varying(30)` | **No** | — |
| 4 | `provider` | `character varying(50)` | **No** | — |
| 5 | `token_reference` | `character varying(255)` | **No** | — |
| 6 | `last4` | `character varying(4)` | Yes | — |
| 7 | `expiry_month` | `integer` | Yes | — |
| 8 | `expiry_year` | `integer` | Yes | — |
| 9 | `is_default` | `boolean` | Yes | `false` |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `product_search_index`
* **Primary App:** Customer Portal
* **Functional Domain:** Search & Discovery
* **Description:** Full-text Elasticsearch/PostgreSQL search vector index

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | Yes | — |
| 3 | `search_vector` | `tsvector` | Yes | — |
| 4 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `refund_items`
* **Primary App:** Customer / Admin
* **Functional Domain:** Payments & Settlements
* **Description:** Item-level breakdown of refunded amounts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `refund_id` | `uuid` | **No** | — |
| 3 | `order_item_id` | `uuid` | **No** | — |
| 4 | `amount` | `numeric` | **No** | — |

---

### `refunds`
* **Primary App:** Customer / Admin
* **Functional Domain:** Payments & Settlements
* **Description:** Financial refund vouchers and UPI reverse transfers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | **No** | — |
| 3 | `return_id` | `uuid` | Yes | — |
| 4 | `amount` | `numeric` | **No** | — |
| 5 | `refund_mode` | `character varying(30)` | **No** | — |
| 6 | `gateway_refund_id` | `character varying(150)` | Yes | — |
| 7 | `status` | `character varying(30)` | Yes | `'INITIATED'` |
| 8 | `processed_at` | `timestamp with time zone` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `review_media`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Customer uploaded photos of received grocery items

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `review_id` | `uuid` | **No** | — |
| 3 | `media_url` | `text` | **No** | — |
| 4 | `media_type` | `character varying(20)` | Yes | `'IMAGE'` |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `reward_ledger`
* **Primary App:** Customer Portal
* **Functional Domain:** Promotions & Loyalty
* **Description:** Points accrual and redemption audit trail

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `points_change` | `integer` | **No** | — |
| 4 | `transaction_type` | `character varying(30)` | **No** | — |
| 5 | `reference_id` | `character varying(100)` | Yes | — |
| 6 | `balance_after` | `integer` | **No** | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `rewards_accounts`
* **Primary App:** Customer Portal
* **Functional Domain:** Promotions & Loyalty
* **Description:** Shopper loyalty rewards balance and tiers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `points_balance` | `integer` | Yes | `0` |
| 4 | `lifetime_earned` | `integer` | Yes | `0` |
| 5 | `tier` | `character varying(30)` | Yes | `'BRONZE'` |
| 6 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `rewards_ledger`
* **Primary App:** Customer Portal
* **Functional Domain:** Promotions & Loyalty
* **Description:** Extended multi-tier cashback audit ledger

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `points_change` | `integer` | **No** | — |
| 4 | `transaction_type` | `character varying(30)` | **No** | — |
| 5 | `reference_id` | `character varying(100)` | Yes | — |
| 6 | `balance_after` | `integer` | **No** | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `search_redirects`
* **Primary App:** Customer / Admin
* **Functional Domain:** Search & Discovery
* **Description:** URL search keyword query redirects

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `search_term` | `character varying(100)` | **No** | — |
| 3 | `redirect_url` | `text` | **No** | — |
| 4 | `is_active` | `boolean` | Yes | `true` |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `search_synonyms`
* **Primary App:** Customer / Admin
* **Functional Domain:** Search & Discovery
* **Description:** Vernacular and phonetic search synonyms (e.g. chaaval -> rice)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `primary_term` | `character varying(100)` | **No** | — |
| 3 | `synonyms` | `ARRAY` | **No** | — |
| 4 | `language_code` | `character varying(10)` | Yes | `'hi'` |
| 5 | `is_active` | `boolean` | Yes | `true` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `wishlist_items`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Product items saved inside consumer wishlists

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `wishlist_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `added_at` | `timestamp with time zone` | Yes | `now()` |

---

### `wishlists`
* **Primary App:** Customer Portal
* **Functional Domain:** Customer CRM
* **Description:** Saved consumer shopping wishlists

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

## ADAB Admin Portal (22 Tables)

### `audit_logs`
* **Primary App:** Admin Portal
* **Functional Domain:** Security & Audit
* **Description:** System-wide administrative action logs

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `actor_id` | `uuid` | Yes | — |
| 3 | `action` | `character varying(100)` | **No** | — |
| 4 | `entity_type` | `character varying(50)` | **No** | — |
| 5 | `entity_id` | `character varying(100)` | **No** | — |
| 6 | `changes` | `jsonb` | Yes | — |
| 7 | `ip_address` | `inet` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `carrier_service_levels`
* **Primary App:** Admin / Logistics
* **Functional Domain:** Geocoding & Logistics
* **Description:** Express 30-min, Same Day, Standard Next Day options

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `carrier_id` | `uuid` | Yes | — |
| 3 | `service_code` | `character varying(50)` | **No** | — |
| 4 | `service_name` | `character varying(100)` | **No** | — |
| 5 | `expected_days` | `integer` | Yes | `3` |
| 6 | `is_active` | `boolean` | Yes | `true` |

---

### `delivery_fleet_routes`
* **Primary App:** Admin / Logistics
* **Functional Domain:** Geocoding & Logistics
* **Description:** Dynamic TSP route optimization paths for delivery drivers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `driver_id` | `uuid` | **No** | — |
| 3 | `vehicle_type` | `character varying(50)` | **No** | — |
| 4 | `assigned_pincodes` | `ARRAY` | **No** | — |
| 5 | `total_assigned_stops` | `integer` | Yes | `0` |
| 6 | `completed_stops` | `integer` | Yes | `0` |
| 7 | `active_latitude` | `numeric` | Yes | — |
| 8 | `active_longitude` | `numeric` | Yes | — |
| 9 | `last_location_ping` | `timestamp with time zone` | Yes | — |
| 10 | `route_status` | `character varying(50)` | Yes | `'IDLE'` |
| 11 | `shift_date` | `date` | **No** | `CURRENT_DATE` |
| 12 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `feature_flags`
* **Primary App:** Admin Portal
* **Functional Domain:** Platform Config
* **Description:** Canary releases and beta feature toggles

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `flag_key` | `character varying(100)` | **No** | — |
| 3 | `description` | `text` | Yes | — |
| 4 | `is_enabled` | `boolean` | Yes | `false` |
| 5 | `target_roles` | `ARRAY` | Yes | `'{}'[]` |
| 6 | `target_pincodes` | `ARRAY` | Yes | `'{}'[]` |
| 7 | `percentage_rollout` | `integer` | Yes | `100` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 9 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `fraud_risk_events`
* **Primary App:** Admin Portal
* **Functional Domain:** Security & Audit
* **Description:** ML fraud scoring on suspicious COD orders or card chargebacks

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | Yes | — |
| 3 | `order_id` | `uuid` | Yes | — |
| 4 | `risk_score` | `numeric` | **No** | — |
| 5 | `flag_reason` | `character varying(255)` | **No** | — |
| 6 | `action_taken` | `character varying(50)` | Yes | `'FLAGGED'` |
| 7 | `evaluated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `login_attempts`
* **Primary App:** Admin Portal
* **Functional Domain:** Security & Audit
* **Description:** Security logging for brute-force rate-limiting

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `phone_or_email` | `character varying(150)` | **No** | — |
| 3 | `ip_address` | `inet` | **No** | — |
| 4 | `status` | `character varying(30)` | **No** | — |
| 5 | `failure_reason` | `character varying(150)` | Yes | — |
| 6 | `attempted_at` | `timestamp with time zone` | Yes | `now()` |

---

### `notification_templates`
* **Primary App:** Admin Portal
* **Functional Domain:** Communication & Chat
* **Description:** Multilingual notification copy templates (EN, HI, GU)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `event_key` | `character varying(100)` | **No** | — |
| 3 | `title_template` | `character varying(200)` | **No** | — |
| 4 | `body_template` | `text` | **No** | — |
| 5 | `sms_template` | `text` | Yes | — |
| 6 | `email_subject` | `character varying(200)` | Yes | — |
| 7 | `email_html` | `text` | Yes | — |
| 8 | `whatsapp_template_id` | `character varying(100)` | Yes | — |
| 9 | `is_active` | `boolean` | Yes | `true` |
| 10 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `oauth_clients`
* **Primary App:** Admin Portal
* **Functional Domain:** Identity & Access
* **Description:** Registered OAuth client applications

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `client_id` | `character varying(100)` | **No** | — |
| 3 | `client_secret_hash` | `character varying(255)` | **No** | — |
| 4 | `client_name` | `character varying(150)` | **No** | — |
| 5 | `redirect_uris` | `ARRAY` | **No** | — |
| 6 | `allowed_grant_types` | `ARRAY` | Yes | `'{authorization_code,refresh_token}'[]` |
| 7 | `is_active` | `boolean` | Yes | `true` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `payment_provider_accounts`
* **Primary App:** Admin Portal
* **Functional Domain:** Payments & Settlements
* **Description:** Merchant aggregator payment gateway credentials

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `provider_name` | `character varying(50)` | **No** | — |
| 3 | `merchant_id` | `character varying(100)` | **No** | — |
| 4 | `is_active` | `boolean` | Yes | `true` |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `payment_webhook_subscriptions`
* **Primary App:** Admin Portal
* **Functional Domain:** Payments & Settlements
* **Description:** PG webhook event handlers and signing secrets

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `provider_name` | `character varying(50)` | **No** | — |
| 3 | `webhook_url` | `text` | **No** | — |
| 4 | `secret_key_hash` | `character varying(255)` | Yes | — |
| 5 | `is_active` | `boolean` | Yes | `true` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `permissions`
* **Primary App:** Admin Portal
* **Functional Domain:** Identity & Access
* **Description:** Granular system privileges and permissions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('permissions_id_seq')` |
| 2 | `slug` | `character varying(100)` | **No** | — |
| 3 | `module` | `character varying(50)` | **No** | — |
| 4 | `description` | `text` | Yes | — |

---

### `platform_settings`
* **Primary App:** Admin Portal
* **Functional Domain:** Platform Config
* **Description:** Global commission rates, operational toggles, surge rules

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `key` | `character varying(100)` | **No** | — |
| 2 | `value` | `jsonb` | **No** | — |
| 3 | `description` | `text` | Yes | — |
| 4 | `updated_by` | `uuid` | Yes | — |
| 5 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `policy_violations`
* **Primary App:** Admin Portal
* **Functional Domain:** Compliance & KYC
* **Description:** Store compliance violations, counterfeit warnings, penalties

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | **No** | — |
| 3 | `violation_type` | `character varying(100)` | **No** | — |
| 4 | `severity` | `character varying(30)` | Yes | `'MEDIUM'` |
| 5 | `description` | `text` | **No** | — |
| 6 | `status` | `character varying(30)` | Yes | `'OPEN'` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `product_approval_history`
* **Primary App:** Admin Portal
* **Functional Domain:** Compliance & KYC
* **Description:** Audit log of admin approval/rejection of seller listings

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `listing_id` | `uuid` | **No** | — |
| 3 | `admin_id` | `uuid` | **No** | — |
| 4 | `previous_status` | `character varying(50)` | **No** | — |
| 5 | `new_status` | `character varying(50)` | **No** | — |
| 6 | `rejection_reason` | `text` | Yes | — |
| 7 | `notes` | `text` | Yes | — |
| 8 | `action_at` | `timestamp with time zone` | Yes | `now()` |

---

### `products`
* **Primary App:** Admin / Catalog
* **Functional Domain:** Master Catalog
* **Description:** Canonical system product definitions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `category_id` | `integer` | Yes | — |
| 3 | `brand_id` | `uuid` | Yes | — |
| 4 | `title` | `character varying(255)` | **No** | — |
| 5 | `slug` | `character varying(255)` | Yes | — |
| 6 | `description` | `text` | Yes | — |
| 7 | `barcode` | `character varying(50)` | Yes | — |
| 8 | `is_active` | `boolean` | Yes | `true` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 10 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `roles`
* **Primary App:** Admin Portal
* **Functional Domain:** Identity & Access
* **Description:** RBAC user roles (Admin, Merchant, Buyer, Wholesaler)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('roles_id_seq')` |
| 2 | `slug` | `character varying(50)` | **No** | — |
| 3 | `name` | `character varying(100)` | **No** | — |
| 4 | `description` | `text` | Yes | — |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `shipping_carriers`
* **Primary App:** Admin / Logistics
* **Functional Domain:** Geocoding & Logistics
* **Description:** 3PL delivery fleet providers (Dunzo, Shadowfax, Borzo)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `code` | `character varying(50)` | **No** | — |
| 3 | `name` | `character varying(100)` | **No** | — |
| 4 | `tracking_url_template` | `text` | Yes | — |
| 5 | `is_active` | `boolean` | Yes | `true` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `shipping_provider_accounts`
* **Primary App:** Admin / Logistics
* **Functional Domain:** Geocoding & Logistics
* **Description:** API keys and accounts for shipping logistics carriers

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `store_id` | `uuid` | Yes | — |
| 3 | `carrier_id` | `uuid` | Yes | — |
| 4 | `account_number` | `character varying(100)` | Yes | — |
| 5 | `is_active` | `boolean` | Yes | `true` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `support_assignments`
* **Primary App:** Admin Portal
* **Functional Domain:** Helpdesk & Support
* **Description:** Support rep allocation and queue balancing

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `ticket_id` | `uuid` | **No** | — |
| 3 | `admin_id` | `uuid` | **No** | — |
| 4 | `assigned_at` | `timestamp with time zone` | Yes | `now()` |
| 5 | `notes` | `text` | Yes | — |

---

### `tax_rules`
* **Primary App:** Admin Portal
* **Functional Domain:** Invoicing & Tax
* **Description:** State GST rates, HSN tax slab mappings

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `hsn_sac_code` | `character varying(50)` | **No** | — |
| 3 | `tax_name` | `character varying(100)` | **No** | — |
| 4 | `cgst_pct` | `numeric` | Yes | `0.00` |
| 5 | `sgst_pct` | `numeric` | Yes | `0.00` |
| 6 | `igst_pct` | `numeric` | Yes | `0.00` |
| 7 | `effective_from` | `date` | **No** | — |
| 8 | `is_active` | `boolean` | Yes | `true` |

---

### `taxonomy_versions`
* **Primary App:** Admin Portal
* **Functional Domain:** Catalog & Taxonomies
* **Description:** Versioned snapshots of the marketplace category and attribute taxonomy

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `version_tag` | `character varying(50)` | **No** | — |
| 2 | `description` | `text` | Yes | — |
| 3 | `migration_file` | `character varying(255)` | Yes | — |
| 4 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `user_roles`
* **Primary App:** Admin Portal
* **Functional Domain:** Identity & Access
* **Description:** M:N mapping between users and system roles

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `user_id` | `uuid` | **No** | — |
| 2 | `role_id` | `integer` | **No** | — |
| 3 | `assigned_at` | `timestamp with time zone` | Yes | `now()` |

---

## Shared Core Infrastructure & Commerce (31 Tables)

### `addresses`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Geocoding & Logistics
* **Description:** Physical geolocation address book

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `label` | `character varying(50)` | Yes | `'Home'` |
| 4 | `recipient_name` | `character varying(150)` | **No** | — |
| 5 | `phone` | `character varying(20)` | **No** | — |
| 6 | `address_line` | `text` | **No** | — |
| 7 | `landmark` | `character varying(150)` | Yes | — |
| 8 | `city` | `character varying(100)` | **No** | — |
| 9 | `state` | `character varying(100)` | Yes | — |
| 10 | `pincode` | `character varying(10)` | **No** | — |
| 11 | `latitude` | `numeric` | Yes | — |
| 12 | `longitude` | `numeric` | Yes | — |
| 13 | `is_default` | `boolean` | Yes | `false` |
| 14 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `audit_trail`
* **Primary App:** Shared / Admin
* **Functional Domain:** Security & Audit
* **Description:** Unified cross-portal compliance and security audit trail

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('audit_trail_id_seq')` |
| 2 | `user_id` | `integer` | Yes | — |
| 3 | `user_role` | `character varying(50)` | Yes | — |
| 4 | `action` | `character varying(100)` | Yes | — |
| 5 | `endpoint` | `character varying(255)` | Yes | — |
| 6 | `ip_address` | `character varying(50)` | Yes | — |
| 7 | `details` | `jsonb` | Yes | — |
| 8 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `auth_challenges`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** OTP challenges, SMS/Email verification nonces

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `phone` | `character varying(20)` | Yes | — |
| 3 | `email` | `character varying(255)` | Yes | — |
| 4 | `otp_code_hash` | `character varying(255)` | **No** | — |
| 5 | `challenge_type` | `character varying(30)` | **No** | — |
| 6 | `attempts` | `integer` | Yes | `0` |
| 7 | `is_used` | `boolean` | Yes | `false` |
| 8 | `expires_at` | `timestamp with time zone` | **No** | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `brands`
* **Primary App:** Shared (Admin / Seller / Customer)
* **Functional Domain:** Catalog & Taxonomies
* **Description:** FMCG brand registry (Amul, Tata, Aashirvaad, Maggi)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `slug` | `character varying(100)` | **No** | — |
| 3 | `name` | `character varying(150)` | **No** | — |
| 4 | `logo_url` | `text` | Yes | — |
| 5 | `description` | `text` | Yes | — |
| 6 | `is_active` | `boolean` | Yes | `true` |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `categories`
* **Primary App:** Shared (Admin / Seller / Customer)
* **Functional Domain:** Catalog & Taxonomies
* **Description:** Taxonomy hierarchy (Dairy, Pantry, Snacks, Beverages)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('categories_id_seq')` |
| 2 | `slug` | `character varying(100)` | **No** | — |
| 3 | `name` | `character varying(150)` | **No** | — |
| 4 | `parent_id` | `integer` | Yes | — |
| 5 | `icon_class` | `character varying(50)` | Yes | — |
| 6 | `image_url` | `text` | Yes | — |
| 7 | `is_active` | `boolean` | Yes | `true` |
| 8 | `display_order` | `integer` | Yes | `0` |
| 9 | `level` | `integer` | **No** | `1` |
| 10 | `materialized_path` | `character varying(500)` | Yes | — |
| 11 | `is_leaf` | `boolean` | Yes | `true` |
| 12 | `google_product_category_id` | `integer` | Yes | — |

---

### `category_aliases`
* **Primary App:** Shared (Admin / Seller / Customer)
* **Functional Domain:** Catalog & Taxonomies
* **Description:** Category alternative search terms and vernacular synonyms

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `category_id` | `integer` | **No** | — |
| 3 | `alias_term` | `character varying(255)` | **No** | — |
| 4 | `language_code` | `character varying(10)` | Yes | `'en'` |
| 5 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `city`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Geocoding & Logistics
* **Description:** Master registry of cities mapped to states for localized delivery

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('city_id_seq')` |
| 2 | `state_id` | `integer` | Yes | — |
| 3 | `city_name` | `character varying(100)` | **No** | — |
| 4 | `active` | `boolean` | Yes | `true` |
| 5 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `consents`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** DPDP Act user privacy and data consent audit log

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | Yes | — |
| 3 | `consent_type` | `character varying(50)` | **No** | — |
| 4 | `version` | `character varying(20)` | **No** | — |
| 5 | `is_granted` | `boolean` | Yes | `true` |
| 6 | `ip_address` | `inet` | Yes | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `file_uploads`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Media & Storage
* **Description:** MinIO/S3 object storage metadata and presigned URLs

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `uploader_id` | `uuid` | Yes | — |
| 3 | `file_type` | `character varying(50)` | **No** | — |
| 4 | `file_name` | `character varying(255)` | **No** | — |
| 5 | `storage_key` | `text` | **No** | — |
| 6 | `file_url` | `text` | **No** | — |
| 7 | `file_size_bytes` | `bigint` | Yes | — |
| 8 | `mime_type` | `character varying(100)` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `idempotency_keys`
* **Primary App:** Shared / All Portals
* **Functional Domain:** API Infrastructure
* **Description:** Prevents duplicate order creation or double payment charges

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `key` | `character varying(255)` | **No** | — |
| 3 | `user_id` | `uuid` | **No** | — |
| 4 | `request_path` | `character varying(255)` | **No** | — |
| 5 | `response_status_code` | `integer` | **No** | — |
| 6 | `response_body` | `jsonb` | **No** | — |
| 7 | `locked_until` | `timestamp with time zone` | **No** | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `message_threads`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Communication & Chat
* **Description:** Chat threads between Buyer, Seller, Driver, and Support

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `participant_a` | `uuid` | **No** | — |
| 3 | `participant_b` | `uuid` | **No** | — |
| 4 | `subject` | `character varying(200)` | Yes | — |
| 5 | `last_message_at` | `timestamp with time zone` | Yes | `now()` |

---

### `messages`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Communication & Chat
* **Description:** Individual chat messages, timestamps, and read receipts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `thread_id` | `uuid` | **No** | — |
| 3 | `sender_id` | `uuid` | **No** | — |
| 4 | `body` | `text` | **No** | — |
| 5 | `is_read` | `boolean` | Yes | `false` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `notification_deliveries`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Communication & Chat
* **Description:** Push notification (FCM), SMS, and WhatsApp delivery logs

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `notification_id` | `uuid` | **No** | — |
| 3 | `channel` | `character varying(30)` | **No** | — |
| 4 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 5 | `error_message` | `text` | Yes | — |
| 6 | `sent_at` | `timestamp with time zone` | Yes | — |

---

### `notification_preferences`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Communication & Chat
* **Description:** User channel opt-in/opt-out preferences

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `order_updates_sms` | `boolean` | Yes | `true` |
| 4 | `order_updates_email` | `boolean` | Yes | `true` |
| 5 | `order_updates_whatsapp` | `boolean` | Yes | `true` |
| 6 | `promotional_sms` | `boolean` | Yes | `false` |
| 7 | `promotional_email` | `boolean` | Yes | `false` |
| 8 | `promotional_whatsapp` | `boolean` | Yes | `false` |
| 9 | `soundbox_alerts` | `boolean` | Yes | `true` |
| 10 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `notifications`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Communication & Chat
* **Description:** In-app alert feed for orders, stock, and payouts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `title` | `character varying(150)` | **No** | — |
| 4 | `message` | `text` | **No** | — |
| 5 | `type` | `character varying(50)` | **No** | — |
| 6 | `is_read` | `boolean` | Yes | `false` |
| 7 | `action_url` | `text` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `order_items`
* **Primary App:** Shared (Customer / Seller)
* **Functional Domain:** Orders & Fulfillment
* **Description:** Purchased product lines, quantities, unit prices

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `seller_order_id` | `uuid` | **No** | — |
| 3 | `listing_id` | `uuid` | **No** | — |
| 4 | `product_name` | `character varying(255)` | **No** | — |
| 5 | `quantity` | `numeric` | **No** | — |
| 6 | `unit_price` | `numeric` | **No** | — |
| 7 | `total_price` | `numeric` | **No** | — |
| 8 | `variant_id` | `uuid` | Yes | — |

---

### `order_status_history`
* **Primary App:** Shared (Customer / Seller)
* **Functional Domain:** Orders & Fulfillment
* **Description:** FSM state changes (NEW -> ACCEPTED -> PACKED -> DELIVERED)

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | **No** | — |
| 3 | `seller_order_id` | `uuid` | Yes | — |
| 4 | `previous_status` | `character varying(50)` | **No** | — |
| 5 | `new_status` | `character varying(50)` | **No** | — |
| 6 | `changed_by_user_id` | `uuid` | Yes | — |
| 7 | `notes` | `text` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `orders`
* **Primary App:** Shared (Customer / Seller / Admin)
* **Functional Domain:** Orders & Fulfillment
* **Description:** Parent multi-store customer order manifest

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_number` | `character varying(30)` | **No** | — |
| 3 | `customer_id` | `uuid` | **No** | — |
| 4 | `delivery_address` | `jsonb` | **No** | — |
| 5 | `delivery_mode` | `character varying(30)` | Yes | `'EXPRESS_30M'` |
| 6 | `total_mrp` | `numeric` | **No** | — |
| 7 | `total_discount` | `numeric` | Yes | `0.00` |
| 8 | `delivery_fee` | `numeric` | Yes | `0.00` |
| 9 | `grand_total` | `numeric` | **No** | — |
| 10 | `payment_method` | `character varying(30)` | **No** | — |
| 11 | `payment_status` | `character varying(30)` | Yes | `'PENDING'` |
| 12 | `order_status` | `character varying(30)` | Yes | `'PLACED'` |
| 13 | `eta_minutes` | `integer` | Yes | `25` |
| 14 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 15 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `outbox_events`
* **Primary App:** Shared (Microservices)
* **Functional Domain:** Event Driven Outbox
* **Description:** Transactional outbox for reliable async domain event dispatching

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `aggregate_type` | `character varying(100)` | **No** | — |
| 3 | `aggregate_id` | `uuid` | **No** | — |
| 4 | `event_type` | `character varying(100)` | **No** | — |
| 5 | `payload` | `jsonb` | **No** | — |
| 6 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 7 | `retry_count` | `integer` | Yes | `0` |
| 8 | `error_message` | `text` | Yes | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 10 | `processed_at` | `timestamp with time zone` | Yes | — |

---

### `passkeys`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** WebAuthn biometric passkey credentials

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `credential_id` | `text` | **No** | — |
| 4 | `public_key` | `text` | **No** | — |
| 5 | `counter` | `bigint` | Yes | `0` |
| 6 | `transports` | `ARRAY` | Yes | — |
| 7 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `payment_transactions`
* **Primary App:** Shared / Admin
* **Functional Domain:** Payments & Settlements
* **Description:** Detailed webhook logs from Razorpay/PayU/UPI

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | Yes | — |
| 3 | `user_id` | `uuid` | **No** | — |
| 4 | `payment_gateway` | `character varying(50)` | **No** | — |
| 5 | `gateway_transaction_id` | `character varying(150)` | Yes | — |
| 6 | `amount` | `numeric` | **No** | — |
| 7 | `currency` | `character varying(10)` | Yes | `'INR'` |
| 8 | `payment_mode` | `character varying(50)` | **No** | — |
| 9 | `status` | `character varying(50)` | Yes | `'PENDING'` |
| 10 | `response_payload` | `jsonb` | Yes | — |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 12 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `payments`
* **Primary App:** Shared / Admin
* **Functional Domain:** Payments & Settlements
* **Description:** Order transaction charges and payment gateway tokens

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `order_id` | `uuid` | **No** | — |
| 3 | `user_id` | `uuid` | **No** | — |
| 4 | `amount` | `numeric` | **No** | — |
| 5 | `currency` | `character varying(10)` | Yes | `'INR'` |
| 6 | `payment_method` | `character varying(50)` | **No** | — |
| 7 | `status` | `character varying(30)` | Yes | `'PENDING'` |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `product_images`
* **Primary App:** Shared (Admin / Seller / Customer)
* **Functional Domain:** Master Catalog
* **Description:** High-res product gallery photography and thumbnails

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `product_id` | `uuid` | **No** | — |
| 3 | `image_url` | `text` | **No** | — |
| 4 | `thumbnail_url` | `text` | Yes | — |
| 5 | `display_order` | `integer` | Yes | `0` |
| 6 | `is_primary` | `boolean` | Yes | `false` |
| 7 | `alt_text` | `character varying(200)` | Yes | — |
| 8 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `product_variants`
* **Primary App:** Shared (Admin / Seller / Customer)
* **Functional Domain:** Master Catalog
* **Description:** SKU variants by pack size, weight, and volume

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `product_id` | `uuid` | **No** | — |
| 3 | `sku` | `character varying(100)` | **No** | — |
| 4 | `variant_name` | `character varying(150)` | **No** | — |
| 5 | `pack_size` | `character varying(50)` | **No** | — |
| 6 | `weight_in_grams` | `numeric` | Yes | — |
| 7 | `mrp` | `numeric` | **No** | — |
| 8 | `base_cost` | `numeric` | Yes | — |
| 9 | `barcode` | `character varying(100)` | Yes | — |
| 10 | `is_active` | `boolean` | Yes | `true` |
| 11 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `razorpay_webhook_events`
* **Primary App:** Shared / Admin
* **Functional Domain:** Payments & Settlements
* **Description:** Signed Razorpay webhook payload events for transaction confirmation

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('razorpay_webhook_events_id_seq')` |
| 2 | `event_id` | `character varying(100)` | **No** | — |
| 3 | `event_type` | `character varying(100)` | **No** | — |
| 4 | `razorpay_order_id` | `character varying(100)` | Yes | — |
| 5 | `razorpay_payment_id` | `character varying(100)` | Yes | — |
| 6 | `processing_status` | `character varying(30)` | Yes | `'RECEIVED'` |
| 7 | `skip_reason` | `character varying(200)` | Yes | — |
| 8 | `processing_error` | `text` | Yes | — |
| 9 | `received_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `processed_at` | `timestamp without time zone` | Yes | — |
| 11 | `source_ip` | `character varying(45)` | Yes | — |
| 12 | `payload_summary` | `jsonb` | Yes | — |

---

### `schema_migrations`
* **Primary App:** Infrastructure / DevOps
* **Functional Domain:** Database DevOps
* **Description:** Versioned database migration tracking

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `version` | `character varying(100)` | **No** | — |
| 2 | `applied_at` | `timestamp with time zone` | Yes | `now()` |

---

### `sessions`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** Active authentication sessions and tokens

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `refresh_token_hash` | `character varying(255)` | **No** | — |
| 4 | `device_name` | `character varying(100)` | Yes | — |
| 5 | `ip_address` | `inet` | Yes | — |
| 6 | `user_agent` | `text` | Yes | — |
| 7 | `is_trusted` | `boolean` | Yes | `false` |
| 8 | `expires_at` | `timestamp with time zone` | **No** | — |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `state`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Geocoding & Logistics
* **Description:** Master registry of Indian states for GST compliance and shipping zones

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('state_id_seq')` |
| 2 | `state_name` | `character varying(100)` | **No** | — |
| 3 | `active` | `boolean` | Yes | `true` |
| 4 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

### `trusted_devices`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** Device fingerprinting for fraud prevention

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | **No** | — |
| 3 | `device_fingerprint` | `character varying(255)` | **No** | — |
| 4 | `device_name` | `character varying(100)` | Yes | — |
| 5 | `user_agent` | `text` | Yes | — |
| 6 | `last_ip` | `inet` | Yes | — |
| 7 | `is_active` | `boolean` | Yes | `true` |
| 8 | `last_used_at` | `timestamp with time zone` | Yes | `now()` |
| 9 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

### `users`
* **Primary App:** Shared / All Portals
* **Functional Domain:** Identity & Access
* **Description:** Core user identity across Seller, Customer, B2B Wholesaler, and Admin accounts

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `email` | `character varying(255)` | Yes | — |
| 3 | `phone` | `character varying(20)` | **No** | — |
| 4 | `password_hash` | `character varying(255)` | Yes | — |
| 5 | `full_name` | `character varying(150)` | **No** | — |
| 6 | `user_type` | `character varying(30)` | **No** | — |
| 7 | `status` | `character varying(30)` | Yes | `'ACTIVE'` |
| 8 | `avatar_url` | `text` | Yes | — |
| 9 | `is_phone_verified` | `boolean` | Yes | `false` |
| 10 | `is_email_verified` | `boolean` | Yes | `false` |
| 11 | `two_factor_enabled` | `boolean` | Yes | `false` |
| 12 | `created_at` | `timestamp with time zone` | Yes | `now()` |
| 13 | `updated_at` | `timestamp with time zone` | Yes | `now()` |

---

### `webhook_events`
* **Primary App:** Shared / Admin
* **Functional Domain:** API Infrastructure
* **Description:** Inbound external partner webhook delivery records

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `uuid` | **No** | `gen_random_uuid()` |
| 2 | `source` | `character varying(100)` | **No** | — |
| 3 | `event_type` | `character varying(100)` | **No** | — |
| 4 | `payload` | `jsonb` | **No** | — |
| 5 | `status` | `character varying(30)` | Yes | `'RECEIVED'` |
| 6 | `created_at` | `timestamp with time zone` | Yes | `now()` |

---

