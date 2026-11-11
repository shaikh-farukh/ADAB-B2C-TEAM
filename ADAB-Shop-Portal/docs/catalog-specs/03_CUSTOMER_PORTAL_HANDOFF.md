# ADAB B2C Catalog Architecture — Document 3
# Customer Portal Technical Handoff Specification

**Target Team:** ADAB-Customer-Portal Engineering Team (Their Responsibility)  
**Target Codebase:** `ADAB-Customer-Portal/Customer-Backend` & `ADAB-Customer-Portal/Customer-Frontend`  
**Shared Database:** PostgreSQL (`adab_b2c_team`)  
**Version:** 2.0.0 (Production-Ready Architecture Specification — Aligned across all 3 Portals)

---

## ⚠️ MANDATORY FIRST STEP: Audit Your Own Codebase First

> [!IMPORTANT]
> **To the Customer Portal Engineering Team:**  
> Before writing any new code or creating new files, **first inspect and audit your own existing codebase**:
> 1. Check your existing routes in `Customer-Backend/routes/catalog.js`, `cartRoutes.js`, and `orderRoutes.js`.
> 2. Inspect your existing services (`Customer-Backend/services/catalogService.js`, `cartService.js`, `orderService.js`) to see how products are queried, how carts are loaded, and how orders currently deduct stock.
> 3. Inspect your existing frontend components in `Customer-Frontend/src/pages/` (`BrowsePage.jsx`, `SearchPage.jsx`, `HomePage.jsx`) and `src/components/` (`ProductCard.jsx`, `CartView.jsx`, `CheckoutView.jsx`).
> 4. Identify exactly what is already working and what remains to be built according to this specification. Do not assume your repository is completely empty or completely updated—verify first against your local Git history.

---

## 1. Shared Database Governance & Migration Plan

> [!NOTE]
> **Database Ownership & Joint Approval Protocol:**  
> All three portals share a single PostgreSQL database (`adab_b2c_team`).  
> 1. **Shop Portal Prepares Migrations:** The Shop Portal engineering team has authored the consolidated DDL migration script:  
>    `ADAB-Shop-Portal/Shop-Backend/migrations/004_catalog_dynamic_attributes_and_variants.sql`.
> 2. **Review & Sign-Off:** Before executing this migration in production, all three portal leads (Shop, Admin, Customer) must review and approve the schema changes.
> 3. **Zero Migration Burden for Customer Team:** The Customer team does **NOT** need to write or run database DDL scripts. Once the migration is executed by the designated DB lead, your team's responsibility is solely to build the customer-facing queries, backend API endpoints, and the shopping UI components.

---

## 2. Complete Page-to-API-to-Table Mapping (Customer Portal)

Use this table as your exact architectural guide for connecting Customer Portal pages to database tables:

| Customer Page / View | Frontend Component | Backend API Endpoint | Database Tables Accessed | Operation (Read / Write) | Exact Columns & Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Mega-Menu / Header** | `Header.jsx`<br>*(Browse Dropdown)* | `GET /api/v1/customer/catalog/categories/tree` | `categories` | **READ** | • **Read**: `id`, `name`, `slug`, `parent_id`, `level`, `materialized_path`, `is_leaf`<br>• **Filter**: `WHERE is_active = true ORDER BY display_order ASC`. Build multi-level navigation tree. |
| **Search Page & Vernacular Expansion** | `SearchPage.jsx`<br>*(Search Bar & Barcode)* | `GET /api/v1/customer/catalog/search?q=...` | `seller_listings`<br>`category_aliases`<br>`search_synonyms`<br>`product_images`<br>`stores` | **READ** | • **Read**: `seller_listings` (`title`, `sell_price`, `mrp`, `barcode`, `attributes JSONB`), `category_aliases` and `search_synonyms` (vernacular query expansion), `product_images`, `stores`.<br>• **Strict Filter**: `WHERE approval_status = 'PUBLISHED' AND is_active = true`. |
| **Category Browse Page** | `BrowsePage.jsx` | `GET /api/v1/customer/catalog/categories/:slug/products` | `seller_listings`<br>`categories`<br>`listing_variants`<br>`product_images` | **READ** | • **Read**: Active listings under category or any descendant (`c.materialized_path LIKE '%cat_id%'`). Include variant count & price range if `has_variants = true`. Filter `approval_status = 'PUBLISHED'`. |
| **Faceted Filter Sidebar** | `BrowsePage.jsx`<br>*(Filter Panel)* | `GET /api/v1/customer/catalog/categories/:slug/facets` | `category_attributes`<br>`attribute_definitions`<br>`seller_listings.attributes` | **READ** | • **Read**: `category_attributes` where `is_filter_facet = true` $\rightarrow$ extract distinct values from `seller_listings.attributes JSONB` (e.g. Size, Color, Fabric, Dietary Type). |
| **Product Detail Page (PDP)** | `ProductPage.jsx` | `GET /api/v1/customer/catalog/products/:id` | `seller_listings`<br>`listing_variants`<br>`product_images`<br>`stores`<br>`reviews` | **READ** | • **Read Listing**: `title`, `description`, `mrp`, `sell_price`, `product_type`, `attributes JSONB`, `has_variants`, `master_catalog_id`, `manufacturer_product_id`.<br>• **Read Variants**: All rows from `listing_variants` where `listing_id = id` (swatch image, SKU, barcode, size, color, price, stock).<br>• **Read Specs**: Render `listing.attributes` JSONB table. |
| **Shopping Cart** | `CartView.jsx` | `GET /api/v1/customer/cart`<br>`POST /api/v1/customer/cart/items`<br>`PUT /api/v1/customer/cart/items/:id` | `carts`<br>`cart_items`<br>`seller_listings`<br>`listing_variants` | **READ & WRITE** | • **Write**: `INSERT` / `UPDATE` into `cart_items` (`listing_id`, `variant_id`, `quantity NUMERIC(12,3)`).<br>• **Read**: JOIN `cart_items` with `seller_listings` and `listing_variants` (display variant size/color and decimal quantity e.g. `0.500 kg`). |
| **Order Placement & Stock Deduction** | `CheckoutView.jsx`<br>`orderService.js` | `POST /api/v1/customer/orders` | `orders`<br>`seller_orders`<br>`order_items`<br>`listing_variants`<br>`seller_listings`<br>`payments` | **WRITE (Transaction)** | • **Insert**: `orders`, `seller_orders`, `order_items` (`listing_id`, `variant_id`, `quantity NUMERIC(12,3)`).<br>• **Atomic Stock Deduction**: Deduct strictly from `listing_variants` (if variant) OR `seller_listings` (if standalone) with `WHERE stock_qty >= $1`. Abort on zero rows. Synchronize parent roll-up. |

---

## 3. Critical Production Fixes in `Customer-Backend`

### 3.1 Concurrency-Safe Stock Deduction & Zero Double-Deduction in `orderService.js`

#### The Problem Discovered in Audit:
In `orderService.js`, stock deduction previously executed:
```javascript
// DANGEROUS PREVIOUS IMPLEMENTATION:
await client.query(
  `UPDATE seller_listings 
   SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = NOW() 
   WHERE id = $2`,
  [Number(item.quantity), item.listing_id]
);
```
1. **Overselling Vulnerability**: Using `GREATEST(0, stock_qty - $1)` silently permits overselling under concurrent checkout requests. If stock is 1 and two users buy 1 simultaneously, both succeed and the merchant cannot fulfill!
2. **Double Deduction vs Parent Confusion**: Multi-variant products (e.g. Size M, L, XL) maintain real physical stock on individual variants (`listing_variants`). Parent listing stock is an aggregate roll-up. Deducting both without synchronization leads to inventory corruption.

