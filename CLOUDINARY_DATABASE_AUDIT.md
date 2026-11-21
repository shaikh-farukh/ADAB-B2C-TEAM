# Cloudinary Integration – Database Audit & Readiness Report
**Scope:** ADAB Admin Portal (Backend & Frontend) & Platform Shared Database  
**Audit Phase:** Phase 1 – Strictly Read-Only Database Audit & Technical Readiness  
**Date:** November 20, 2026  
**Status:** Audit Completed – Awaiting Supervisor Approval  

---

## 1. Executive Summary

A comprehensive read-only audit was conducted across the ADAB project database schema (`project arch/schema.sql`, database migration files in `/migrations`), the Admin Backend service/controller layer (`ADAB-Admin-Portal/Admin-Backend`), and the Admin Frontend portal (`ADAB-Admin-Portal/Admin-Frontend`).

The platform guidelines (`CLOUDINARY_PORTAL_GUIDE.md`) specify:
1. All three ADAB portals (**Customer**, **Seller**, and **Admin**) share a single Cloudinary account with designated folder hierarchies:
   - `adab/categories`: Category Icons & Badges
   - `adab/products`: Product Catalog Images
   - `adab/marketing/banners`: Marketing / Carousel Banners
   - `adab/profile-images`: Profile Photos / Avatars
   - `adab/sellers/branding`: Store Logos & Shop Fronts
   - `adab/sellers/kyc`: KYC & Business Documents
2. Database storage best practices require storing two fields for every managed image/asset:
   - `image_url` (`TEXT`): Cloudinary's `secure_url` (used by frontends to display images).
   - `image_public_id` (`TEXT`): Cloudinary's `public_id` (enables backend asset destruction via `cloudinary.uploader.destroy()` to prevent orphaned assets and save storage).

### Key Audit Finding
- **Existing schema stores image URLs as plain strings (`image_url`, `default_image_url`, `avatar_url`, `logo_url`, `file_url`, `banner_url`), but entirely lacks `image_public_id` (or equivalent public ID fields) across all tables.**
- **No file upload endpoints, upload utilities, or Cloudinary SDK dependencies (`cloudinary`, `multer`) currently exist in `Admin-Backend`.**
- **Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are already configured in `Admin-Backend/.env`.**
- Currently, Admin Frontend UI components (`Categories.jsx`, `Brands.jsx`, etc.) only accept raw URL strings in plain text input fields and do not provide file upload selectors or Cloudinary image preview/optimization widgets.

---

## 2. Existing Schema Findings & Reusable Schema

### 2.1 Reusable Existing Tables & Asset Columns

| Table Name | Existing Asset Columns | Data Type | Current Usage | Reusable? |
| :--- | :--- | :--- | :--- | :--- |
| `categories` | `image_url` | `TEXT` | Category thumbnail / banner | ✅ Reusable for `image_url` (secure URL) |
| `master_catalog_items` | `default_image_url` | `TEXT` | Master catalog primary preview | ✅ Reusable for `image_url` |
| `product_images` | `image_url`, `thumbnail_url` | `TEXT`, `TEXT` | Multi-image gallery for master catalog products | ✅ Reusable for `image_url` & responsive thumbnail |
| `brands` | `logo_url` | `TEXT` | Brand logo | ✅ Reusable for `image_url` |
| `users` | `avatar_url` | `TEXT` | User profile avatar (Admin, Seller, Customer) | ✅ Reusable for `image_url` |
| `customer_profiles` | `profile_picture_url` | `TEXT` | Customer avatar override | ✅ Reusable for `image_url` |
| `seller_documents` | `file_url` | `TEXT` | KYC & shop front documents | ✅ Reusable for document/image secure URL |
| `promotions` | `banner_url` | `TEXT` | Store / promotional banner | ✅ Reusable for promotional banner URL |

### 2.2 Existing Relationships & Image Flow to Admin Frontend

1. **Categories:** `categories` table links hierarchical records (`parent_id REFERENCES categories(id)`). The API `GET /api/v1/admin/categories` returns the full row including `image_url`.
2. **Products:** Admin products boundary service queries `products`, `master_catalog_items`, and queries `product_images` via `SELECT * FROM product_images WHERE product_id = $1`. It embeds `images` array into the product payload for the frontend.
3. **Sellers:** `seller_profiles` joins to `seller_documents` via `SELECT * FROM seller_documents WHERE seller_id = $1`. Returned via `GET /api/v1/admin/sellers/:id/documents`.
4. **Customers:** Returned via `GET /api/v1/admin/customers` with `customer_profiles.profile_picture_url` and `users.avatar_url`.

---

## 3. Database Requirements Report

