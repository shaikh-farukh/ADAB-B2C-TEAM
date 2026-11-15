# ADAB Extra & Extended Database Tables Specification

**Document Version:** 1.0.0  
**Database Engine:** Neon PostgreSQL 18.6 (`neondb`, Schema: `public`)  
**Base Architecture Baseline:** `project arch/schema.sql` (140 Tables)  
**Total Extra / Extended Tables Documented:** 56 Tables  

---

## Executive Summary

This document catalogs all **extra database tables** created across subsequent development phases beyond the canonical 140-table baseline (`project arch/schema.sql`). These tables support the wholesale marketplace, AI Copilot, multi-step merchant onboarding, dynamic category taxonomies, and cross-portal synchronizations.

### Categorization Breakdown

| Group | Count | Description |
| :--- | :---: | :--- |
| **1. ADAB B2B & Wholesale Portal** | **39 Tables** | Wholesale restock orders, distributor inventories, B2B credit & payments, logistics fleets, campaigns |
| **2. Seller, Admin & Catalog Extensions** | **9 Tables** | AI Copilot audit logs, 7-step onboarding state, listing variants, dynamic attributes, and RBAC mapping |
| **3. Unindexed DDL Schema Table** | **1 Table** | `manage_b_to_b_delivery_configs` present in B2B SQL DDL but omitted from the 188-table catalog |
| **4. Legacy / Prototype Shop Tables** | **7 Tables** | Legacy POS sync tables referenced in helper modules before master catalog alignment |
| **Total** | **56 Tables** | Comprehensive audit of all additions and references |

---

## Table of Contents

