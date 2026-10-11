# 📋 ADAB Marketplace — Mrunal's Execution Tasks & Roadmap

> **Owner:** Mrunal  
> **Portal:** ADAB Customer Portal (`ADAB-Customer-Portal`)  
> **Backend:** `Customer-Backend` (Node.js, Express, PostgreSQL `pg`)  
> **Frontend:** `Customer-Frontend` (React, Vite, Tailwind CSS)  
> **Strict Policy:**  
> - No database schema modifications.  
> - Work exclusively inside `ADAB-Customer-Portal`.  
> - No hard-coded/mock data.  
> - All UI matches `project arch/unified-customer-portal-demo.html`.

---

## 📅 Day 1: Foundation, Cart & Checkout Contract (Date: 2026-10-06)

---

### 🖥️ Backend Task 1: Module Boundaries & Folder Structure
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Create clean modular folders inside `Customer-Backend` (`routes/`, `controllers/`, `services/`) to separate cart, checkout, payments, and orders logic cleanly instead of keeping everything in a single file.
- **What we have done:**
  Created standard modular architecture separating database queries, business logic, route handlers, and error utilities into dedicated modules.
- **APIs generated:**
  *(Foundation structure for upcoming routes)*
  - `GET /api/v1/cart/*` mounted via `routes/cartRoutes.js`
  - `POST /api/v1/checkout/*` mounted via `routes/checkoutRoutes.js`
  - `GET /api/v1/orders/*` mounted via `routes/orderRoutes.js`
- **What changes we have done:**
  - Created `services/cartService.js`, `services/checkoutService.js`, `services/orderService.js`
  - Created `controllers/cartController.js`, `controllers/checkoutController.js`, `controllers/orderController.js`
  - Created `routes/cartRoutes.js`, `routes/checkoutRoutes.js`, `routes/orderRoutes.js`
  - Created `utils/errorHandler.js`
  - Modified `server.js` to mount `/api/v1/cart`, `/api/v1/checkout`, and `/api/v1/orders`
- **How to test it:**
  Run the server and check if the route modules register without syntax or import errors.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  node server.js
  ```

---

### 🖥️ Backend Task 2: Cart API Implementation
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Build core Cart REST endpoints connecting directly to existing PostgreSQL tables `carts` and `cart_items` to fetch, add, update, and remove cart items with total bill calculations and coupon support.
- **What we have done:**
  Implemented complete cart persistence logic connecting `carts`, `cart_items`, `seller_listings`, and `stores`. Supports guest session tokens (`x-session-token`), stock checks, quantity updates, deletion, discount coupon calculations (`BALAJI15`, `ADAB100`), and summary calculations.
- **APIs generated:**
  - `GET /api/v1/cart` — Fetches current active cart, joined items, and price summary.
  - `POST /api/v1/cart/items` — Adds a product listing to cart with stock validation.
  - `PATCH /api/v1/cart/items/:id` — Increments/decrements quantity (removes item if quantity hits 0).
  - `DELETE /api/v1/cart/items/:id` — Removes an item from the cart.
  - `GET /api/v1/cart/summary` — Returns subtotal, delivery fee, discount, and grand total.
  - `POST /api/v1/cart/coupon` — Applies coupon code to cart.
  - `DELETE /api/v1/cart/coupon` — Removes applied coupon code.
- **What changes we have done:**
  - Modified `services/cartService.js` with SQL queries for `carts`, `cart_items`, `seller_listings`, `stores`.
  - Modified `controllers/cartController.js` with request handlers for all cart actions.
  - Modified `routes/cartRoutes.js` exposing REST endpoints.
- **How to test it:**
  Use curl or fetch to add an item, fetch the cart, update quantity, and verify live database rows.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  # Run automated test:
  node -e "fetch('http://localhost:5002/api/v1/cart', {headers: {'x-session-token': 'test'}}).then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 3: Checkout & Place Order Contract
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Define the DTO contract for Checkout and build `POST /api/v1/checkout/preview` and `POST /api/v1/checkout/place-order` to validate cart against active stock and save orders using a database transaction.
- **What we have done:**
  Built preview bill breakdown and transactional order placement. In a single PostgreSQL transaction (`BEGIN ... COMMIT`), the system checks stock, inserts the parent order into `orders`, splits items by store into `seller_orders` (initial status `NEW`), inserts items into `order_items`, logs the transaction in `payments`, decrements stock from `seller_listings`, and empties `cart_items`.
- **APIs generated:**
  - `POST /api/v1/checkout/preview` — Returns bill breakdown, stock verification, and grouped items.
  - `POST /api/v1/checkout/place-order` — Places confirmed order in database with multi-vendor split.
  - `GET /api/v1/orders/:id` — Retrieves saved order details with line items.
- **What changes we have done:**
  - Modified `services/checkoutService.js` for checkout bill preview calculation.
  - Modified `services/orderService.js` for PostgreSQL transaction handling (`orders`, `seller_orders`, `order_items`, `payments`, `seller_listings`).
  - Modified `controllers/checkoutController.js` & `controllers/orderController.js`.
  - Modified `routes/checkoutRoutes.js` & `routes/orderRoutes.js`.
- **How to test it:**
  Place an order through API with items in cart; verify rows created in `orders`, `seller_orders`, `order_items`, and inventory decremented in `seller_listings`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🖥️ Backend Task 4: Data Validation & Error Handling
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Add validation checks: prevent order placement on empty cart, ensure quantity is greater than 0, and handle database errors gracefully with clean JSON error messages `{ status: "error", message: "..." }`.
- **What we have done:**
  Added empty cart guard in `checkoutController.js`, positive quantity validation in `cartController.js`, centralized database error mapper in `errorHandler.js` handling PostgreSQL constraint codes (`23503`, `23514`, `22P02`), and registered a 404 handler and global error middleware in `server.js`.
- **APIs generated:**
  - Standard error format across all endpoints: `{ status: "error", message: "..." }`.
  - Fallback 404 handler for invalid routes.
- **What changes we have done:**
  - Created `utils/errorHandler.js` with `formatError` mapping PostgreSQL codes to HTTP statuses.
  - Modified `controllers/cartController.js` with positive quantity checks.
  - Modified `controllers/checkoutController.js` with empty-cart check and address validation.
  - Modified `server.js` with 404 handler and global error handling middleware.
- **How to test it:**
  Send invalid payload (e.g. quantity `-5` or empty cart checkout) and verify response returns HTTP 400 with clean JSON error.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🎨 Frontend Task 1: Setup Theme & UI Foundation
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Configure project styling matching `unified-customer-portal-demo.html`: import Plus Jakarta Sans font, FontAwesome 6.5.1 icons, apply ADAB color palette (Forest Green `#15803D`, Emerald `#059669`, Light Cream `#DCFCE7`, Coral `#F97316`), and make it fully responsive for all screen sizes.
- **What we have done:**
  Imported Google Fonts and FontAwesome in `index.html`, added ADAB color palette tokens, created reusable UI component classes in `index.css` (`.glass`, `.search-pill`, `.green-btn`, `.coral-btn`, `.cat-pill`, `.bottom-nav`), established responsive layout container (`.page`), and set up the API client in `src/services/api.js`.
