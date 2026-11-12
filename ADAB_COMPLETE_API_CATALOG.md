# ADAB Enterprise Ecosystem — Master API Catalog
**Version:** 2.0.0 (Production-Ready Architecture)  
**Target Codebase:** `ADAB-Shop-Portal` (Seller Central & POS), with Cross-Portal References (`Admin-Portal`, `Customer-Portal`, `B2B-Portal`)  
**Shared Database:** PostgreSQL (`adab_b2c_team`)  
**Last Updated:** November 2026

---

## Executive Summary & System Overview

This document provides an exhaustive, field-verified inventory of **every API endpoint across the entire ADAB ecosystem**. It details the exact HTTP method, route, controller action, middleware protection (JWT authentication, rate limiting, and idempotency locks), and operational status.

### Status Key
* 🟢 **Available & Verified**: Fully implemented in `Shop-Backend`, wired to database/services, and passing automated test suites.
* 🟡 **Route Mismatch / Aliased**: Implemented under a different path or controller than what some frontend client service files expect.
* 🔴 **Missing / Unimplemented**: Present in frontend API services (`sellerApi.js`, `listingApi.js`) or product architecture specs, but lacks a backend route or controller handler.
* 🟣 **Cross-Portal API**: Operational in Admin, Customer, or B2B logistics backends.

---

## 1. Shop Portal (Seller Central) API Surface

### 1.1 Authentication & Identity (Public)
Base URL: `/api/v1/seller/auth` (mounted in `ADAB-Shop-Portal/Shop-Backend/server.js` $\rightarrow$ `src/routes/seller.js`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/seller/auth/login` | `sellerController.login` | Public, Rate-Limited | 🟢 | Password-based login with Phone/Email. Accepts `{ phone, email, password, idMode }`. |
| `POST` | `/api/v1/seller/auth/login-otp` | `sellerController.loginWithOtp` | Public, Rate-Limited | 🟢 | OTP-based login. Accepts `{ phone, email, otp, idMode }`. Verifies Redis/Memory OTP code. |
| `POST` | `/api/v1/seller/auth/signup` | `sellerController.signup` | Public, Rate-Limited | 🟢 | Merchant onboarding registration. Accepts `{ phone, email, password, full_name, store_name }`. |
| `POST` | `/api/v1/seller/auth/send-otp` | `sellerController.sendOtp` | Public, Rate-Limited | 🟢 | Generates 6-digit OTP code for Phone (SMS) or Email (Brevo SMTP). Accepts `{ identifier, mode }`. |
| `POST` | `/api/v1/seller/auth/verify-otp` | `sellerController.verifyOtp` | Public, Rate-Limited | 🟢 | Validates OTP before password reset or registration. Accepts `{ identifier, otp }`. |
| `POST` | `/api/v1/seller/auth/reset-password` | `sellerController.resetPassword` | Public, Rate-Limited | 🟢 | Sets new password after OTP verification. Accepts `{ identifier, otp, newPassword }`. |
| `POST` | `/api/v1/seller/auth/google` | `sellerController.googleLogin` | Public, Rate-Limited | 🟢 | Google OAuth2 One-Tap token exchange. Accepts `{ accessToken, idToken }`. Auto-provisions store. |

---

### 1.2 Onboarding, KYC & Store Profile
Base URL: `/api/v1/seller` (requires `requireSellerAuth` JWT middleware)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/onboarding` | `sellerController.getOnboarding` | `requireSellerAuth` | 🟢 | Retrieves current 7-step KYC state, completion flags, and verification status from `seller_kyc`. |
| `POST` | `/api/v1/seller/onboarding/step/:stepNum` | `sellerController.saveOnboardingStep` | `requireSellerAuth` | 🟢 | Saves progress for step 1 through 7 (Store Details, PAN, GSTIN, Bank Account, Delivery Radius, FSSAI). |
| `GET` | `/api/v1/seller/profile` | `sellerController.getProfile` | `requireSellerAuth` | 🟢 | Retrieves merchant personal profile (`full_name`, `email`, `phone`, `role`, `language`). |
| `PATCH` | `/api/v1/seller/profile` | `sellerController.updateProfile` | `requireSellerAuth` | 🟢 | Updates merchant name, avatar, contact details. |
| `GET` | `/api/v1/seller/store` | `sellerController.getStore` | `requireSellerAuth` | 🟢 | Retrieves store details, coordinates (`latitude`, `longitude`), operational radius, and opening hours. |
| `PATCH` | `/api/v1/seller/store` | `sellerController.updateStore` | `requireSellerAuth` | 🟢 | Updates store address, GSTIN, pickup instructions, trade name, and delivery zones. |
| `GET` | `/api/v1/seller/settings` | `sellerController.getSettings` | `requireSellerAuth` | 🟢 | Fetches notifications, language preferences, hardware settings (thermal printer, barcode scanner). |
| `PATCH` | `/api/v1/seller/settings` | `sellerController.updateSettings` | `requireSellerAuth` | 🟢 | Updates store configuration, language toggle (`en`, `hi`, `gu`), and printing layout. |
| `GET` | `/api/v1/seller/dashboard` | `sellerController.getDashboardMetrics` | `requireSellerAuth` | 🟢 | Computes sales metrics, today orders, pending payouts, low-stock count, and rating overview. |

---

### 1.3 Orders, Returns & Invoices
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/orders` | `sellerController.getOrders` | `requireSellerAuth` | 🟢 | Fetches store orders from `seller_orders` with items, customer details, status filter, and pagination. |
| `PATCH` | `/api/v1/seller/orders/:id/status` | `sellerController.updateOrderStatus` | `requireSellerAuth`, `idempotency` | 🟢 | Progresses order state (`ACCEPTED` $\rightarrow$ `PACKED` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED`). |
| `GET` | `/api/v1/seller/returns` | `sellerController.getReturns` | `requireSellerAuth` | 🟢 | Lists customer return requests for the merchant store with return reason, items, and photos. |
| `PATCH` | `/api/v1/seller/returns/:id/status` | `sellerController.updateReturnStatus` | `requireSellerAuth`, `idempotency` | 🟢 | Approves or rejects returns (`APPROVED`, `REJECTED`, `REFUNDED`). Restocks items atomically. |
| `POST` | `/api/v1/seller/returns` | — | Expected by Frontend | 🔴 | `processReturn` in `sellerApi.js` attempts to post manual return. Backend currently handles customer-side initiation. |
| `GET` | `/api/v1/orders/:orderId/invoice/pdf` | Inline route in `server.js` | Public / Direct | 🟢 | Generates printable, GST-compliant HTML/PDF tax invoice with CGST/SGST 5% multi-slab breakdown. |
| `GET` | `/api/v1/seller/orders/:orderId/invoice` | Inline route in `server.js` | Public / Direct | 🟢 | Alias for tax invoice route above. |