### 1. ADAB B2B & Wholesale Portal (39 Tables)
- [1. `manage_b2b_purchase_order`](#1-manage-b2b-purchase-order)
- [2. `manage_b2b_purchase_order_detail`](#2-manage-b2b-purchase-order-detail)
- [3. `manage_b_to_b_orders`](#3-manage-b-to-b-orders)
- [4. `manage_b_to_b_order_items`](#4-manage-b-to-b-order-items)
- [5. `manage_b_to_b_order_status_history`](#5-manage-b-to-b-order-status-history)
- [6. `manage_b_to_b_cart`](#6-manage-b-to-b-cart)
- [7. `manage_b_to_b_request_access`](#7-manage-b-to-b-request-access)
- [8. `manage_manufacturer_products`](#8-manage-manufacturer-products)
- [9. `distributor_products`](#9-distributor-products)
- [10. `manage_b_to_b_categories`](#10-manage-b-to-b-categories)
- [11. `manage_b_to_b_subcategories`](#11-manage-b-to-b-subcategories)
- [12. `manage_b_to_b_userdetail`](#12-manage-b-to-b-userdetail)
- [13. `manage_b_to_b_user_type`](#13-manage-b-to-b-user-type)
- [14. `shopdetail`](#14-shopdetail)
- [15. `manage_b_to_b_contact_submissions`](#15-manage-b-to-b-contact-submissions)
- [16. `manage_b_to_b_invoices`](#16-manage-b-to-b-invoices)
- [17. `manage_b_to_b_credit_notes`](#17-manage-b-to-b-credit-notes)
- [18. `manage_b_to_b_payments`](#18-manage-b-to-b-payments)
- [19. `manage_b_to_b_payment_allocations`](#19-manage-b-to-b-payment-allocations)
- [20. `manage_b_to_b_payouts`](#20-manage-b-to-b-payouts)
- [21. `manage_b_to_b_settlements`](#21-manage-b-to-b-settlements)
- [22. `manage_b_to_b_ledger_entries`](#22-manage-b-to-b-ledger-entries)
- [23. `relationship_credits`](#23-relationship-credits)
- [24. `manage_b_to_b_drivers`](#24-manage-b-to-b-drivers)
- [25. `manage_b_to_b_vehicles`](#25-manage-b-to-b-vehicles)
- [26. `manage_b_to_b_vehicle_routes`](#26-manage-b-to-b-vehicle-routes)
- [27. `manage_b_to_b_logistics_providers`](#27-manage-b-to-b-logistics-providers)
- [28. `campaigns`](#28-campaigns)
- [29. `campaign_notifications`](#29-campaign-notifications)
- [30. `campaign_deliveries`](#30-campaign-deliveries)
- [31. `territory_assignments`](#31-territory-assignments)
- [32. `manage_b_to_b_support_tickets`](#32-manage-b-to-b-support-tickets)
- [33. `manage_b_to_b_audit_logs`](#33-manage-b-to-b-audit-logs)
- [34. `audit_trail`](#34-audit-trail)
- [35. `razorpay_checkouts`](#35-razorpay-checkouts)
- [36. `razorpay_checkout_orders`](#36-razorpay-checkout-orders)
- [37. `razorpay_webhook_events`](#37-razorpay-webhook-events)
- [38. `city`](#38-city)
- [39. `state`](#39-state)

### 2. Seller, Admin & Catalog Extension Tables (9 Tables)
- [40. `ai_audit_logs`](#40-ai-audit-logs)
- [41. `seller_onboarding_steps`](#41-seller-onboarding-steps)
- [42. `listing_variants`](#42-listing-variants)
- [43. `attribute_definitions`](#43-attribute-definitions)
- [44. `category_attributes`](#44-category-attributes)
- [45. `category_aliases`](#45-category-aliases)
- [46. `catalog_promotion_audit`](#46-catalog-promotion-audit)
- [47. `taxonomy_versions`](#47-taxonomy-versions)
- [48. `role_permissions`](#48-role-permissions)

### 3. Unindexed DDL Schema Table (1 Table)
- [49. `manage_b_to_b_delivery_configs`](#49-manage-b-to-b-delivery-configs)

### 4. Legacy / Prototype Shop Sync Tables (7 Tables)
- [50. `manage_category_master`](#50-manage-category-master)
- [51. `manage_subcategory_master`](#51-manage-subcategory-master)
- [52. `manage_product_master`](#52-manage-product-master)
- [53. `shop_subcategory_master`](#53-shop-subcategory-master)
- [54. `shop_product_master`](#54-shop-product-master)
- [55. `manage_dimension_packitem`](#55-manage-dimension-packitem)
- [56. `manage_shop_packed_product`](#56-manage-shop-packed-product)

---

## 1. ADAB B2B & Wholesale Portal (Tables 1 – 39)

### 1. `manage_b2b_purchase_order`
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

### 2. `manage_b2b_purchase_order_detail`
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

### 3. `manage_b_to_b_orders`
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

### 4. `manage_b_to_b_order_items`
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

### 5. `manage_b_to_b_order_status_history`
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

### 6. `manage_b_to_b_cart`
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

### 7. `manage_b_to_b_request_access`
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

### 8. `manage_manufacturer_products`
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

### 9. `distributor_products`
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

### 10. `manage_b_to_b_categories`
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

### 11. `manage_b_to_b_subcategories`
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

### 12. `manage_b_to_b_userdetail`
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

### 13. `manage_b_to_b_user_type`
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

### 14. `shopdetail`
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

### 15. `manage_b_to_b_contact_submissions`
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

### 16. `manage_b_to_b_invoices`
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

### 17. `manage_b_to_b_credit_notes`
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

### 18. `manage_b_to_b_payments`
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

### 19. `manage_b_to_b_payment_allocations`
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

### 20. `manage_b_to_b_payouts`
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

### 21. `manage_b_to_b_settlements`
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

### 22. `manage_b_to_b_ledger_entries`
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

### 23. `relationship_credits`
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

### 24. `manage_b_to_b_drivers`
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

### 25. `manage_b_to_b_vehicles`
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

### 26. `manage_b_to_b_vehicle_routes`
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

### 27. `manage_b_to_b_logistics_providers`
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

### 28. `campaigns`
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

### 29. `campaign_notifications`
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

### 30. `campaign_deliveries`
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

### 31. `territory_assignments`
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

### 32. `manage_b_to_b_support_tickets`
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

### 33. `manage_b_to_b_audit_logs`
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

### 34. `audit_trail`
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

### 35. `razorpay_checkouts`
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

### 36. `razorpay_checkout_orders`
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

### 37. `razorpay_webhook_events`
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

### 38. `city`
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

### 39. `state`
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

## 2. Seller, Admin & Catalog Extension Tables (Tables 40 – 48)

### 40. `ai_audit_logs`
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

### 41. `seller_onboarding_steps`
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

### 42. `listing_variants`
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

### 43. `attribute_definitions`
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

### 44. `category_attributes`
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

### 45. `category_aliases`
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

### 46. `catalog_promotion_audit`
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

### 47. `taxonomy_versions`
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

### 48. `role_permissions`
* **Primary App:** ADAB Admin Portal
* **Functional Domain:** Identity & Access / RBAC
* **Description:** M:N junction mapping between system roles and granular RBAC permissions

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `role_id` | `integer` | **No** | — |
| 2 | `permission_id` | `integer` | **No** | — |
| 3 | `created_at` | `timestamp with time zone` | **No** | `now()` |

---

## 3. Unindexed DDL Schema Table (Table 49)

### 49. `manage_b_to_b_delivery_configs`
* **Primary App:** ADAB B2B Portal
* **Functional Domain:** Supply Chain & Logistics / Delivery Settings
* **Origin:** Created in `ADAB-B2B-Portal/db_schema.sql` (Line 574) but omitted from the 188-table catalog document.
* **Description:** Shop-specific delivery configurations, distance pricing rules, and minimum free-delivery order thresholds.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | **No** | `nextval('manage_b_to_b_delivery_configs_id_seq')` |
| 2 | `shop_id` | `integer` | Yes | — |
| 3 | `mode` | `character varying(50)` | Yes | — |
| 4 | `base_charge` | `numeric(10,2)` | Yes | `0` |
| 5 | `per_km_charge` | `numeric(10,2)` | Yes | `0` |
| 6 | `min_free_delivery_order_value` | `numeric(10,2)` | Yes | `0` |
| 7 | `max_delivery_radius_km` | `numeric(10,2)` | Yes | `0` |
| 8 | `status` | `character varying(50)` | Yes | `'ACTIVE'` |
| 9 | `created_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |
| 10 | `updated_at` | `timestamp without time zone` | Yes | `CURRENT_TIMESTAMP` |

---

## 4. Legacy / Prototype Shop Sync Tables (Tables 50 – 56)

> [!NOTE]
> These 7 tables are referenced inside `ADAB-B2B-Portal/backend/controllers/syncInventoryHelper.js` when syncing B2B wholesale orders into external/legacy Kirana POS databases. In the unified ADAB PostgreSQL architecture, these are superseded by canonical tables: `categories`, `products`, `seller_listings`, and `listing_variants`.

### 50. `manage_category_master`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `categories`
* **Description:** Legacy category master table referenced during B2B-to-shop inventory sync.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `name` | `character varying(255)` | No | — |
| 3 | `active` | `integer` | Yes | 1 |
| 4 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |
| 5 | `create_by` | `integer` | Yes | 1 |

---

### 51. `manage_subcategory_master`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `categories` (hierarchical via `parent_id`)
* **Description:** Legacy subcategory master mapped to category master in prototype shop schemas.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `subcategory` | `character varying(255)` | No | — |
| 3 | `fk_manage_category_master` | `integer` | Yes | — |
| 4 | `active` | `integer` | Yes | 1 |
| 5 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |
| 6 | `create_by` | `integer` | Yes | 1 |

---

### 52. `manage_product_master`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `products` / `master_catalog_items`
* **Description:** Legacy canonical product catalog definition used in prototype POS systems.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `product_name` | `character varying(255)` | No | — |
| 3 | `fk_subcategory` | `integer` | Yes | — |
| 4 | `fk_manage_category_master` | `integer` | Yes | — |
| 5 | `description` | `text` | Yes | — |
| 6 | `product_image` | `text` | Yes | — |
| 7 | `active` | `integer` | Yes | 1 |
| 8 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |
| 9 | `create_by` | `integer` | Yes | 1 |

---

### 53. `shop_subcategory_master`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** Implicit via `seller_listings.category_id`
* **Description:** Legacy junction mapping specific subcategories to individual kirana stores.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `fk_shopdetail` | `integer` | Yes | — |
| 3 | `fk_shop_category` | `integer` | Yes | — |
| 4 | `fk_subcategory` | `integer` | Yes | — |
| 5 | `active` | `integer` | Yes | 1 |
| 6 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |

---

### 54. `shop_product_master`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `seller_listings`
* **Description:** Legacy store product listing linking master products to specific retail shops.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `fk_shopdetail` | `integer` | Yes | — |
| 3 | `fk_subcategory` | `integer` | Yes | — |
| 4 | `fk_manageproductmaster` | `integer` | Yes | — |
| 5 | `active` | `integer` | Yes | 1 |
| 6 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |
| 7 | `create_by` | `integer` | Yes | 1 |

---

### 55. `manage_dimension_packitem`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `product_variants`
* **Description:** Legacy pack sizing, grammage, and packaging dimension specifications.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `dimension_name` | `character varying(100)` | Yes | — |
| 3 | `pack_qty` | `numeric` | Yes | 1 |
| 4 | `unit` | `character varying(50)` | Yes | 'pcs' |
| 5 | `active` | `integer` | Yes | 1 |
| 6 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |

---

### 56. `manage_shop_packed_product`
* **Primary App:** Legacy Kirana Shop / Sync Helper
* **Functional Domain:** Legacy Inventory Synchronization
* **Modern Canonical Equivalent:** `listing_variants`
* **Description:** Legacy packed dimension variant attached to a shop product with retail pricing.

| # | Column Name | Data Type | Nullable | Default Value |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `id` | `integer` | No | SERIAL PRIMARY KEY |
| 2 | `fk_shop` | `integer` | Yes | — |
| 3 | `fk_manage_dimension_packitem` | `integer` | Yes | — |
| 4 | `fkshopproductmaster` | `integer` | Yes | — |
| 5 | `active` | `integer` | Yes | 1 |
| 6 | `create_at` | `timestamp without time zone` | Yes | CURRENT_TIMESTAMP |
| 7 | `create_by` | `integer` | Yes | 1 |

---
