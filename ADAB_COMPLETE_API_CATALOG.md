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

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/seller/auth/login` | `login` | `sellerController.login` | 🟢 | Password-based login with Phone/Email. Accepts `{ phone, email, password, idMode }`. |
| `POST` | `/api/v1/seller/auth/login-otp` | `login-otp` | `sellerController.loginWithOtp` | 🟢 | OTP-based login. Accepts `{ phone, email, otp, idMode }`. Verifies Redis/Memory OTP code. |
| `POST` | `/api/v1/seller/auth/signup` | `signup` | `sellerController.signup` | 🟢 | Merchant onboarding registration. Accepts `{ phone, email, password, full_name, store_name }`. |
| `POST` | `/api/v1/seller/auth/send-otp` | `send-otp` | `sellerController.sendOtp` | 🟢 | Generates 6-digit OTP code for Phone (SMS) or Email (Brevo SMTP). Accepts `{ identifier, mode }`. |
| `POST` | `/api/v1/seller/auth/verify-otp` | `verify-otp` | `sellerController.verifyOtp` | 🟢 | Validates OTP before password reset or registration. Accepts `{ identifier, otp }`. |
| `POST` | `/api/v1/seller/auth/reset-password` | `reset-password` | `sellerController.resetPassword` | 🟢 | Sets new password after OTP verification. Accepts `{ identifier, otp, newPassword }`. |
| `POST` | `/api/v1/seller/auth/google` | `google` | `sellerController.googleLogin` | 🟢 | Google OAuth2 One-Tap token exchange. Accepts `{ accessToken, idToken }`. Auto-provisions store. |

---

### 1.2 Onboarding, KYC & Store Profile
Base URL: `/api/v1/seller` (requires `requireSellerAuth` JWT middleware)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/onboarding` | `onboarding` | `sellerController.getOnboarding` | 🟢 | Retrieves current 5-step KYC state, completion flags, and verification status from `seller_kyc`. |
| `POST` | `/api/v1/seller/onboarding/step/:stepNum` (or `/stage-X-...`) | `stage-1-store-profile` to `stage-5-b2b-credit-terms` | `sellerController.saveOnboardingStep` | 🟢 | Saves incremental progress for Setup Steps 1-5 (`stage-1-store-profile` through `stage-5-b2b-credit-terms`). Note: `stage-6-starter-catalog` is deprecated/retired (safely preserved as backward-compatible no-op), while `/stage-7-final-submission` remains active as a backward-compatible alias. |
| `POST` | `/api/v1/seller/onboarding/submit` (alias: `/onboarding/submit-application`) | `submit` | `sellerController.submitOnboarding` | 🟢 | Dedicated final submission endpoint for merchant KYC. Validates critical Steps 1 & 2, transitions `kyc_status` to `SUBMITTED`, sets `submitted_at = NOW()`, and dispatches to Admin review queue. |
| `GET` | `/api/v1/seller/profile` | `profile` | `sellerController.getProfile` | 🟢 | Retrieves merchant personal profile (`full_name`, `email`, `phone`, `role`, `language`). |
| `PATCH` | `/api/v1/seller/profile` | `profile` | `sellerController.updateProfile` | 🟢 | Updates merchant name, avatar, contact details. |
| `GET` | `/api/v1/seller/store` | `store` | `sellerController.getStore` | 🟢 | Retrieves store details, coordinates (`latitude`, `longitude`), operational radius, and opening hours. |
| `PATCH` | `/api/v1/seller/store` | `store` | `sellerController.updateStore` | 🟢 | Updates store address, GSTIN, pickup instructions, trade name, and delivery zones. |
| `GET` | `/api/v1/seller/settings` | `settings` | `sellerController.getSettings` | 🟢 | Fetches notifications, language preferences, hardware settings (thermal printer, barcode scanner). |
| `PATCH` | `/api/v1/seller/settings` | `settings` | `sellerController.updateSettings` | 🟢 | Updates store configuration, language toggle (`en`, `hi`, `gu`), and printing layout. |
| `GET` | `/api/v1/seller/dashboard` | `dashboard` | `sellerController.getDashboardMetrics` | 🟢 | Computes sales metrics, today orders, pending payouts, low-stock count, and rating overview. |

---