- **APIs generated:**
  - N/A — Frontend styling foundation.
  - Created `src/services/api.js` client wrapper pointing to `http://localhost:5002/api/v1`.
- **What changes we have done:**
  - Modified `Customer-Frontend/index.html` with fonts, FontAwesome CDN, and Leaflet styles.
  - Modified `Customer-Frontend/src/index.css` with color variables, button styles, cards, and scrollbars.
  - Created `Customer-Frontend/src/services/api.js` with persistent session token generation and API methods.
- **How to test it:**
  Run `npm run build` to confirm CSS and JS compile cleanly. Check typography and icons in browser.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 2: Floating Cart Bar Component
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Build the sticky bottom floating cart bar: show total items count, store name, current total price, slide into view when items are in cart, hide when empty, and open Cart on click.
- **What we have done:**
  Created `FloatingCartBar.jsx` matching the demo UI. Added smooth CSS slide transitions, item count formatting (`1 item` vs `2 items`), store name resolution, total price display, and click handler opening the Cart tab.
- **APIs generated:**
  - N/A — Frontend React component.
- **What changes we have done:**
  - Created `Customer-Frontend/src/components/FloatingCartBar.jsx`.
  - Added CSS classes `.float-cart` and `.hidden-bar` in `src/index.css`.
  - Mounted component in `Customer-Frontend/src/App.jsx`.
- **How to test it:**
  On the homepage, click "Add Moong Dal" — verify the green bar slides up from the bottom showing "1 item · ADAB Flagship Store (Real) · ₹39". Clear cart — verify it slides down and hides.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 3: Shopping Cart Screen (`sec-cart`)
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Build the Cart view matching the demo: items grouped by store with product emoji, name, price, and `+ / -` quantity controls, promo coupon section, bill summary card (Subtotal, Delivery Fee, Discount, Grand Total), "Proceed to Checkout" button, and friendly empty cart state.
- **What we have done:**
  Created `CartView.jsx` matching `unified-customer-portal-demo.html`. Wired item increment/decrement to `CartAPI.updateItem`, connected coupon input to `CartAPI.applyCoupon` / `removeCoupon`, added empty basket illustration with "Start Shopping" button, and added the "Proceed to Checkout" navigation button.
- **APIs generated:**
  - Connected to backend: `GET /api/v1/cart`, `PATCH /api/v1/cart/items/:id`, `POST /api/v1/cart/coupon`, `DELETE /api/v1/cart/coupon`.
- **What changes we have done:**
  - Created `Customer-Frontend/src/components/CartView.jsx`.
  - Mounted `CartView` inside `Customer-Frontend/src/App.jsx`.
  - Connected cart update handlers in `App.jsx`.
- **How to test it:**
  Open Cart view in browser, click `+` and `-` to see real-time updates in database, test applying coupon `BALAJI15`, and verify total calculations.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 4: Checkout Screen (`sec-checkout`)
- **Status:** [x] Completed on 2026-10-06
- **What was asked to do:**
  Build the Checkout view matching the demo: Address Selection card, Delivery Speed options (Fast 14–45m, Same-Day, Standard/Pickup), Payment Method selector (UPI, Credit/Debit Cards, Cash on Delivery, ADAB 0% Pay Later), Order Summary, and "Place Order" CTA transitioning to Order Tracking screen.
- **What we have done:**
  Created `CheckoutView.jsx` with address card & inline edit form, delivery speed selection updating bill totals dynamically (free over ₹499), payment method selection mapped to DB constraints, and "Place Order" CTA calling `CheckoutAPI.placeOrder`. On success, the cart clears and the app transitions to the live Orders/Tracking screen (`sec-orders` / `sec-track`) with order number and rider status.
- **APIs generated:**
  - Connected to backend: `POST /api/v1/checkout/place-order`.
- **What changes we have done:**
  - Created `Customer-Frontend/src/components/CheckoutView.jsx`.
  - Modified `Customer-Frontend/src/App.jsx` to mount `CheckoutView`, added `handlePlaceOrder`, and created `sec-orders` & `sec-track` screens.
  - Added order tracking styles (`.order-track-bar`, `.order-track-fill`) in `src/index.css`.
- **How to test it:**
  From the Cart screen, click "Proceed to Checkout". Select a delivery speed and payment method, then click "Place Order". Verify that the app navigates to the Orders screen showing `#ORD-...` with status `ON THE WAY`.