---

### 1.4 POS (Point of Sale Walk-in Sales)
Base URL: `/api/v1/seller/pos`

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/seller/pos/sales` | `sellerController.createPOSSale` | `requireSellerAuth`, `idempotency` | 🟢 | Concurrency-safe in-store walk-in sale. Deducts stock atomically, creates POS receipt, logs sales in `seller_orders`. Accepts `{ cart, paymentMethod, customerPhone }`. |

---

### 1.5 Products, Listings & Inventory
Base URL: `/api/v1/seller/listings` (mounted in `ADAB-Shop-Portal/Shop-Backend/server.js` $\rightarrow$ `src/routes/listing.js`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/listings` | `ListingController.getListings` | `requireSellerAuth` | 🟢 | Queries `seller_listings` with category, status (`DRAFT`, `PUBLISHED`), search, and pagination. |
| `GET` | `/api/v1/seller/listings/:id` | `ListingController.getListingById` | `requireSellerAuth` | 🟢 | Retrieves complete listing record including dynamic attributes JSONB and child `listing_variants`. |
| `POST` | `/api/v1/seller/listings` | `ListingController.createListing` | `requireSellerAuth` | 🟢 | Creates new standalone or multi-variant product listing. Validates Zod DTO schema. |
| `PATCH` | `/api/v1/seller/listings/:id` | `ListingController.updateListing` | `requireSellerAuth` | 🟢 | Updates price, title, attributes, stock quantity, or images. |
| `PUT` | `/api/v1/seller/listings/:id` | `ListingController.updateListing` | `requireSellerAuth` | 🟢 | Full idempotent replacement of listing specifications. |
| `DELETE` | `/api/v1/seller/listings/:id` | `ListingController.deleteListing` | `requireSellerAuth` | 🟢 | Soft-deletes listing (`is_active = false`, status `ARCHIVED`). |
| `POST` | `/api/v1/seller/listings/batch-delete` | `ListingController.batchDeleteListings` | `requireSellerAuth` | 🟢 | Bulk soft-deletion of multiple listing IDs `{ ids: [...] }`. |
| `POST` | `/api/v1/seller/listings/:id/submit` | `ListingController.submitListing` | `requireSellerAuth` | 🟢 | Submits listing from `DRAFT` or `CHANGES_REQUIRED` to `SUBMITTED` for admin moderation. |
| `POST` | `/api/v1/seller/listings/:id/publish` | `ListingController.publishListing` | `requireSellerAuth` | 🟢 | Moves verified listing from `APPROVED` to `PUBLISHED` (live on customer app). |
| `GET` | `/api/v1/seller/listings/:id/approval-history` | `ListingController.getApprovalHistory` | `requireSellerAuth` | 🟢 | Retrieves audit log from `product_approval_history` (rejection reasons, admin feedback). |
| `GET` | `/api/v1/seller/listings/:id/issues` | `ListingController.getListingIssues` | `requireSellerAuth` | 🟢 | Returns compliance validation errors, missing images, expired FSSAI, or zero stock alerts. |
| `POST` | `/api/v1/seller/listings/bulk-upload` | `ListingController.bulkUpload` | `requireSellerAuth`, `multer` | 🟢 | Asynchronous CSV/Excel catalog import. Dispatches background worker `bulkUploadJob.js`. |
| `GET` | `/api/v1/seller/listings/bulk-upload/:jobId/status` | `ListingController.getBulkUploadStatus` | `requireSellerAuth` | 🟢 | Polls progress, rows processed, and error rows for bulk upload job. |
| `POST` | `/api/v1/seller/listings/bulk-export` | `ListingController.bulkExport` | `requireSellerAuth` | 🟢 | Initiates CSV export of store inventory. |
| `GET` | `/api/v1/seller/listings/bulk-export/:jobId/status` | `ListingController.getBulkExportStatus` | `requireSellerAuth` | 🟢 | Checks completion status and returns download URL for exported file. |
| `POST` | `/api/v1/seller/listings/upload-image` | `ListingController.uploadImage` | `requireSellerAuth`, `multer` | 🟢 | Uploads product image buffer to MinIO / S3 or local disk storage. |
| `DELETE` | `/api/v1/seller/listings/:id/images/:imageId` | `ListingController.deleteImage` | `requireSellerAuth` | 🟢 | Removes product image from `product_images`. |
| `POST` | `/api/v1/seller/listings/:id/documents` | `ListingController.addDocument` | `requireSellerAuth` | 🟢 | Attaches compliance certs (FSSAI, lab reports, invoices) to listing. |
| `GET` | `/api/v1/seller/inventory` | — | Expected by Frontend | 🟡 | `sellerApi.getProducts()` calls `/inventory`. The real backend endpoint is `GET /api/v1/seller/listings`. |
| `POST` | `/api/v1/seller/inventory` | — | Expected by Frontend | 🟡 | `sellerApi.addProduct()` calls `/inventory`. The real backend endpoint is `POST /api/v1/seller/listings`. |