### 1.3 Orders, Returns & Invoices
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/orders` | `orders` | `sellerController.getOrders` | 🟢 | Fetches store orders from `seller_orders` with items, customer details, status filter, and pagination. |
| `PATCH` | `/api/v1/seller/orders/:id/status` | `status` | `sellerController.updateOrderStatus` | 🟢 | Progresses order state (`ACCEPTED` $\rightarrow$ `PACKED` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED`). |
| `GET` | `/api/v1/seller/returns` | `returns` | `sellerController.getReturns` | 🟢 | Lists customer return requests for the merchant store with return reason, items, and photos. |
| `PATCH` | `/api/v1/seller/returns/:id/status` | `status` | `sellerController.updateReturnStatus` | 🟢 | Approves or rejects returns (`APPROVED`, `REJECTED`, `REFUNDED`). Restocks items atomically. |
| `POST` | `/api/v1/seller/returns` | `returns` | `—` | 🔴 | `processReturn` in `sellerApi.js` attempts to post manual return. Backend currently handles customer-side initiation. |
| `GET` | /api/v1/orders/:orderId/invoice/pdf | `pdf` | `Inline route in `server.js` | 🟢 | Generates printable, GST-compliant HTML/PDF tax invoice with CGST/SGST 5% multi-slab breakdown. |
| `GET` | /api/v1/seller/orders/:orderId/invoice | `invoice` | `Inline route in `server.js` | 🟢 | Alias for tax invoice route above. |

---

### 1.4 POS (Point of Sale Walk-in Sales)
Base URL: `/api/v1/seller/pos`

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/seller/pos/checkout-sale` (alias: `/pos/sales`) | `checkout-sale` | `sellerController.createPOSSale` | 🟢 | Concurrency-safe in-store walk-in sale. Deducts stock atomically, creates POS receipt, logs sales in `seller_orders`. Accepts `{ cart, paymentMethod, customerPhone }`. |

---

### 1.5 Products, Listings & Inventory
Base URL: `/api/v1/seller/listings` (mounted in `ADAB-Shop-Portal/Shop-Backend/server.js` $\rightarrow$ `src/routes/listing.js`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/listings` | `listings` | `ListingController.getListings` | 🟢 | Queries `seller_listings` with category, status (`DRAFT`, `PUBLISHED`), search, and pagination. |
| `GET` | `/api/v1/seller/listings/:id/product-details` (alias: `/:id`) | `product-details` | `ListingController.getListingById` | 🟢 | Retrieves complete listing record including dynamic attributes JSONB and child `listing_variants`. |
| `POST` | `/api/v1/seller/listings` | `listings` | `ListingController.createListing` | 🟢 | Creates new standalone or multi-variant product listing. Validates Zod DTO schema. |
| `PATCH` | `/api/v1/seller/listings/:id/update-listing` (alias: `/:id`) | `update-listing` | `ListingController.updateListing` | 🟢 | Updates price, title, attributes, stock quantity, or images. |
| `PUT` | `/api/v1/seller/listings/:id/update-listing` (alias: `/:id`) | `update-listing` | `ListingController.updateListing` | 🟢 | Full idempotent replacement of listing specifications. |
| `DELETE` | `/api/v1/seller/listings/:id/delete-listing` (alias: `/:id`) | `delete-listing` | `ListingController.deleteListing` | 🟢 | Soft-deletes listing (`is_active = false`, status `ARCHIVED`). |
| `POST` | `/api/v1/seller/listings/batch-delete` | `batch-delete` | `ListingController.batchDeleteListings` | 🟢 | Bulk soft-deletion of multiple listing IDs `{ ids: [...] }`. |
| `POST` | `/api/v1/seller/listings/:id/submit` | `submit` | `ListingController.submitListing` | 🟢 | Submits listing from `DRAFT` or `CHANGES_REQUIRED` to `SUBMITTED` for admin moderation. |
| `POST` | `/api/v1/seller/listings/:id/publish` | `publish` | `ListingController.publishListing` | 🟢 | Moves verified listing from `APPROVED` to `PUBLISHED` (live on customer app). |
| `GET` | `/api/v1/seller/listings/:id/approval-history` | `approval-history` | `ListingController.getApprovalHistory` | 🟢 | Retrieves audit log from `product_approval_history` (rejection reasons, admin feedback). |
| `GET` | `/api/v1/seller/listings/:id/issues` | `issues` | `ListingController.getListingIssues` | 🟢 | Returns compliance validation errors, missing images, expired FSSAI, or zero stock alerts. |
| `POST` | `/api/v1/seller/listings/bulk-upload` | `bulk-upload` | `ListingController.bulkUpload` | 🟢 | Asynchronous CSV/Excel catalog import. Dispatches background worker `bulkUploadJob.js`. |
| `GET` | `/api/v1/seller/listings/bulk-upload/:jobId/status` | `status` | `ListingController.getBulkUploadStatus` | 🟢 | Polls progress, rows processed, and error rows for bulk upload job. |
| `POST` | `/api/v1/seller/listings/bulk-export` | `bulk-export` | `ListingController.bulkExport` | 🟢 | Initiates CSV export of store inventory. |
| `GET` | `/api/v1/seller/listings/bulk-export/:jobId/status` | `status` | `ListingController.getBulkExportStatus` | 🟢 | Checks completion status and returns download URL for exported file. |
| `POST` | `/api/v1/seller/listings/upload-image` | `upload-image` | `ListingController.uploadImage` | 🟢 | Uploads product image buffer to MinIO / S3 or local disk storage. |
| `DELETE` | `/api/v1/seller/listings/:id/images/:imageId` | `:imageId` | `ListingController.deleteImage` | 🟢 | Removes product image from `product_images`. |
| `POST` | `/api/v1/seller/listings/:id/documents` | `documents` | `ListingController.addDocument` | 🟢 | Attaches compliance certs (FSSAI, lab reports, invoices) to listing. |
| `GET` | `/api/v1/seller/inventory` | `inventory` | `—` | 🟡 | `sellerApi.getProducts()` calls `/inventory`. The real backend endpoint is `GET /api/v1/seller/listings`. |
| `POST` | `/api/v1/seller/inventory` | `inventory` | `—` | 🟡 | `sellerApi.addProduct()` calls `/inventory`. The real backend endpoint is `POST /api/v1/seller/listings`. |