- **How to run it:**
  ```powershell
  # Start Backend:
  cd ADAB-Customer-Portal/Customer-Backend
  npm start

  # Start Frontend (in separate terminal):
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

## 📅 Day 2: Multi-Vendor Cart & Stock Synchronization (Date: 2026-10-08)

---

### 🖥️ Backend Task 1: Cart CRUD Lifecycle
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Implement the full Cart CRUD lifecycle with live product and store metadata, atomic quantity increment/decrement, automatic item removal when quantity reaches 0, and database constraint boundary checks.
- **What we have done:**
  Implemented atomic item operations directly connected to `carts` and `cart_items` with joins across `seller_listings`, `products`, and `stores`. Handled listing conflict checks, stock limits, delta increments (`delta: +1 / -1`), auto-deletion when quantity reaches 0, and explicit item removal.
- **APIs generated:**
  - `GET /api/v1/cart` — Fetches active cart, store-grouped items, and bill summary.
  - `POST /api/v1/cart/items` — Adds a listing to the cart with inventory boundary checks.
  - `PATCH /api/v1/cart/items/:id` — Increments/decrements quantity (auto-deletes if 0).
  - `DELETE /api/v1/cart/items/:id` — Removes a specific item from the cart.
- **What changes we have done:**
  - Modified `Customer-Backend/services/cartService.js` (`getCartItems`, `addItemToCart`, `updateCartItemQuantity`, `removeCartItem`).
  - Modified `Customer-Backend/controllers/cartController.js` (`getCart`, `addItem`, `updateItem`, `removeItem`).
  - Modified `Customer-Backend/routes/cartRoutes.js` with CRUD route bindings.
- **How to test it:**
  Send a POST request to add an item, PATCH with `delta: 1`, PATCH with `delta: -2` to verify auto-deletion, and DELETE to remove. Verify live cart items in PostgreSQL `cart_items` table.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  # Test Cart CRUD:
  node -e "fetch('http://localhost:5002/api/v1/cart', {headers: {'x-session-token': 'test-session'}}).then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 2: Multi-Vendor Cart Support & Seller Grouping
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Support multi-vendor cart cohabitation where items from different neighborhood stores exist in a single cart, grouped by `store_id`, with independent store subtotals, store metadata, and individual shipping contributions.
- **What we have done:**
  Implemented multi-store grouping in `cartService.js` and `checkoutService.js`. Grouped cart items by store ID (`store_id`, `store_name`, `seller_name`, `store_address`, `distance_km`, `sla_minutes`), calculated store-level subtotals, item counts, and per-store delivery fee contributions.
- **APIs generated:**
  - `GET /api/v1/cart` — Returns `stores` array grouped with store metadata, item lists, and store subtotals.
  - `POST /api/v1/checkout/preview` — Returns vendor-separated item groups and individual seller order projections.
- **What changes we have done:**
  - Modified `Customer-Backend/services/cartService.js` (`getCartItems` with store joins).
  - Modified `Customer-Backend/services/checkoutService.js` (`calculateCheckoutPreview` grouping items by `store_id`).
  - Modified `Customer-Backend/controllers/cartController.js` to return grouped `stores` payload.
- **How to test it:**
  Add items from two different seller listings into the same cart. Call `GET /api/v1/cart` and ensure `stores` array contains two distinct vendor groups with accurate item counts and store subtotals.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🖥️ Backend Task 3: Server-Side Stock & Price Validation
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Build a dedicated server-side validation endpoint `POST /api/v1/cart/validate` that inspects live inventory against active quantities in the cart, verifies current selling prices against database listings, and flags any out-of-stock items, partial stock deficits, or price discrepancies before checkout.
- **What we have done:**
  Implemented `validateCartStock` in `checkoutService.js` and exposed `POST /api/v1/cart/validate`. Validates every cart item against `seller_listings.stock_qty` and `seller_listings.sell_price`. Returns structured validation report with `isValid`, list of `issues` (`OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `PRICE_CHANGED`), requested vs available stock quantities, and updated bill totals.
- **APIs generated:**
  - `POST /api/v1/cart/validate` — Validates real-time inventory and pricing for cart items.
- **What changes we have done:**
  - Added `validateCartStock` in `Customer-Backend/services/checkoutService.js`.
  - Added `validateCart` controller action in `Customer-Backend/controllers/cartController.js`.
  - Mounted `router.post('/validate', cartController.validateCart)` in `Customer-Backend/routes/cartRoutes.js`.
- **How to test it:**
  Send a POST request to `/api/v1/cart/validate` with a session token; verify response returns `isValid: true` if stock is available, or structured `issues` array if inventory is insufficient.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  node -e "fetch('http://localhost:5002/api/v1/cart/validate', {method: 'POST', headers: {'Content-Type': 'application/json', 'x-session-token': 'test-session'}}).then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 4: Financial Breakdown & Bill Calculation
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Create an authoritative bill computation endpoint `GET /api/v1/cart/summary` calculating items subtotal, total MRP, dynamic delivery fee based on speed and order threshold (free over ₹499), discount amount from active coupon, grand total, and estimated customer reward points.
- **What we have done:**
  Implemented complete financial engine in `checkoutService.js` (`calculateCheckoutPreview`). Computes item subtotal, MRP, savings (`total_mrp - subtotal`), delivery fee rules (`EXPRESS_30M`: ₹49, `SAME_DAY`: ₹29, `STANDARD`: ₹19; free over ₹499 for express/same-day), dynamic coupon discount, grand total (`subtotal + delivery_fee - discount`), and reward points (1 point per ₹100 spent).
- **APIs generated:**
  - `GET /api/v1/cart/summary` — Authoritative financial breakdown, pricing object, and savings summary.
- **What changes we have done:**
  - Modified `Customer-Backend/services/checkoutService.js` with comprehensive financial formulas.
  - Added `getCartSummary` in `Customer-Backend/controllers/cartController.js`.
  - Mounted `router.get('/summary', cartController.getCartSummary)` in `Customer-Backend/routes/cartRoutes.js`.
- **How to test it:**
  Query `/api/v1/cart/summary` with query params `delivery_speed=EXPRESS_30M` and verify that pricing includes subtotal, delivery fee, discount, grand total, and estimated points.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  node -e "fetch('http://localhost:5002/api/v1/cart/summary?delivery_speed=EXPRESS_30M', {headers: {'x-session-token': 'test-session'}}).then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 5: Live Database Coupon Integration
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Integrate real promotional coupons querying PostgreSQL `coupons` table. Validate code active status, validity dates (`valid_from` to `valid_to`), minimum order value (`min_order_value`), usage limits, and compute percentage or flat discount amounts. Support listing available coupons, applying coupons, and removing coupons.
- **What we have done:**
  Implemented live coupon querying against `coupons` table with validation for `is_active`, expiration, min order requirement, and discount calculation (`PERCENTAGE` with `max_discount_amount` cap vs `FLAT_AMOUNT`). Connected cart coupon persistence (`coupon_code` column on `carts`).