---

### 1.6 National FMCG Master Catalog & Dynamic Attributes
Base URL: `/api/v1/shop/catalog` & `/api/v1/seller/catalog`

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/shop/catalog/categories/tree` | `CatalogController.getCategoryTree` | Public / Cached | 🟢 | Returns N-level hierarchical tree of categories (`materialized_path`, `is_leaf`). |
| `GET` | `/api/v1/shop/catalog/categories/:id/attributes` | `CatalogController.getCategoryAttributes` | Public | 🟢 | Recursively resolves inherited dynamic schema attributes from leaf category up to root. |
| `GET` | `/api/v1/shop/catalog/barcode/:barcode` | `CatalogController.lookupBarcode` | Public | 🟢 | Strict EAN/UPC numerical barcode lookup across `master_catalog_items` and `manage_manufacturer_products`. |
| `GET` | `/api/v1/shop/catalog/master/search` | `CatalogController.searchMasterCatalog` | Public | 🟢 | Searches 5,000+ national FMCG products by keyword with debounce. Excludes `OWN_BRAND`. |
| `GET` | `/api/v1/shop/catalog/b2b/products` | `CatalogController.getB2BProducts` | Public | 🟢 | Queries manufacturer B2B products registered in the wholesale ecosystem. |
| `GET` | `/api/v1/seller/catalog/master` | `sellerController.getMasterCatalog` | `requireSellerAuth` | 🟢 | Paginated browser for merchant 1-click adoption of FMCG catalog goods. |
| `GET` | `/api/v1/seller/catalog/product/:id` | `sellerController.getMasterProductById` | `requireSellerAuth` | 🟢 | Retrieves master product details, packaging specs, and default images. |
| `GET` | `/api/v1/seller/catalog/:id` | `sellerController.getMasterProductById` | `requireSellerAuth` | 🟢 | Short-path alias for master product lookup. |
| `POST` | `/api/v1/seller/catalog/adopt` | `sellerController.adoptMasterCatalogItem` | `requireSellerAuth`, `idempotency` | 🟢 | 1-Click adopts a national catalog product into seller's store listing. |
| `POST` | `/api/v1/seller/catalog/restock` | `sellerController.orderRestockCases` | `requireSellerAuth`, `idempotency` | 🟢 | Generates restock purchase order for cases/cartons of national FMCG items. |
| `POST` | `/api/v1/seller/catalog/bulk-restock` | `sellerController.bulkOrderRestockCases` | `requireSellerAuth`, `idempotency` | 🟢 | Bulk restocks multiple FMCG lines in a single purchase order. |

---

### 1.7 B2B Resale, Store Distribution & Partner Brands
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/b2b-orders` | `sellerController.getB2BOrders` | `requireSellerAuth` | 🟢 | Retrieves incoming and outgoing B2B store-to-store orders. |
| `PATCH` | `/api/v1/seller/b2b-orders/:id/status` | `sellerController.updateB2BOrderStatus` | `requireSellerAuth`, `idempotency` | 🟢 | Updates B2B order status (`ACCEPTED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`). |
| `GET` | `/api/v1/seller/purchase-orders` | `sellerController.getPurchaseOrders` | `requireSellerAuth` | 🟢 | Lists wholesaler & manufacturer purchase orders raised by this store. |
| `POST` | `/api/v1/seller/purchase-orders` | `sellerController.createPurchaseOrder` | `requireSellerAuth`, `idempotency` | 🟢 | Drafts/places formal B2B purchase order to supplier. |
| `POST` | `/api/v1/seller/buystock/purchase-orders` | — | Expected by Frontend | 🟡 | `sellerApi.placeB2BOrder` calls `/buystock/purchase-orders`. Real backend endpoint is `POST /purchase-orders`. |
| `GET` | `/api/v1/seller/other-store-brands` | `sellerController.getOtherStoreBrands` | `requireSellerAuth` | 🟢 | Discovers other nearby merchants' exclusive local brands available for resale. |
| `POST` | `/api/v1/seller/other-store-brands/add-to-store` | `sellerController.addOtherStoreBrandToMyStore` | `requireSellerAuth` | 🟢 | Adds another store's approved brand into current store's showcase. |
| `GET` | `/api/v1/seller/other-store-brands/my-added` | `sellerController.getMyAddedOtherStoreBrands` | `requireSellerAuth` | 🟢 | Lists partner brands currently published in this store. |
| `GET` | `/api/v1/seller/other-store-brands/purchased-ready` | `sellerController.getPurchasedBrandsReadyToPublish` | `requireSellerAuth` | 🟢 | Fetches received B2B inventory items ready to publish to retail customers. |
| `POST` | `/api/v1/seller/other-store-brands/request-stock` | `sellerController.requestResaleStock` | `requireSellerAuth` | 🟢 | Submits B2B stock request to brand-owning merchant. |
| `GET` | `/api/v1/seller/other-store-brands/incoming-requests`| `sellerController.getIncomingResaleRequests` | `requireSellerAuth` | 🟢 | Lists stock requests received from other stores wanting to resell my items. |
| `POST` | `/api/v1/seller/other-store-brands/requests/:id/approve` | `sellerController.approveResaleRequest` | `requireSellerAuth` | 🟢 | Approves incoming resale request and generates wholesale invoice. |
| `POST` | `/api/v1/seller/other-store-brands/requests/:id/decline` | `sellerController.declineResaleRequest` | `requireSellerAuth` | 🟢 | Declines incoming resale request with reason notes. |
| `POST` | `/api/v1/seller/other-store-brands/orders/:id/confirm-pay` | `sellerController.confirmAndPayResaleOrder` | `requireSellerAuth`, `idempotency` | 🟢 | Authorizes payment for partner brand stock order via wallet/credit/bank. |
| `POST` | `/api/v1/seller/other-store-brands/resellers/:buyerStoreId/toggle-block` | `sellerController.toggleBlockResellerStore` | `requireSellerAuth` | 🟢 | Blocks/unblocks a specific retailer from reselling merchant's private brand. |
| `GET` | `/api/v1/seller/brand-distribution-analytics` | `sellerController.getBrandDistributionAnalytics` | `requireSellerAuth` | 🟢 | Analyzes wholesale revenue, top resale retail partners, and territory reach. |
| `POST` | `/api/v1/seller/listings/:id/toggle-b2b` | `sellerController.toggleListingB2B` | `requireSellerAuth` | 🟢 | Toggles whether a product listing is open for wholesale B2B partner distribution. |