---

### 1.6 National FMCG Master Catalog & Dynamic Attributes
Base URL: `/api/v1/shop/catalog` & `/api/v1/seller/catalog`

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/shop/catalog/categories/category-tree` (alias: `/tree`) | `category-tree` | `CatalogController.getCategoryTree` | 🟢 | Returns N-level hierarchical tree of categories (`materialized_path`, `is_leaf`). |
| `GET` | `/api/v1/shop/catalog/categories/:id/attributes` | `attributes` | `CatalogController.getCategoryAttributes` | 🟢 | Recursively resolves inherited dynamic schema attributes from leaf category up to root. |
| `GET` | `/api/v1/shop/catalog/barcode/:barcode/lookup-barcode` (alias: `/:barcode`) | `lookup-barcode` | `CatalogController.lookupBarcode` | 🟢 | Strict EAN/UPC numerical barcode lookup across `master_catalog_items` and `manage_manufacturer_products`. |
| `GET` | `/api/v1/shop/catalog/master/search` | `search` | `CatalogController.searchMasterCatalog` | 🟢 | Searches 5,000+ national FMCG products by keyword with debounce. Excludes `OWN_BRAND`. |
| `GET` | `/api/v1/shop/catalog/b2b/products` | `products` | `CatalogController.getB2BProducts` | 🟢 | Queries manufacturer B2B products registered in the wholesale ecosystem. |
| `GET` | `/api/v1/seller/catalog/master` | `master` | `sellerController.getMasterCatalog` | 🟢 | Paginated browser for merchant 1-click adoption of FMCG catalog goods. |
| `GET` | /api/v1/seller/catalog/product/:id/product-details (alias: `/:id`) | `product-details` | `sellerController.getMasterProductById` | 🟢 | Retrieves master product details, packaging specs, and default images. |
| `GET` | /api/v1/seller/catalog/:id/product-details (alias: `/:id`) | `product-details` | `sellerController.getMasterProductById` | 🟢 | Short-path alias for master product lookup. |
| `POST` | `/api/v1/seller/catalog/adopt` | `adopt` | `sellerController.adoptMasterCatalogItem` | 🟢 | 1-Click adopts a national catalog product into seller's store listing. |
| `POST` | `/api/v1/seller/catalog/restock` | `restock` | `sellerController.orderRestockCases` | 🟢 | Generates restock purchase order for cases/cartons of national FMCG items. |
| `POST` | `/api/v1/seller/catalog/bulk-restock` | `bulk-restock` | `sellerController.bulkOrderRestockCases` | 🟢 | Bulk restocks multiple FMCG lines in a single purchase order. |

---

### 1.7 B2B Resale, Store Distribution & Partner Brands
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/b2b-orders` | `b2b-orders` | `sellerController.getB2BOrders` | 🟢 | Retrieves incoming and outgoing B2B store-to-store orders. |
| `PATCH` | `/api/v1/seller/b2b-orders/:id/status` | `status` | `sellerController.updateB2BOrderStatus` | 🟢 | Updates B2B order status (`ACCEPTED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`). |
| `GET` | `/api/v1/seller/purchase-orders` | `purchase-orders` | `sellerController.getPurchaseOrders` | 🟢 | Lists wholesaler & manufacturer purchase orders raised by this store. |
| `POST` | `/api/v1/seller/purchase-orders` | `purchase-orders` | `sellerController.createPurchaseOrder` | 🟢 | Drafts/places formal B2B purchase order to supplier. |
| `POST` | `/api/v1/seller/buystock/purchase-orders` | `purchase-orders` | `—` | 🟡 | `sellerApi.placeB2BOrder` calls `/buystock/purchase-orders`. Real backend endpoint is `POST /purchase-orders`. |
| `GET` | `/api/v1/seller/other-store-brands` | `other-store-brands` | `sellerController.getOtherStoreBrands` | 🟢 | Discovers other nearby merchants' exclusive local brands available for resale. |
| `POST` | `/api/v1/seller/other-store-brands/add-to-store` | `add-to-store` | `sellerController.addOtherStoreBrandToMyStore` | 🟢 | Adds another store's approved brand into current store's showcase. |
| `GET` | `/api/v1/seller/other-store-brands/my-added` | `my-added` | `sellerController.getMyAddedOtherStoreBrands` | 🟢 | Lists partner brands currently published in this store. |
| `GET` | `/api/v1/seller/other-store-brands/purchased-ready` | `purchased-ready` | `sellerController.getPurchasedBrandsReadyToPublish` | 🟢 | Fetches received B2B inventory items ready to publish to retail customers. |
| `POST` | `/api/v1/seller/other-store-brands/request-stock` | `request-stock` | `sellerController.requestResaleStock` | 🟢 | Submits B2B stock request to brand-owning merchant. |
| `GET` | `/api/v1/seller/other-store-brands/incoming-requests` | `incoming-requests` | `sellerController.getIncomingResaleRequests` | 🟢 | Lists stock requests received from other stores wanting to resell my items. |
| `POST` | `/api/v1/seller/other-store-brands/requests/:id/approve` | `approve` | `sellerController.approveResaleRequest` | 🟢 | Approves incoming resale request and generates wholesale invoice. |
| `POST` | `/api/v1/seller/other-store-brands/requests/:id/decline` | `decline` | `sellerController.declineResaleRequest` | 🟢 | Declines incoming resale request with reason notes. |
| `POST` | `/api/v1/seller/other-store-brands/orders/:id/confirm-pay` | `confirm-pay` | `sellerController.confirmAndPayResaleOrder` | 🟢 | Authorizes payment for partner brand stock order via wallet/credit/bank. |
| `POST` | `/api/v1/seller/other-store-brands/resellers/:buyerStoreId/toggle-block` | `toggle-block` | `sellerController.toggleBlockResellerStore` | 🟢 | Blocks/unblocks a specific retailer from reselling merchant's private brand. |
| `GET` | `/api/v1/seller/brand-distribution-analytics` | `brand-distribution-analytics` | `sellerController.getBrandDistributionAnalytics` | 🟢 | Analyzes wholesale revenue, top resale retail partners, and territory reach. |
| `POST` | `/api/v1/seller/listings/:id/toggle-b2b` | `toggle-b2b` | `sellerController.toggleListingB2B` | 🟢 | Toggles whether a product listing is open for wholesale B2B partner distribution. |

