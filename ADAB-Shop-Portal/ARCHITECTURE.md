# ADAB Shop-Portal (Seller Domain) — Architectural Blueprint & Team Reference Guide

## 1. Overview & Architectural Goal

The ADAB Shop-Portal (Seller Domain) is standardizing on an enterprise **3-Tier Modular React Architecture** (`API Client` &rarr; `Custom Hook` &rarr; `Presentation Component`).

### Core Objectives
- **Decoupled Responsibilities**: Separate raw network operations, business/state logic, and UI rendering.
- **Merge Conflict Elimination**: Prevent simultaneous editing collisions between Mayank (Orders, POS, Fulfillment, Finance) and Shabbir (Catalog, Listings, Seller Profile).
- **Cross-Domain Reusability**: Allow other domain components (such as POS) to consume catalog services without touching or importing UI presentation files (`Products.jsx`).

---

## 2. High-Level System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   BROWSER / CLIENT                     │
                    └────────────────────────────────────────────────────────┘
                                                │
             ┌──────────────────────────────────┴──────────────────────────────────┐
             ▼                                                                     ▼
┌─────────────────────────┐                                             ┌─────────────────────────┐
│     MAYAN'S DOMAIN      │                                             │    SHABBIR'S DOMAIN     │
│   (Orders, POS, Ops)    │                                             │   (Listings, Catalog)   │
└─────────────────────────┘                                             └─────────────────────────┘
             │                                                                     │
   [Pages / Presentation]                                                [Pages / Presentation]
    • OrdersPage.jsx                                                      • Products.jsx
    • POSPage.jsx                                                         • PricingPage.jsx
             │                                                                     │
       [Custom Hooks]                                                        [Custom Hooks]
    • useOrders.js                                                        • useListings.js
    • usePOS.js                                                           • usePricing.js
             │                                                                     │
    [Domain API Clients]                                                  [Domain API Clients]
    • orderApi.js                                                         • listingApi.js
    • posApi.js                                                           • sellerProfileApi.js
             └──────────────────────────────────┬──────────────────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    src/api/client.js  │
                                    │  (Base Axios / Fetch) │
                                    └───────────────────────┘
                                                │
                                       HTTP / JSON Requests
                                    (http://localhost:5003)
                                                │
                    ┌───────────────────────────┴────────────────────────────┐
                    │                    EXPRESS BACKEND                     │
                    │               (ADAB-Shop-Portal/Shop-Backend)          │
                    └────────────────────────────────────────────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
            ┌────────────────────────┐                     ┌────────────────────────┐
            │   MAYAN'S CONTROLLERS  │                     │  SHABBIR'S CONTROLLERS │
            │  • /orders             │                     │  • /listings           │
            │  • /pos                │                     │  • /seller (profile)   │
            │  • /fulfillment        │                     │                        │
            │  • /finance            │                     │                        │
            └────────────────────────┘                     └────────────────────────┘
                        └───────────────────────┬───────────────────────┘
                                                │
                                         PostgreSQL / TLS
                                                │
                    ┌───────────────────────────┴────────────────────────────┐
                    │                RENDER POSTGRESQL DATABASE              │
                    │                    (adab_b2c_team)                     │
                    └────────────────────────────────────────────────────────┘
```

---

## 3. 3-Tier Frontend Architecture

| Tier | Directory | Scope & Responsibility | Rules |
| :--- | :--- | :--- | :--- |
| **Tier 1: Pure HTTP Client** | `src/api/` | Raw network requests, endpoints, status parsing, tokens | Pure JavaScript only. **No React hooks, no JSX.** |
| **Tier 2: Custom Hooks** | `src/hooks/` | State management (`useState`, `useEffect`), caching, filters, pagination | Reusable state machines. Exposes data + mutate methods. |
| **Tier 3: Presentation UI** | `src/pages/`, `src/components/` | Visual layouts, Tailwind CSS styling, user interactions | Consumes hooks. **Zero direct `fetch` / `axios` calls.** |

---

## 4. Frontend Directory Structure

```
ADAB-Shop-Portal/Shop-Frontend/
├── index.html                    <-- Standard React mount point (<div id="root"></div>)
├── src/
│   ├── main.jsx                  <-- Vite React entry point
│   ├── App.jsx                   <-- BrowserRouter, Navigation Shell, Route Definitions
│   │
│   ├── api/                      <-- TIER 1: PURE HTTP SERVICES (Zero React, zero JSX)
│   │   ├── client.js             <-- Base HTTP client (baseURL, timeout, auth interceptors)
│   │   ├── listingApi.js         <-- Shabbir: CRUD on /api/v1/seller/listings
│   │   ├── orderApi.js           <-- Mayank: Operations on /api/v1/seller/orders
│   │   ├── posApi.js             <-- Mayank: Transactions on /api/v1/seller/pos
│   │   └── financeApi.js         <-- Mayank: Credit/Settlement on /api/v1/seller/finance
│   │
│   ├── hooks/                    <-- TIER 2: REUSABLE STATE LOGIC (Custom Hooks)
│   │   ├── useListings.js        <-- Shabbir: State for product catalog & filters
│   │   ├── useOrders.js          <-- Mayank: State for nearby orders & status updates
│   │   └── usePOS.js             <-- Mayank: State for cart, points & receipt printing
│   │
│   ├── components/               <-- TIER 3A: REUSABLE UI WIDGETS
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── common/
│   │       ├── Modal.jsx
│   │       └── Toast.jsx
│   │
│   └── pages/                    <-- TIER 3B: SCREEN ASSEMBLIES
│       ├── Products.jsx          <-- Shabbir: Uses useListings()
│       ├── OrdersPage.jsx        <-- Mayank: Uses useOrders()
│       ├── POSPage.jsx           <-- Mayank: Uses usePOS()
│       └── FinancePage.jsx       <-- Mayank: Uses useFinance()
```

---

## 5. Separation of Responsibilities & Merge Safety Rules

### 5.1 Domain Boundaries

- **Mayank's Workspace / Files**:
  - **Frontend**:
    - `src/api/orderApi.js`
    - `src/api/posApi.js`
    - `src/api/financeApi.js`
    - `src/hooks/useOrders.js`
    - `src/hooks/usePOS.js`
    - `src/pages/OrdersPage.jsx`
    - `src/pages/POSPage.jsx`
    - `src/pages/FinancePage.jsx`
  - **Backend**:
    - `routes/orderRoutes.js`
    - `routes/posRoutes.js`
    - `routes/fulfillmentRoutes.js`
    - `routes/financeRoutes.js`

- **Shabbir's Workspace / Files**:
  - **Frontend**:
    - `src/api/listingApi.js`
    - `src/hooks/useListings.js`
    - `src/pages/Products.jsx`
    - `src/pages/PricingPage.jsx`
  - **Backend**:
    - `src/routes/listing.js`
    - `src/routes/seller.js`
    - `src/controllers/listing.js`

### 5.2 Cross-Domain Reusability Rules
- If Mayank's POS screen needs to fetch inventory/product listings, Mayank imports Shabbir's pure API service:
  ```javascript
  import { listingApi } from '../api/listingApi';
  ```
- **Rule**: Under no circumstances should one domain import or mutate another domain's presentation component (`Products.jsx`).

### 5.3 Backend Routing Agreement (`Shop-Backend/server.js`)
Both domains remain cleanly mounted on non-conflicting path prefixes:
```javascript
// Shabbir's routes:
app.use('/api/v1/seller/listings', listingRoutes);
app.use('/api/v1/seller/profile', sellerProfileRoutes);

// Mayank's routes:
app.use('/api/v1/seller/orders', orderRoutes);
app.use('/api/v1/seller/pos', posRoutes);
app.use('/api/v1/seller/fulfillment', fulfillmentRoutes);
app.use('/api/v1/seller/finance', financeRoutes);
```

---

## 6. Prompt to Give to Shabbir (Agent Directive)

> **Instructions for Shabbir**: Copy and paste the entire block below into your Antigravity agent prompt.

```markdown
<TASK_DIRECTIVE>
We are standardizing the ADAB Shop-Portal (Seller Domain) frontend onto an enterprise 3-tier Modular React Architecture (API Client -> Custom Hook -> Presentation Component). 

Currently, our API calls and state management are tightly coupled inside single component files (e.g. Products.jsx), which causes scope breakages and merge conflicts when merging operations (POS, Orders, Fulfillment) with catalog listings.

Please refactor our current frontend code in `ADAB-Shop-Portal/Shop-Frontend` to follow this modular architecture:

1. Base API Client (`src/api/client.js`):
   - Create a centralized axios/fetch instance configured with baseURL (`http://localhost:5003/api/v1/seller`) and standard headers.

2. Domain API Service Layer (`src/api/listingApi.js`):
   - Extract all HTTP calls related to listings (fetchListings, createListing, updateListing, deleteListing) out of React components and into pure JS functions inside `src/api/listingApi.js`. No React hooks or JSX in this file.

3. Custom Hooks Layer (`src/hooks/useListings.js`):
   - Extract the `useState`, `useEffect`, filter logic, and pagination states out of `Products.jsx` into a reusable custom hook `useListings()`.
   - Expose: `{ listings, loading, error, filters, setFilters, pagination, createListing, updateListing, deleteListing, refresh }`.

4. Presentation Page (`src/pages/Products.jsx`):
   - Refactor `Products.jsx` so it does NOT make raw fetch/API calls.
   - It must consume `const { listings, loading, ... } = useListings()`.
   - Preserve 100% of the existing JSX markup, Tailwind classes, modal dialogs, and styling.

5. Global Routing in `src/App.jsx`:
   - Ensure `App.jsx` mounts the standard React Router layout (`<BrowserRouter>`, `<Routes>`, `<Route>`) with `<div id="root">` mounted in `index.html`.
   - Route `/products` to `<Products />`.
   - Reserve routes `/orders` for Mayank's OrdersPage and `/pos` for Mayank's POSPage.

Verify that `npm run build` succeeds with zero errors after refactoring.
</TASK_DIRECTIVE>
```

---

## 7. Verification & Build Quality Checklist

- [ ] `npm run build` executes in `ADAB-Shop-Portal/Shop-Frontend` with **0 errors**.
- [ ] No direct `fetch` / `axios` calls remain inside `Products.jsx`.
- [ ] `listingApi.js` contains no JSX or React hooks (`useState`, `useEffect`).
- [ ] All listing operations route through `src/api/client.js`.
- [ ] Backend routes in `Shop-Backend/server.js` preserve all mounts for both Shabbir's and Mayank's controllers.