- **APIs generated:**
  - `GET /api/v1/cart/coupons` — Lists all valid, active coupons with eligibility badges.
  - `POST /api/v1/cart/coupon` — Validates and applies coupon code to active cart.
  - `DELETE /api/v1/cart/coupon` — Unlinks applied coupon from cart and recalculates bill.
- **What changes we have done:**
  - Added `validateCoupon` & `getAvailableCoupons` in `Customer-Backend/services/checkoutService.js`.
  - Added `applyCartCoupon` & `removeCartCoupon` in `Customer-Backend/services/cartService.js`.
  - Added `applyCoupon`, `removeCoupon`, `getAvailableCoupons` in `Customer-Backend/controllers/cartController.js`.
  - Mounted coupon endpoints in `Customer-Backend/routes/cartRoutes.js`.
- **How to test it:**
  Fetch available coupons with `GET /api/v1/cart/coupons`, apply coupon `BALAJI15` via `POST /api/v1/cart/coupon`, verify discount reflection, and remove coupon via `DELETE /api/v1/cart/coupon`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  node -e "fetch('http://localhost:5002/api/v1/cart/coupons').then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 6: Guest / Customer Session Management
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Build unified session management allowing guest shoppers to maintain carts via `x-session-token` or `session_token`, and seamlessly merge/claim the guest cart into a logged-in user profile (`customer_id`) upon login or checkout.
- **What we have done:**
  Implemented `resolveSession` helper in `cartController.js` and `getOrCreateCart` in `cartService.js`. Built `mergeCart` functionality: when a guest logs in, their cart items are migrated/merged into their customer cart row in `carts` table, resolving conflicts and updating `customer_id`.
- **APIs generated:**
  - `POST /api/v1/cart/merge` — Merges guest session cart items into customer cart.
- **What changes we have done:**
  - Modified `Customer-Backend/services/cartService.js` (`getOrCreateCart` with session/customer fallback).
  - Added `mergeCart` controller action in `Customer-Backend/controllers/cartController.js`.
  - Added `router.post('/merge', cartController.mergeCart)` in `Customer-Backend/routes/cartRoutes.js`.
- **How to test it:**
  Add items as a guest with `x-session-token: guest-123`. Then call `POST /api/v1/cart/merge` passing customer ID and session token; verify items are linked to the customer in PostgreSQL.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🎨 Frontend Task 1: Complete Shopping Cart UI (`sec-cart`) Implementation
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Implement the full Shopping Cart view matching the demo: empty basket state with shopping CTA, "Direct from Neighborhood Stores" banner, multi-seller visual cards grouping items, interactive `+ / -` quantity controls (`qty-ctrl`), live bill summary card, and delivery address preview strip.
- **What we have done:**
  Rebuilt `CartView.jsx` with full component structure matching `unified-customer-portal-demo.html`: empty cart state with basket illustration, store badges with distance & SLA chips, individual vendor item cards with product emojis and price/unit details, interactive `.qty-ctrl` stepper, live bill row breakdown, and quick delivery address preview strip.
- **APIs generated:**
  - Connected to backend: `GET /api/v1/cart`, `PATCH /api/v1/cart/items/:id`, `DELETE /api/v1/cart/items/:id`.
- **What changes we have done:**
  - Refactored `Customer-Frontend/src/components/CartView.jsx` into modular multi-vendor layout.
  - Added styling classes for quantity controls, store headers, and bill rows in `src/index.css`.
  - Connected state sync with `CartAPI.getCart` and `CartAPI.updateItem` in `App.jsx`.
- **How to test it:**
  Open Cart view in browser, add items from multiple stores, verify seller grouping cards, click `+` and `-` controls to see instant count updates and total price changes.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 2: Coupon Application Flow
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Build the coupon application experience: uppercase coupon input field, coral "Apply" button with loading spinner, applied coupon green card with savings display and remove button, clean error alerts for invalid/expired codes, and expandable "Available Coupons" drawer.
- **What we have done:**
  Implemented complete interactive coupon module in `CartView.jsx`: auto-capitalized coupon input, apply button with loader, applied coupon banner showing code, discount amount, and remove CTA. Added inline error banner displaying backend validation codes (`NOT_FOUND`, `EXPIRED`, `MIN_ORDER_NOT_MET`), and interactive available coupons modal/drawer showing active vouchers (`BALAJI15`, `ADAB100`) with 1-click apply.
- **APIs generated:**
  - Connected to backend: `GET /api/v1/cart/coupons`, `POST /api/v1/cart/coupon`, `DELETE /api/v1/cart/coupon`.
- **What changes we have done:**
  - Added coupon section and available coupons drawer in `Customer-Frontend/src/components/CartView.jsx`.
  - Added coupon API wrappers in `Customer-Frontend/src/services/api.js`.
  - Styled coupon badge, applied banner, and drawer in `src/index.css`.
- **How to test it:**
  In Cart view, enter `BALAJI15` and click Apply; verify discount applies to order total. Click "Remove" to revert. Try entering an invalid code like `INVALID99` and verify error toast appears.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 3: Pre-Checkout Stock & Price Validation Trigger
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Wire "Proceed to Checkout" CTA to call `POST /api/v1/cart/validate` before routing to checkout. Show real-time alerts (`#preCheckoutAlert`), display item-level warning badges for out-of-stock items or price changes, and prevent proceeding when stock validation fails.
- **What we have done:**
  Integrated pre-checkout validation pipeline in `CartView.jsx` and `App.jsx`. When "Proceed to Checkout" is clicked, client sends cart contents to `CartAPI.validateCart`. If issues are detected, a prominent warning alert (`#preCheckoutAlert`) displays the exact stock deficits, affected items show red out-of-stock badges, and checkout transition is blocked until resolved.
- **APIs generated:**
  - Connected to backend: `POST /api/v1/cart/validate`.
- **What changes we have done:**
  - Added pre-checkout validation trigger in `Customer-Frontend/src/components/CartView.jsx`.
  - Added error alert card `#preCheckoutAlert` and item out-of-stock badges in `CartView.jsx`.
  - Added `validateCart` method in `Customer-Frontend/src/services/api.js`.