#### Production Solution for `orderService.js`:
Implement atomic conditional updates with zero double-deduction:
```javascript
// Customer-Backend/services/orderService.js
async function deductStockForOrder(client, orderItems) {
  for (const item of orderItems) {
    const qty = Number(item.quantity);

    if (item.variant_id) {
      // 1. ATOMIC DEDUCTION ON CHILD VARIANT
      const variantRes = await client.query(
        `UPDATE listing_variants 
         SET stock_qty = stock_qty - $1, updated_at = NOW() 
         WHERE id = $2 AND stock_qty >= $1 AND is_active = true 
         RETURNING stock_qty, listing_id`,
        [qty, item.variant_id]
      );

      if (variantRes.rowCount === 0) {
        throw new Error(`INSUFFICIENT_STOCK: Selected item variant (${item.title || item.variant_id}) is out of stock`);
      }

      const parentListingId = variantRes.rows[0].listing_id;

      // 2. SYNCHRONIZE PARENT AGGREGATE ROLL-UP (Read-Only Cache for Browse)
      await client.query(
        `UPDATE seller_listings 
         SET stock_qty = (
           SELECT COALESCE(SUM(stock_qty), 0) 
           FROM listing_variants 
           WHERE listing_id = $1 AND is_active = true
         ), updated_at = NOW()
         WHERE id = $1`,
        [parentListingId]
      );

    } else {
      // 3. ATOMIC DEDUCTION ON STANDALONE LISTING (has_variants = false)
      const listingRes = await client.query(
        `UPDATE seller_listings 
         SET stock_qty = stock_qty - $1, updated_at = NOW() 
         WHERE id = $2 AND stock_qty >= $1 AND is_active = true 
         RETURNING stock_qty`,
        [qty, item.listing_id]
      );

      if (listingRes.rowCount === 0) {
        throw new Error(`INSUFFICIENT_STOCK: Selected item (${item.title || item.listing_id}) is out of stock`);
      }
    }
  }
}
```

---

### 3.2 Lossless Decimal Quantity Handling across Cart & Checkout

The migration script converts `seller_listings.stock_qty`, `listing_variants.stock_qty`, `cart_items.quantity`, and `order_items.quantity` to `NUMERIC(12, 3)`.

#### Backend Unit Validation Rules (`cartService.js` & `orderService.js`):
1. **Discrete Units** (`pcs`, `pack`, `box`, `bottle`, `pair`):
   - Quantity must be a whole positive integer (`quantity % 1 === 0`).
   - If user attempts `1.5 pcs`, return `400 Bad Request: Fractional quantities not allowed for unit 'pcs'`.
2. **Fractional Units** (`kg`, `g`, `litre`, `ml`, `meter`):
   - Supports up to 3 decimal places (e.g. `0.250 kg`, `0.750 kg`, `1.500 litres`).
   - Validated via regex: `/^\d+(\.\d{1,3})?$/`.