---

### 1.8 Finance, Settlements, Khata & Bank Credit
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/finance/summary` | `sellerController.getFinanceSummary` | `requireSellerAuth` | 🟢 | Wallet balance, pending payouts, cleared revenue, today's cash vs online split. |
| `GET` | `/api/v1/seller/finance/transactions` | `sellerController.getFinanceTransactions` | `requireSellerAuth` | 🟢 | Paginated ledger of every credit/debit transaction with reference IDs. |
| `GET` | `/api/v1/seller/finance/settlements` | `sellerController.getFinanceSettlements` | `requireSellerAuth` | 🟢 | History of automated and manual bank payouts with UTR numbers. |
| `POST` | `/api/v1/seller/finance/withdraw` | `sellerController.createWithdrawalSettlement` | `requireSellerAuth`, `idempotency` | 🟢 | Initiates instant or end-of-day bank payout request for merchant wallet balance. |
| `GET` | `/api/v1/seller/finance/khata` | `sellerController.getKhataLedger` | `requireSellerAuth` | 🟢 | Traditional digital ledger tracking buyer and supplier credit lines. |
| `POST` | `/api/v1/seller/finance/khata/:id/pay` | `sellerController.payKhataOrder` | `requireSellerAuth`, `idempotency` | 🟢 | Records payment against an outstanding khata credit account. |
| `GET` | `/api/v1/seller/credit-balance` | `sellerController.getBuyerCreditInfo` | `requireSellerAuth` | 🟢 | Retrieves seller's available B2B credit limit with partner wholesalers. |
| `GET` | `/api/v1/seller/credit-terms` | `sellerController.getStoreCreditRules` | `requireSellerAuth` | 🟢 | Returns merchant's credit give rules (customer credit) and buy limits. |
| `PUT` | `/api/v1/seller/credit-terms/give` | `sellerController.updateCreditGiveTerms` | `requireSellerAuth`, `idempotency` | 🟢 | Configures store credit terms offered to trusted customers (days, max limit). |
| `PUT` | `/api/v1/seller/credit-terms/buy` | `sellerController.updateCreditBuyLimits` | `requireSellerAuth`, `idempotency` | 🟢 | Configures supplier credit thresholds accepted for restock orders. |
| `GET` | `/api/v1/seller/finance/bank-partners` | `sellerController.getBankPartners` | `requireSellerAuth` | 🟢 | Lists partner NBFCs and banks offering seller working capital credit lines. |
| `POST` | `/api/v1/seller/finance/credit-apply` | `sellerController.submitCreditApply` | `requireSellerAuth`, `idempotency` | 🟢 | Submits merchant loan / credit limit application with financial docs. |
| `GET` | `/api/v1/seller/finance/credit-applications` | `sellerController.getCreditApplications` | `requireSellerAuth` | 🟢 | Checks status of submitted bank working capital loan applications. |

---

### 1.9 Marketing, Promotions & Dynamic Pricing
Base URL: `/api/v1/seller` & `/api/v1/seller/pricing`

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/promotions` | `marketingController.getPromotions` | `requireSellerAuth` | 🟢 | Lists active and scheduled store promotions and discounts. |
| `POST` | `/api/v1/seller/promotions` | `marketingController.createPromotion` | `requireSellerAuth` | 🟢 | Creates percentage or flat discount on products or categories. |
| `POST` | `/api/v1/seller/promotions/check-overlap` | `marketingController.checkOverlap` | `requireSellerAuth` | 🟢 | Validates that proposed promotion dates do not conflict with existing campaigns. |
| `PATCH` | `/api/v1/seller/promotions/:id` | `marketingController.updatePromotion` | `requireSellerAuth` | 🟢 | Edits promo budget, start/end date, or discount tiers. |
| `DELETE` | `/api/v1/seller/promotions/:id` | `marketingController.deletePromotion` | `requireSellerAuth` | 🟢 | Cancels and terminates an active promotion. |
| `GET` | `/api/v1/seller/coupons` | `marketingController.getCoupons` | `requireSellerAuth` | 🟢 | Retrieves discount coupons created by merchant (`SAVE50`, `FESTIVE10`). |
| `POST` | `/api/v1/seller/coupons` | `marketingController.createCoupon` | `requireSellerAuth` | 🟢 | Creates new coupon code with usage limits and minimum order values. |
| `PATCH` | `/api/v1/seller/coupons/:id` | `marketingController.updateCoupon` | `requireSellerAuth` | 🟢 | Updates coupon code expiration or activates/deactivates code. |
| `GET` | `/api/v1/seller/pricing` | `pricingController.getPricing` | `requireSellerAuth` | 🟢 | Lists prices, MRPs, margins, and scheduled price changes across listings. |
| `POST` | `/api/v1/seller/pricing/bulk` | `pricingController.updateBulkPricing` | `requireSellerAuth` | 🟢 | Bulk updates sell prices and margins across multiple listing IDs. |
| `PATCH` | `/api/v1/seller/pricing/:listingId` | `pricingController.updateListingPricing` | `requireSellerAuth` | 🟢 | Updates individual listing price and margin. |
| `GET` | `/api/v1/seller/pricing/history` | `pricingController.getPricingHistory` | `requireSellerAuth` | 🟢 | Historical audit trail of price changes per product. |
| `GET` | `/api/v1/seller/pricing/previews` | `pricingController.getAllPreviews` | `requireSellerAuth` | 🟢 | Previews margins and customer-facing prices for scheduled pricing rules. |
| `GET` | `/api/v1/seller/pricing/:listingId/preview` | `pricingController.previewPricing` | `requireSellerAuth` | 🟢 | Calculates profit margin and taxes for a prospective price. |
| `POST` | `/api/v1/seller/pricing/:listingId/schedule` | `pricingController.schedulePricing` | `requireSellerAuth` | 🟢 | Schedules automated future price change (e.g. night sale or weekend special). |
| `DELETE` | `/api/v1/seller/pricing/:listingId/schedule` | `pricingController.deleteSchedule` | `requireSellerAuth` | 🟢 | Deletes scheduled pricing event before trigger time. |