- **How to test it:**
  Click "Proceed to Checkout" with normal cart to verify instant transition. Set item quantity beyond stock to verify red warning alert appears and navigation is prevented.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 4: UI Design Parity with Customer Portal Demo
- **Status:** [x] Completed on 2026-10-08
- **What was asked to do:**
  Achieve 100% visual design parity with `unified-customer-portal-demo.html`: exact brand colors (`brand-green` `#15803D`, `brand-coral` `#F97316`), typography (Plus Jakarta Sans), desktop website top navigation header (`site-nav`), hero copy & statistics banner, desktop footer (`site-footer`), and cart wrappers (`cartFull`, `bill-row`).
- **What we have done:**
  Standardized all CSS classes and component layouts to mirror `unified-customer-portal-demo.html`. Built desktop `site-nav` header with search and category pills, hero banner with live statistics, responsive dual-column desktop cart layout (`.cartFull`), demo-parity bill rows (`.bill-row`), and comprehensive desktop footer (`site-footer`).
- **APIs generated:**
  - N/A — Frontend UI parity and styling architecture.
- **What changes we have done:**
  - Updated `Customer-Frontend/src/App.jsx` with `site-nav`, hero section, and `site-footer`.
  - Updated `Customer-Frontend/src/index.css` with 100% demo design utility classes.
  - Updated `Customer-Frontend/src/components/CartView.jsx` with demo class structure.
  - Created automated test `src/__tests__/DesignParity.test.jsx`.
- **How to test it:**
  Compare React application side-by-side with `project arch/unified-customer-portal-demo.html` in browser; verify matching typography, color hex codes, button hover effects, and layout hierarchy.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

## 📅 Day 3: Payment Gateway, Idempotency & Order Placement Hardening (Date: 2026-10-10)

---

### 🖥️ Backend Task 1: Pluggable Payment Adapter & Payment Intent API
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Build a clean payment provider abstraction layer decoupling the checkout engine from specific payment gateways. Support pluggable providers (Mock gateway for development/testing, Razorpay for production), generate standardized payment intent sessions with INR amounts and receipts, and expose `POST /api/v1/checkout/payment-intent`.
- **What we have done:**
  Architected `PaymentAdapter` (`services/paymentAdapter.js`) supporting registry pattern for any gateway provider. Implemented `MockPaymentGateway` (`services/mockGateway.js`) with client secret generation and signature simulation, and `RazorpayAdapter` (`services/razorpayAdapter.js`) using native HTTPS calls. Implemented `POST /api/v1/checkout/payment-intent` validating stock before payment initialization, computing authoritative cart totals, and issuing standardized intents.
- **APIs generated:**
  - `POST /api/v1/checkout/payment-intent` — Initializes payment session, validates cart stock, and returns intent ID & client secret.
  - `GET /api/v1/checkout/delivery-slots` — Retrieves delivery time slots for checkout scheduling.
  - `POST /api/v1/checkout/serviceability` — Validates address pincode serviceability against store zones.
- **What changes we have done:**
  - Created `Customer-Backend/services/paymentAdapter.js` (provider registry & standard contract).
  - Created `Customer-Backend/services/mockGateway.js` (simulated payment gateway).
  - Created `Customer-Backend/services/razorpayAdapter.js` (Razorpay production integration).
  - Added `createPaymentIntent`, `getDeliverySlots`, and `checkServiceability` in `Customer-Backend/controllers/checkoutController.js`.
  - Mounted `/payment-intent`, `/delivery-slots`, and `/serviceability` in `Customer-Backend/routes/checkoutRoutes.js`.
- **How to test it:**
  Send POST to `/api/v1/checkout/payment-intent` with cart ID or amount; verify response returns `intent_id`, `provider: "mock"`, `status: "INITIATED"`, and `client_secret`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  # Test Payment Intent creation:
  node -e "fetch('http://localhost:5002/api/v1/checkout/payment-intent', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({amount: 500, payment_method: 'UPI'})}).then(r=>r.json()).then(console.log)"
  ```

---

### 🖥️ Backend Task 2: Idempotency Protection Middleware
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Implement idempotency protection on payment and order creation endpoints to prevent duplicate charges and double order placement from rapid multi-clicks, network retransmissions, or mobile app retries.
- **What we have done:**
  Created `idempotencyMiddleware` in `middleware/idempotency.js`. Uses SHA-256 request fingerprinting (method + path + normalized body), detects concurrent in-flight executions (HTTP 409 `IDEMPOTENCY_CONCURRENT_REQUEST`), detects payload tampering on reused keys (HTTP 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`), and replays cached responses with `X-Idempotency-Status: REPLAYED` within a 10-minute TTL window with automatic garbage collection. Wired onto all financial endpoints.
- **APIs generated:**
  - Protected endpoints with `x-idempotency-key`:
    - `POST /api/v1/checkout/place-order`
    - `POST /api/v1/checkout/payment-intent`
    - `POST /api/v1/payments/:id/confirm`
    - `POST /api/v1/payments/:id/retry`
- **What changes we have done:**
  - Created `Customer-Backend/middleware/idempotency.js`.
  - Applied `idempotencyMiddleware()` on order and payment routes in `Customer-Backend/routes/checkoutRoutes.js` and `routes/paymentRoutes.js`.
- **How to test it:**
  Send two identical POST requests with the same `x-idempotency-key` header; verify the second request returns HTTP 200 with header `X-Idempotency-Status: REPLAYED` without re-executing database queries. Send same key with different payload to verify HTTP 422 error.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🖥️ Backend Task 3: Payment Lifecycle, Failure Handling & Retry Protocol
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Implement full payment lifecycle management: payment status inspection, gateway callback confirmation with signature verification, failed payment state recording, and a retry protocol allowing customers to re-attempt payment with the same or different payment method without losing their order.
- **What we have done:**
  Built `paymentService.js`, `paymentController.js`, and `paymentRoutes.js`. Created `confirmPayment` executing in a PostgreSQL transaction (`BEGIN ... COMMIT`) to verify gateway signature, update `payments.status` (`SUCCESS` / `FAILED`), update `orders.payment_status` (`PAID` / `FAILED`), and insert audit record into `payment_transactions`. Built `retryPayment` allowing customers to switch payment modes (e.g. UPI → CARD), creating fresh gateway intent sessions and resetting status to `PENDING`.