In accordance with strict project rules:
- **Zero changes have been applied during Phase 1.**
- Existing columns and tables **must NOT be dropped or renamed**.
- Missing fields must be added as **new nullable columns via proper UP/DOWN migrations**.

### 3.1 Missing Required Columns (Audit Itemized List)

For every missing column, the exact table, suggested type, purpose, and dependent feature are specified below:

#### 1. `categories`
- **Exact Table Name:** `categories`
- **Exact Column Name Required:** `image_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores the Cloudinary public asset identifier (e.g., `adab/categories/cat_grocery_1710000000`). Enables the backend to call `cloudinary.uploader.destroy(image_public_id)` when an admin replaces or deletes a category icon/image, preventing storage waste and orphaned assets.
- **Dependent Feature:** Admin Portal Category Management & Governance (`Categories.jsx`, `productBoundaryService.js`).
- **Can Existing Field Be Reused?** No. `image_url` holds the public HTTPS URL; `public_id` is required for Cloudinary asset lifecycle management.

#### 2. `product_images`
- **Exact Table Name:** `product_images`
- **Exact Column Name Required:** `image_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID (e.g., `adab/products/prod_uuid_1710000000`). Essential for removing images when deleted from catalog gallery or replaced during moderation.
- **Dependent Feature:** Master Catalog & Product Management (`Products.jsx`, `ProductCatalog.jsx`, `productBoundaryService.js`).
- **Can Existing Field Be Reused?** No. `image_url` and `thumbnail_url` only store the web delivery URLs.

#### 3. `master_catalog_items`
- **Exact Table Name:** `master_catalog_items`
- **Exact Column Name Required:** `default_image_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID for the single primary default image of master catalog items.
- **Dependent Feature:** Product Master Catalog Management.
- **Can Existing Field Be Reused?** No.

#### 4. `brands`
- **Exact Table Name:** `brands`
- **Exact Column Name Required:** `logo_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID for brand logos (e.g., `adab/brands/brand_123`). Enables deleting/updating logos.
- **Dependent Feature:** Admin Brands Management (`Brands.jsx`).
- **Can Existing Field Be Reused?** No.

#### 5. `seller_documents`
- **Exact Table Name:** `seller_documents`
- **Exact Column Name Required:** `file_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID for seller KYC documents and shop front photos (folder: `adab/sellers/kyc` and `adab/sellers/branding`). Allows cleanup when documents are re-uploaded or sellers are purged.
- **Dependent Feature:** Seller Onboarding & KYC Document Verification (`ApprovalQueue.jsx`, `Sellers.jsx`, `adminSellerService.js`).
- **Can Existing Field Be Reused?** No. `file_url` only contains the download/view link.

#### 6. `users` & `customer_profiles`
- **Exact Table Name:** `users` / `customer_profiles`
- **Exact Column Name Required:** `avatar_public_id` (in `users`) and `profile_picture_public_id` (in `customer_profiles`)
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID for avatars (`adab/profile-images/...`).
- **Dependent Feature:** Customer and Admin Profile Settings.
- **Can Existing Field Be Reused?** No.

#### 7. `promotions`
- **Exact Table Name:** `promotions`
- **Exact Column Name Required:** `banner_public_id`
- **Suggested Data Type:** `VARCHAR(255)` (or `TEXT`), `NULL`
- **Purpose & Justification:** Stores Cloudinary public ID for promotional banners (`adab/marketing/banners/...`).
- **Dependent Feature:** Admin Offers & Promotions Management (`Offers.jsx`, `adminOfferService.js`).
- **Can Existing Field Be Reused?** No.

---

### 3.2 Missing Required Tables (Genuinely Necessary)

#### Admin Marketing Banners Table: `admin_banners`
- **Current Situation:** Currently, only store-specific promotions exist in `promotions`. There is **no dedicated table** for platform-wide carousel / marketing banners managed by Admins (as outlined in `CLOUDINARY_PORTAL_GUIDE.md`: Folder `adab/marketing/banners`).
- **Proposed Table Name:** `admin_banners`
- **Required Columns:**
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `title`: `VARCHAR(150) NOT NULL`
  - `target_screen`: `VARCHAR(100)` (e.g. `HOME_CAROUSEL`, `CATEGORY_PAGE`, `PROMO_POPUP`)
  - `target_url`: `TEXT` (internal route or external link)
  - `image_url`: `TEXT NOT NULL` (Cloudinary `secure_url`)
  - `image_public_id`: `TEXT NOT NULL` (Cloudinary `public_id`)
  - `display_order`: `INT DEFAULT 0`
  - `is_active`: `BOOLEAN DEFAULT true`
  - `start_date`: `TIMESTAMPTZ`
  - `end_date`: `TIMESTAMPTZ`
  - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`