---

### 1.10 Notifications, Chat & In-App Messaging
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/notifications` | `notificationController.getNotifications` | `requireSellerAuth` | 🟢 | Retrieves user and store notifications with read status and timestamps. |
| `GET` | `/api/v1/seller/notifications/unread-count` | `notificationController.getUnreadCount` | `requireSellerAuth` | 🟢 | Returns unread notification count badge for header navigation. |
| `GET` | `/api/v1/seller/notifications/since` | `notificationController.getNotificationsSince` | `requireSellerAuth` | 🟢 | Incremental long-polling endpoint retrieving alerts created after `?since=...`. |
| `POST` | `/api/v1/seller/notifications/read-all` | `notificationController.markAllAsRead` | `requireSellerAuth` | 🟢 | Marks all unread alerts as read for authenticated seller. |
| `POST` | `/api/v1/seller/notifications/:id/read` | `notificationController.markAsRead` | `requireSellerAuth` | 🟢 | Marks single notification as read. |
| `GET` | `/api/v1/seller/messages/threads` | `sellerController.getThreads` | `requireSellerAuth` | 🟢 | Fetches active buyer and supplier chat conversations. |
| `GET` | `/api/v1/seller/messages/threads/:threadId` | `sellerController.getThreadMessages` | `requireSellerAuth` | 🟢 | Fetches paginated chronological messages for a specific conversation thread. |
| `POST` | `/api/v1/seller/messages/threads/:threadId/messages` | `sellerController.sendThreadMessage` | `requireSellerAuth` | 🟢 | Sends reply in thread. Broadcasts real-time event via Socket.io. |
| `POST` | `/api/v1/seller/messages/threads/:threadId/read` | `sellerController.markThreadRead` | `requireSellerAuth` | 🟢 | Marks all messages in conversation thread as read. |

---

### 1.11 AI Assistant & MCP Tool Suite
Base URL: `/api/v1/assistant` (requires `requireSellerAuth`)

| Method | Full Endpoint Path | Controller Handler | Middleware / Auth | Status | Purpose & Parameters |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/assistant/tools` | Inline router in `assistant.js` | `requireSellerAuth` | 🟢 | Discovers all registered MCP tools, parameters, descriptions, and safety tiers. |
| `POST` | `/api/v1/assistant/chat` | Inline router in `assistant.js` | `requireSellerAuth` | 🟢 | Conversational turn with Gemini 3.5 Flash and real-time execution of MCP tools. Accepts `{ prompt, history, model }`. |