#### Cart Item Storage (`cartService.js`):
```javascript
// Customer-Backend/services/cartService.js
async function addItemToCart(cartId, { listing_id, variant_id = null, quantity = 1 }) {
  const qty = Number(quantity);

  // 1. Stock Check
  if (variant_id) {
    const vRes = await pool.query(
      `SELECT stock_qty, sell_price, is_active FROM listing_variants WHERE id = $1`,
      [variant_id]
    );
    if (vRes.rows.length === 0 || !vRes.rows[0].is_active || vRes.rows[0].stock_qty < qty) {
      throw new Error('Selected variant is out of stock');
    }
  } else {
    const lRes = await pool.query(
      `SELECT stock_qty, sell_price, is_active, has_variants FROM seller_listings WHERE id = $1`,
      [listing_id]
    );
    if (lRes.rows.length === 0 || !lRes.rows[0].is_active) throw new Error('Product not found');
    if (lRes.rows[0].has_variants && !variant_id) {
      throw new Error('Please select a specific size/color variant');
    }
    if (lRes.rows[0].stock_qty < qty) throw new Error('Product is out of stock');
  }

  // 2. Insert or Update Cart Item (with NUMERIC quantity)
  await pool.query(
    `INSERT INTO cart_items (cart_id, listing_id, variant_id, quantity, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (cart_id, listing_id, variant_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [cartId, listing_id, variant_id, qty]
  );
}
```

---

### 3.3 Vernacular Search Expansion & Exact Barcode Query in `catalogService.js`

Update `searchProducts(q)` to expand user queries via `category_aliases` and `search_synonyms`, support exact EAN-13 barcode queries, and strictly filter for `approval_status = 'PUBLISHED'`:

```javascript
// Customer-Backend/services/catalogService.js
async function searchProducts(searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return [];
  const term = searchTerm.trim();
  const isBarcode = /^[0-9]{8,14}$/.test(term);

  let matchedCategoryIds = [];

  if (!isBarcode) {
    // 1. Check Vernacular Category Aliases
    const aliasRes = await pool.query(
      `SELECT category_id FROM category_aliases WHERE alias_term ILIKE $1 LIMIT 5`,
      [`%${term}%`]
    );
    matchedCategoryIds = aliasRes.rows.map(r => r.category_id);

    // 2. Check Keyword Synonyms
    const synRes = await pool.query(
      `SELECT category_id FROM search_synonyms 
       WHERE term ILIKE $1 OR synonyms ? $2 LIMIT 5`,
      [`%${term}%`, term]
    );
    synRes.rows.forEach(r => {
      if (r.category_id && !matchedCategoryIds.includes(r.category_id)) {
        matchedCategoryIds.push(r.category_id);
      }
    });
  }

  const query = `
    SELECT 
      sl.id, 
      sl.title AS name, 
      sl.sell_price AS price, 
      sl.mrp, 
      sl.unit,
      sl.product_type,
      sl.stock_qty,
      sl.has_variants,
      sl.attributes,
      sl.master_catalog_id,
      sl.manufacturer_product_id,
      c.name AS category_name,
      c.slug AS category_slug,
      COALESCE(pi.image_url, 'https://via.placeholder.com/200') AS image,
      s.store_name AS "sellerName",
      (
        SELECT json_agg(
          json_build_object(
            'id', lv.id,
            'sku', lv.sku,
            'barcode', lv.barcode,
            'mrp', lv.mrp,
            'sell_price', lv.sell_price,
            'stock_qty', lv.stock_qty,
            'variant_attributes', lv.variant_attributes,
            'image_url', lv.image_url
          )
        )
        FROM listing_variants lv 
        WHERE lv.listing_id = sl.id AND lv.is_active = true
      ) AS variants
    FROM seller_listings sl
    JOIN categories c ON sl.category_id = c.id
    LEFT JOIN stores s ON sl.store_id = s.id
    LEFT JOIN product_images pi ON sl.id = pi.product_id AND pi.is_primary = true
    WHERE sl.is_active = true 
      AND sl.approval_status = 'PUBLISHED'
      AND (
        ($1::boolean AND (sl.barcode = $2 OR EXISTS (
          SELECT 1 FROM listing_variants lv WHERE lv.listing_id = sl.id AND lv.barcode = $2
        )))
        OR (NOT $1::boolean AND (
          sl.title ILIKE '%' || $2 || '%' 
          OR sl.brand_tag ILIKE '%' || $2 || '%'
          OR sl.category_id = ANY($3::int[])
          OR EXISTS (
            SELECT 1 FROM categories c2 
            WHERE c2.id = ANY($3::int[]) AND sl.category_id = c2.id
          )
        ))
      )
    ORDER BY sl.rating DESC, sl.created_at DESC
    LIMIT 40;
  `;

  const res = await pool.query(query, [isBarcode, term, matchedCategoryIds]);
  return res.rows;
}
```

---

### 3.4 Dynamic Faceted Filter Endpoints

#### Endpoint: Get Category Facet Definitions
* **Method**: `GET /api/v1/customer/catalog/categories/:slug/facets`
* **Backend SQL Query**:
```sql
SELECT ad.code, ad.label, ad.ui_type, ad.allowed_values
FROM category_attributes ca
JOIN attribute_definitions ad ON ca.attribute_id = ad.id
JOIN categories c ON ca.category_id = c.id
WHERE c.slug = $1 AND ca.is_filter_facet = true
ORDER BY ca.display_order ASC;
```

#### Endpoint: Filtered Category Products Query
* **Method**: `GET /api/v1/customer/catalog/categories/:slug/products?fabric_material=Pure+Silk&fit_type=Regular+Fit&min_price=500&max_price=2000`
* **Backend SQL Query (PostgreSQL JSONB Containment)**:
```sql
SELECT sl.id, sl.title, sl.sell_price, sl.mrp, sl.stock_qty, sl.has_variants, sl.attributes
FROM seller_listings sl
JOIN categories c ON sl.category_id = c.id
WHERE c.slug = $1
  AND sl.is_active = true
  AND sl.approval_status = 'PUBLISHED'
  AND sl.sell_price BETWEEN $2 AND $3
  AND ($4::jsonb IS NULL OR sl.attributes @> $4::jsonb)