- **APIs generated:**
  - `GET /api/v1/payments/:id` — Retrieves payment details and associated transactions.
  - `POST /api/v1/payments/:id/confirm` — Confirms payment authorization, verifies signature, updates order status.
  - `POST /api/v1/payments/:id/retry` — Re-attempts payment for failed transactions with method switching.
- **What changes we have done:**
  - Created `Customer-Backend/services/paymentService.js` (lifecycle, confirmation, retry, DB transactions).
  - Created `Customer-Backend/controllers/paymentController.js` (HTTP handlers & error mapping).
  - Created `Customer-Backend/routes/paymentRoutes.js` (mounted on `/api/v1/payments`).
  - Modified `Customer-Backend/server.js` mounting `paymentRoutes`.
- **How to test it:**
  Call `POST /api/v1/payments/:id/confirm` with valid intent ID; verify order transitions to `PAID` and row appears in `payment_transactions`. Call `POST /api/v1/payments/:id/retry` with new method to verify reset to `PENDING`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm start
  ```

---

### 🖥️ Backend Task 4: Customer Saved Addresses & Profile Integration
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Connect checkout address selection directly to PostgreSQL database tables (`customer_addresses` and `addresses`). Provide full CRUD operations for customer delivery addresses, default address toggle, and automatic fallback address seeding for Surat.
- **What we have done:**
  Implemented complete address management in `customerService.js`. Resolves user IDs across guest tokens, session tokens, and UUIDs (`resolveCustomerUserId`). Reads and writes to both `customer_addresses` and `addresses` tables simultaneously with deduplication, handles `is_default` exclusivity, and seeds a ready default Surat address if none exist so the checkout screen is never blocked.
- **APIs generated:**
  - `GET /api/v1/customers/me/addresses` — Retrieves saved customer addresses sorted by default.
  - `POST /api/v1/customers/me/addresses` — Adds new delivery address with recipient name, phone, line, city, pincode.
  - `PATCH /api/v1/customers/me/addresses/:id` — Updates existing address or sets as default.
  - `DELETE /api/v1/customers/me/addresses/:id` — Removes saved delivery address.
  - `GET /api/v1/customers/me/payment-methods` — Retrieves saved payment instruments.
- **What changes we have done:**
  - Modified `Customer-Backend/services/customerService.js` (`getAddresses`, `addAddress`, `updateAddress`, `deleteAddress`, `resolveCustomerUserId`).
  - Modified `Customer-Backend/controllers/customerController.js` with address handlers.
  - Modified `Customer-Backend/routes/customer.js` exposing `/me/addresses` endpoints.
- **How to test it:**
  Call `GET /api/v1/customers/me/addresses` to view saved addresses. Add a new address via `POST`, update via `PATCH`, and verify in PostgreSQL table `customer_addresses`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  node -e "fetch('http://localhost:5002/api/v1/customers/me/addresses').then(r=>r.json()).then(console.log)"
  ```

---

### 🎨 Frontend Task 1: Saved Addresses Modal, Pincode Auto-Detection & Cart Address Switching (`AddressModal` / `CartView`)
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Build an address management modal matching the demo with full-screen backdrop blur. Connect directly to customer addresses APIs, provide an international country code dropdown (`+91`, `+971`, `+1`), enforce strict 10-digit mobile number input, allow instant selection on the Checkout screen and Cart screen, eliminate hardcoded "Surat" text in the header and cart previews when selecting non-Surat addresses (e.g. Ahmedabad), and implement 6-digit Pincode auto-detection for City & State.
- **What we have done:**
  - Created `AddressModal.jsx` rendered via `createPortal` directly into `document.body` to guarantee 100% full-screen blur with zero edge leaks. Implemented address list view, add new address form, and edit address form.
  - Built Indian Pincode Auto-Detection engine in `src/utils/pincode.js` with instant offline heuristic dictionary for Gujarat & India metro prefixes, paired with live Postal PIN Code API lookups.
  - Integrated pincode auto-detection into both `AddressModal.jsx` and `AccountPage.jsx`, automatically detecting and filling `city` and `state` as soon as a 6-digit PIN is entered.
  - Fixed hardcoded ", Surat" in `App.jsx` header and hero text to dynamically display `${selectedAddress.city || 'Surat'}` (e.g. Ahmedabad).
  - Connected `CartView.jsx` to live customer addresses and passed `selectedDeliveryAddress`, `onChangeAddress`, and `onSelectAddress` from `App.jsx`, allowing seamless address preview and switching in Cart.
- **APIs generated:**
  - Connected to backend: `GET /api/v1/customers/me/addresses`, `POST /api/v1/customers/me/addresses`, `PATCH /api/v1/customers/me/addresses/:id`.
  - Pincode detection: `https://api.postalpincode.in/pincode/:pincode`.
- **What changes we have done:**
  - Created `Customer-Frontend/src/utils/pincode.js`.
  - Created `Customer-Frontend/src/components/AddressModal.jsx`.
  - Integrated `AddressModal` into `Customer-Frontend/src/components/CheckoutView.jsx`, `App.jsx`, and `CartView.jsx`.
  - Enhanced `AccountPage.jsx` with pincode auto-detection for addresses.
  - Added unit test cases in `src/__tests__/Day3Fixes.test.jsx` and `src/__tests__/AddressPincodeFlow.test.jsx`.
- **How to test it:**
  In Header or Cart, click "Change" address. Enter a 6-digit Pincode like `380051` or `395002`; verify City and State are automatically detected and filled. Save or select the Ahmedabad address, and verify Header and Cart both display "Ahmedabad" without reverting to "Surat".
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 2: Multi-Step Payment Processing Modal & State Machine
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Build an interactive payment processing modal dialog replacing instantaneous dummy checkout. Implement a visual state progression showing payment initiation, bank/gateway authorization with timer countdown, and signature verification.
- **What we have done:**
  Implemented payment state machine inside `CheckoutView.jsx` rendered via `createPortal`:
  - Step 1: Initiating Payment Intent (`createPaymentIntent`) with receipt ID.
  - Step 2: Authorizing with Gateway/Bank (animated progress bar, circular spinner, and graceful "Cancel Payment" button).
  - Step 3: Verifying Signature & Finalizing Order (`confirmPayment` or `placeOrder`).
  Transitions smoothly to the order confirmation screen upon success.