#### Registered MCP Tools:
1. `adab_get_store_info` (Tier 1: Read-only) — Retrieves store profile, working hours, and operational status.
2. `adab_update_store_status` (Tier 2: Confirmation required) — Toggles store active/inactive or online/offline.
3. `adab_list_orders` (Tier 1: Read-only) — Lists recent customer orders by status.
4. `adab_update_order_state` (Tier 2: Action) — Moves orders between `ACCEPTED`, `PACKED`, `SHIPPED`.
5. `adab_check_low_stock` (Tier 1: Read-only) — Identifies items approaching low-stock reorder thresholds.
6. `adab_update_stock_qty` (Tier 2: Action) — Adjusts physical stock inventory count.
7. `adab_modify_pricing` (Tier 2: Action) — Updates listing sell price and computes gross profit margins.
8. `adab_toggle_listing_status` (Tier 2: Action) — Activates, deactivates, or archives listings.
9. `adab_get_sales_performance` (Tier 1: Read-only) — Aggregates daily, weekly, or monthly revenue analytics.
10. `adab_get_multi_slab_gstr` (Tier 1: Read-only) — Calculates GST liability broken into 0%, 5%, 12%, 18% slabs.
11. `adab_query_b2b_wholesalers` (Tier 1: Read-only) — Searches registered B2B distributors for stock restock.
12. `adab_draft_b2b_restock_po` (Tier 2: Action) — Prepares restock purchase order for merchant confirmation.