ORDER BY sl.created_at DESC;
```

---

## 4. Customer-Frontend Component Architecture

The Customer Frontend team must update the shopping experience in `ADAB-Customer-Portal/Customer-Frontend`.

### 4.1 Product Card Component (`ProductCard.jsx`)
* **Badges**:
  * If `product.master_catalog_id` or `product.manufacturer_product_id` is present $\rightarrow$ render verified pill: `✓ Verified Brand`.
  * If `product.product_type === 'OWN_BRAND'` $\rightarrow$ render store pill: `★ Store Exclusive`.
* **Multi-Variant Card Handling**:
  * If `product.has_variants === true`:
    * Instead of a single "Add to Cart" button, show: **"Choose Options"** (clicking navigates directly to PDP).
    * Display price range if variant prices differ (e.g. `₹899 – ₹1,199`).

### 4.2 Product Detail Page (PDP) Swatch & Variant Selector (`ProductPage.jsx`)
* **Color & Size Selectors**:
  * Clicking a Color swatch switches the main gallery image to the variant's specific image (`variant.image_url`).
  * Out-of-stock sizes (`stock_qty <= 0`) are struck through and disabled.
  * Selection state identifies the specific `variant_id` required for cart addition.
* **Dynamic Specifications Table**:
  * Renders key-value pairs stored in `listing.attributes`:
    * Fabric: Pure Silk
    * Fit Type: Regular Fit
    * FSSAI License No: 10014011002233
    * Shelf Life: 730 days

### 4.3 Fractional Quantity Stepper for Loose Produce (`CartView.jsx` & PDP)
* For products where `product_type === 'LOOSE_WEIGHT'`:
  * Detect unit (`kg`, `g`, `litre`).
  * Replace the integer increment (`1, 2, 3`) with fractional steppers: `0.250 kg`, `0.500 kg`, `1.000 kg`, `2.000 kg`.
  * Send decimal quantity (`0.500`) to cart and checkout.

---

## 5. Testing & Acceptance Criteria for Customer Portal Team

| Test ID | Area | Scenario | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-CUST-01** | Barcode | Customer scans or searches `8901030383749` (Tata Salt EAN). | Instantly displays exact Tata Salt listing from nearby store. |
| **TC-CUST-02** | Search | Customer searches vernacular term "Gents Kurti". | `category_aliases` matches `Kurtas`; displays relevant Kurta listings. |
| **TC-CUST-03** | Status | Admin approves a product but holds in `APPROVED` (not `PUBLISHED`). | Product is completely hidden from customer search and browse. |
| **TC-CUST-04** | Filters | Customer filters by "Fabric: Pure Silk". | URL updates to `?fabric_material=Pure+Silk`; only matching silk kurtas display via JSONB filter. |
| **TC-CUST-05** | Swatches | Customer selects Size "XL" and Color "Maroon" on PDP. | Main image switches to Maroon; price updates; variant ID tagged for cart. |
| **TC-CUST-06** | Loose Item | Customer adds `0.750 kg` of Tomatoes to cart. | Cart displays `0.750 kg × ₹40/kg = ₹30.00`; no rounding to integer. |
| **TC-CUST-07** | Concurrency | Two customers attempt to buy the last 1 item simultaneously. | First request succeeds (stock = 0); second request receives explicit `INSUFFICIENT_STOCK` error; zero negative stock. |
| **TC-CUST-08** | Variants | Customer purchases 1 unit of Size "M". | `listing_variants.stock_qty` decrements by 1; parent `seller_listings.stock_qty` updates to match total remaining variants; zero double deduction. |