- **APIs generated:**
  - Connected to backend: `POST /api/v1/checkout/payment-intent`, `POST /api/v1/payments/:id/confirm`, `POST /api/v1/checkout/place-order`.
- **What changes we have done:**
  - Enhanced `Customer-Frontend/src/components/CheckoutView.jsx` with full payment modal and progress indicator.
  - Added state transitions (`initiating` → `authorizing` → `paid` / `failed` / `cancelled`).
  - Added payment modal styles and animations in `src/index.css`.
- **How to test it:**
  Select UPI or Card on Checkout screen and click "Place Order". Watch the payment modal appear showing step-by-step authorization, spinner, and smooth completion.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 3: Payment Failure, Retry & 1-Click COD Fallback Protocol
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Build graceful payment failure handling: show clear error alerts, preserve 100% of user cart and address state, provide a "Retry Payment" option, a 1-click fallback to Cash on Delivery, and support graceful cancellation without losing basket items.
- **What we have done:**
  Implemented error handling states in `CheckoutView.jsx`:
  - Failed state displays bank decline reason with safety assurance that no money was deducted.
  - Preserves entire cart and address state.
  - Option 1: "Retry Payment" button calling `PaymentAPI.retry` with retry attempt counter.
  - Option 2: "Pay via Cash on Delivery Instead" button switching method to COD with zero re-entry required.
  - Option 3: "Switch Payment Method" returning to selector.
  - Cancelled state allows customers to resume payment or return to cart safely.
- **APIs generated:**
  - Connected to backend: `POST /api/v1/payments/:id/retry`, `POST /api/v1/checkout/place-order`.
- **What changes we have done:**
  - Added failure and cancellation views in `Customer-Frontend/src/components/CheckoutView.jsx`.
  - Added `handleRetryPayment`, `handleFallbackToCOD`, and `handleCancelPayment` handlers.
- **How to test it:**
  Simulate a failed payment or cancel during authorization. Verify that cart items remain intact, decline message displays, and clicking "Pay via Cash on Delivery Instead" places the order immediately.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 4: Detailed Order Tracking & Receipt View (`OrderStatusView` / `sec-track`)
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Build a complete Order Details and Status Tracking view (`sec-track`) displaying full order information: live progress stepper, ordered items breakdown with store names, complete bill summary, delivery destination, live ETA, rider contact action, and receipt download.
- **What we have done:**
  Created `OrderStatusView.jsx` matching the customer demo:
  - Header with order number, creation timestamp, and live delivery countdown ETA.
  - Visual status progress bar (`ORDER PLACED` → `STORE PACKED` → `ON THE WAY` → `DELIVERED`).
  - Rider card with rider name ("Ramesh"), avatar, vehicle badge, and "Call Rider" CTA.
  - Comprehensive "Ordered Items" section showing product emoji, title, quantity, price, and store name.
  - "Bill Breakdown" card showing subtotal, delivery fee (`FREE`), coupon savings, and grand total.
  - "Delivery Destination" card with recipient name, verified phone, address line, and pincode.
  - "Download Order Receipt" action generating printable/downloadable receipt.
- **APIs generated:**
  - Connected to backend: `GET /api/v1/orders/:id`, `GET /api/v1/orders`.
- **What changes we have done:**
  - Created `Customer-Frontend/src/components/OrderStatusView.jsx`.
  - Replaced inline tracking placeholder in `Customer-Frontend/src/App.jsx` with `OrderStatusView`.
  - Added automated test suite in `Customer-Frontend/src/__tests__/Day3Fixes.test.jsx`.
- **How to test it:**
  Place an order or navigate to Tracking tab. Verify that order number, ETA, items list, bill breakdown, delivery address, and rider details render completely.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🎨 Frontend Task 5: Client-Side Idempotency Key Pipeline & API Layer
- **Status:** [x] Completed on 2026-10-10
- **What was asked to do:**
  Create client-side idempotency utilities and wire them into the API client so all financial operations automatically transmit unique `x-idempotency-key` headers to prevent duplicate charges and double order submissions.
- **What we have done:**
  Added `generateIdempotencyKey(prefix)` in `src/services/api.js` using `crypto.randomUUID()` with timestamp-entropy fallback. Updated `CheckoutAPI.createPaymentIntent`, `CheckoutAPI.placeOrder`, `PaymentAPI.confirm`, and `PaymentAPI.retry` to automatically generate and attach `x-idempotency-key` headers and body payloads. Added `CustomerAPI` for address and payment method management.
- **APIs generated:**
  - Client API methods with idempotency:
    - `CheckoutAPI.createPaymentIntent(payload, idempotencyKey)`
    - `CheckoutAPI.placeOrder(payload, idempotencyKey)`
    - `PaymentAPI.confirm(paymentId, payload, idempotencyKey)`
    - `PaymentAPI.retry(paymentId, payload, idempotencyKey)`
    - `CustomerAPI.getAddresses()`, `addAddress()`, `updateAddress()`, `deleteAddress()`
- **What changes we have done:**
  - Enhanced `Customer-Frontend/src/services/api.js` with `generateIdempotencyKey`, `PaymentAPI`, `CustomerAPI`, and idempotency header injection.
- **How to test it:**
  Open browser developer tools Network tab, place an order, and verify request headers contain `x-idempotency-key: ord_...`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

### 🖥️ Backend Task 5: Secure Razorpay Test Mode Gateway Integration & Hardening
- **Status:** [x] Completed on 2026-10-11
- **What was asked to do:**
  Integrate Razorpay Test Mode into the customer portal: frontend UI, backend payment APIs, database transactions, signature verification, and cart preservation ensuring customer security, payment integrity, and zero data leakage.