---

### 1.12 Webhooks & Socket.io Real-Time Events

| Protocol | Route / Event | Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/seller/webhooks/callback` | `sellerController.handleWebhookCallback` | 🟢 | Secure, idempotent webhook callback for external payment gateways, delivery partners, and order state updates. |
| `Socket.io` | `connection` | `socket.js` (JWT Handshake) | 🟢 | Authenticates client connection via Bearer token, joins private room `userId`. |
| `Socket.io` | `send_message` | `server.js` | 🟢 | Emits incoming chat message to recipient and stores in database. |
| `Socket.io` | `mark_read` | `server.js` | 🟢 | Updates read receipts across connected seller and customer tabs. |
| `PostgreSQL LISTEN` | `pgListener.js` | Background Daemon | 🟢 | Listens to channels `new_notification`, `listing`, `order`, `kyc`, `payout` and broadcasts directly to frontend sockets. |

---

## 2. Cross-Portal APIs (Admin, Customer & B2B Ecosystem)

### 2.1 Admin Portal Backend (`ADAB-Admin-Portal/Admin-Backend`)
Base URL: `http://localhost:5001/api/v1/admin`

| Method | Endpoint Path | Status | Purpose |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/admin/dev-login` | 🟣 | Dev/Test token issuance for admin operations. |
| `GET` | `/api/v1/admin/dashboard` | 🟣 | Platform-wide GMV, active stores, order count, and system health. |
| `GET` | `/api/v1/admin/notifications` | 🟣 | Admin alerts (escalated returns, merchant KYC submissions). |
| `GET` | `/api/v1/admin/sellers` | 🟣 | Lists all registered merchants with KYC verification filter. |
| `GET` | `/api/v1/admin/sellers/:id` | 🟣 | Detailed merchant audit view (documents, bank info, store listings). |
| `PATCH` | `/api/v1/admin/sellers/:id/status` | 🟣 | Approves, suspends, or blocks merchant accounts. |
| `GET` | `/api/v1/admin/customers` | 🟣 | Customer management and support lookup. |
| `GET` | `/api/v1/admin/approvals` | 🟣 | Listing approval queue (`SUBMITTED` listings awaiting review). |
| `PATCH` | `/api/v1/admin/approvals/:id` | 🟣 | Moderates listing (`APPROVED`, `CHANGES_REQUIRED`, `REJECTED`). |
| `POST` | `/api/v1/admin/taxonomy/categories` | 🟣 | Creates new categories in the N-level taxonomy tree. |
| `PUT` | `/api/v1/admin/taxonomy/categories/:id/move` | 🟣 | Reparents category node and recursively updates `materialized_path`. |
| `POST` | `/api/v1/admin/taxonomy/categories/merge` | 🟣 | Merges redundant categories and migrates associated listings. |
| `POST` | `/api/v1/admin/catalog/master/promote-listing/:id` | 🟣 | Promotes verified merchant item to the shared National FMCG catalog. |

---

### 2.2 Customer Portal Backend (`ADAB-Customer-Portal/Customer-Backend`)
Base URL: `http://localhost:5002/api/v1`