- **Why It Is Needed:** Enables Admin Portal marketing team to upload, reorder, schedule, and delete platform homepage banners stored in `adab/marketing/banners`.

---

### 3.3 Optional Schema Improvements
1. **`media_assets` (Centralized Platform Asset Registry):**
   - Alternatively, a centralized asset tracking table (`id`, `portal`, `folder`, `secure_url`, `public_id`, `format`, `bytes`, `uploaded_by`, `created_at`) could track all Cloudinary uploads globally. However, adding `image_public_id` directly to entity tables preserves simplicity, zero join overhead, and Clean Architecture standards.

---

## 4. Cloudinary Implementation Readiness Audit

### 4.1 Backend Environment Configuration
- `.env` in `ADAB-Admin-Portal/Admin-Backend`:
  - `CLOUDINARY_CLOUD_NAME`: ✅ **Configured**
  - `CLOUDINARY_API_KEY`: ✅ **Configured**
  - `CLOUDINARY_API_SECRET`: ✅ **Configured** (Verified present; value kept confidential in adherence to security rules)

### 4.2 Backend Dependencies & Utilities
- **Dependencies (`package.json`):**
  - `cloudinary`: ❌ **Missing** (Needs `npm install cloudinary` in `Admin-Backend`)
  - `multer`: ❌ **Missing** (Required for handling multipart file uploads in Express before streaming to Cloudinary)
- **Upload Endpoints & Services:**
  - Currently, there are **no upload controllers or routes** in `Admin-Backend`.
  - All existing routes (`adminRoutes.js`) expect `image_url` or `logo_url` as manual text strings in JSON request bodies.

### 4.3 Admin Frontend Readiness
- **Image Display & Preview:**
  - `Categories.jsx` and `Brands.jsx` use basic text inputs for `image_url` and `logo_url`. There is no visual thumbnail preview, file picker, or direct upload widget.
  - No Cloudinary client libraries or upload signature hooks are installed or integrated yet.
  - Image rendering does not currently apply Cloudinary on-the-fly transformations (`f_auto,q_auto`).

---

## 5. Required Implementation Roadmap (Pending Supervisor Approval)

Upon receiving supervisor approval to proceed to Phase 2:

### Step 1: Database Migration (SQL UP & DOWN)
Create a clean, non-breaking migration `migrations/003_add_cloudinary_public_ids.sql`:
- Add `image_public_id` column to `categories`
- Add `image_public_id` column to `product_images`
- Add `default_image_public_id` column to `master_catalog_items`
- Add `logo_public_id` column to `brands`
- Add `file_public_id` column to `seller_documents`
- Add `banner_public_id` column to `promotions`
- Create `admin_banners` table with `image_url` and `image_public_id`
- Include complete `DOWN` rollback statements (`ALTER TABLE ... DROP COLUMN ...`).

### Step 2: Backend Upload Service & Endpoints (`Admin-Backend`)
1. Install `cloudinary` and `multer`.
2. Create `src/config/cloudinary.js` configuring the SDK with environment variables.
3. Create `src/utils/cloudinaryUploader.js` utility supporting:
   - Direct buffer upload stream targeting specific folders (`adab/categories`, `adab/products`, `adab/marketing/banners`).
   - Destruction helper `deleteCloudinaryAsset(public_id)`.
4. Create `routes/uploadRoutes.js` and `controllers/uploadController.js` providing:
   - `POST /api/v1/admin/uploads/image` (with folder validation based on asset type).
   - `POST /api/v1/admin/uploads/sign` (optional upload signature generation for direct secure client uploads).
   - `DELETE /api/v1/admin/uploads/:public_id` (destroy asset).

### Step 3: Service Layer Updates
Update `productBoundaryService.js`, `adminSellerService.js`, etc., to save both `image_url` and `image_public_id`, and trigger asset destruction when an image is replaced or deleted.

### Step 4: Frontend Component Integration (`Admin-Frontend`)
1. Create a reusable `ImageUploadWidget.jsx` with drag-and-drop, image preview, progress indicator, and automatic `f_auto,q_auto` delivery URL handling.
2. Integrate into `Categories.jsx`, `Brands.jsx`, `Products.jsx`, and the banner management screen.

---

## 6. Audit Conclusion & Stop Status

- **Database Phase 1 Audit:** Completed.
- **Database Status:** Strictly read-only; no database changes, migrations, or record updates have been made.
- **Cloudinary Readiness:** Backend environment variables exist; SDK dependencies, upload service, and migration scripts must be implemented after approval.

**STOPPED:** Awaiting supervisor approval of the database requirements and proposed migration schema before proceeding to Phase 2 implementation.