---

### 1.8 Finance, Settlements, Khata & Bank Credit
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/finance/financial-summary` (alias: `/summary`) | `financial-summary` | `sellerController.getFinanceSummary` | 🟢 | Wallet balance, pending payouts, cleared revenue, today's cash vs online split. |
| `GET` | `/api/v1/seller/finance/transactions` | `transactions` | `sellerController.getFinanceTransactions` | 🟢 | Paginated ledger of every credit/debit transaction with reference IDs. |
| `GET` | `/api/v1/seller/finance/settlements` | `settlements` | `sellerController.getFinanceSettlements` | 🟢 | History of automated and manual bank payouts with UTR numbers. |
| `POST` | `/api/v1/seller/finance/withdraw` | `withdraw` | `sellerController.createWithdrawalSettlement` | 🟢 | Initiates instant or end-of-day bank payout request for merchant wallet balance. |
| `GET` | `/api/v1/seller/finance/khata-ledger` (alias: `/khata`) | `khata-ledger` | `sellerController.getKhataLedger` | 🟢 | Traditional digital ledger tracking buyer and supplier credit lines. |
| `POST` | `/api/v1/seller/finance/khata/:id/pay` | `pay` | `sellerController.payKhataOrder` | 🟢 | Records payment against an outstanding khata credit account. |
| `GET` | `/api/v1/seller/credit-balance` | `credit-balance` | `sellerController.getBuyerCreditInfo` | 🟢 | Retrieves seller's available B2B credit limit with partner wholesalers. |
| `GET` | `/api/v1/seller/credit-terms` | `credit-terms` | `sellerController.getStoreCreditRules` | 🟢 | Returns merchant's credit give rules (customer credit) and buy limits. |
| `PUT` | `/api/v1/seller/credit-terms/give` | `give` | `sellerController.updateCreditGiveTerms` | 🟢 | Configures store credit terms offered to trusted customers (days, max limit). |
| `PUT` | `/api/v1/seller/credit-terms/buy` | `buy` | `sellerController.updateCreditBuyLimits` | 🟢 | Configures supplier credit thresholds accepted for restock orders. |
| `GET` | `/api/v1/seller/finance/bank-partners` | `bank-partners` | `sellerController.getBankPartners` | 🟢 | Lists partner NBFCs and banks offering seller working capital credit lines. |
| `POST` | `/api/v1/seller/finance/credit-apply` | `credit-apply` | `sellerController.submitCreditApply` | 🟢 | Submits merchant loan / credit limit application with financial docs. |
| `GET` | `/api/v1/seller/finance/credit-applications` | `credit-applications` | `sellerController.getCreditApplications` | 🟢 | Checks status of submitted bank working capital loan applications. |

---

### 1.9 Marketing, Promotions & Dynamic Pricing
Base URL: `/api/v1/seller` & `/api/v1/seller/pricing`

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/promotions` | `promotions` | `marketingController.getPromotions` | 🟢 | Lists active and scheduled store promotions and discounts. |
| `POST` | `/api/v1/seller/promotions` | `promotions` | `marketingController.createPromotion` | 🟢 | Creates percentage or flat discount on products or categories. |
| `POST` | `/api/v1/seller/promotions/check-overlap` | `check-overlap` | `marketingController.checkOverlap` | 🟢 | Validates that proposed promotion dates do not conflict with existing campaigns. |
| `PATCH` | `/api/v1/seller/promotions/:id/update-promotion` (alias: `/:id`) | `update-promotion` | `marketingController.updatePromotion` | 🟢 | Edits promo budget, start/end date, or discount tiers. |
| `DELETE` | `/api/v1/seller/promotions/:id/delete-promotion` (alias: `/:id`) | `delete-promotion` | `marketingController.deletePromotion` | 🟢 | Cancels and terminates an active promotion. |
| `GET` | `/api/v1/seller/coupons` | `coupons` | `marketingController.getCoupons` | 🟢 | Retrieves discount coupons created by merchant (`SAVE50`, `FESTIVE10`). |
| `POST` | `/api/v1/seller/coupons` | `coupons` | `marketingController.createCoupon` | 🟢 | Creates new coupon code with usage limits and minimum order values. |
| `PATCH` | `/api/v1/seller/coupons/:id/update-coupon` (alias: `/:id`) | `update-coupon` | `marketingController.updateCoupon` | 🟢 | Updates coupon code expiration or activates/deactivates code. |
| `GET` | `/api/v1/seller/pricing` | `pricing` | `pricingController.getPricing` | 🟢 | Lists prices, MRPs, margins, and scheduled price changes across listings. |
| `POST` | `/api/v1/seller/pricing/bulk` | `bulk` | `pricingController.updateBulkPricing` | 🟢 | Bulk updates sell prices and margins across multiple listing IDs. |
| `PATCH` | `/api/v1/seller/pricing/:listingId/update-price` (alias: `/:listingId`) | `update-price` | `pricingController.updateListingPricing` | 🟢 | Updates individual listing price and margin. |
| `GET` | `/api/v1/seller/pricing/history` | `history` | `pricingController.getPricingHistory` | 🟢 | Historical audit trail of price changes per product. |
| `GET` | `/api/v1/seller/pricing/previews` | `previews` | `pricingController.getAllPreviews` | 🟢 | Previews margins and customer-facing prices for scheduled pricing rules. |
| `GET` | `/api/v1/seller/pricing/:listingId/preview` | `preview` | `pricingController.previewPricing` | 🟢 | Calculates profit margin and taxes for a prospective price. |
| `POST` | `/api/v1/seller/pricing/:listingId/schedule` | `schedule` | `pricingController.schedulePricing` | 🟢 | Schedules automated future price change (e.g. night sale or weekend special). |
| `DELETE` | `/api/v1/seller/pricing/:listingId/schedule` | `schedule` | `pricingController.deleteSchedule` | 🟢 | Deletes scheduled pricing event before trigger time. |