| Method | Endpoint Path | Status | Purpose |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/catalog/categories/tree` | 🟣 | Retrieves active category tree for navigation mega-menu. |
| `GET` | `/api/v1/catalog/search?q=...` | 🟣 | Public search with vernacular synonyms expansion and strict `approval_status = 'PUBLISHED'` filter. |
| `GET` | `/api/v1/catalog/categories/:slug/products` | 🟣 | Category browse page with variant count and price ranges. |
| `GET` | `/api/v1/catalog/categories/:slug/facets` | 🟣 | Dynamic attribute filter facets (size, color, brand, dietary type). |
| `GET` | `/api/v1/catalog/products/:id` | 🟣 | Product Detail Page (PDP) reading listing specs and child variants. |
| `GET` | `/api/v1/cart` | 🟣 | Fetches active customer cart with items and store grouping. |
| `POST` | `/api/v1/cart/items` | 🟣 | Adds standalone item or variant to cart with fractional quantities. |
| `PUT` | `/api/v1/cart/items/:id` | 🟣 | Updates quantity in cart. |
| `POST` | `/api/v1/orders` | 🟣 | Customer checkout with atomic conditional stock deduction and rollback on `INSUFFICIENT_STOCK`. |

---

### 2.3 B2B Logistics & Delivery Backend (`ADAB-B2B-Portal/backend`)
Base URL: `http://localhost:5000/api`

| Method | Endpoint Path | Status | Purpose |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/login` | 🟣 | B2B Manufacturer and Distributor authentication. |
| `GET` | `/api/manufacturer/dashboard` | 🟣 | Wholesaler manufacturing output and stock levels. |
| `GET` | `/api/manufacturer/products` | 🟣 | B2B products catalog available for retail merchants to order. |
| `GET` | `/api/distributor/shop-orders` | 🟣 | Retail stores restock orders received by distributor. |
| `GET` | `/api/driver/routes` | 🟣 | Logistics driver dispatch, delivery routes, and vehicle GPS tracking. |
| `POST` | `/api/webhooks` | 🟣 | Logistics partner real-time milestone webhook updates. |

---

## 3. Actionable Discrepancy & Optimization Matrix

Below are the 3 frontend service discrepancies identified in `Shop-Frontend` that should be unified with the backend:

| Frontend Call in `Shop-Frontend` | Called Path | Actual Backend Path | Recommendation |
| :--- | :--- | :--- | :--- |
| `sellerApi.getProducts()` | `GET /api/v1/seller/inventory` | `GET /api/v1/seller/listings` | Alias route in backend or update `sellerApi.js` to call `/listings`. |
| `sellerApi.addProduct()` | `POST /api/v1/seller/inventory` | `POST /api/v1/seller/listings` | Alias route in backend or update `sellerApi.js` to call `/listings`. |
| `sellerApi.placeB2BOrder()` | `POST /api/v1/seller/buystock/purchase-orders` | `POST /api/v1/seller/purchase-orders` | Alias `/buystock/purchase-orders` in `seller.js` to point to `createPurchaseOrder`. |
| `sellerApi.processReturn()` | `POST /api/v1/seller/returns` | `PATCH /api/v1/seller/returns/:id/status` | Expose `POST /returns` for manual store-initiated returns, or update frontend to status flow. |

---

*This document was compiled from live codebase audits of `Shop-Backend`, `Shop-Frontend`, `Admin-Backend`, `Customer-Backend`, and `project arch/` specifications.*