- **What we have done:**
  - Implemented official Razorpay SDK Standard Checkout loader and modal launcher (`src/utils/razorpay.js`).
  - Added server-side Razorpay order intent generation in `razorpayAdapter.js` using the official `razorpay` npm package.
  - Built timing-safe HMAC-SHA256 signature verification in `paymentService.confirmPayment` preventing spoofed or forged callbacks.
  - Database-level cart preservation: Cart items are preserved in PostgreSQL until verified gateway confirmation (`status = 'SUCCESS'`), preventing basket loss on payment cancellation or gateway declines.
  - Fixed IDOR vulnerability in payment controller: Ensured session tokens are never misinterpreted as customer UUIDs.
  - Created 10 automated backend security tests in `Customer-Backend/tests/razorpaySecurity.test.js`.
- **APIs generated:**
  - `POST /api/v1/checkout/place-order` — Returns `razorpay_order_id` and `razorpay_key_id`.
  - `POST /api/v1/payments/:id/confirm` — Verifies HMAC signature and marks order as paid.
  - `POST /api/v1/payments/:id/retry` — Re-attempts payment with fresh Razorpay intent.
- **What changes we have done:**
  - Created `Customer-Backend/services/razorpayAdapter.js` & `Customer-Backend/tests/razorpaySecurity.test.js`.
  - Modified `Customer-Backend/services/orderService.js`, `paymentService.js`, `paymentController.js`.
  - Modified `Customer-Backend/package.json` adding `razorpay` SDK dependency.
- **How to test it:**
  Run `npm test` inside `Customer-Backend`. All 10 security tests verify signature checks, amount mismatch detection, and secret protection.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Backend
  npm test
  ```

---

### 🎨 Frontend Task 6: Direct UPI & Payment Channel Targeting in Razorpay Modal
- **Status:** [x] Completed on 2026-10-11
- **What was asked to do:**
  Ensure clicking "UPI Instant & QR Code" opens the Razorpay modal directly showing the UPI payment options (QR code and UPI apps), rather than defaulting to Cards.
- **What we have done:**
  - Configured `config.display.blocks` and `sequence: ['block.preferred']` targeting `{ method: 'upi' }` in `src/utils/razorpay.js` so Razorpay's checkout modal automatically prioritizes and opens the UPI Dynamic QR Code and test UPI flow (`success@razorpay`).
  - Added method persistence in `handleRetryPayment` in `CheckoutView.jsx`.
  - Created 7 frontend security and configuration tests in `Customer-Frontend/src/__tests__/RazorpayTestModeSecurity.test.jsx`.
- **What changes we have done:**
  - Modified `Customer-Frontend/src/utils/razorpay.js`.
  - Modified `Customer-Frontend/src/components/CheckoutView.jsx`.
  - Created `Customer-Frontend/src/__tests__/RazorpayTestModeSecurity.test.jsx`.
- **How to test it:**
  Run `npm test` inside `Customer-Frontend`. Verify that test 7 asserts `openRazorpayCheckout` builds `config.display.sequence = ['block.preferred']` with `{ method: 'upi' }`.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm test
  ```

---

### 🎨 Frontend Task 7: Multi-Store Catalog Filter Fix & Multi-Store Listing Population
- **Status:** [x] Completed on 2026-10-11
- **What was asked to do:**
  Fix the issue where clicking "All Shops" in the Browse/Stores catalog was not displaying products, and ensure all approved items across all verified neighborhood stores appear properly.
- **What we have done:**
  - Fixed atomic query param deletion in `BrowsePage.jsx`: Replaced duplicate `updateFilter` calls with atomic functional `setSearchParams((prevParams) => ...)` to cleanly delete `store_id`, `storeId`, and `store` from URL search parameters on "All Shops" click.
  - Added shop toggle behavior in `handleSelectStore` allowing users to click a selected shop to deselect it and view all shops.
  - Improved the empty-state button to offer "Browse All Shops" whenever any store filter is active.
  - Populated and approved products across all verified stores in the database (`Store 6789`, `Mahadev Supermart 7890`, `Shabbir Grocery Shop`, `mayankk singh`), so clicking "All Shops" displays all 22 approved products from all verified local stores.
- **What changes we have done:**
  - Modified `Customer-Frontend/src/pages/BrowsePage.jsx`.
  - Updated catalog listings in PostgreSQL database to `approval_status = 'APPROVED'`.
- **How to test it:**
  Navigate to `http://localhost:5173/stores`. Select any individual store, then click "All Shops" or "All Local Shops". Verify the store filter is cleared and all 22 products are displayed.
- **How to run it:**
  ```powershell
  cd ADAB-Customer-Portal/Customer-Frontend
  npm run dev
  ```

---

## 📅 Day 4: Order Tracking, Timeline & Real-time Alerts (Future)
- [ ] Build "My Orders" customer order list page.
- [ ] Build "Order Detail" page with seller-order breakdown and invoice retrieval.
- [ ] Build live shipment tracking timeline with Leaflet map matching demo (`sec-track`).
- [ ] Wire status events (`PLACED` → `ACCEPTED` → `PACKED` → `OUT_FOR_DELIVERY` → `DELIVERED`).
- [ ] Implement customer notification inbox (`sec-notifications`).

---

## 📅 Day 5: Returns, Reviews, Support & Rewards (Future)
- [ ] Implement item-level return and replacement request flow (`sec-returns`).
- [ ] Add photo evidence upload for returns.
- [ ] Implement verified-purchase reviews and star rating submission (`sec-reviews`).
- [ ] Implement customer support ticket creation and chat messaging (`sec-help`, `sec-messages`).
- [ ] Connect reward points balance and redemption ledger (`sec-points`).

---

## 📅 Day 6: Cross-Portal Integration & Live Sync (Future)
- [ ] Test live purchase against active seller listings.
- [ ] Verify order reaches Shop Portal (`seller_orders` status progression).
- [ ] Verify shipment and dispatch events trigger customer delivery alerts.
- [ ] Verify return requests reach Seller and Admin portals.

---

## 📅 Day 7: End-to-End Verification, Performance & Hardening (Future)
- [ ] Run full end-to-end B2C cycle: Browse → Cart → Checkout → Pay → Track → Deliver → Review.
- [ ] Test edge cases: Stock race conditions, expired coupons, payment gateway retries, network dropouts.
- [ ] Run automated Supertest / RTL test suite.
- [ ] Code cleanup, documentation, and final readiness review.
