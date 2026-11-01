# ADAB Enterprise Database Schema — Complete Tables & Columns Dictionary

> **Generated**: 2026-11-01
> **Source File**: [`project arch/schema.sql`](file:///c:/Users/SHABBIR%20G/Desktop/ADAB-B2C-TEAM/project%20arch/schema.sql)
> **Total Tables**: 187 tables across all 11 architecture domains.

## Table of Contents

- [DOMAIN 1: IDENTITY, ACCESS CONTROL, AUTH & RBAC (Karan)](#domain-1-identity-access-control-auth-rbac-karan-) (13 tables)
- [DOMAIN 2: PROFILES, STORES & ONBOARDING (Shabbir & Mahi)](#domain-2-profiles-stores-onboarding-shabbir-mahi-) (12 tables)
- [DOMAIN 3: BANKING PARTNERS, CREDIT LINES & 0% BNPL (Karan & Devika)](#domain-3-banking-partners-credit-lines-0-bnpl-karan-devika-) (4 tables)
- [DOMAIN 4: CATALOG, PRODUCTS, VARIANTS & SEARCH (Karan & Shabbir)](#domain-4-catalog-products-variants-search-karan-shabbir-) (20 tables)
- [DOMAIN 5: INVENTORY, WAREHOUSES & B2B PROCUREMENT (Mayank)](#domain-5-inventory-warehouses-b2b-procurement-mayank-) (11 tables)
- [DOMAIN 6: CARTS, WISHLIST, OFFERS & REWARDS (Mrunal & Mahi)](#domain-6-carts-wishlist-offers-rewards-mrunal-mahi-) (14 tables)
- [DOMAIN 7: ORDERS, SHIPPING, PAYMENTS & SETTLEMENTS (Mayank & Mrunal)](#domain-7-orders-shipping-payments-settlements-mayank-mrunal-) (23 tables)
- [DOMAIN 8: RETURNS, REFUNDS & REVIEWS (Mrunal & Mayank)](#domain-8-returns-refunds-reviews-mrunal-mayank-) (8 tables)
- [DOMAIN 9: POS, SUPPORT, MESSAGES, NOTIFICATIONS & AUDIT (All Portals)](#domain-9-pos-support-messages-notifications-audit-all-portals-) (16 tables)
- [DOMAIN 10: ENTERPRISE SUPPORT, AI, TAX, INTEGRATION & SYNC (Extended)](#domain-10-enterprise-support-ai-tax-integration-sync-extended-) (26 tables)
- [DOMAIN 11: B2B COMMERCE & MANUFACTURER PLATFORM (Standalone & Hybrid B2B)](#domain-11-b2b-commerce-manufacturer-platform-standalone-hybrid-b2b-) (40 tables)

---

## DOMAIN 1: IDENTITY, ACCESS CONTROL, AUTH & RBAC (Karan)

### 1. `users`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`email`** | `VARCHAR(255)` | UNIQUE |
| 3 | **`phone`** | `VARCHAR(20)` | UNIQUE NOT NULL |
| 4 | **`password_hash`** | `VARCHAR(255)` | — |
| 5 | **`full_name`** | `VARCHAR(150)` | NOT NULL |
| 6 | **`user_type`** | `VARCHAR(30)` | NOT NULL CHECK (user_type IN ('CUSTOMER','SELLER','ADMIN','DRIVER','AGENT')) |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','BANNED')) |
| 8 | **`avatar_url`** | `TEXT` | — |
| 9 | **`is_phone_verified`** | `BOOLEAN` | DEFAULT false |
| 10 | **`is_email_verified`** | `BOOLEAN` | DEFAULT false |
| 11 | **`two_factor_enabled`** | `BOOLEAN` | DEFAULT false |
| 12 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 13 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 2. `roles`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`slug`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 3 | **`name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`description`** | `TEXT` | — |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 3. `permissions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`slug`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`module`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`description`** | `TEXT` | — |

---

### 4. `user_roles`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`user_id`** | `UUID` | REFERENCES users(id) ON DELETE CASCADE |
| 2 | **`role_id`** | `INT` | REFERENCES roles(id) ON DELETE CASCADE |
| 3 | **`assigned_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `PRIMARY KEY (user_id, role_id)`

---

### 5. `sessions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`refresh_token_hash`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`device_name`** | `VARCHAR(100)` | — |
| 5 | **`ip_address`** | `INET` | — |
| 6 | **`user_agent`** | `TEXT` | — |
| 7 | **`is_trusted`** | `BOOLEAN` | DEFAULT false |
| 8 | **`expires_at`** | `TIMESTAMPTZ` | NOT NULL |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 6. `oauth_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`provider`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`provider_user_id`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`access_token`** | `TEXT` | — |
| 6 | **`refresh_token`** | `TEXT` | — |
| 7 | **`token_expires_at`** | `TIMESTAMPTZ` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(provider, provider_user_id)`

---

### 7. `auth_challenges`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`phone`** | `VARCHAR(20)` | — |
| 3 | **`email`** | `VARCHAR(255)` | — |
| 4 | **`otp_code_hash`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`challenge_type`** | `VARCHAR(30)` | NOT NULL CHECK (challenge_type IN ('LOGIN_OTP','REGISTRATION_OTP','PASSWORD_RESET','KYC_VERIFY')) |
| 6 | **`attempts`** | `INT` | DEFAULT 0 |
| 7 | **`is_used`** | `BOOLEAN` | DEFAULT false |
| 8 | **`expires_at`** | `TIMESTAMPTZ` | NOT NULL |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 8. `trusted_devices`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`device_fingerprint`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`device_name`** | `VARCHAR(100)` | — |
| 5 | **`user_agent`** | `TEXT` | — |
| 6 | **`last_ip`** | `INET` | — |
| 7 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 8 | **`last_used_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(user_id, device_fingerprint)`

---

### 9. `passkeys`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`credential_id`** | `TEXT` | UNIQUE NOT NULL |
| 4 | **`public_key`** | `TEXT` | NOT NULL |
| 5 | **`counter`** | `BIGINT` | DEFAULT 0 |
| 6 | **`transports`** | `TEXT[]` | — |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 10. `login_attempts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`phone_or_email`** | `VARCHAR(150)` | NOT NULL |
| 3 | **`ip_address`** | `INET` | NOT NULL |
| 4 | **`status`** | `VARCHAR(30)` | NOT NULL CHECK (status IN ('SUCCESS','OTP_FAILED','RATE_LIMITED','BLOCKED')) |
| 5 | **`failure_reason`** | `VARCHAR(150)` | — |
| 6 | **`attempted_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 11. `consents`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`consent_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`version`** | `VARCHAR(20)` | NOT NULL |
| 5 | **`is_granted`** | `BOOLEAN` | DEFAULT true |
| 6 | **`ip_address`** | `INET` | — |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 12. `api_keys`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`name`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`key_hash`** | `VARCHAR(255)` | UNIQUE NOT NULL |
| 4 | **`prefix`** | `VARCHAR(20)` | NOT NULL |
| 5 | **`scopes`** | `TEXT[]` | DEFAULT '{}' |
| 6 | **`created_by`** | `UUID` | REFERENCES users(id) |
| 7 | **`expires_at`** | `TIMESTAMPTZ` | — |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 13. `oauth_clients`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`client_id`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`client_secret_hash`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`client_name`** | `VARCHAR(150)` | NOT NULL |
| 5 | **`redirect_uris`** | `TEXT[]` | NOT NULL |
| 6 | **`allowed_grant_types`** | `TEXT[]` | DEFAULT '{"authorization_code","refresh_token"}' |
| 7 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 2: PROFILES, STORES & ONBOARDING (Shabbir & Mahi)

### 14. `customer_profiles`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`preferred_language`** | `VARCHAR(10)` | DEFAULT 'en' |
| 4 | **`loyalty_tier`** | `VARCHAR(30)` | DEFAULT 'BRONZE' CHECK (loyalty_tier IN ('BRONZE','SILVER','GOLD','PLATINUM')) |
| 5 | **`date_of_birth`** | `DATE` | — |
| 6 | **`gender`** | `VARCHAR(20)` | — |
| 7 | **`profile_picture_url`** | `TEXT` | — |
| 8 | **`gst_in`** | `VARCHAR(15)` | — |
| 9 | **`company_name`** | `VARCHAR(150)` | — |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 11 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 15. `notification_preferences`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`order_updates_sms`** | `BOOLEAN` | DEFAULT true |
| 4 | **`order_updates_email`** | `BOOLEAN` | DEFAULT true |
| 5 | **`order_updates_whatsapp`** | `BOOLEAN` | DEFAULT true |
| 6 | **`promotional_sms`** | `BOOLEAN` | DEFAULT false |
| 7 | **`promotional_email`** | `BOOLEAN` | DEFAULT false |
| 8 | **`promotional_whatsapp`** | `BOOLEAN` | DEFAULT false |
| 9 | **`soundbox_alerts`** | `BOOLEAN` | DEFAULT true |
| 10 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 16. `addresses`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`label`** | `VARCHAR(50)` | DEFAULT 'Home' |
| 4 | **`recipient_name`** | `VARCHAR(150)` | NOT NULL |
| 5 | **`phone`** | `VARCHAR(20)` | NOT NULL |
| 6 | **`address_line`** | `TEXT` | NOT NULL |
| 7 | **`landmark`** | `VARCHAR(150)` | — |
| 8 | **`city`** | `VARCHAR(100)` | NOT NULL |
| 9 | **`state`** | `VARCHAR(100)` | — |
| 10 | **`pincode`** | `VARCHAR(10)` | NOT NULL |
| 11 | **`latitude`** | `NUMERIC(10,7)` | — |
| 12 | **`longitude`** | `NUMERIC(10,7)` | — |
| 13 | **`is_default`** | `BOOLEAN` | DEFAULT false |
| 14 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 17. `customer_addresses`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`label`** | `VARCHAR(50)` | DEFAULT 'Home' |
| 4 | **`recipient_name`** | `VARCHAR(150)` | NOT NULL |
| 5 | **`phone`** | `VARCHAR(20)` | NOT NULL |
| 6 | **`address_line`** | `TEXT` | NOT NULL |
| 7 | **`landmark`** | `VARCHAR(150)` | — |
| 8 | **`city`** | `VARCHAR(100)` | NOT NULL |
| 9 | **`pincode`** | `VARCHAR(10)` | NOT NULL |
| 10 | **`is_default`** | `BOOLEAN` | DEFAULT false |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 18. `seller_profiles`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`legal_name`** | `VARCHAR(200)` | NOT NULL |
| 4 | **`entity_type`** | `VARCHAR(50)` | NOT NULL CHECK (entity_type IN ('Sole Proprietorship','Partnership Firm','LLP','Private Limited','Individual Trader')) |
| 5 | **`gstin`** | `VARCHAR(15)` | UNIQUE |
| 6 | **`pan`** | `VARCHAR(10)` | NOT NULL |
| 7 | **`fssai_license`** | `VARCHAR(20)` | — |
| 8 | **`udhyam_msme`** | `VARCHAR(30)` | — |
| 9 | **`kyc_status`** | `VARCHAR(30)` | DEFAULT 'DRAFT' CHECK (kyc_status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED')) |
| 10 | **`onboarding_step`** | `INT` | DEFAULT 1 |
| 11 | **`rejection_reason`** | `TEXT` | — |
| 12 | **`submitted_at`** | `TIMESTAMPTZ` | — |
| 13 | **`verified_at`** | `TIMESTAMPTZ` | — |
| 14 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 15 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 19. `seller_documents`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_id`** | `UUID` | NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE |
| 3 | **`doc_type`** | `VARCHAR(50)` | NOT NULL CHECK (doc_type IN ('GST_CERTIFICATE','SHOP_IMAGE','FSSAI_DOC','PAN_CARD','CANCELLED_CHEQUE')) |
| 4 | **`file_name`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`file_url`** | `TEXT` | NOT NULL |
| 6 | **`verification_status`** | `VARCHAR(30)` | DEFAULT 'PENDING' |
| 7 | **`uploaded_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 20. `stores`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_id`** | `UUID` | NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE |
| 3 | **`store_name`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`category`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`phone`** | `VARCHAR(20)` | NOT NULL |
| 6 | **`email`** | `VARCHAR(255)` | — |
| 7 | **`address_line`** | `TEXT` | NOT NULL |
| 8 | **`city`** | `VARCHAR(100)` | NOT NULL |
| 9 | **`state`** | `VARCHAR(100)` | NOT NULL |
| 10 | **`pincode`** | `VARCHAR(10)` | NOT NULL |
| 11 | **`latitude`** | `NUMERIC(10,7)` | — |
| 12 | **`longitude`** | `NUMERIC(10,7)` | — |
| 13 | **`delivery_radius_km`** | `NUMERIC(5,2)` | DEFAULT 10.00 |
| 14 | **`is_online`** | `BOOLEAN` | DEFAULT true |
| 15 | **`open_time`** | `TIME` | DEFAULT '08:00:00' |
| 16 | **`close_time`** | `TIME` | DEFAULT '22:00:00' |
| 17 | **`soundbox_enabled`** | `BOOLEAN` | DEFAULT true |
| 18 | **`ui_mode`** | `VARCHAR(20)` | DEFAULT 'SIMPLE' CHECK (ui_mode IN ('SIMPLE','PRO')) |
| 19 | **`rating`** | `NUMERIC(3,2)` | DEFAULT 5.00 |
| 20 | **`rating_count`** | `INT` | DEFAULT 0 |
| 21 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 21. `seller_onboarding_steps`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`user_id`** | `UUID` | PRIMARY KEY |
| 2 | **`step1`** | `BOOLEAN` | DEFAULT false |
| 3 | **`step2`** | `BOOLEAN` | DEFAULT false |
| 4 | **`step3`** | `BOOLEAN` | DEFAULT false |
| 5 | **`step4`** | `BOOLEAN` | DEFAULT false |
| 6 | **`step5`** | `BOOLEAN` | DEFAULT false |
| 7 | **`step6`** | `BOOLEAN` | DEFAULT false |
| 8 | **`step7`** | `BOOLEAN` | DEFAULT false |
| 9 | **`profile_data`** | `JSONB` | DEFAULT '{}'::jsonb |
| 10 | **`delivery_config`** | `JSONB` | DEFAULT '{}'::jsonb |
| 11 | **`credit_config`** | `JSONB` | DEFAULT '{}'::jsonb |
| 12 | **`starter_products`** | `JSONB` | DEFAULT '[]'::jsonb |
| 13 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 22. `seller_bank_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_id`** | `UUID` | NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE |
| 3 | **`bank_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`account_holder_name`** | `VARCHAR(150)` | NOT NULL |
| 5 | **`account_number`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`ifsc_code`** | `VARCHAR(15)` | NOT NULL |
| 7 | **`account_type`** | `VARCHAR(20)` | DEFAULT 'CURRENT' CHECK (account_type IN ('CURRENT','SAVINGS')) |
| 8 | **`is_verified`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 23. `delivery_zones`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`zone_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`radius_km`** | `NUMERIC(5,2)` | NOT NULL |
| 5 | **`min_order_amount`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 6 | **`delivery_fee`** | `NUMERIC(8,2)` | DEFAULT 0.00 |
| 7 | **`estimated_minutes_min`** | `INT` | DEFAULT 14 |
| 8 | **`estimated_minutes_max`** | `INT` | DEFAULT 30 |
| 9 | **`is_active`** | `BOOLEAN` | DEFAULT true |

---

### 24. `seller_drivers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`driver_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`phone`** | `VARCHAR(20)` | NOT NULL |
| 5 | **`vehicle_number`** | `VARCHAR(50)` | — |
| 6 | **`vehicle_type`** | `VARCHAR(30)` | DEFAULT 'BIKE' CHECK (vehicle_type IN ('BIKE','VAN','AUTO_RICKSHAW','ELECTRIC_SCOOTER')) |
| 7 | **`is_available`** | `BOOLEAN` | DEFAULT true |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 25. `export_reports`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_id`** | `UUID` | NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE |
| 3 | **`report_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`format`** | `VARCHAR(10)` | DEFAULT 'CSV' CHECK (format IN ('CSV','PDF','XLSX')) |
| 5 | **`status`** | `VARCHAR(30)` | DEFAULT 'COMPLETED' |
| 6 | **`file_url`** | `TEXT` | NOT NULL |
| 7 | **`generated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 3: BANKING PARTNERS, CREDIT LINES & 0% BNPL (Karan & Devika)

### 26. `bank_partners`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`name`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`code`** | `VARCHAR(30)` | UNIQUE NOT NULL |
| 4 | **`logo_url`** | `TEXT` | — |
| 5 | **`interest_rate_pct`** | `NUMERIC(4,2)` | DEFAULT 0.00 CHECK (interest_rate_pct >= 0.00) |
| 6 | **`max_credit_limit`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`tenure_options`** | `INT[]` | DEFAULT '{7, 14, 21, 30, 60}' |
| 8 | **`eligibility_criteria`** | `JSONB` | — |
| 9 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 27. `credit_applications`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`application_no`** | `VARCHAR(30)` | UNIQUE NOT NULL |
| 3 | **`applicant_type`** | `VARCHAR(20)` | NOT NULL CHECK (applicant_type IN ('CUSTOMER','SELLER')) |
| 4 | **`applicant_id`** | `UUID` | NOT NULL |
| 5 | **`applicant_name`** | `VARCHAR(150)` | NOT NULL |
| 6 | **`bank_id`** | `UUID` | NOT NULL REFERENCES bank_partners(id) |
| 7 | **`requested_amount`** | `NUMERIC(12,2)` | NOT NULL |
| 8 | **`approved_amount`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 9 | **`tenure_days`** | `INT` | DEFAULT 14 |
| 10 | **`monthly_turnover`** | `NUMERIC(12,2)` | — |
| 11 | **`reason`** | `VARCHAR(255)` | — |
| 12 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','UNDER_REVIEW')) |
| 13 | **`admin_note`** | `TEXT` | — |
| 14 | **`approved_by`** | `UUID` | REFERENCES users(id) |
| 15 | **`approved_at`** | `TIMESTAMPTZ` | — |
| 16 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 28. `credit_ledgers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`applicant_type`** | `VARCHAR(20)` | NOT NULL |
| 3 | **`applicant_id`** | `UUID` | NOT NULL |
| 4 | **`bank_id`** | `UUID` | NOT NULL REFERENCES bank_partners(id) |
| 5 | **`total_limit`** | `NUMERIC(12,2)` | NOT NULL DEFAULT 0.00 |
| 6 | **`utilized_amount`** | `NUMERIC(12,2)` | NOT NULL DEFAULT 0.00 |
| 7 | **`available_amount`** | `NUMERIC(12,2)` | GENERATED ALWAYS AS (total_limit - utilized_amount) STORED |
| 8 | **`due_date`** | `TIMESTAMPTZ` | — |
| 9 | **`is_locked`** | `BOOLEAN` | DEFAULT false |
| 10 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `CONSTRAINT chk_util_limit CHECK (utilized_amount <= total_limit)`

---

### 29. `credit_repayments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`ledger_id`** | `UUID` | NOT NULL REFERENCES credit_ledgers(id) |
| 3 | **`payment_amount`** | `NUMERIC(12,2)` | NOT NULL |
| 4 | **`transaction_ref`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`payment_mode`** | `VARCHAR(30)` | NOT NULL |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'SUCCESS' |
| 7 | **`paid_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 4: CATALOG, PRODUCTS, VARIANTS & SEARCH (Karan & Shabbir)

### 30. `categories`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`slug`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`name`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`parent_id`** | `INT` | REFERENCES categories(id) ON DELETE RESTRICT |
| 5 | **`level`** | `INT` | NOT NULL DEFAULT 1 |
| 6 | **`materialized_path`** | `VARCHAR(500)` | — |
| 7 | **`is_leaf`** | `BOOLEAN` | DEFAULT true |
| 8 | **`icon_class`** | `VARCHAR(50)` | — |
| 9 | **`image_url`** | `TEXT` | — |
| 10 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 11 | **`display_order`** | `INT` | DEFAULT 0 |
| 12 | **`google_product_category_id`** | `INT` | — |

---

### 31. `brands`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`slug`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`name`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`logo_url`** | `TEXT` | — |
| 5 | **`description`** | `TEXT` | — |
| 6 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 32. `products`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`category_id`** | `INT` | REFERENCES categories(id) |
| 3 | **`brand_id`** | `UUID` | REFERENCES brands(id) |
| 4 | **`title`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`slug`** | `VARCHAR(255)` | UNIQUE |
| 6 | **`description`** | `TEXT` | — |
| 7 | **`barcode`** | `VARCHAR(50)` | — |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 10 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 33. `master_catalog_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`barcode`** | `VARCHAR(50)` | UNIQUE |
| 3 | **`product_name`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`brand_name`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`category_id`** | `INT` | REFERENCES categories(id) |
| 6 | **`printed_mrp`** | `NUMERIC(10,2)` | NOT NULL |
| 7 | **`standard_unit`** | `VARCHAR(20)` | DEFAULT 'pcs' |
| 8 | **`default_image_url`** | `TEXT` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 34. `product_variants`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`product_id`** | `UUID` | NOT NULL REFERENCES master_catalog_items(id) ON DELETE CASCADE |
| 3 | **`sku`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 4 | **`variant_name`** | `VARCHAR(150)` | NOT NULL |
| 5 | **`pack_size`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`weight_in_grams`** | `NUMERIC(10,2)` | — |
| 7 | **`mrp`** | `NUMERIC(12,2)` | NOT NULL |
| 8 | **`base_cost`** | `NUMERIC(12,2)` | — |
| 9 | **`barcode`** | `VARCHAR(100)` | — |
| 10 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 35. `product_images`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`product_id`** | `UUID` | NOT NULL REFERENCES master_catalog_items(id) ON DELETE CASCADE |
| 3 | **`image_url`** | `TEXT` | NOT NULL |
| 4 | **`thumbnail_url`** | `TEXT` | — |
| 5 | **`display_order`** | `INT` | DEFAULT 0 |
| 6 | **`is_primary`** | `BOOLEAN` | DEFAULT false |
| 7 | **`alt_text`** | `VARCHAR(200)` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 36. `seller_listings`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`product_type`** | `VARCHAR(50)` | NOT NULL DEFAULT 'PACKED_ITEM' CHECK (product_type IN ('OWN_BRAND','LOOSE_WEIGHT','PACKED_ITEM')) |
| 4 | **`master_catalog_id`** | `UUID` | REFERENCES master_catalog_items(id) ON DELETE SET NULL |
| 5 | **`manufacturer_product_id`** | `INTEGER` | — |
| 6 | **`title`** | `VARCHAR(255)` | NOT NULL |
| 7 | **`sku`** | `VARCHAR(100)` | — |
| 8 | **`barcode`** | `VARCHAR(50)` | — |
| 9 | **`brand_tag`** | `VARCHAR(100)` | — |
| 10 | **`category_id`** | `INT` | NOT NULL REFERENCES categories(id) |
| 11 | **`mrp`** | `NUMERIC(12,2)` | NOT NULL |
| 12 | **`sell_price`** | `NUMERIC(12,2)` | NOT NULL |
| 13 | **`unit`** | `VARCHAR(20)` | DEFAULT 'pcs' |
| 14 | **`stock_qty`** | `NUMERIC(12,3)` | DEFAULT 0.000 |
| 15 | **`min_order_qty`** | `NUMERIC(12,3)` | DEFAULT 1.000 |
| 16 | **`allowed_buyers`** | `VARCHAR(30)` | DEFAULT 'ALL' CHECK (allowed_buyers IN ('ALL','CUSTOMERS_ONLY','STORES_ONLY')) |
| 17 | **`approval_status`** | `VARCHAR(30)` | DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','SUBMITTED','PENDING','APPROVED','REJECTED','CHANGES_REQUIRED')) |
| 18 | **`rejection_reason`** | `TEXT` | — |
| 19 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 20 | **`is_refundable`** | `BOOLEAN` | DEFAULT true |
| 21 | **`refund_percentage`** | `NUMERIC(5,2)` | DEFAULT 100.00 |
| 22 | **`return_window_days`** | `INT` | DEFAULT 7 |
| 23 | **`attributes`** | `JSONB` | DEFAULT '{}'::jsonb |
| 24 | **`has_variants`** | `BOOLEAN` | DEFAULT false |
| 25 | **`rating`** | `NUMERIC(3,2)` | DEFAULT 5.00 |
| 26 | **`review_count`** | `INT` | DEFAULT 0 |
| 27 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 28 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 37. `listing_attributes`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`attribute_key`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`attribute_value`** | `TEXT` | NOT NULL |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(listing_id, attribute_key)`

---

### 38. `listing_documents`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`document_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`document_url`** | `TEXT` | NOT NULL |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 39. `category_aliases`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`category_id`** | `INT` | NOT NULL REFERENCES categories(id) ON DELETE CASCADE |
| 3 | **`alias_term`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`language_code`** | `VARCHAR(10)` | DEFAULT 'en' |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `CONSTRAINT uq_category_alias UNIQUE (category_id, alias_term)`

---

### 40. `attribute_definitions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`code`** | `VARCHAR(100)` | NOT NULL UNIQUE |
| 3 | **`label`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`description`** | `TEXT` | — |
| 5 | **`data_type`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`ui_type`** | `VARCHAR(50)` | NOT NULL |
| 7 | **`allowed_values`** | `JSONB` | DEFAULT '[]'::jsonb |
| 8 | **`unit_options`** | `JSONB` | DEFAULT '[]'::jsonb |
| 9 | **`validation_regex`** | `VARCHAR(255)` | — |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 11 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 41. `category_attributes`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`category_id`** | `INT` | NOT NULL REFERENCES categories(id) ON DELETE CASCADE |
| 3 | **`attribute_id`** | `UUID` | NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE |
| 4 | **`is_required`** | `BOOLEAN` | DEFAULT false |
| 5 | **`is_variant_key`** | `BOOLEAN` | DEFAULT false |
| 6 | **`is_filter_facet`** | `BOOLEAN` | DEFAULT false |
| 7 | **`display_order`** | `INT` | DEFAULT 0 |
| 8 | **`section_group`** | `VARCHAR(100)` | DEFAULT 'General' |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `CONSTRAINT uq_cat_attr UNIQUE (category_id, attribute_id)`

---

### 42. `listing_variants`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`sku`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`barcode`** | `VARCHAR(100)` | — |
| 5 | **`mrp`** | `NUMERIC(12,` | 2) NOT NULL |
| 6 | **`sell_price`** | `NUMERIC(12,` | 2) NOT NULL |
| 7 | **`stock_qty`** | `NUMERIC(12,` | 3) NOT NULL DEFAULT 0.000 |
| 8 | **`variant_attributes`** | `JSONB` | NOT NULL DEFAULT '{}'::jsonb |
| 9 | **`image_url`** | `TEXT` | — |
| 10 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 12 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `CONSTRAINT uq_listing_variant_sku UNIQUE (listing_id, sku)`

---

### 43. `taxonomy_versions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`version_tag`** | `VARCHAR(50)` | PRIMARY KEY |
| 2 | **`description`** | `TEXT` | — |
| 3 | **`migration_file`** | `VARCHAR(255)` | — |
| 4 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 44. `catalog_promotion_audit`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`source_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`source_id`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`target_listing_id`** | `UUID` | REFERENCES seller_listings(id) ON DELETE SET NULL |
| 6 | **`curation_notes`** | `TEXT` | — |
| 7 | **`action_by`** | `UUID` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 45. `product_approval_history`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`admin_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`previous_status`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`new_status`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`rejection_reason`** | `TEXT` | — |
| 7 | **`notes`** | `TEXT` | — |
| 8 | **`action_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 46. `search_synonyms`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`primary_term`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`synonyms`** | `TEXT[]` | NOT NULL |
| 4 | **`language_code`** | `VARCHAR(10)` | DEFAULT 'hi' |
| 5 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(primary_term, language_code)`

---

### 47. `search_redirects`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`search_term`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`redirect_url`** | `TEXT` | NOT NULL |
| 4 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 48. `product_search_index`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | UNIQUE REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`search_vector`** | `tsvector` | — |
| 4 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 49. `partner_packs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 3 | **`source_brand_store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`source_listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 5 | **`custom_sell_price`** | `NUMERIC(10,2)` | NOT NULL |
| 6 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 5: INVENTORY, WAREHOUSES & B2B PROCUREMENT (Mayank)

### 50. `warehouses`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`name`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`code`** | `VARCHAR(50)` | — |
| 5 | **`address_line`** | `TEXT` | NOT NULL |
| 6 | **`city`** | `VARCHAR(100)` | NOT NULL |
| 7 | **`pincode`** | `VARCHAR(10)` | NOT NULL |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 51. `inventory`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL UNIQUE REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`stock_quantity`** | `NUMERIC(10,2)` | NOT NULL DEFAULT 0 |
| 4 | **`reserved_quantity`** | `NUMERIC(10,2)` | NOT NULL DEFAULT 0 |
| 5 | **`available_quantity`** | `NUMERIC(10,2)` | GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED |
| 6 | **`low_stock_threshold`** | `NUMERIC(10,2)` | DEFAULT 5.0 |
| 7 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `CONSTRAINT chk_stock_reserved CHECK (stock_quantity >= reserved_quantity)`

---

### 52. `inventory_transactions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`inventory_id`** | `UUID` | NOT NULL REFERENCES inventory(id) |
| 3 | **`transaction_type`** | `VARCHAR(50)` | NOT NULL CHECK (transaction_type IN ('RESTOCK','ORDER_FULFILL','POS_COUNTER_SALE','MANUAL_ADJUSTMENT','RETURN_RESTOCK','DAMAGED_WRITE_OFF')) |
| 4 | **`quantity_change`** | `INT` | NOT NULL |
| 5 | **`quantity_after`** | `INT` | NOT NULL |
| 6 | **`reference_type`** | `VARCHAR(50)` | NOT NULL |
| 7 | **`reference_id`** | `UUID` | — |
| 8 | **`notes`** | `TEXT` | — |
| 9 | **`created_by`** | `UUID` | REFERENCES users(id) |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 53. `suppliers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`supplier_name`** | `VARCHAR(200)` | NOT NULL |
| 3 | **`contact_person`** | `VARCHAR(100)` | — |
| 4 | **`phone`** | `VARCHAR(20)` | NOT NULL UNIQUE |
| 5 | **`email`** | `VARCHAR(150)` | — |
| 6 | **`gstin`** | `VARCHAR(20)` | — |
| 7 | **`city`** | `VARCHAR(100)` | NOT NULL |
| 8 | **`payment_terms`** | `VARCHAR(100)` | DEFAULT '15_DAYS_CREDIT' |
| 9 | **`rating`** | `NUMERIC(3,2)` | DEFAULT 5.00 |
| 10 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 54. `supplier_products`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`supplier_id`** | `UUID` | NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE |
| 3 | **`product_name`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`sku`** | `VARCHAR(100)` | — |
| 5 | **`unit_cost`** | `NUMERIC(12,2)` | NOT NULL |
| 6 | **`moq`** | `INT` | DEFAULT 1 |
| 7 | **`is_available`** | `BOOLEAN` | DEFAULT true |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 55. `stock_purchase_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`po_number`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`supplier_id`** | `UUID` | NOT NULL REFERENCES suppliers(id) |
| 5 | **`total_amount`** | `NUMERIC(14,2)` | NOT NULL |
| 6 | **`tax_amount`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 7 | **`payment_mode`** | `VARCHAR(50)` | DEFAULT 'CREDIT_LINE' |
| 8 | **`status`** | `VARCHAR(50)` | DEFAULT 'PLACED' CHECK (status IN ('DRAFT','PLACED','CONFIRMED','SHIPPED','RECEIVED','CANCELLED')) |
| 9 | **`expected_delivery`** | `DATE` | — |
| 10 | **`actual_delivered_at`** | `TIMESTAMPTZ` | — |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 56. `stock_purchase_order_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`purchase_order_id`** | `UUID` | NOT NULL REFERENCES stock_purchase_orders(id) ON DELETE CASCADE |
| 3 | **`item_name`** | `VARCHAR(200)` | NOT NULL |
| 4 | **`sku`** | `VARCHAR(100)` | — |
| 5 | **`unit_purchase_price`** | `NUMERIC(12,2)` | NOT NULL |
| 6 | **`quantity_ordered`** | `INT` | NOT NULL |
| 7 | **`quantity_received`** | `INT` | DEFAULT 0 |
| 8 | **`total_cost`** | `NUMERIC(12,2)` | NOT NULL |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 57. `b2b_purchase_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`po_number`** | `VARCHAR(30)` | UNIQUE NOT NULL |
| 3 | **`buyer_store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`supplier_store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 5 | **`total_amount`** | `NUMERIC(12,2)` | NOT NULL |
| 6 | **`payment_terms`** | `VARCHAR(30)` | DEFAULT 'CREDIT_14D' CHECK (payment_terms IN ('CREDIT_7D','CREDIT_14D','CREDIT_30D','ADVANCE_UPI')) |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'PLACED' CHECK (status IN ('PLACED','CONFIRMED','DISPATCHED','RECEIVED','CANCELLED')) |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 58. `b2b_purchase_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`purchase_order_id`** | `UUID` | NOT NULL REFERENCES b2b_purchase_orders(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 4 | **`quantity`** | `NUMERIC(10,2)` | NOT NULL |
| 5 | **`unit_price`** | `NUMERIC(10,2)` | NOT NULL |
| 6 | **`total_price`** | `NUMERIC(10,2)` | NOT NULL |

---

### 59. `stock_transfers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`transfer_number`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 3 | **`from_warehouse_id`** | `UUID` | NOT NULL REFERENCES warehouses(id) |
| 4 | **`to_warehouse_id`** | `UUID` | NOT NULL REFERENCES warehouses(id) |
| 5 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_TRANSIT','COMPLETED','CANCELLED')) |
| 6 | **`notes`** | `TEXT` | — |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 60. `stock_transfer_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`transfer_id`** | `UUID` | NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 4 | **`quantity`** | `NUMERIC(10,2)` | NOT NULL |

---

## DOMAIN 6: CARTS, WISHLIST, OFFERS & REWARDS (Mrunal & Mahi)

### 61. `carts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`customer_id`** | `UUID` | REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`session_token`** | `VARCHAR(255)` | — |
| 4 | **`coupon_code`** | `VARCHAR(50)` | — |
| 5 | **`delivery_speed`** | `VARCHAR(30)` | DEFAULT 'EXPRESS_30M' CHECK (delivery_speed IN ('EXPRESS_30M','SAME_DAY','STORE_PICKUP')) |
| 6 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 62. `guest_carts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`session_token`** | `VARCHAR(255)` | UNIQUE NOT NULL |
| 3 | **`payload`** | `JSONB` | NOT NULL |
| 4 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 5 | **`expires_at`** | `TIMESTAMPTZ` | NOT NULL |

---

### 63. `cart_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`cart_id`** | `UUID` | NOT NULL REFERENCES carts(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 4 | **`variant_id`** | `UUID` | REFERENCES listing_variants(id) ON DELETE SET NULL |
| 5 | **`quantity`** | `NUMERIC(12,3)` | NOT NULL DEFAULT 1.000 |
| 6 | **`added_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(cart_id, listing_id, variant_id)`

---

### 64. `cart_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`cart_id`** | `UUID` | REFERENCES carts(id) ON DELETE CASCADE |
| 3 | **`user_id`** | `UUID` | REFERENCES users(id) |
| 4 | **`action`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`payload`** | `JSONB` | — |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 65. `wishlists`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 66. `wishlist_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`wishlist_id`** | `UUID` | NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 4 | **`added_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(wishlist_id, listing_id)`

---

### 67. `customer_favorites`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 4 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(customer_id, listing_id)`

---

### 68. `coupons`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`code`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 4 | **`discount_type`** | `VARCHAR(20)` | NOT NULL CHECK (discount_type IN ('PERCENTAGE','FLAT_AMOUNT')) |
| 5 | **`discount_value`** | `NUMERIC(10,2)` | NOT NULL |
| 6 | **`min_order_value`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 7 | **`max_discount_cap`** | `NUMERIC(10,2)` | — |
| 8 | **`usage_limit`** | `INT` | — |
| 9 | **`usage_count`** | `INT` | DEFAULT 0 |
| 10 | **`valid_from`** | `TIMESTAMPTZ` | NOT NULL |
| 11 | **`valid_until`** | `TIMESTAMPTZ` | NOT NULL |
| 12 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 13 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 69. `promotions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`title`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`promo_type`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`banner_url`** | `TEXT` | — |
| 6 | **`start_date`** | `TIMESTAMPTZ` | NOT NULL |
| 7 | **`end_date`** | `TIMESTAMPTZ` | NOT NULL |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 70. `promotion_products`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`promotion_id`** | `UUID` | REFERENCES promotions(id) ON DELETE CASCADE |
| 2 | **`listing_id`** | `UUID` | REFERENCES seller_listings(id) ON DELETE CASCADE |
| 3 | **`promo_price`** | `NUMERIC(10,2)` | NOT NULL |

**Table Constraints:**
- `PRIMARY KEY (promotion_id, listing_id)`

---

### 71. `rewards_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`points_balance`** | `INT` | DEFAULT 0 CHECK (points_balance >= 0) |
| 4 | **`lifetime_earned`** | `INT` | DEFAULT 0 |
| 5 | **`tier`** | `VARCHAR(30)` | DEFAULT 'BRONZE' |
| 6 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 72. `reward_ledger`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`points_change`** | `INT` | NOT NULL |
| 4 | **`transaction_type`** | `VARCHAR(30)` | NOT NULL CHECK (transaction_type IN ('EARN_ORDER','EARN_POS','REDEEM_ORDER','SIGNUP_BONUS')) |
| 5 | **`reference_id`** | `VARCHAR(100)` | — |
| 6 | **`balance_after`** | `INT` | NOT NULL |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 73. `rewards_ledger`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`points_change`** | `INT` | NOT NULL |
| 4 | **`transaction_type`** | `VARCHAR(30)` | NOT NULL CHECK (transaction_type IN ('EARN_ORDER','EARN_POS','REDEEM_ORDER','SIGNUP_BONUS')) |
| 5 | **`reference_id`** | `VARCHAR(100)` | — |
| 6 | **`balance_after`** | `INT` | NOT NULL |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 74. `customer_wallets`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`customer_id`** | `UUID` | NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`balance`** | `NUMERIC(10,2)` | DEFAULT 0.00 CHECK (balance >= 0.00) |
| 4 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 7: ORDERS, SHIPPING, PAYMENTS & SETTLEMENTS (Mayank & Mrunal)

### 75. `orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_number`** | `VARCHAR(30)` | UNIQUE NOT NULL |
| 3 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`delivery_address`** | `JSONB` | NOT NULL |
| 5 | **`delivery_mode`** | `VARCHAR(30)` | DEFAULT 'EXPRESS_30M' CHECK (delivery_mode IN ('EXPRESS_30M','SAME_DAY','STORE_PICKUP')) |
| 6 | **`total_mrp`** | `NUMERIC(10,2)` | NOT NULL |
| 7 | **`total_discount`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 8 | **`delivery_fee`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 9 | **`grand_total`** | `NUMERIC(10,2)` | NOT NULL |
| 10 | **`payment_method`** | `VARCHAR(30)` | NOT NULL CHECK (payment_method IN ('UPI','CREDIT_14D','CARD','CASH_ON_DELIVERY','WALLET','NET_BANKING','ADAB_PAY_LATER')) |
| 11 | **`payment_status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','AUTHORIZED','CAPTURED','PAID','FAILED','REFUNDED')) |
| 12 | **`order_status`** | `VARCHAR(30)` | DEFAULT 'PLACED' CHECK (order_status IN ('PLACED','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED')) |
| 13 | **`eta_minutes`** | `INT` | DEFAULT 25 |
| 14 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 15 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 76. `seller_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`parent_order_id`** | `UUID` | NOT NULL REFERENCES orders(id) ON DELETE CASCADE |
| 3 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`subtotal`** | `NUMERIC(10,2)` | NOT NULL |
| 5 | **`commission_fee`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 6 | **`seller_payout_amount`** | `NUMERIC(10,2)` | NOT NULL |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'NEW' CHECK (status IN ('NEW','ACCEPTED','PACKED','DISPATCHED','DELIVERED','CANCELLED')) |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 77. `order_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_order_id`** | `UUID` | NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 4 | **`variant_id`** | `UUID` | REFERENCES listing_variants(id) ON DELETE SET NULL |
| 5 | **`product_name`** | `VARCHAR(255)` | NOT NULL |
| 6 | **`quantity`** | `NUMERIC(12,3)` | NOT NULL |
| 7 | **`unit_price`** | `NUMERIC(10,2)` | NOT NULL |
| 8 | **`total_price`** | `NUMERIC(10,2)` | NOT NULL |

---

### 78. `order_status_history`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) ON DELETE CASCADE |
| 3 | **`seller_order_id`** | `UUID` | REFERENCES seller_orders(id) |
| 4 | **`previous_status`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`new_status`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`changed_by_user_id`** | `UUID` | REFERENCES users(id) |
| 7 | **`notes`** | `TEXT` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 79. `inventory_reservations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`inventory_id`** | `UUID` | NOT NULL REFERENCES inventory(id) |
| 3 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 4 | **`cart_id`** | `UUID` | REFERENCES carts(id) |
| 5 | **`quantity_reserved`** | `INT` | NOT NULL |
| 6 | **`expires_at`** | `TIMESTAMPTZ` | NOT NULL |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMMITTED','EXPIRED','RELEASED')) |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 80. `coupon_redemptions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | REFERENCES stores(id) |
| 3 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) |
| 5 | **`coupon_code`** | `VARCHAR(50)` | NOT NULL |
| 6 | **`discount_availed`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`redeemed_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 81. `payment_methods`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`method_type`** | `VARCHAR(30)` | NOT NULL CHECK (method_type IN ('CARD','UPI','NET_BANKING','WALLET')) |
| 4 | **`provider`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`token_reference`** | `VARCHAR(255)` | NOT NULL |
| 6 | **`last4`** | `VARCHAR(4)` | — |
| 7 | **`expiry_month`** | `INT` | — |
| 8 | **`expiry_year`** | `INT` | — |
| 9 | **`is_default`** | `BOOLEAN` | DEFAULT false |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 82. `payments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) ON DELETE CASCADE |
| 3 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`amount`** | `NUMERIC(14,2)` | NOT NULL |
| 5 | **`currency`** | `VARCHAR(10)` | DEFAULT 'INR' |
| 6 | **`payment_method`** | `VARCHAR(50)` | NOT NULL |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED')) |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 83. `payment_transactions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 3 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`payment_gateway`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`gateway_transaction_id`** | `VARCHAR(150)` | UNIQUE |
| 6 | **`amount`** | `NUMERIC(14,2)` | NOT NULL |
| 7 | **`currency`** | `VARCHAR(10)` | DEFAULT 'INR' |
| 8 | **`payment_mode`** | `VARCHAR(50)` | NOT NULL CHECK (payment_mode IN ('UPI','CARD','NET_BANKING','ADAB_PAY_LATER','WALLET','COD')) |
| 9 | **`status`** | `VARCHAR(50)` | DEFAULT 'PENDING' CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED')) |
| 10 | **`response_payload`** | `JSONB` | — |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 12 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 84. `payment_provider_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`provider_name`** | `VARCHAR(50)` | NOT NULL |
| 3 | **`merchant_id`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 85. `payment_webhook_subscriptions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`provider_name`** | `VARCHAR(50)` | NOT NULL |
| 3 | **`webhook_url`** | `TEXT` | NOT NULL |
| 4 | **`secret_key_hash`** | `VARCHAR(255)` | — |
| 5 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 86. `shipping_carriers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`code`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 3 | **`name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`tracking_url_template`** | `TEXT` | — |
| 5 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 87. `shipping_provider_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`carrier_id`** | `UUID` | REFERENCES shipping_carriers(id) |
| 4 | **`account_number`** | `VARCHAR(100)` | — |
| 5 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 88. `carrier_service_levels`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`carrier_id`** | `UUID` | REFERENCES shipping_carriers(id) ON DELETE CASCADE |
| 3 | **`service_code`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`service_name`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`expected_days`** | `INT` | DEFAULT 3 |
| 6 | **`is_active`** | `BOOLEAN` | DEFAULT true |

---

### 89. `delivery_slots`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`zone_id`** | `UUID` | NOT NULL REFERENCES delivery_zones(id) |
| 3 | **`slot_date`** | `DATE` | NOT NULL |
| 4 | **`start_time`** | `TIME` | NOT NULL |
| 5 | **`end_time`** | `TIME` | NOT NULL |
| 6 | **`max_deliveries`** | `INT` | DEFAULT 20 |
| 7 | **`current_booked`** | `INT` | DEFAULT 0 |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(zone_id, slot_date, start_time, end_time)`

---

### 90. `shipping_rates`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`zone_id`** | `UUID` | REFERENCES delivery_zones(id) |
| 3 | **`min_weight_kg`** | `NUMERIC(6,2)` | NOT NULL DEFAULT 0.00 |
| 4 | **`max_weight_kg`** | `NUMERIC(6,2)` | NOT NULL |
| 5 | **`base_rate`** | `NUMERIC(10,2)` | NOT NULL |
| 6 | **`per_kg_rate`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 91. `shipments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`seller_order_id`** | `UUID` | NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE |
| 3 | **`carrier_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`tracking_number`** | `VARCHAR(100)` | UNIQUE |
| 5 | **`label_url`** | `TEXT` | — |
| 6 | **`status`** | `VARCHAR(50)` | DEFAULT 'CREATED' CHECK (status IN ('CREATED','MANIFESTED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED')) |
| 7 | **`shipped_at`** | `TIMESTAMPTZ` | — |
| 8 | **`delivered_at`** | `TIMESTAMPTZ` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 92. `shipment_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`shipment_id`** | `UUID` | NOT NULL REFERENCES shipments(id) ON DELETE CASCADE |
| 3 | **`order_item_id`** | `UUID` | NOT NULL REFERENCES order_items(id) |

---

### 93. `tracking_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) ON DELETE CASCADE |
| 3 | **`driver_id`** | `UUID` | REFERENCES users(id) |
| 4 | **`event_name`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`event_description`** | `TEXT` | — |
| 6 | **`latitude`** | `NUMERIC(10,8)` | — |
| 7 | **`longitude`** | `NUMERIC(11,8)` | — |
| 8 | **`timestamp`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 94. `invoices`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`invoice_number`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 3 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) |
| 4 | **`seller_order_id`** | `UUID` | REFERENCES seller_orders(id) |
| 5 | **`tax_amount`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 6 | **`total_amount`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`invoice_pdf_url`** | `TEXT` | — |
| 8 | **`generated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 95. `settlements`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 3 | **`settlement_cycle`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`total_sales`** | `NUMERIC(14,2)` | NOT NULL |
| 5 | **`total_commission`** | `NUMERIC(12,2)` | NOT NULL |
| 6 | **`total_tax_deducted`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 7 | **`net_payable`** | `NUMERIC(14,2)` | NOT NULL |
| 8 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','PAID','DISPUTED')) |
| 9 | **`settled_at`** | `TIMESTAMPTZ` | — |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 96. `settlement_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`settlement_id`** | `UUID` | NOT NULL REFERENCES settlements(id) ON DELETE CASCADE |
| 3 | **`seller_order_id`** | `UUID` | NOT NULL REFERENCES seller_orders(id) |
| 4 | **`amount`** | `NUMERIC(12,2)` | NOT NULL |

---

### 97. `seller_payouts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`payout_batch_id`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`bank_account_id`** | `UUID` | NOT NULL REFERENCES seller_bank_accounts(id) |
| 5 | **`gross_earnings`** | `NUMERIC(14,2)` | NOT NULL |
| 6 | **`commission_deducted`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`tax_tcs_tds_deducted`** | `NUMERIC(12,2)` | NOT NULL |
| 8 | **`net_payout_amount`** | `NUMERIC(14,2)` | NOT NULL |
| 9 | **`utr_number`** | `VARCHAR(100)` | UNIQUE |
| 10 | **`payout_status`** | `VARCHAR(50)` | DEFAULT 'PROCESSING' CHECK (payout_status IN ('INITIATED','PROCESSING','SETTLED','FAILED','HELD_FOR_REVIEW')) |
| 11 | **`processed_at`** | `TIMESTAMPTZ` | — |
| 12 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 8: RETURNS, REFUNDS & REVIEWS (Mrunal & Mayank)

### 98. `returns`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) |
| 3 | **`seller_order_id`** | `UUID` | NOT NULL REFERENCES seller_orders(id) |
| 4 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 5 | **`reason`** | `VARCHAR(255)` | NOT NULL |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','ITEM_PICKED','COMPLETED','REJECTED')) |
| 7 | **`refund_amount`** | `NUMERIC(10,2)` | NOT NULL |
| 8 | **`refund_percentage`** | `NUMERIC(5,2)` | DEFAULT 100.00 |
| 9 | **`rejection_reason`** | `TEXT` | — |
| 10 | **`requested_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 11 | **`resolved_at`** | `TIMESTAMPTZ` | — |

---

### 99. `return_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`return_id`** | `UUID` | NOT NULL REFERENCES returns(id) ON DELETE CASCADE |
| 3 | **`order_item_id`** | `UUID` | NOT NULL REFERENCES order_items(id) |
| 4 | **`quantity`** | `INT` | NOT NULL |
| 5 | **`refund_amount`** | `NUMERIC(12,2)` | NOT NULL |
| 6 | **`reason`** | `VARCHAR(100)` | NOT NULL |
| 7 | **`item_condition`** | `VARCHAR(50)` | DEFAULT 'SEALED' |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 100. `return_status_history`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`return_id`** | `UUID` | NOT NULL REFERENCES returns(id) ON DELETE CASCADE |
| 3 | **`previous_status`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`new_status`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`notes`** | `TEXT` | — |
| 6 | **`changed_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 101. `refunds`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | NOT NULL REFERENCES orders(id) |
| 3 | **`return_id`** | `UUID` | REFERENCES returns(id) |
| 4 | **`amount`** | `NUMERIC(12,2)` | NOT NULL |
| 5 | **`refund_mode`** | `VARCHAR(30)` | NOT NULL CHECK (refund_mode IN ('ORIGINAL_PAYMENT','WALLET','CREDIT_OFFSET')) |
| 6 | **`gateway_refund_id`** | `VARCHAR(150)` | — |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','PROCESSED','FAILED')) |
| 8 | **`processed_at`** | `TIMESTAMPTZ` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 102. `refund_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`refund_id`** | `UUID` | NOT NULL REFERENCES refunds(id) ON DELETE CASCADE |
| 3 | **`order_item_id`** | `UUID` | NOT NULL REFERENCES order_items(id) |
| 4 | **`amount`** | `NUMERIC(12,2)` | NOT NULL |

---

### 103. `reviews`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) |
| 3 | **`customer_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 5 | **`rating`** | `INT` | NOT NULL CHECK (rating BETWEEN 1 AND 5) |
| 6 | **`title`** | `VARCHAR(150)` | — |
| 7 | **`comment`** | `TEXT` | — |
| 8 | **`seller_reply`** | `TEXT` | — |
| 9 | **`seller_replied_at`** | `TIMESTAMPTZ` | — |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 104. `review_replies`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`review_id`** | `UUID` | NOT NULL REFERENCES reviews(id) ON DELETE CASCADE |
| 3 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`responder_user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 5 | **`reply_text`** | `TEXT` | NOT NULL |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 105. `review_media`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`review_id`** | `UUID` | NOT NULL REFERENCES reviews(id) ON DELETE CASCADE |
| 3 | **`media_url`** | `TEXT` | NOT NULL |
| 4 | **`media_type`** | `VARCHAR(20)` | DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE','VIDEO')) |
| 5 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 9: POS, SUPPORT, MESSAGES, NOTIFICATIONS & AUDIT (All Portals)

### 106. `pos_sessions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`cashier_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`opening_balance`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 5 | **`closing_balance`** | `NUMERIC(12,2)` | — |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')) |
| 7 | **`opened_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 8 | **`closed_at`** | `TIMESTAMPTZ` | — |

---

### 107. `pos_sales`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`receipt_no`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`buyer_type`** | `VARCHAR(20)` | DEFAULT 'WALK_IN_CUSTOMER' |
| 5 | **`payment_mode`** | `VARCHAR(20)` | NOT NULL CHECK (payment_mode IN ('CASH','UPI','CARD','CREDIT_14D')) |
| 6 | **`total_amount`** | `NUMERIC(10,2)` | NOT NULL |
| 7 | **`points_earned`** | `INT` | DEFAULT 0 |
| 8 | **`announced_audio`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 108. `pos_sale_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`pos_sale_id`** | `UUID` | NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | REFERENCES seller_listings(id) |
| 4 | **`item_name`** | `VARCHAR(200)` | NOT NULL |
| 5 | **`unit_price`** | `NUMERIC(10,2)` | NOT NULL |
| 6 | **`quantity`** | `NUMERIC(8,3)` | NOT NULL |
| 7 | **`discount_amount`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 8 | **`line_total`** | `NUMERIC(12,2)` | NOT NULL |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 109. `pos_counter_shifts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`cashier_user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`opening_cash_balance`** | `NUMERIC(12,2)` | NOT NULL DEFAULT 0.00 |
| 5 | **`closing_cash_balance`** | `NUMERIC(12,2)` | — |
| 6 | **`actual_cash_counted`** | `NUMERIC(12,2)` | — |
| 7 | **`cash_discrepancy`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 8 | **`total_upi_soundbox_sales`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 9 | **`total_card_sales`** | `NUMERIC(12,2)` | DEFAULT 0.00 |
| 10 | **`shift_status`** | `VARCHAR(50)` | DEFAULT 'OPEN' CHECK (shift_status IN ('OPEN','CLOSED','AUDIT_FLAGGED')) |
| 11 | **`opened_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 12 | **`closed_at`** | `TIMESTAMPTZ` | — |

---

### 110. `message_threads`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`participant_a`** | `UUID` | NOT NULL REFERENCES users(id) |
| 3 | **`participant_b`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`subject`** | `VARCHAR(200)` | — |
| 5 | **`last_message_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 111. `messages`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`thread_id`** | `UUID` | NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE |
| 3 | **`sender_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`body`** | `TEXT` | NOT NULL |
| 5 | **`is_read`** | `BOOLEAN` | DEFAULT false |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 112. `notifications`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| 3 | **`title`** | `VARCHAR(150)` | NOT NULL |
| 4 | **`message`** | `TEXT` | NOT NULL |
| 5 | **`type`** | `VARCHAR(50)` | NOT NULL CHECK (type IN ('ORDER_STATUS','KYC_UPDATE','CREDIT_APPROVAL','PRICE_ALERT','GENERAL')) |
| 6 | **`is_read`** | `BOOLEAN` | DEFAULT false |
| 7 | **`action_url`** | `TEXT` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 113. `notification_deliveries`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`notification_id`** | `UUID` | NOT NULL REFERENCES notifications(id) ON DELETE CASCADE |
| 3 | **`channel`** | `VARCHAR(30)` | NOT NULL CHECK (channel IN ('IN_APP','SMS','EMAIL','WHATSAPP','PUSH')) |
| 4 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED','DELIVERED')) |
| 5 | **`error_message`** | `TEXT` | — |
| 6 | **`sent_at`** | `TIMESTAMPTZ` | — |

---

### 114. `notification_templates`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`event_key`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`title_template`** | `VARCHAR(200)` | NOT NULL |
| 4 | **`body_template`** | `TEXT` | NOT NULL |
| 5 | **`sms_template`** | `TEXT` | — |
| 6 | **`email_subject`** | `VARCHAR(200)` | — |
| 7 | **`email_html`** | `TEXT` | — |
| 8 | **`whatsapp_template_id`** | `VARCHAR(100)` | — |
| 9 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 115. `support_tickets`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`ticket_number`** | `VARCHAR(50)` | UNIQUE NOT NULL |
| 3 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`user_role`** | `VARCHAR(30)` | NOT NULL |
| 5 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 6 | **`category`** | `VARCHAR(100)` | NOT NULL |
| 7 | **`priority`** | `VARCHAR(30)` | DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')) |
| 8 | **`status`** | `VARCHAR(50)` | DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')) |
| 9 | **`assigned_admin_id`** | `UUID` | REFERENCES users(id) |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 11 | **`resolved_at`** | `TIMESTAMPTZ` | — |

---

### 116. `support_messages`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`ticket_id`** | `UUID` | NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE |
| 3 | **`sender_user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`message`** | `TEXT` | NOT NULL |
| 5 | **`attachment_url`** | `TEXT` | — |
| 6 | **`is_internal_admin_note`** | `BOOLEAN` | DEFAULT false |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 117. `support_assignments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`ticket_id`** | `UUID` | NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE |
| 3 | **`admin_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`assigned_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 5 | **`notes`** | `TEXT` | — |

---

### 118. `audit_logs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`actor_id`** | `UUID` | REFERENCES users(id) |
| 3 | **`action`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`entity_type`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`entity_id`** | `VARCHAR(100)` | NOT NULL |
| 6 | **`changes`** | `JSONB` | — |
| 7 | **`ip_address`** | `INET` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 119. `platform_settings`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`key`** | `VARCHAR(100)` | PRIMARY KEY |
| 2 | **`value`** | `JSONB` | NOT NULL |
| 3 | **`description`** | `TEXT` | — |
| 4 | **`updated_by`** | `UUID` | REFERENCES users(id) |
| 5 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 120. `account_health`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`order_defect_rate`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 4 | **`cancellation_rate`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 5 | **`late_dispatch_rate`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 6 | **`policy_compliance_score`** | `NUMERIC(5,2)` | DEFAULT 100.00 |
| 7 | **`status`** | `VARCHAR(30)` | DEFAULT 'GOOD' CHECK (status IN ('GOOD','AT_RISK','CRITICAL','SUSPENDED')) |
| 8 | **`last_evaluated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 121. `policy_violations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`violation_type`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`severity`** | `VARCHAR(30)` | DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')) |
| 5 | **`description`** | `TEXT` | NOT NULL |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPEALED','RESOLVED','ENFORCED')) |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 10: ENTERPRISE SUPPORT, AI, TAX, INTEGRATION & SYNC (Extended)

### 122. `feature_flags`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`flag_key`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`description`** | `TEXT` | — |
| 4 | **`is_enabled`** | `BOOLEAN` | DEFAULT false |
| 5 | **`target_roles`** | `TEXT[]` | DEFAULT '{}' |
| 6 | **`target_pincodes`** | `TEXT[]` | DEFAULT '{}' |
| 7 | **`percentage_rollout`** | `INT` | DEFAULT 100 CHECK (percentage_rollout BETWEEN 0 AND 100) |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 9 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 123. `outbox_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`aggregate_type`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`aggregate_id`** | `UUID` | NOT NULL |
| 4 | **`event_type`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`payload`** | `JSONB` | NOT NULL |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED','FAILED')) |
| 7 | **`retry_count`** | `INT` | DEFAULT 0 |
| 8 | **`error_message`** | `TEXT` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 10 | **`processed_at`** | `TIMESTAMPTZ` | — |

---

### 124. `idempotency_keys`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`key`** | `VARCHAR(255)` | UNIQUE NOT NULL |
| 3 | **`user_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 4 | **`request_path`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`response_status_code`** | `INT` | NOT NULL |
| 6 | **`response_body`** | `JSONB` | NOT NULL |
| 7 | **`locked_until`** | `TIMESTAMPTZ` | NOT NULL |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 125. `webhook_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`source`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`event_type`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`payload`** | `JSONB` | NOT NULL |
| 5 | **`status`** | `VARCHAR(30)` | DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSED','FAILED')) |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 126. `ai_product_recommendations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`customer_id`** | `UUID` | REFERENCES users(id) ON DELETE CASCADE |
| 4 | **`product_id`** | `UUID` | NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| 5 | **`recommendation_type`** | `VARCHAR(50)` | NOT NULL CHECK (recommendation_type IN ('SELL_RECOMMENDED','BUY_RECOMMENDED','HIGH_DEMAND_INSIGHT','TRENDING_NEAR_YOU','DEAD_STOCK_CLEARANCE','CROSS_SELL')) |
| 6 | **`confidence_score`** | `NUMERIC(5,4)` | NOT NULL DEFAULT 0.8500 |
| 7 | **`reason_text`** | `TEXT` | NOT NULL |
| 8 | **`expected_demand_lift_pct`** | `NUMERIC(5,2)` | — |
| 9 | **`action_taken`** | `VARCHAR(50)` | DEFAULT 'PENDING' CHECK (action_taken IN ('PENDING','ADDED_TO_SHELF','ORDERED_B2B','DISMISSED')) |
| 10 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 11 | **`expires_at`** | `TIMESTAMPTZ` | — |

---

### 127. `export_declarations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 3 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 4 | **`export_reference_no`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 5 | **`destination_country`** | `VARCHAR(100)` | NOT NULL |
| 6 | **`port_of_loading`** | `VARCHAR(100)` | NOT NULL |
| 7 | **`port_of_discharge`** | `VARCHAR(100)` | NOT NULL |
| 8 | **`incoterms`** | `VARCHAR(20)` | NOT NULL CHECK (incoterms IN ('FOB','CIF','EXW','DDP','CFR')) |
| 9 | **`hs_code`** | `VARCHAR(50)` | NOT NULL |
| 10 | **`fob_value_usd`** | `NUMERIC(12,2)` | NOT NULL |
| 11 | **`cif_value_usd`** | `NUMERIC(12,2)` | NOT NULL |
| 12 | **`shipping_bill_no`** | `VARCHAR(100)` | — |
| 13 | **`customs_clearance_status`** | `VARCHAR(50)` | DEFAULT 'DRAFT' CHECK (customs_clearance_status IN ('DRAFT','SUBMITTED','UNDER_INSPECTION','CUSTOMS_CLEARED','CONTAINER_LOADED','SAILED','REJECTED')) |
| 14 | **`phytosanitary_cert_no`** | `VARCHAR(100)` | — |
| 15 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 16 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 128. `compliance_certificates`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`certificate_type`** | `VARCHAR(100)` | NOT NULL CHECK (certificate_type IN ('FSSAI_CENTRAL','FSSAI_STATE','ORGANIC_INDIA_NPOP','HALAL_CERTIFICATE','ISO_22000','AGMARK','IMPORT_EXPORT_CODE_IEC','APEDA_REGISTRATION')) |
| 4 | **`certificate_name`** | `VARCHAR(200)` | NOT NULL |
| 5 | **`issuing_authority`** | `VARCHAR(200)` | NOT NULL |
| 6 | **`license_number`** | `VARCHAR(100)` | NOT NULL |
| 7 | **`issue_date`** | `DATE` | NOT NULL |
| 8 | **`expiry_date`** | `DATE` | NOT NULL |
| 9 | **`document_url`** | `TEXT` | NOT NULL |
| 10 | **`verification_status`** | `VARCHAR(50)` | DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','EXPIRED','REJECTED')) |
| 11 | **`verified_by_admin_id`** | `UUID` | REFERENCES users(id) |
| 12 | **`verified_at`** | `TIMESTAMPTZ` | — |
| 13 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 129. `partner_brand_contracts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`brand_id`** | `UUID` | NOT NULL REFERENCES brands(id) |
| 3 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`authorized_tier`** | `VARCHAR(50)` | DEFAULT 'SILVER_DEALER' |
| 5 | **`commission_rebate_pct`** | `NUMERIC(5,2)` | DEFAULT 3.50 |
| 6 | **`minimum_monthly_stock_units`** | `INT` | DEFAULT 50 |
| 7 | **`exclusive_territory_pincode`** | `VARCHAR(20)` | — |
| 8 | **`contract_start_date`** | `DATE` | NOT NULL |
| 9 | **`contract_end_date`** | `DATE` | NOT NULL |
| 10 | **`status`** | `VARCHAR(50)` | DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','TERMINATED','RENEWAL_PENDING')) |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(brand_id, store_id)`

---

### 130. `freight_shipments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`shipment_manifest_no`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`origin_store_id`** | `UUID` | NOT NULL REFERENCES stores(id) |
| 4 | **`destination_hub_id`** | `UUID` | REFERENCES delivery_zones(id) |
| 5 | **`transporter_name`** | `VARCHAR(150)` | NOT NULL |
| 6 | **`vehicle_number`** | `VARCHAR(50)` | NOT NULL |
| 7 | **`driver_name`** | `VARCHAR(100)` | NOT NULL |
| 8 | **`driver_phone`** | `VARCHAR(20)` | NOT NULL |
| 9 | **`total_weight_kg`** | `NUMERIC(10,2)` | NOT NULL |
| 10 | **`freight_charges`** | `NUMERIC(12,2)` | NOT NULL |
| 11 | **`dispatch_status`** | `VARCHAR(50)` | DEFAULT 'SCHEDULED' CHECK (dispatch_status IN ('SCHEDULED','LOADING','IN_TRANSIT','CUSTOMS_INSPECTED','DELIVERED','DELAYED','CANCELLED')) |
| 12 | **`dispatched_at`** | `TIMESTAMPTZ` | — |
| 13 | **`expected_arrival_at`** | `TIMESTAMPTZ` | — |
| 14 | **`actual_delivered_at`** | `TIMESTAMPTZ` | — |
| 15 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 131. `delivery_fleet_routes`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`driver_id`** | `UUID` | NOT NULL REFERENCES users(id) |
| 3 | **`vehicle_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`assigned_pincodes`** | `TEXT[]` | NOT NULL |
| 5 | **`total_assigned_stops`** | `INT` | DEFAULT 0 |
| 6 | **`completed_stops`** | `INT` | DEFAULT 0 |
| 7 | **`active_latitude`** | `NUMERIC(10,8)` | — |
| 8 | **`active_longitude`** | `NUMERIC(11,8)` | — |
| 9 | **`last_location_ping`** | `TIMESTAMPTZ` | — |
| 10 | **`route_status`** | `VARCHAR(50)` | DEFAULT 'IDLE' CHECK (route_status IN ('IDLE','EN_ROUTE_PICKUP','OUT_FOR_DELIVERY','SHIFT_COMPLETED')) |
| 11 | **`shift_date`** | `DATE` | NOT NULL DEFAULT CURRENT_DATE |
| 12 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 132. `store_performance_metrics`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`metric_date`** | `DATE` | NOT NULL DEFAULT CURRENT_DATE |
| 4 | **`total_orders`** | `INT` | DEFAULT 0 |
| 5 | **`fulfilled_orders`** | `INT` | DEFAULT 0 |
| 6 | **`cancelled_orders`** | `INT` | DEFAULT 0 |
| 7 | **`avg_fulfillment_time_minutes`** | `NUMERIC(8,2)` | DEFAULT 0.00 |
| 8 | **`sla_adherence_pct`** | `NUMERIC(5,2)` | DEFAULT 100.00 |
| 9 | **`customer_rating_avg`** | `NUMERIC(3,2)` | DEFAULT 5.00 |
| 10 | **`on_time_delivery_pct`** | `NUMERIC(5,2)` | DEFAULT 100.00 |
| 11 | **`total_gross_revenue`** | `NUMERIC(14,2)` | DEFAULT 0.00 |
| 12 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(store_id, metric_date)`

---

### 133. `catalog_stories_feed`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`media_url`** | `TEXT` | NOT NULL |
| 4 | **`media_type`** | `VARCHAR(20)` | DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE','VIDEO')) |
| 5 | **`caption`** | `VARCHAR(250)` | — |
| 6 | **`linked_product_id`** | `UUID` | REFERENCES products(id) ON DELETE SET NULL |
| 7 | **`view_count`** | `INT` | DEFAULT 0 |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 10 | **`expires_at`** | `TIMESTAMPTZ` | DEFAULT NOW() + INTERVAL '24 HOURS' |

---

### 134. `external_channel_accounts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL REFERENCES stores(id) ON DELETE CASCADE |
| 3 | **`channel_name`** | `VARCHAR(50)` | NOT NULL CHECK (channel_name IN ('AMAZON','FLIPKART','MYNTRA','BLINKIT','ZEPTO')) |
| 4 | **`channel_seller_id`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`auth_credentials`** | `JSONB` | — |
| 6 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 135. `external_channel_listings`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`channel_account_id`** | `UUID` | NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE |
| 3 | **`listing_id`** | `UUID` | NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE |
| 4 | **`external_listing_id`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`sync_status`** | `VARCHAR(30)` | DEFAULT 'SYNCED' |
| 6 | **`last_synced_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 136. `external_channel_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`channel_account_id`** | `UUID` | NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE |
| 3 | **`seller_order_id`** | `UUID` | REFERENCES seller_orders(id) |
| 4 | **`external_order_id`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`payload`** | `JSONB` | — |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 137. `external_channel_sync_jobs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`channel_account_id`** | `UUID` | NOT NULL REFERENCES external_channel_accounts(id) ON DELETE CASCADE |
| 3 | **`job_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' |
| 5 | **`log`** | `TEXT` | — |
| 6 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 138. `integration_credentials`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`integration_name`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`credentials_encrypted`** | `JSONB` | NOT NULL |
| 4 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 5 | **`updated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 139. `integration_logs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`integration_name`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`event`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`correlation_id`** | `VARCHAR(100)` | — |
| 5 | **`status`** | `VARCHAR(30)` | NOT NULL |
| 6 | **`details`** | `JSONB` | — |
| 7 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 140. `integration_sync_checkpoints`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`integration_name`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`checkpoint_key`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`last_synced_value`** | `TEXT` | NOT NULL |
| 5 | **`synced_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

**Table Constraints:**
- `UNIQUE(integration_name, checkpoint_key)`

---

### 141. `file_uploads`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`uploader_id`** | `UUID` | REFERENCES users(id) |
| 3 | **`file_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`file_name`** | `VARCHAR(255)` | NOT NULL |
| 5 | **`storage_key`** | `TEXT` | NOT NULL |
| 6 | **`file_url`** | `TEXT` | NOT NULL |
| 7 | **`file_size_bytes`** | `BIGINT` | — |
| 8 | **`mime_type`** | `VARCHAR(100)` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 142. `tax_rules`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`hsn_sac_code`** | `VARCHAR(50)` | NOT NULL |
| 3 | **`tax_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`cgst_pct`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 5 | **`sgst_pct`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 6 | **`igst_pct`** | `NUMERIC(5,2)` | DEFAULT 0.00 |
| 7 | **`effective_from`** | `DATE` | NOT NULL |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |

---

### 143. `tax_documents`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 3 | **`doc_type`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`doc_number`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`file_url`** | `TEXT` | NOT NULL |
| 6 | **`issued_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 144. `fraud_risk_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | REFERENCES users(id) |
| 3 | **`order_id`** | `UUID` | REFERENCES orders(id) |
| 4 | **`risk_score`** | `NUMERIC(5,2)` | NOT NULL |
| 5 | **`flag_reason`** | `VARCHAR(255)` | NOT NULL |
| 6 | **`action_taken`** | `VARCHAR(50)` | DEFAULT 'FLAGGED' |
| 7 | **`evaluated_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 145. `report_jobs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`user_id`** | `UUID` | REFERENCES users(id) |
| 3 | **`report_type`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`filter_params`** | `JSONB` | — |
| 5 | **`file_format`** | `VARCHAR(10)` | DEFAULT 'CSV' |
| 6 | **`status`** | `VARCHAR(30)` | DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')) |
| 7 | **`download_url`** | `TEXT` | — |
| 8 | **`error_message`** | `TEXT` | — |
| 9 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |
| 10 | **`completed_at`** | `TIMESTAMPTZ` | — |

---

### 146. `scheduled_reports`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`title`** | `VARCHAR(150)` | NOT NULL |
| 3 | **`cron_expression`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`report_type`** | `VARCHAR(100)` | NOT NULL |
| 5 | **`recipients`** | `TEXT[]` | NOT NULL |
| 6 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`last_run_at`** | `TIMESTAMPTZ` | — |
| 8 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

### 147. `ai_audit_logs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() |
| 2 | **`store_id`** | `UUID` | NOT NULL |
| 3 | **`user_id`** | `UUID` | — |
| 4 | **`prompt`** | `TEXT` | — |
| 5 | **`tool_name`** | `TEXT` | NOT NULL |
| 6 | **`tool_tier`** | `TEXT` | DEFAULT 'TIER_1_READ' |
| 7 | **`arguments`** | `JSONB` | DEFAULT '{}'::jsonb |
| 8 | **`result`** | `JSONB` | DEFAULT '{}'::jsonb |
| 9 | **`success`** | `BOOLEAN` | NOT NULL DEFAULT true |
| 10 | **`duration_ms`** | `INT` | DEFAULT 0 |
| 11 | **`created_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

## DOMAIN 11: B2B COMMERCE & MANUFACTURER PLATFORM (Standalone & Hybrid B2B)

### 148. `manage_b_to_b_user_type`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`typename`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`description`** | `TEXT` | — |
| 4 | **`active`** | `BOOLEAN` | DEFAULT true |
| 5 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 149. `state`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`state_name`** | `VARCHAR(100)` | NOT NULL |
| 3 | **`active`** | `BOOLEAN` | DEFAULT true |
| 4 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 150. `city`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`state_id`** | `INTEGER` | REFERENCES state(id) |
| 3 | **`city_name`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`active`** | `BOOLEAN` | DEFAULT true |
| 5 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 151. `campaigns`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`name`** | `VARCHAR(255)` | NOT NULL |
| 3 | **`type`** | `VARCHAR(100)` | — |
| 4 | **`description`** | `TEXT` | — |
| 5 | **`start_date`** | `TIMESTAMP` | — |
| 6 | **`end_date`** | `TIMESTAMP` | — |
| 7 | **`created_by`** | `INTEGER` | — |
| 8 | **`is_active`** | `BOOLEAN` | DEFAULT true |
| 9 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 10 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 152. `campaign_notifications`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`title`** | `VARCHAR(255)` | — |
| 3 | **`message`** | `TEXT` | — |
| 4 | **`target_role`** | `VARCHAR(50)` | — |
| 5 | **`created_by`** | `INTEGER` | — |
| 6 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 153. `campaign_deliveries`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`campaign_notification_id`** | `INTEGER` | — |
| 3 | **`user_id`** | `INTEGER` | — |
| 4 | **`delivered_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 5 | **`status`** | `VARCHAR(50)` | DEFAULT 'delivered' |

---

### 154. `manage_b_to_b_userdetail`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`business_type_id`** | `INTEGER` | REFERENCES manage_b_to_b_user_type(id) |
| 3 | **`company_name`** | `VARCHAR(255)` | — |
| 4 | **`owner_name`** | `VARCHAR(255)` | — |
| 5 | **`contact_person`** | `VARCHAR(255)` | — |
| 6 | **`email`** | `VARCHAR(255)` | UNIQUE |
| 7 | **`mobile`** | `VARCHAR(20)` | — |
| 8 | **`password`** | `VARCHAR(255)` | — |
| 9 | **`gst_number`** | `VARCHAR(50)` | — |
| 10 | **`pan_number`** | `VARCHAR(50)` | — |
| 11 | **`kyc_status`** | `VARCHAR(50)` | DEFAULT 'PENDING' |
| 12 | **`address`** | `TEXT` | — |
| 13 | **`city`** | `VARCHAR(100)` | — |
| 14 | **`state`** | `VARCHAR(100)` | — |
| 15 | **`country`** | `VARCHAR(100)` | DEFAULT 'India' |
| 16 | **`pincode`** | `VARCHAR(20)` | — |
| 17 | **`latitude`** | `NUMERIC(10,8)` | — |
| 18 | **`longitude`** | `NUMERIC(11,8)` | — |
| 19 | **`fk_state`** | `INTEGER` | REFERENCES state(id) |
| 20 | **`fk_city`** | `INTEGER` | REFERENCES city(id) |
| 21 | **`serviceable_pincodes`** | `VARCHAR(10)[]` | — |
| 22 | **`is_featured`** | `BOOLEAN` | DEFAULT false |
| 23 | **`campaign_id`** | `INTEGER` | REFERENCES campaigns(id) ON DELETE SET NULL |
| 24 | **`product_category`** | `VARCHAR(255)` | — |
| 25 | **`age`** | `INTEGER` | — |
| 26 | **`gender`** | `VARCHAR(20)` | — |
| 27 | **`personal_contact`** | `VARCHAR(20)` | — |
| 28 | **`personal_email`** | `VARCHAR(255)` | — |
| 29 | **`bank_name`** | `VARCHAR(255)` | — |
| 30 | **`bank_account_no`** | `VARCHAR(100)` | — |
| 31 | **`ifsc_code`** | `VARCHAR(50)` | — |
| 32 | **`refresh_token`** | `VARCHAR(255)` | — |
| 33 | **`active`** | `BOOLEAN` | DEFAULT true |
| 34 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 35 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 36 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 155. `shopdetail`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`shop_name`** | `VARCHAR(255)` | — |
| 3 | **`owner_name`** | `VARCHAR(255)` | — |
| 4 | **`first_name`** | `VARCHAR(255)` | — |
| 5 | **`email_id`** | `VARCHAR(255)` | — |
| 6 | **`mobile_number`** | `VARCHAR(20)` | — |
| 7 | **`password`** | `VARCHAR(255)` | — |
| 8 | **`gst_id`** | `VARCHAR(50)` | — |
| 9 | **`fk_city`** | `INTEGER` | — |
| 10 | **`fk_state`** | `INTEGER` | — |
| 11 | **`fk_country`** | `INTEGER` | — |
| 12 | **`active`** | `BOOLEAN` | DEFAULT true |
| 13 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 14 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 15 | **`delete_at`** | `TIMESTAMP` | — |

---

### 156. `territory_assignments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`manufacturer_id`** | `INTEGER` | — |
| 3 | **`territory_name`** | `VARCHAR(255)` | — |
| 4 | **`state`** | `VARCHAR(100)` | — |
| 5 | **`city`** | `VARCHAR(100)` | — |
| 6 | **`pincode`** | `VARCHAR(20)` | — |
| 7 | **`state_id`** | `INTEGER` | — |
| 8 | **`city_id`** | `INTEGER` | — |
| 9 | **`distributor_id`** | `INTEGER` | — |
| 10 | **`status`** | `VARCHAR(50)` | DEFAULT 'active' |
| 11 | **`active`** | `BOOLEAN` | DEFAULT true |
| 12 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 13 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 14 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 157. `manage_b_to_b_categories`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`manufacturer_id`** | `INTEGER` | — |
| 3 | **`category_name`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`description`** | `TEXT` | — |
| 5 | **`image_url`** | `TEXT` | — |
| 6 | **`active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 8 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 9 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 158. `manage_b_to_b_subcategories`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`category_id`** | `INTEGER` | REFERENCES manage_b_to_b_categories(id) ON DELETE CASCADE |
| 3 | **`subcategory_name`** | `VARCHAR(255)` | NOT NULL |
| 4 | **`description`** | `TEXT` | — |
| 5 | **`image_url`** | `TEXT` | — |
| 6 | **`active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 8 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 159. `distributor_products`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | — |
| 3 | **`product_name`** | `VARCHAR(255)` | — |
| 4 | **`sku`** | `VARCHAR(100)` | — |
| 5 | **`category`** | `VARCHAR(100)` | — |
| 6 | **`price`** | `DECIMAL(12,2)` | DEFAULT 0 |
| 7 | **`stock`** | `INTEGER` | DEFAULT 0 |
| 8 | **`status`** | `VARCHAR(50)` | DEFAULT 'ACTIVE' |
| 9 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 10 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 11 | **`product_id`** | `INTEGER` | — |
| 12 | **`stock_quantity`** | `INTEGER` | DEFAULT 0 |
| 13 | **`is_published`** | `BOOLEAN` | DEFAULT true |

**Table Constraints:**
- `CONSTRAINT unique_distributor_product UNIQUE (distributor_id, product_id)`

---

### 160. `manage_manufacturer_products`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`manufacturer_id`** | `INTEGER` | NOT NULL |
| 3 | **`category_id`** | `INTEGER` | — |
| 4 | **`subcategory_id`** | `INTEGER` | — |
| 5 | **`category`** | `VARCHAR(255)` | — |
| 6 | **`sub_category`** | `VARCHAR(255)` | — |
| 7 | **`product_name`** | `VARCHAR(255)` | NOT NULL |
| 8 | **`sku`** | `VARCHAR(100)` | — |
| 9 | **`description`** | `TEXT` | — |
| 10 | **`unit`** | `VARCHAR(50)` | DEFAULT 'pcs' |
| 11 | **`price`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 12 | **`mrp`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 13 | **`manufacturer_price`** | `NUMERIC(12,2)` | — |
| 14 | **`distributor_price`** | `NUMERIC(12,2)` | — |
| 15 | **`retail_price`** | `NUMERIC(12,2)` | — |
| 16 | **`moq`** | `INTEGER` | DEFAULT 1 |
| 17 | **`total_stock`** | `INTEGER` | DEFAULT 0 |
| 18 | **`stock_quantity`** | `INTEGER` | DEFAULT 0 |
| 19 | **`north_hub`** | `INTEGER` | DEFAULT 0 |
| 20 | **`south_hub`** | `INTEGER` | DEFAULT 0 |
| 21 | **`central_hub`** | `INTEGER` | DEFAULT 0 |
| 22 | **`image_url`** | `TEXT` | — |
| 23 | **`image`** | `TEXT` | — |
| 24 | **`product_image`** | `TEXT` | — |
| 25 | **`tier_pricing`** | `JSONB` | — |
| 26 | **`status`** | `VARCHAR(50)` | DEFAULT 'active' |
| 27 | **`active`** | `BOOLEAN` | DEFAULT true |
| 28 | **`created_by`** | `INTEGER` | — |
| 29 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 30 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 31 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 161. `manage_b_to_b_cart`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | NOT NULL |
| 3 | **`product_id`** | `INTEGER` | REFERENCES manage_manufacturer_products(id) ON DELETE CASCADE |
| 4 | **`quantity`** | `INTEGER` | DEFAULT 1 |
| 5 | **`unit_price`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 6 | **`active`** | `BOOLEAN` | DEFAULT true |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 8 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 162. `manage_b_to_b_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`order_number`** | `VARCHAR(100)` | UNIQUE NOT NULL |
| 3 | **`distributor_id`** | `INTEGER` | NOT NULL |
| 4 | **`manufacturer_id`** | `INTEGER` | NOT NULL |
| 5 | **`shop_id`** | `INTEGER` | — |
| 6 | **`total_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 7 | **`tax_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 8 | **`discount_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 9 | **`delivery_charge`** | `NUMERIC(10,2)` | DEFAULT 0.00 |
| 10 | **`final_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 11 | **`status`** | `VARCHAR(50)` | DEFAULT 'PENDING' |
| 12 | **`payment_status`** | `VARCHAR(50)` | DEFAULT 'UNPAID' |
| 13 | **`delivery_mode`** | `VARCHAR(50)` | DEFAULT 'Standard Ground Shipping' |
| 14 | **`payment_mode`** | `VARCHAR(50)` | DEFAULT 'CASH' |
| 15 | **`tracking_number`** | `VARCHAR(100)` | — |
| 16 | **`shipping_address`** | `TEXT` | — |
| 17 | **`active`** | `BOOLEAN` | DEFAULT true |
| 18 | **`order_date`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 19 | **`created_by`** | `INTEGER` | — |
| 20 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 21 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 22 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 163. `manage_b_to_b_order_items`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`order_id`** | `INTEGER` | REFERENCES manage_b_to_b_orders(id) ON DELETE CASCADE |
| 3 | **`product_id`** | `INTEGER` | REFERENCES manage_manufacturer_products(id) |
| 4 | **`product_name`** | `VARCHAR(255)` | — |
| 5 | **`quantity`** | `INTEGER` | NOT NULL |
| 6 | **`unit_price`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`total_price`** | `NUMERIC(12,2)` | NOT NULL |
| 8 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 164. `manage_b_to_b_order_status_history`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`order_id`** | `INTEGER` | REFERENCES manage_b_to_b_orders(id) ON DELETE CASCADE |
| 3 | **`status`** | `VARCHAR(50)` | NOT NULL |
| 4 | **`notes`** | `TEXT` | — |
| 5 | **`updated_by`** | `INTEGER` | — |
| 6 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 165. `manage_b2b_purchase_order`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`order_number`** | `VARCHAR(100)` | — |
| 3 | **`distributor_id`** | `INTEGER` | — |
| 4 | **`manufacturer_id`** | `INTEGER` | — |
| 5 | **`total_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 6 | **`status`** | `VARCHAR(50)` | DEFAULT 'PENDING' |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 8 | **`deleted_at`** | `TIMESTAMP` | — |
| 9 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 10 | **`item_count`** | `INTEGER` | DEFAULT 1 |
| 11 | **`notes`** | `TEXT` | — |
| 12 | **`delivery_date`** | `DATE` | — |
| 13 | **`fk_supplier_detail`** | `INTEGER` | — |
| 14 | **`fk_shop_detail`** | `INTEGER` | — |
| 15 | **`tax`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 16 | **`grand_total`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 17 | **`paid_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 18 | **`due_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 19 | **`payment_status`** | `VARCHAR(50)` | DEFAULT 'UNPAID' |
| 20 | **`po_number`** | `VARCHAR(100)` | — |

---

### 166. `manage_b2b_purchase_order_detail`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`fk_purchase_order`** | `INTEGER` | REFERENCES manage_b2b_purchase_order(id) ON DELETE CASCADE |
| 3 | **`product_id`** | `INTEGER` | — |
| 4 | **`product_name`** | `VARCHAR(255)` | — |
| 5 | **`quantity`** | `INTEGER` | — |
| 6 | **`price`** | `NUMERIC(12,2)` | — |
| 7 | **`tax`** | `NUMERIC(12,2)` | — |
| 8 | **`grand_total`** | `NUMERIC(12,2)` | — |
| 9 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 10 | **`fk_product`** | `INTEGER` | — |
| 11 | **`unit_price`** | `NUMERIC(12,2)` | — |

---

### 167. `manage_b_to_b_request_access`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | — |
| 3 | **`manufacturer_id`** | `INTEGER` | — |
| 4 | **`name`** | `VARCHAR(255)` | — |
| 5 | **`email_distributer`** | `VARCHAR(255)` | — |
| 6 | **`email_manufacturer`** | `VARCHAR(255)` | — |
| 7 | **`description`** | `TEXT` | — |
| 8 | **`unique_request_id`** | `VARCHAR(100)` | — |
| 9 | **`distributer_request`** | `INTEGER` | DEFAULT 1 |
| 10 | **`manufacture_request`** | `INTEGER` | DEFAULT 1 |
| 11 | **`request_type`** | `VARCHAR(50)` | DEFAULT 'CONNECTION' |
| 12 | **`status`** | `VARCHAR(50)` | DEFAULT 'PENDING' |
| 13 | **`proposed_price`** | `NUMERIC(12,2)` | — |
| 14 | **`counter_price`** | `NUMERIC(12,2)` | — |
| 15 | **`notes`** | `TEXT` | — |
| 16 | **`active`** | `BOOLEAN` | DEFAULT true |
| 17 | **`created_by`** | `INTEGER` | — |
| 18 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 19 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 20 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 168. `manage_b_to_b_settlements`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`settlement_number`** | `VARCHAR(100)` | UNIQUE |
| 3 | **`manufacturer_id`** | `INTEGER` | — |
| 4 | **`shop_id`** | `INTEGER` | — |
| 5 | **`total_invoice_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 6 | **`total_collected`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 7 | **`commission`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 8 | **`pg_charges`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 9 | **`returns_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 10 | **`tds`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 11 | **`net_payable`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 12 | **`status`** | `VARCHAR(50)` | DEFAULT 'pending' |
| 13 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 14 | **`created_by`** | `INTEGER` | — |
| 15 | **`modified_at`** | `TIMESTAMP` | — |
| 16 | **`modified_by`** | `INTEGER` | — |
| 17 | **`deleted_at`** | `TIMESTAMP` | — |
| 18 | **`deleted_by`** | `INTEGER` | — |

---

### 169. `manage_b_to_b_invoices`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`invoice_number`** | `VARCHAR(100)` | UNIQUE |
| 3 | **`order_id`** | `INTEGER` | REFERENCES manage_b_to_b_orders(id) |
| 4 | **`distributor_id`** | `INTEGER` | — |
| 5 | **`manufacturer_id`** | `INTEGER` | — |
| 6 | **`shop_id`** | `INTEGER` | — |
| 7 | **`settlement_id`** | `INTEGER` | — |
| 8 | **`total_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 9 | **`subtotal`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 10 | **`tax_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 11 | **`gst_percentage`** | `NUMERIC(5,2)` | DEFAULT 0 |
| 12 | **`status`** | `VARCHAR(50)` | DEFAULT 'issued' |
| 13 | **`due_date`** | `DATE` | — |
| 14 | **`invoice_pdf_url`** | `TEXT` | — |
| 15 | **`items_json`** | `JSONB` | — |
| 16 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 17 | **`created_by`** | `INTEGER` | — |
| 18 | **`modified_at`** | `TIMESTAMP` | — |
| 19 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 170. `manage_b_to_b_payments`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | — |
| 3 | **`shop_id`** | `INTEGER` | — |
| 4 | **`manufacturer_id`** | `INTEGER` | — |
| 5 | **`invoice_id`** | `INTEGER` | REFERENCES manage_b_to_b_invoices(id) |
| 6 | **`amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 7 | **`mode`** | `VARCHAR(50)` | — |
| 8 | **`reference_id`** | `VARCHAR(120)` | — |
| 9 | **`status`** | `VARCHAR(50)` | DEFAULT 'completed' |
| 10 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 11 | **`created_by`** | `INTEGER` | — |
| 12 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 171. `manage_b_to_b_payment_allocations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`payment_id`** | `INTEGER` | REFERENCES manage_b_to_b_payments(id) |
| 3 | **`invoice_id`** | `INTEGER` | REFERENCES manage_b_to_b_invoices(id) |
| 4 | **`allocated_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 5 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

**Table Constraints:**
- `UNIQUE(payment_id, invoice_id)`

---

### 172. `manage_b_to_b_credit_notes`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`credit_note_number`** | `VARCHAR(100)` | UNIQUE |
| 3 | **`invoice_id`** | `INTEGER` | REFERENCES manage_b_to_b_invoices(id) |
| 4 | **`manufacturer_id`** | `INTEGER` | — |
| 5 | **`distributor_id`** | `INTEGER` | — |
| 6 | **`shop_id`** | `INTEGER` | — |
| 7 | **`amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 8 | **`reason`** | `TEXT` | — |
| 9 | **`status`** | `VARCHAR(50)` | DEFAULT 'approved' |
| 10 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 11 | **`created_by`** | `INTEGER` | — |
| 12 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 173. `manage_b_to_b_ledger_entries`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | — |
| 3 | **`shop_id`** | `INTEGER` | — |
| 4 | **`type`** | `VARCHAR(50)` | — |
| 5 | **`reference_id`** | `INTEGER` | — |
| 6 | **`description`** | `TEXT` | — |
| 7 | **`debit`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 8 | **`credit`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 9 | **`balance`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 10 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 174. `relationship_credits`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`creditor_id`** | `INTEGER` | NOT NULL |
| 3 | **`debtor_id`** | `INTEGER` | NOT NULL |
| 4 | **`debtor_type`** | `VARCHAR(50)` | NOT NULL |
| 5 | **`credit_limit`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 6 | **`credit_days`** | `INTEGER` | DEFAULT 30 |
| 7 | **`outstanding_amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 8 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 9 | **`modified_at`** | `TIMESTAMP` | — |

**Table Constraints:**
- `UNIQUE(creditor_id, debtor_id, debtor_type)`

---

### 175. `manage_b_to_b_payouts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`settlement_id`** | `INTEGER` | REFERENCES manage_b_to_b_settlements(id) |
| 3 | **`amount`** | `NUMERIC(12,2)` | DEFAULT 0 |
| 4 | **`status`** | `VARCHAR(50)` | DEFAULT 'completed' |
| 5 | **`transaction_ref`** | `VARCHAR(120)` | — |
| 6 | **`failure_reason`** | `TEXT` | — |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 8 | **`created_by`** | `INTEGER` | — |

---

### 176. `razorpay_checkouts`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`distributor_id`** | `INTEGER` | NOT NULL |
| 3 | **`razorpay_order_id`** | `VARCHAR(100)` | UNIQUE |
| 4 | **`razorpay_payment_id`** | `VARCHAR(100)` | — |
| 5 | **`amount_paise`** | `BIGINT` | NOT NULL |
| 6 | **`amount_rupees`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`currency`** | `VARCHAR(10)` | NOT NULL DEFAULT 'INR' |
| 8 | **`status`** | `VARCHAR(30)` | DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','CREATED','PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','PROVIDER_ERROR','REFUNDED')) |
| 9 | **`payment_method`** | `VARCHAR(50)` | — |
| 10 | **`signature_verified`** | `BOOLEAN` | DEFAULT FALSE |
| 11 | **`webhook_verified`** | `BOOLEAN` | DEFAULT FALSE |
| 12 | **`verification_source`** | `VARCHAR(20)` | — |
| 13 | **`verified_at`** | `TIMESTAMP` | — |
| 14 | **`failure_reason`** | `TEXT` | — |
| 15 | **`error_code`** | `VARCHAR(100)` | — |
| 16 | **`error_description`** | `TEXT` | — |
| 17 | **`idempotency_key`** | `VARCHAR(100)` | UNIQUE |
| 18 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 19 | **`updated_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 20 | **`captured_at`** | `TIMESTAMP` | — |

---

### 177. `razorpay_checkout_orders`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`checkout_id`** | `INTEGER` | NOT NULL REFERENCES razorpay_checkouts(id) |
| 3 | **`order_id`** | `INTEGER` | NOT NULL REFERENCES manage_b_to_b_orders(id) |
| 4 | **`manufacturer_id`** | `INTEGER` | NOT NULL |
| 5 | **`order_amount_paise`** | `BIGINT` | NOT NULL |
| 6 | **`order_amount_rupees`** | `NUMERIC(12,2)` | NOT NULL |
| 7 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

**Table Constraints:**
- `UNIQUE(checkout_id, order_id)`

---

### 178. `razorpay_webhook_events`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`event_id`** | `VARCHAR(100)` | NOT NULL UNIQUE |
| 3 | **`event_type`** | `VARCHAR(100)` | NOT NULL |
| 4 | **`razorpay_order_id`** | `VARCHAR(100)` | — |
| 5 | **`razorpay_payment_id`** | `VARCHAR(100)` | — |
| 6 | **`processing_status`** | `VARCHAR(30)` | DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED','PROCESSING','PROCESSED','SKIPPED','FAILED')) |
| 7 | **`skip_reason`** | `VARCHAR(200)` | — |
| 8 | **`processing_error`** | `TEXT` | — |
| 9 | **`received_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 10 | **`processed_at`** | `TIMESTAMP` | — |
| 11 | **`source_ip`** | `VARCHAR(45)` | — |
| 12 | **`payload_summary`** | `JSONB` | — |

---

### 179. `manage_b_to_b_logistics_providers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`owner_id`** | `INTEGER` | — |
| 3 | **`provider_name`** | `VARCHAR(255)` | — |
| 4 | **`contact_person`** | `VARCHAR(255)` | — |
| 5 | **`mobile`** | `VARCHAR(20)` | — |
| 6 | **`email`** | `VARCHAR(255)` | — |
| 7 | **`address`** | `TEXT` | — |
| 8 | **`gst_number`** | `VARCHAR(100)` | — |
| 9 | **`active_status`** | `BOOLEAN` | DEFAULT true |
| 10 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |
| 11 | **`updated_at`** | `TIMESTAMP` | — |
| 12 | **`deleted_at`** | `TIMESTAMP` | — |

---

### 180. `manage_b_to_b_drivers`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`owner_id`** | `INTEGER` | — |
| 3 | **`logistics_provider_id`** | `INTEGER` | REFERENCES manage_b_to_b_logistics_providers(id) |
| 4 | **`driver_name`** | `VARCHAR(255)` | — |
| 5 | **`mobile`** | `VARCHAR(20)` | — |
| 6 | **`license_number`** | `VARCHAR(100)` | — |
| 7 | **`license_expiry_date`** | `DATE` | — |
| 8 | **`aadhaar_number`** | `VARCHAR(100)` | — |
| 9 | **`emergency_contact`** | `VARCHAR(20)` | — |
| 10 | **`is_available`** | `BOOLEAN` | DEFAULT true |
| 11 | **`status`** | `VARCHAR(50)` | DEFAULT 'active' |
| 12 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 181. `manage_b_to_b_vehicles`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`owner_id`** | `INTEGER` | — |
| 3 | **`logistics_provider_id`** | `INTEGER` | REFERENCES manage_b_to_b_logistics_providers(id) |
| 4 | **`driver_id`** | `INTEGER` | REFERENCES manage_b_to_b_drivers(id) |
| 5 | **`vehicle_number`** | `VARCHAR(100)` | — |
| 6 | **`vehicle_type`** | `VARCHAR(100)` | — |
| 7 | **`capacity`** | `VARCHAR(100)` | — |
| 8 | **`insurance_expiry_date`** | `DATE` | — |
| 9 | **`permit_expiry_date`** | `DATE` | — |
| 10 | **`is_available`** | `BOOLEAN` | DEFAULT true |
| 11 | **`status`** | `VARCHAR(50)` | DEFAULT 'active' |
| 12 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 182. `manage_b_to_b_vehicle_routes`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`owner_id`** | `INTEGER` | — |
| 3 | **`vehicle_id`** | `INTEGER` | REFERENCES manage_b_to_b_vehicles(id) |
| 4 | **`driver_id`** | `INTEGER` | REFERENCES manage_b_to_b_drivers(id) |
| 5 | **`order_id`** | `INTEGER` | REFERENCES manage_b_to_b_orders(id) |
| 6 | **`route_name`** | `VARCHAR(255)` | — |
| 7 | **`source_location`** | `VARCHAR(255)` | — |
| 8 | **`destination_location`** | `VARCHAR(255)` | — |
| 9 | **`waypoints`** | `JSONB` | — |
| 10 | **`estimated_distance_km`** | `NUMERIC(8,2)` | — |
| 11 | **`estimated_time_hours`** | `NUMERIC(6,2)` | — |
| 12 | **`status`** | `VARCHAR(50)` | DEFAULT 'SCHEDULED' |
| 13 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 183. `manage_b_to_b_support_tickets`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`user_id`** | `INTEGER` | — |
| 3 | **`subject`** | `VARCHAR(255)` | — |
| 4 | **`message`** | `TEXT` | — |
| 5 | **`status`** | `VARCHAR(50)` | DEFAULT 'OPEN' |
| 6 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 184. `manage_b_to_b_contact_submissions`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`name`** | `VARCHAR(255)` | — |
| 3 | **`email`** | `VARCHAR(255)` | — |
| 4 | **`phone`** | `VARCHAR(20)` | — |
| 5 | **`message`** | `TEXT` | — |
| 6 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 185. `manage_b_to_b_audit_logs`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`user_id`** | `INTEGER` | — |
| 3 | **`user_role`** | `VARCHAR(50)` | — |
| 4 | **`action`** | `VARCHAR(100)` | — |
| 5 | **`entity_type`** | `VARCHAR(100)` | — |
| 6 | **`entity_id`** | `INTEGER` | — |
| 7 | **`resource`** | `VARCHAR(100)` | — |
| 8 | **`resource_id`** | `VARCHAR(100)` | — |
| 9 | **`ip_address`** | `VARCHAR(50)` | — |
| 10 | **`details`** | `JSONB` | — |
| 11 | **`metadata`** | `JSONB` | — |
| 12 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 186. `audit_trail`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`id`** | `SERIAL` | PRIMARY KEY |
| 2 | **`user_id`** | `INTEGER` | — |
| 3 | **`user_role`** | `VARCHAR(50)` | — |
| 4 | **`action`** | `VARCHAR(100)` | — |
| 5 | **`endpoint`** | `VARCHAR(255)` | — |
| 6 | **`ip_address`** | `VARCHAR(50)` | — |
| 7 | **`details`** | `JSONB` | — |
| 8 | **`created_at`** | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP |

---

### 187. `schema_migrations`

| # | Column Name | Data Type | Constraints & Modifiers |
| :---: | :--- | :--- | :--- |
| 1 | **`version`** | `VARCHAR(100)` | PRIMARY KEY |
| 2 | **`applied_at`** | `TIMESTAMPTZ` | DEFAULT NOW() |

---