---

### 1.10 Notifications, Chat & In-App Messaging
Base URL: `/api/v1/seller` (requires `requireSellerAuth`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/seller/notifications` | `notifications` | `notificationController.getNotifications` | 🟢 | Retrieves user and store notifications with read status and timestamps. |
| `GET` | `/api/v1/seller/notifications/unread-count` | `unread-count` | `notificationController.getUnreadCount` | 🟢 | Returns unread notification count badge for header navigation. |
| `GET` | `/api/v1/seller/notifications/poll-recent` (alias: `/since`) | `poll-recent` | `notificationController.getNotificationsSince` | 🟢 | Incremental long-polling endpoint retrieving alerts created after `?since=...`. |
| `POST` | `/api/v1/seller/notifications/read-all` | `read-all` | `notificationController.markAllAsRead` | 🟢 | Marks all unread alerts as read for authenticated seller. |
| `POST` | `/api/v1/seller/notifications/:id/read` | `read` | `notificationController.markAsRead` | 🟢 | Marks single notification as read. |
| `GET` | `/api/v1/seller/messages/threads` | `threads` | `sellerController.getThreads` | 🟢 | Fetches active buyer and supplier chat conversations. |
| `GET` | `/api/v1/seller/messages/threads/:threadId/messages` (alias: `/:threadId`) | `messages` | `sellerController.getThreadMessages` | 🟢 | Fetches paginated chronological messages for a specific conversation thread. |
| `POST` | `/api/v1/seller/messages/threads/:threadId/messages` | `messages` | `sellerController.sendThreadMessage` | 🟢 | Sends reply in thread. Broadcasts real-time event via Socket.io. |
| `POST` | `/api/v1/seller/messages/threads/:threadId/read` | `read` | `sellerController.markThreadRead` | 🟢 | Marks all messages in conversation thread as read. |

---

### 1.11 AI Assistant & MCP Tool Suite
Base URL: `/api/v1/assistant` (requires `requireSellerAuth`)

| Method | Active Endpoint Path (with Aliases) | DevTools "Name" | Controller Handler | Status | Purpose & Details |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | /api/v1/assistant/tools | `tools` | `Inline router in `assistant.js` | 🟢 | Discovers all registered MCP tools, parameters, descriptions, and safety tiers. |
| `POST` | `/api/v1/assistant/ai-copilot-chat` (alias: `/chat`) | `ai-copilot-chat` | `Inline router in `assistant.js` | 🟢 | Conversational turn with Gemini 3.5 Flash and real-time execution of MCP tools. Accepts `{ prompt, history, model }`. |

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
